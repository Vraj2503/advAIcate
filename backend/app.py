from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

from supabase_client import get_supabase_manager
from rag_pipeline import get_rag_pipeline

load_dotenv()

app = Flask(__name__)

"""
AUTHENTICATION DESIGN NOTE
--------------------------
• NextAuth handles authentication (frontend)
• Backend TRUSTS user identity sent from frontend
• Supabase is used ONLY as a datastore (service role)
• RLS is preserved and bypassed correctly server-side
"""

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

@app.route("/api/upload", methods=["OPTIONS"])
def upload_preflight():
    return ("", 204)

@app.route("/api/session/end", methods=["OPTIONS"])
def session_end_preflight():
    return ("", 204)

# ----------------------------
# GROQ CLIENT
# ----------------------------

groq_client = None
try:
    from groq import Groq
    if os.getenv("GROQ_API_KEY"):
        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
except Exception:
    groq_client = None

# ----------------------------
# SUPABASE
# ----------------------------

supabase = get_supabase_manager()
rag_pipeline = get_rag_pipeline()

# ----------------------------
# HELPERS
# ----------------------------

def get_authenticated_user(data: dict):
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

@app.route("/api/upload", methods=["POST"])
def upload_document():
    """Upload and process a document"""
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Get user info from form data
        user_id = request.form.get('user_id')
        user_email = request.form.get('user_email')
        session_id = request.form.get('session_id')
        
        if not user_id or not user_email:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Create session if not provided
        if not session_id:
            session = supabase.create_session(
                user_id=user_id,
                title=f"Document: {file.filename[:60]}"
            )
            session_id = session["id"]
        
        # Read file content
        file_content = file.read()
        file_type = file.content_type or 'application/octet-stream'
        
        # Process and store document
        result = rag_pipeline.process_and_store_document(
            user_id=user_id,
            session_id=session_id,
            file_name=file.filename,
            file_content=file_content,
            file_type=file_type
        )
        
        if not result.get("success"):
            return jsonify({"error": result.get("error", "Failed to process document")}), 500
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "document_id": result.get("document_id"),
            "file_name": result.get("file_name"),
            "chunks_stored": result.get("chunks_stored"),
            "summary": result.get("summary")
        })
    
    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        if not groq_client:
            return jsonify({"error": "AI service unavailable"}), 503

        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        user = get_authenticated_user(data)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        message = data.get("message", "").strip()
        uploaded_files = data.get("uploaded_files", [])
        session_id = data.get("session_id")

        if not message:
            return jsonify({"error": "Message required"}), 400

        # ----------------------------
        # SESSION HANDLING
        # ----------------------------

        if session_id:
            session = supabase.get_session(session_id)
            if not session:
                return jsonify({"error": "Invalid session_id"}), 400
        else:
            session = supabase.create_session(
                user_id=user["id"],
                title=message[:60]
            )
            session_id = session["id"]

        # Save user message
        supabase.save_message(
            session_id=session_id,
            role="user",
            content=message
        )

        # ----------------------------
        # RAG CONTEXT RETRIEVAL
        # ----------------------------
        
        # Retrieve relevant context from uploaded documents
        context_data = rag_pipeline.retrieve_relevant_context(
            query=message,
            user_id=user["id"],
            session_id=session_id,
            top_k=3,
            include_past_conversations=False
        )
        
        context_str = rag_pipeline.format_context_for_prompt(context_data)

        # ----------------------------
        # PROMPT
        # ----------------------------

        prompt = f"""
You are a Legal AI Assistant helping Indian residents.

{context_str}

User question:
{message}
"""

        if uploaded_files:
            names = [
                f.get("name")
                for f in uploaded_files
                if isinstance(f, dict) and f.get("name")
            ]
            if names:
                prompt += f"\n\nNote: User has uploaded these files: {', '.join(names)}"

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
                        "Provide general legal information only. "
                        "Use structured sections and bullet points. "
                        "Always end with a legal disclaimer."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )

        response_text = completion.choices[0].message.content

        # Save assistant message
        supabase.save_message(
            session_id=session_id,
            role="assistant",
            content=response_text
        )

        return jsonify({
            "response": response_text,
            "session_id": session_id,
        })

    except Exception as e:
        return jsonify({
            "error": "Internal server error",
            "details": str(e),
        }), 500

@app.route("/api/session/end", methods=["POST"])
def end_session():
    """End a session and generate conversation summary"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400
        
        user = get_authenticated_user(data)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        
        session_id = data.get("session_id")
        if not session_id:
            return jsonify({"error": "session_id required"}), 400
        
        # Verify session belongs to user
        session = supabase.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        
        if session.get("user_id") != user["id"]:
            return jsonify({"error": "Access denied"}), 403
        
        # Check if session is already completed
        if session.get("status") == "completed":
            # Return existing summary if available
            existing_summary = supabase.get_session_summary(session_id)
            if existing_summary:
                return jsonify({
                    "success": True,
                    "session_id": session_id,
                    "summary": existing_summary.get("summary_text"),
                    "title": session.get("title"),
                    "already_completed": True
                })
        
        # Get all messages from session
        messages = supabase.get_session_messages(session_id)
        
        if not messages or len(messages) < 2:
            # End session anyway but don't create summary
            supabase.end_session(session_id)
            return jsonify({
                "success": True,
                "session_id": session_id,
                "summary": "No conversation to summarize",
                "message_count": len(messages) if messages else 0
            })
        
        # Generate summary using ConversationSummarizer
        from conversation_summarizer import get_conversation_summarizer
        from embedding_utils import get_embedding_generator
        
        summarizer = get_conversation_summarizer(groq_client)
        
        print(f"[SESSION END] Generating summary for session {session_id} with {len(messages)} messages")
        
        summary_text = summarizer.summarize_conversation(
            messages=messages,
            summary_type="session"
        )
        
        print(f"[SESSION END] Generated summary: {summary_text[:100]}...")
        
        # Generate embedding for summary
        embedder = get_embedding_generator()
        summary_embedding = embedder.generate_embedding(summary_text)
        
        print(f"[SESSION END] Generated embedding with {len(summary_embedding)} dimensions")
        
        # Store summary with embedding
        first_message_id = messages[0].get("id") if messages else None
        last_message_id = messages[-1].get("id") if messages else None
        
        summary_record = supabase.save_conversation_summary(
            session_id=session_id,
            summary_text=summary_text,
            embedding=summary_embedding,
            summary_level="session",
            start_message_id=first_message_id,
            end_message_id=last_message_id
        )
        
        print(f"[SESSION END] Saved summary to database: {summary_record.get('id')}")
        
        # Generate title from summary
        title = summarizer.generate_title_from_summary(summary_text)
        
        print(f"[SESSION END] Generated title: {title}")
        
        # Mark session as completed and update title
        supabase.end_session(session_id)
        supabase.update_session(session_id, title=title)
        
        print(f"[SESSION END] Session {session_id} marked as completed")
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "summary": summary_text,
            "title": title,
            "message_count": len(messages)
        })
    
    except Exception as e:
        print(f"[SESSION END] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": "Failed to end session",
            "details": str(e)
        }), 500

@app.route("/api/sessions", methods=["GET", "POST"])
def get_sessions():
    """Get user's sessions (active or completed)"""
    try:
        # Get user from query params or request body
        if request.method == "GET":
            user_id = request.args.get("user_id")
            user_email = request.args.get("user_email")
        else:
            data = request.get_json()
            user_id = data.get("user_id")
            user_email = data.get("user_email")
        
        if not user_id or not user_email:
            return jsonify({"error": "Unauthorized"}), 401
        
        status = request.args.get("status", "all")  # 'all', 'active', 'completed'
        
        if status == "active":
            sessions = supabase.get_active_sessions(user_id)
        elif status == "completed":
            sessions = supabase.get_completed_sessions(user_id)
        else:
            sessions = supabase.get_user_sessions(user_id)
        
        return jsonify({
            "success": True,
            "sessions": sessions,
            "count": len(sessions)
        })
    
    except Exception as e:
        return jsonify({
            "error": "Failed to fetch sessions",
            "details": str(e)
        }), 500

# ----------------------------
# ENTRY POINT
# ----------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
