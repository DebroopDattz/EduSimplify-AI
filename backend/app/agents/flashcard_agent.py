"""
EduSimplify AI – Flashcard generation agent.

Generates pedagogically varied question-answer flashcard decks tuned to the
learner's cognitive level.  The agent categorises cards by:
- Definition recall
- Concept explanation
- Application / problem-solving
- Comparison / contrast
- Process step recall
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from loguru import logger


# ── Learner-level card profiles ────────────────────────────────────────────────

_LEVEL_CARD_PROFILES: Dict[str, str] = {
    "beginner": (
        "Create simple recall cards. Questions should start with: "
        "'What is …', 'Define …', 'Name the …'. "
        "Answers should be 1-2 sentences in plain language. "
        "Avoid complex sentence structures."
    ),
    "intermediate": (
        "Create a mix of recall, comprehension, and application cards. "
        "Include 'How does … work?', 'Why does …?', 'What happens when …?'. "
        "Answers may be 2-4 sentences with some technical terminology."
    ),
    "advanced": (
        "Create analytical and synthesis-oriented cards. "
        "Include 'Compare and contrast …', 'Derive …', 'Evaluate …', "
        "'What are the limitations of …?'. "
        "Answers should be precise and technically detailed."
    ),
    "expert": (
        "Create evaluation and research-level cards. "
        "Include 'Critically analyse …', 'What does current research suggest about …?', "
        "'Identify edge cases in …'. "
        "Answers should reflect specialist knowledge and nuance."
    ),
}

_FLASHCARD_SYSTEM_TEMPLATE = """\
You are an expert flashcard creator for EduSimplify AI.
LEARNER LEVEL: {level}
CARD PROFILE: {card_profile}

Generate exactly {num_cards} flashcard(s) based ONLY on the provided CONTEXT.

Card type distribution to aim for (adjust to what the context supports):
- 30% Definition cards ("What is X?")
- 25% Explanation cards ("How does X work?")
- 20% Application cards ("How is X used in Y?")
- 15% Comparison cards ("Compare X and Y")
- 10% Process cards ("List the steps of X")

STRICT RULES:
1. Use ONLY information from the CONTEXT. Never hallucinate.
2. Return ONLY a valid JSON array. No markdown fences, no preamble.
3. Each card object must have:
   - "card_number": integer (1-based)
   - "question": clear, specific question
   - "answer": accurate, self-contained answer
   - "topic": sub-topic name
   - "difficulty": "easy" | "medium" | "hard"

CONTEXT:
{context}
"""


class FlashcardAgent:
    """
    Agent that produces question-answer flashcard decks from document content.

    Args:
        watsonx_service: Initialised WatsonxService.
        rag_service:     Initialised RAGService.
    """

    def __init__(self, watsonx_service, rag_service) -> None:
        self._watsonx = watsonx_service
        self._rag = rag_service

    async def run(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate flashcards from document context.

        Expected payload keys:
        - ``doc_id``         (str)  – Document identifier.
        - ``num_cards``      (int)  – Number of cards to generate (1–100).
        - ``learner_level``  (str)  – Learner level string.
        - ``topic_filter``   (str)  – Optional sub-topic to focus the cards on.

        Returns:
            List of card dicts ready for Pydantic validation.
        """
        doc_id: str = payload["doc_id"]
        num_cards: int = int(payload.get("num_cards", 20))
        level: str = payload.get("learner_level", "intermediate")
        topic_filter: str = payload.get("topic_filter", "")

        query = topic_filter or "key definitions concepts processes applications comparisons"
        retrieved = self._rag.retrieve(doc_id=doc_id, query=query, top_k=10)
        context = self._rag.build_context(retrieved, max_chars=4000)

        system = _FLASHCARD_SYSTEM_TEMPLATE.format(
            level=level,
            card_profile=_LEVEL_CARD_PROFILES.get(level, _LEVEL_CARD_PROFILES["intermediate"]),
            num_cards=num_cards,
            context=context,
        )

        prompt = (
            "<|begin_of_text|>"
            f"<|start_header_id|>system<|end_header_id|>\n{system}<|eot_id|>"
            "<|start_header_id|>user<|end_header_id|>\n"
            f"Generate {num_cards} flashcard(s) now. Return ONLY the JSON array."
            "<|eot_id|>"
            "<|start_header_id|>assistant<|end_header_id|>"
        )

        raw = self._watsonx.generate(prompt=prompt, max_tokens=2048, temperature=0.4)
        cards = _parse_cards(raw)
        logger.info(
            f"[FlashcardAgent] Generated {len(cards)} card(s) for doc_id={doc_id} "
            f"(level={level})."
        )
        return cards


# ── Parser ─────────────────────────────────────────────────────────────────────

def _parse_cards(raw: str) -> List[Dict[str, Any]]:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        logger.warning(f"[FlashcardAgent] No JSON array in output. Raw: {cleaned[:200]}")
        return []
    try:
        return json.loads(match.group())
    except json.JSONDecodeError as exc:
        logger.warning(f"[FlashcardAgent] JSON decode error: {exc}")
        return []
