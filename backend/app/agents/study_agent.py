"""
EduSimplify AI – Study notes generation agent.

The StudyAgent is responsible for:
1. Generating detailed, structured study notes tailored to a learner's level.
2. Simplifying / transforming arbitrary text using six cognitive action modes.
3. Analysing a PDF document and extracting a semantic summary.

Prompts are precisely calibrated per learner level to ensure the output is
always pedagogically appropriate.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from loguru import logger


# ── Learner-level prompt personas ─────────────────────────────────────────────

_LEVEL_PERSONAS: Dict[str, str] = {
    "beginner": (
        "You are a friendly, patient teacher explaining concepts to a Grade 6–8 student. "
        "Use everyday language, relatable analogies, and short sentences. "
        "Avoid technical jargon entirely; if a technical term must appear, define it immediately."
    ),
    "intermediate": (
        "You are a university lecturer addressing first or second-year undergraduates. "
        "Use correct terminology with brief clarifications. "
        "Assume basic foundational knowledge but not specialisation."
    ),
    "advanced": (
        "You are a subject matter expert communicating with postgraduate students. "
        "Assume deep foundational knowledge. Use precise technical language, "
        "include mathematical formalism where applicable, and discuss nuances."
    ),
    "expert": (
        "You are a research peer communicating with a specialist in the field. "
        "Assume mastery. Use domain-specific terminology freely. "
        "Discuss edge cases, limitations, and current research frontiers."
    ),
}

_STUDY_NOTES_SCHEMA = """\
Return ONLY a valid JSON object with these exact keys (no markdown, no extra text):
{
  "title": "<main topic title>",
  "overview": "<2–3 sentence introduction>",
  "objectives": ["<learning objective 1>", "<learning objective 2>"],
  "definitions": {"<term>": "<definition>"},
  "key_concepts": [{"heading": "<concept name>", "content": "<detailed explanation>"}],
  "examples": ["<concrete worked example>"],
  "diagrams": ["<mermaid diagram string if applicable>"],
  "comparison_tables": ["<markdown table comparing related concepts>"],
  "common_mistakes": ["<typical student error>"],
  "applications": ["<real-world application>"],
  "summary": "<concise paragraph of key takeaways>",
  "revision_tips": ["<actionable study tip>"]
}"""

_SIMPLIFY_TEMPLATES: Dict[str, str] = {
    "explain": (
        "Explain the following text step-by-step, making every concept crystal clear.\n"
        "Use numbered steps where appropriate. Define technical terms.\n\n"
        "TEXT:\n{text}"
    ),
    "simplify": (
        "Rewrite the following text using simpler vocabulary and shorter sentences. "
        "Maintain ALL key information without introducing inaccuracies.\n\n"
        "TEXT:\n{text}"
    ),
    "analogy": (
        "Create 2 vivid, memorable analogies that explain the following concept. "
        "Start each with 'This is like …' and relate to everyday experiences.\n\n"
        "CONCEPT:\n{text}"
    ),
    "example": (
        "Provide 3 distinct, concrete, real-world examples that illustrate the following concept. "
        "Be specific: name real places, people, or products where possible.\n\n"
        "CONCEPT:\n{text}"
    ),
    "mathematical": (
        "Provide a rigorous mathematical treatment of the following. "
        "Define all symbols. Show derivations or proofs step-by-step. "
        "Include units where applicable.\n\n"
        "TOPIC:\n{text}"
    ),
    "intuitive": (
        "Build an intuitive, first-principles understanding of the following. "
        "Start from fundamental observations and reason upward. "
        "Emphasise 'why' before 'how'.\n\n"
        "CONCEPT:\n{text}"
    ),
}


class StudyAgent:
    """
    Agent responsible for study note generation and text transformation.

    Args:
        watsonx_service: Initialised WatsonxService instance.
        rag_service:     Initialised RAGService instance.
    """

    def __init__(self, watsonx_service, rag_service) -> None:
        self._watsonx = watsonx_service
        self._rag = rag_service

    # ── Entry point called by the orchestrator ─────────────────────────────────

    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dispatch to the correct sub-task based on ``payload["action"]``.

        Expected payload keys:
        - ``action``:         "study_notes" | "simplify" | "pdf_analysis"
        - ``doc_id``:         Required for "study_notes" and "pdf_analysis".
        - ``text``:           Required for "simplify".
        - ``learner_level``:  One of beginner / intermediate / advanced / expert.
        - ``simplify_action``: One of the _SIMPLIFY_TEMPLATES keys (for simplify).
        - ``subject``:        Optional subject hint.

        Returns:
            Dict with keys specific to the sub-task performed.
        """
        action = payload.get("action", "study_notes")

        if action == "study_notes":
            return await self._generate_study_notes(payload)
        elif action == "simplify":
            return await self._simplify_text(payload)
        elif action == "pdf_analysis":
            return await self._analyse_document(payload)
        else:
            raise ValueError(f"StudyAgent does not handle action '{action}'.")

    # ── Study notes ────────────────────────────────────────────────────────────

    async def _generate_study_notes(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        doc_id: str = payload["doc_id"]
        level: str = payload.get("learner_level", "intermediate")
        subject: str = payload.get("subject", "")

        persona = _LEVEL_PERSONAS.get(level, _LEVEL_PERSONAS["intermediate"])
        query = f"key concepts definitions summary overview {subject}".strip()
        retrieved = self._rag.retrieve(doc_id=doc_id, query=query, top_k=8)
        context = self._rag.build_context(retrieved, max_chars=4000)

        prompt = (
            "<|begin_of_text|>"
            "<|start_header_id|>system<|end_header_id|>\n"
            f"{persona}\n\n"
            "STRICT RULE: Base every piece of content exclusively on the CONTEXT provided. "
            "Never introduce information absent from the CONTEXT.\n\n"
            f"{_STUDY_NOTES_SCHEMA}"
            "<|eot_id|>"
            "<|start_header_id|>user<|end_header_id|>\n"
            f"CONTEXT:\n{context}\n\nGenerate study notes for a {level} learner."
            "<|eot_id|>"
            "<|start_header_id|>assistant<|end_header_id|>"
        )

        raw = self._watsonx.generate(prompt=prompt, max_tokens=2048, temperature=0.4)
        data = _parse_json(raw)
        logger.info(f"[StudyAgent] Study notes generated for doc_id={doc_id}.")
        return data

    # ── Text simplification ────────────────────────────────────────────────────

    async def _simplify_text(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        text: str = payload["text"]
        level: str = payload.get("learner_level", "intermediate")
        simplify_action: str = payload.get("simplify_action", "simplify")

        persona = _LEVEL_PERSONAS.get(level, _LEVEL_PERSONAS["intermediate"])
        template = _SIMPLIFY_TEMPLATES.get(simplify_action, _SIMPLIFY_TEMPLATES["simplify"])
        user_message = template.format(text=text)

        prompt = (
            "<|begin_of_text|>"
            "<|start_header_id|>system<|end_header_id|>\n"
            f"{persona}\nAnswer precisely. No preamble."
            "<|eot_id|>"
            f"<|start_header_id|>user<|end_header_id|>\n{user_message}<|eot_id|>"
            "<|start_header_id|>assistant<|end_header_id|>"
        )

        result = self._watsonx.generate(prompt=prompt, max_tokens=1024, temperature=0.5)
        return {
            "original_text": text,
            "result": result.strip(),
            "action": simplify_action,
            "learner_level": level,
        }

    # ── Document analysis ──────────────────────────────────────────────────────

    async def _analyse_document(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Produce a high-level semantic analysis of the document."""
        doc_id: str = payload["doc_id"]
        retrieved = self._rag.retrieve(doc_id=doc_id, query="overview topics structure", top_k=5)
        context = self._rag.build_context(retrieved, max_chars=2000)

        prompt = (
            "<|begin_of_text|>"
            "<|start_header_id|>system<|end_header_id|>\n"
            "You are a document analysis expert. Analyse the provided text and return:\n"
            "1. Main topic\n2. Key sub-topics (up to 5)\n3. Estimated reading difficulty\n"
            "4. Recommended learner level\n5. Subject area\n"
            "Return as a JSON object with keys: "
            "main_topic, sub_topics, difficulty, recommended_level, subject_area."
            "<|eot_id|>"
            "<|start_header_id|>user<|end_header_id|>\n"
            f"DOCUMENT EXCERPT:\n{context}"
            "<|eot_id|>"
            "<|start_header_id|>assistant<|end_header_id|>"
        )

        raw = self._watsonx.generate(prompt=prompt, max_tokens=512, temperature=0.2)
        data = _parse_json(raw)
        logger.info(f"[StudyAgent] Document analysis complete for doc_id={doc_id}.")
        return data


# ── Utilities ──────────────────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return {"raw_output": raw.strip()}
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return {"raw_output": raw.strip()}
