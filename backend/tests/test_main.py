"""
EduSimplify AI – Backend API Tests
===================================
Run with:  pytest tests/ -v
"""

import io
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# App import – adjust path if main.py is not at backend root
# ---------------------------------------------------------------------------
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app  # noqa: E402  (imported after sys.path manipulation)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

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

    @patch("app.services.cos_service.upload_to_cos")
    @patch("app.services.rag_service.process_document")
    @patch("app.utils.auth.verify_token")
    def test_upload_pdf_success(
        self,
        mock_verify_token,
        mock_process_doc,
        mock_cos_upload,
        client,
        sample_pdf_bytes,
        auth_headers,
    ):
        """POST /upload must return 200 with doc_id when a valid PDF is provided."""
        # Arrange
        mock_verify_token.return_value = {"sub": "user_123", "email": "test@example.com"}
        mock_cos_upload.return_value = "cos://edusimplify-documents/user_123/doc_abc.pdf"
        mock_process_doc.return_value = {"doc_id": "doc_abc", "chunks": 12}

        pdf_file = io.BytesIO(sample_pdf_bytes)

        # Act
        response = client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("lecture_notes.pdf", pdf_file, "application/pdf")},
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "doc_id" in data
        assert data["doc_id"] == "doc_abc"

    @patch("app.utils.auth.verify_token")
    def test_upload_rejects_non_pdf(self, mock_verify_token, client, auth_headers):
        """POST /upload must return 400/422 when a non-PDF file is uploaded."""
        mock_verify_token.return_value = {"sub": "user_123"}
        txt_file = io.BytesIO(b"hello world")

        response = client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("notes.txt", txt_file, "text/plain")},
        )

        assert response.status_code in (400, 422)

    def test_upload_requires_authentication(self, client, sample_pdf_bytes):
        """POST /upload must return 401 when no Authorization header is provided."""
        pdf_file = io.BytesIO(sample_pdf_bytes)
        response = client.post(
            "/upload",
            files={"file": ("notes.pdf", pdf_file, "application/pdf")},
        )
        assert response.status_code == 401

    @patch("app.services.cos_service.upload_to_cos")
    @patch("app.services.rag_service.process_document")
    @patch("app.utils.auth.verify_token")
    def test_upload_returns_chunk_count(
        self,
        mock_verify_token,
        mock_process_doc,
        mock_cos_upload,
        client,
        sample_pdf_bytes,
        auth_headers,
    ):
        """Response body should include how many chunks were indexed."""
        mock_verify_token.return_value = {"sub": "user_123"}
        mock_cos_upload.return_value = "cos://bucket/doc.pdf"
        mock_process_doc.return_value = {"doc_id": "doc_xyz", "chunks": 7}

        response = client.post(
            "/upload",
            headers=auth_headers,
            files={"file": ("doc.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        )

        assert response.status_code == 200
        assert response.json().get("chunks") == 7


# ---------------------------------------------------------------------------
# Chat endpoint
# ---------------------------------------------------------------------------

class TestChatEndpoint:

    @patch("app.services.rag_service.retrieve_context")
    @patch("app.services.watsonx_service.generate_response")
    @patch("app.utils.auth.verify_token")
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
        mock_retrieve.return_value = ["Context chunk 1.", "Context chunk 2."]
        mock_generate.return_value = "Photosynthesis is the process by which plants make food."

        payload = {
            "doc_id": "doc_abc",
            "message": "What is photosynthesis?",
            "learner_level": "beginner",
            "language": "English",
            "history": [],
        }

        response = client.post("/chat", headers=auth_headers, json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert len(data["answer"]) > 0

    @patch("app.utils.auth.verify_token")
    def test_chat_validates_empty_message(self, mock_verify_token, client, auth_headers):
        """POST /chat must return 422 when 'message' is empty."""
        mock_verify_token.return_value = {"sub": "user_123"}

        payload = {
            "doc_id": "doc_abc",
            "message": "",
            "learner_level": "beginner",
            "language": "English",
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
            "language": "English",
            "history": [],
        }
        response = client.post("/chat", json=payload)
        assert response.status_code == 401

    @patch("app.services.rag_service.retrieve_context")
    @patch("app.services.watsonx_service.generate_response")
    @patch("app.utils.auth.verify_token")
    def test_chat_includes_sources(
        self, mock_verify_token, mock_generate, mock_retrieve, client, auth_headers
    ):
        """Response should include source context chunks when available."""
        mock_verify_token.return_value = {"sub": "user_123"}
        mock_retrieve.return_value = ["Relevant passage from page 3."]
        mock_generate.return_value = "Newton's first law states that an object at rest stays at rest."

        payload = {
            "doc_id": "doc_abc",
            "message": "Explain Newton's first law.",
            "learner_level": "intermediate",
            "language": "English",
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

    @patch("app.services.rag_service.retrieve_context")
    @patch("app.services.watsonx_service.generate_quiz")
    @patch("app.utils.auth.verify_token")
    def test_quiz_returns_questions(
        self, mock_verify_token, mock_generate_quiz, mock_retrieve, client, auth_headers
    ):
        """POST /quiz must return a list of questions."""
        mock_verify_token.return_value = {"sub": "user_123"}
        mock_retrieve.return_value = ["Content about mitosis and meiosis."]
        mock_generate_quiz.return_value = [
            {
                "question": "What is the result of meiosis?",
                "options": ["2 diploid cells", "4 haploid cells", "2 haploid cells", "4 diploid cells"],
                "correct_index": 1,
                "explanation": "Meiosis produces 4 genetically unique haploid daughter cells.",
            }
        ]

        payload = {
            "doc_id": "doc_abc",
            "topic": "cell division",
            "num_questions": 1,
            "difficulty": "medium",
        }

        response = client.post("/quiz", headers=auth_headers, json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "questions" in data
        assert isinstance(data["questions"], list)
        assert len(data["questions"]) >= 1

    @patch("app.services.rag_service.retrieve_context")
    @patch("app.services.watsonx_service.generate_quiz")
    @patch("app.utils.auth.verify_token")
    def test_quiz_question_has_required_fields(
        self, mock_verify_token, mock_generate_quiz, mock_retrieve, client, auth_headers
    ):
        """Each quiz question must have 'question', 'options', and 'correct_index'."""
        mock_verify_token.return_value = {"sub": "user_123"}
        mock_retrieve.return_value = ["Some context."]
        mock_generate_quiz.return_value = [
            {
                "question": "Sample question?",
                "options": ["A", "B", "C", "D"],
                "correct_index": 0,
                "explanation": "A is correct.",
            }
        ]

        payload = {"doc_id": "doc_abc", "topic": "general", "num_questions": 1, "difficulty": "easy"}
        response = client.post("/quiz", headers=auth_headers, json=payload)

        assert response.status_code == 200
        question = response.json()["questions"][0]
        assert "question" in question
        assert "options" in question
        assert "correct_index" in question

    @patch("app.utils.auth.verify_token")
    def test_quiz_rejects_out_of_range_num_questions(self, mock_verify_token, client, auth_headers):
        """POST /quiz should return 422 when num_questions > allowed maximum."""
        mock_verify_token.return_value = {"sub": "user_123"}

        payload = {
            "doc_id": "doc_abc",
            "topic": "physics",
            "num_questions": 999,
            "difficulty": "hard",
        }
        response = client.post("/quiz", headers=auth_headers, json=payload)
        assert response.status_code == 422

    def test_quiz_requires_authentication(self, client):
        """POST /quiz must return 401 without an Authorization header."""
        payload = {"doc_id": "doc_abc", "topic": "chemistry", "num_questions": 5, "difficulty": "medium"}
        response = client.post("/quiz", json=payload)
        assert response.status_code == 401
