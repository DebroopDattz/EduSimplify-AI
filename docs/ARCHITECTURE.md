# EduSimplify AI – Architecture Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Descriptions](#component-descriptions)
4. [RAG Pipeline](#rag-pipeline)
5. [IBM Services Integration](#ibm-services-integration)
6. [Data Flow](#data-flow)
7. [Security Model](#security-model)
8. [Scalability Notes](#scalability-notes)

---

## System Overview

EduSimplify AI is a **Retrieval-Augmented Generation (RAG)** application composed of two independently deployable services:

| Service | Technology | Host |
|---|---|---|
| **Frontend** | Next.js 14 (React + Tailwind CSS) | Vercel Edge Network |
| **Backend** | FastAPI + Uvicorn (Python 3.11) | Render Web Service |

These services are stateless at the application layer. All persistent state is delegated to managed IBM Cloud services and a Redis cache, making horizontal scaling straightforward.

---

## Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════════╗
║                            INTERNET / USERS                             ║
╚══════════════════════════════════════╤═════════════════════════════════╝
                                       │ HTTPS / TLS 1.3
               ┌───────────────────────▼───────────────────────┐
               │            Vercel Edge Network                 │
               │  ┌─────────────────────────────────────────┐  │
               │  │         Next.js 14 Frontend             │  │
               │  │  • React Server + Client Components     │  │
               │  │  • Tailwind CSS + shadcn/ui             │  │
               │  │  • IBM App ID SDK (OIDC client)         │  │
               │  └─────────────────┬───────────────────────┘  │
               └─────────────────────┼─────────────────────────┘
                                     │ REST / JSON (JWT in header)
               ┌─────────────────────▼─────────────────────────┐
               │          Render Web Service (Oregon)           │
               │  ┌─────────────────────────────────────────┐  │
               │  │         FastAPI + Uvicorn               │  │
               │  │  • 4 worker processes                   │  │
               │  │  • /upload  /chat  /quiz  /health       │  │
               │  │  • IBM App ID JWT validation middleware  │  │
               │  └──────┬──────────────────────┬───────────┘  │
               │         │                      │               │
               │  ┌──────▼──────┐      ┌────────▼────────┐     │
               │  │   Redis 7   │      │   ChromaDB      │     │
               │  │  (session   │      │  (vector store, │     │
               │  │   cache)    │      │   persistent)   │     │
               │  └─────────────┘      └─────────────────┘     │
               └──────────┬──────────────────────────────────-─┘
                          │ IBM Cloud APIs (mTLS)
        ┌─────────────────┼──────────────────────────┐
        │                 │                          │
┌───────▼──────┐  ┌───────▼──────┐  ┌───────────────▼──────┐
│ watsonx.ai   │  │  Cloud       │  │  IBM Cloudant        │
│              │  │  Object      │  │  (NoSQL)             │
│  • Granite   │  │  Storage     │  │                      │
│    13B Chat  │  │              │  │  • chat sessions     │
│  • Slate 30M │  │  • raw PDFs  │  │  • quiz scores       │
│    Embedder  │  │  • per-user  │  │  • user preferences  │
└──────────────┘  │    folders   │  └──────────────────────┘
                  └──────────────┘
        │
┌───────▼──────────────┐
│  IBM App ID          │
│  • OAuth 2.0 / OIDC  │
│  • User registry     │
│  • Token introspect  │
└──────────────────────┘
```

---

## Component Descriptions

### Frontend (Next.js 14)

| Module | Responsibility |
|---|---|
| `app/(auth)/` | OAuth 2.0 login / callback pages, IBM App ID PKCE flow |
| `app/dashboard/` | Document list, upload widget, recent sessions |
| `app/chat/[docId]/` | Real-time chat interface with markdown rendering |
| `app/quiz/[docId]/` | Quiz interface — question display, answer selection, score |
| `components/ui/` | shadcn/ui primitives (Button, Card, Dialog, etc.) |
| `lib/api.ts` | Typed Axios client pointing to the backend |
| `lib/auth.ts` | IBM App ID token management (storage, refresh, expiry) |

### Backend (FastAPI)

| Module | Responsibility |
|---|---|
| `main.py` | FastAPI app factory, middleware registration, router mounting |
| `app/routers/upload.py` | Multipart upload → COS → RAG pipeline trigger |
| `app/routers/chat.py` | Query → retrieval → LLM → streamed response |
| `app/routers/quiz.py` | Topic + difficulty → retrieval → structured quiz generation |
| `app/services/rag_service.py` | Document chunking, embedding, ChromaDB upsert & retrieval |
| `app/services/watsonx_service.py` | watsonx.ai REST calls (inference + embeddings) |
| `app/services/cos_service.py` | IBM COS S3-compatible upload / download / delete |
| `app/services/cloudant_service.py` | Session CRUD against IBM Cloudant |
| `app/utils/auth.py` | JWT verification using IBM App ID JWKS endpoint |
| `app/utils/helpers.py` | Pure utility functions (see [`helpers.py`](../backend/app/utils/helpers.py)) |

---

## RAG Pipeline

The Retrieval-Augmented Generation pipeline has two phases: **indexing** (at upload time) and **retrieval** (at query time).

### Phase 1 — Indexing (Upload)

```
User uploads PDF
       │
       ▼
1. Validate MIME type and file size (≤ 50 MB)
       │
       ▼
2. Store raw PDF in IBM Cloud Object Storage
   Key: {user_id}/{doc_id}/{sanitized_filename}
       │
       ▼
3. Extract text with pdfplumber (page-aware)
       │
       ▼
4. Split into overlapping chunks
   chunk_size = 1,000 tokens | overlap = 200 tokens
       │
       ▼
5. Embed each chunk via watsonx.ai
   Model: ibm/slate-30m-english-rtrvr
   Output: 384-dimensional dense vector
       │
       ▼
6. Upsert (chunk_text, embedding, metadata) into ChromaDB
   Collection: edusimplify_docs
   Metadata: { doc_id, user_id, page_number, chunk_index }
       │
       ▼
7. Return { doc_id, filename, chunks } to frontend
```

### Phase 2 — Retrieval (Chat / Quiz)

```
User sends query + doc_id
       │
       ▼
1. Check Redis cache (key: SHA256(doc_id + query))
   └── Cache hit  → return cached answer immediately
   └── Cache miss → continue
       │
       ▼
2. Embed query with ibm/slate-30m-english-rtrvr
       │
       ▼
3. ChromaDB similarity search
   Filter: { doc_id: <doc_id>, user_id: <user_id> }
   top_k = 5 most relevant chunks
       │
       ▼
4. Build prompt:
   [system prompt]  ← build_system_prompt(level, language)
   [retrieved chunks as context]
   [chat history]   ← last 10 turns
   [user query]
       │
       ▼
5. Inference via watsonx.ai
   Model: ibm/granite-13b-chat-v2
   Parameters: max_new_tokens=512, temperature=0.3
       │
       ▼
6. Store answer in Redis (TTL = 3600 s)
       │
       ▼
7. Persist session to IBM Cloudant
       │
       ▼
8. Return { answer, sources, session_id }
```

---

## IBM Services Integration

### watsonx.ai

- **Endpoint:** `POST /ml/v1/text/generation` and `POST /ml/v1/text/embeddings`
- **Authentication:** IAM API key → short-lived bearer token (refreshed every 55 minutes, cached in Redis)
- **Rate limiting:** Handled by exponential back-off in `watsonx_service.py`

### Cloud Object Storage (COS)

- **Protocol:** S3-compatible REST API via `ibm-cos-sdk-python`
- **Bucket structure:** `edusimplify-documents/{user_id}/{doc_id}/{filename}`
- **Access:** HMAC credentials scoped to a single bucket via IAM service policy

### IBM Cloudant

- **Protocol:** HTTPS REST (CouchDB-compatible)
- **Documents stored:** Chat sessions (`type: session`), quiz results (`type: quiz_result`), user preferences (`type: preference`)
- **Indexes:** `user_id` + `created_at` compound index for session listing

### IBM App ID

- **Flow:** PKCE Authorization Code (frontend) + JWT introspection (backend middleware)
- **JWKS caching:** Public keys fetched once at startup and rotated on 401 upstream
- **Scopes used:** `openid`, `profile`, `email`

---

## Data Flow

### Upload flow (sequence)

```
Frontend          Backend           COS          ChromaDB      Cloudant
   │                  │               │               │            │
   │──POST /upload──▶ │               │               │            │
   │                  │──store PDF──▶ │               │            │
   │                  │◀─────────────-│               │            │
   │                  │──embed+upsert──────────────▶  │            │
   │                  │◀───────────────────────────── │            │
   │◀─{ doc_id }──────│               │               │            │
```

### Chat flow (sequence)

```
Frontend          Backend        Redis         ChromaDB     watsonx.ai
   │                  │            │               │              │
   │──POST /chat────▶ │            │               │              │
   │                  │──cache?──▶ │               │              │
   │                  │◀─miss──────│               │              │
   │                  │──search────────────────▶   │              │
   │                  │◀─chunks────────────────────│              │
   │                  │──generate──────────────────────────────▶  │
   │                  │◀─answer────────────────────────────────── │
   │                  │──set cache▶│               │              │
   │◀─{ answer }──────│            │               │              │
```

---

## Security Model

| Control | Implementation |
|---|---|
| Transport security | TLS 1.3 enforced at Vercel and Render |
| Authentication | IBM App ID OIDC / PKCE; JWTs validated on every request |
| Authorisation | `user_id` embedded in JWT; ChromaDB & COS queries always scoped to `user_id` |
| Secret management | All secrets in environment variables; never in code or Docker images |
| Container security | Non-root `appuser:appgroup` inside Docker image |
| HTTP security headers | `X-Frame-Options`, `X-Content-Type-Options`, `CSP`, `HSTS` set in `vercel.json` |
| Input validation | Pydantic v2 models on all request bodies; file MIME + size validation on upload |

---

## Scalability Notes

- **Stateless backend:** Any number of Uvicorn workers or Render instances can run in parallel; all shared state lives in Redis / ChromaDB / Cloudant.
- **ChromaDB persistence:** Mounted as a Docker volume (local) or Render persistent disk (cloud). For very large deployments, replace with a managed vector DB (e.g. Pinecone, Weaviate).
- **Redis:** Used as LRU cache and optional Celery broker for background tasks (e.g. async document processing). Render's managed Redis or Upstash both work.
- **Horizontal scaling:** Set `--workers N` in the Uvicorn start command on Render to add CPU-bound parallelism without code changes.
