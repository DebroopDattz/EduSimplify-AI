"""
EduSimplify AI – Progress, history, and feedback router.

GET  /progress              – Return learning progress metrics for a user
POST /progress/update       – Record a learning event (quiz complete, etc.)
GET  /history               – Paginated upload/study history
POST /feedback              – Submit user feedback for a feature
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, status
from loguru import logger

from app.models.schemas import (
    FeedbackRequest,
    HistoryEntry,
    HistoryResponse,
    ProcessingStatus,
    ProgressResponse,
    ProgressUpdateRequest,
    UserProgress,
)

router = APIRouter()

# ── Helpers ────────────────────────────────────────────────────────────────────


def _cloudant(request: Request):
    return request.app.state.cloudant


# ── GET /progress ──────────────────────────────────────────────────────────────


@router.get("/progress", response_model=ProgressResponse, summary="Get user learning progress")
async def get_progress(
    request: Request,
    user_id: str = Query(..., description="User identifier."),
) -> ProgressResponse:
    """
    Return aggregated learning progress metrics for the specified user.

    Pulls the progress document from Cloudant (or returns zeroed defaults
    if no record exists yet).
    """
    cloudant_svc = _cloudant(request)

    progress_id = f"progress_{user_id}"
    doc = cloudant_svc.get_document(doc_id=progress_id)

    if doc is None:
        # Return zeroed progress for a new user
        return ProgressResponse(
            user_id=user_id,
            progress=UserProgress(user_id=user_id),
            recent_documents=[],
            achievements=[],
        )

    progress = UserProgress(
        user_id=user_id,
        documents_uploaded=doc.get("documents_uploaded", 0),
        quizzes_taken=doc.get("quizzes_taken", 0),
        flashcards_reviewed=doc.get("flashcards_reviewed", 0),
        study_sessions=doc.get("study_sessions", 0),
        average_quiz_score=doc.get("average_quiz_score", 0.0),
        last_active=_parse_dt(doc.get("last_active")),
        topics_covered=doc.get("topics_covered", []),
    )

    return ProgressResponse(
        user_id=user_id,
        progress=progress,
        recent_documents=doc.get("recent_documents", []),
        achievements=_compute_achievements(progress),
    )


# ── POST /progress/update ──────────────────────────────────────────────────────


@router.post("/progress/update", summary="Update learning progress")
async def update_progress(body: ProgressUpdateRequest, request: Request) -> dict:
    """
    Record a learning event for a user and update their aggregate metrics.

    Recognised events:
    - ``document_uploaded``   – increments ``documents_uploaded``
    - ``quiz_completed``      – increments ``quizzes_taken``; optionally records score
    - ``flashcard_reviewed``  – increments ``flashcards_reviewed``
    - ``study_session``       – increments ``study_sessions``
    - ``topic_studied``       – appends to ``topics_covered``
    """
    cloudant_svc = _cloudant(request)
    progress_id = f"progress_{body.user_id}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Load or initialise
    doc = cloudant_svc.get_document(doc_id=progress_id)
    if doc is None:
        doc = {
            "_id": progress_id,
            "type": "progress",
            "user_id": body.user_id,
            "documents_uploaded": 0,
            "quizzes_taken": 0,
            "flashcards_reviewed": 0,
            "study_sessions": 0,
            "average_quiz_score": 0.0,
            "topics_covered": [],
            "recent_documents": [],
            "last_active": now_iso,
        }

    # Apply the event
    event = body.event
    meta = body.metadata

    if event == "document_uploaded":
        doc["documents_uploaded"] = doc.get("documents_uploaded", 0) + 1
        recent = doc.get("recent_documents", [])
        recent.insert(0, {
            "doc_id": meta.get("doc_id", ""),
            "filename": meta.get("filename", ""),
            "uploaded_at": now_iso,
        })
        doc["recent_documents"] = recent[:20]  # keep last 20

    elif event == "quiz_completed":
        doc["quizzes_taken"] = doc.get("quizzes_taken", 0) + 1
        score = float(meta.get("score", 0))
        taken = doc["quizzes_taken"]
        prev_avg = doc.get("average_quiz_score", 0.0)
        doc["average_quiz_score"] = ((prev_avg * (taken - 1)) + score) / taken

    elif event == "flashcard_reviewed":
        doc["flashcards_reviewed"] = doc.get("flashcards_reviewed", 0) + int(meta.get("count", 1))

    elif event == "study_session":
        doc["study_sessions"] = doc.get("study_sessions", 0) + 1

    elif event == "topic_studied":
        topic = meta.get("topic", "")
        if topic and topic not in doc.get("topics_covered", []):
            topics = doc.get("topics_covered", [])
            topics.append(topic)
            doc["topics_covered"] = topics

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown event type: '{event}'.",
        )

    doc["last_active"] = now_iso

    # Upsert to Cloudant
    try:
        if "_rev" in doc:
            cloudant_svc.update_document(doc_id=progress_id, updates=doc)
        else:
            cloudant_svc.create_document(doc=doc)
    except Exception as exc:
        logger.error(f"[progress/update] Cloudant write failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not persist progress update.",
        )

    return {"status": "updated", "event": event, "user_id": body.user_id}


# ── GET /history ───────────────────────────────────────────────────────────────


@router.get("/history", response_model=HistoryResponse, summary="Get upload/study history")
async def get_history(
    request: Request,
    user_id: str = Query(..., description="User identifier."),
    limit: int = Query(default=20, ge=1, le=100, description="Max results to return."),
    skip: int = Query(default=0, ge=0, description="Number of results to skip (pagination)."),
) -> HistoryResponse:
    """
    Return a paginated list of documents the user has uploaded and processed.
    """
    cloudant_svc = _cloudant(request)

    try:
        docs = cloudant_svc.query_documents(
            selector={"user_id": {"$eq": user_id}, "type": {"$eq": "document"}},
            fields=["_id", "filename", "uploaded_at", "status", "subject", "tags"],
            limit=limit + skip,  # Fetch enough to skip
        )
    except Exception as exc:
        logger.error(f"[history] Cloudant query failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="History service temporarily unavailable.",
        )

    paginated = docs[skip:skip + limit]

    entries = [
        HistoryEntry(
            doc_id=d.get("_id", ""),
            filename=d.get("filename", ""),
            uploaded_at=_parse_dt(d.get("uploaded_at")) or datetime.now(timezone.utc),
            status=ProcessingStatus(d.get("status", ProcessingStatus.completed.value)),
            subject=d.get("subject"),
            tags=d.get("tags", []),
        )
        for d in paginated
    ]

    return HistoryResponse(user_id=user_id, total=len(docs), entries=entries)


# ── POST /feedback ─────────────────────────────────────────────────────────────


@router.post("/feedback", status_code=status.HTTP_201_CREATED, summary="Submit user feedback")
async def submit_feedback(body: FeedbackRequest, request: Request) -> dict:
    """
    Persist user feedback for a feature to Cloudant.

    Feedback is stored in the ``feedback`` logical collection alongside the
    main ``edusimplify`` database.
    """
    cloudant_svc = _cloudant(request)

    feedback_doc = {
        "type": "feedback",
        "user_id": body.user_id,
        "doc_id": body.doc_id,
        "feature": body.feature,
        "rating": body.rating,
        "comment": body.comment,
        "submitted_at": body.submitted_at.isoformat(),
    }

    try:
        result = cloudant_svc.create_document(doc=feedback_doc)
    except Exception as exc:
        logger.error(f"[feedback] Cloudant write failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Feedback service temporarily unavailable.",
        )

    return {"status": "received", "feedback_id": result.get("id", "")}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    """Safely parse an ISO 8601 datetime string, returning None on failure."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def _compute_achievements(progress: UserProgress) -> list[str]:
    """
    Derive achievement badge labels from raw progress metrics.

    Returns a list of human-readable achievement strings.
    """
    achievements: list[str] = []
    if progress.documents_uploaded >= 1:
        achievements.append("First Upload 📄")
    if progress.documents_uploaded >= 10:
        achievements.append("Prolific Reader 📚")
    if progress.quizzes_taken >= 5:
        achievements.append("Quiz Explorer 🎯")
    if progress.quizzes_taken >= 20:
        achievements.append("Quiz Champion 🏆")
    if progress.average_quiz_score >= 80.0:
        achievements.append("High Scorer ⭐")
    if progress.flashcards_reviewed >= 50:
        achievements.append("Flashcard Fanatic 🃏")
    if progress.study_sessions >= 10:
        achievements.append("Dedicated Learner 🎓")
    if len(progress.topics_covered) >= 5:
        achievements.append("Multidisciplinary Scholar 🌐")
    return achievements
