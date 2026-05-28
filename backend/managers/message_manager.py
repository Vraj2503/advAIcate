"""
Message Manager — CRUD operations for chat messages.
"""

import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from managers.base_manager import BaseManager, ValidationError
from config import ALLOWED_MESSAGE_ROLES

logger = logging.getLogger(__name__)

# One-time warning flag for missing summarization columns (migration not yet run)
_summarization_columns_warned = False


class MessageManager(BaseManager):
    """Manages chat message persistence and retrieval."""

    def _verify_session_ownership(self, session_id: str, user_id: str):
        """Delegate to SessionManager for ownership check."""
        from managers.session_manager import SessionManager
        sm = SessionManager()
        return sm._verify_session_ownership(session_id, user_id)

    def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        user_id: Optional[str] = None,
        topic: str = "general",
        extension: str = "none",
        token_count: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Persist a chat message.
        If user_id is provided, ownership is verified (defense-in-depth).
        """
        self._validate_session_id(session_id)

        if user_id:
            self._validate_user_id(user_id)
            self._verify_session_ownership(session_id, user_id)

        if role not in ALLOWED_MESSAGE_ROLES:
            raise ValidationError(f"Invalid message role: {role}")

        message_data = {
            "session_id": session_id,
            "role": role,
            "topic": topic,
            "extension": extension,
            "content": content,
            "token_count": token_count,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        result = self.client.table("messages").insert(message_data).execute()
        return result.data[0] if result.data else None

    def get_session_messages(
        self,
        session_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Fetch messages for a session."""
        self._validate_session_id(session_id)

        query = self.client.table("messages") \
            .select("*") \
            .eq("session_id", session_id) \
            .order("created_at", desc=False)

        if limit:
            query = query.limit(limit)

        result = query.execute()
        return result.data or []

    def get_recent_messages(
        self,
        session_id: str,
        count: int = 10
    ) -> List[Dict[str, Any]]:
        """Get last N messages (chronological order)."""
        self._validate_session_id(session_id)

        result = self.client.table("messages") \
            .select("*") \
            .eq("session_id", session_id) \
            .order("created_at", desc=True) \
            .limit(count) \
            .execute()

        return list(reversed(result.data)) if result.data else []

    def save_conversation_summary(
        self,
        session_id: str,
        summary_text: str,
        embedding: Optional[List[float]] = None,
        summary_level: str = "session",
        start_message_id: Optional[str] = None,
        end_message_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Save a semantic summary of a conversation."""
        self._validate_session_id(session_id)

        if user_id:
            self._validate_user_id(user_id)
            self._verify_session_ownership(session_id, user_id)

        data = {
            "session_id": session_id,
            "summary_level": summary_level,
            "summary_text": summary_text,
            "start_message_id": start_message_id,
            "end_message_id": end_message_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        if embedding is not None:
            data["embedding"] = embedding

        result = self.client.table("conversation_summaries").insert(data).execute()
        return result.data[0] if result.data else None

    # ------------------------------------------------------------------
    # Conversation history support
    # ------------------------------------------------------------------

    def get_recent_messages_for_context(
        self, session_id: str, limit: int = 50
    ) -> List[Dict[str, str]]:
        """
        Fetch recent messages for token budgeting and context window assembly.

        Selects only role and content columns (lightweight — no id, timestamps,
        etc.) since those are all that's needed for the Groq messages array.

        We fetch more messages than we'll likely use because message lengths vary
        and we can't predict token counts. It's cheaper to fetch extras and trim
        in fit_messages_to_budget() than to make another DB round-trip.

        Args:
            session_id: The session to fetch messages for.
            limit: Maximum messages to fetch (default 50).

        Returns:
            List of {"role": "...", "content": "..."} dicts in chronological order.
            Empty list if no results or on error.
        """
        self._validate_session_id(session_id)
        logger.debug("[MSG_MGR] Fetching history for session %s, limit=%d", session_id, limit)

        try:
            result = self.client.table("messages") \
                .select("role, content") \
                .eq("session_id", session_id) \
                .order("created_at", desc=True) \
                .limit(limit) \
                .execute()

            if not result.data:
                logger.debug("[MSG_MGR] Found 0 messages for session %s", session_id)
                return []

            messages = list(reversed(result.data))
            logger.debug("[MSG_MGR] Found %d messages for session %s", len(messages), session_id)
            # Reverse from newest-first to chronological order
            return messages
        except Exception as e:
            logger.error(
                "Failed to fetch recent messages for session %s: %s",
                session_id, str(e)
            )
            return []

    def get_message_count(self, session_id: str) -> int:
        """
        Get the total number of messages in a session.

        Args:
            session_id: The session to count messages for.

        Returns:
            Integer count. Returns 0 on error.
        """
        self._validate_session_id(session_id)

        try:
            result = self.client.table("messages") \
                .select("id", count="exact") \
                .eq("session_id", session_id) \
                .execute()

            return result.count if result.count is not None else 0
        except Exception as e:
            logger.error(
                "Failed to get message count for session %s: %s",
                session_id, str(e)
            )
            return 0

    # ------------------------------------------------------------------
    # Summarization support (requires migrations/add_summary_fields.sql)
    # ------------------------------------------------------------------

    def get_oldest_unsummarized(
        self, session_id: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Fetch the oldest unsummarized messages for a session.

        Args:
            session_id: The session to query.
            limit: Maximum messages to return.

        Returns:
            List of message dicts with id, role, content.
            Empty list if column doesn't exist or on error.
        """
        global _summarization_columns_warned
        self._validate_session_id(session_id)

        try:
            result = self.client.table("messages") \
                .select("id, role, content") \
                .eq("session_id", session_id) \
                .eq("is_summarized", False) \
                .order("created_at", desc=False) \
                .limit(limit) \
                .execute()

            batch = result.data or []
            logger.debug("[MSG_MGR] Oldest unsummarized for session %s: %d messages", session_id, len(batch))
            return batch
        except Exception as e:
            if not _summarization_columns_warned:
                logger.warning(
                    "Summarization columns not available — run "
                    "migrations/add_summary_fields.sql. Error: %s", e
                )
                _summarization_columns_warned = True
            return []

    def mark_messages_summarized(
        self, session_id: str, message_ids: List[str]
    ) -> None:
        """
        Mark a batch of messages as summarized.

        Args:
            session_id: The session the messages belong to.
            message_ids: List of message IDs to mark.
        """
        global _summarization_columns_warned
        self._validate_session_id(session_id)

        if not message_ids:
            return

        try:
            self.client.table("messages") \
                .update({
                    "is_summarized": True,
                    "summarized_at": datetime.now(timezone.utc).isoformat(),
                }) \
                .eq("session_id", session_id) \
                .in_("id", message_ids) \
                .execute()
        except Exception as e:
            if not _summarization_columns_warned:
                logger.warning(
                    "Summarization columns not available — run "
                    "migrations/add_summary_fields.sql. Error: %s", e
                )
                _summarization_columns_warned = True
            logger.error(
                "Failed to mark messages as summarized for session %s: %s",
                session_id, str(e)
            )

    def get_unsummarized_count(self, session_id: str) -> int:
        """
        Count unsummarized messages in a session.

        Args:
            session_id: The session to count for.

        Returns:
            Integer count. Returns 0 if column doesn't exist or on error.
        """
        global _summarization_columns_warned
        self._validate_session_id(session_id)

        try:
            result = self.client.table("messages") \
                .select("id", count="exact") \
                .eq("session_id", session_id) \
                .eq("is_summarized", False) \
                .execute()

            count = result.count if result.count is not None else 0
            logger.debug("[MSG_MGR] Unsummarized count for session %s: %d", session_id, count)
            return count
        except Exception as e:
            if not _summarization_columns_warned:
                logger.warning(
                    "Summarization columns not available — run "
                    "migrations/add_summary_fields.sql. Error: %s", e
                )
                _summarization_columns_warned = True
            return 0
