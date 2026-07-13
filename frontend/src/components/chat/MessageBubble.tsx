"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
  onCopy?: (content: string) => void;
  onRegenerate?: () => void;
  isLast?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <motion.button
      type="button"
      onClick={copy}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      title="Copy message"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.svg
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="h-3.5 w-3.5 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </motion.svg>
        ) : (
          <motion.svg
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function TypingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
      className="ml-0.5 inline-block h-4 w-0.5 rounded-full bg-gray-500 align-middle"
    />
  );
}

// Skeleton for assistant loading state
export function MessageSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-sm">
        🤖
      </div>
      <div className="flex-1 space-y-2 pt-1">
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="h-3.5 w-3/4 rounded-full bg-gray-200"
        />
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="h-3.5 w-1/2 rounded-full bg-gray-200"
        />
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          className="h-3.5 w-5/6 rounded-full bg-gray-200"
        />
      </div>
    </div>
  );
}

export default function MessageBubble({
  message,
  onCopy,
  onRegenerate,
  isLast = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`group flex items-start gap-3 px-4 py-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-indigo-100 text-indigo-600"
        }`}
      >
        {isUser ? "👤" : "🤖"}
      </div>

      {/* Bubble */}
      <div className={`flex max-w-[80%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={[
            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
            isUser
              ? "rounded-tr-sm bg-indigo-600 text-white"
              : "rounded-tl-sm bg-white text-gray-800 border border-gray-100",
          ].join(" ")}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-pre:rounded-xl prose-pre:bg-gray-900">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
              >
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && <TypingCursor />}
            </div>
          )}
        </div>

        {/* Action row */}
        <div
          className={`flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${
            isUser ? "flex-row-reverse" : ""
          }`}
        >
          <CopyButton text={message.content} />
          {!isUser && isLast && onRegenerate && (
            <motion.button
              type="button"
              onClick={onRegenerate}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Regenerate response"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </motion.button>
          )}
          <span className="px-1 text-xs text-gray-300">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
