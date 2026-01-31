"""
Supabase Client Configuration and Utilities
Handles all Supabase operations for the Legal AI Assistant

IMPORTANT:
- Supabase Auth is the ONLY source of truth for users
- This file NEVER inserts into the `users` table
- All user_id values MUST come from verified Supabase JWTs
"""

import os
from supabase import create_client, Client
from typing import Optional, Dict, List, Any
from datetime import datetime
import uuid


class SupabaseManager:
    """Manages all Supabase database operations (Auth-safe)"""

    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

        # Ensure URL has trailing slash for storage API
        if not supabase_url.endswith('/'):
            supabase_url = supabase_url + '/'

        self.client: Client = create_client(supabase_url, supabase_key)
        self.storage_bucket = "user-documents"

    # ==================== Chat Session Management ====================

    def create_session(
        self,
        user_id: str,
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new chat session.

        user_id MUST be a valid Supabase Auth user ID.
        If this fails, authentication is broken (as intended).
        """
        session_data = {
            "user_id": user_id,
            "title": title or "New Conversation",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        result = self.client.table("chat_sessions").insert(session_data).execute()
        return result.data[0] if result.data else None

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific chat session"""
        result = self.client.table("chat_sessions") \
            .select("*") \
            .eq("id", session_id) \
            .execute()
        return result.data[0] if result.data else None

    def get_user_sessions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all sessions for a user"""
        result = self.client.table("chat_sessions") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("updated_at", desc=True) \
            .limit(limit) \
            .execute()
        return result.data or []

    def update_session(self, session_id: str, title: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update session metadata"""
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        if title:
            update_data["title"] = title

        result = self.client.table("chat_sessions") \
            .update(update_data) \
            .eq("id", session_id) \
            .execute()

        return result.data[0] if result.data else None
    
    def end_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Mark a session as completed"""
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
        """Get the summary for a session"""
        result = self.client.table("conversation_summaries") \
            .select("*") \
            .eq("session_id", session_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        return result.data[0] if result.data else None
    
    def get_active_sessions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all active sessions for a user"""
        result = self.client.table("chat_sessions") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("status", "active") \
            .order("updated_at", desc=True) \
            .limit(limit) \
            .execute()
        return result.data or []
    
    def get_completed_sessions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all completed sessions for a user"""
        result = self.client.table("chat_sessions") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("status", "completed") \
            .order("updated_at", desc=True) \
            .limit(limit) \
            .execute()
        return result.data or []

    # ==================== Message Management ====================

    def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        topic: str = "general",
        extension: str = "none",
        token_count: Optional[int] = None
    ) -> Dict[str, Any]:
        """Persist a chat message"""
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
        """Fetch messages for a session"""
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
        """Get last N messages (chronological order)"""
        result = self.client.table("messages") \
            .select("*") \
            .eq("session_id", session_id) \
            .order("created_at", desc=True) \
            .limit(count) \
            .execute()

        return list(reversed(result.data)) if result.data else []

    # ==================== Conversation Summaries ====================

    def save_conversation_summary(
        self,
        session_id: str,
        summary_text: str,
        embedding: Optional[List[float]] = None,
        summary_level: str = "session",
        start_message_id: Optional[str] = None,
        end_message_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Save a semantic summary of a conversation"""
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

    # ==================== Document Management ====================

    def upload_document(
        self,
        user_id: str,
        session_id: str,
        file_name: str,
        file_content: bytes,
        file_type: str
    ) -> Optional[str]:
        """Upload raw document to Supabase Storage"""
        try:
            file_path = f"{user_id}/{session_id}/{uuid.uuid4()}_{file_name}"

            self.client.storage.from_(self.storage_bucket).upload(
                file_path,
                file_content,
                {"content-type": file_type}
            )

            return file_path
        except Exception as e:
            print(f"Error uploading document: {e}")
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
        """Save parsed document chunks"""
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
        """Fetch documents for a session"""
        result = self.client.table("user_documents") \
            .select("*") \
            .eq("session_id", session_id) \
            .order("created_at", desc=True) \
            .execute()
        return result.data or []

    # ==================== User Memory ====================

    def save_user_memory(
        self,
        user_id: str,
        memory_type: str,
        content: str,
        embedding: Optional[List[float]] = None,
        confidence: float = 1.0
    ) -> Dict[str, Any]:
        """Persist extracted user memory"""
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
        return result.data[0] if result.data else None

    def get_user_memories(
        self,
        user_id: str,
        memory_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve user memory"""
        query = self.client.table("user_memory") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("last_seen", desc=True)

        if memory_type:
            query = query.eq("memory_type", memory_type)

        result = query.execute()
        return result.data or []
    
    # ==================== Vector Search ====================
    
    def search_similar_conversations(
        self,
        query_embedding: List[float],
        user_id: Optional[str] = None,
        limit: int = 5,
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Search for similar past conversations using vector similarity"""
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
            print(f"Error searching similar conversations: {e}")
            return []


# ==================== Global Singleton ====================

_supabase_manager: Optional[SupabaseManager] = None


def get_supabase_manager() -> SupabaseManager:
    global _supabase_manager
    if _supabase_manager is None:
        _supabase_manager = SupabaseManager()
    return _supabase_manager
