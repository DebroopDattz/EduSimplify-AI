// ─── User ────────────────────────────────────────────────────────────────────

export type LearnerLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type SupportedLanguage =
  | "english"
  | "hindi"
  | "bengali"
  | "tamil"
  | "telugu"
  | "marathi";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  preferredLevel: LearnerLevel;
  preferredLanguage: SupportedLanguage;
  createdAt: string;
  streak: number;
  lastActiveAt: string;
}

// ─── Document ────────────────────────────────────────────────────────────────

export type DocumentStatus =
  | "uploading"
  | "processing"
  | "ready"
  | "error";

export type ProcessingStep =
  | "upload"
  | "parse"
  | "summarize"
  | "generate_notes"
  | "generate_quiz"
  | "generate_flashcards"
  | "complete";

export interface ProcessingProgress {
  step: ProcessingStep;
  label: string;
  percent: number;
  done: boolean;
}

export interface DocumentMetadata {
  pageCount: number;
  wordCount: number;
  language: SupportedLanguage;
  detectedTopics: string[];
  estimatedReadTime: number; // minutes
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  fileSize: number; // bytes
  uploadedAt: string;
  status: DocumentStatus;
  level: LearnerLevel;
  language: SupportedLanguage;
  metadata?: DocumentMetadata;
  thumbnailUrl?: string;
  processingSteps: ProcessingProgress[];
}

// ─── Study Notes ─────────────────────────────────────────────────────────────

export interface KeyConcept {
  term: string;
  definition: string;
  example?: string;
  mermaid?: string;
}

export interface NoteSection {
  id: string;
  type:
    | "overview"
    | "learning_objectives"
    | "key_concepts"
    | "examples"
    | "common_mistakes"
    | "applications"
    | "summary";
  title: string;
  content: string;
  keyConcepts?: KeyConcept[];
  mermaid?: string;
}

export interface StudyNote {
  id: string;
  documentId: string;
  title: string;
  level: LearnerLevel;
  language: SupportedLanguage;
  generatedAt: string;
  sections: NoteSection[];
  tags: string[];
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
  tokensUsed?: number;
}

export interface ChatSession {
  id: string;
  documentId: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface SuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
  icon: string;
}

// ─── Quiz ────────────────────────────────────────────────────────────────────

export type QuizType = "mcq" | "true_false" | "short_answer";
export type QuizDifficulty = "easy" | "medium" | "hard";

export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  type: QuizType;
  question: string;
  options?: MCQOption[];
  correctAnswer: string;
  explanation: string;
  difficulty: QuizDifficulty;
  topic: string;
  pointValue: number;
}

export interface QuizSettings {
  type: QuizType;
  difficulty: QuizDifficulty;
  numberOfQuestions: number;
}

export interface QuizAttempt {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeTaken: number; // seconds
}

export interface Quiz {
  id: string;
  documentId: string;
  title: string;
  questions: QuizQuestion[];
  settings: QuizSettings;
  createdAt: string;
}

export interface QuizResult {
  quizId: string;
  attempts: QuizAttempt[];
  score: number;
  totalPoints: number;
  percentage: number;
  timeTaken: number;
  completedAt: string;
  correctCount: number;
  incorrectCount: number;
}

// ─── Flashcards ───────────────────────────────────────────────────────────────

export type FlashcardStatus = "new" | "reviewing" | "mastered";

export interface Flashcard {
  id: string;
  documentId: string;
  front: string;
  back: string;
  topic: string;
  status: FlashcardStatus;
  lastReviewedAt?: string;
  reviewCount: number;
  difficulty: QuizDifficulty;
}

export interface FlashcardDeck {
  id: string;
  documentId: string;
  title: string;
  cards: Flashcard[];
  createdAt: string;
  masteredCount: number;
  reviewingCount: number;
  newCount: number;
}

// ─── Revision ────────────────────────────────────────────────────────────────

export interface FormulaEntry {
  name: string;
  formula: string;
  description: string;
  unit?: string;
}

export interface RevisionSheet {
  id: string;
  documentId: string;
  title: string;
  formulaSheet: FormulaEntry[];
  cheatSheet: string; // markdown
  mindMap: string; // mermaid diagram
  summary: string; // markdown
  examNotes: string; // markdown
  generatedAt: string;
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface QuizPerformanceEntry {
  date: string;
  score: number;
  total: number;
  documentTitle: string;
}

export interface TopicMastery {
  topic: string;
  masteryPercent: number;
  questionsAttempted: number;
  correctCount: number;
}

export interface WeakArea {
  topic: string;
  reason: string;
  recommendedAction: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  locked: boolean;
}

export interface UserProgress {
  userId: string;
  streak: number;
  longestStreak: number;
  totalDocumentsProcessed: number;
  totalQuizzesTaken: number;
  totalFlashcardsReviewed: number;
  averageQuizScore: number;
  quizHistory: QuizPerformanceEntry[];
  topicMastery: TopicMastery[];
  weakAreas: WeakArea[];
  achievements: Achievement[];
  lastUpdated: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  documentId: string;
  status: DocumentStatus;
  message: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  tokensUsed?: number;
}

// ─── UI ──────────────────────────────────────────────────────────────────────

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
}

export interface ExportFormat {
  type: "pdf" | "markdown" | "docx" | "csv" | "copy";
  label: string;
  icon: string;
}
