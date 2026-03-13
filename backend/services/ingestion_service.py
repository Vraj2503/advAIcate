"""
Ingestion Service — document upload → extract → chunk → embed → store.
Extracted from RAGPipeline.process_and_store_document().
"""

import logging
from typing import Dict, Any
from managers.document_manager import DocumentManager
from document_processor import get_document_processor
from embedding_utils import get_embedding_generator
from config import RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP, RAG_DOC_SUMMARY_MAX_LENGTH

logger = logging.getLogger(__name__)


class IngestionService:
    """Processes and stores uploaded documents."""

    def __init__(self):
        self.doc_mgr = DocumentManager()
        self.doc_processor = get_document_processor()
        self.embedder = get_embedding_generator()

    def process_and_store(
        self,
        user_id: str,
        session_id: str,
        file_name: str,
        file_content: bytes,
        file_type: str
    ) -> Dict[str, Any]:
        """
        Full ingestion: upload → extract → chunk → embed → store.
        Returns dict with processing results.
        """
        if not user_id or not user_id.strip():
            return {"success": False, "error": "user_id is required"}
        if not session_id or not session_id.strip():
            return {"success": False, "error": "session_id is required"}

        try:
            # 1. Upload file to storage
            storage_path = self.doc_mgr.upload_document(
                user_id=user_id,
                session_id=session_id,
                file_name=file_name,
                file_content=file_content,
                file_type=file_type
            )

            if not storage_path:
                return {"success": False, "error": "Failed to upload file"}

            # 2. Extract text
            logger.info("Extracting text from %s document...", file_type)
            extracted_text = self.doc_processor.extract_text(file_content, file_type)

            if not extracted_text or not extracted_text.strip():
                logger.error("No text extracted from document")
                return {"success": False, "error": "No text could be extracted from document"}

            logger.info("Extracted %d characters of text", len(extracted_text))

            # 3. Chunk the text
            logger.info("Chunking text...")
            chunks = self.doc_processor.chunk_text(
                extracted_text,
                chunk_size=RAG_CHUNK_SIZE,
                overlap=RAG_CHUNK_OVERLAP
            )
            logger.info("Created %d chunks", len(chunks))

            # 4. Generate embedding for full document
            logger.info("Generating document summary and embedding...")
            doc_summary = self.doc_processor.generate_document_summary(
                extracted_text, max_length=RAG_DOC_SUMMARY_MAX_LENGTH
            )
            doc_embedding = self.embedder.generate_embedding(doc_summary)
            logger.info("Generated embedding with %d dimensions", len(doc_embedding))

            # 5. Store document metadata
            doc_metadata = self.doc_mgr.save_document_metadata(
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
                        insight_data = {
                            "document_id": doc_metadata['id'],
                            "user_id": user_id,
                            "session_id": session_id,
                            "insight_type": "chunk",
                            "content": chunk['text'],
                            "embedding": embedding,
                            "created_at": doc_metadata['created_at']
                        }

                        self.doc_mgr.client.table("document_insights").insert(insight_data).execute()
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
