"""
Pydantic Request & Response Models for FastAPI
Strict type safety for all API contracts.
"""

from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator, model_validator
import uuid


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    uploaded_files: Optional[List[dict]] = None

    @field_validator("message")
    @classmethod
    def strip_message(cls, v: str) -> str:
        return v.strip()

    @model_validator(mode="after")
    def validate_session_id(self):
        if self.session_id is not None:
            try:
                uuid.UUID(self.session_id)
            except ValueError:
                raise ValueError("session_id must be a valid UUID")
        return self


class ChatResponse(BaseModel):
    response: str
    session_id: str


class SessionEndRequest(BaseModel):
    session_id: str

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, v: str) -> str:
        try:
            uuid.UUID(v)
        except ValueError:
            raise ValueError("session_id must be a valid UUID")
        return v


class SessionEndResponse(BaseModel):
    success: bool
    session_id: str
    summary: str
    title: Optional[str] = None
    message_count: int
    already_completed: Optional[bool] = None


class SingleSession(BaseModel):
    id: str
    user_id: str
    title: str
    status: str
    created_at: str
    updated_at: str


class SessionsResponse(BaseModel):
    success: bool
    sessions: List[SingleSession]
    count: int


class UploadResponse(BaseModel):
    success: bool
    session_id: str
    document_id: str
    file_name: str
    chunks_stored: int
    summary: str


class MessageItem(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


class SessionMessagesResponse(BaseModel):
    messages: List[MessageItem]