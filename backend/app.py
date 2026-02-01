from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# ----------------------------
# CORS CONFIGURATION
# ----------------------------

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://advaicate.onrender.com",
]

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

@app.route("/api/chat", methods=["OPTIONS"])
def chat_preflight():
    return ("", 204)

# ----------------------------
# GROQ CLIENT INITIALIZATION
# ----------------------------

groq_client = None

try:
    from groq import Groq

    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        groq_client = Groq(api_key=api_key)
except Exception:
    groq_client = None

# ----------------------------
# HELPERS
# ----------------------------

def get_authenticated_user(data: dict):
    """
    Trust boundary:
    User identity is provided by NextAuth session (frontend).
    """
    user_id = data.get("user_id")
    user_email = data.get("user_email")

    if not user_id or not user_email:
        return None

    return {
        "id": user_id,
        "email": user_email,
    }

# ----------------------------
# ROUTES
# ----------------------------

@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "message": "Legal AI Assistant Backend",
        "status": "running",
        "groq_initialized": groq_client is not None,
    })

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy" if groq_client else "degraded",
        "environment": os.getenv("FLASK_ENV", "development"),
        "groq_ready": groq_client is not None,
    })

@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        if not groq_client:
            return jsonify({"error": "AI service unavailable"}), 503

        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON body"}), 400

        user = get_authenticated_user(data)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        message = data.get("message", "").strip()
        uploaded_files = data.get("uploaded_files", [])

        if not message:
            return jsonify({"error": "Message is required"}), 400

        # ----------------------------
        # PROMPT CONSTRUCTION
        # ----------------------------

        prompt = f"""
You are a Legal AI Assistant helping Indian residents.

User question:
{message}
"""

        if uploaded_files:
            filenames = [
                f.get("name")
                for f in uploaded_files
                if isinstance(f, dict) and f.get("name")
            ]
            if filenames:
                prompt += f"\nUser uploaded files: {', '.join(filenames)}"

        # ----------------------------
        # GROQ COMPLETION
        # ----------------------------

        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=1000,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a Legal AI Assistant. "
                        "Provide general legal information only. "
                        "Use clear sections, bullet points, and always end "
                        "with a disclaimer advising consultation with a lawyer."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )

        response_text = completion.choices[0].message.content

        return jsonify({
            "response": response_text,
            "model": "llama3-8b-8192",
        })

    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "details": str(e),
        }), 500

# ----------------------------
# ERROR HANDLERS
# ----------------------------

@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(_):
    return jsonify({"error": "Internal server error"}), 500

# ----------------------------
# ENTRY POINT
# ----------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
