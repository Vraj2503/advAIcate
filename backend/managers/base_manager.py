"""
Base Manager — shared Supabase client, validation helpers, and custom exceptions.
All domain managers inherit from this.
"""

import os
import re
import logging
from supabase import create_client, Client
from typing import Optional, Dict, Any
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STORAGE_BUCKET

logger = logging.getLogger(__name__)

UUID_PATTERN = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE
)


def _is_valid_uuid(value: str) -> bool:
    """Check if a string is a valid UUID v4 format."""
    return bool(value and isinstance(value, str) and UUID_PATTERN.match(value))


class OwnershipError(Exception):
    """Raised when a data-layer ownership check fails."""
    pass


class ValidationError(Exception):
    """Raised when input validation fails at the data layer."""
    pass


class BaseManager:
    """
    Shared Supabase client and validation helpers.
    All domain managers inherit from this class.
    """

    _client: Optional[Client] = None

    def __init__(self):
        if BaseManager._client is None:
            url = SUPABASE_URL
            key = SUPABASE_SERVICE_ROLE_KEY

            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

            if not url.endswith('/'):
                url = url + '/'

            BaseManager._client = create_client(url, key)

        self.client = BaseManager._client
        self.storage_bucket = STORAGE_BUCKET

    def _validate_user_id(self, user_id: str, param_name: str = "user_id") -> None:
        if not _is_valid_uuid(user_id):
            raise ValidationError(f"Invalid {param_name}: must be a valid UUID")

    def _validate_session_id(self, session_id: str) -> None:
        if not _is_valid_uuid(session_id):
            raise ValidationError("Invalid session_id: must be a valid UUID")
