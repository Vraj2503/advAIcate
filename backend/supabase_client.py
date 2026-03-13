"""
Supabase Client — Backward-Compatible Facade

This module re-exports all functionality from the new managers/ package.
Existing code that imports from supabase_client continues to work unchanged.

The actual logic now lives in:
  - managers/base_manager.py     — shared client, validation, exceptions
  - managers/session_manager.py  — session CRUD + ownership
  - managers/message_manager.py  — message CRUD + summaries
  - managers/document_manager.py — file upload + metadata
  - managers/memory_manager.py   — user memory + vector search
"""

from managers.base_manager import OwnershipError, ValidationError, _is_valid_uuid
from managers.session_manager import SessionManager
from managers.message_manager import MessageManager
from managers.document_manager import DocumentManager
from managers.memory_manager import MemoryManager

from typing import Optional


class SupabaseManager:
    """
    Facade that delegates to focused domain managers.
    Provides the same interface as the original monolithic class.
    """

    def __init__(self):
        self._session = SessionManager()
        self._message = MessageManager()
        self._document = DocumentManager()
        self._memory = MemoryManager()
        self.client = self._session.client
        self.storage_bucket = self._session.storage_bucket

    # Session management
    def create_session(self, *a, **kw):
        return self._session.create_session(*a, **kw)

    def get_session(self, *a, **kw):
        return self._session.get_session(*a, **kw)

    def get_user_sessions(self, *a, **kw):
        return self._session.get_user_sessions(*a, **kw)

    def update_session(self, *a, **kw):
        return self._session.update_session(*a, **kw)

    def end_session(self, *a, **kw):
        return self._session.end_session(*a, **kw)

    def get_session_summary(self, *a, **kw):
        return self._session.get_session_summary(*a, **kw)

    def get_active_sessions(self, *a, **kw):
        return self._session.get_active_sessions(*a, **kw)

    def get_completed_sessions(self, *a, **kw):
        return self._session.get_completed_sessions(*a, **kw)

    # Message management
    def save_message(self, *a, **kw):
        return self._message.save_message(*a, **kw)

    def get_session_messages(self, *a, **kw):
        return self._message.get_session_messages(*a, **kw)

    def get_recent_messages(self, *a, **kw):
        return self._message.get_recent_messages(*a, **kw)

    def save_conversation_summary(self, *a, **kw):
        return self._message.save_conversation_summary(*a, **kw)

    # Document management
    def upload_document(self, *a, **kw):
        return self._document.upload_document(*a, **kw)

    def save_document_metadata(self, *a, **kw):
        return self._document.save_document_metadata(*a, **kw)

    def get_session_documents(self, *a, **kw):
        return self._document.get_session_documents(*a, **kw)

    # Memory management
    def save_user_memory(self, *a, **kw):
        return self._memory.save_user_memory(*a, **kw)

    def get_user_memories(self, *a, **kw):
        return self._memory.get_user_memories(*a, **kw)

    def search_similar_conversations(self, *a, **kw):
        return self._memory.search_similar_conversations(*a, **kw)


# ==================== Global Singleton ====================

_supabase_manager: Optional[SupabaseManager] = None


def get_supabase_manager() -> SupabaseManager:
    global _supabase_manager
    if _supabase_manager is None:
        _supabase_manager = SupabaseManager()
    return _supabase_manager