"""
Memory Manager — user memory persistence and vector similarity search.
"""

import logging
from typing import Optional, Dict, List, Any
from datetime import datetime
from managers.base_manager import BaseManager
from config import ALLOWED_MEMORY_TYPES

logger = logging.getLogger(__name__)


class MemoryManager(BaseManager):
    """Manages user memory and vector similarity search."""

    def _verify_session_ownership(self, session_id: str, user_id: str):
        """Delegate to SessionManager for ownership check."""
        from managers.session_manager import SessionManager
        sm = SessionManager()
        return sm._verify_session_ownership(session_id, user_id)

    def save_user_memory(
        self,
        user_id: str,
        memory_type: str,
        content: str,
        session_id: Optional[str] = None,
        embedding: Optional[List[float]] = None,
        confidence: float = 1.0
    ) -> Dict[str, Any]:
        """Persist extracted user memory."""
        self._validate_user_id(user_id)

        if session_id:
            self._validate_session_id(session_id)
            self._verify_session_ownership(session_id, user_id)

        if memory_type not in ALLOWED_MEMORY_TYPES:
            logger.warning(
                "Unknown memory_type '%s' for user %s — defaulting to 'general'",
                memory_type, user_id
            )
            memory_type = "general"

        confidence = max(0.0, min(1.0, confidence))

        data = {
            "user_id": user_id,
            "memory_type": memory_type,
            "content": content,
            "confidence": confidence,
            "last_seen": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat()
        }

        if embedding is not None:
            data["embedding"] = embedding

        result = self.client.table("user_memory").insert(data).execute()

        logger.info(
            "Saved user memory: user=%s, type=%s, confidence=%.2f",
            user_id, memory_type, confidence
        )

        return result.data[0] if result.data else None

    def get_user_memories(
        self,
        user_id: str,
        memory_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve user memory — always scoped by user_id."""
        self._validate_user_id(user_id)

        query = self.client.table("user_memory") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("last_seen", desc=True)

        if memory_type:
            query = query.eq("memory_type", memory_type)

        result = query.execute()
        return result.data or []

    def search_similar_conversations(
        self,
        query_embedding: List[float],
        user_id: Optional[str] = None,
        limit: int = 5,
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Search for similar past conversations using vector similarity."""
        if user_id:
            self._validate_user_id(user_id)

        try:
            rpc_params = {
                "query_embedding": query_embedding,
                "match_threshold": threshold,
                "match_count": limit
            }

            if user_id:
                rpc_params["user_id_filter"] = user_id

            result = self.client.rpc("match_conversation_summaries", rpc_params).execute()
            return result.data or []
        except Exception as e:
            logger.error(
                "Error searching similar conversations for user %s: %s",
                user_id, str(e)
            )
            return []
