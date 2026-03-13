# Backend Refactoring Changelog

## Overview

The backend was refactored from a monolithic structure into a clean layered architecture. The original codebase had 3 oversized files (`app.py` at 850 lines, `supabase_client.py` at 480 lines, `rag_pipeline.py` at 310 lines), 40+ hardcoded values, `print()` statements instead of proper logging, and duplicate file-validation logic in multiple files.

### Before → After Directory Structure

```
BEFORE                              AFTER (new files marked with ★)
──────                              ─────
backend/                            backend/
  app.py           (850 lines)        app.py             (160 lines, rewritten)
  auth.py          (218 lines)        auth.py            (updated: uses config)
  conversation_summarizer.py          conversation_summarizer.py (updated: logging + config)
  document_processor.py               document_processor.py      (updated: uses config)
  embedding_utils.py                  embedding_utils.py         (updated: logging + config)
  gunicorn.conf.py                    gunicorn.conf.py           (unchanged)
  rag_pipeline.py  (310 lines)        rag_pipeline.py            (updated: logging + config)
  requirements.txt                    requirements.txt           (unchanged)
  supabase_client.py (480 lines)      supabase_client.py         (107 lines, facade)
                                    ★ config.py                  (centralized config)
                                    ★ validators.py              (consolidated file validation)
                                    ★ managers/
                                        __init__.py
                                        base_manager.py
                                        session_manager.py
                                        message_manager.py
                                        document_manager.py
                                        memory_manager.py
                                    ★ services/
                                        __init__.py
                                        chat_service.py
                                        ingestion_service.py
                                        retrieval_service.py
                                    ★ routes/
                                        __init__.py
                                        chat_routes.py
                                        upload_routes.py
```

---

## Phase 1: Centralized Configuration

### ★ `config.py` (NEW)

All 40+ hardcoded values were extracted into a single file. Every value reads from an environment variable with a sensible default, so you can override anything in production without touching code.

| Section | Key Values |
|---------|-----------|
| Environment | `IS_PRODUCTION` |
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_JWKS_URL`, `STORAGE_BUCKET` |
| Auth/JWKS | `JWKS_CACHE_TTL`, `JWKS_FETCH_TIMEOUT` |
| LLM (Groq) | `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_CHAT_TEMPERATURE`, `GROQ_CHAT_MAX_TOKENS`, `GROQ_SUMMARY_TEMPERATURE`, `GROQ_TITLE_MAX_LENGTH` |
| File Upload | `MAX_CONTENT_LENGTH`, `ALLOWED_MIME_TYPES`, `FILE_SIGNATURES`, `MAGIC_SIGNATURES`, `EXTENSION_MIME_MAP` |
| Document Processing | `MAX_PDF_PAGES`, `MAX_DOCX_DECOMPRESSED_SIZE`, `MAX_DOCX_ENTRY_SIZE`, `MAX_EXTRACTED_TEXT_LENGTH`, `DOCX_COMPRESSION_RATIO_LIMIT` |
| Embedding | `EMBEDDING_MODEL`, `EMBEDDING_MAX_LENGTH`, `EMBEDDING_DEFAULT_DIM` |
| RAG | `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`, `RAG_TOP_K`, `RAG_MATCH_THRESHOLD`, `RAG_CONVERSATION_THRESHOLD`, `RAG_DOC_SUMMARY_MAX_LENGTH`, `RAG_CONTEXT_DOC_TRUNCATE`, `RAG_CONTEXT_CONV_TRUNCATE` |
| Rate Limiting | `REDIS_URL`, `RATE_LIMIT_DEFAULT`, `RATE_LIMIT_UPLOAD`, `RATE_LIMIT_CHAT`, `RATE_LIMIT_SESSION_END`, `RATE_LIMIT_SESSIONS_LIST` |
| CORS | `DEFAULT_ALLOWED_ORIGINS` |
| Summarizer | `SUMMARY_MAX_TOKENS`, `ALLOWED_MEMORY_TYPES`, `ALLOWED_MESSAGE_ROLES` |

---

## Phase 2: File Splitting

### ★ `validators.py` (NEW — consolidated from duplicate logic)

File validation was duplicated in both `app.py` and `document_processor.py`. Now there is one source of truth.

| Function | Purpose |
|----------|---------|
| `validate_file_type()` | Quick pre-check using MIME type + extension |
| `validate_file_signature()` | Real security check using magic bytes |
| `is_valid_text()` | Checks content is valid UTF-8/Latin-1 text |
| `validate_docx_structure()` | Verifies PK/ZIP file is actually a DOCX |
| `sanitize_filename()` | Path-traversal-safe filename cleaning |

### ★ `managers/` package (NEW — extracted from `supabase_client.py`)

The monolithic `SupabaseManager` class (480 lines, 24 methods touching 4 different domains) was split into focused manager classes:

| File | Class | Methods | Domain |
|------|-------|---------|--------|
| `base_manager.py` | `BaseManager` | `_validate_user_id`, `_validate_session_id` | Shared Supabase client, UUID validation, `OwnershipError`/`ValidationError` exceptions |
| `session_manager.py` | `SessionManager` | `create_session`, `get_session`, `get_user_sessions`, `update_session`, `end_session`, `get_session_summary`, `get_active_sessions`, `get_completed_sessions` | Session CRUD + ownership verification |
| `message_manager.py` | `MessageManager` | `save_message`, `get_session_messages`, `get_recent_messages`, `save_conversation_summary` | Message persistence + conversation summaries |
| `document_manager.py` | `DocumentManager` | `upload_document`, `save_document_metadata`, `get_session_documents` | File upload to Supabase Storage + metadata |
| `memory_manager.py` | `MemoryManager` | `save_user_memory`, `get_user_memories`, `search_similar_conversations` | User memory CRUD + vector similarity search |

All managers share a single Supabase client instance through `BaseManager._client` (class-level singleton).

### ★ `services/` package (NEW — business logic extracted from `app.py`)

The route handlers in the old `app.py` contained inline business logic (RAG retrieval, prompt building, LLM calls, persistence). That logic now lives in dedicated services:

| File | Class | Methods | Purpose |
|------|-------|---------|---------|
| `chat_service.py` | `ChatService` | `handle_chat()`, `handle_end_session()` | Orchestrates: RAG → prompt → LLM → persist message + memory |
| `ingestion_service.py` | `IngestionService` | `process_and_store()` | Document pipeline: upload → extract → chunk → embed → store |
| `retrieval_service.py` | `RetrievalService` | `retrieve()`, `format_context()`, `_search_document_insights()` | RAG retrieval: query → embed → search → rank → format |

### ★ `routes/` package (NEW — thin HTTP handlers)

Flask Blueprints replace the giant route block in `app.py`. Each route file does only:
1. Parse/validate the HTTP request
2. Call a service method
3. Return the JSON response

| File | Blueprint | Endpoints |
|------|-----------|-----------|
| `chat_routes.py` | `chat_bp` | `POST /api/chat`, `POST /api/session/end`, `GET /api/sessions` |
| `upload_routes.py` | `upload_bp` | `POST /api/upload` |

Both blueprints receive dependencies (`groq_client`, `limiter`) via `init_chat_routes()` / `init_upload_routes()`, called from `app.py` before blueprint registration.

### `supabase_client.py` (REWRITTEN — now a backward-compatible facade)

Reduced from **480 lines** to **107 lines**. The file now contains a thin `SupabaseManager` facade that delegates every method call to the appropriate manager. The `get_supabase_manager()` singleton is preserved so any legacy code that imports it continues to work.

### `app.py` (REWRITTEN)

Reduced from **850 lines** to **~160 lines**. The new app.py is a slim Flask factory that:
- Configures rate limiting, CORS, and error handlers
- Creates the Groq client
- Registers the `chat_bp` and `upload_bp` blueprints
- Runs the server

All business logic, data access, and validation have been moved out.

---

## Phase 3: Code Quality

### Logging (replaced `print()` everywhere)

Every file now uses `logging.getLogger(__name__)` instead of `print()`.

| File | Change |
|------|--------|
| `rag_pipeline.py` | `print(f"[RAG] ...")` → `logger.info(...)` / `logger.error(...)` / `logger.warning(...)` |
| `conversation_summarizer.py` | `print(...)` → `logger.info(...)` / `logger.error(...)` |
| `embedding_utils.py` | `print(...)` → `logger.info(...)` / `logger.error(...)` |

### Config imports (replaced direct `os.getenv()` calls)

| File | Before | After |
|------|--------|-------|
| `auth.py` | `os.getenv("SUPABASE_URL")` etc. | `from config import SUPABASE_URL, ...` |
| `conversation_summarizer.py` | Hardcoded `"llama-3.1-8b-instant"`, temp `0.3`, etc. | `from config import GROQ_MODEL, GROQ_SUMMARY_TEMPERATURE, ...` |
| `embedding_utils.py` | Hardcoded `"BAAI/bge-base-en-v1.5"`, `512`, `768` | `from config import EMBEDDING_MODEL, EMBEDDING_MAX_LENGTH, EMBEDDING_DEFAULT_DIM` |
| `document_processor.py` | Hardcoded `500` pages, `100*1024*1024` sizes | `from config import MAX_PDF_PAGES, MAX_DOCX_DECOMPRESSED_SIZE, ...` |
| `rag_pipeline.py` | Hardcoded `chunk_size=300`, `overlap=50`, `threshold=0.5` | `from config import RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP, RAG_MATCH_THRESHOLD, RAG_TOP_K` |

---

## Files NOT Changed

| File | Reason |
|------|--------|
| `gunicorn.conf.py` | Already clean; no hardcoded values or SRP issues |
| `requirements.txt` | No new dependencies were added |
| `prev_files/` | Legacy/archive directory — not touched |

---

## How to Verify

1. **Syntax check** — all files pass `python -m py_compile <file>` ✅
2. **Import check** — `from config import *` and `from validators import *` work ✅
3. **Backward compatibility** — existing imports like `from supabase_client import get_supabase_manager` still work because the facade re-exports everything

---

## Architecture Diagram

```
HTTP Request
    │
    ▼
  app.py (Flask factory, middleware, error handlers)
    │
    ├── routes/chat_routes.py     (parse request → call service → return JSON)
    │       │
    │       ▼
    │   services/chat_service.py  (RAG → prompt → LLM → persist)
    │       │
    │       ├── services/retrieval_service.py  (embed query → vector search)
    │       │       │
    │       │       └── managers/memory_manager.py + document_manager.py
    │       │
    │       ├── managers/message_manager.py  (save messages)
    │       └── managers/session_manager.py  (session CRUD)
    │
    └── routes/upload_routes.py   (validate → call service → return JSON)
            │
            ▼
        services/ingestion_service.py  (extract → chunk → embed → store)
            │
            ├── document_processor.py  (text extraction)
            ├── embedding_utils.py     (embedding generation)
            └── managers/document_manager.py  (Supabase storage)

  config.py ─── imported by everything
  validators.py ─── imported by routes + document_processor
  auth.py ─── imported by routes (JWT verification middleware)
```
