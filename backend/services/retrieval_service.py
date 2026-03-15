"""
Retrieval Service — query → embed → search → rank → format context.
Extracted from RAGPipeline.retrieve_relevant_context() and format_context_for_prompt().
"""

import logging
from typing import Dict, List, Any
from managers.document_manager import DocumentManager
from managers.memory_manager import MemoryManager
from embedding_utils import get_embedding_generator
from config import (
    RAG_TOP_K,
    RAG_MATCH_THRESHOLD,
    RAG_CONVERSATION_THRESHOLD,
    RAG_CONTEXT_DOC_TRUNCATE,
    RAG_CONTEXT_CONV_TRUNCATE,
)

logger = logging.getLogger(__name__)


class RetrievalService:
    """Retrieves relevant context from documents and past conversations."""

    def __init__(self):
        self.doc_mgr = DocumentManager()
        self.memory_mgr = MemoryManager()
        self.embedder = get_embedding_generator()

    def retrieve(
        self,
        query: str,
        user_id: str,
        session_id: str,
        top_k: int = RAG_TOP_K,
        include_past_conversations: bool = True
    ) -> Dict[str, Any]:
        """
        Retrieve relevant context from documents and past conversations.
        user_id and session_id are REQUIRED for security scoping.
        """
        if not user_id or not user_id.strip():
            logger.warning("retrieve called without user_id — aborting")
            return self._empty_context("user_id is required for retrieval")

        if not session_id or not session_id.strip():
            logger.warning("retrieve called without session_id — aborting")
            return self._empty_context("session_id is required for retrieval")

        try:
            logger.info("Generating embedding for query: '%s...'", query[:50])
            query_embedding = self.embedder.generate_embedding(query)

            # Search relevant document chunks
            logger.info("Searching for relevant document chunks (top_k=%d)...", top_k)
            doc_results = self._search_document_insights(
                query_embedding=query_embedding,
                user_id=user_id,
                session_id=session_id,
                top_k=top_k
            )
            logger.info("Found %d relevant chunks", len(doc_results))

            # Search past conversations
            conversation_results = []
            if include_past_conversations:
                logger.info("Searching for similar past conversations...")
                conversation_results = self.memory_mgr.search_similar_conversations(
                    query_embedding=query_embedding,
                    user_id=user_id,
                    limit=3,
                    threshold=RAG_CONVERSATION_THRESHOLD
                )
                logger.info("Found %d similar conversations", len(conversation_results))

            return {
                "success": True,
                "document_context": doc_results,
                "conversation_context": conversation_results,
                "has_context": len(doc_results) > 0 or len(conversation_results) > 0
            }

        except Exception as e:
            logger.error("Error retrieving context: %s", e)
            return self._empty_context(str(e))

    def format_context(self, context_data: Dict[str, Any]) -> str:
        """Format retrieved context for inclusion in LLM prompt."""
        if not context_data.get("has_context"):
            return ""

        context_parts = []

        doc_context = context_data.get("document_context", [])
        if doc_context:
            context_parts.append("=== Relevant Information from Uploaded Documents ===")
            for i, doc in enumerate(doc_context, 1):
                content = doc.get("content", "")
                context_parts.append(f"\n[Document Extract {i}]")
                context_parts.append(content[:RAG_CONTEXT_DOC_TRUNCATE])

        conv_context = context_data.get("conversation_context", [])
        if conv_context:
            context_parts.append("\n\n=== Related Past Conversations ===")
            for i, conv in enumerate(conv_context, 1):
                summary = conv.get("summary_text", "")
                context_parts.append(f"\n[Past Conversation {i}]")
                context_parts.append(summary[:RAG_CONTEXT_CONV_TRUNCATE])

        if context_parts:
            context_parts.append("\n\n=== End of Context ===\n")

        return "\n".join(context_parts)

    def _search_document_insights(
        self,
        query_embedding: List[float],
        user_id: str,
        session_id: str,
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Search document insights using vector similarity."""
        try:
            rpc_params = {
                "query_embedding": query_embedding,
                "match_threshold": RAG_MATCH_THRESHOLD,
                "match_count": top_k,
                "user_id_filter": user_id,
                "session_id_filter": session_id
            }

            result = self.doc_mgr.client.rpc("match_document_insights", rpc_params).execute()
            return result.data or []

        except Exception as e:
            logger.error("Error searching document insights: %s", e)

            # Fallback: return raw doc content (session ownership already verified at route layer)
            try:
                if session_id:
                    docs = self.doc_mgr.get_session_documents(session_id)
                    return [
                        {"content": doc.get("content", "")[:RAG_CONTEXT_DOC_TRUNCATE], "source": "fallback"}
                        for doc in docs[:top_k]
                    ]
            except Exception as fallback_error:
                logger.error("Error in fallback retrieval: %s", fallback_error)

            return []

    @staticmethod
    def _empty_context(error: str) -> Dict[str, Any]:
        return {
            "success": False,
            "error": error,
            "document_context": [],
            "conversation_context": [],
            "has_context": False
        }
