import os
import warnings
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from langchain_core.chat_history import BaseChatMessageHistory, InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# Suppress warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

# Load environment variables
load_dotenv()

# Set LangChain and Groq config
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY")   # Note: variable name corrected
os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")
os.environ["LANGCHAIN_PROJECT"] = "advAIcate"

# Initialize Groq LLM
model = ChatGroq(
    model="llama3-8b-8192",
    temperature=0.7,
    max_tokens=1000,
)

# Store session chat history
store = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

# Wrap the model with memory
session_id = "terminal_chat_session"
config = {"configurable": {"session_id": session_id}}
model_with_memory = RunnableWithMessageHistory(model, get_session_history)

# Initial greeting
initial_response = model_with_memory.invoke(
    [HumanMessage(content="Hello!")], config=config
)
print(f"AI: {initial_response.content}")

# Chat loop with context
while True:
    user_input = input("You: ")
    if user_input.lower() in {"bye", "exit", "quit"}:
        print("AI: Bye! Have a nice day!")
        break

    response = model_with_memory.invoke(
        [HumanMessage(content=user_input)], config=config
    )
    print(f"AI: {response.content}")
