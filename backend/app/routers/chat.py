"""
EduSimplify AI – Chat router.

POST /chat
    Retrieve RAG context for the user's query and generate a grounded
    conversational response using Meta Llama 3 70B Instruct.

POST /chat/stream
    Streaming variant – tokens are pushed via Server-Sent Events.
"""

from __future__ import annotations

from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from loguru import logger

from app.models.schemas import ChatRequest, ChatResponse, LearnerLevel
from app.middleware.auth import require_auth

router = APIRouter()

# ── Helpers ────────────────────────────────────────────────────────────────────

def _watsonx(request: Request):
    return request.app.state.watsonx


def _rag(request: Request):
    return request.app.state.rag


def _cloudant(request: Request):
    return request.app.state.cloudant


# ── System prompt template ─────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are EduSimplify AI, an expert educational assistant.
Your role is to help students understand concepts clearly.

STRICT RULE: You MUST answer ONLY from the provided CONTEXT below.
If the answer cannot be found in the CONTEXT, respond:
"I couldn't find information about that in the provided document. Please ask about something covered in the material."

Adapt your language and depth to the learner level: {learner_level}.
- beginner: simple vocabulary, relatable analogies, avoid jargon.
- intermediate: some technical terms with brief explanations.
- advanced: technical depth, assume foundational knowledge.
- expert: peer-level discussion, full technical precision.

CONTEXT:
{context}
"""

_LEVEL_LABELS: dict[LearnerLevel, str] = {
    LearnerLevel.beginner: "beginner (Grade 6–8 level)",
    LearnerLevel.intermediate: "intermediate (undergraduate level)",
    LearnerLevel.advanced: "advanced (postgraduate / professional level)",
    LearnerLevel.expert: "expert (specialist / researcher level)",
}


def _build_prompt(system: str, history: list, user_message: str) -> str:
    """
    Construct a Llama-3 chat prompt from the system instruction, conversation
    history, and the latest user message.

    Llama 3 instruct format:
      <|begin_of_text|>
      <|start_header_id|>system<|end_header_id|>…<|eot_id|>
      <|start_header_id|>user<|end_header_id|>…<|eot_id|>
      <|start_header_id|>assistant<|end_header_id|>
    """
    parts = ["<|begin_of_text|>"]
    parts.append(f"<|start_header_id|>system<|end_header_id|>\n{system}<|eot_id|>")

    for turn in history:
        role = turn.role
        content = turn.content
        parts.append(f"<|start_header_id|>{role}<|end_header_id|>\n{content}<|eot_id|>")

    parts.append(f"<|start_header_id|>user<|end_header_id|>\n{user_message}<|eot_id|>")
    parts.append("<|start_header_id|>assistant<|end_header_id|>")
    return "\n".join(parts)


# ── Routes ─────────────────────────────────────────────────────────────────────


@router.post("", response_model=ChatResponse, summary="Chat with your document")
async def chat(body: ChatRequest, request: Request, user: dict = require_auth) -> ChatResponse:
    """
    Context-grounded Q&A chat.

    Steps:
    1. Retrieve the top-5 relevant chunks from ChromaDB for the user's message.
    2. Build a strict system prompt instructing the model to answer only from context.
    3. Generate a response with Meta Llama 3 70B.
    4. Return the answer with the source excerpts used.
    """
    rag_svc = _rag(request)
    watsonx_svc = _watsonx(request)

    # ── Retrieve context ───────────────────────────────────────────────────────
    retrieved = rag_svc.retrieve(doc_id=body.doc_id, query=body.message, top_k=5)
    context = rag_svc.build_context(retrieved, max_chars=3500)
    sources = [c["text"][:120] + "…" if len(c["text"]) > 120 else c["text"] for c in retrieved]

    # ── Build prompt ───────────────────────────────────────────────────────────
    level_label = _LEVEL_LABELS.get(body.learner_level, "intermediate")
    system = _SYSTEM_PROMPT.format(learner_level=level_label, context=context)
    prompt = _build_prompt(system=system, history=body.history, user_message=body.message)

    # ── Generate ───────────────────────────────────────────────────────────────
    try:
        response_text = watsonx_svc.generate(
            prompt=prompt,
            max_tokens=768,
            temperature=0.3,
        )
    except Exception as exc:
        logger.error(f"[chat] Generation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI generation service is temporarily unavailable.",
        )

    return ChatResponse(
        response=response_text.strip(),
        doc_id=body.doc_id,
        sources=sources,
    )


@router.post("/stream", summary="Streaming chat with your document")
async def chat_stream(body: ChatRequest, request: Request, user: dict = require_auth) -> StreamingResponse:
    """
    Server-Sent Events streaming variant of /chat.

    Tokens are emitted as they are generated; each event is a plain text
    ``data: <token>\\n\\n`` SSE frame.  A final ``data: [DONE]\\n\\n`` event
    marks the end of the stream.
    """
    rag_svc = _rag(request)
    watsonx_svc = _watsonx(request)

    retrieved = rag_svc.retrieve(doc_id=body.doc_id, query=body.message, top_k=5)
    context = rag_svc.build_context(retrieved, max_chars=3500)

    level_label = _LEVEL_LABELS.get(body.learner_level, "intermediate")
    system = _SYSTEM_PROMPT.format(learner_level=level_label, context=context)
    prompt = _build_prompt(system=system, history=body.history, user_message=body.message)

    async def _event_generator() -> AsyncGenerator[str, None]:
        try:
            async for token in watsonx_svc.generate_stream(prompt=prompt, max_tokens=768):
                # Escape any newlines inside a token to keep SSE framing valid.
                safe_token = token.replace("\n", "\\n")
                yield f"data: {safe_token}\n\n"
        except Exception as exc:
            logger.error(f"[chat/stream] Stream error: {exc}")
            yield f"data: [ERROR] {exc}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
