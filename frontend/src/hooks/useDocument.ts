"use client";

import { useState, useCallback, useRef } from "react";
import type {
  Document,
  StudyNote,
  NoteSection,
  KeyConcept,
  Quiz,
  QuizQuestion,
  QuizSettings,
  FlashcardDeck,
  Flashcard,
  FlashcardStatus,
  FormulaEntry,
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

function mapBackendNotesToFrontend(data: any, docId: string): StudyNote {
  const sections: NoteSection[] = [
    {
      id: "overview",
      type: "overview",
      title: "Overview",
      content: data.overview || "",
    },
    {
      id: "objectives",
      type: "learning_objectives",
      title: "Learning Objectives",
      content: (data.objectives || []).map((o: string) => `• ${o}`).join("\n"),
    },
    {
      id: "key_concepts",
      type: "key_concepts",
      title: "Key Concepts",
      content: "The following core concepts are essential for understanding this topic:",
      keyConcepts: (data.key_concepts || []).map((kc: any) => ({
        term: kc.heading || "",
        definition: kc.content || "",
        example: "",
      })),
      mermaid: data.diagrams?.[0] || "",
    },
    {
      id: "examples",
      type: "examples",
      title: "Examples",
      content: (data.examples || []).join("\n\n"),
    },
    {
      id: "common_mistakes",
      type: "common_mistakes",
      title: "Common Mistakes",
      content: (data.common_mistakes || []).map((m: string) => `• ${m}`).join("\n"),
    },
    {
      id: "applications",
      type: "applications",
      title: "Real-World Applications",
      content: (data.applications || []).map((a: string) => `• ${a}`).join("\n"),
    },
    {
      id: "summary",
      type: "summary",
      title: "Summary",
      content: data.summary || "",
    },
  ];

  return {
    id: data.id || `note-${docId}`,
    documentId: docId,
    title: data.title || "Study Notes",
    level: "intermediate",
    language: "english",
    generatedAt: data.generated_at || new Date().toISOString(),
    sections,
    tags: [],
  };
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
  fetchQuiz: (docId: string, settings?: QuizSettings) => Promise<Quiz | null>;
  fetchFlashcardDeck: (docId: string) => Promise<void>;
  fetchRevisionSheet: (docId: string) => Promise<void>;
  fetchDocuments: () => Promise<void>;
  clearError: () => void;
}

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

  const simulateProcessing = useCallback(async () => {
    setIsProcessing(true);
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      setProcessingSteps(buildSteps(i));
      await new Promise<void>((r) => setTimeout(r, 600));
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
        formData.append("user_id", "local-user");
        formData.append("subject", file.name.replace(/\.pdf$/i, ""));
        formData.append("tags", "");

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
                resolve(data.doc_id ?? data.documentId ?? "demo-id");
              } catch {
                resolve(`demo-${Date.now()}`);
              }
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener("error", () => {
            resolve(`demo-${Date.now()}`);
          });

          xhr.open("POST", `${API_BASE}/upload`);
          xhr.send(formData);
        });

        setIsUploading(false);
        await simulateProcessing();

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
      const res = await fetch(`${API_BASE}/upload/${docId}`);
      if (!res.ok) throw new Error("Failed to fetch document");
      const data = await res.json();
      setActiveDocument({
        id: data._id || docId,
        userId: data.user_id || "local-user",
        title: data.subject || data.filename?.replace(/\.pdf$/i, "") || "Study Document",
        fileName: data.filename || "document.pdf",
        fileSize: 1024 * 1024,
        uploadedAt: data.uploaded_at || new Date().toISOString(),
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
    } catch {
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
      const res = await fetch(`${API_BASE}/upload`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      const docs: Document[] = (data || []).map((d: any) => ({
        id: d._id || "",
        userId: d.user_id || "local-user",
        title: d.subject || d.filename?.replace(/\.pdf$/i, "") || "Study Document",
        fileName: d.filename || "document.pdf",
        fileSize: 1024 * 1024,
        uploadedAt: d.uploaded_at || new Date().toISOString(),
        status: "ready",
        level: "intermediate",
        language: "english",
        processingSteps: PROCESSING_STEPS.map((s) => ({
          step: s.step,
          label: s.label,
          percent: 100,
          done: true,
        })),
      }));
      setDocuments(docs);
    } catch {
      // Silently keep current documents list
    }
  }, []);

  const fetchStudyNote = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`${API_BASE}/study/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId }),
      });
      if (!res.ok) throw new Error("Notes not available");
      const data = await res.json();
      const mapped = mapBackendNotesToFrontend(data, docId);
      setStudyNote(mapped);
    } catch {
      setStudyNote(null);
    }
  }, []);

  const fetchQuiz = useCallback(async (docId: string, settings?: QuizSettings) => {
    try {
      const res = await fetch(`${API_BASE}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docId,
          quiz_type: settings?.type || "mcq",
          difficulty: settings?.difficulty || "medium",
          num_questions: settings?.numberOfQuestions || 5,
        }),
      });
      if (!res.ok) throw new Error("Quiz not available");
      const data = await res.json();
      const mapped: Quiz = {
        id: `quiz-${docId}`,
        documentId: docId,
        title: "Adaptive Quiz",
        questions: (data.questions || []).map((q: any, index: number) => ({
          id: `q-${index}`,
          type: q.quiz_type || "mcq",
          question: q.question || "",
          options: (q.options || []).map((opt: any) => ({
            id: opt.key || "",
            text: opt.text || "",
            isCorrect: opt.key === q.correct_answer,
          })),
          correctAnswer: q.options?.find((o: any) => o.key === q.correct_answer)?.text || q.correct_answer,
          explanation: q.explanation || "",
          difficulty: q.difficulty || "medium",
          topic: q.topic || "General",
          pointValue: 10,
        })),
        settings: {
          type: data.quiz_type || "mcq",
          difficulty: data.difficulty || "medium",
          numberOfQuestions: data.questions?.length || 5,
        },
        createdAt: new Date().toISOString(),
      };
      setQuiz(mapped);
      return mapped;
    } catch {
      setQuiz(null);
      return null;
    }
  }, []);

  const fetchFlashcardDeck = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`${API_BASE}/flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docId,
          num_cards: 8,
        }),
      });
      if (!res.ok) throw new Error("Flashcards not available");
      const data = await res.json();
      const cards: Flashcard[] = (data.flashcards || []).map((c: any, index: number) => ({
        id: `c-${index}`,
        documentId: docId,
        front: c.question || "",
        back: c.answer || "",
        topic: c.topic || "General",
        status: "new" as FlashcardStatus,
        reviewCount: 0,
        difficulty: c.difficulty || "medium",
      }));
      const mapped: FlashcardDeck = {
        id: `deck-${docId}`,
        documentId: docId,
        title: "Adaptive Flashcards",
        cards,
        createdAt: new Date().toISOString(),
        masteredCount: 0,
        reviewingCount: 0,
        newCount: cards.length,
      };
      setFlashcardDeck(mapped);
    } catch {
      setFlashcardDeck(null);
    }
  }, []);

  const fetchRevisionSheet = useCallback(async (docId: string) => {
    try {
      const types = ["formula_sheet", "cheat_sheet", "mind_map", "summary", "exam_notes"];
      const promises = types.map(type =>
        fetch(`${API_BASE}/revision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doc_id: docId,
            revision_type: type,
          }),
        }).then(res => res.json())
      );

      const [formulaRes, cheatRes, mindRes, summaryRes, examRes] = await Promise.all(promises);

      const formulas: FormulaEntry[] = [];
      (formulaRes.sections || []).forEach((sec: any, idx: number) => {
        const parts = sec.content?.split(":") || [];
        const name = sec.heading || parts[0]?.trim() || `Formula ${idx + 1}`;
        const formula = parts[1]?.split("-")[0]?.trim() || sec.content || "";
        const description = parts[1]?.split("-")[1]?.trim() || "Mathematical relationship.";
        formulas.push({ name, formula, description });
      });

      if (formulas.length === 0) {
        formulas.push({
          name: "Reference Formula",
          formula: "y = f(x)",
          description: "General conceptual mapping parsed from text."
        });
      }

      const mapped: RevisionSheet = {
        id: `rev-${docId}`,
        documentId: docId,
        title: summaryRes.title || "Revision Suite",
        formulaSheet: formulas,
        cheatSheet: cheatRes.content || "",
        mindMap: mindRes.content || "",
        summary: summaryRes.content || "",
        examNotes: examRes.content || "",
        generatedAt: new Date().toISOString(),
      };
      setRevisionSheet(mapped);
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
