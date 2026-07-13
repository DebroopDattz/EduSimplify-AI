"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NoteSection } from "@/types";

interface NoteCardProps {
  section: NoteSection;
  defaultOpen?: boolean;
}

const sectionMeta: Record<
  NoteSection["type"],
  { icon: string; color: string; bgColor: string; borderColor: string }
> = {
  overview: {
    icon: "🗺️",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  learning_objectives: {
    icon: "🎯",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
  },
  key_concepts: {
    icon: "🔑",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  examples: {
    icon: "💡",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  common_mistakes: {
    icon: "⚠️",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  applications: {
    icon: "🚀",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  summary: {
    icon: "📋",
    color: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
};

export default function NoteCard({ section, defaultOpen = true }: NoteCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const meta = sectionMeta[section.type] ?? sectionMeta.summary;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-2xl border ${meta.borderColor} shadow-sm`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`flex w-full items-center justify-between px-5 py-4 ${meta.bgColor} transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{meta.icon}</span>
          <h3 className={`text-sm font-bold uppercase tracking-wide ${meta.color}`}>
            {section.title}
          </h3>
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={`h-5 w-5 ${meta.color}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-white px-5 py-4">
              {/* Main content */}
              <div className="prose prose-sm max-w-none text-gray-700">
                {section.content.split("\n").map((line, i) => (
                  line.trim() ? <p key={i} className="mb-2 last:mb-0">{line}</p> : <br key={i} />
                ))}
              </div>

              {/* Mermaid diagram */}
              {section.mermaid && (
                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Diagram
                  </p>
                  <div
                    data-mermaid={section.mermaid}
                    className="mermaid-container overflow-x-auto text-sm"
                  >
                    <pre className="whitespace-pre-wrap font-mono text-xs text-gray-500">
                      {section.mermaid}
                    </pre>
                  </div>
                </div>
              )}

              {/* Key concepts list */}
              {section.keyConcepts && section.keyConcepts.length > 0 && (
                <div className="mt-4 space-y-3">
                  {section.keyConcepts.map((concept, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className={`font-bold ${meta.color}`}>{concept.term}</span>
                        <span className="text-sm text-gray-500">—</span>
                        <span className="text-sm text-gray-700">{concept.definition}</span>
                      </div>
                      {concept.example && (
                        <p className="mt-1 rounded-lg bg-white px-3 py-1.5 text-xs italic text-gray-500">
                          Example: {concept.example}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
