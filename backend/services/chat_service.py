"""
Chat Service — prompt construction, LLM orchestration, message persistence.
Extracted from app.py chat() and end_session() routes.
"""

import logging
from typing import Dict, Any, List, Optional
from groq import Groq

from config import (
    GROQ_MODEL,
    GROQ_CHAT_TEMPERATURE,
    GROQ_CHAT_MAX_TOKENS,
    HISTORY_FETCH_LIMIT,
    SUMMARY_BATCH_SIZE,
    SESSION_INACTIVITY_TIMEOUT,
)
from managers.session_manager import SessionManager
from managers.message_manager import MessageManager
from services.retrieval_service import RetrievalService
from services.summarization_service import SummarizationService
from conversation_summarizer import get_conversation_summarizer
from embedding_utils import get_embedding_generator
from utils.token_utils import fit_messages_to_budget

logger = logging.getLogger(__name__)

# Limit how many stale sessions we finalize per incoming request to bound
# latency.  Remaining stale sessions will be finalized on subsequent
# new-session requests.
MAX_FINALIZATIONS_PER_REQUEST = 1


class ChatService:
    """Orchestrates chat: RAG retrieval → prompt → LLM → persist."""

    def __init__(self, groq_client: Optional[Groq] = None):
        self.groq_client = groq_client
        self.session_mgr = SessionManager()
        self.message_mgr = MessageManager()
        self.retrieval = RetrievalService()
        self._summarizer = SummarizationService(groq_client)

    def handle_chat(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        uploaded_files: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Full chat flow: ensure session → RAG → history → LLM → persist → summarize.
        Returns dict with 'response' and 'session_id'.
        Raises on LLM unavailability.
        """
        if not self.groq_client:
            raise RuntimeError("AI service unavailable")

        # 1. If new session, finalize stale previous sessions
        if not session_id:
            self._finalize_previous_sessions(user_id)

        # 2. Ensure session exists (EXISTING — preserved)
        is_new_session = not bool(session_id)
        if session_id:
            # Ownership already verified at route layer
            pass
        else:
            session = self.session_mgr.create_session(
                user_id=user_id,
                title=message[:60]
            )
            session_id = session["id"]

        logger.debug("[CHAT] session_id=%s, user_id=%s, is_new=%s", session_id, user_id, is_new_session)

        # 3. RAG context retrieval (EXISTING — preserved)
        context_data = self.retrieval.retrieve(
            query=message,
            user_id=user_id,
            session_id=session_id,
            top_k=3,
            include_past_conversations=False
        )
        context_str = self.retrieval.format_context(context_data)

        # 4. Build system prompt (EXISTING logic preserved)
        system_prompt = (
            "You are a Legal AI Assistant helping Indian residents.\n\n"
            "Provide general legal information only. "
            "Use structured sections and bullet points. "
            "Always end with a legal disclaimer."
        )

        # Build the current user message with uploaded file notes
        current_message = message
        if uploaded_files:
            names = [
                f.get("name")
                for f in uploaded_files
                if isinstance(f, dict) and f.get("name")
            ]
            if names:
                current_message += f"\n\nNote: User has uploaded these files: {', '.join(names)}"

        # 5. Get session rolling summary (if available)
        session_summary = ""
        if session_id:
            session_summary = self.session_mgr.get_rolling_summary(session_id)

        # 6. Fetch recent messages for context
        #    NOTE: current message is NOT yet in DB, so no duplication risk.
        history_messages = []
        if session_id:
            history_messages = self.message_mgr.get_recent_messages_for_context(
                session_id, limit=HISTORY_FETCH_LIMIT
            )

        logger.debug("[CHAT] History messages fetched: %d", len(history_messages))

        # 7. Fit history to token budget
        fitted_history = fit_messages_to_budget(
            messages=history_messages,
            system_prompt=system_prompt,
            current_message=current_message,
            rag_context=context_str,
            session_summary=session_summary,
        )

        logger.debug("[CHAT] Fitted history messages: %d (of %d fetched)", len(fitted_history), len(history_messages))

        # 8. Assemble messages array
        #    System messages FIRST, then history, then current user message LAST
        messages_array = [
            {"role": "system", "content": system_prompt},
        ]

        # Session summary (only if non-empty)
        if session_summary:
            messages_array.append({
                "role": "system",
                "content": f"Previous conversation summary:\n{session_summary}",
            })

        # RAG context (only if non-empty)
        if context_str:
            messages_array.append({
                "role": "system",
                "content": f"Relevant context:\n{context_str}",
            })

        # Fitted conversation history
        messages_array.extend(fitted_history)

        # Current user message — ALWAYS last
        messages_array.append({"role": "user", "content": current_message})

        logger.debug(
            "[CHAT] Total messages to Groq: %d, roles: %s",
            len(messages_array), [m['role'] for m in messages_array]
        )

        # 9. LLM completion
        completion = self.groq_client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=GROQ_CHAT_TEMPERATURE,
            max_tokens=GROQ_CHAT_MAX_TOKENS,
            messages=messages_array,
        )

        response_text = completion.choices[0].message.content

        # 10. Save user message (AFTER Groq call to avoid duplication in history)
        self.message_mgr.save_message(
            session_id=session_id,
            role="user",
            content=message,
            user_id=user_id
        )

        # 11. Save assistant message
        self.message_mgr.save_message(
            session_id=session_id,
            role="assistant",
            content=response_text,
            user_id=user_id
        )

        logger.debug("[CHAT] Messages saved for session %s", session_id)

        # 12. Increment message count (user + assistant = 2)
        new_count = self.session_mgr.increment_message_count(session_id, count=2)
        logger.debug("[CHAT] Message count for session %s: %d", session_id, new_count)

        # 13. Check if rolling summary should be triggered
        self._maybe_trigger_rolling_summary(session_id)

        # 14. Return response (EXISTING format — preserved)
        return {
            "response": response_text,
            "session_id": session_id,
        }

    # NOTE: Synchronous — blocks response by ~500ms every ~20 messages.
    # Will move to FastAPI BackgroundTasks during Phase 3 migration.
    def _maybe_trigger_rolling_summary(self, session_id: str) -> None:
        """
        Check if enough unsummarized messages have accumulated and,
        if so, generate a rolling summary for the session.

        Summarization failures MUST NEVER break chat — everything is
        wrapped in try/except.
        """
        try:
            logger.debug("[SUMMARY] Checking trigger for session %s", session_id)
            should_trigger = self._summarizer.should_trigger_rolling_summary(
                session_id, self.message_mgr
            )
            logger.debug("[SUMMARY] should_trigger=%s for session %s", should_trigger, session_id)
            if not should_trigger:
                return

            # Fetch oldest unsummarized messages
            batch = self.message_mgr.get_oldest_unsummarized(
                session_id, limit=SUMMARY_BATCH_SIZE
            )
            if not batch:
                return

            # Get existing rolling summary for context
            existing_summary = self.session_mgr.get_rolling_summary(session_id)

            # Generate new rolling summary
            new_summary = self._summarizer.summarize_messages(
                messages=batch,
                context=existing_summary,
            )

            # Persist the updated summary
            self.session_mgr.update_rolling_summary(session_id, new_summary)

            # Mark batch messages as summarized
            message_ids = [msg["id"] for msg in batch if msg.get("id")]
            self.message_mgr.mark_messages_summarized(session_id, message_ids)

            logger.info(
                "Rolling summary generated for session %s (%d messages summarized)",
                session_id, len(batch)
            )
        except Exception as e:
            logger.error(
                "Rolling summary failed for session %s (non-fatal): %s",
                session_id, str(e)
            )

    def _finalize_previous_sessions(self, user_id: str) -> None:
        """
        When a user starts a new conversation, finalize any stale previous
        sessions that have been inactive beyond SESSION_INACTIVITY_TIMEOUT.

        Capped to MAX_FINALIZATIONS_PER_REQUEST per request to bound latency.
        Remaining stale sessions will be finalized on subsequent new-session
        requests.

        Failures MUST NEVER prevent the new chat from proceeding.
        """
        try:
            stale_sessions = self.session_mgr.get_sessions_needing_finalization(
                user_id, SESSION_INACTIVITY_TIMEOUT
            )

            # Process at most MAX_FINALIZATIONS_PER_REQUEST to bound latency.
            # Remaining stale sessions will be finalized on subsequent
            # new-session requests.
            for stale in stale_sessions[:MAX_FINALIZATIONS_PER_REQUEST]:
                try:
                    stale_id = stale.get("id")
                    if not stale_id:
                        continue

                    # Get all messages for the stale session
                    messages = self.message_mgr.get_recent_messages_for_context(
                        stale_id, limit=200
                    )

                    # Get existing rolling summary
                    rolling_summary = self.session_mgr.get_rolling_summary(stale_id)

                    # Generate final summary
                    final_summary = self._summarizer.generate_final_summary(
                        messages=messages,
                        rolling_summary=rolling_summary,
                    )

                    # Finalize the session
                    self.session_mgr.finalize_session(stale_id, final_summary)

                    logger.info(
                        "Auto-finalized stale session %s for user %s",
                        stale_id, user_id
                    )
                except Exception as e:
                    logger.error(
                        "Failed to finalize session %s for user %s (non-fatal): %s",
                        stale.get("id"), user_id, str(e)
                    )
        except Exception as e:
            logger.error(
                "Session finalization check failed for user %s (non-fatal): %s",
                user_id, str(e)
            )

    def handle_end_session(
        self,
        user_id: str,
        session_id: str,
        session: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        End a session: summarize → embed → store summary → update title.
        Returns dict with summary info.
        """
        # Already completed?
        if session.get("status") == "completed":
            existing_summary = self.session_mgr.get_session_summary(session_id)
            if existing_summary:
                return {
                    "success": True,
                    "session_id": session_id,
                    "summary": existing_summary.get("summary_text"),
                    "title": session.get("title"),
                    "already_completed": True
                }

        messages = self.message_mgr.get_session_messages(session_id)

        if not messages or len(messages) < 2:
            self.session_mgr.end_session(session_id)
            return {
                "success": True,
                "session_id": session_id,
                "summary": "No conversation to summarize",
                "message_count": len(messages) if messages else 0
            }

        # Generate summary
        summarizer = get_conversation_summarizer(self.groq_client)
        summary_text = summarizer.summarize_conversation(
            messages=messages,
            summary_type="session"
        )

        # Generate embedding for summary
        embedder = get_embedding_generator()
        summary_embedding = embedder.generate_embedding(summary_text)

        # Store summary (user_id enables defense-in-depth ownership check)
        first_message_id = messages[0].get("id") if messages else None
        last_message_id = messages[-1].get("id") if messages else None

        self.message_mgr.save_conversation_summary(
            session_id=session_id,
            summary_text=summary_text,
            embedding=summary_embedding,
            summary_level="session",
            start_message_id=first_message_id,
            end_message_id=last_message_id,
            user_id=user_id
        )

        # Generate title and finalize
        title = summarizer.generate_title_from_summary(summary_text)
        self.session_mgr.end_session(session_id)
        self.session_mgr.update_session(session_id, title=title)

        return {
            "success": True,
            "session_id": session_id,
            "summary": summary_text,
            "title": title,
            "message_count": len(messages)
        }