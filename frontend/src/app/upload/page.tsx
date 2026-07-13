"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import DropZone from "@/components/upload/DropZone";
import ProcessingStatus from "@/components/upload/ProcessingStatus";
import LevelSelector from "@/components/common/LevelSelector";
import LanguageSelector from "@/components/common/LanguageSelector";
import { useDocument } from "@/hooks/useDocument";
import type { LearnerLevel, SupportedLanguage, Document } from "@/types";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function UploadProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex justify-between text-xs font-medium text-gray-500">
        <span>Uploading…</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="h-full rounded-full bg-indigo-500"
          initial={{ width: "0%" }}
          animate={{ width: `${percent}%` }}
          transition={{ ease: "easeOut", duration: 0.3 }}
        />
      </div>
    </div>
  );
}

function HistoryRow({ doc, onOpen }: { doc: Document; onOpen: (id: string) => void }) {
  const levelColors: Record<LearnerLevel, string> = {
    beginner: "bg-emerald-100 text-emerald-700",
    intermediate: "bg-blue-100 text-blue-700",
    advanced: "bg-violet-100 text-violet-700",
    expert: "bg-rose-100 text-rose-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-xl">
        📄
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">{doc.title}</p>
        <p className="text-xs text-gray-400">
          {formatDate(doc.uploadedAt)} · {formatBytes(doc.fileSize)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${levelColors[doc.level]}`}>
          {doc.level}
        </span>
        {doc.status === "ready" ? (
          <motion.button
            type="button"
            onClick={() => onOpen(doc.id)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Open
          </motion.button>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            {doc.status}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const {
    documents,
    isUploading,
    isProcessing,
    uploadProgress,
    processingSteps,
    error,
    uploadFile,
    clearError,
  } = useDocument();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [level, setLevel] = useState<LearnerLevel>("intermediate");
  const [language, setLanguage] = useState<SupportedLanguage>("english");

  const handleFileAccepted = useCallback((file: File) => {
    setSelectedFile(file);
    clearError();
  }, [clearError]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    const docId = await uploadFile(selectedFile, level, language);
    if (docId) {
      setSelectedFile(null);
      router.push(`/study/${docId}`);
    }
  }, [selectedFile, level, language, uploadFile, router]);

  const isActive = isUploading || isProcessing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white shadow-sm">
              🎓
            </div>
            <span className="text-lg font-bold text-gray-900">EduSimplify AI</span>
          </div>
          <nav className="flex items-center gap-2">
            <button
              onClick={() => router.push("/progress")}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              📊 Progress
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Upload your study material
          </h1>
          <p className="mt-3 text-base text-gray-500">
            Drop a PDF and get instant AI-generated notes, quizzes, flashcards &amp; more.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left column — upload form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Drop zone */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                1. Select PDF
              </h2>
              <DropZone
                onFileAccepted={handleFileAccepted}
                disabled={isActive}
              />
              {/* Selected file chip */}
              <AnimatePresence>
                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-3 flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-2.5"
                  >
                    <span className="text-xl">📄</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-indigo-800">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-indigo-500">{formatBytes(selectedFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="rounded-lg p-1 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload progress */}
              {isUploading && <UploadProgressBar percent={uploadProgress} />}
            </motion.div>

            {/* Level selector */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                2. Your knowledge level
              </h2>
              <LevelSelector value={level} onChange={setLevel} />
            </motion.div>

            {/* Language selector */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                3. Output language
              </h2>
              <LanguageSelector value={language} onChange={setLanguage} />
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <span>⚠️</span>
                  <span className="flex-1">{error}</span>
                  <button
                    type="button"
                    onClick={clearError}
                    className="rounded p-0.5 hover:bg-red-100"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload button */}
            <motion.button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isActive}
              whileHover={selectedFile && !isActive ? { scale: 1.02 } : {}}
              whileTap={selectedFile && !isActive ? { scale: 0.98 } : {}}
              className="w-full rounded-2xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {isUploading
                ? `Uploading… ${uploadProgress}%`
                : isProcessing
                ? "Processing…"
                : "🚀 Process Document"}
            </motion.button>
          </div>

          {/* Right column — processing status + history */}
          <div className="lg:col-span-2 space-y-6">
            {/* Processing status */}
            <AnimatePresence>
              {(isProcessing || processingSteps.some((s) => s.done)) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <ProcessingStatus steps={processingSteps} isProcessing={isProcessing} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload history */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-700">Recent uploads</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {documents.length}
                </span>
              </div>

              {documents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-gray-400">
                  <span className="text-3xl">📂</span>
                  <p className="text-sm">No documents yet. Upload one to get started!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.slice(0, 8).map((doc) => (
                    <HistoryRow
                      key={doc.id}
                      doc={doc}
                      onOpen={(id) => router.push(`/study/${id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Feature pills */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-500">
                What you'll get
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "📝 Study Notes",
                  "🧠 Key Concepts",
                  "❓ Quiz",
                  "🃏 Flashcards",
                  "📊 Mind Map",
                  "📋 Cheat Sheet",
                  "🤖 AI Tutor",
                ].map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
