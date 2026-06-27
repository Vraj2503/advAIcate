"""
Chat Routes — /api/chat, /api/session/end, /api/sessions
Extracted from app.py. Thin route handlers that delegate to ChatService.
"""

import logging
from flask import Blueprint, request, jsonify

from auth import require_auth, enforce_session_ownership
from managers.session_manager import SessionManager
from managers.message_manager import MessageManager
from services.chat_service import ChatService

logger = logging.getLogger(__name__)

chat_bp = Blueprint("chat", __name__)

# Initialized in init_chat_routes() after app creation
_chat_service: ChatService = None
_session_mgr: SessionManager = None
_message_mgr: MessageManager = None


def init_chat_routes(groq_client, limiter):
    """Called once from app.py after Flask app and groq_client are ready."""
    global _chat_service, _session_mgr, _message_mgr
    _chat_service = ChatService(groq_client)
    _session_mgr = SessionManager()
    _message_mgr = MessageManager()

    # Apply rate limits
    from config import RATE_LIMIT_CHAT, RATE_LIMIT_SESSION_END, RATE_LIMIT_SESSIONS_LIST

    limiter.limit(RATE_LIMIT_CHAT)(chat)
    limiter.limit(RATE_LIMIT_SESSION_END)(end_session)
    limiter.limit(RATE_LIMIT_SESSION_END)(delete_session)
    limiter.limit(RATE_LIMIT_SESSION_END)(rename_session)
    limiter.limit(RATE_LIMIT_SESSIONS_LIST)(get_sessions)


def _safe_error(message: str, details: str = None, status_code: int = 500):
    from config import IS_PRODUCTION
    response = {"error": message}
    if details and not IS_PRODUCTION:
        response["details"] = details
    return jsonify(response), status_code


# ======================
# PREFLIGHT ROUTES
# ======================

@chat_bp.route("/api/chat", methods=["OPTIONS"])
def chat_preflight():
    return ("", 204)


@chat_bp.route("/api/session/end", methods=["OPTIONS"])
def session_end_preflight():
    return ("", 204)


@chat_bp.route("/api/sessions/<session_id>/messages", methods=["OPTIONS"])
def session_messages_preflight(session_id):
    return ("", 204)


@chat_bp.route("/api/sessions/<session_id>", methods=["OPTIONS"])
def session_delete_preflight(session_id):
    return ("", 204)


# ======================
# ROUTES
# ======================

@chat_bp.route("/api/chat", methods=["POST"])
@require_auth
def chat():
    try:
        if not _chat_service or not _chat_service.groq_client:
            return jsonify({"error": "AI service unavailable"}), 503

        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        user = request.user
        message = data.get("message", "").strip()
        uploaded_files = data.get("uploaded_files", [])
        session_id = data.get("session_id")

        if not message:
            return jsonify({"error": "Message required"}), 400

        # Enforce session ownership
        if session_id:
            session, error = enforce_session_ownership(session_id, user["id"], _session_mgr)
            if error:
                return error

        result = _chat_service.handle_chat(
            user_id=user["id"],
            message=message,
            session_id=session_id,
            uploaded_files=uploaded_files,
        )

        return jsonify(result)

    except Exception as e:
        return _safe_error("Internal server error", str(e), 500)


@chat_bp.route("/api/session/end", methods=["POST"])
@require_auth
def end_session():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        user = request.user
        session_id = data.get("session_id")
        if not session_id:
            return jsonify({"error": "session_id required"}), 400

        session, error = enforce_session_ownership(session_id, user["id"], _session_mgr)
        if error:
            return error

        result = _chat_service.handle_end_session(
            user_id=user["id"],
            session_id=session_id,
            session=session,
        )

        return jsonify(result)

    except Exception as e:
        return _safe_error("Failed to end session", str(e), 500)


@chat_bp.route("/api/sessions", methods=["GET", "POST"])
@require_auth
def get_sessions():
    try:
        user_id = request.user["id"]
        status = request.args.get("status", "all")

        if status == "active":
            sessions = _session_mgr.get_active_sessions(user_id)
        elif status == "completed":
            sessions = _session_mgr.get_completed_sessions(user_id)
        else:
            sessions = _session_mgr.get_user_sessions(user_id)

        return jsonify({
            "success": True,
            "sessions": sessions,
            "count": len(sessions)
        })

    except Exception as e:
        return _safe_error("Failed to fetch sessions", str(e), 500)


@chat_bp.route("/api/sessions/<session_id>/messages", methods=["GET"])
@require_auth
def get_session_messages(session_id):
    """Load all messages for a session (sidebar history click)."""
    try:
        user_id = request.user["id"]

        # Ownership check — user can only load their own sessions
        session, error = enforce_session_ownership(
            session_id, user_id, _session_mgr
        )
        if error:
            return error

        # Fetch messages in chronological order
        # NOTE: If MessageManager uses .supabase instead of .client,
        #       change _message_mgr.client to _message_mgr.supabase
        result = _message_mgr.client.table("messages") \
            .select("id, role, content, created_at") \
            .eq("session_id", session_id) \
            .order("created_at", desc=False) \
            .execute()

        return jsonify({
            "messages": result.data
        }), 200

    except Exception as e:
        logger.error(
            f"Failed to load messages for session {session_id}: {e}"
        )
        return _safe_error(
            "Failed to load conversation history",
            str(e),
            500
        )


@chat_bp.route("/api/sessions/<session_id>", methods=["DELETE"])
@require_auth
def delete_session(session_id):
    """Permanently delete a chat session and all related data."""
    try:
        user_id = request.user["id"]

        session, error = enforce_session_ownership(
            session_id, user_id, _session_mgr
        )
        if error:
            return error

        _session_mgr.delete_session(session_id)
        return jsonify({"success": True, "message": "Session deleted"}), 200

    except Exception as e:
        logger.error(f"Failed to delete session {session_id}: {e}")
        return _safe_error(
            "Failed to delete session",
            str(e),
            500
        )


@chat_bp.route("/api/sessions/<session_id>", methods=["PATCH"])
@require_auth
def rename_session(session_id):
    """Rename a chat session."""
    try:
        user_id = request.user["id"]
        data = request.get_json()
        
        if not data or not data.get("title"):
            return jsonify({"error": "Title is required"}), 400
            
        new_title = data.get("title").strip()

        session, error = enforce_session_ownership(
            session_id, user_id, _session_mgr
        )
        if error:
            return error

        updated_session = _session_mgr.update_session(session_id, title=new_title)
        
        if not updated_session:
            return _safe_error("Failed to update session title", status_code=500)
            
        return jsonify({"success": True, "session": updated_session}), 200

    except Exception as e:
        logger.error(f"Failed to rename session {session_id}: {e}")
        return _safe_error(
            "Failed to rename session",
            str(e),
            500
        )