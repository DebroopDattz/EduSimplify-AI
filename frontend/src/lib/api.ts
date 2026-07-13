import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

/* ── Types ──────────────────────────────────────────────────────── */

export interface UploadResponse {
  documentId: string;
  filename: string;
  pages: number;
  uploadedAt: string;
  status: "processing" | "ready" | "error";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  sources?: Array<{ page: number; text: string }>;
  tokensUsed?: number;
}

export interface SimplifyResponse {
  simplified: string;
  keyPoints: string[];
  readingLevel: string;
}

export interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizResponse {
  quizId: string;
  documentId: string;
  questions: QuizQuestion[];
  generatedAt: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic?: string;
}

export interface FlashcardsResponse {
  deckId: string;
  documentId: string;
  cards: Flashcard[];
  generatedAt: string;
}

export interface RevisionResponse {
  revisionNotes: string;
  mindMap?: Record<string, string[]>;
  generatedAt: string;
}

export interface TranslateResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface HistoryItem {
  id: string;
  type: "upload" | "quiz" | "chat" | "flashcards" | "summary";
  documentId?: string;
  documentTitle?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ProgressStats {
  streak: number;
  totalQuizzes: number;
  avgScore: number;
  totalDocuments: number;
  topicsStudied: number;
  totalStudyMinutes: number;
  weeklyActivity: Array<{ date: string; minutes: number }>;
  topicMastery: Array<{ topic: string; progress: number }>;
}

export interface FeedbackPayload {
  featureType: "summary" | "quiz" | "flashcards" | "chat" | "simplify";
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  documentId?: string;
}

export type LearnerLevel = "beginner" | "intermediate" | "advanced";

/* ── Axios instance ─────────────────────────────────────────────── */

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout: 60_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/* Request interceptor — attach auth token if available */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* Response interceptor — handle 401 gracefully */
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/* ── API Functions ──────────────────────────────────────────────── */

/**
 * Upload a PDF file and start processing.
 */
export async function uploadPDF(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<UploadResponse>("/api/v1/documents/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * Send a chat message about a specific document.
 */
export async function chat(
  documentId: string,
  messages: ChatMessage[],
  level: LearnerLevel = "intermediate"
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>("/api/v1/chat", {
    documentId,
    messages,
    level,
  });
  return data;
}

/**
 * Simplify a document or a specific passage.
 */
export async function simplify(
  documentId: string,
  targetLevel: LearnerLevel,
  passage?: string
): Promise<SimplifyResponse> {
  const { data } = await api.post<SimplifyResponse>("/api/v1/simplify", {
    documentId,
    targetLevel,
    passage,
  });
  return data;
}

/**
 * Generate a quiz from a document.
 */
export async function generateQuiz(
  documentId: string,
  options: {
    questionCount?: number;
    difficulty?: LearnerLevel;
    types?: Array<"multiple_choice" | "true_false" | "short_answer">;
  } = {}
): Promise<QuizResponse> {
  const { data } = await api.post<QuizResponse>("/api/v1/quiz/generate", {
    documentId,
    questionCount: options.questionCount ?? 10,
    difficulty: options.difficulty ?? "intermediate",
    types: options.types ?? ["multiple_choice"],
  });
  return data;
}

/**
 * Generate flashcards from a document.
 */
export async function generateFlashcards(
  documentId: string,
  cardCount: number = 15
): Promise<FlashcardsResponse> {
  const { data } = await api.post<FlashcardsResponse>(
    "/api/v1/flashcards/generate",
    { documentId, cardCount }
  );
  return data;
}

/**
 * Generate structured revision notes from a document.
 */
export async function generateRevision(
  documentId: string,
  level: LearnerLevel = "intermediate"
): Promise<RevisionResponse> {
  const { data } = await api.post<RevisionResponse>("/api/v1/revision/generate", {
    documentId,
    level,
  });
  return data;
}

/**
 * Translate content to a target language.
 */
export async function translate(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = "en"
): Promise<TranslateResponse> {
  const { data } = await api.post<TranslateResponse>("/api/v1/translate", {
    text,
    targetLanguage,
    sourceLanguage,
  });
  return data;
}

/**
 * Get the user's activity history.
 */
export async function getHistory(
  page: number = 1,
  limit: number = 20
): Promise<{ items: HistoryItem[]; total: number; page: number }> {
  const { data } = await api.get("/api/v1/history", {
    params: { page, limit },
  });
  return data;
}

/**
 * Get the user's learning progress statistics.
 */
export async function getProgress(): Promise<ProgressStats> {
  const { data } = await api.get<ProgressStats>("/api/v1/progress");
  return data;
}

/**
 * Submit feedback for a generated result.
 */
export async function submitFeedback(
  payload: FeedbackPayload
): Promise<{ success: boolean }> {
  const { data } = await api.post<{ success: boolean }>(
    "/api/v1/feedback",
    payload
  );
  return data;
}

/**
 * Get document processing status.
 */
export async function getDocumentStatus(
  documentId: string
): Promise<UploadResponse> {
  const { data } = await api.get<UploadResponse>(
    `/api/v1/documents/${documentId}/status`
  );
  return data;
}

/**
 * List all user documents.
 */
export async function listDocuments(): Promise<{
  documents: UploadResponse[];
  total: number;
}> {
  const { data } = await api.get("/api/v1/documents");
  return data;
}

/**
 * Delete a document.
 */
export async function deleteDocument(
  documentId: string
): Promise<{ success: boolean }> {
  const { data } = await api.delete<{ success: boolean }>(
    `/api/v1/documents/${documentId}`
  );
  return data;
}

export default api;
