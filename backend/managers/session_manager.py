"""
Session Manager — CRUD operations for chat sessions + ownership verification.
"""

import logging
from typing import Optional, Dict, List, Any
from datetime import datetime
from managers.base_manager import BaseManager, OwnershipError

logger = logging.getLogger(__name__)


class SessionManager(BaseManager):
    """Manages chat session lifecycle and ownership."""

    def _verify_session_ownership(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """
        Verify that a session belongs to the given user.
        Returns the session dict on success.
        Raises OwnershipError on failure.
        """
        session = self.get_session(session_id)

        if not session:
            raise OwnershipError(f"Session {session_id} not found")

        if session.get("user_id") != user_id:
            logger.warning(
                "Ownership violation: user %s attempted to access session %s owned by %s",
                user_id, session_id, session.get("user_id")
            )
            raise OwnershipError(
                f"User {user_id} does not own session {session_id}"
            )

        return session

    def create_session(self, user_id: str, title: Optional[str] = None) -> Dict[str, Any]:
        """Create a new chat session."""
        self._validate_user_id(user_id)

        session_data = {
            "user_id": user_id,
            "title": title or "New Conversation",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        result = self.client.table("chat_sessions").insert(session_data).execute()
        return result.data[0] if result.data else None

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific chat session."""
        self._validate_session_id(session_id)

        result = self.client.table("chat_sessions") \
            .select("*") \
            .eq("id", session_id) \
            .execute()
        return result.data[0] if result.data else None

    def get_user_sessions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all sessions for a user."""
        self._validate_user_id(user_id)

        result = self.client.table("chat_sessions") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("updated_at", desc=True) \
            .limit(limit) \
            .execute()
        return result.data or []

    def update_session(self, session_id: str, title: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update session metadata."""
        self._validate_session_id(session_id)

        update_data = {"updated_at": datetime.utcnow().isoformat()}
        if title:
            update_data["title"] = title

        result = self.client.table("chat_sessions") \
            .update(update_data) \
            .eq("id", session_id) \
            .execute()

        return result.data[0] if result.data else None

    def end_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Mark a session as completed."""
        self._validate_session_id(session_id)

        update_data = {
            "status": "completed",
            "updated_at": datetime.utcnow().isoformat()
        }

        result = self.client.table("chat_sessions") \
            .update(update_data) \
            .eq("id", session_id) \
            .execute()

        return result.data[0] if result.data else None

    def get_session_summary(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get the summary for a session."""
        self._validate_session_id(session_id)

        result = self.client.table("conversation_summaries") \
            .select("*") \
            .eq("session_id", session_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        return result.data[0] if result.data else None

    def get_active_sessions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all active sessions for a user."""
        self._validate_user_id(user_id)

        result = self.client.table("chat_sessions") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("status", "active") \
            .order("updated_at", desc=True) \
            .limit(limit) \
            .execute()
        return result.data or []

    def get_completed_sessions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all completed sessions for a user."""
        self._validate_user_id(user_id)

        result = self.client.table("chat_sessions") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("status", "completed") \
            .order("updated_at", desc=True) \
            .limit(limit) \
            .execute()
        return result.data or []
