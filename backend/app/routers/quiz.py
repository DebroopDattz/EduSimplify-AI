"""
EduSimplify AI – Quiz router.

POST /quiz
    Generate a structured quiz from the document context using Meta Llama 3.
    Supports four quiz types (MCQ, true/false, short answer, long answer) and
    three difficulty levels.  Each question includes the correct answer and an
    explanation.
"""

from __future__ import annotations

import json
import re
from typing import List

from fastapi import APIRouter, HTTPException, Request, status
from loguru import logger

from app.models.schemas import (
    Difficulty,
    QuizOption,
    QuizQuestion,
    QuizRequest,
    QuizResponse,
    QuizType,
)

router = APIRouter()

# ── Helpers ────────────────────────────────────────────────────────────────────


def _watsonx(request: Request):
    return request.app.state.watsonx


def _rag(request: Request):
    return request.app.state.rag


# ── Prompt templates ───────────────────────────────────────────────────────────

_QUIZ_SYSTEM = """\
You are an expert quiz designer for EduSimplify AI.
Generate exactly {num_questions} quiz question(s) of type '{quiz_type}' at '{difficulty}' difficulty
appropriate for a '{learner_level}' learner.

STRICT RULES:
1. Every question MUST be grounded in the CONTEXT provided. Do not invent facts.
2. Return ONLY a valid JSON array of question objects. No markdown, no preamble.
3. Each object must have these exact keys:
   - "question_number": integer (1-based)
   - "question": string
   - "quiz_type": "{quiz_type}"
   - "difficulty": "{difficulty}"
   - "options": array of {{"key": "A/B/C/D", "text": "..."}} for MCQ/true_false, else null
   - "correct_answer": string (e.g. "A" for MCQ, "True"/"False", or the answer text)
   - "explanation": string (why this is correct)
   - "topic": string (sub-topic from the document)

MCQ questions must have exactly 4 options (A, B, C, D) with one correct answer.
True/False questions must have exactly 2 options: {{"key":"True","text":"True"}} and {{"key":"False","text":"False"}}.
Short/long answer questions have null for options.

CONTEXT:
{context}
"""


def _build_quiz_prompt(
    context: str,
    quiz_type: QuizType,
    difficulty: Difficulty,
    num_questions: int,
    learner_level: str,
) -> str:
    system = _QUIZ_SYSTEM.format(
        num_questions=num_questions,
        quiz_type=quiz_type.value,
        difficulty=difficulty.value,
        learner_level=learner_level,
        context=context,
    )
    return (
        "<|begin_of_text|>"
        f"<|start_header_id|>system<|end_header_id|>\n{system}<|eot_id|>"
        "<|start_header_id|>user<|end_header_id|>\n"
        f"Generate {num_questions} {quiz_type.value} question(s) now. "
        "Return ONLY the JSON array."
        "<|eot_id|>"
        "<|start_header_id|>assistant<|end_header_id|>"
    )


# ── Route ──────────────────────────────────────────────────────────────────────


@router.post("", response_model=QuizResponse, summary="Generate a quiz from document")
async def generate_quiz(body: QuizRequest, request: Request) -> QuizResponse:
    """
    Generate a quiz grounded in the uploaded document's content.

    The AI model receives only the retrieved context chunks; it is explicitly
    instructed not to invent information outside the context.
    """
    rag_svc = _rag(request)
    watsonx_svc = _watsonx(request)

    # Retrieve broad context using the topic filter (if provided) or a generic query.
    query = body.topic_filter or "key concepts definitions examples problems"
    retrieved = rag_svc.retrieve(doc_id=body.doc_id, query=query, top_k=8)
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

    prompt = _build_quiz_prompt(
        context=context,
        quiz_type=body.quiz_type,
        difficulty=body.difficulty,
        num_questions=body.num_questions,
        learner_level=level_label,
    )

    try:
        raw = watsonx_svc.generate(prompt=prompt, max_tokens=2048, temperature=0.3)
    except Exception as exc:
        logger.error(f"[quiz] Generation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI generation service unavailable.",
        )

    questions = _parse_questions(raw, body.quiz_type, body.difficulty)

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to parse quiz questions from AI output. Please retry.",
        )

    return QuizResponse(
        doc_id=body.doc_id,
        quiz_type=body.quiz_type,
        difficulty=body.difficulty,
        num_questions=len(questions),
        questions=questions,
    )


# ── Parser ─────────────────────────────────────────────────────────────────────

def _parse_questions(
    raw: str,
    quiz_type: QuizType,
    difficulty: Difficulty,
) -> List[QuizQuestion]:
    """
    Parse the model's raw JSON output into a list of QuizQuestion objects.

    Tolerates minor formatting deviations (markdown fences, leading text).
    """
    # Strip markdown fences
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Extract the first JSON array
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        logger.warning(f"[quiz] No JSON array found. Raw: {cleaned[:300]}")
        return []

    try:
        items = json.loads(match.group())
    except json.JSONDecodeError as exc:
        logger.warning(f"[quiz] JSON decode error: {exc}")
        return []

    questions: List[QuizQuestion] = []
    for i, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        options = None
        raw_options = item.get("options")
        if isinstance(raw_options, list) and raw_options:
            options = [
                QuizOption(key=str(o.get("key", "")), text=str(o.get("text", "")))
                for o in raw_options
                if isinstance(o, dict)
            ]

        questions.append(
            QuizQuestion(
                question_number=item.get("question_number", i),
                question=str(item.get("question", "")),
                quiz_type=QuizType(item.get("quiz_type", quiz_type.value)),
                difficulty=Difficulty(item.get("difficulty", difficulty.value)),
                options=options,
                correct_answer=str(item.get("correct_answer", "")),
                explanation=str(item.get("explanation", "")),
                topic=item.get("topic"),
            )
        )

    return questions
