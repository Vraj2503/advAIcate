"""
Token Utilities — token counting and message fitting for context window management.

Uses tiktoken's cl100k_base encoding as a close approximation (~95% accurate)
for LLaMA tokenization. The TOKEN_SAFETY_MARGIN in config accounts for the
difference between cl100k_base and the actual LLaMA tokenizer.
"""

import logging
from typing import List, Dict, Optional

import tiktoken

from config import GROQ_CHAT_MAX_TOKENS, CONTEXT_WINDOW_SIZE, TOKEN_SAFETY_MARGIN

logger = logging.getLogger(__name__)

# Cache the encoder at module level — creating it is expensive, only do it once.
_encoder = None


def _get_encoder():
    """Lazily initialize and cache the tiktoken encoder."""
    global _encoder
    if _encoder is None:
        _encoder = tiktoken.get_encoding("cl100k_base")
    return _encoder


def count_tokens(text: str) -> int:
    """
    Count the approximate number of tokens in a text string.

    Uses cl100k_base encoding which is ~95% accurate for LLaMA models.
    The TOKEN_SAFETY_MARGIN config value accounts for this approximation gap.

    Args:
        text: The text to count tokens for.

    Returns:
        Number of tokens. Returns 0 for None or empty strings.
    """
    if not text:
        return 0
    encoder = _get_encoder()
    return len(encoder.encode(text))


# Per-message overhead: accounts for role name tokens, message separators,
# and formatting tokens added by the chat template.
MESSAGE_OVERHEAD = 4


def count_message_tokens(message: dict) -> int:
    """
    Count tokens for a single chat message dict.

    Accounts for overhead from role name tokens, message separators,
    and formatting that the model adds around each message.

    Args:
        message: Dict with "role" and "content" keys.

    Returns:
        Total token count including MESSAGE_OVERHEAD.
    """
    content = message.get("content", "")
    role = message.get("role", "")
    return MESSAGE_OVERHEAD + count_tokens(content) + count_tokens(role)


def fit_messages_to_budget(
    messages: List[Dict],
    system_prompt: str,
    current_message: str,
    rag_context: str = "",
    session_summary: str = "",
    max_budget: Optional[int] = None,
) -> List[Dict]:
    """
    Fit conversation history messages into the available token budget.

    Priority order (highest to lowest):
        1. System prompt   — ALWAYS included (defines AI behavior)
        2. Current message — ALWAYS included (what user just asked)
        3. RAG context     — ALWAYS included if present (retrieved documents)
        4. Session summary — ALWAYS included if present (compressed older history)
        5. Recent history  — fill remaining budget, most recent first

    Messages are selected most-recent-first because:
        - Pronoun resolution ("this", "that") almost always refers to recent turns
        - Topic continuity is strongest with adjacent messages
        - Older messages are increasingly unlikely to be referenced directly

    Args:
        messages: List of message dicts in CHRONOLOGICAL order (oldest first).
        system_prompt: The system prompt string.
        current_message: The user's current message string.
        rag_context: Retrieved document context string (can be empty).
        session_summary: Rolling summary of older messages (can be empty).
        max_budget: Override total token budget (for testing).
                    Defaults to CONTEXT_WINDOW_SIZE - GROQ_CHAT_MAX_TOKENS - TOKEN_SAFETY_MARGIN.

    Returns:
        List of message dicts that fit within the budget, in chronological order.
        Returns empty list if no budget remains for history.
    """
    if not messages:
        return []

    # Calculate total available budget
    if max_budget is None:
        max_budget = CONTEXT_WINDOW_SIZE - GROQ_CHAT_MAX_TOKENS - TOKEN_SAFETY_MARGIN

    # Calculate fixed token costs (always included, never dropped)
    fixed_tokens = 0
    fixed_tokens += count_tokens(system_prompt) + MESSAGE_OVERHEAD
    fixed_tokens += count_tokens(current_message) + MESSAGE_OVERHEAD

    if rag_context:
        fixed_tokens += count_tokens(rag_context) + MESSAGE_OVERHEAD

    if session_summary:
        fixed_tokens += count_tokens(session_summary) + MESSAGE_OVERHEAD

    # Remaining budget for conversation history
    history_budget = max_budget - fixed_tokens

    if history_budget <= 0:
        logger.warning(
            "No token budget for history. Fixed costs (%d) exceed budget (%d). "
            "Consider reducing system prompt size.",
            fixed_tokens, max_budget
        )
        return []

    # Iterate through messages in REVERSE order (most recent first)
    fitted = []
    tokens_used = 0

    for msg in reversed(messages):
        msg_tokens = count_message_tokens(msg)
        if tokens_used + msg_tokens > history_budget:
            break
        fitted.append(msg)
        tokens_used += msg_tokens

    # Reverse back to chronological order
    fitted.reverse()

    return fitted
