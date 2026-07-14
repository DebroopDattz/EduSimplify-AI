"""
EduSimplify AI – Upload router.

POST /upload
    Accept a PDF upload (multipart/form-data), validate its size, store it in
    IBM COS, extract and chunk its text, embed the chunks in ChromaDB, persist
    document metadata in Cloudant, then return the doc_id and status.

GET /upload/{doc_id}/status
    Poll the processing status of a previously uploaded document.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from loguru import logger

from app.models.schemas import ProcessingStatus, UploadResponse, UploadStatusResponse
from app.services.pdf_service import (
    chunk_document,
    clean_text,
    extract_text_from_pdf,
)

router = APIRouter()

# ── Constants ──────────────────────────────────────────────────────────────────
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _cos(request: Request):
    return request.app.state.cos


def _cloudant(request: Request):
    return request.app.state.cloudant


def _rag(request: Request):
    return request.app.state.rag


# ── Routes ─────────────────────────────────────────────────────────────────────


@router.post(
    "",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a PDF document",
)
async def upload_document(
    request: Request,
    file: UploadFile = File(..., description="PDF file to upload (max 50 MB)."),
    user_id: str = Form(..., description="ID of the uploading user."),
    subject: str = Form(default="", description="Subject or course name."),
    tags: str = Form(default="", description="Comma-separated tags."),
) -> UploadResponse:
    """
    Accept a PDF, validate it, process it through the full RAG pipeline, and
    persist all artefacts in IBM COS + Cloudant + ChromaDB.

    Processing steps:
    1. Validate MIME type and file size.
    2. Upload raw bytes to IBM COS.
    3. Extract text with pdfplumber.
    4. Clean and chunk the text.
    5. Generate embeddings and store in ChromaDB.
    6. Persist document metadata in Cloudant.

    Returns a ``202 Accepted`` response immediately containing ``doc_id`` and
    ``status=processing``.  The actual heavy work happens synchronously here
    (a task queue like Celery can be wired in without changing this contract).
    """
    # ── 1. Validate ────────────────────────────────────────────────────────────
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are supported.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds the 50 MB limit ({len(file_bytes) / 1024 / 1024:.1f} MB).",
        )
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # ── 2. Generate identifiers ────────────────────────────────────────────────
    doc_id = str(uuid.uuid4())
    cos_key = f"documents/{user_id}/{doc_id}/{file.filename}"
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    cos_svc = _cos(request)
    cloudant_svc = _cloudant(request)
    rag_svc = _rag(request)

    # ── 3. Upload to COS (Optional) ───────────────────────────────────────────
    try:
        if cos_svc._settings.ibm_cos_api_key:
            cos_svc.upload_file(
                key=cos_key,
                file_bytes=file_bytes,
                content_type="application/pdf",
            )
            logger.info(f"[upload] COS upload done – doc_id={doc_id}, key={cos_key}.")
        else:
            logger.warning(f"[upload] COS upload bypassed: no COS API Key configured.")
    except Exception as exc:
        logger.warning(f"[upload] COS upload failed (proceeding anyway): {exc}")

    # ── 4. Persist initial metadata in Cloudant ────────────────────────────────
    doc_meta = {
        "_id": doc_id,
        "type": "document",
        "user_id": user_id,
        "filename": file.filename,
        "cos_key": cos_key,
        "subject": subject,
        "tags": tag_list,
        "status": ProcessingStatus.processing.value,
        "num_chunks": 0,
        "error": None,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        cloudant_svc.create_document(doc=doc_meta)
        logger.info(f"[upload] Cloudant metadata created – doc_id={doc_id}.")
    except Exception as exc:
        logger.error(f"[upload] Cloudant create failed: {exc}")
        # Non-fatal for the user – we still proceed with processing.

    # ── 5. Extract, clean, chunk ───────────────────────────────────────────────
    try:
        raw_text = extract_text_from_pdf(file_bytes)
        clean = clean_text(raw_text)
        chunks = chunk_document(clean, chunk_size=500, overlap=50)
        logger.info(f"[upload] Text extracted: {len(clean):,} chars → {len(chunks)} chunks.")
    except Exception as exc:
        logger.error(f"[upload] PDF processing failed: {exc}")
        _mark_failed(cloudant_svc, doc_id, str(exc))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"PDF processing failed: {exc}",
        )

    # ── 6. Embed and store in ChromaDB ─────────────────────────────────────────
    try:
        num_stored = rag_svc.embed_and_store(doc_id=doc_id, chunks=chunks)
        logger.info(f"[upload] Embedded {num_stored} chunks for doc_id={doc_id}.")
    except Exception as exc:
        logger.error(f"[upload] Embedding failed: {exc}")
        _mark_failed(cloudant_svc, doc_id, str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding service unavailable. Please retry.",
        )

    # ── 7. Update Cloudant status → completed ──────────────────────────────────
    try:
        cloudant_svc.update_document(
            doc_id=doc_id,
            updates={
                "status": ProcessingStatus.completed.value,
                "num_chunks": num_stored,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            },
        )
    except Exception as exc:
        logger.warning(f"[upload] Could not update Cloudant status to completed: {exc}")

    return UploadResponse(
        doc_id=doc_id,
        filename=file.filename,
        status=ProcessingStatus.completed,
        message=f"Document processed successfully. {num_stored} text chunks indexed.",
        cos_key=cos_key,
    )


@router.get(
    "/{doc_id}/status",
    response_model=UploadStatusResponse,
    summary="Get document processing status",
)
async def get_upload_status(doc_id: str, request: Request) -> UploadStatusResponse:
    """
    Return the current processing status of a previously uploaded document.

    Args:
        doc_id: UUID returned by the upload endpoint.

    Returns:
        :class:`~app.models.schemas.UploadStatusResponse` with current status.
    """
    cloudant_svc = _cloudant(request)

    doc = cloudant_svc.get_document(doc_id=doc_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{doc_id}' not found.",
        )

    completed_at = doc.get("completed_at")
    return UploadStatusResponse(
        doc_id=doc_id,
        status=ProcessingStatus(doc.get("status", ProcessingStatus.processing.value)),
        filename=doc.get("filename"),
        num_chunks=doc.get("num_chunks"),
        error=doc.get("error"),
        completed_at=datetime.fromisoformat(completed_at) if completed_at else None,
    )


# ── Private helpers ────────────────────────────────────────────────────────────

def _mark_failed(cloudant_svc, doc_id: str, error: str) -> None:
    """Update Cloudant status to 'failed' with an error message."""
    try:
        cloudant_svc.update_document(
            doc_id=doc_id,
            updates={"status": ProcessingStatus.failed.value, "error": error},
        )
    except Exception as exc:
        logger.warning(f"Could not mark doc {doc_id} as failed in Cloudant: {exc}")
