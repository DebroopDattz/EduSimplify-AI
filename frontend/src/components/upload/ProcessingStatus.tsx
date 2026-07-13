"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProcessingProgress } from "@/types";

interface ProcessingStatusProps {
  steps: ProcessingProgress[];
  isProcessing: boolean;
  className?: string;
}

const stepIcons: Record<string, React.ReactElement> = {
  upload: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  parse: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  summarize: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h10" />
    </svg>
  ),
  generate_notes: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  generate_quiz: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  generate_flashcards: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  complete: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
};

export default function ProcessingStatus({
  steps,
  isProcessing,
  className = "",
}: ProcessingStatusProps) {
  const allDone = steps.every((s) => s.done);

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Processing your document</h3>
        {allDone ? (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd" />
            </svg>
            Complete
          </motion.span>
        ) : isProcessing ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="block"
            >
              ⟳
            </motion.span>
            Processing…
          </span>
        ) : null}
      </div>

      <ol className="space-y-3">
        {steps.map((step, idx) => {
          const isActive = !step.done && isProcessing && step.percent > 0;
          const isPending = !step.done && step.percent === 0;

          return (
            <motion.li
              key={step.step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              {/* Step icon circle */}
              <div
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  step.done
                    ? "bg-emerald-500 text-white"
                    : isActive
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-400",
                ].join(" ")}
              >
                {step.done ? (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </motion.svg>
                ) : isActive ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-3.5 w-3.5"
                  >
                    {stepIcons[step.step] ?? stepIcons.complete}
                  </motion.div>
                ) : (
                  <span className="opacity-50">{stepIcons[step.step] ?? stepIcons.complete}</span>
                )}
              </div>

              {/* Step details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-medium ${
                      step.done
                        ? "text-emerald-700"
                        : isActive
                        ? "text-indigo-700"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-indigo-500"
                      >
                        {step.percent}%
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Progress bar */}
                {!isPending && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      className={`h-full rounded-full ${step.done ? "bg-emerald-500" : "bg-indigo-500"}`}
                      initial={{ width: "0%" }}
                      animate={{ width: `${step.percent}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>

      {/* Completion message */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            🎉 Your document is ready! Navigate to Study Notes, Quiz, or Flashcards to begin learning.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
