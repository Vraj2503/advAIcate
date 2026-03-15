"""
RAG Pipeline for Document Retrieval
Handles document-based question answering
"""
import logging
from typing import List, Dict, Any, Optional
from supabase_client import get_supabase_manager
from embedding_utils import get_embedding_generator
from document_processor import get_document_processor
from config import RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP, RAG_MATCH_THRESHOLD, RAG_TOP_K

logger = logging.getLogger(__name__)


class RAGPipeline:
    """RAG Pipeline for retrieving relevant context from documents"""
    
    def __init__(self):
        self.supabase = get_supabase_manager()
        self.embedder = get_embedding_generator()
        self.doc_processor = get_document_processor()
    
    def process_and_store_document(
        self,
        user_id: str,
        session_id: str,
        file_name: str,
        file_content: bytes,
        file_type: str
    ) -> Dict[str, Any]:
        """
        Process a document: extract text, chunk, embed, and store
        
        Args:
            user_id: User ID (REQUIRED — must come from verified JWT)
            session_id: Chat session ID (REQUIRED — must be ownership-verified)
            file_name: Name of the file
            file_content: Binary content of the file
            file_type: MIME type
            
        Returns:
            Dictionary with processing results
        """
        # --- SECURITY: Enforce required parameters ---
        if not user_id or not user_id.strip():
            return {"success": False, "error": "user_id is required"}
        if not session_id or not session_id.strip():
            return {"success": False, "error": "session_id is required"}
        
        try:
            # 1. Upload file to storage
            storage_path = self.supabase.upload_document(
                user_id=user_id,
                session_id=session_id,
                file_name=file_name,
                file_content=file_content,
                file_type=file_type
            )
            
            if not storage_path:
                return {"success": False, "error": "Failed to upload file"}
            
            # 2. Extract text from document
            logger.info("Extracting text from %s document...", file_type)
            extracted_text = self.doc_processor.extract_text(file_content, file_type)
            
            if not extracted_text or not extracted_text.strip():
                logger.error("No text extracted from document")
                return {"success": False, "error": "No text could be extracted from document"}
            
            logger.info("Extracted %d characters of text", len(extracted_text))
            
            # 3. Chunk the text
            logger.info("Chunking text...")
            chunks = self.doc_processor.chunk_text(extracted_text, chunk_size=RAG_CHUNK_SIZE, overlap=RAG_CHUNK_OVERLAP)
            logger.info("Created %d chunks", len(chunks))
            
            # 4. Generate embedding for full document
            logger.info("Generating document summary and embedding...")
            doc_summary = self.doc_processor.generate_document_summary(extracted_text, max_length=1000)
            doc_embedding = self.embedder.generate_embedding(doc_summary)
            logger.info("Generated embedding with %d dimensions", len(doc_embedding))
            
            # 5. Store document metadata
            doc_metadata = self.supabase.save_document_metadata(
                user_id=user_id,
                session_id=session_id,
                file_name=file_name,
                file_type=file_type,
                storage_path=storage_path,
                content=extracted_text,
                embedding=doc_embedding,
                metadata={
                    "chunk_count": len(chunks),
                    "total_length": len(extracted_text),
                    "summary": doc_summary
                }
            )
            
            # 6. Store document insights (chunks with embeddings)
            insights_stored = 0
            if len(chunks) > 0 and doc_metadata:
                logger.info("Generating embeddings for %d chunks...", len(chunks))
                chunk_texts = [chunk['text'] for chunk in chunks]
                chunk_embeddings = self.embedder.generate_embeddings(chunk_texts)
                logger.info("Storing chunks in database...")
                
                for chunk, embedding in zip(chunks, chunk_embeddings):
                    try:
                        # --- SECURITY FIX: Store user_id and session_id on each chunk ---
                        # Defense in depth: even if RPC filter fails,
                        # chunks are traceable to their owner
                        insight_data = {
                            "document_id": doc_metadata['id'],
                            "user_id": user_id,
                            "session_id": session_id,
                            "insight_type": "chunk",
                            "content": chunk['text'],
                            "embedding": embedding,
                            "created_at": doc_metadata['created_at']
                        }
                        
                        self.supabase.client.table("document_insights").insert(insight_data).execute()
                        insights_stored += 1
                    except Exception as e:
                        logger.error("Error storing chunk %s: %s", chunk.get('chunk_id', '?'), e)
            
            return {
                "success": True,
                "document_id": doc_metadata['id'],
                "file_name": file_name,
                "storage_path": storage_path,
                "chunks_stored": insights_stored,
                "summary": doc_summary[:200] + "..." if len(doc_summary) > 200 else doc_summary
            }
        
        except Exception as e:
            logger.error("Error processing document: %s", e)
            return {"success": False, "error": str(e)}
    
    def retrieve_relevant_context(
        self,
        query: str,
        user_id: str,
        session_id: str,
        top_k: int = 5,
        include_past_conversations: bool = True
    ) -> Dict[str, Any]:
        """
        Retrieve relevant context from documents and past conversations
        
        Args:
            query: User's question
            user_id: User ID for filtering (REQUIRED — must come from verified JWT)
            session_id: Current session ID (REQUIRED — must be ownership-verified)
            top_k: Number of top results to return
            include_past_conversations: Whether to search past conversations
            
        Returns:
            Dictionary with retrieved context
        """
        # --- SECURITY FIX: user_id and session_id are now REQUIRED ---
        # Previously Optional[str] = None, meaning callers could
        # accidentally do unscoped searches across all users
        if not user_id or not user_id.strip():
            logger.warning("SECURITY: retrieve_relevant_context called without user_id — aborting")
            return {
                "success": False,
                "error": "user_id is required for retrieval",
                "document_context": [],
                "conversation_context": [],
                "has_context": False
            }
        
        if not session_id or not session_id.strip():
            logger.warning("SECURITY: retrieve_relevant_context called without session_id — aborting")
            return {
                "success": False,
                "error": "session_id is required for retrieval",
                "document_context": [],
                "conversation_context": [],
                "has_context": False
            }
        
        try:
            # Generate query embedding
            logger.info("Generating embedding for query: '%s...'", query[:50])
            query_embedding = self.embedder.generate_embedding(query)
            
            # Search relevant document chunks (always scoped to user + session)
            logger.info("Searching for relevant document chunks (top_k=%d)...", top_k)
            doc_results = self._search_document_insights(
                query_embedding=query_embedding,
                user_id=user_id,
                session_id=session_id,
                top_k=top_k
            )
            logger.info("Found %d relevant chunks", len(doc_results))
            
            # Search relevant past conversations (always scoped to user)
            conversation_results = []
            if include_past_conversations:
                logger.info("Searching for similar past conversations...")
                conversation_results = self.supabase.search_similar_conversations(
                    query_embedding=query_embedding,
                    user_id=user_id,
                    limit=3,
                    threshold=0.6
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
            return {
                "success": False,
                "error": str(e),
                "document_context": [],
                "conversation_context": [],
                "has_context": False
            }
    
    def _search_document_insights(
        self,
        query_embedding: List[float],
        user_id: str,
        session_id: str,
        top_k: int
    ) -> List[Dict[str, Any]]:
        """
        Search document insights using vector similarity.
        
        SECURITY: user_id and session_id are REQUIRED.
        Every search is scoped to the authenticated user's session.
        """
        try:
            # --- SECURITY FIX: Always pass both filters, never optional ---
            rpc_params = {
                "query_embedding": query_embedding,
                "match_threshold": RAG_MATCH_THRESHOLD,
                "match_count": top_k,
                "user_id_filter": user_id,
                "session_id_filter": session_id
            }
            
            result = self.supabase.client.rpc("match_document_insights", rpc_params).execute()
            return result.data or []
        
        except Exception as e:
            logger.error("Error searching document insights: %s", e)
            
            # --- SECURITY FIX: Fallback also scoped by session_id ---
            # Session ownership is already verified at route level,
            # but we add a defensive comment documenting this assumption
            #
            # NOTE: This fallback is safe ONLY because the calling route
            # has already verified session ownership via enforce_session_ownership().
            # If this method is ever called from a context without prior
            # ownership verification, this fallback would need its own check.
            try:
                if session_id:
                    docs = self.supabase.get_session_documents(session_id)
                    return [
                        {
                            "content": doc.get("content", "")[:500],
                            "source": "fallback"
                        }
                        for doc in docs[:top_k]
                    ]
            except Exception as fallback_error:
                logger.error("Error in fallback retrieval: %s", fallback_error)
            
            return []
    
    def format_context_for_prompt(self, context_data: Dict[str, Any]) -> str:
        """
        Format retrieved context for inclusion in LLM prompt
        
        Args:
            context_data: Dictionary with document and conversation context
            
        Returns:
            Formatted context string
        """
        if not context_data.get("has_context"):
            return ""
        
        context_parts = []
        
        # Add document context
        doc_context = context_data.get("document_context", [])
        if doc_context:
            context_parts.append("=== Relevant Information from Uploaded Documents ===")
            for i, doc in enumerate(doc_context, 1):
                content = doc.get("content", "")
                context_parts.append(f"\n[Document Extract {i}]")
                context_parts.append(content[:500])
        
        # Add conversation context
        conv_context = context_data.get("conversation_context", [])
        if conv_context:
            context_parts.append("\n\n=== Related Past Conversations ===")
            for i, conv in enumerate(conv_context, 1):
                summary = conv.get("summary_text", "")
                context_parts.append(f"\n[Past Conversation {i}]")
                context_parts.append(summary[:300])
        
        if context_parts:
            context_parts.append("\n\n=== End of Context ===\n")
        
        return "\n".join(context_parts)


# Global instance
_rag_pipeline = None

def get_rag_pipeline() -> RAGPipeline:
    """Get or create the global RAG pipeline instance"""
    global _rag_pipeline
    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline()
    return _rag_pipeline