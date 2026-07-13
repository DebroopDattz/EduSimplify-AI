"use client";

import { useState, useCallback, useRef } from "react";
import type {
  Document,
  StudyNote,
  Quiz,
  FlashcardDeck,
  RevisionSheet,
  LearnerLevel,
  SupportedLanguage,
  DocumentStatus,
  ProcessingProgress,
  ProcessingStep,
} from "@/types";

const PROCESSING_STEPS: { step: ProcessingStep; label: string }[] = [
  { step: "upload", label: "Uploading file" },
  { step: "parse", label: "Parsing document" },
  { step: "summarize", label: "Summarising content" },
  { step: "generate_notes", label: "Generating study notes" },
  { step: "generate_quiz", label: "Creating quiz questions" },
  { step: "generate_flashcards", label: "Building flashcards" },
  { step: "complete", label: "Finalising" },
];

function buildSteps(currentIndex: number): ProcessingProgress[] {
  return PROCESSING_STEPS.map((s, i) => ({
    step: s.step,
    label: s.label,
    percent: i < currentIndex ? 100 : i === currentIndex ? 60 : 0,
    done: i < currentIndex,
  }));
}

interface UseDocumentReturn {
  documents: Document[];
  activeDocument: Document | null;
  studyNote: StudyNote | null;
  quiz: Quiz | null;
  flashcardDeck: FlashcardDeck | null;
  revisionSheet: RevisionSheet | null;
  isUploading: boolean;
  isProcessing: boolean;
  uploadProgress: number;
  processingSteps: ProcessingProgress[];
  error: string | null;
  uploadFile: (
    file: File,
    level: LearnerLevel,
    language: SupportedLanguage
  ) => Promise<string | null>;
  fetchDocument: (docId: string) => Promise<void>;
  fetchStudyNote: (docId: string) => Promise<void>;
  fetchQuiz: (docId: string) => Promise<void>;
  fetchFlashcardDeck: (docId: string) => Promise<void>;
  fetchRevisionSheet: (docId: string) => Promise<void>;
  fetchDocuments: () => Promise<void>;
  clearError: () => void;
}

// Simulated API base — swap for real endpoint
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function useDocument(): UseDocumentReturn {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);
  const [studyNote, setStudyNote] = useState<StudyNote | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [flashcardDeck, setFlashcardDeck] = useState<FlashcardDeck | null>(null);
  const [revisionSheet, setRevisionSheet] = useState<RevisionSheet | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<ProcessingProgress[]>(
    buildSteps(-1)
  );
  const [error, setError] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Simulate step-by-step processing progress
  const simulateProcessing = useCallback(async () => {
    setIsProcessing(true);
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      setProcessingSteps(buildSteps(i));
      await new Promise<void>((r) => setTimeout(r, 900));
    }
    setProcessingSteps(
      PROCESSING_STEPS.map((s) => ({
        step: s.step,
        label: s.label,
        percent: 100,
        done: true,
      }))
    );
    setIsProcessing(false);
  }, []);

  const uploadFile = useCallback(
    async (
      file: File,
      level: LearnerLevel,
      language: SupportedLanguage
    ): Promise<string | null> => {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      setProcessingSteps(buildSteps(-1));

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("level", level);
        formData.append("language", language);

        const docId = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data.data?.documentId ?? data.documentId ?? "demo-id");
              } catch {
                // Fallback for demo/local dev
                resolve(`demo-${Date.now()}`);
              }
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener("error", () => {
            // Fallback to simulated upload for demo mode
            resolve(`demo-${Date.now()}`);
          });

          xhr.open("POST", `${API_BASE}/api/documents/upload`);
          xhr.send(formData);
        });

        setIsUploading(false);
        await simulateProcessing();

        // Add a mock document entry to local list
        const newDoc: Document = {
          id: docId,
          userId: "local-user",
          title: file.name.replace(/\.pdf$/i, ""),
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          status: "ready" as DocumentStatus,
          level,
          language,
          processingSteps: PROCESSING_STEPS.map((s) => ({
            step: s.step,
            label: s.label,
            percent: 100,
            done: true,
          })),
        };
        setDocuments((prev) => [newDoc, ...prev]);
        setActiveDocument(newDoc);
        return docId;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
        setIsUploading(false);
        setIsProcessing(false);
        return null;
      }
    },
    [simulateProcessing]
  );

  const fetchDocument = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${docId}`);
      if (!res.ok) throw new Error("Failed to fetch document");
      const data = await res.json();
      setActiveDocument(data.data ?? data);
    } catch {
      // Use stub for demo
      setActiveDocument({
        id: docId,
        userId: "local-user",
        title: "Sample Document",
        fileName: "sample.pdf",
        fileSize: 1024 * 1024,
        uploadedAt: new Date().toISOString(),
        status: "ready",
        level: "intermediate",
        language: "english",
        processingSteps: PROCESSING_STEPS.map((s) => ({
          step: s.step,
          label: s.label,
          percent: 100,
          done: true,
        })),
      });
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      setDocuments(data.data ?? data ?? []);
    } catch {
      // Silently stay with current local list
    }
  }, []);

  const fetchStudyNote = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${docId}/notes`);
      if (!res.ok) throw new Error("Notes not available");
      const data = await res.json();
      setStudyNote(data.data ?? data);
    } catch {
      setStudyNote(null);
    }
  }, []);

  const fetchQuiz = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${docId}/quiz`);
      if (!res.ok) throw new Error("Quiz not available");
      const data = await res.json();
      setQuiz(data.data ?? data);
    } catch {
      setQuiz(null);
    }
  }, []);

  const fetchFlashcardDeck = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${docId}/flashcards`);
      if (!res.ok) throw new Error("Flashcards not available");
      const data = await res.json();
      setFlashcardDeck(data.data ?? data);
    } catch {
      setFlashcardDeck(null);
    }
  }, []);

  const fetchRevisionSheet = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${docId}/revision`);
      if (!res.ok) throw new Error("Revision sheet not available");
      const data = await res.json();
      setRevisionSheet(data.data ?? data);
    } catch {
      setRevisionSheet(null);
    }
  }, []);

  return {
    documents,
    activeDocument,
    studyNote,
    quiz,
    flashcardDeck,
    revisionSheet,
    isUploading,
    isProcessing,
    uploadProgress,
    processingSteps,
    error,
    uploadFile,
    fetchDocument,
    fetchStudyNote,
    fetchQuiz,
    fetchFlashcardDeck,
    fetchRevisionSheet,
    fetchDocuments,
    clearError,
  };
}
