import os
import sys

# Ensure transformers is available
try:
    from transformers import AutoTokenizer, AutoModel
except ImportError:
    print("Please install transformers and torch to run this script.")
    sys.exit(1)

MODEL_ID = "BAAI/bge-small-en-v1.5"
# Calculate path relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEST_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "backend", "models", "bge-small-en-v1.5")

def download_model():
    print(f"Downloading {MODEL_ID} to {DEST_DIR}...")
    os.makedirs(DEST_DIR, exist_ok=True)
    
    # Download and save tokenizer and model
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModel.from_pretrained(MODEL_ID)
    
    tokenizer.save_pretrained(DEST_DIR)
    model.save_pretrained(DEST_DIR)
    print("Download complete. Model baked at:", DEST_DIR)

if __name__ == "__main__":
    download_model()
