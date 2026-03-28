import os
import time
import logging
import requests
from jose import jwt, jwk, JWTError
from jose.utils import base64url_decode
from flask import request, jsonify
from functools import wraps

# ======================
# CONFIGURATION
# ======================

from config import (
    SUPABASE_URL,
    SUPABASE_JWKS_URL,
    SUPABASE_ANON_KEY,
    IS_PRODUCTION,
    JWKS_CACHE_TTL,
    JWKS_FETCH_TIMEOUT,
)

_jwks_cache = None
_jwks_cache_time = 0
JWKS_CACHE_TTL = 3600  # Refresh JWKS keys every hour

logger = logging.getLogger(__name__)


# ======================
# CUSTOM AUTH EXCEPTION
# ======================

class AuthError(Exception):
    """
    Raised for all authentication/authorization failures.

    Carries two messages:
      - safe_message:     always returned to client
      - internal_message: logged server-side, only shown in development
    """
    def __init__(self, safe_message: str, internal_message: str = None):
        self.safe_message = safe_message
        self.internal_message = internal_message or safe_message
        super().__init__(self.internal_message)


# ======================
# SAFE ERROR RESPONSE
# ======================

def _auth_error_response(safe_message: str, internal_message: str = None, status_code: int = 401):
    """
    Return an auth error JSON response.
    Strip internal details in production.
    """
    # Always log the full details server-side
    if internal_message:
        logger.warning("Auth failure: %s | Internal: %s", safe_message, internal_message)
    else:
        logger.warning("Auth failure: %s", safe_message)

    response = {"error": safe_message}
    if internal_message and not IS_PRODUCTION:
        response["details"] = internal_message

    return jsonify(response), status_code


# ======================
# JWKS FETCHING
# ======================

def get_jwks(force_refresh=False):
    """
    Fetch and cache Supabase JWKS keys.
    Raises AuthError on failure — never leaks raw HTTP errors to the client.
    """
    global _jwks_cache, _jwks_cache_time

    if not force_refresh and _jwks_cache is not None and (time.time() - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    try:
        res = requests.get(SUPABASE_JWKS_URL, timeout=JWKS_FETCH_TIMEOUT)
        res.raise_for_status()
        _jwks_cache = res.json()
        _jwks_cache_time = time.time()
        return _jwks_cache
    except requests.RequestException as e:
        logger.error("Failed to fetch JWKS keys: %s", str(e))
        # If we have a stale cache, use it rather than failing entirely
        if _jwks_cache is not None:
            logger.warning("Using stale JWKS cache after fetch failure")
            return _jwks_cache
        raise AuthError(
            "Authentication service temporarily unavailable",
            f"JWKS fetch failed: {str(e)}"
        )


# ======================
# TOKEN VERIFICATION
# ======================

def verify_supabase_token(token: str):
    """
    Verify a Supabase JWT token.
    Raises AuthError with safe + internal messages on any failure.
    """
    # --- Step 1: Fetch JWKS and find the matching key ---
    try:
        jwks = get_jwks()
    except AuthError:
        raise  # Already has safe messaging
    except Exception as e:
        raise AuthError("Authentication service error", f"JWKS error: {str(e)}")

    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise AuthError("Invalid token format", f"Header decode failed: {str(e)}")

    kid = header.get("kid")
    if not kid:
        raise AuthError("Invalid token", "Token header missing 'kid'")

    # Find matching key in JWKS
    key = None
    for k in jwks.get("keys", []):
        if k.get("kid") == kid:
            key = k
            break

    if key is None:
        raise AuthError("Invalid token", f"No matching public key for kid: {kid}")

    # --- Step 2: Verify signature ---
    try:
        public_key = jwk.construct(key)
    except Exception as e:
        raise AuthError("Authentication service error", f"Key construction failed: {str(e)}")

    try:
        message, encoded_signature = token.rsplit(".", 1)
        decoded_signature = base64url_decode(encoded_signature.encode())
    except Exception as e:
        raise AuthError("Invalid token format", f"Token split/decode failed: {str(e)}")

    if not public_key.verify(message.encode(), decoded_signature):
        raise AuthError("Invalid token", "Signature verification failed")

    # --- Step 3: Validate claims ---
    try:
        payload = jwt.get_unverified_claims(token)
    except JWTError as e:
        raise AuthError("Invalid token", f"Claims decode failed: {str(e)}")

    # Validate expiration
    exp = payload.get("exp")
    if exp and time.time() > exp:
        raise AuthError("Token expired", "Token expired")

    # Validate issuer
    expected_issuer = f"{SUPABASE_URL}/auth/v1"
    if payload.get("iss") != expected_issuer:
        raise AuthError("Invalid token", f"Invalid issuer: {payload.get('iss')}")

    # Validate authenticated role
    if payload.get("role") != "authenticated":
        raise AuthError("Access denied", f"Invalid role: {payload.get('role')}")

    # Validate subject (user id)
    if "sub" not in payload:
        raise AuthError("Invalid token", "Missing subject claim")

    return payload


# ======================
# AUTH DECORATOR
# ======================

def require_auth(f):
    """
    Flask route decorator that enforces Supabase JWT authentication.
    Sets request.user = {"id": ..., "email": ...} on success.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return _auth_error_response("Missing or malformed Authorization header")

        token = auth_header.split(" ", 1)[1]

        if not token or token.count(".") != 2:
            return _auth_error_response("Invalid token format")

        try:
            payload = verify_supabase_token(token)
        except AuthError as e:
            # First attempt failed — retry once with refreshed JWKS
            # in case keys were rotated
            try:
                payload = verify_supabase_token_with_refresh(token)
            except AuthError as retry_error:
                return _auth_error_response(
                    retry_error.safe_message,
                    retry_error.internal_message
                )
        except Exception as e:
            # Unexpected error — never leak details
            logger.exception("Unexpected auth error")
            return _auth_error_response(
                "Authentication failed",
                f"Unexpected: {str(e)}"
            )

        request.user = {
            "id": payload["sub"],
            "email": payload.get("email"),
        }

        return f(*args, **kwargs)
    return wrapper


def verify_supabase_token_with_refresh(token: str):
    """
    Retry token verification with a forced JWKS refresh.
    Used when the first attempt fails (key rotation scenario).
    """
    try:
        get_jwks(force_refresh=True)
    except AuthError:
        raise
    except Exception as e:
        raise AuthError("Authentication service error", f"JWKS refresh failed: {str(e)}")

    return verify_supabase_token(token)


# ======================
# SESSION OWNERSHIP
# ======================

def enforce_session_ownership(session_id: str, user_id: str, session_manager):
    """
    Verify that a session exists and belongs to the authenticated user.

    Centralized ownership check used by all route handlers.

    Args:
        session_id:       The session to verify.
        user_id:          The authenticated user's ID.
        session_manager:  A SessionManager instance (injected to avoid circular imports).

    Returns:
        (session_dict, None) on success.
        (None, (json_response, status_code)) on failure.
    """
    session = session_manager.get_session(session_id)
    if not session:
        return None, (jsonify({"error": "Session not found"}), 404)
    if session.get("user_id") != user_id:
        logger.warning(
            "Session ownership violation: user %s attempted to access session %s",
            user_id, session_id
        )
        return None, (jsonify({"error": "Access denied"}), 403)
    return session, None