"""
EduSimplify AI – Revision sheet generation agent.

Produces five types of revision artefacts:
- formula_sheet  – all equations/formulas with variable definitions
- cheat_sheet    – ultra-compact critical facts
- mind_map       – hierarchical Mermaid mindmap + narrative
- summary        – comprehensive 400-600 word narrative
- exam_notes     – exam-prep with pitfalls, recall prompts, likely topics
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict

from loguru import logger


# ── Revision type prompting blueprints ────────────────────────────────────────

_REVISION_BLUEPRINTS: Dict[str, str] = {
    "formula_sheet": (
        "Extract and list ALL equations, formulas, laws, and mathematical "
        "relationships present in the context. For each formula:\n"
        "- State the formula clearly\n"
        "- Define every symbol/variable\n"
        "- State the conditions under which it applies\n"
        "- Include SI units where relevant\n"
        "Group formulas by sub-topic. Use LaTeX notation for equations."
    ),
    "cheat_sheet": (
        "Create an ultra-concise one-page cheat sheet containing ONLY the most "
        "critical information a student must not forget:\n"
        "- Top 10 key definitions (term: 1-line definition)\n"
        "- Top 5 rules or principles\n"
        "- Critical formulas (no derivations)\n"
        "- Common gotchas / tricky points\n"
        "- Must-remember facts\n"
        "Be EXTREMELY brief. Every word must count."
    ),
    "mind_map": (
        "Create a comprehensive mind map of the topic:\n"
        "1. Provide a Mermaid mindmap diagram (use 'mindmap' syntax).\n"
        "   Root should be the main topic. Branch into subtopics and leaf details.\n"
        "2. After the diagram, provide a textual description of each branch.\n"
        "Format:\n```mermaid\nmindmap\n  root((Main Topic))\n  …\n```\n"
        "Then the textual description."
    ),
    "summary": (
        "Write a comprehensive, well-structured summary covering ALL major "
        "content in the context. Requirements:\n"
        "- Start with a 2-sentence overview\n"
        "- Cover each major concept with 2-4 sentences\n"
        "- Include key relationships and dependencies between concepts\n"
        "- End with a 2-sentence conclusion\n"
        "Target length: 400-600 words. Use clear section headings."
    ),
    "exam_notes": (
        "Create targeted exam preparation notes:\n"
        "1. HIGH PROBABILITY TOPICS: List topics most likely to appear in exams\n"
        "2. QUESTION PATTERNS: Common question types for this subject\n"
        "3. MUST-MEMORISE: Facts, definitions, formulas that MUST be known verbatim\n"
        "4. COMMON MISTAKES: What students typically get wrong\n"
        "5. QUICK RECALL PROMPTS: Mnemonics or memory hooks for each major concept\n"
        "6. LAST-MINUTE CHECKLIST: 5-10 bullet points for the night before the exam"
    ),
}

_REVISION_SYSTEM_TEMPLATE = """\
You are an expert revision material creator for EduSimplify AI.
LEARNER LEVEL: {level}
REVISION TYPE: {revision_type}

YOUR TASK:
{blueprint}

STRICT RULES:
1. Base ALL content ONLY on the provided CONTEXT. No hallucination.
2. Return a valid JSON object with exactly these keys (no extras, no markdown fences):
   {{
     "title": "<descriptive title>",
     "content": "<full formatted content as markdown string>",
     "sections": [
       {{"heading": "<section heading>", "content": "<section content>"}}
     ]
   }}

CONTEXT:
{context}
"""


class RevisionAgent:
    """
    Agent that generates structured revision artefacts from document content.

    Args:
        watsonx_service: Initialised WatsonxService.
        rag_service:     Initialised RAGService.
    """

    def __init__(self, watsonx_service, rag_service) -> None:
        self._watsonx = watsonx_service
        self._rag = rag_service

    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a revision artefact.

        Expected payload keys:
        - ``doc_id``          (str) – Document to draw content from.
        - ``revision_type``   (str) – formula_sheet | cheat_sheet | mind_map | summary | exam_notes
        - ``learner_level``   (str) – beginner | intermediate | advanced | expert

        Returns:
            Dict with keys: ``title``, ``content``, ``sections``.
        """
        doc_id: str = payload["doc_id"]
        revision_type: str = payload.get("revision_type", "summary")
        level: str = payload.get("learner_level", "intermediate")

        # Choose retrieval query based on revision type
        type_queries: Dict[str, str] = {
            "formula_sheet": "equations formulas mathematical relationships constants variables",
            "cheat_sheet": "key definitions rules important facts quick reference",
            "mind_map": "main topics structure hierarchy subtopics overview",
            "summary": "overview all topics key points concepts processes",
            "exam_notes": "important topics common mistakes tricky points must know",
        }
        query = type_queries.get(revision_type, "key concepts overview")
        retrieved = self._rag.retrieve(doc_id=doc_id, query=query, top_k=10)
        context = self._rag.build_context(retrieved, max_chars=4500)

        blueprint = _REVISION_BLUEPRINTS.get(revision_type, _REVISION_BLUEPRINTS["summary"])
        system = _REVISION_SYSTEM_TEMPLATE.format(
            level=level,
            revision_type=revision_type.replace("_", " ").title(),
            blueprint=blueprint,
            context=context,
        )

        prompt = (
            "<|begin_of_text|>"
            f"<|start_header_id|>system<|end_header_id|>\n{system}<|eot_id|>"
            "<|start_header_id|>user<|end_header_id|>\n"
            f"Generate the {revision_type.replace('_', ' ')} revision material now. "
            "Return ONLY the JSON object."
            "<|eot_id|>"
            "<|start_header_id|>assistant<|end_header_id|>"
        )

        raw = self._watsonx.generate(prompt=prompt, max_tokens=2048, temperature=0.3)
        data = _parse_revision(raw)
        logger.info(f"[RevisionAgent] {revision_type} generated for doc_id={doc_id}.")
        return data


# ── Parser ─────────────────────────────────────────────────────────────────────

def _parse_revision(raw: str) -> Dict[str, Any]:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return {"title": "Revision Sheet", "content": raw.strip(), "sections": []}
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return {"title": "Revision Sheet", "content": raw.strip(), "sections": []}
