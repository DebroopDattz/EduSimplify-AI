"""
EduSimplify AI – FastAPI application entry point.

Bootstraps all routers, middleware, exception handlers, and the application
lifespan (startup / shutdown logic).  Import order is intentional: config and
logging are set up before any application code is imported so that every
subsequent import can already use the logger.
"""

from __future__ import annotations

import sys
import traceback
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.config import get_settings

# ─── Logging setup ────────────────────────────────────────────────────────────

logger.remove()  # Remove default handler
logger.add(
    sys.stdout,
    format=(
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> – "
        "<level>{message}</level>"
    ),
    level="INFO",
    colorize=True,
    enqueue=True,
)
logger.add(
    "logs/edusimplify.log",
    rotation="50 MB",
    retention="14 days",
    compression="gz",
    level="DEBUG",
    enqueue=True,
)

# ─── Lifespan ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown."""
    settings = get_settings()
    logger.info("EduSimplify AI backend starting up …")
    logger.info(f"Environment: WatsonX URL = {settings.watsonx_url}")

    # Services are initialised lazily on first request — this allows the server
    # to start without valid IBM credentials (useful for local dev / demo mode).
    from app.services.cos_service import COSService
    from app.services.cloudant_service import CloudantService
    from app.services.watsonx_service import WatsonxService
    from app.services.rag_service import RAGService

    app.state.cos = COSService(lazy=True)
    app.state.cloudant = CloudantService(lazy=True)
    app.state.watsonx = WatsonxService(lazy=True)
    app.state.rag = RAGService()
    logger.info("Service stubs registered — connections will be established on first use.")

    yield  # ── application runs here ──────────────────────────────────────────

    logger.info("EduSimplify AI backend shutting down …")


# ─── Application factory ──────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="EduSimplify AI",
        description=(
            "An AI-powered educational platform that simplifies complex topics, "
            "generates quizzes, flashcards, revision sheets, and provides "
            "multilingual explanations – powered by IBM watsonx.ai."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    allowed_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ────────────────────────────────────────────────────

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        logger.warning(f"HTTP {exc.status_code} on {request.url.path}: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail, "path": request.url.path},
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(f"Unhandled exception on {request.url.path}: {exc}")
        logger.debug(traceback.format_exc())
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "An unexpected error occurred. Please try again later.",
                "path": request.url.path,
            },
        )

    # ── Health check ──────────────────────────────────────────────────────────

    @app.get("/health", tags=["Health"], summary="Health check")
    async def health_check() -> dict:
        """Return service liveness status."""
        return {"status": "healthy", "service": "EduSimplify AI"}

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon() -> dict:
        """Silence browser favicon requests."""
        from fastapi.responses import Response
        return Response(status_code=204)

    # ── Routers ───────────────────────────────────────────────────────────────
    from app.routers import upload, chat, study, quiz, flashcards, revision, translate, progress

    app.include_router(upload.router, prefix="/upload", tags=["Upload"])
    app.include_router(chat.router, prefix="/chat", tags=["Chat"])
    app.include_router(study.router, tags=["Study"])          # /study/notes + /simplify
    app.include_router(quiz.router, prefix="/quiz", tags=["Quiz"])
    app.include_router(flashcards.router, prefix="/flashcards", tags=["Flashcards"])
    app.include_router(revision.router, prefix="/revision", tags=["Revision"])
    app.include_router(translate.router, prefix="/translate", tags=["Translation"])
    app.include_router(progress.router, tags=["Progress"])    # /progress + /history + /feedback

    logger.info("All routers mounted successfully.")
    return app


app = create_app()

# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
