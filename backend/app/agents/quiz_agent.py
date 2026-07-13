"""
EduSimplify AI – Quiz generation agent.

The QuizAgent generates pedagogically appropriate quiz questions calibrated
to the learner's level and the requested difficulty.  It supports four
question formats and uses level-specific prompting strategies.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from loguru import logger


# ── Level-specific question strategies ────────────────────────────────────────

_LEVEL_STRATEGIES: Dict[str, str] = {
    "beginner": (
        "Focus on recall and basic comprehension (Bloom's levels 1–2). "
        "Questions should test recognition of key terms, simple definitions, "
        "and straightforward cause-effect relationships. "
        "Language must be simple and unambiguous. Avoid double negatives."
    ),
    "intermediate": (
        "Focus on comprehension and application (Bloom's levels 2–3). "
        "Test understanding of concepts, ability to apply principles to new scenarios, "
        "and identification of relationships between ideas. "
        "Use precise terminology."
    ),
    "advanced": (
        "Focus on analysis and synthesis (Bloom's levels 4–5). "
        "Test the ability to compare, contrast, derive, and critically evaluate. "
        "Include scenario-based and multi-step reasoning questions. "
        "Assume deep background knowledge."
    ),
    "expert": (
        "Focus on evaluation and creation (Bloom's level 6). "
        "Test critical evaluation of approaches, identification of limitations, "
        "and synthesis of novel solutions. Include research-frontier or edge-case questions."
    ),
}

_DIFFICULTY_GUIDANCE: Dict[str, str] = {
    "easy": (
        "Questions must be straightforward with a clearly correct answer. "
        "Distractors (wrong options) should be obviously incorrect."
    ),
    "medium": (
        "Questions should require genuine understanding. "
        "Distractors should be plausible but clearly distinguishable with knowledge."
    ),
    "hard": (
        "Questions should be challenging, require synthesis or nuanced understanding. "
        "Distractors should be technically plausible and require careful reasoning to eliminate."
    ),
}

_QUIZ_TYPE_GUIDANCE: Dict[str, str] = {
    "mcq": (
        "Multiple-choice question with exactly 4 options (A, B, C, D). "
        "Only one option is correct. Distractors must be from the same category as the correct answer."
    ),
    "true_false": (
        "True/False statement. Write a clear declarative statement. "
        "Ensure non-trivial truth value (not obvious from the phrasing alone)."
    ),
    "short_answer": (
        "Question requiring a 1–2 sentence answer. "
        "Questions should be specific enough to have a definitive correct answer."
    ),
    "long_answer": (
        "Open-ended question requiring a structured paragraph response (100–200 words). "
        "Test deep understanding, application, or analytical reasoning."
    ),
}

_QUIZ_SYSTEM_TEMPLATE = """\
You are an expert quiz designer for EduSimplify AI.

LEARNER LEVEL: {level}
LEVEL STRATEGY: {level_strategy}

QUESTION TYPE: {quiz_type}
TYPE GUIDANCE: {type_guidance}

DIFFICULTY: {difficulty}
DIFFICULTY GUIDANCE: {difficulty_guidance}

STRICT RULES:
1. Every question must be GROUNDED IN THE CONTEXT. Do not invent facts.
2. Generate EXACTLY {num_questions} question(s).
3. Return ONLY a valid JSON array. No markdown, no preamble, no explanation.
4. Each object must have:
   - "question_number": integer (1-based)
   - "question": the question text
   - "quiz_type": "{quiz_type}"
   - "difficulty": "{difficulty}"
   - "options": array of {{"key":"A","text":"…"}} for MCQ/true_false, else null
   - "correct_answer": "A"/"B"/"C"/"D" for MCQ, "True"/"False", or answer text
   - "explanation": why this answer is correct (cite the context)
   - "topic": sub-topic within the document

CONTEXT:
{context}
"""


class QuizAgent:
    """
    Agent that generates structured quizzes from document context.

    Args:
        watsonx_service: Initialised WatsonxService.
        rag_service:     Initialised RAGService.
    """

    def __init__(self, watsonx_service, rag_service) -> None:
        self._watsonx = watsonx_service
        self._rag = rag_service

    async def run(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate quiz questions.

        Expected payload keys:
        - ``doc_id``         (str)   – Document to draw content from.
        - ``quiz_type``      (str)   – "mcq" | "true_false" | "short_answer" | "long_answer"
        - ``difficulty``     (str)   – "easy" | "medium" | "hard"
        - ``num_questions``  (int)   – Number of questions to generate (1–50).
        - ``learner_level``  (str)   – "beginner" | "intermediate" | "advanced" | "expert"
        - ``topic_filter``   (str)   – Optional sub-topic to focus on.

        Returns:
            List of question dicts ready for Pydantic validation.
        """
        doc_id: str = payload["doc_id"]
        quiz_type: str = payload.get("quiz_type", "mcq")
        difficulty: str = payload.get("difficulty", "medium")
        num_questions: int = int(payload.get("num_questions", 10))
        level: str = payload.get("learner_level", "intermediate")
        topic_filter: str = payload.get("topic_filter", "")

        query = topic_filter or "key concepts definitions processes examples problems"
        retrieved = self._rag.retrieve(doc_id=doc_id, query=query, top_k=8)
        context = self._rag.build_context(retrieved, max_chars=4000)

        system = _QUIZ_SYSTEM_TEMPLATE.format(
            level=level,
            level_strategy=_LEVEL_STRATEGIES.get(level, _LEVEL_STRATEGIES["intermediate"]),
            quiz_type=quiz_type,
            type_guidance=_QUIZ_TYPE_GUIDANCE.get(quiz_type, ""),
            difficulty=difficulty,
            difficulty_guidance=_DIFFICULTY_GUIDANCE.get(difficulty, ""),
            num_questions=num_questions,
            context=context,
        )

        prompt = (
            "<|begin_of_text|>"
            f"<|start_header_id|>system<|end_header_id|>\n{system}<|eot_id|>"
            "<|start_header_id|>user<|end_header_id|>\n"
            f"Generate {num_questions} {quiz_type} question(s) now. Return ONLY the JSON array."
            "<|eot_id|>"
            "<|start_header_id|>assistant<|end_header_id|>"
        )

        raw = self._watsonx.generate(prompt=prompt, max_tokens=2048, temperature=0.3)
        questions = _parse_questions(raw)
        logger.info(
            f"[QuizAgent] Generated {len(questions)} question(s) for doc_id={doc_id} "
            f"({quiz_type}, {difficulty}, {level})."
        )
        return questions


# ── Parser ─────────────────────────────────────────────────────────────────────

def _parse_questions(raw: str) -> List[Dict[str, Any]]:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        logger.warning(f"[QuizAgent] No JSON array in output. Raw: {cleaned[:200]}")
        return []
    try:
        return json.loads(match.group())
    except json.JSONDecodeError as exc:
        logger.warning(f"[QuizAgent] JSON decode error: {exc}")
        return []
