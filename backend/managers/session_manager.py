"""
Session Manager — CRUD operations for chat sessions + ownership verification.
"""

import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta, timezone
from managers.base_manager import BaseManager, OwnershipError

logger = logging.getLogger(__name__)

# One-time warning flag for missing summary columns (migration not yet run)
_summary_columns_warned = False


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
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
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

        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
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
            "updated_at": datetime.now(timezone.utc).isoformat()
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

    # ------------------------------------------------------------------
    # Summarization support (requires migrations/add_summary_fields.sql)
    # ------------------------------------------------------------------

    def get_rolling_summary(self, session_id: str) -> str:
        """
        Fetch the rolling_summary column from chat_sessions for a given session.

        Returns the summary string, or empty string if null/missing.
        Gracefully handles missing column (migration not yet run).
        """
        global _summary_columns_warned
        self._validate_session_id(session_id)

        try:
            result = self.client.table("chat_sessions") \
                .select("rolling_summary") \
                .eq("id", session_id) \
                .execute()

            if result.data and result.data[0].get("rolling_summary"):
                summary = result.data[0]["rolling_summary"]
                logger.debug("[SESSION_MGR] Rolling summary for %s: exists (%d chars)", session_id, len(summary))
                return summary
            logger.debug("[SESSION_MGR] Rolling summary for %s: empty", session_id)
            return ""
        except Exception as e:
            if not _summary_columns_warned:
                logger.warning(
                    "Rolling summary columns not available — run "
                    "migrations/add_summary_fields.sql. Error: %s", e
                )
                _summary_columns_warned = True
            return ""

    def update_rolling_summary(self, session_id: str, summary: str) -> None:
        """
        Update the rolling_summary and last_summary_at for a session.

        Args:
            session_id: The session to update.
            summary: The new rolling summary text.
        """
        global _summary_columns_warned
        self._validate_session_id(session_id)

        try:
            self.client.table("chat_sessions") \
                .update({
                    "rolling_summary": summary,
                    "last_summary_at": datetime.now(timezone.utc).isoformat(),
                }) \
                .eq("id", session_id) \
                .execute()
        except Exception as e:
            if not _summary_columns_warned:
                logger.warning(
                    "Rolling summary columns not available — run "
                    "migrations/add_summary_fields.sql. Error: %s", e
                )
                _summary_columns_warned = True
            logger.error(
                "Failed to update rolling summary for session %s: %s",
                session_id, str(e)
            )

    def get_sessions_needing_finalization(
        self, user_id: str, timeout_seconds: int
    ) -> List[Dict[str, Any]]:
        """
        Find active sessions that have been inactive beyond the timeout threshold
        and have no final summary yet.

        Args:
            user_id: The user whose sessions to check.
            timeout_seconds: Inactivity threshold in seconds.

        Returns:
            List of session dicts needing finalization. Empty list on error.
        """
        global _summary_columns_warned
        self._validate_user_id(user_id)

        try:
            threshold = (
                datetime.now(timezone.utc) - timedelta(seconds=timeout_seconds)
            ).isoformat()

            result = self.client.table("chat_sessions") \
                .select("*") \
                .eq("user_id", user_id) \
                .eq("status", "active") \
                .is_("final_summary", "null") \
                .lt("updated_at", threshold) \
                .execute()

            return result.data or []
        except Exception as e:
            if not _summary_columns_warned:
                logger.warning(
                    "Rolling summary columns not available — run "
                    "migrations/add_summary_fields.sql. Error: %s", e
                )
                _summary_columns_warned = True
            return []

    def finalize_session(self, session_id: str, final_summary: str) -> None:
        """
        Mark a session as completed and store its final summary.

        Args:
            session_id: The session to finalize.
            final_summary: The comprehensive final summary text.
        """
        global _summary_columns_warned
        self._validate_session_id(session_id)

        try:
            self.client.table("chat_sessions") \
                .update({
                    "status": "completed",
                    "final_summary": final_summary,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }) \
                .eq("id", session_id) \
                .execute()
        except Exception as e:
            if not _summary_columns_warned:
                logger.warning(
                    "Rolling summary columns not available — run "
                    "migrations/add_summary_fields.sql. Error: %s", e
                )
                _summary_columns_warned = True
            logger.error(
                "Failed to finalize session %s: %s",
                session_id, str(e)
            )

    def increment_message_count(self, session_id: str, count: int = 1) -> int:
        """
        Atomically increment the message_count for a session.

        Uses a Supabase RPC function to avoid read-then-write race conditions.
        Falls back to non-atomic increment if the RPC function doesn't exist.

        Args:
            session_id: The session to update.
            count: Number to increment by (e.g. 2 after saving user + assistant).

        Returns:
            New message count. Returns 0 on failure.
        """
        global _summary_columns_warned
        self._validate_session_id(session_id)

        try:
            # Atomic increment via PostgreSQL function
            logger.debug("[SESSION_MGR] Incrementing count for %s by %d", session_id, count)
            result = self.client.rpc("increment_message_count", {
                "p_session_id": session_id,
                "p_count": count,
            }).execute()

            if result.data is not None:
                new_count = result.data if isinstance(result.data, int) else 0
                logger.debug("[SESSION_MGR] Message count for %s: %d (via RPC)", session_id, new_count)
                return new_count
            return 0

        except Exception as e:
            error_str = str(e).lower()

            # If RPC function doesn't exist, fall back to non-atomic approach
            if "function" in error_str and "not found" in error_str:
                logger.warning(
                    "[SESSION_MGR] RPC increment_message_count not found — "
                    "falling back to non-atomic increment for %s. Create the "
                    "function from migrations/add_summary_fields.sql.",
                    session_id
                )
                return self._increment_message_count_fallback(session_id, count)

            if not _summary_columns_warned:
                logger.warning(
                    "Rolling summary columns not available — run "
                    "migrations/add_summary_fields.sql. Error: %s", e
                )
                _summary_columns_warned = True
            return 0

    def _increment_message_count_fallback(self, session_id: str, count: int) -> int:
        """
        Non-atomic fallback for increment_message_count.
        Used only when the RPC function hasn't been created yet.
        Has a theoretical race condition under concurrent writes to the same session.
        """
        try:
            result = self.client.table("chat_sessions") \
                .select("message_count") \
                .eq("id", session_id) \
                .execute()

            current_count = 0
            if result.data and result.data[0].get("message_count") is not None:
                current_count = result.data[0]["message_count"]

            new_count = current_count + count

            self.client.table("chat_sessions") \
                .update({"message_count": new_count}) \
                .eq("id", session_id) \
                .execute()

            logger.debug("[SESSION_MGR] Message count for %s: %d (via fallback)", session_id, new_count)
            return new_count
        except Exception:
            return 0
