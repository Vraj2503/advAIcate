from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# CORS configuration - be very explicit
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://advaicate.onrender.com",
]

# Add any additional origins from environment
if os.getenv("ALLOWED_ORIGINS"):
    env_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS").split(",")]
    allowed_origins.extend(env_origins)

# Configure CORS with explicit settings
CORS(
    app,
    resources={r"/*": {"origins": allowed_origins}},
    supports_credentials=True,
    methods=["GET", "POST", "OPTIONS"],
)

# Add CORS headers to every response (incl. errors and OPTIONS)
@app.after_request
def add_cors_headers(resp):
    origin = request.headers.get("Origin")
    norm = lambda u: u.rstrip("/") if isinstance(u, str) else u
    if origin and norm(origin) in [norm(o) for o in allowed_origins]:
        req_headers = request.headers.get(
            "Access-Control-Request-Headers", "Content-Type,Authorization"
        )
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = req_headers
        resp.headers["Access-Control-Max-Age"] = "86400"
    return resp

# Explicit preflight endpoint (optional but safe)
@app.route("/api/chat", methods=["OPTIONS"])
def chat_preflight():
    return ("", 204)

# Initialize Groq client with error handling
groq_client = None
try:
    from groq import Groq
    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        try:
            groq_client = Groq(api_key=api_key)
        except Exception:
            groq_client = None
    else:
        groq_client = None
except Exception:
    groq_client = None

@app.route("/", methods=["GET"])
def root():
    return jsonify(
        {
            "message": "Legal Chatbot Backend API",
            "status": "running",
            "port": os.getenv("PORT", "8000"),
            "groq_status": "initialized" if groq_client else "failed",
            "endpoints": {"health": "/api/health", "chat": "/api/chat (POST)"},
        }
    )

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "healthy" if groq_client else "degraded",
            "groq_client": groq_client is not None,
            "environment": os.getenv("FLASK_ENV", "development"),
            "port": os.getenv("PORT", "8000"),
            "groq_api_key_set": bool(os.getenv("GROQ_API_KEY")),
        }
    )

@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        if not groq_client:
            return jsonify({"error": "AI service unavailable - Groq client not initialized"}), 503

        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON data"}), 400

        message = data.get("message", "").strip()
        uploaded_files = data.get("uploaded_files", [])
        user_id = data.get("user_id", "anonymous")

        if not message:
            return jsonify({"error": "Message is required"}), 400

        contextual_prompt = f"""You are a Legal AI Assistant. Provide helpful, accurate legal information while always emphasizing that your responses are for informational purposes only and not legal advice.

User's question: {message}"""

        if uploaded_files:
            file_names = [f.get("name") for f in uploaded_files if isinstance(f, dict) and f.get("name")]
            if file_names:
                contextual_prompt += f"\n\nNote: The user has uploaded: {', '.join(file_names)}."

        # Create chat completion
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": """You are a helpful Legal AI Assistant, assisting Indian Residents. Provide informative responses about legal matters while always clarifying that this is general information only, not legal advice. 

IMPORTANT FORMATTING RULES:
- Start with a brief introduction paragraph
- Use clear section headings followed by a colon (:)
- Under each section, use bullet points (•) for key information
- Use numbered lists (1., 2., 3.) for step-by-step processes or categories
- Keep bullet points concise and focused
- Always end with a disclaimer paragraph

Always recommend consulting with a qualified attorney for specific legal situations.""",
                },
                {"role": "user", "content": contextual_prompt},
            ],
            model="llama3-8b-8192",
            temperature=0.7,
            max_tokens=1000,
        )

        response_content = chat_completion.choices[0].message.content

        return jsonify({"response": response_content, "model_used": "llama3-8b-8192"})

    except Exception as e:
        return jsonify({"error": f"An error occurred while processing your request: {str(e)}"}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("FLASK_ENV") == "development"
    app.run(debug=debug, host="0.0.0.0", port=port)