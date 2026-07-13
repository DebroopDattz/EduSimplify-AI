# EduSimplify AI – API Reference

Base URL (production): `https://edusimplify-backend.onrender.com`  
Base URL (local dev):  `http://localhost:8000`  
Interactive docs:       `{base_url}/docs` (Swagger UI) | `{base_url}/redoc` (ReDoc)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Codes](#error-codes)
3. [Endpoints](#endpoints)
   - [GET /health](#get-health)
   - [POST /upload](#post-upload)
   - [POST /chat](#post-chat)
   - [POST /quiz](#post-quiz)
   - [GET /documents](#get-documents)
   - [DELETE /documents/{doc\_id}](#delete-documentsdoc_id)
   - [GET /sessions](#get-sessions)
   - [DELETE /sessions/{session\_id}](#delete-sessionssession_id)

---

## Authentication

All endpoints except `GET /health` require a valid **Bearer JWT** issued by IBM App ID.

```
Authorization: Bearer <access_token>
```

The frontend obtains the token via the IBM App ID PKCE OAuth 2.0 flow. Tokens expire after 60 minutes; the frontend SDK refreshes them silently using the refresh token.

The backend validates the JWT against IBM App ID's JWKS endpoint on every request. Expired or tampered tokens receive `401 Unauthorized`.

---

## Error Codes

| HTTP Status | Code String | Meaning |
|---|---|---|
| `400` | `invalid_file_type` | Uploaded file is not a PDF |
| `400` | `file_too_large` | File exceeds the 50 MB limit |
| `400` | `doc_not_found` | `doc_id` does not exist for this user |
| `400` | `empty_message` | Chat message body is empty |
| `401` | `unauthorized` | Missing, expired, or invalid JWT |
| `403` | `forbidden` | Token valid but user lacks permission for this resource |
| `404` | `not_found` | Requested resource does not exist |
| `422` | `validation_error` | Request body failed Pydantic validation |
| `429` | `rate_limited` | Too many requests; retry after `Retry-After` seconds |
| `500` | `internal_error` | Unexpected server-side error |
| `503` | `upstream_unavailable` | watsonx.ai or another IBM service is unreachable |

**Error response shape (all 4xx / 5xx):**

```json
{
  "error": {
    "code": "doc_not_found",
    "message": "Document doc_abc does not exist for user user_123.",
    "request_id": "req_7f3a1b29c4"
  }
}
```

---

## Endpoints

---

### GET /health

Check whether the API and its dependencies are reachable.

**Authentication:** None required.

**Request:** No body.

**Response `200 OK`:**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-11-01T10:30:00Z",
  "dependencies": {
    "redis": "ok",
    "chromadb": "ok",
    "watsonx": "ok",
    "cloudant": "ok",
    "cos": "ok"
  }
}
```

**Response `503 Service Unavailable`** (when one or more dependencies are degraded):

```json
{
  "status": "degraded",
  "version": "1.0.0",
  "timestamp": "2024-11-01T10:30:00Z",
  "dependencies": {
    "redis": "ok",
    "chromadb": "ok",
    "watsonx": "unreachable",
    "cloudant": "ok",
    "cos": "ok"
  }
}
```

---

### POST /upload

Upload a PDF document. The backend stores the raw file in IBM COS, extracts and chunks its text, embeds each chunk, and upserts the vectors into ChromaDB.

**Authentication:** Required.

**Content-Type:** `multipart/form-data`

**Form fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `File` | ✅ | PDF file (max 50 MB, MIME: `application/pdf`) |

**Response `200 OK`:**

```json
{
  "doc_id": "a3f9c1e2b84d76f1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5",
  "filename": "lecture_notes_week3.pdf",
  "pages": 24,
  "chunks": 47,
  "cos_key": "user_123/a3f9c1e2.../lecture_notes_week3.pdf",
  "uploaded_at": "2024-11-01T10:31:05Z"
}
```

**Response `400 Bad Request`** (wrong file type):

```json
{
  "error": {
    "code": "invalid_file_type",
    "message": "Only PDF files are accepted. Received MIME type: text/plain.",
    "request_id": "req_abc123"
  }
}
```

**Response `400 Bad Request`** (file too large):

```json
{
  "error": {
    "code": "file_too_large",
    "message": "File size 62.3 MB exceeds the maximum allowed 50.0 MB.",
    "request_id": "req_def456"
  }
}
```

---

### POST /chat

Send a question about a previously uploaded document. The backend retrieves the most relevant chunks via vector search and generates a grounded answer using IBM Granite.

**Authentication:** Required.

**Content-Type:** `application/json`

**Request body:**

```json
{
  "doc_id": "a3f9c1e2b84d76f1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5",
  "message": "What is the difference between mitosis and meiosis?",
  "learner_level": "beginner",
  "language": "English",
  "session_id": "sess_xyz789",
  "history": [
    { "role": "user",      "content": "What does DNA stand for?" },
    { "role": "assistant", "content": "DNA stands for Deoxyribonucleic Acid." }
  ]
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `doc_id` | `string` | ✅ | — | ID returned by `/upload` |
| `message` | `string` | ✅ | — | User's question (non-empty) |
| `learner_level` | `enum` | ❌ | `"intermediate"` | `"beginner"` \| `"intermediate"` \| `"advanced"` |
| `language` | `string` | ❌ | `"English"` | Response language (e.g. `"Hindi"`) |
| `session_id` | `string` | ❌ | auto-generated | Continues an existing session |
| `history` | `array` | ❌ | `[]` | Prior turns (last 10 used) |

**Response `200 OK`:**

```json
{
  "answer": "Mitosis produces two genetically identical daughter cells, while meiosis produces four genetically unique haploid cells used for reproduction.",
  "session_id": "sess_xyz789",
  "sources": [
    {
      "chunk_index": 12,
      "page_number": 7,
      "text": "Mitosis is a type of cell division resulting in two daughter cells..."
    },
    {
      "chunk_index": 15,
      "page_number": 8,
      "text": "Meiosis is a special type of cell division that reduces the chromosome number..."
    }
  ],
  "tokens_used": 348,
  "cached": false
}
```

**Response `400 Bad Request`** (doc not found):

```json
{
  "error": {
    "code": "doc_not_found",
    "message": "Document a3f9c1e2... does not exist for user user_123.",
    "request_id": "req_ghi789"
  }
}
```

---

### POST /quiz

Generate a multiple-choice quiz on a given topic from a previously uploaded document.

**Authentication:** Required.

**Content-Type:** `application/json`

**Request body:**

```json
{
  "doc_id": "a3f9c1e2b84d76f1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5",
  "topic": "cell division",
  "num_questions": 5,
  "difficulty": "medium"
}
```

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `doc_id` | `string` | ✅ | — | Must exist for this user |
| `topic` | `string` | ✅ | — | Non-empty, ≤ 200 chars |
| `num_questions` | `integer` | ❌ | `5` | 1–20 (inclusive) |
| `difficulty` | `enum` | ❌ | `"medium"` | `"easy"` \| `"medium"` \| `"hard"` |

**Response `200 OK`:**

```json
{
  "quiz_id": "quiz_a1b2c3d4",
  "doc_id": "a3f9c1e2...",
  "topic": "cell division",
  "difficulty": "medium",
  "questions": [
    {
      "question_index": 0,
      "question": "How many daughter cells does mitosis produce?",
      "options": ["1", "2", "3", "4"],
      "correct_index": 1,
      "explanation": "Mitosis always results in exactly two genetically identical daughter cells."
    },
    {
      "question_index": 1,
      "question": "Which phase of mitosis is characterised by chromosomes aligning at the cell equator?",
      "options": ["Prophase", "Anaphase", "Metaphase", "Telophase"],
      "correct_index": 2,
      "explanation": "During metaphase, chromosomes align along the metaphase plate at the cell's equatorial plane."
    }
  ],
  "generated_at": "2024-11-01T10:45:00Z"
}
```

---

### GET /documents

List all documents uploaded by the authenticated user.

**Authentication:** Required.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | `integer` | `20` | Max results to return (1–100) |
| `offset` | `integer` | `0` | Pagination offset |

**Response `200 OK`:**

```json
{
  "total": 3,
  "limit": 20,
  "offset": 0,
  "documents": [
    {
      "doc_id": "a3f9c1e2...",
      "filename": "lecture_notes_week3.pdf",
      "pages": 24,
      "chunks": 47,
      "uploaded_at": "2024-11-01T10:31:05Z"
    },
    {
      "doc_id": "b4e8d2f1...",
      "filename": "thermodynamics_textbook.pdf",
      "pages": 312,
      "chunks": 602,
      "uploaded_at": "2024-10-28T14:22:10Z"
    }
  ]
}
```

---

### DELETE /documents/{doc\_id}

Delete a document, its vectors from ChromaDB, and its raw file from IBM COS.

**Authentication:** Required. User must own the document.

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `doc_id` | `string` | Document ID returned by `/upload` |

**Response `200 OK`:**

```json
{
  "deleted": true,
  "doc_id": "a3f9c1e2...",
  "chunks_removed": 47
}
```

**Response `404 Not Found`:**

```json
{
  "error": {
    "code": "not_found",
    "message": "Document a3f9c1e2... not found.",
    "request_id": "req_jkl012"
  }
}
```

---

### GET /sessions

Retrieve the authenticated user's past chat sessions, most recent first.

**Authentication:** Required.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `doc_id` | `string` | — | Filter by document (optional) |
| `limit` | `integer` | `20` | Max results (1–100) |
| `offset` | `integer` | `0` | Pagination offset |

**Response `200 OK`:**

```json
{
  "total": 2,
  "sessions": [
    {
      "session_id": "sess_xyz789",
      "doc_id": "a3f9c1e2...",
      "doc_filename": "lecture_notes_week3.pdf",
      "message_count": 8,
      "created_at": "2024-11-01T10:32:00Z",
      "updated_at": "2024-11-01T10:50:11Z"
    }
  ]
}
```

---

### DELETE /sessions/{session\_id}

Permanently delete a chat session and its message history from IBM Cloudant.

**Authentication:** Required. User must own the session.

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `session_id` | `string` | Session ID from `/chat` response or `/sessions` list |

**Response `200 OK`:**

```json
{
  "deleted": true,
  "session_id": "sess_xyz789"
}
```
