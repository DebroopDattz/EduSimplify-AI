"""
EduSimplify AI – Study notes & simplify router.

POST /study/notes
    Generate richly structured study notes from a document.

POST /simplify
    Perform one of six cognitive transformations on a user-supplied text:
    explain / simplify / analogy / example / mathematical / intuitive.
"""

from __future__ import annotations

import json
import re

from fastapi import APIRouter, HTTPException, Request, status
from loguru import logger

from app.models.schemas import (
    LearnerLevel,
    SimplifyRequest,
    SimplifyResponse,
    StudyNotesRequest,
    StudyNotesResponse,
    StudyNotesSection,
    ActionType,
)

router = APIRouter()

# ── Helpers ────────────────────────────────────────────────────────────────────


def _watsonx(request: Request):
    return request.app.state.watsonx


def _rag(request: Request):
    return request.app.state.rag


# ── Prompt templates ───────────────────────────────────────────────────────────

_STUDY_NOTES_PROMPT = """\
<|begin_of_text|>
<|start_header_id|>system<|end_header_id|>
You are an expert academic tutor and curriculum designer for EduSimplify AI.
Your task is to produce comprehensive, well-structured study notes from the provided CONTEXT.
Learner level: {learner_level}.

STRICT RULE: Base EVERY piece of content exclusively on the CONTEXT provided.
Do not introduce information that is not present in the CONTEXT.

Return a single valid JSON object matching EXACTLY this schema (no extra keys, no markdown fences):
{{
  "title": "<string>",
  "overview": "<2-3 sentence overview of the topic>",
  "objectives": ["<learning objective>", ...],
  "definitions": {{"<term>": "<definition>", ...}},
  "key_concepts": [{{"heading": "<concept name>", "content": "<explanation>"}}],
  "examples": ["<worked example or illustration>"],
  "diagrams": ["<mermaid diagram string or empty list>"],
  "comparison_tables": ["<markdown table string>"],
  "common_mistakes": ["<mistake students typically make>"],
  "applications": ["<real-world application>"],
  "summary": "<concise paragraph summarising everything>",
  "revision_tips": ["<actionable study tip>"]
}}
<|eot_id|>
<|start_header_id|>user<|end_header_id|>
CONTEXT:
{context}

Generate the study notes JSON now.
<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
"""

_SIMPLIFY_PROMPTS: dict[ActionType, str] = {
    ActionType.explain: (
        "Explain the following text clearly for a {level} learner. "
        "Break it down step-by-step in plain language.\n\nTEXT:\n{text}"
    ),
    ActionType.simplify: (
        "Simplify the following text for a {level} learner. "
        "Use simpler words and shorter sentences. Preserve all key information.\n\nTEXT:\n{text}"
    ),
    ActionType.analogy: (
        "Create a vivid, memorable analogy that explains the following concept "
        "to a {level} learner. Start with 'This is like …'.\n\nTEXT:\n{text}"
    ),
    ActionType.example: (
        "Provide 2-3 concrete, real-world examples that illustrate the following concept "
        "for a {level} learner. Be specific and relatable.\n\nTEXT:\n{text}"
    ),
    ActionType.mathematical: (
        "Provide a rigorous mathematical treatment of the following concept "
        "appropriate for a {level} learner. Include equations, derivations or proofs as needed.\n\nTEXT:\n{text}"
    ),
    ActionType.intuitive: (
        "Give an intuitive, first-principles explanation of the following concept "
        "for a {level} learner. Focus on building gut-level understanding before formalism.\n\nTEXT:\n{text}"
    ),
}

_LEVEL_LABELS: dict[LearnerLevel, str] = {
    LearnerLevel.beginner: "beginner (Grade 6–8)",
    LearnerLevel.intermediate: "intermediate (undergraduate)",
    LearnerLevel.advanced: "advanced (postgraduate)",
    LearnerLevel.expert: "expert (specialist)",
}


# ── Routes ─────────────────────────────────────────────────────────────────────


@router.post(
    "/study/notes",
    response_model=StudyNotesResponse,
    summary="Generate structured study notes",
)
async def generate_study_notes(body: StudyNotesRequest, request: Request) -> StudyNotesResponse:
    """
    Generate richly structured study notes from a document stored in RAG.

    The LLM is instructed to produce valid JSON that is parsed and returned as
    a typed ``StudyNotesResponse``.  A best-effort fallback is applied if the
    model output is malformed JSON.
    """
    rag_svc = _rag(request)
    watsonx_svc = _watsonx(request)

    # Retrieve broad context – use a generic query to get the most informative chunks.
    query = f"overview key concepts definitions summary {body.subject or ''}".strip()
    retrieved = rag_svc.retrieve(doc_id=body.doc_id, query=query, top_k=8)
    context = rag_svc.build_context(retrieved, max_chars=4000)

    if context == "No relevant context found in the document.":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No content found for document '{body.doc_id}'. Ensure the document was processed.",
        )

    level_label = _LEVEL_LABELS.get(body.learner_level, "intermediate (undergraduate)")
    prompt = _STUDY_NOTES_PROMPT.format(learner_level=level_label, context=context)

    try:
        raw = watsonx_svc.generate(prompt=prompt, max_tokens=2048, temperature=0.4)
    except Exception as exc:
        logger.error(f"[study/notes] Generation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI generation service unavailable.",
        )

    # ── Parse JSON from model output ───────────────────────────────────────────
    data = _parse_json_output(raw)

    key_concepts = [
        StudyNotesSection(heading=kc.get("heading", ""), content=kc.get("content", ""))
        for kc in data.get("key_concepts", [])
        if isinstance(kc, dict)
    ]

    return StudyNotesResponse(
        doc_id=body.doc_id,
        title=data.get("title", "Study Notes"),
        overview=data.get("overview", ""),
        objectives=data.get("objectives", []),
        definitions=data.get("definitions", {}),
        key_concepts=key_concepts,
        examples=data.get("examples", []),
        diagrams=data.get("diagrams", []),
        comparison_tables=data.get("comparison_tables", []),
        common_mistakes=data.get("common_mistakes", []),
        applications=data.get("applications", []),
        summary=data.get("summary", ""),
        revision_tips=data.get("revision_tips", []),
    )


@router.post("/simplify", response_model=SimplifyResponse, summary="Simplify or transform text")
async def simplify_text(body: SimplifyRequest, request: Request) -> SimplifyResponse:
    """
    Apply one of six cognitive transformations to the supplied text.

    If a ``doc_id`` is provided, the RAG context is appended to ground the
    transformation in the document's terminology.
    """
    watsonx_svc = _watsonx(request)
    rag_svc = _rag(request)

    level_label = _LEVEL_LABELS.get(body.learner_level, "intermediate (undergraduate)")
    template = _SIMPLIFY_PROMPTS[body.action]
    user_content = template.format(level=level_label, text=body.text)

    # Optional RAG enrichment
    extra_context = ""
    if body.doc_id:
        try:
            retrieved = rag_svc.retrieve(doc_id=body.doc_id, query=body.text, top_k=3)
            extra_context = rag_svc.build_context(retrieved, max_chars=1500)
        except Exception:
            pass  # RAG enrichment is best-effort

    if extra_context and extra_context != "No relevant context found in the document.":
        user_content += f"\n\nAdditional document context:\n{extra_context}"

    prompt = (
        "<|begin_of_text|>"
        "<|start_header_id|>system<|end_header_id|>\n"
        "You are EduSimplify AI, an expert educational assistant. "
        "Answer precisely as instructed. Do not add preamble or meta-commentary."
        "<|eot_id|>"
        f"<|start_header_id|>user<|end_header_id|>\n{user_content}<|eot_id|>"
        "<|start_header_id|>assistant<|end_header_id|>"
    )

    try:
        result = watsonx_svc.generate(prompt=prompt, max_tokens=1024, temperature=0.5)
    except Exception as exc:
        logger.error(f"[simplify] Generation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI generation service unavailable.",
        )

    return SimplifyResponse(
        original_text=body.text,
        simplified_text=result.strip(),
        action=body.action,
        learner_level=body.learner_level,
    )


# ── Private helpers ────────────────────────────────────────────────────────────

def _parse_json_output(raw: str) -> dict:
    """
    Extract and parse the first JSON object from the model's raw output.

    Falls back to an empty dict on failure so that the endpoint can still
    return a partial response.
    """
    # Strip any markdown code fences
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Find the first JSON object
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        logger.warning("[study/notes] No JSON object found in model output.")
        return {}
    try:
        return json.loads(match.group())
    except json.JSONDecodeError as exc:
        logger.warning(f"[study/notes] JSON parse error: {exc}. Raw snippet: {cleaned[:200]}")
        return {}
