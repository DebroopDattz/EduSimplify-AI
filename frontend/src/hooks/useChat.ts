"use client";

import { useState, useCallback, useRef } from "react";
import type { Message, ChatSession, SuggestedPrompt, StreamChunk } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEMO_RESPONSES: Record<string, string> = {
  default:
    "That's a great question! Based on the document you've uploaded, I can help you understand this concept better.\n\nLet me break it down for you:\n\n1. **Core Idea** — The fundamental principle here revolves around the interaction between the main variables described in the text.\n\n2. **Key Insight** — Pay special attention to how the author connects cause and effect throughout the chapter.\n\n3. **Practical Application** — You can use this in real-world scenarios by mapping the theoretical model to observable phenomena.\n\nWould you like me to elaborate on any of these points or provide a concrete example?",
};

function simulateStream(
  text: string,
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void
): () => void {
  const words = text.split(" ");
  let i = 0;
  let cancelled = false;

  function emitNext() {
    if (cancelled) return;
    if (i >= words.length) {
      onChunk({ delta: "", done: true });
      onDone();
      return;
    }
    const batch = words.slice(i, i + 3).join(" ") + " ";
    i += 3;
    onChunk({ delta: batch, done: false });
    setTimeout(emitNext, 60 + Math.random() * 40);
  }

  setTimeout(emitNext, 400);
  return () => {
    cancelled = true;
  };
}

interface UseChatReturn {
  session: ChatSession | null;
  messages: Message[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  initSession: (docId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  regenerateLastResponse: () => Promise<void>;
  clearError: () => void;
  suggestedPrompts: SuggestedPrompt[];
}

const DEFAULT_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: "sp-1",
    label: "Summarise this document",
    prompt: "Can you give me a concise summary of this document?",
    icon: "📄",
  },
  {
    id: "sp-2",
    label: "Key concepts",
    prompt: "What are the most important concepts I need to understand from this document?",
    icon: "💡",
  },
  {
    id: "sp-3",
    label: "Explain like I'm 10",
    prompt: "Explain the main topic of this document as if I were 10 years old.",
    icon: "🧒",
  },
  {
    id: "sp-4",
    label: "Real-world examples",
    prompt: "Give me real-world examples that illustrate the main ideas in this document.",
    icon: "🌍",
  },
  {
    id: "sp-5",
    label: "Exam tips",
    prompt: "What topics from this document are most likely to appear in an exam?",
    icon: "📝",
  },
  {
    id: "sp-6",
    label: "Common misconceptions",
    prompt: "What are common mistakes or misconceptions students have about this topic?",
    icon: "⚠️",
  },
];

export function useChat(): UseChatReturn {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);
  const lastUserMessageRef = useRef<string>("");

  const clearError = useCallback(() => setError(null), []);

  const initSession = useCallback(async (docId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat/${docId}/session`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to initialise chat session");
      const data = await res.json();
      const sess: ChatSession = data.data ?? {
        id: `sess-${Date.now()}`,
        documentId: docId,
        userId: "local-user",
        title: "Study session",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSession(sess);
      setMessages(sess.messages ?? []);
    } catch {
      const sess: ChatSession = {
        id: `sess-${Date.now()}`,
        documentId: docId,
        userId: "local-user",
        title: "Study session",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSession(sess);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const appendAssistantStream = useCallback(
    (text: string, onDone?: () => void) => {
      const assistantMsgId = generateId();
      setIsStreaming(true);

      const placeholder: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, placeholder]);

      cancelStreamRef.current = simulateStream(
        text,
        (chunk) => {
          if (!chunk.done) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + chunk.delta }
                  : m
              )
            );
          }
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, isStreaming: false } : m
            )
          );
          setIsStreaming(false);
          onDone?.();
        }
      );
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // Cancel any in-progress stream
      cancelStreamRef.current?.();
      cancelStreamRef.current = null;

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      lastUserMessageRef.current = content.trim();
      setMessages((prev) => [...prev, userMsg]);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE}/api/chat/${session?.documentId ?? "demo"}/message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: session?.id,
              message: content.trim(),
            }),
          }
        );

        if (!res.ok) throw new Error("API error");

        // If streaming SSE, handle here; otherwise fall through to demo
        const data = await res.json();
        const replyText = data.data?.content ?? data.content ?? DEMO_RESPONSES.default;
        appendAssistantStream(replyText);
      } catch {
        appendAssistantStream(DEMO_RESPONSES.default);
      }
    },
    [isStreaming, session, appendAssistantStream]
  );

  const regenerateLastResponse = useCallback(async () => {
    if (isStreaming) return;

    // Remove last assistant message
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.role === "assistant");
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      return prev.slice(0, realIdx);
    });

    await new Promise<void>((r) => setTimeout(r, 100));
    appendAssistantStream(DEMO_RESPONSES.default);
  }, [isStreaming, appendAssistantStream]);

  return {
    session,
    messages,
    isStreaming,
    isLoading,
    error,
    initSession,
    sendMessage,
    regenerateLastResponse,
    clearError,
    suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS,
  };
}
