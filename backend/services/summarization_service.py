"""
Summarization Service — rolling and final session summaries via LLM.
No Flask imports — framework-agnostic for future FastAPI migration.
"""

import logging
from typing import List, Dict, Optional

from config import (
    GROQ_MODEL,
    SUMMARY_TEMPERATURE,
    ROLLING_SUMMARY_MAX_TOKENS,
    FINAL_SUMMARY_MAX_TOKENS,
    SUMMARY_TRIGGER_THRESHOLD,
)

logger = logging.getLogger(__name__)


class SummarizationService:
    """Generates rolling and final conversation summaries via Groq LLM."""

    def __init__(self, groq_client):
        self.groq_client = groq_client

    def summarize_messages(self, messages: List[Dict], context: str = "") -> str:
        """
        Create a concise rolling summary of a batch of conversation messages.

        Args:
            messages: List of message dicts with "role" and "content" keys.
            context: Existing rolling summary to incorporate (prior context).

        Returns:
            Summary string. Returns context unchanged if LLM call fails.
        """
        if not messages:
            return context

        # Format messages as "ROLE: content" strings
        formatted_lines = []
        for msg in messages:
            role = msg.get("role", "unknown").upper()
            content = msg.get("content", "")
            formatted_lines.append(f"{role}: {content}")
        conversation_text = "\n".join(formatted_lines)

        # Build the summarization prompt
        prompt_parts = []
        if context:
            prompt_parts.append(
                f"Prior context from earlier in the conversation:\n{context}"
            )
        prompt_parts.append(
            "Summarize this conversation segment concisely. "
            "Preserve: key facts discussed, decisions made, questions asked and answered, "
            "legal topics covered, specific details (names, dates, amounts, case references). "
            "Do NOT add opinions or information not present in the conversation. "
            "Do NOT include pleasantries or meta-commentary."
        )
        prompt_parts.append(f"Conversation:\n{conversation_text}")
        prompt_text = "\n\n".join(prompt_parts)

        try:
            completion = self.groq_client.chat.completions.create(
                model=GROQ_MODEL,
                temperature=SUMMARY_TEMPERATURE,
                max_tokens=ROLLING_SUMMARY_MAX_TOKENS,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a precise conversation summarizer for a "
                            "legal assistant application."
                        ),
                    },
                    {"role": "user", "content": prompt_text},
                ],
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(
                "Failed to generate rolling summary: %s", str(e)
            )
            return context

    def generate_final_summary(
        self,
        messages: List[Dict],
        rolling_summary: str = "",
        session_metadata: Optional[Dict] = None,
    ) -> str:
        """
        Generate a comprehensive final summary when a session is being finalized.

        Args:
            messages: List of message dicts with "role" and "content" keys.
            rolling_summary: Existing rolling summary of earlier conversation.
            session_metadata: Optional session metadata (title, timestamps, etc.).

        Returns:
            Final summary string. Returns rolling_summary as fallback on error.
        """
        # Build content to summarize
        content_parts = []

        if rolling_summary:
            content_parts.append(
                f"Summary of earlier conversation:\n{rolling_summary}"
            )

        if messages:
            formatted_lines = []
            for msg in messages:
                role = msg.get("role", "unknown").upper()
                content = msg.get("content", "")
                formatted_lines.append(f"{role}: {content}")
            content_parts.append(
                f"Recent conversation:\n" + "\n".join(formatted_lines)
            )

        if not content_parts:
            return rolling_summary or ""

        content_text = "\n\n".join(content_parts)

        prompt = (
            "Generate a comprehensive session summary including:\n"
            "- Main legal topics discussed\n"
            "- Key facts and specific details (names, dates, amounts)\n"
            "- Legal advice or information provided\n"
            "- Any action items or next steps mentioned\n"
            "- Documents referenced (if any)\n"
            "- Unresolved questions\n\n"
            f"{content_text}"
        )

        try:
            completion = self.groq_client.chat.completions.create(
                model=GROQ_MODEL,
                temperature=SUMMARY_TEMPERATURE,
                max_tokens=FINAL_SUMMARY_MAX_TOKENS,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a precise conversation summarizer for a "
                            "legal assistant application."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(
                "Failed to generate final summary: %s", str(e)
            )
            return rolling_summary or ""

    def should_trigger_rolling_summary(self, session_id: str, message_mgr) -> bool:
        """
        Check whether the unsummarized message count has reached the threshold.

        Args:
            session_id: The session to check.
            message_mgr: MessageManager instance for DB queries.

        Returns:
            True if unsummarized count >= SUMMARY_TRIGGER_THRESHOLD.
        """
        try:
            count = message_mgr.get_unsummarized_count(session_id)
            return count >= SUMMARY_TRIGGER_THRESHOLD
        except Exception as e:
            logger.error(
                "Error checking summary trigger for session %s: %s",
                session_id, str(e)
            )
            return False
