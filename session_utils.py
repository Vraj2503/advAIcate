import uuid
import requests
from datetime import datetime
import streamlit as st

def get_conversation_id():
    if "conversation_id" not in st.session_state:
        st.session_state.conversation_id = str(uuid.uuid4())
    return st.session_state.conversation_id

def get_client_ip():
    try:
        response = requests.get("https://api64.ipify.org?format=json", timeout=3)
        if response.status_code == 200:
            return response.json()["ip"]
    except Exception:
        pass
    return "Unavailable"

def calculate_session_duration():
    if "session_start_time" not in st.session_state:
        st.session_state.session_start_time = datetime.now()
    current_time = datetime.now()
    duration = current_time - st.session_state.session_start_time
    return str(duration)  # Format: HH:MM:SS or total seconds if preferred

def detect_query_type(user_input):
    user_input_lower = user_input.lower()

    categories = {
        "Contract Law": ["contract", "agreement", "breach", "terms"],
        "Criminal Law": ["crime", "theft", "arrest", "sentence", "charges"],
        "Family Law": ["divorce", "custody", "marriage", "adoption"],
        "Property Law": ["property", "land", "ownership", "real estate"],
        "Employment Law": ["employment", "job", "termination", "wages", "labor"],
        "Corporate Law": ["company", "corporation", "shareholder", "merger"],
        "Intellectual Property": ["trademark", "copyright", "patent", "ip"],
    }

    for category, keywords in categories.items():
        if any(keyword in user_input_lower for keyword in keywords):
            return category

    return "General Legal Inquiry"
