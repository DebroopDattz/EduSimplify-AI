"""
EduSimplify AI – Utility / Helper Functions
============================================
Pure, stateless helpers used across the application.
"""

import hashlib
import json
import os
import re
import unicodedata
import uuid
from datetime import datetime, timezone
from typing import Any


# ─────────────────────────────────────────────────────────────────────────────
# Document helpers
# ─────────────────────────────────────────────────────────────────────────────


def generate_doc_id(user_id: str | None = None, filename: str | None = None) -> str:
    """
    Generate a stable, unique document identifier.

    When both ``user_id`` and ``filename`` are supplied the ID is
    deterministic (SHA-256 of ``{user_id}:{filename}:{utc-date}``),
    which lets you detect duplicate uploads within the same day.
    Otherwise a random UUID-4 string is returned.

    Args:
        user_id:  The authenticated user's identifier (optional).
        filename: Original filename of the uploaded document (optional).

    Returns:
        A 32-character hex string derived from SHA-256, or a UUID-4 string.

    Examples:
        >>> doc_id = generate_doc_id("user_42", "lecture_notes.pdf")
        >>> len(doc_id)
        64
        >>> generate_doc_id()  # random fallback
        'xxxxxxxx-xxxx-4xxx-...'
    """
    if user_id and filename:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        raw = f"{user_id}:{filename}:{date_str}"
        return hashlib.sha256(raw.encode()).hexdigest()
    return str(uuid.uuid4())


# ─────────────────────────────────────────────────────────────────────────────
# File helpers
# ─────────────────────────────────────────────────────────────────────────────


def sanitize_filename(filename: str) -> str:
    """
    Return a filesystem-safe version of *filename*.

    Steps applied:
    1. Unicode normalise to NFKD and strip non-ASCII characters.
    2. Replace whitespace sequences with a single underscore.
    3. Remove characters that are not alphanumeric, underscores, hyphens, or dots.
    4. Collapse repeated underscores/hyphens.
    5. Strip leading/trailing dots, underscores, and hyphens.
    6. Truncate the stem to 200 characters to keep paths short.
    7. Fall back to ``"unnamed_file"`` if the result is empty.

    Args:
        filename: Raw filename from ``UploadFile.filename`` or similar.

    Returns:
        A sanitised filename string safe for use in file paths and COS keys.

    Examples:
        >>> sanitize_filename("  Hello World!.pdf")
        'Hello_World.pdf'
        >>> sanitize_filename("../../../etc/passwd")
        'etc_passwd'
        >>> sanitize_filename("résumé (final) v2.docx")
        'resume_final_v2.docx'
    """
    if not filename:
        return "unnamed_file"

    # Normalise Unicode and drop non-ASCII
    normalised = unicodedata.normalize("NFKD", filename)
    ascii_only = normalised.encode("ascii", "ignore").decode("ascii")

    # Separate name and extension
    if "." in ascii_only:
        *stem_parts, ext = ascii_only.rsplit(".", 1)
        stem = ".".join(stem_parts)
        ext = "." + re.sub(r"[^a-zA-Z0-9]", "", ext)
    else:
        stem = ascii_only
        ext = ""

    # Remove path separators and sanitise stem
    stem = stem.replace("/", "_").replace("\\", "_").replace("..", "_")
    stem = re.sub(r"\s+", "_", stem)
    stem = re.sub(r"[^a-zA-Z0-9_\-]", "", stem)
    stem = re.sub(r"[_\-]{2,}", "_", stem)
    stem = stem.strip("._-")
    stem = stem[:200]

    return (stem + ext) if stem else "unnamed_file"


def validate_pdf_size(size: int, max_mb: float = 50.0) -> tuple[bool, str]:
    """
    Check whether a file's byte size is within the allowed limit.

    Args:
        size:   File size in bytes.
        max_mb: Maximum allowed size in megabytes (default: 50 MB).

    Returns:
        A ``(is_valid, message)`` tuple.
        *is_valid* is ``True`` when the file is within the limit.
        *message* is an empty string on success, or a human-readable
        error description on failure.

    Examples:
        >>> validate_pdf_size(1024 * 1024 * 10)   # 10 MB
        (True, '')
        >>> validate_pdf_size(1024 * 1024 * 60)   # 60 MB
        (False, 'File size 60.00 MB exceeds the maximum allowed 50.00 MB.')
        >>> validate_pdf_size(-1)
        (False, 'Invalid file size: -1 bytes.')
    """
    if size < 0:
        return False, f"Invalid file size: {size} bytes."

    size_mb = size / (1024 * 1024)
    if size_mb > max_mb:
        return False, (
            f"File size {size_mb:.2f} MB exceeds the maximum allowed {max_mb:.2f} MB."
        )
    return True, ""


# ─────────────────────────────────────────────────────────────────────────────
# Chat / history helpers
# ─────────────────────────────────────────────────────────────────────────────


def format_chat_history(messages: list[dict[str, str]], max_turns: int = 10) -> str:
    """
    Convert a list of chat message dicts into a plain-text transcript.

    Each dict must have at least ``"role"`` (``"user"`` or ``"assistant"``)
    and ``"content"`` keys.  Only the last *max_turns* exchanges are kept to
    avoid overshooting the model's context window.

    Args:
        messages:  List of ``{"role": str, "content": str}`` dicts.
        max_turns: Maximum number of complete user/assistant turns to retain
                   (1 turn = 1 user message + 1 assistant reply).

    Returns:
        A multi-line string of the form::

            User: <message>
            Assistant: <reply>
            ...

    Examples:
        >>> msgs = [
        ...     {"role": "user", "content": "What is gravity?"},
        ...     {"role": "assistant", "content": "Gravity is a force..."},
        ... ]
        >>> print(format_chat_history(msgs))
        User: What is gravity?
        Assistant: Gravity is a force...
    """
    if not messages:
        return ""

    # Keep only the most recent turns (each turn = 2 messages)
    trimmed = messages[-(max_turns * 2):]

    lines = []
    for msg in trimmed:
        role = msg.get("role", "unknown").capitalize()
        content = str(msg.get("content", "")).strip()
        if content:
            lines.append(f"{role}: {content}")

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Prompt helpers
# ─────────────────────────────────────────────────────────────────────────────

_LEVEL_DESCRIPTIONS: dict[str, str] = {
    "beginner": (
        "The learner is a complete beginner. Use simple vocabulary, short sentences, "
        "and relatable everyday analogies. Avoid jargon. Define every technical term "
        "the first time you use it."
    ),
    "intermediate": (
        "The learner has some background knowledge. Use clear explanations with "
        "occasional technical terms (briefly defined when introduced). Balance "
        "simplicity with depth."
    ),
    "advanced": (
        "The learner is proficient in this subject. You may use domain-specific "
        "terminology freely, provide nuanced explanations, and reference related "
        "concepts without extensive scaffolding."
    ),
}

_DEFAULT_LEVEL_DESC = _LEVEL_DESCRIPTIONS["intermediate"]


def build_system_prompt(
    learner_level: str = "intermediate",
    language: str = "English",
    doc_title: str | None = None,
) -> str:
    """
    Construct the system prompt injected at the start of every watsonx inference call.

    Args:
        learner_level: One of ``"beginner"``, ``"intermediate"``, or ``"advanced"``.
                       Unknown values fall back to intermediate.
        language:      The ISO language name to respond in (e.g. ``"Hindi"``).
        doc_title:     Optional title of the source document, used to ground the AI.

    Returns:
        A formatted system prompt string ready to send to the LLM.

    Examples:
        >>> prompt = build_system_prompt("beginner", "Hindi")
        >>> "beginner" in prompt.lower()
        True
        >>> "Hindi" in prompt
        True
    """
    level_desc = _LEVEL_DESCRIPTIONS.get(learner_level.lower(), _DEFAULT_LEVEL_DESC)
    doc_clause = (
        f' The source document is titled "{doc_title}".' if doc_title else ""
    )

    return (
        f"You are EduSimplify AI, an intelligent educational assistant designed to help "
        f"students understand complex academic content.{doc_clause}\n\n"
        f"Learner profile: {level_desc}\n\n"
        f"Language: Always respond in {language}. If the user writes in a different "
        f"language, still reply in {language} unless explicitly told otherwise.\n\n"
        f"Guidelines:\n"
        f"- Base every answer strictly on the provided document context.\n"
        f"- If the answer cannot be found in the context, say so honestly.\n"
        f"- Structure longer answers with short paragraphs or numbered steps.\n"
        f"- Never fabricate citations, page numbers, or facts.\n"
        f"- Keep answers concise but complete."
    )


# ─────────────────────────────────────────────────────────────────────────────
# Response parsing helpers
# ─────────────────────────────────────────────────────────────────────────────


def parse_structured_response(text: str) -> dict[str, Any]:
    """
    Attempt to extract a structured JSON payload from a raw LLM output string.

    The LLM sometimes wraps JSON in markdown code fences (triple backtick json ... triple backtick).
    This function:
    1. Strips markdown fences if present.
    2. Finds the first ``{`` … ``}`` or ``[`` … ``]`` block.
    3. Parses it as JSON.
    4. Falls back to ``{"raw": text}`` if no valid JSON is found.

    Args:
        text: Raw string output from the LLM.

    Returns:
        A Python dict.  If JSON was successfully parsed, the dict reflects the
        parsed structure.  Otherwise ``{"raw": <original_text>}`` is returned.

    Examples:
        >>> parse_structured_response('```json\\n{"score": 9}\\n```')
        {'score': 9}
        >>> parse_structured_response("Here is the answer: no JSON here.")
        {'raw': 'Here is the answer: no JSON here.'}
    """
    if not text or not isinstance(text, str):
        return {"raw": ""}

    # Strip common markdown code fences
    cleaned = re.sub(r"```(?:json|JSON)?\s*", "", text).replace("```", "").strip()

    # Try to locate a JSON object or array in the cleaned text
    for pattern in (r"\{.*\}", r"\[.*\]"):
        match = re.search(pattern, cleaned, re.DOTALL)
        if match:
            candidate = match.group(0)
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

    # Last-resort: attempt to parse the entire cleaned string
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"raw": text.strip()}
