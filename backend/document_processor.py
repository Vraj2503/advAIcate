"""
Document Processing Utilities
Handles file upload, text extraction, and chunking
"""
import io
import PyPDF2
import docx
from typing import Dict, List, Optional, BinaryIO
import tiktoken

class DocumentProcessor:
    """Process various document types and extract text"""
    
    def __init__(self):
        self.supported_types = {
            'application/pdf': self.extract_pdf_text,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': self.extract_docx_text,
            'text/plain': self.extract_text_file,
        }
        # Initialize tokenizer for chunking
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except:
            self.tokenizer = None
    
    def extract_text(self, file_content: bytes, file_type: str) -> str:
        """
        Extract text from a file based on its type
        
        Args:
            file_content: Binary content of the file
            file_type: MIME type of the file
            
        Returns:
            Extracted text as string
        """
        extractor = self.supported_types.get(file_type)
        
        if not extractor:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        return extractor(file_content)
    
    def extract_pdf_text(self, file_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text_parts = []
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text.strip():
                    text_parts.append(f"[Page {page_num + 1}]\n{text}")
            
            return "\n\n".join(text_parts)
        except Exception as e:
            raise ValueError(f"Error extracting PDF text: {e}")
    
    def extract_docx_text(self, file_content: bytes) -> str:
        """Extract text from DOCX file"""
        try:
            docx_file = io.BytesIO(file_content)
            doc = docx.Document(docx_file)
            
            text_parts = []
            for para in doc.paragraphs:
                if para.text.strip():
                    text_parts.append(para.text)
            
            return "\n\n".join(text_parts)
        except Exception as e:
            raise ValueError(f"Error extracting DOCX text: {e}")
    
    def extract_text_file(self, file_content: bytes) -> str:
        """Extract text from plain text file"""
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            # Try with different encoding
            return file_content.decode('latin-1')
    
    def chunk_text(
        self, 
        text: str, 
        chunk_size: int = 500, 
        overlap: int = 50
    ) -> List[Dict[str, any]]:
        """
        Split text into chunks with overlap for better context preservation
        
        Args:
            text: Input text to chunk
            chunk_size: Maximum tokens per chunk
            overlap: Number of tokens to overlap between chunks
            
        Returns:
            List of dictionaries with chunk text and metadata
        """
        if not self.tokenizer:
            # Fallback to character-based chunking
            return self._chunk_by_characters(text, chunk_size * 4, overlap * 4)
        
        # Tokenize the text
        tokens = self.tokenizer.encode(text)
        chunks = []
        
        start = 0
        chunk_id = 0
        
        while start < len(tokens):
            # Get chunk with overlap
            end = start + chunk_size
            chunk_tokens = tokens[start:end]
            
            # Decode back to text
            chunk_text = self.tokenizer.decode(chunk_tokens)
            
            chunks.append({
                'chunk_id': chunk_id,
                'text': chunk_text,
                'start_token': start,
                'end_token': min(end, len(tokens)),
                'token_count': len(chunk_tokens)
            })
            
            # Move start position (accounting for overlap)
            start += chunk_size - overlap
            chunk_id += 1
        
        return chunks
    
    def _chunk_by_characters(
        self, 
        text: str, 
        chunk_size: int, 
        overlap: int
    ) -> List[Dict[str, any]]:
        """Fallback character-based chunking"""
        chunks = []
        start = 0
        chunk_id = 0
        
        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end]
            
            chunks.append({
                'chunk_id': chunk_id,
                'text': chunk_text,
                'start_char': start,
                'end_char': min(end, len(text)),
                'char_count': len(chunk_text)
            })
            
            start += chunk_size - overlap
            chunk_id += 1
        
        return chunks
    
    def generate_document_summary(self, text: str, max_length: int = 500) -> str:
        """
        Generate a simple extractive summary of the document
        
        Args:
            text: Full document text
            max_length: Maximum length of summary in characters
            
        Returns:
            Summary text
        """
        # Simple extractive summary: take first N characters
        # In production, you might want to use a proper summarization model
        if len(text) <= max_length:
            return text
        
        # Find a good breaking point (end of sentence)
        summary = text[:max_length]
        last_period = summary.rfind('.')
        last_newline = summary.rfind('\n')
        
        break_point = max(last_period, last_newline)
        if break_point > max_length * 0.7:  # Only break if it's not too short
            summary = summary[:break_point + 1]
        
        return summary + "..."
    
    def is_supported(self, file_type: str) -> bool:
        """Check if file type is supported"""
        return file_type in self.supported_types


# Global instance
_document_processor = None

def get_document_processor() -> DocumentProcessor:
    """Get or create the global document processor instance"""
    global _document_processor
    if _document_processor is None:
        _document_processor = DocumentProcessor()
    return _document_processor
