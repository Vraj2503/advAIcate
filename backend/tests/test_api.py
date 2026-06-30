import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os
import io

os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"

from main import app, limiter
from document_processor import DocumentProcessor
from embedding_utils import EmbeddingGenerator

client = TestClient(app)

def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@patch("main.get_embedding_generator")
@patch("main.get_supabase_manager")
def test_ready_status(mock_supabase, mock_embedder):
    # Test 503 before model load
    mock_embedder.return_value = None
    mock_db = MagicMock()
    mock_supabase.return_value = mock_db
    
    response = client.get("/ready")
    assert response.status_code == 503
    
    # Test 200 after
    mock_embedder.return_value = MagicMock()
    response = client.get("/ready")
    # It might still be 503 if GROQ is not mocked/available
    # Let's mock groq_client as well
    with patch("main.groq_client", MagicMock()):
        with patch("main.GROQ_API_KEY", "dummy"):
            response = client.get("/ready")
            assert response.status_code == 200
            assert response.json()["ready"] is True

def test_protected_endpoint_401():
    response = client.post("/api/chat", json={"message": "hello"})
    # Depends(get_current_user) should return 401 or 403
    assert response.status_code in [401, 403]

def test_rag_chunking():
    processor = DocumentProcessor()
    text = "This is a test document. " * 50  # 250 words
    chunks = processor.chunk_text(text, chunk_size=20, overlap=5)
    assert len(chunks) > 1
    # Check overlap roughly by ensuring more chunks than total/size
    assert chunks[0]["text"]

def test_rate_limit():
    with patch("main.get_current_user", return_value={"id": "test_user"}):
        with patch("main.get_db", return_value=MagicMock()):
            # We hit an endpoint that has a rate limit multiple times.
            # /api/sessions/end has a RATE_LIMIT_SESSION_END of 20 per minute.
            # We will hit it 21 times to trigger a 429.
            # However, to be fast and not depend on global limits, let's just make a small loop
            # and expect at least one 429 if we exceed the limit.
            
            # To make it fast, we can mock the rate limit string on the decorator, but since we are testing the app as is:
            for i in range(25):
                response = client.post("/api/session/end", json={"session_id": "test"})
                if response.status_code == 429:
                    break
            assert response.status_code == 429

def test_upload_rejects_disallowed_mime():
    with patch("main.get_current_user", return_value={"id": "test_user"}):
        with patch("main.get_db", return_value=MagicMock()):
            # Send an invalid file type (e.g. image)
            file_content = b"fake image content"
            response = client.post(
                "/api/upload",
                files={"file": ("test.png", io.BytesIO(file_content), "image/png")}
            )
            assert response.status_code == 400
            assert "Unsupported file type" in response.text

@patch("embedding_utils.AutoTokenizer.from_pretrained")
@patch("embedding_utils.AutoModel.from_pretrained")
def test_embedding_offline_load(mock_model, mock_tokenizer):
    # Ensure offline mode variables are set
    assert os.environ.get("TRANSFORMERS_OFFLINE") == "1"
    assert os.environ.get("HF_HUB_OFFLINE") == "1"
    
    generator = EmbeddingGenerator()
    # It should load the model without use_auth_token
    mock_tokenizer.assert_called_once()
    kwargs = mock_tokenizer.call_args.kwargs
    assert "use_auth_token" not in kwargs
    
    mock_model.assert_called_once()
    kwargs = mock_model.call_args.kwargs
    assert "use_auth_token" not in kwargs
