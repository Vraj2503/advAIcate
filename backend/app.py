"""
Flask Application Factory
Slim entry point: creates app, registers blueprints, configures middleware.
All business logic lives in services/, routes/, and managers/.
"""
from dotenv import load_dotenv
load_dotenv()

import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import (
    MAX_CONTENT_LENGTH,
    IS_PRODUCTION,
    REDIS_URL,
    RATE_LIMIT_DEFAULT,
    DEFAULT_ALLOWED_ORIGINS,
    GROQ_API_KEY,
)

from routes.chat_routes import chat_bp, init_chat_routes
from routes.upload_routes import upload_bp, init_upload_routes

logger = logging.getLogger(__name__)

# ======================
# APP CREATION
# ======================

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH


# ======================
# RATE LIMITING
# ======================

def get_rate_limit_key():
    if hasattr(request, 'user') and request.user:
        return f"user:{request.user['id']}"
    return f"ip:{get_remote_address()}"


limiter = Limiter(
    app=app,
    key_func=get_rate_limit_key,
    default_limits=RATE_LIMIT_DEFAULT.split(";"),
    storage_uri=REDIS_URL,
    strategy="fixed-window",
)


# ======================
# CORS CONFIGURATION
# ======================

allowed_origins = list(DEFAULT_ALLOWED_ORIGINS)
if os.getenv("ALLOWED_ORIGINS"):
    allowed_origins.extend(
        [o.strip() for o in os.getenv("ALLOWED_ORIGINS").split(",")]
    )

CORS(
    app,
    resources={r"/*": {"origins": allowed_origins}},
    supports_credentials=True,
    methods=["GET", "POST", "OPTIONS"],
)


@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")

    def normalize(url):
        return url.rstrip("/") if isinstance(url, str) else url

    if origin and normalize(origin) in [normalize(o) for o in allowed_origins]:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            request.headers.get(
                "Access-Control-Request-Headers",
                "Content-Type,Authorization",
            )
        )
        response.headers["Access-Control-Max-Age"] = "86400"

    return response


# ======================
# ERROR HELPERS
# ======================

def safe_error_response(message: str, details: str = None, status_code: int = 500):
    response = {"error": message}
    if details and not IS_PRODUCTION:
        response["details"] = details
    return jsonify(response), status_code


# ======================
# GLOBAL ERROR HANDLERS
# ======================

@app.errorhandler(413)
def request_entity_too_large(error):
    max_mb = app.config['MAX_CONTENT_LENGTH'] // (1024 * 1024)
    return jsonify({
        "error": f"File too large. Maximum size is {max_mb}MB"
    }), 413


@app.errorhandler(429)
def rate_limit_exceeded(e):
    return jsonify({
        "error": "Rate limit exceeded. Please try again later.",
        "retry_after": e.description
    }), 429


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(Exception)
def handle_unexpected_error(e):
    return safe_error_response(
        "An unexpected error occurred",
        str(e),
        500
    )


# ======================
# GROQ CLIENT
# ======================

groq_client = None
try:
    from groq import Groq
    if GROQ_API_KEY:
        groq_client = Groq(api_key=GROQ_API_KEY)
except Exception:
    groq_client = None


# ======================
# REGISTER BLUEPRINTS
# ======================

init_chat_routes(groq_client, limiter)
init_upload_routes(limiter)

app.register_blueprint(chat_bp)
app.register_blueprint(upload_bp)


# ======================
# ENTRY POINT
# ======================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("FLASK_ENV") == "development"
    app.run(host="0.0.0.0",
            port=port,
            debug=debug,
            use_reloader=False)