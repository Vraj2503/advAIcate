"""
Embedding Generation Utilities
Handles text embeddings for RAG and semantic search
Using transformers library directly for better compatibility with Gemma
"""
import torch
from transformers import AutoTokenizer, AutoModel
import numpy as np
from typing import List, Union
import os

class EmbeddingGenerator:
    """Generate embeddings for text using transformers directly"""
    
    def __init__(self, model_name: str = "BAAI/bge-base-en-v1.5"):
        """

        Initialize the embedding generator
        
        Args:
            model_name: HuggingFace model name for embeddings
                       Default: BAAI/bge-base-en-v1.5
        """
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._load_model()
    
    def _load_model(self):
        """Load the model using transformers"""
        try:
            print(f"Loading embedding model '{self.model_name}' on {self.device}...")

            # IMPORTANT: Force authenticated loading
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                use_auth_token=True
            )

            self.model = AutoModel.from_pretrained(
                self.model_name,
                use_auth_token=True
            )

            self.model.to(self.device)
            self.model.eval()

            print(f"✓ Embedding model '{self.model_name}' loaded successfully on {self.device}")

        except Exception as e:
            print(f"✗ Error loading embedding model: {e}")
            print("   This usually means:")
            print("   1. Hugging Face token is not visible to transformers")
            print("   2. Internet access is blocked")
            print("   3. Model access was not granted")
            self.model = None
            self.tokenizer = None

    
    def _mean_pooling(self, model_output, attention_mask):
        """Apply mean pooling to get sentence embeddings"""
        token_embeddings = model_output[0]  # First element contains token embeddings
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        return sum_embeddings / sum_mask
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Input text string
            
        Returns:
            List of floats representing the embedding vector
        """
        if not self.model or not self.tokenizer:
            self._load_model()
        
        if not self.model or not self.tokenizer:
            raise RuntimeError("Embedding model not available")
        
        # Tokenize
        encoded_input = self.tokenizer(
            text,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors='pt'
        ).to(self.device)
        
        # Generate embeddings
        with torch.no_grad():
            model_output = self.model(**encoded_input)
        
        # Apply mean pooling
        sentence_embedding = self._mean_pooling(model_output, encoded_input['attention_mask'])
        
        # Normalize embeddings
        sentence_embedding = torch.nn.functional.normalize(sentence_embedding, p=2, dim=1)
        
        # Convert to list for JSON serialization
        return sentence_embedding.cpu().numpy()[0].tolist()
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (batch processing)
        
        Args:
            texts: List of text strings
            
        Returns:
            List of embedding vectors
        """
        if not self.model or not self.tokenizer:
            self._load_model()
        
        if not self.model or not self.tokenizer:
            raise RuntimeError("Embedding model not available")
        
        # Tokenize all texts
        encoded_input = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors='pt'
        ).to(self.device)
        
        # Generate embeddings
        with torch.no_grad():
            model_output = self.model(**encoded_input)
        
        # Apply mean pooling
        sentence_embeddings = self._mean_pooling(model_output, encoded_input['attention_mask'])
        
        # Normalize embeddings
        sentence_embeddings = torch.nn.functional.normalize(sentence_embeddings, p=2, dim=1)
        
        # Convert to list of lists
        return sentence_embeddings.cpu().numpy().tolist()
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of the embedding vectors"""
        if not self.model:
            self._load_model()
        
        if self.model:
            # Get the hidden size from model config
            return self.model.config.hidden_size
        return 768  # Default fallback


# Global instance
_embedding_generator = None

def get_embedding_generator() -> EmbeddingGenerator:
    """Get or create the global embedding generator instance"""
    global _embedding_generator
    if _embedding_generator is None:
        _embedding_generator = EmbeddingGenerator()
    return _embedding_generator
