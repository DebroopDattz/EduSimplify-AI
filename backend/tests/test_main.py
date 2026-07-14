"""
EduSimplify AI – Backend API Tests
===================================
Run with:  pytest tests/ -v
"""

import io
import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# App import
# ---------------------------------------------------------------------------
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app  # noqa: E402

# Set dummy App ID configuration to force authentication requirement in tests
os.environ["APP_ID_TENANT_ID"] = "test-tenant-id"


@pytest.fixture(scope="module")
def client():
    """Synchronous test client for non-async tests."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def sample_pdf_bytes():
    """Minimal valid PDF bytes (header only – sufficient for size/MIME tests)."""
    return b"%PDF-1.4\n%EOF"


@pytest.fixture
def auth_headers():
    """
    Returns a fake Authorization header.
    Real token validation is mocked per-test via patch().
    """
    return {"Authorization": "Bearer test_jwt_token"}


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

class TestHealthEndpoint:

    def test_health_returns_200(self, client):
        """GET /health must return HTTP 200."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_shape(self, client):
        """Response must contain 'status' key set to 'ok'."""
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"

    def test_health_contains_version(self, client):
        """Response should include an application version field."""
        response = client.get("/health")
        data = response.json()
        assert "version" in data

    def test_health_no_auth_required(self, client):
        """Health endpoint must not require authentication."""
        response = client.get("/health")
        assert response.status_code != 401
        assert response.status_code != 403


# ---------------------------------------------------------------------------
# Upload endpoint
# ---------------------------------------------------------------------------

class TestUploadEndpoint:

    @patch("app.routers.upload.extract_text_from_pdf")
    @patch("app.services.cos_service.COSService.upload_file")
    @patch("app.services.rag_service.RAGService.embed_and_store")
    @patch("app.middleware.auth.AppIDTokenVerifier.verify")
    def test_upload_pdf_success(
        self,
        mock_verify_token,
        mock_embed_store,
        mock_cos_upload,
        mock_extract_pdf,
        client,
        sample_pdf_bytes,
        auth_headers,
    ):
        """POST /upload must return 202/200 with doc_id when a valid PDF is provided."""
        # Arrange
        mock_verify_token.return_value = {"sub": "user_123", "email": "test@example.com"}
        mock_cos_upload.return_value = "cos://edusimplify-documents/user_123/doc_abc.pdf"
        mock_embed_store.return_value = 12
        mock_extract_pdf.return_value = "This is a mock PDF text content for cell division."

        pdf_file = io.BytesIO(sample_pdf_bytes)

        # Act
        response = client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("lecture_notes.pdf", pdf_file, "application/pdf")},
            data={"user_id": "user_123", "subject": "Math", "tags": "geometry"}
        )

        # Assert
        assert response.status_code in (200, 202)
        data = response.json()
        assert "doc_id" in data

    @patch("app.middleware.auth.AppIDTokenVerifier.verify")
    def test_upload_rejects_non_pdf(self, mock_verify_token, client, auth_headers):
        """POST /upload must return 400/422 when a non-PDF file is uploaded."""
        mock_verify_token.return_value = {"sub": "user_123"}
        txt_file = io.BytesIO(b"hello world")

        response = client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("notes.txt", txt_file, "text/plain")},
            data={"user_id": "user_123"}
        )

        assert response.status_code in (400, 415, 422)

    def test_upload_requires_authentication(self, client, sample_pdf_bytes):
        """POST /upload must return 401 when no Authorization header is provided."""
        pdf_file = io.BytesIO(sample_pdf_bytes)
        response = client.post(
            "/upload",
            files={"file": ("notes.pdf", pdf_file, "application/pdf")},
            data={"user_id": "user_123"}
        )
        assert response.status_code == 401

    @patch("app.routers.upload.extract_text_from_pdf")
    @patch("app.services.cos_service.COSService.upload_file")
    @patch("app.services.rag_service.RAGService.embed_and_store")
    @patch("app.middleware.auth.AppIDTokenVerifier.verify")
    def test_upload_returns_chunk_count(
        self,
        mock_verify_token,
        mock_embed_store,
        mock_cos_upload,
        mock_extract_pdf,
        client,
        sample_pdf_bytes,
        auth_headers,
    ):
        """Response body should include how many chunks were indexed."""
        mock_verify_token.return_value = {"sub": "user_123"}
        mock_cos_upload.return_value = "cos://bucket/doc.pdf"
        mock_embed_store.return_value = 7
        mock_extract_pdf.return_value = "This is a mock PDF text content for cell division."

        response = client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("doc.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
            data={"user_id": "user_123"}
        )

        assert response.status_code in (200, 202)
        assert "7 text chunks indexed" in response.json().get("message", "")


# ---------------------------------------------------------------------------
# Chat endpoint
# ---------------------------------------------------------------------------

class TestChatEndpoint:

    @patch("app.services.rag_service.RAGService.retrieve")
    @patch("app.services.watsonx_service.WatsonxService.generate")
    @patch("app.middleware.auth.AppIDTokenVerifier.verify")
    def test_chat_returns_answer(
        self,
        mock_verify_token,
        mock_generate,
        mock_retrieve,
        client,
        auth_headers,
    ):
        """POST /chat must return a non-empty answer string."""
        mock_verify_token.return_value = {"sub": "user_123"}
        mock_retrieve.return_value = [{"text": "Context chunk 1."}, {"text": "Context chunk 2."}]
        mock_generate.return_value = "Photosynthesis is the process by which plants make food."

        payload = {
            "doc_id": "doc_abc",
            "message": "What is photosynthesis?",
            "learner_level": "beginner",
            "history": [],
        }

        response = client.post("/chat", headers=auth_headers, json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0

    @patch("app.middleware.auth.AppIDTokenVerifier.verify")
    def test_chat_validates_empty_message(self, mock_verify_token, client, auth_headers):
        """POST /chat must return 422 when 'message' is empty."""
        mock_verify_token.return_value = {"sub": "user_123"}

        payload = {
            "doc_id": "doc_abc",
            "message": "",
            "learner_level": "beginner",
            "history": [],
        }

        response = client.post("/chat", headers=auth_headers, json=payload)
        assert response.status_code == 422

    def test_chat_requires_authentication(self, client):
        """POST /chat must return 401 without an Authorization header."""
        payload = {
            "doc_id": "doc_abc",
            "message": "Tell me about Newton's laws.",
            "learner_level": "intermediate",
            "history": [],
        }
        response = client.post("/chat", json=payload)
        assert response.status_code == 401

    @patch("app.services.rag_service.RAGService.retrieve")
    @patch("app.services.watsonx_service.WatsonxService.generate")
    @patch("app.middleware.auth.AppIDTokenVerifier.verify")
    def test_chat_includes_sources(
        self, mock_verify_token, mock_generate, mock_retrieve, client, auth_headers
    ):
        """Response should include source context chunks when available."""
        mock_verify_token.return_value = {"sub": "user_123"}
        mock_retrieve.return_value = [{"text": "Relevant passage from page 3."}]
        mock_generate.return_value = "Newton's first law states that an object at rest stays at rest."

        payload = {
            "doc_id": "doc_abc",
            "message": "Explain Newton's first law.",
            "learner_level": "intermediate",
            "history": [],
        }

        response = client.post("/chat", headers=auth_headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "sources" in data


# ---------------------------------------------------------------------------
# Quiz endpoint
# ---------------------------------------------------------------------------

class TestQuizEndpoint:

    @patch("app.services.rag_service.RAGService.retrieve")
    @patch("app.services.watsonx_service.WatsonxService.generate")
    @patch("app.middleware.auth.AppIDTokenVerifier.verify")
    def test_quiz_returns_questions(
        self, mock_verify_token, mock_generate, mock_retrieve, client, auth_headers
    ):
        """POST /quiz must return a list of questions."""
        mock_verify_token.return_value = {"sub": "user_123"}
        mock_retrieve.return_value = [{"text": "Content about mitosis and meiosis."}]
        mock_generate.return_value = json.dumps([
            {
                "question_number": 1,
                "question": "What is the result of meiosis?",
                "quiz_type": "mcq",
                "difficulty": "medium",
                "options": [
                    {"key": "A", "text": "2 diploid cells"},
                    {"key": "B", "text": "4 haploid cells"},
                    {"key": "C", "text": "2 haploid cells"},
                    {"key": "D", "text": "4 diploid cells"}
                ],
                "correct_answer": "B",
                "explanation": "Meiosis produces 4 genetically unique haploid daughter cells.",
                "topic": "cell division"
            }
        ])

        payload = {
            "doc_id": "doc_abc",
            "topic_filter": "cell division",
            "num_questions": 1,
            "difficulty": "medium",
            "quiz_type": "mcq",
            "learner_level": "intermediate"
        }

        response = client.post("/quiz", headers=auth_headers, json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "questions" in data
        assert isinstance(data["questions"], list)
        assert len(data["questions"]) >= 1

    @patch("app.services.rag_service.RAGService.retrieve")
    @patch("app.services.watsonx_service.WatsonxService.generate")
    @patch("app.middleware.auth.AppIDTokenVerifier.verify")
    def test_quiz_question_has_required_fields(
        self, mock_verify_token, mock_generate, mock_retrieve, client, auth_headers
    ):
        """Each quiz question must have 'question', 'options', and 'correct_answer'."""
        mock_verify_token.return_value = {"sub": "user_123"}
        mock_retrieve.return_value = [{"text": "Some context."}]
        mock_generate.return_value = json.dumps([
            {
                "question_number": 1,
                "question": "Sample question?",
                "quiz_type": "mcq",
                "difficulty": "easy",
                "options": [{"key": "A", "text": "Option A"}, {"key": "B", "text": "Option B"}],
                "correct_answer": "A",
                "explanation": "A is correct.",
                "topic": "general"
            }
        ])

        payload = {
            "doc_id": "doc_abc",
            "topic_filter": "general",
            "num_questions": 1,
            "difficulty": "easy",
            "quiz_type": "mcq",
            "learner_level": "intermediate"
        }
        response = client.post("/quiz", headers=auth_headers, json=payload)

        assert response.status_code == 200
        question = response.json()["questions"][0]
        assert "question" in question
        assert "options" in question
        assert "correct_answer" in question

    @patch("app.middleware.auth.AppIDTokenVerifier.verify")
    def test_quiz_rejects_out_of_range_num_questions(self, mock_verify_token, client, auth_headers):
        """POST /quiz should return 422 when num_questions > allowed maximum."""
        mock_verify_token.return_value = {"sub": "user_123"}

        payload = {
            "doc_id": "doc_abc",
            "topic_filter": "physics",
            "num_questions": 999,
            "difficulty": "hard",
            "quiz_type": "mcq",
            "learner_level": "intermediate"
        }
        response = client.post("/quiz", headers=auth_headers, json=payload)
        assert response.status_code == 422

    def test_quiz_requires_authentication(self, client):
        """POST /quiz must return 401 without an Authorization header."""
        payload = {
            "doc_id": "doc_abc",
            "topic_filter": "chemistry",
            "num_questions": 5,
            "difficulty": "medium",
            "quiz_type": "mcq",
            "learner_level": "intermediate"
        }
        response = client.post("/quiz", json=payload)
        assert response.status_code == 401
