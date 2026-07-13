"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/hooks/useChat";
import MessageBubble, { MessageSkeleton } from "@/components/chat/MessageBubble";
import SuggestedPrompts from "@/components/chat/SuggestedPrompts";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;

  const {
    messages,
    isStreaming,
    isLoading,
    initSession,
    sendMessage,
    regenerateLastResponse,
    suggestedPrompts,
  } = useChat();

  const [inputValue, setInputValue] = useState("");
  const [docTitle, setDocTitle] = useState("Study Document");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    initSession(docId);
    // Attempt to fetch title
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/documents/${docId}`)
      .then((r) => r.json())
      .then((d) => { if (d?.data?.title || d?.title) setDocTitle(d.data?.title ?? d.title); })
      .catch(() => setDocTitle("Study Document"));
  }, [docId, initSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue("");
    await sendMessage(text);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [inputValue, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize textarea
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, []);

  const showSuggested = messages.length === 0 && !isLoading;

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="z-40 border-b border-gray-200/80 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.push(`/study/${docId}`)}
            className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-lg">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900">AI Tutor</h1>
            <p className="truncate text-xs text-gray-400">
              Context: <span className="font-medium text-indigo-600">{docTitle}</span>
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ scale: isStreaming ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.8, repeat: isStreaming ? Infinity : 0 }}
              className={`h-2 w-2 rounded-full ${isStreaming ? "bg-emerald-500" : "bg-gray-300"}`}
            />
            <span className="text-xs text-gray-400">
              {isStreaming ? "Typing…" : "Ready"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/quiz/${docId}`)}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              ❓ Quiz
            </button>
            <button
              onClick={() => router.push(`/flashcards/${docId}`)}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              🃏 Cards
            </button>
          </div>
        </div>
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-2 py-4 sm:px-4">
          {isLoading ? (
            <div className="space-y-4 py-4">
              <MessageSkeleton />
              <MessageSkeleton />
            </div>
          ) : showSuggested ? (
            <SuggestedPrompts
              prompts={suggestedPrompts}
              onSelect={(prompt) => {
                setInputValue(prompt);
                sendMessage(prompt);
              }}
            />
          ) : (
            <div className="space-y-1 pb-4">
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLast={idx === messages.length - 1}
                  onRegenerate={
                    idx === messages.length - 1 && msg.role === "assistant"
                      ? regenerateLastResponse
                      : undefined
                  }
                />
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <MessageSkeleton />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-4 py-4 shadow-lg sm:px-6">
        <div className="mx-auto max-w-4xl">
          {/* Context pill */}
          <div className="mb-2 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {docTitle}
            </span>
            <span className="text-xs text-gray-400">Shift+Enter for new line · Enter to send</span>
          </div>

          <div className="flex items-end gap-3 rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 transition-all focus-within:border-indigo-400 focus-within:bg-white focus-within:shadow-sm">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your document…"
              rows={1}
              disabled={isStreaming}
              className="min-h-[24px] flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-50"
              style={{ maxHeight: "180px" }}
            />
            <motion.button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
              whileHover={inputValue.trim() && !isStreaming ? { scale: 1.08 } : {}}
              whileTap={inputValue.trim() && !isStreaming ? { scale: 0.92 } : {}}
              className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                inputValue.trim() && !isStreaming
                  ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              ].join(" ")}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </motion.button>
          </div>

          <p className="mt-1.5 text-center text-xs text-gray-400">
            AI Tutor may occasionally make mistakes. Always verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
