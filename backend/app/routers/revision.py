"""
EduSimplify AI – Revision router.

POST /revision
    Generate a revision artefact in one of five formats:
    formula_sheet | cheat_sheet | mind_map | summary | exam_notes
"""

from __future__ import annotations

import json
import re
from typing import List

from fastapi import APIRouter, HTTPException, Request, status
from loguru import logger

from app.models.schemas import (
    RevisionRequest,
    RevisionResponse,
    RevisionType,
    StudyNotesSection,
)

router = APIRouter()

# ── Helpers ────────────────────────────────────────────────────────────────────


def _watsonx(request: Request):
    return request.app.state.watsonx


def _rag(request: Request):
    return request.app.state.rag


# ── Prompt configurations per revision type ────────────────────────────────────

_REVISION_INSTRUCTIONS: dict[RevisionType, str] = {
    RevisionType.formula_sheet: (
        "Create a concise formula sheet. List all equations, formulas, and mathematical "
        "relationships present in the context. Group them by topic/section. "
        "Format each formula clearly. Include the meaning of each variable."
    ),
    RevisionType.cheat_sheet: (
        "Create a one-page cheat sheet. Include: key definitions, important rules, "
        "critical formulas, common patterns, and must-remember facts. "
        "Be extremely concise. Use bullet points and short phrases."
    ),
    RevisionType.mind_map: (
        "Create a hierarchical mind map in Mermaid mindmap syntax. "
        "The root node should be the main topic. Branch into key subtopics, "
        "then leaf nodes for specific details. "
        "Return the Mermaid code block and a textual description of the structure."
    ),
    RevisionType.summary: (
        "Write a comprehensive summary of all key content in the context. "
        "Organise by logical sections. Cover definitions, processes, examples, "
        "and key relationships. Length: 400-600 words."
    ),
    RevisionType.exam_notes: (
        "Create exam preparation notes. Include: "
        "1) High-probability exam topics, "
        "2) Common question patterns, "
        "3) Key facts to memorise, "
        "4) Common pitfalls and misconceptions, "
        "5) Quick recall prompts for each major concept."
    ),
}

_REVISION_SYSTEM = """\
You are an expert revision material creator for EduSimplify AI.
Learner level: {learner_level}.

STRICT RULES:
1. Base ALL content ONLY on the provided CONTEXT. No hallucination.
2. Return a valid JSON object with these exact keys (no extras, no markdown fences):
   {{
     "title": "<descriptive title for this revision sheet>",
     "content": "<full formatted content as a single markdown string>",
     "sections": [
       {{"heading": "<section heading>", "content": "<section content>"}}
     ]
   }}

INSTRUCTION: {instruction}

CONTEXT:
{context}
"""


def _build_prompt(
    context: str,
    revision_type: RevisionType,
    learner_level: str,
) -> str:
    instruction = _REVISION_INSTRUCTIONS[revision_type]
    system = _REVISION_SYSTEM.format(
        learner_level=learner_level,
        instruction=instruction,
        context=context,
    )
    return (
        "<|begin_of_text|>"
        f"<|start_header_id|>system<|end_header_id|>\n{system}<|eot_id|>"
        "<|start_header_id|>user<|end_header_id|>\n"
        f"Generate the {revision_type.value.replace('_', ' ')} now. Return ONLY the JSON object."
        "<|eot_id|>"
        "<|start_header_id|>assistant<|end_header_id|>"
    )


# ── Route ──────────────────────────────────────────────────────────────────────


@router.post("", response_model=RevisionResponse, summary="Generate revision material")
async def generate_revision(body: RevisionRequest, request: Request) -> RevisionResponse:
    """
    Generate a revision artefact from the document content.

    Supported revision types:
    - ``formula_sheet``  – all equations and formulas with variable meanings
    - ``cheat_sheet``    – compact one-pager of critical facts
    - ``mind_map``       – Mermaid mindmap + textual description
    - ``summary``        – comprehensive 400-600 word narrative summary
    - ``exam_notes``     – exam-focused recall prompts and pitfall warnings
    """
    rag_svc = _rag(request)
    watsonx_svc = _watsonx(request)

    # Select retrieval query based on revision type
    type_queries: dict[RevisionType, str] = {
        RevisionType.formula_sheet: "equations formulas mathematical relationships variables",
        RevisionType.cheat_sheet: "key definitions rules important facts patterns",
        RevisionType.mind_map: "main topics subtopics hierarchy structure concepts",
        RevisionType.summary: "overview summary key points all topics",
        RevisionType.exam_notes: "common questions misconceptions important topics exam",
    }
    query = type_queries.get(body.revision_type, "key concepts definitions summary")
    retrieved = rag_svc.retrieve(doc_id=body.doc_id, query=query, top_k=10)
    context = rag_svc.build_context(retrieved, max_chars=4500)

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
        revision_type=body.revision_type,
        learner_level=level_label,
    )

    try:
        raw = watsonx_svc.generate(prompt=prompt, max_tokens=2048, temperature=0.3)
    except Exception as exc:
        logger.error(f"[revision] Generation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI generation service unavailable.",
        )

    data = _parse_revision_output(raw)

    sections: List[StudyNotesSection] = [
        StudyNotesSection(heading=s.get("heading", ""), content=s.get("content", ""))
        for s in data.get("sections", [])
        if isinstance(s, dict)
    ]

    return RevisionResponse(
        doc_id=body.doc_id,
        revision_type=body.revision_type,
        title=data.get("title", f"Revision – {body.revision_type.value.replace('_', ' ').title()}"),
        content=data.get("content", raw.strip()),
        sections=sections,
    )


# ── Parser ─────────────────────────────────────────────────────────────────────

def _parse_revision_output(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        logger.warning(f"[revision] No JSON found. Using raw output as content.")
        return {"title": "Revision Sheet", "content": raw.strip(), "sections": []}
    try:
        return json.loads(match.group())
    except json.JSONDecodeError as exc:
        logger.warning(f"[revision] JSON decode error: {exc}")
        return {"title": "Revision Sheet", "content": raw.strip(), "sections": []}
