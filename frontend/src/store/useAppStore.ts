import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage, LearnerLevel } from "@/lib/api";

/* ── Type Definitions ───────────────────────────────────────────── */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "ibm_appid" | "google" | "guest";
  plan: "free" | "pro" | "student";
  createdAt: string;
}

export interface Document {
  id: string;
  filename: string;
  title: string;
  pages: number;
  uploadedAt: string;
  status: "processing" | "ready" | "error";
  subject?: string;
}

export interface LoadingStates {
  isUploading: boolean;
  isGeneratingQuiz: boolean;
  isGeneratingFlashcards: boolean;
  isGeneratingRevision: boolean;
  isSimplifying: boolean;
  isChatting: boolean;
  isTranslating: boolean;
}

export interface AppState {
  /* User */
  user: User | null;
  isAuthenticated: boolean;

  /* Document */
  currentDocument: Document | null;
  documents: Document[];

  /* Learning settings */
  learnerLevel: LearnerLevel;

  /* Chat */
  chatMessages: ChatMessage[];

  /* Loading states */
  loading: LoadingStates;

  /* UI */
  sidebarCollapsed: boolean;
  activeTab: string;

  /* Actions — User */
  setUser: (user: User | null) => void;
  logout: () => void;

  /* Actions — Document */
  setCurrentDocument: (doc: Document | null) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;

  /* Actions — Learning */
  setLearnerLevel: (level: LearnerLevel) => void;

  /* Actions — Chat */
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;

  /* Actions — Loading */
  setLoading: (key: keyof LoadingStates, value: boolean) => void;

  /* Actions — UI */
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveTab: (tab: string) => void;

  /* Full reset */
  reset: () => void;
}

/* ── Initial Values ─────────────────────────────────────────────── */

const initialLoadingStates: LoadingStates = {
  isUploading: false,
  isGeneratingQuiz: false,
  isGeneratingFlashcards: false,
  isGeneratingRevision: false,
  isSimplifying: false,
  isChatting: false,
  isTranslating: false,
};

/* ── Store ──────────────────────────────────────────────────────── */

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* Initial state */
      user: null,
      isAuthenticated: false,
      currentDocument: null,
      documents: [],
      learnerLevel: "intermediate",
      chatMessages: [],
      loading: initialLoadingStates,
      sidebarCollapsed: false,
      activeTab: "summary",

      /* User actions */
      setUser: (user) =>
        set({
          user,
          isAuthenticated: user !== null,
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          currentDocument: null,
          chatMessages: [],
        }),

      /* Document actions */
      setCurrentDocument: (doc) =>
        set({
          currentDocument: doc,
          chatMessages: [],
          activeTab: "summary",
        }),

      addDocument: (doc) =>
        set((state) => ({
          documents: [doc, ...state.documents],
        })),

      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
          currentDocument:
            state.currentDocument?.id === id
              ? { ...state.currentDocument, ...updates }
              : state.currentDocument,
        })),

      removeDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
          currentDocument:
            state.currentDocument?.id === id ? null : state.currentDocument,
        })),

      /* Learning actions */
      setLearnerLevel: (level) => set({ learnerLevel: level }),

      /* Chat actions */
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),

      clearChatMessages: () => set({ chatMessages: [] }),

      /* Loading actions */
      setLoading: (key, value) =>
        set((state) => ({
          loading: { ...state.loading, [key]: value },
        })),

      /* UI actions */
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      /* Reset all state */
      reset: () =>
        set({
          user: null,
          isAuthenticated: false,
          currentDocument: null,
          documents: [],
          learnerLevel: "intermediate",
          chatMessages: [],
          loading: initialLoadingStates,
          sidebarCollapsed: false,
          activeTab: "summary",
        }),
    }),
    {
      name: "edusimplify-app-store",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : sessionStorage
      ),
      /* Only persist non-transient state */
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        documents: state.documents,
        learnerLevel: state.learnerLevel,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

/* ── Selector Hooks ─────────────────────────────────────────────── */

export const useUser = () => useAppStore((s) => s.user);
export const useIsAuthenticated = () => useAppStore((s) => s.isAuthenticated);
export const useCurrentDocument = () => useAppStore((s) => s.currentDocument);
export const useLearnerLevel = () => useAppStore((s) => s.learnerLevel);
export const useChatMessages = () => useAppStore((s) => s.chatMessages);
export const useLoading = () => useAppStore((s) => s.loading);
export const useDocuments = () => useAppStore((s) => s.documents);
