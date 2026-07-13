"""
EduSimplify AI – Orchestrator agent.

The OrchestratorAgent acts as the central dispatcher.  Each incoming task
type is routed to the appropriate specialist agent.  The orchestrator handles
all error propagation and returns a normalised response envelope.
"""

from __future__ import annotations

from typing import Any, Dict

from loguru import logger

from app.agents.study_agent import StudyAgent
from app.agents.quiz_agent import QuizAgent
from app.agents.flashcard_agent import FlashcardAgent
from app.agents.revision_agent import RevisionAgent
from app.agents.translation_agent import TranslationAgent


# ── Task type constants ────────────────────────────────────────────────────────

TASK_PDF_ANALYSIS = "pdf_analysis"
TASK_CONCEPT_SIMPLIFICATION = "concept_simplification"
TASK_STUDY_NOTES = "study_notes"
TASK_QUIZ_GENERATION = "quiz_generation"
TASK_FLASHCARD_GENERATION = "flashcard_generation"
TASK_REVISION_SHEET = "revision_sheet"
TASK_TRANSLATION = "translation"
TASK_LEARNING_PROGRESS = "learning_progress"

ALL_TASKS = [
    TASK_PDF_ANALYSIS,
    TASK_CONCEPT_SIMPLIFICATION,
    TASK_STUDY_NOTES,
    TASK_QUIZ_GENERATION,
    TASK_FLASHCARD_GENERATION,
    TASK_REVISION_SHEET,
    TASK_TRANSLATION,
    TASK_LEARNING_PROGRESS,
]


class OrchestratorAgent:
    """
    Central routing agent for EduSimplify AI.

    Specialist agents are instantiated lazily on first use and cached on the
    orchestrator instance, avoiding repeated SDK initialisation.

    Usage::

        orchestrator = OrchestratorAgent(watsonx_service, rag_service)
        result = await orchestrator.route("quiz_generation", payload)
    """

    def __init__(self, watsonx_service, rag_service) -> None:
        """
        Args:
            watsonx_service: An initialised :class:`~app.services.watsonx_service.WatsonxService`.
            rag_service:     An initialised :class:`~app.services.rag_service.RAGService`.
        """
        self._watsonx = watsonx_service
        self._rag = rag_service

        # Lazily created agent instances
        self._agents: Dict[str, Any] = {}

    # ── Agent factory ──────────────────────────────────────────────────────────

    def _get_agent(self, task_type: str):
        """Return the cached (or newly created) agent for *task_type*."""
        if task_type in self._agents:
            return self._agents[task_type]

        if task_type in (TASK_PDF_ANALYSIS, TASK_CONCEPT_SIMPLIFICATION, TASK_STUDY_NOTES):
            agent = StudyAgent(watsonx_service=self._watsonx, rag_service=self._rag)
        elif task_type == TASK_QUIZ_GENERATION:
            agent = QuizAgent(watsonx_service=self._watsonx, rag_service=self._rag)
        elif task_type == TASK_FLASHCARD_GENERATION:
            agent = FlashcardAgent(watsonx_service=self._watsonx, rag_service=self._rag)
        elif task_type == TASK_REVISION_SHEET:
            agent = RevisionAgent(watsonx_service=self._watsonx, rag_service=self._rag)
        elif task_type == TASK_TRANSLATION:
            agent = TranslationAgent(watsonx_service=self._watsonx)
        elif task_type == TASK_LEARNING_PROGRESS:
            # Progress tasks are handled entirely in the router; return None
            return None
        else:
            raise ValueError(f"Unknown task type: '{task_type}'. Valid types: {ALL_TASKS}")

        self._agents[task_type] = agent
        return agent

    # ── Public interface ───────────────────────────────────────────────────────

    async def route(self, task_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Route a task to the appropriate specialist agent and return its output.

        Args:
            task_type: One of the ``TASK_*`` constants defined in this module.
            payload:   Arbitrary dict containing the task parameters.  Each
                       agent documents its expected keys.

        Returns:
            A dict containing at minimum ``{"task_type": …, "result": …}``.

        Raises:
            ValueError: For unknown task types.
            RuntimeError: If the agent raises an unhandled exception.
        """
        logger.info(f"[Orchestrator] Routing task: '{task_type}'.")

        agent = self._get_agent(task_type)
        if agent is None:
            logger.info(f"[Orchestrator] Task '{task_type}' is handled by the router layer.")
            return {"task_type": task_type, "result": None, "message": "Handled by router."}

        try:
            result = await agent.run(payload)
            logger.info(f"[Orchestrator] Task '{task_type}' completed successfully.")
            return {"task_type": task_type, "result": result}
        except Exception as exc:
            logger.error(f"[Orchestrator] Task '{task_type}' failed: {exc}")
            raise RuntimeError(f"Agent execution failed for task '{task_type}': {exc}") from exc

    def list_tasks(self) -> list[str]:
        """Return all valid task type identifiers."""
        return ALL_TASKS
