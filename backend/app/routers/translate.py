"""
EduSimplify AI – Translation router.

POST /translate
    Translate educational content into one of six Indian or English languages
    while preserving technical / domain-specific terms.
"""

from __future__ import annotations

import re
from typing import List

from fastapi import APIRouter, HTTPException, Request, status
from loguru import logger

from app.models.schemas import (
    SupportedLanguage,
    TranslateRequest,
    TranslateResponse,
)

router = APIRouter()

# ── Helpers ────────────────────────────────────────────────────────────────────


def _watsonx(request: Request):
    return request.app.state.watsonx


# ── Prompt template ────────────────────────────────────────────────────────────

_TRANSLATE_SYSTEM = """\
You are an expert multilingual educational translator for EduSimplify AI.

TARGET LANGUAGE: {target_language}

STRICT RULES:
1. Translate the text accurately and naturally into {target_language}.
2. Preserve ALL technical, scientific, and domain-specific terms in their
   original English form (do not translate them). Place them in parentheses
   after their transliterated/native equivalent if helpful.
3. Use educational, clear, accessible language appropriate for students.
4. Do NOT add explanations, preamble, or commentary.
5. Return ONLY the translated text.

If the target language is English and the input is already in English,
paraphrase for clarity instead.
"""

# Terms to always preserve (common STEM terms)
_ALWAYS_PRESERVE = [
    "algorithm", "function", "variable", "equation", "theorem", "hypothesis",
    "DNA", "RNA", "protein", "catalyst", "entropy", "derivative", "integral",
    "matrix", "vector", "probability", "statistics", "photosynthesis",
    "mitosis", "meiosis", "Newton", "Einstein", "gravity", "quantum",
    "machine learning", "neural network", "API", "database", "CPU", "RAM",
]


def _build_prompt(text: str, target_language: str) -> str:
    system = _TRANSLATE_SYSTEM.format(target_language=target_language)
    return (
        "<|begin_of_text|>"
        f"<|start_header_id|>system<|end_header_id|>\n{system}<|eot_id|>"
        "<|start_header_id|>user<|end_header_id|>\n"
        f"Translate the following text to {target_language}:\n\n{text}"
        "<|eot_id|>"
        "<|start_header_id|>assistant<|end_header_id|>"
    )


def _detect_technical_terms(text: str) -> List[str]:
    """Identify technical terms in the source text that should be preserved."""
    found: List[str] = []
    text_lower = text.lower()
    for term in _ALWAYS_PRESERVE:
        if term.lower() in text_lower:
            found.append(term)
    # Also capture acronyms (2+ consecutive uppercase letters)
    acronyms = re.findall(r"\b[A-Z]{2,}\b", text)
    for acr in acronyms:
        if acr not in found:
            found.append(acr)
    return found


# ── Route ──────────────────────────────────────────────────────────────────────


@router.post("", response_model=TranslateResponse, summary="Translate educational content")
async def translate_content(body: TranslateRequest, request: Request) -> TranslateResponse:
    """
    Translate text to the specified target language.

    Supported languages: English, Hindi, Bengali, Tamil, Telugu, Marathi.

    Technical terms are identified before translation and the model is
    instructed to preserve them in their original English form to maintain
    academic accuracy.
    """
    watsonx_svc = _watsonx(request)

    preserved_terms = _detect_technical_terms(body.text) if body.preserve_technical_terms else []

    prompt = _build_prompt(
        text=body.text,
        target_language=body.target_language.value,
    )

    try:
        translated = watsonx_svc.generate(
            prompt=prompt,
            max_tokens=1024,
            temperature=0.2,  # Low temperature for translation accuracy
        )
    except Exception as exc:
        logger.error(f"[translate] Generation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI translation service unavailable.",
        )

    return TranslateResponse(
        original_text=body.text,
        translated_text=translated.strip(),
        target_language=body.target_language,
        preserved_terms=preserved_terms,
    )
