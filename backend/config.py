"""
Centralized Configuration
All hardcoded values consolidated here. Load from environment variables with sensible defaults.
"""

import os

# ======================
# ENVIRONMENT
# ======================

IS_PRODUCTION = os.getenv("FLASK_ENV") != "development"

# ======================
# SUPABASE
# ======================

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "user-documents")

# ======================
# AUTH / JWKS
# ======================

JWKS_CACHE_TTL = int(os.getenv("JWKS_CACHE_TTL", "3600"))
JWKS_FETCH_TIMEOUT = int(os.getenv("JWKS_FETCH_TIMEOUT", "5"))

# ======================
# LLM (GROQ)
# ======================

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_CHAT_TEMPERATURE = float(os.getenv("GROQ_CHAT_TEMPERATURE", "0.7"))
GROQ_CHAT_MAX_TOKENS = int(os.getenv("GROQ_CHAT_MAX_TOKENS", "1000"))
GROQ_SUMMARY_TEMPERATURE = float(os.getenv("GROQ_SUMMARY_TEMPERATURE", "0.3"))
GROQ_TITLE_MAX_LENGTH = int(os.getenv("GROQ_TITLE_MAX_LENGTH", "60"))

# ======================
# FILE UPLOAD
# ======================

MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(10 * 1024 * 1024)))  # 10MB

ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
}

FILE_SIGNATURES = {
    'application/pdf': [
        (0, b'%PDF'),
    ],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        (0, b'PK\x03\x04'),
    ],
}

MAGIC_SIGNATURES = {
    'application/pdf': b'%PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': b'PK\x03\x04',
}

MIN_SIGNATURE_BYTES = 8

EXTENSION_MIME_MAP = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'text': 'text/plain',
}

# ======================
# DOCUMENT PROCESSING
# ======================

MAX_PDF_PAGES = int(os.getenv("MAX_PDF_PAGES", "500"))
MAX_DOCX_DECOMPRESSED_SIZE = int(os.getenv("MAX_DOCX_DECOMPRESSED_SIZE", str(100 * 1024 * 1024)))
MAX_DOCX_ENTRY_SIZE = int(os.getenv("MAX_DOCX_ENTRY_SIZE", str(50 * 1024 * 1024)))
MAX_EXTRACTED_TEXT_LENGTH = int(os.getenv("MAX_EXTRACTED_TEXT_LENGTH", "5000000"))
DOCX_COMPRESSION_RATIO_LIMIT = int(os.getenv("DOCX_COMPRESSION_RATIO_LIMIT", "1000"))

# ======================
# EMBEDDING
# ======================

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-base-en-v1.5")
EMBEDDING_MAX_LENGTH = int(os.getenv("EMBEDDING_MAX_LENGTH", "512"))
EMBEDDING_DEFAULT_DIM = int(os.getenv("EMBEDDING_DEFAULT_DIM", "768"))

# ======================
# RAG PIPELINE
# ======================

RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "300"))
RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "50"))
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
RAG_MATCH_THRESHOLD = float(os.getenv("RAG_MATCH_THRESHOLD", "0.5"))
RAG_CONVERSATION_THRESHOLD = float(os.getenv("RAG_CONVERSATION_THRESHOLD", "0.6"))
RAG_DOC_SUMMARY_MAX_LENGTH = int(os.getenv("RAG_DOC_SUMMARY_MAX_LENGTH", "1000"))
RAG_CONTEXT_DOC_TRUNCATE = int(os.getenv("RAG_CONTEXT_DOC_TRUNCATE", "500"))
RAG_CONTEXT_CONV_TRUNCATE = int(os.getenv("RAG_CONTEXT_CONV_TRUNCATE", "300"))

# ======================
# RATE LIMITING
# ======================

REDIS_URL = os.getenv("REDIS_URL", "memory://")
RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "200 per hour;50 per minute")
RATE_LIMIT_UPLOAD = os.getenv("RATE_LIMIT_UPLOAD", "10 per minute;50 per hour")
RATE_LIMIT_CHAT = os.getenv("RATE_LIMIT_CHAT", "30 per minute;200 per hour")
RATE_LIMIT_SESSION_END = os.getenv("RATE_LIMIT_SESSION_END", "20 per minute")
RATE_LIMIT_SESSIONS_LIST = os.getenv("RATE_LIMIT_SESSIONS_LIST", "60 per minute")

# ======================
# CORS
# ======================

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://advaicate.onrender.com",
]

# ======================
# SUMMARIZER
# ======================

SUMMARY_MAX_TOKENS = {
    "brief": 200,
    "detailed": 500,
    "session": 300,
}

# ======================
# USER MEMORY
# ======================

ALLOWED_MEMORY_TYPES = {
    "preference", "personal_info", "legal_context",
    "interaction_pattern", "general", "extracted_fact"
}

ALLOWED_MESSAGE_ROLES = {"user", "assistant", "system"}
