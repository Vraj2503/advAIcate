"""
RAG Pipeline for Document Retrieval
Handles document-based question answering
"""
from typing import List, Dict, Any, Optional
from supabase_client import get_supabase_manager
from embedding_utils import get_embedding_generator
from document_processor import get_document_processor

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
            user_id: User ID
            session_id: Chat session ID
            file_name: Name of the file
            file_content: Binary content of the file
            file_type: MIME type
            
        Returns:
            Dictionary with processing results
        """
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
            print(f"[RAG] Extracting text from {file_type} document...")
            extracted_text = self.doc_processor.extract_text(file_content, file_type)
            
            if not extracted_text or not extracted_text.strip():
                print(f"[RAG] Error: No text extracted from document")
                return {"success": False, "error": "No text could be extracted from document"}
            
            print(f"[RAG] Extracted {len(extracted_text)} characters of text")
            
            # 3. Chunk the text (using smaller chunks for better retrieval)
            print(f"[RAG] Chunking text...")
            chunks = self.doc_processor.chunk_text(extracted_text, chunk_size=300, overlap=50)
            print(f"[RAG] Created {len(chunks)} chunks")
            
            # 4. Generate embedding for full document (for metadata)
            print(f"[RAG] Generating document summary and embedding...")
            doc_summary = self.doc_processor.generate_document_summary(extracted_text, max_length=1000)
            doc_embedding = self.embedder.generate_embedding(doc_summary)
            print(f"[RAG] Generated embedding with {len(doc_embedding)} dimensions")
            
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
                # Generate embeddings for chunks in batch
                print(f"[RAG] Generating embeddings for {len(chunks)} chunks...")
                chunk_texts = [chunk['text'] for chunk in chunks]
                chunk_embeddings = self.embedder.generate_embeddings(chunk_texts)
                print(f"[RAG] Storing chunks in database...")
                
                # Store each chunk as a document insight
                for chunk, embedding in zip(chunks, chunk_embeddings):
                    try:
                        insight_data = {
                            "document_id": doc_metadata['id'],
                            "insight_type": "chunk",
                            "content": chunk['text'],
                            "embedding": embedding,
                            "created_at": doc_metadata['created_at']
                        }
                        
                        self.supabase.client.table("document_insights").insert(insight_data).execute()
                        insights_stored += 1
                    except Exception as e:
                        print(f"[RAG] Error storing chunk {chunk['chunk_id']}: {e}")
            
            return {
                "success": True,
                "document_id": doc_metadata['id'],
                "file_name": file_name,
                "storage_path": storage_path,
                "chunks_stored": insights_stored,
                "summary": doc_summary[:200] + "..." if len(doc_summary) > 200 else doc_summary
            }
        
        except Exception as e:
            print(f"Error processing document: {e}")
            return {"success": False, "error": str(e)}
    
    def retrieve_relevant_context(
        self,
        query: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        top_k: int = 5,
        include_past_conversations: bool = True
    ) -> Dict[str, Any]:
        """
        Retrieve relevant context from documents and past conversations
        
        Args:
            query: User's question
            user_id: User ID for filtering
            session_id: Current session ID
            top_k: Number of top results to return
            include_past_conversations: Whether to search past conversations
            
        Returns:
            Dictionary with retrieved context
        """
        try:
            # Generate query embedding
            print(f"[RAG] Generating embedding for query: '{query[:50]}...'")
            query_embedding = self.embedder.generate_embedding(query)
            
            # Search relevant document chunks
            print(f"[RAG] Searching for relevant document chunks (top_k={top_k})...")
            doc_results = self._search_document_insights(
                query_embedding=query_embedding,
                user_id=user_id,
                session_id=session_id,
                top_k=top_k
            )
            print(f"[RAG] Found {len(doc_results)} relevant chunks")
            
            # Search relevant past conversations (if enabled)
            conversation_results = []
            if include_past_conversations and user_id:
                print(f"[RAG] Searching for similar past conversations...")
                conversation_results = self.supabase.search_similar_conversations(
                    query_embedding=query_embedding,
                    user_id=user_id,
                    limit=3,
                    threshold=0.6
                )
                print(f"[RAG] Found {len(conversation_results)} similar conversations")
            
            return {
                "success": True,
                "document_context": doc_results,
                "conversation_context": conversation_results,
                "has_context": len(doc_results) > 0 or len(conversation_results) > 0
            }
        
        except Exception as e:
            print(f"Error retrieving context: {e}")
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
        user_id: Optional[str],
        session_id: Optional[str],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Search document insights using vector similarity"""
        try:
            # Use RPC function for similarity search
            rpc_params = {
                "query_embedding": query_embedding,
                "match_threshold": 0.5,  # Lowered threshold for better recall
                "match_count": top_k
            }
            
            if user_id:
                rpc_params["user_id_filter"] = user_id
            if session_id:
                rpc_params["session_id_filter"] = session_id
            
            result = self.supabase.client.rpc("match_document_insights", rpc_params).execute()
            return result.data or []
        
        except Exception as e:
            print(f"Error searching document insights: {e}")
            # Fallback: get recent documents without similarity search
            if session_id:
                docs = self.supabase.get_session_documents(session_id)
                return [{"content": doc.get("content", "")[:500]} for doc in docs[:top_k]]
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
                context_parts.append(content[:500])  # Limit length
        
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
