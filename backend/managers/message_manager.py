"""
Message Manager — CRUD operations for chat messages.
"""

import logging
from typing import Optional, Dict, List, Any
from datetime import datetime
from managers.base_manager import BaseManager, ValidationError
from config import ALLOWED_MESSAGE_ROLES

logger = logging.getLogger(__name__)


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
            "created_at": datetime.utcnow().isoformat()
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
            "created_at": datetime.utcnow().isoformat()
        }

        if embedding is not None:
            data["embedding"] = embedding

        result = self.client.table("conversation_summaries").insert(data).execute()
        return result.data[0] if result.data else None
