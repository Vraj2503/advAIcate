"""
File Validation Utilities (Consolidated)
All file type, signature, and content validation in one place.
Both app.py routes and document_processor.py defer to this module.
"""

import io
import zipfile
import logging
import re
import xml.etree.ElementTree as ET

from config import (
    ALLOWED_MIME_TYPES,
    FILE_SIGNATURES,
    MAGIC_SIGNATURES,
    MIN_SIGNATURE_BYTES,
    EXTENSION_MIME_MAP,
    MAX_DOCX_DECOMPRESSED_SIZE,
    MAX_DOCX_ENTRY_SIZE,
    DOCX_COMPRESSION_RATIO_LIMIT,
    MAX_FILE_SIZE
)

logger = logging.getLogger(__name__)

PDF_DANGEROUS_PATTERNS = [
    rb'/JavaScript',
    rb'/JS\s',
    rb'/OpenAction',
    rb'/AA\s',
    rb'/Launch',
    rb'/EmbeddedFile',
    rb'/RichMedia',
    rb'/XFA',
    rb'/SubmitForm',
    rb'/ImportData',
]

def validate_pdf_content(file_content: bytes) -> tuple:
    """
    Scan PDF content for potentially dangerous active content.
    
    Args:
        file_content: Raw PDF bytes.
    
    Returns:
        (is_safe: bool, list_of_threats: list[str])
    """
    threats = []
    
    for pattern in PDF_DANGEROUS_PATTERNS:
        if re.search(pattern, file_content, re.IGNORECASE):
            keyword = pattern.decode('utf-8', errors='replace').strip('/')
            threats.append(keyword)
    
    # Check for excessive embedded objects (potential exploit)
    obj_count = len(re.findall(rb'\d+\s+\d+\s+obj', file_content))
    if obj_count > 10000:
        threats.append(f"Excessive objects ({obj_count})")
    
    # Check for encrypted/obfuscated streams (common in malicious PDFs)
    encrypt_count = len(re.findall(rb'/Encrypt', file_content))
    if encrypt_count > 0:
        threats.append("Encrypted content")
    
    return len(threats) == 0, threats


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

def validate_file_size(file, max_size_bytes: int) -> tuple:
    """
    Check the actual file size BEFORE reading into memory.

    Uses seek to determine size without buffering the entire file.

    Args:
        file:            A file-like object (e.g., from request.files).
        max_size_bytes:  Maximum allowed size in bytes.

    Returns:
        (True, file_size)  if within limit.
        (False, file_size) if exceeds limit.
    """
    file.seek(0, 2)        # Seek to end of file
    file_size = file.tell() # Get position = file size in bytes
    file.seek(0)            # Reset to beginning for subsequent .read()
    return file_size <= max_size_bytes, file_size


def validate_docx_content_security(file_content: bytes) -> tuple:
    """
    Scan DOCX content for malicious payloads including VBA macros,
    external reference SSRF, and DDE field injection.

    Args:
        file_content: Raw DOCX bytes.

    Returns:
        (is_safe: bool, list_of_threats: list[str])
    """
    threats = []

    # Dangerous ZIP entries that should never appear in a safe DOCX
    dangerous_entries = [
        'word/vbaProject.bin',
        'word/vbaData.xml',
        'customXml/',
    ]

    # Dangerous OLE relationship types (full schema URLs)
    dangerous_rel_types = [
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject',
        'http://schemas.microsoft.com/office/2006/relationships/vbaProject',
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships/frame',
    ]

    try:
        with zipfile.ZipFile(io.BytesIO(file_content), 'r') as zf:
            namelist = zf.namelist()

            # Check for dangerous file entries
            for entry in dangerous_entries:
                for name in namelist:
                    if name == entry or name.startswith(entry):
                        threats.append(f"Dangerous entry: {name}")

            # Parse all .rels files for dangerous relationships
            rels_files = [n for n in namelist if n.endswith('.rels')]
            for rels_file in rels_files:
                try:
                    rels_content = zf.read(rels_file)
                    root = ET.fromstring(rels_content)
                    for rel in root:
                        rel_type = rel.get('Type', '')
                        target = rel.get('Target', '')
                        target_mode = rel.get('TargetMode', '')

                        # Check for external references (SSRF risk)
                        if target_mode == 'External' and (
                            target.startswith('http://') or target.startswith('https://')):
                            threats.append(f"External reference (SSRF risk): {target[:100]}")

                        # Check for dangerous relationship types
                        for dangerous_type in dangerous_rel_types:
                            if rel_type == dangerous_type:
                                threats.append(f"Dangerous relationship: {rel_type}")
                except ET.ParseError:
                    threats.append(f"Malformed XML in {rels_file}")

            # Check word/document.xml for DDE and external data references
            if 'word/document.xml' in namelist:
                try:
                    doc_content = zf.read('word/document.xml').decode('utf-8', errors='replace')
                    if re.search(r'\bDDE\b', doc_content, re.IGNORECASE):
                        threats.append("DDE field code detected")
                    if re.search(r'\bDDEAUTO\b', doc_content, re.IGNORECASE):
                        threats.append("DDEAUTO field code detected")
                    if re.search(r'externalData', doc_content, re.IGNORECASE):
                        threats.append("External data reference detected")
                except Exception:
                    threats.append("Failed to read document.xml")

    except zipfile.BadZipFile:
        threats.append("Invalid ZIP/DOCX structure")
    except Exception as e:
        logger.error("DOCX security scan failed: %s", e)
        threats.append("Security scan error")

    return len(threats) == 0, threats


# Compiled regex patterns for common prompt injection attempts
_INJECTION_PATTERNS = [
    re.compile(r'ignore\s+(all\s+)?previous\s+instructions', re.IGNORECASE),
    re.compile(r'ignore\s+(all\s+)?above\s+instructions', re.IGNORECASE),
    re.compile(r'disregard\s+(all\s+)?(previous|prior|above)', re.IGNORECASE),
    re.compile(r'you\s+are\s+now', re.IGNORECASE),
    re.compile(r'new\s+instructions?:', re.IGNORECASE),
    re.compile(r'system\s+prompt:', re.IGNORECASE),
    re.compile(r'output\s+(your|the)\s+system\s+prompt', re.IGNORECASE),
    re.compile(r'reveal\s+(your|the)\s+(system|initial)\s+prompt', re.IGNORECASE),
    re.compile(r'<system>', re.IGNORECASE),
    re.compile(r'\[INST\]', re.IGNORECASE),
    re.compile(r'```\s*system', re.IGNORECASE),
]


def scan_text_for_injection(text: str, threshold: int = 2) -> tuple:
    """
    Scan text content for prompt injection patterns.

    A single match is tolerated (the user may be discussing the topic),
    but multiple distinct matches indicate an actual injection attempt.

    Args:
        text:       The text content to scan.
        threshold:  Number of distinct pattern matches to trigger a block.
                    Defaults to 2.

    Returns:
        (is_safe: bool, list_of_matched_patterns: list[str])
    """
    matches = []
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(text):
            matches.append(pattern.pattern)
    return len(matches) < threshold, matches


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
