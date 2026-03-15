"""
Document Manager — file upload, metadata storage, and document retrieval.
"""

import logging
import uuid
from typing import Optional, Dict, List, Any
from datetime import datetime
from managers.base_manager import BaseManager, OwnershipError

logger = logging.getLogger(__name__)


class DocumentManager(BaseManager):
    """Manages document storage and metadata."""

    def _verify_session_ownership(self, session_id: str, user_id: str):
        """Delegate to SessionManager for ownership check."""
        from managers.session_manager import SessionManager
        sm = SessionManager()
        return sm._verify_session_ownership(session_id, user_id)

    def upload_document(
        self,
        user_id: str,
        session_id: str,
        file_name: str,
        file_content: bytes,
        file_type: str
    ) -> Optional[str]:
        """Upload raw document to Supabase Storage."""
        self._validate_user_id(user_id)
        self._validate_session_id(session_id)
        self._verify_session_ownership(session_id, user_id)

        try:
            file_path = f"{user_id}/{session_id}/{uuid.uuid4()}_{file_name}"

            self.client.storage.from_(self.storage_bucket).upload(
                file_path,
                file_content,
                {"content-type": file_type}
            )

            return file_path
        except OwnershipError:
            raise
        except Exception as e:
            logger.error("Error uploading document: %s", str(e))
            return None

    def save_document_metadata(
        self,
        user_id: str,
        session_id: str,
        file_name: str,
        file_type: str,
        storage_path: str,
        content: str,
        embedding: Optional[List[float]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Save parsed document metadata."""
        self._validate_user_id(user_id)
        self._validate_session_id(session_id)
        self._verify_session_ownership(session_id, user_id)

        data = {
            "user_id": user_id,
            "session_id": session_id,
            "file_name": file_name,
            "file_type": file_type,
            "storage_path": storage_path,
            "content": content,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat()
        }

        if embedding is not None:
            data["embedding"] = embedding

        result = self.client.table("user_documents").insert(data).execute()
        return result.data[0] if result.data else None

    def get_session_documents(self, session_id: str) -> List[Dict[str, Any]]:
        """Fetch documents for a session."""
        self._validate_session_id(session_id)

        result = self.client.table("user_documents") \
            .select("*") \
            .eq("session_id", session_id) \
            .order("created_at", desc=True) \
            .execute()
        return result.data or []
