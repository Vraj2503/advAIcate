"""
Chat Service — prompt construction, LLM orchestration, message persistence.
Extracted from app.py chat() and end_session() routes.
"""

import logging
from typing import Dict, Any, List, Optional
from groq import Groq

from config import GROQ_MODEL, GROQ_CHAT_TEMPERATURE, GROQ_CHAT_MAX_TOKENS
from managers.session_manager import SessionManager
from managers.message_manager import MessageManager
from services.retrieval_service import RetrievalService
from conversation_summarizer import get_conversation_summarizer
from embedding_utils import get_embedding_generator

logger = logging.getLogger(__name__)


class ChatService:
    """Orchestrates chat: RAG retrieval → prompt → LLM → persist."""

    def __init__(self, groq_client: Optional[Groq] = None):
        self.groq_client = groq_client
        self.session_mgr = SessionManager()
        self.message_mgr = MessageManager()
        self.retrieval = RetrievalService()

    def handle_chat(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        uploaded_files: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Full chat flow: ensure session → save user msg → RAG → LLM → save response.
        Returns dict with 'response' and 'session_id'.
        Raises on LLM unavailability.
        """
        if not self.groq_client:
            raise RuntimeError("AI service unavailable")

        # Ensure session exists
        if session_id:
            # Ownership already verified at route layer
            pass
        else:
            session = self.session_mgr.create_session(
                user_id=user_id,
                title=message[:60]
            )
            session_id = session["id"]

        # Save user message (user_id enables defense-in-depth ownership check)
        self.message_mgr.save_message(
            session_id=session_id,
            role="user",
            content=message,
            user_id=user_id
        )

        # RAG context retrieval
        context_data = self.retrieval.retrieve(
            query=message,
            user_id=user_id,
            session_id=session_id,
            top_k=3,
            include_past_conversations=False
        )
        context_str = self.retrieval.format_context(context_data)

        # Build prompt
        prompt = f"""
You are a Legal AI Assistant helping Indian residents.

{context_str}

User question:
{message}
"""

        if uploaded_files:
            names = [
                f.get("name")
                for f in uploaded_files
                if isinstance(f, dict) and f.get("name")
            ]
            if names:
                prompt += f"\n\nNote: User has uploaded these files: {', '.join(names)}"

        # LLM completion
        completion = self.groq_client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=GROQ_CHAT_TEMPERATURE,
            max_tokens=GROQ_CHAT_MAX_TOKENS,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Provide general legal information only. "
                        "Use structured sections and bullet points. "
                        "Always end with a legal disclaimer."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )

        response_text = completion.choices[0].message.content

        # Save assistant message (user_id enables defense-in-depth ownership check)
        self.message_mgr.save_message(
            session_id=session_id,
            role="assistant",
            content=response_text,
            user_id=user_id
        )

        return {
            "response": response_text,
            "session_id": session_id,
        }

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