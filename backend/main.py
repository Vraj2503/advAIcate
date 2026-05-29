"""
FastAPI Application — Migrated from Flask
Slim entry point: creates app, configures middleware, registers routes.
All business logic lives in services/, routes/, and managers/.
"""

from dotenv import load_dotenv
load_dotenv()

import os
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import ValidationError as PydanticValidationError

from config import (
    IS_PRODUCTION,
    LOG_LEVEL,
    REDIS_URL,
    RATE_LIMIT_DEFAULT,
    DEFAULT_ALLOWED_ORIGINS,
    GROQ_API_KEY,
    RATE_LIMIT_CHAT,
    RATE_LIMIT_UPLOAD,
    RATE_LIMIT_SESSION_END,
    RATE_LIMIT_SESSIONS_LIST,
    MAX_FILE_SIZE,
)
from schemas import (
    ChatRequest,
    ChatResponse,
    SessionEndRequest,
    SessionEndResponse,
    SessionsResponse,
    UploadResponse,
    SessionMessagesResponse,
    SingleSession,
    MessageItem,
)
from dependencies import get_current_user, get_db, enforce_session_ownership
from managers.base_manager import OwnershipError, ValidationError
from groq import Groq

import json

from validators import (
    validate_file_type,
    validate_file_signature,
    sanitize_filename,
    validate_pdf_content,
    validate_docx_content_security,
    scan_text_for_injection,
)
from services.chat_service import ChatService
from services.ingestion_service import IngestionService
from managers.session_manager import SessionManager
from embedding_utils import get_embedding_generator

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.DEBUG),
    format="%(asctime)s %(name)s %(levelname)s: %(message)s",
)

logger = logging.getLogger(__name__)


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=RATE_LIMIT_DEFAULT.split(";"),
    storage_uri=REDIS_URL,
    strategy="fixed-window",
)


groq_client = None
try:
    if GROQ_API_KEY:
        groq_client = Groq(api_key=GROQ_API_KEY)
except Exception:
    groq_client = None

_chat_service: Optional[ChatService] = None
_ingestion: Optional[IngestionService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _chat_service, _ingestion
    _chat_service = ChatService(groq_client)
    _ingestion = IngestionService()
    logger.info("Application startup complete")
    yield
    logger.info("Application shutdown")


app = FastAPI(
    title="advAIcate API",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


allowed_origins = list(DEFAULT_ALLOWED_ORIGINS)
if os.getenv("ALLOWED_ORIGINS"):
    allowed_origins.extend(
        [o.strip() for o in os.getenv("ALLOWED_ORIGINS").split(",")]
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)


@app.exception_handler(OwnershipError)
async def ownership_error_handler(request: Request, exc: OwnershipError):
    return JSONResponse(
        status_code=403,
        content={"error": "Access denied"}
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=400,
        content={"error": str(exc)}
    )


@app.exception_handler(PydanticValidationError)
async def pydantic_validation_error_handler(request: Request, exc: PydanticValidationError):
    return JSONResponse(
        status_code=400,
        content={"error": "Validation error", "details": exc.errors()}
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception):
    logger.exception("Unexpected error")
    content = {"error": "An unexpected error occurred"}
    if not IS_PRODUCTION:
        content["details"] = str(exc)
    return JSONResponse(status_code=500, content=content)


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/ready")
async def ready():
    checks = {
        "database": "unknown",
        "embedding_model": "unknown",
        "groq_api": "unknown",
    }

    try:
        from supabase_client import get_supabase_manager
        db = get_supabase_manager()
        if db and db.client:
            db.client.table("chat_sessions").select("id").limit(1).execute()
            checks["database"] = "connected"
    except Exception as e:
        logger.error("Database check failed: %s", e)
        checks["database"] = "disconnected"

    try:
        embedder = get_embedding_generator()
        if embedder:
            checks["embedding_model"] = "loaded"
    except Exception as e:
        logger.error("Embedding model check failed: %s", e)
        checks["embedding_model"] = "failed"

    try:
        if GROQ_API_KEY and groq_client:
            checks["groq_api"] = "available"
        else:
            checks["groq_api"] = "not configured"
    except Exception as e:
        logger.error("Groq API check failed: %s", e)
        checks["groq_api"] = "error"

    all_ready = all(v != "disconnected" and v != "failed" and v != "error" for v in checks.values())

    if all_ready:
        return {"ready": True, "checks": checks}
    else:
        return JSONResponse(
            status_code=503,
            content={"ready": False, "checks": checks}
        )


@limiter.limit(RATE_LIMIT_CHAT)
@app.post("/api/chat")
async def chat(
    request: Request,
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    if not _chat_service or not _chat_service.groq_client:
        raise HTTPException(status_code=503, detail="AI service unavailable")

    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message required")

    session_id = body.session_id
    uploaded_files = body.uploaded_files or []

    if session_id:
        session = enforce_session_ownership(session_id, current_user["id"], db)
        if session.get("status") == "completed":
            raise HTTPException(
                status_code=400,
                detail="Session is already completed. Start a new session."
            )

    try:
        result = _chat_service.handle_chat(
            user_id=current_user["id"],
            message=message,
            session_id=session_id,
            uploaded_files=uploaded_files,
        )
        return ChatResponse(
            response=result["response"],
            session_id=result["session_id"]
        )
    except Exception as e:
        logger.exception("Chat error")
        raise HTTPException(status_code=500, detail="Internal server error")


@limiter.limit(RATE_LIMIT_UPLOAD)
@app.post("/api/upload")
async def upload(
    request: Request,
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    safe_filename = sanitize_filename(file.filename)

    file_type = file.content_type or "application/octet-stream"
    if not validate_file_type(file_type, safe_filename):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Allowed: PDF, DOCX, TXT"
        )

    if session_id:
        session = enforce_session_ownership(session_id, current_user["id"], db)
    else:
        session = db.create_session(
            user_id=current_user["id"],
            title=f"Document: {safe_filename[:60]}"
        )
        session_id = session["id"]

    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        actual_mb = int(content_length) / (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({actual_mb:.2f}MB). Maximum size is {max_mb}MB"
        )

    file_content = await file.read()
    if len(file_content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    size_ok, file_size = validate_file_size_content(file_content, MAX_FILE_SIZE)
    if not size_ok:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        actual_mb = round(file_size / (1024 * 1024), 2)
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({actual_mb}MB). Maximum size is {max_mb}MB"
        )

    if not validate_file_signature(file_content, file_type):
        raise HTTPException(
            status_code=400,
            detail="File content does not match its declared type. Allowed: PDF, DOCX, TXT"
        )

    docx_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    if file_type == "application/pdf":
        is_safe, threats = validate_pdf_content(file_content)
        if not is_safe:
            logger.warning("Blocked PDF upload from user %s: %s", current_user["id"], ", ".join(threats))
            error_msg = "File rejected: security policy violation" if IS_PRODUCTION else f"PDF contains dangerous content: {', '.join(threats)}"
            raise HTTPException(status_code=400, detail=error_msg)

    elif file_type == docx_mime:
        is_safe, threats = validate_docx_content_security(file_content)
        if not is_safe:
            logger.warning("Blocked DOCX upload from user %s: %s", current_user["id"], ", ".join(threats))
            error_msg = "File rejected: security policy violation" if IS_PRODUCTION else f"DOCX contains dangerous content: {', '.join(threats)}"
            raise HTTPException(status_code=400, detail=error_msg)

    elif file_type == "text/plain":
        try:
            text_content = file_content.decode("utf-8")
        except UnicodeDecodeError:
            text_content = file_content.decode("latin-1")
        is_safe, matches = scan_text_for_injection(text_content)
        if not is_safe:
            logger.warning("Blocked text upload from user %s — injection patterns: %s", current_user["id"], ", ".join(matches))
            error_msg = "File rejected: security policy violation" if IS_PRODUCTION else f"Text contains prompt injection patterns: {', '.join(matches)}"
            raise HTTPException(status_code=400, detail=error_msg)

    result = _ingestion.process_and_store(
        user_id=current_user["id"],
        session_id=session_id,
        file_name=safe_filename,
        file_content=file_content,
        file_type=file_type
    )

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to process document"))

    return UploadResponse(
        success=True,
        session_id=session_id,
        document_id=result.get("document_id"),
        file_name=result.get("file_name"),
        chunks_stored=result.get("chunks_stored"),
        summary=result.get("summary")
    )


def validate_file_size_content(file_content: bytes, max_size_bytes: int) -> tuple:
    file_size = len(file_content)
    return file_size <= max_size_bytes, file_size


@limiter.limit(RATE_LIMIT_SESSION_END)
@app.post("/api/session/end")
async def session_end(
    request: Request,
    body: SessionEndRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    session_id = body.session_id

    session = enforce_session_ownership(session_id, current_user["id"], db)

    try:
        result = _chat_service.handle_end_session(
            user_id=current_user["id"],
            session_id=session_id,
            session=session,
        )
        return SessionEndResponse(
            success=result.get("success", True),
            session_id=result["session_id"],
            summary=result.get("summary", ""),
            title=result.get("title"),
            message_count=result.get("message_count", 0),
            already_completed=result.get("already_completed")
        )
    except Exception as e:
        logger.exception("Session end error")
        raise HTTPException(status_code=500, detail="Failed to end session")


@limiter.limit(RATE_LIMIT_SESSIONS_LIST)
@app.get("/api/sessions")
async def get_sessions(
    request: Request,
    status: str = Query(default="all"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    try:
        if status == "active":
            sessions = db.get_active_sessions(current_user["id"])
        elif status == "completed":
            sessions = db.get_completed_sessions(current_user["id"])
        else:
            sessions = db.get_user_sessions(current_user["id"])

        session_models = [SingleSession(**s) for s in sessions]
        return SessionsResponse(
            success=True,
            sessions=session_models,
            count=len(sessions)
        )
    except Exception as e:
        logger.exception("Get sessions error")
        raise HTTPException(status_code=500, detail="Failed to fetch sessions")


@app.get("/api/sessions/{session_id}/messages")
async def get_session_messages(
    request: Request,
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    session = enforce_session_ownership(session_id, current_user["id"], db)

    try:
        result = db.client.table("messages") \
            .select("id, role, content, created_at") \
            .eq("session_id", session_id) \
            .order("created_at", desc=False) \
            .execute()

        messages = [MessageItem(**msg) for msg in result.data]
        return SessionMessagesResponse(messages=messages)
    except Exception as e:
        logger.exception("Get session messages error")
        raise HTTPException(status_code=500, detail="Failed to load conversation history")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("FLASK_ENV") == "development"
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=debug
    )