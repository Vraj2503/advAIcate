"""
Routes Package
Flask Blueprints split from the monolithic app.py.
"""

from routes.chat_routes import chat_bp
from routes.upload_routes import upload_bp

__all__ = ["chat_bp", "upload_bp"]
