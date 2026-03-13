"""
Upload Routes — /api/upload
Extracted from app.py. Thin route handler that delegates to IngestionService.
"""

import logging
from flask import Blueprint, request, jsonify

from auth import require_auth
from validators import validate_file_type, validate_file_signature, sanitize_filename
from managers.session_manager import SessionManager
from services.ingestion_service import IngestionService

logger = logging.getLogger(__name__)

upload_bp = Blueprint("upload", __name__)

# Initialized in init_upload_routes() after app creation
_ingestion: IngestionService = None
_session_mgr: SessionManager = None


def init_upload_routes(limiter):
    """Called once from app.py after Flask app is ready."""
    global _ingestion, _session_mgr
    _ingestion = IngestionService()
    _session_mgr = SessionManager()

    from config import RATE_LIMIT_UPLOAD
    limiter.limit(RATE_LIMIT_UPLOAD)(upload_document)


def _safe_error(message: str, details: str = None, status_code: int = 500):
    from config import IS_PRODUCTION
    response = {"error": message}
    if details and not IS_PRODUCTION:
        response["details"] = details
    return jsonify(response), status_code


def _enforce_session_ownership(session_id: str, user_id: str):
    session = _session_mgr.get_session(session_id)
    if not session:
        return None, (jsonify({"error": "Session not found"}), 404)
    if session.get("user_id") != user_id:
        return None, (jsonify({"error": "Access denied"}), 403)
    return session, None


# ======================
# PREFLIGHT
# ======================

@upload_bp.route("/api/upload", methods=["OPTIONS"])
def upload_preflight():
    return ("", 204)


# ======================
# ROUTE
# ======================

@upload_bp.route("/api/upload", methods=["POST"])
@require_auth
def upload_document():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']
        if file.filename == '' or not file.filename:
            return jsonify({"error": "No file selected"}), 400

        user_id = request.user["id"]
        session_id = request.form.get('session_id')

        # 1. Sanitize filename
        safe_filename = sanitize_filename(file.filename)

        # 2. Quick client-metadata pre-check
        file_type = file.content_type or 'application/octet-stream'
        if not validate_file_type(file_type, safe_filename):
            return jsonify({
                "error": "Unsupported file type. Allowed: PDF, DOCX, TXT"
            }), 400

        # 3. Enforce session ownership
        if session_id:
            session, error = _enforce_session_ownership(session_id, user_id)
            if error:
                return error
        else:
            session = _session_mgr.create_session(
                user_id=user_id,
                title=f"Document: {safe_filename[:60]}"
            )
            session_id = session["id"]

        # 4. Read file content
        file_content = file.read()
        if len(file_content) == 0:
            return jsonify({"error": "File is empty"}), 400

        # 5. Validate actual file bytes against claimed type
        if not validate_file_signature(file_content, file_type):
            return jsonify({
                "error": "File content does not match its declared type. "
                         "Allowed: PDF, DOCX, TXT"
            }), 400

        # 6. Process and store document
        result = _ingestion.process_and_store(
            user_id=user_id,
            session_id=session_id,
            file_name=safe_filename,
            file_content=file_content,
            file_type=file_type
        )

        if not result.get("success"):
            return _safe_error(
                "Failed to process document",
                result.get("error"),
                500
            )

        return jsonify({
            "success": True,
            "session_id": session_id,
            "document_id": result.get("document_id"),
            "file_name": result.get("file_name"),
            "chunks_stored": result.get("chunks_stored"),
            "summary": result.get("summary")
        })

    except Exception as e:
        return _safe_error("Internal server error", str(e), 500)
