from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
import warnings
from dotenv import load_dotenv

# LangChain / Groq imports
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from langchain_core.chat_history import BaseChatMessageHistory, InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Suppress warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

# LangChain / Groq environment setup
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
os.environ["LANGCHAIN_PROJECT"] = "advAIcate"

if not os.getenv("LANGCHAIN_API_KEY"):
    logger.warning("LANGCHAIN_API_KEY not set.")
if not os.getenv("GROQ_API_KEY"):
    logger.warning("GROQ_API_KEY not set.")

# Initialize Flask app
app = Flask(__name__)

# CORS configuration
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
if os.getenv("ALLOWED_ORIGINS"):
    env_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS").split(",")]
    allowed_origins.extend(env_origins)

logger.info(f"Configured CORS origins: {allowed_origins}")

CORS(app,
     origins=allowed_origins,
     methods=['GET', 'POST', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True)

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

# LangChain-based Groq model with memory (RAG)
model = ChatGroq(
    model="llama3-8b-8192",
    temperature=0.7,
    max_tokens=1000,
)

store = {}
def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

model_with_memory = RunnableWithMessageHistory(model, get_session_history)

# Routes
@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'message': 'Legal Chatbot Backend API',
        'status': 'running',
        'port': os.getenv('PORT', '8000'),
        'model_status': 'initialized',
        'endpoints': {
            'health': '/api/health',
            'chat': '/api/chat (POST)'
        }
    })

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'langchain_enabled': True,
        'groq_client': True,
        'environment': os.getenv('FLASK_ENV', 'development'),
        'port': os.getenv('PORT', '8000'),
        'groq_api_key_set': bool(os.getenv("GROQ_API_KEY")),
        'langchain_api_key_set': bool(os.getenv("LANGCHAIN_API_KEY"))
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400

        message = data.get('message', '').strip()
        uploaded_files = data.get('uploaded_files', [])
        user_id = data.get('user_id', 'anonymous')

        if not message:
            return jsonify({'error': 'Message is required'}), 400

        logger.info(f"Chat request from user {user_id[:8] if len(user_id) > 8 else user_id}...")

        # Contextual prompt
        contextual_prompt = f"""You are a Legal AI Assistant. Provide helpful, accurate legal information while always emphasizing that your responses are for informational purposes only and not legal advice.

User's question: {message}"""

        if uploaded_files:
            file_names = [f['name'] for f in uploaded_files if 'name' in f]
            if file_names:
                contextual_prompt += f"\n\nNote: The user has uploaded: {', '.join(file_names)}."

        config = {"configurable": {"session_id": user_id}}

        response = model_with_memory.invoke(
            [HumanMessage(content=contextual_prompt)], config=config
        )

        logger.info(f"Successfully generated response for user {user_id[:8] if len(user_id) > 8 else user_id}...")

        return jsonify({
            'response': response.content,
            'model_used': 'llama3-8b-8192'
        })

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            'error': f'An error occurred while processing your request: {str(e)}'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("FLASK_ENV") == "development"
    logger.info(f"Starting server on port {port}")
    logger.info(f"Groq + LangChain RAG model status: Ready")
    app.run(debug=debug, host="0.0.0.0", port=port)
