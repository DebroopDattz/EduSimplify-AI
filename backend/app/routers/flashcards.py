"""
EduSimplify AI – Flashcards router.

POST /flashcards
    Generate a set of question-and-answer flashcards from the document content
    using the RAG pipeline and Meta Llama 3 70B Instruct.
"""

from __future__ import annotations

import json
import re
from typing import List

from fastapi import APIRouter, HTTPException, Request, status
from loguru import logger

from app.models.schemas import (
    Difficulty,
    Flashcard,
    FlashcardRequest,
    FlashcardResponse,
)

router = APIRouter()

# ── Helpers ────────────────────────────────────────────────────────────────────


def _watsonx(request: Request):
    return request.app.state.watsonx


def _rag(request: Request):
    return request.app.state.rag


# ── Prompt ─────────────────────────────────────────────────────────────────────

_FLASHCARD_SYSTEM = """\
You are an expert flashcard creator for EduSimplify AI.
Generate exactly {num_cards} flashcard(s) based ONLY on the provided CONTEXT.

Learner level: {learner_level}

STRICT RULES:
1. ONLY use information from the CONTEXT. Never hallucinate.
2. Return a valid JSON array only. No markdown, no extra text.
3. Each flashcard object must have:
   - "card_number": integer (1-based)
   - "question": concise, clear question testing recall or understanding
   - "answer": accurate, complete answer drawn from the context
   - "topic": sub-topic or concept name
   - "difficulty": one of "easy", "medium", "hard"

Mix difficulties appropriately. Prefer conceptual understanding over rote
memorisation. Include definitions, comparisons, applications, and process steps.

CONTEXT:
{context}
"""


def _build_prompt(context: str, num_cards: int, learner_level: str) -> str:
    system = _FLASHCARD_SYSTEM.format(
        num_cards=num_cards,
        learner_level=learner_level,
        context=context,
    )
    return (
        "<|begin_of_text|>"
        f"<|start_header_id|>system<|end_header_id|>\n{system}<|eot_id|>"
        "<|start_header_id|>user<|end_header_id|>\n"
        f"Generate {num_cards} flashcard(s) now. Return ONLY the JSON array."
        "<|eot_id|>"
        "<|start_header_id|>assistant<|end_header_id|>"
    )


# ── Route ──────────────────────────────────────────────────────────────────────


@router.post("", response_model=FlashcardResponse, summary="Generate flashcards from document")
async def generate_flashcards(body: FlashcardRequest, request: Request) -> FlashcardResponse:
    """
    Generate question-answer flashcards grounded in the document's content.

    The model is strictly instructed to answer only from the retrieved RAG
    context, preventing hallucination.
    """
    rag_svc = _rag(request)
    watsonx_svc = _watsonx(request)

    query = body.topic_filter or "key definitions concepts processes applications"
    retrieved = rag_svc.retrieve(doc_id=body.doc_id, query=query, top_k=10)
    context = rag_svc.build_context(retrieved, max_chars=4000)

    if context == "No relevant context found in the document.":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No content found for document '{body.doc_id}'.",
        )

    level_labels = {
        "beginner": "beginner (Grade 6–8)",
        "intermediate": "intermediate (undergraduate)",
        "advanced": "advanced (postgraduate)",
        "expert": "expert (specialist)",
    }
    level_label = level_labels.get(body.learner_level.value, "intermediate (undergraduate)")

    prompt = _build_prompt(
        context=context,
        num_cards=body.num_cards,
        learner_level=level_label,
    )

    try:
        raw = watsonx_svc.generate(prompt=prompt, max_tokens=2048, temperature=0.4)
    except Exception as exc:
        logger.error(f"[flashcards] Generation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI generation service unavailable.",
        )

    flashcards = _parse_flashcards(raw)

    if not flashcards:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to parse flashcards from AI output. Please retry.",
        )

    return FlashcardResponse(
        doc_id=body.doc_id,
        num_cards=len(flashcards),
        flashcards=flashcards,
    )


# ── Parser ─────────────────────────────────────────────────────────────────────

def _parse_flashcards(raw: str) -> List[Flashcard]:
    """Parse flashcard JSON array from model output."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        logger.warning(f"[flashcards] No JSON array found. Raw snippet: {cleaned[:300]}")
        return []

    try:
        items = json.loads(match.group())
    except json.JSONDecodeError as exc:
        logger.warning(f"[flashcards] JSON decode error: {exc}")
        return []

    cards: List[Flashcard] = []
    for i, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        difficulty_raw = item.get("difficulty", "medium")
        try:
            diff = Difficulty(difficulty_raw)
        except ValueError:
            diff = Difficulty.medium

        cards.append(
            Flashcard(
                card_number=item.get("card_number", i),
                question=str(item.get("question", "")),
                answer=str(item.get("answer", "")),
                topic=item.get("topic"),
                difficulty=diff,
            )
        )
    return cards
