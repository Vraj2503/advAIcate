"""
FastAPI Dependency Injection
Replaces Flask decorators with FastAPI Depends() for:
- Authentication (get_current_user)
- Database (get_db)
- RAG Pipeline (get_rag)
- Session ownership (enforce_session_ownership)
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

from auth import verify_supabase_token, verify_supabase_token_with_refresh, AuthError
from supabase_client import get_supabase_manager, SupabaseManager
from rag_pipeline import get_rag_pipeline, RAGPipeline

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    FastAPI dependency that validates the Supabase JWT bearer token.
    Supports auto-retry with JWKS refresh in case of key rotations.

    On success: returns {"id": payload["sub"], "email": payload.get("email")}
    On AuthError/Exception: raises HTTPException with 401 status.
    """
    token = credentials.credentials

    try:
        payload = verify_supabase_token(token)
    except AuthError:
        # First attempt failed — retry once with refreshed JWKS
        # in case keys were rotated (matching legacy Flask resilience)
        try:
            payload = verify_supabase_token_with_refresh(token)
        except AuthError as retry_error:
            raise HTTPException(
                status_code=401,
                detail=retry_error.safe_message
            )
        except Exception:
            raise HTTPException(
                status_code=401,
                detail="Authentication failed"
            )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )

    return {
        "id": payload["sub"],
        "email": payload.get("email"),
    }


def get_db() -> SupabaseManager:
    """
    FastAPI dependency that returns the SupabaseManager singleton.
    """
    return get_supabase_manager()


def get_rag() -> RAGPipeline:
    """
    FastAPI dependency that returns the RAG pipeline singleton.
    """
    return get_rag_pipeline()


def enforce_session_ownership(session_id: str, user_id: str, db: SupabaseManager) -> dict:
    """
    Verify that a session exists and belongs to the authenticated user.
    Raises HTTPException directly on failure.
    """
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("user_id") != user_id:
        logger.warning(
            "Session ownership violation: user %s attempted to access session %s",
            user_id, session_id
        )
        raise HTTPException(status_code=403, detail="Access denied")
    return session