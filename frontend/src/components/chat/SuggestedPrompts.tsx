"use client";

import { motion } from "framer-motion";
import type { SuggestedPrompt } from "@/types";

interface SuggestedPromptsProps {
  prompts: SuggestedPrompt[];
  onSelect: (prompt: string) => void;
  className?: string;
}

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

export default function SuggestedPrompts({
  prompts,
  onSelect,
  className = "",
}: SuggestedPromptsProps) {
  return (
    <div className={`flex flex-col items-center gap-6 py-8 ${className}`}>
      {/* Hero icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-3xl shadow-sm"
      >
        🤖
      </motion.div>

      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-bold text-gray-800"
        >
          Your AI Tutor
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-1 text-sm text-gray-500"
        >
          Ask me anything about your document, or get started with a suggestion below.
        </motion.p>
      </div>

      {/* Prompt grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {prompts.map((prompt) => (
          <motion.button
            key={prompt.id}
            variants={itemVariants}
            type="button"
            onClick={() => onSelect(prompt.prompt)}
            whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(99,102,241,0.12)" }}
            whileTap={{ scale: 0.97 }}
            className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-lg">
              {prompt.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{prompt.label}</p>
              <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{prompt.prompt}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
