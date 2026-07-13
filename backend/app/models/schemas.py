"""
EduSimplify AI – Pydantic schemas for all API request / response models.

Every model used across routers, agents and services is defined here so that
the entire surface area of the API is documented in one place and can be
imported without circular-dependency issues.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ─── Shared enumerations ──────────────────────────────────────────────────────


class LearnerLevel(str, Enum):
    """Academic / cognitive level of the target learner."""
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    expert = "expert"


class QuizType(str, Enum):
    mcq = "mcq"
    true_false = "true_false"
    short_answer = "short_answer"
    long_answer = "long_answer"


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class RevisionType(str, Enum):
    formula_sheet = "formula_sheet"
    cheat_sheet = "cheat_sheet"
    mind_map = "mind_map"
    summary = "summary"
    exam_notes = "exam_notes"


class ActionType(str, Enum):
    explain = "explain"
    simplify = "simplify"
    analogy = "analogy"
    example = "example"
    mathematical = "mathematical"
    intuitive = "intuitive"


class SupportedLanguage(str, Enum):
    english = "English"
    hindi = "Hindi"
    bengali = "Bengali"
    tamil = "Tamil"
    telugu = "Telugu"
    marathi = "Marathi"


class ProcessingStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


# ─── Upload ───────────────────────────────────────────────────────────────────


class UploadRequest(BaseModel):
    """Metadata accompanying a PDF upload (form-data fields)."""
    user_id: str = Field(..., description="Unique identifier of the uploading user.")
    subject: Optional[str] = Field(None, description="Subject or course name.")
    tags: Optional[List[str]] = Field(default_factory=list, description="Free-form tags.")


class UploadResponse(BaseModel):
    """Returned immediately after a file upload is accepted."""
    doc_id: str = Field(..., description="Unique document identifier (UUID).")
    filename: str
    status: ProcessingStatus
    message: str
    cos_key: Optional[str] = Field(None, description="COS object key.")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class UploadStatusResponse(BaseModel):
    """Returned by the status polling endpoint."""
    doc_id: str
    status: ProcessingStatus
    filename: Optional[str] = None
    num_chunks: Optional[int] = None
    error: Optional[str] = None
    completed_at: Optional[datetime] = None


# ─── Chat ─────────────────────────────────────────────────────────────────────


class ChatMessage(BaseModel):
    """A single turn in the conversation history."""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    """Request body for the /chat endpoint."""
    doc_id: str
    message: str = Field(..., min_length=1, max_length=4096)
    learner_level: LearnerLevel = LearnerLevel.intermediate
    history: List[ChatMessage] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    """Response from the /chat endpoint."""
    response: str
    doc_id: str
    sources: List[str] = Field(default_factory=list, description="Source chunk excerpts used.")
    model_used: str = "meta-llama/llama-3-70b-instruct"


# ─── Simplify ─────────────────────────────────────────────────────────────────


class SimplifyRequest(BaseModel):
    """Request body for the /simplify endpoint."""
    text: str = Field(..., min_length=1, max_length=8192)
    action: ActionType = ActionType.simplify
    learner_level: LearnerLevel = LearnerLevel.intermediate
    doc_id: Optional[str] = Field(None, description="Optional doc context for RAG enrichment.")


class SimplifyResponse(BaseModel):
    """Response from the /simplify endpoint."""
    original_text: str
    simplified_text: str
    action: ActionType
    learner_level: LearnerLevel


# ─── Study notes ──────────────────────────────────────────────────────────────


class StudyNotesRequest(BaseModel):
    """Request body for /study/notes."""
    doc_id: str
    learner_level: LearnerLevel = LearnerLevel.intermediate
    subject: Optional[str] = None


class StudyNotesSection(BaseModel):
    """A single section inside a study-notes document."""
    heading: str
    content: str


class StudyNotesResponse(BaseModel):
    """Structured study notes returned by the agent."""
    doc_id: str
    title: str
    overview: str
    objectives: List[str]
    definitions: Dict[str, str]
    key_concepts: List[StudyNotesSection]
    examples: List[str]
    diagrams: List[str] = Field(default_factory=list, description="Mermaid diagram strings.")
    comparison_tables: List[str] = Field(default_factory=list, description="Markdown tables.")
    common_mistakes: List[str]
    applications: List[str]
    summary: str
    revision_tips: List[str]
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Quiz ─────────────────────────────────────────────────────────────────────


class QuizOption(BaseModel):
    """A single answer option for an MCQ question."""
    key: str = Field(..., description="Option label, e.g. 'A', 'B', 'C', 'D'.")
    text: str


class QuizQuestion(BaseModel):
    """A single quiz question with metadata."""
    question_number: int
    question: str
    quiz_type: QuizType
    difficulty: Difficulty
    options: Optional[List[QuizOption]] = None       # MCQ only
    correct_answer: str
    explanation: str
    topic: Optional[str] = None


class QuizRequest(BaseModel):
    """Request body for /quiz."""
    doc_id: str
    quiz_type: QuizType = QuizType.mcq
    difficulty: Difficulty = Difficulty.medium
    num_questions: int = Field(default=10, ge=1, le=50)
    learner_level: LearnerLevel = LearnerLevel.intermediate
    topic_filter: Optional[str] = Field(None, description="Restrict questions to a sub-topic.")


class QuizResponse(BaseModel):
    """Structured quiz returned by the agent."""
    doc_id: str
    quiz_type: QuizType
    difficulty: Difficulty
    num_questions: int
    questions: List[QuizQuestion]
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Flashcards ───────────────────────────────────────────────────────────────


class Flashcard(BaseModel):
    """A single flashcard."""
    card_number: int
    question: str
    answer: str
    topic: Optional[str] = None
    difficulty: Optional[Difficulty] = None


class FlashcardRequest(BaseModel):
    """Request body for /flashcards."""
    doc_id: str
    num_cards: int = Field(default=20, ge=1, le=100)
    learner_level: LearnerLevel = LearnerLevel.intermediate
    topic_filter: Optional[str] = None


class FlashcardResponse(BaseModel):
    """List of flashcards returned by the agent."""
    doc_id: str
    num_cards: int
    flashcards: List[Flashcard]
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Revision ─────────────────────────────────────────────────────────────────


class RevisionRequest(BaseModel):
    """Request body for /revision."""
    doc_id: str
    revision_type: RevisionType = RevisionType.summary
    learner_level: LearnerLevel = LearnerLevel.intermediate


class RevisionResponse(BaseModel):
    """Structured revision sheet returned by the agent."""
    doc_id: str
    revision_type: RevisionType
    title: str
    content: str
    sections: List[StudyNotesSection] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Translation ──────────────────────────────────────────────────────────────


class TranslateRequest(BaseModel):
    """Request body for /translate."""
    text: str = Field(..., min_length=1, max_length=8192)
    target_language: SupportedLanguage
    preserve_technical_terms: bool = True
    doc_id: Optional[str] = None


class TranslateResponse(BaseModel):
    """Translated content returned by the agent."""
    original_text: str
    translated_text: str
    target_language: SupportedLanguage
    preserved_terms: List[str] = Field(default_factory=list)


# ─── Progress & History ───────────────────────────────────────────────────────


class UserProgress(BaseModel):
    """Progress metrics for one user."""
    user_id: str
    documents_uploaded: int = 0
    quizzes_taken: int = 0
    flashcards_reviewed: int = 0
    study_sessions: int = 0
    average_quiz_score: float = 0.0
    last_active: Optional[datetime] = None
    topics_covered: List[str] = Field(default_factory=list)


class ProgressResponse(BaseModel):
    """Full progress report returned to the client."""
    user_id: str
    progress: UserProgress
    recent_documents: List[Dict[str, Any]] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)


class HistoryEntry(BaseModel):
    """A single entry in the upload / study history."""
    doc_id: str
    filename: str
    uploaded_at: datetime
    status: ProcessingStatus
    subject: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class HistoryResponse(BaseModel):
    """Paginated list of history entries."""
    user_id: str
    total: int
    entries: List[HistoryEntry]


class ProgressUpdateRequest(BaseModel):
    """Payload to update progress metrics."""
    user_id: str
    event: str = Field(
        ...,
        description="Event name, e.g. 'quiz_completed', 'flashcard_reviewed'.",
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ─── Feedback ─────────────────────────────────────────────────────────────────


class FeedbackRequest(BaseModel):
    """User feedback submission."""
    user_id: str
    doc_id: Optional[str] = None
    feature: str = Field(
        ...,
        description="Feature being rated, e.g. 'quiz', 'simplify', 'chat'.",
    )
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2048)
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
