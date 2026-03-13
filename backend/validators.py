"""
File Validation Utilities (Consolidated)
All file type, signature, and content validation in one place.
Both app.py routes and document_processor.py defer to this module.
"""

import io
import zipfile
import logging

from config import (
    ALLOWED_MIME_TYPES,
    FILE_SIGNATURES,
    MAGIC_SIGNATURES,
    MIN_SIGNATURE_BYTES,
    EXTENSION_MIME_MAP,
    MAX_DOCX_DECOMPRESSED_SIZE,
    MAX_DOCX_ENTRY_SIZE,
    DOCX_COMPRESSION_RATIO_LIMIT,
)

logger = logging.getLogger(__name__)


class DocumentSecurityError(Exception):
    """Raised when a document fails security checks (e.g., zip bomb, content mismatch)."""
    pass


def validate_file_type(content_type: str, filename: str) -> bool:
    """
    Validate file type using both MIME type and file extension.
    Quick pre-check using client metadata. The real security check
    happens in validate_file_signature() after reading actual bytes.
    """
    if content_type not in ALLOWED_MIME_TYPES:
        return False

    if not filename:
        return False

    extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

    expected_mime = EXTENSION_MIME_MAP.get(extension)
    if expected_mime and expected_mime != content_type:
        return False

    if extension not in EXTENSION_MIME_MAP:
        return False

    return True


def validate_file_signature(file_content: bytes, claimed_mime: str) -> bool:
    """
    Validate actual file content against its claimed MIME type
    using magic byte signatures.

    This is the critical server-side check that cannot be spoofed
    by manipulating Content-Type headers or filename extensions.
    """
    if not file_content or len(file_content) < MIN_SIGNATURE_BYTES:
        if claimed_mime == 'text/plain':
            return is_valid_text(file_content or b'')
        return False

    if claimed_mime == 'text/plain':
        return is_valid_text(file_content)

    signatures = FILE_SIGNATURES.get(claimed_mime)
    if not signatures:
        return False

    for offset, magic_bytes in signatures:
        if len(file_content) < offset + len(magic_bytes):
            return False
        if file_content[offset:offset + len(magic_bytes)] != magic_bytes:
            return False

    if claimed_mime == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return validate_docx_structure(file_content)

    return True


def is_valid_text(content: bytes) -> bool:
    """
    Check that content is decodable as text and does not
    contain suspicious binary sequences.
    """
    try:
        content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            content.decode('latin-1')
        except UnicodeDecodeError:
            return False

    null_ratio = content.count(b'\x00') / max(len(content), 1)
    if null_ratio > 0.01:
        return False

    return True


def validate_docx_structure(content: bytes) -> bool:
    """
    Verify that a PK (ZIP) file is actually a DOCX and not a zip bomb.
    Checks: [Content_Types].xml, word/ directory, decompressed size,
    individual entry size, and compression ratio.
    """
    try:
        with zipfile.ZipFile(io.BytesIO(content), 'r') as zf:
            names = zf.namelist()

            if '[Content_Types].xml' not in names:
                return False
            if not any(name.startswith('word/') for name in names):
                return False

            total_size = sum(info.file_size for info in zf.infolist())
            if total_size > MAX_DOCX_DECOMPRESSED_SIZE:
                logger.warning(
                    "DOCX decompressed size (%d bytes) exceeds limit (%d bytes)",
                    total_size, MAX_DOCX_DECOMPRESSED_SIZE
                )
                return False

            for info in zf.infolist():
                if info.file_size > MAX_DOCX_ENTRY_SIZE:
                    logger.warning(
                        "DOCX entry '%s' is %d bytes \u2014 exceeds limit (%d bytes)",
                        info.filename, info.file_size, MAX_DOCX_ENTRY_SIZE
                    )
                    return False
                if info.compress_size > 0:
                    ratio = info.file_size / info.compress_size
                    if ratio > DOCX_COMPRESSION_RATIO_LIMIT:
                        logger.warning(
                            "DOCX entry '%s' has suspicious compression ratio (%.0f:1)",
                            info.filename, ratio
                        )
                        return False

            return True
    except zipfile.BadZipFile:
        return False
    except Exception as e:
        logger.error("Failed to validate DOCX structure: %s", e)
        return False


def sanitize_filename(filename: str) -> str:
    """
    Remove path traversal attempts and dangerous characters.
    """
    filename = filename.replace('\\', '/').split('/')[-1]
    filename = filename.replace('\x00', '')
    filename = filename.lstrip('.')

    if not filename:
        filename = 'unnamed_file'

    return filename


def verify_content_matches_type(file_content: bytes, file_type: str) -> None:
    """
    Verify that file content matches its claimed MIME type.
    Raises DocumentSecurityError if content doesn't match.

    Single source of truth for content-type verification.
    Called by both upload routes and document_processor.
    """
    if not file_content:
        raise DocumentSecurityError("Empty file content")

    if file_type == 'text/plain':
        if not is_valid_text(file_content):
            raise DocumentSecurityError(
                "File contains excessive null bytes or is not valid text"
            )
        return

    expected_magic = MAGIC_SIGNATURES.get(file_type)
    if expected_magic is None:
        raise DocumentSecurityError(f"No signature defined for type: {file_type}")

    if len(file_content) < len(expected_magic):
        raise DocumentSecurityError(
            f"File too small ({len(file_content)} bytes) to be a valid {file_type}"
        )

    actual_magic = file_content[:len(expected_magic)]
    if actual_magic != expected_magic:
        raise DocumentSecurityError(
            f"File content does not match claimed type {file_type}"
        )

    if file_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        if not validate_docx_structure(file_content):
            raise DocumentSecurityError("Invalid or malicious DOCX structure")
