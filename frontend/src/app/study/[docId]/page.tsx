"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDocument } from "@/hooks/useDocument";
import NoteCard from "@/components/study/NoteCard";
import ConceptHighlighter from "@/components/study/ConceptHighlighter";
import ExportButtons from "@/components/common/ExportButtons";
import type { StudyNote, LearnerLevel, NoteSection } from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "notes" | "concepts" | "summary";

// ── Mock data for demo ────────────────────────────────────────────────────────

const DEMO_NOTE: StudyNote = {
  id: "demo-note-1",
  documentId: "demo-id",
  title: "Introduction to Neural Networks",
  level: "intermediate",
  language: "english",
  generatedAt: new Date().toISOString(),
  tags: ["AI", "Machine Learning", "Neural Networks", "Deep Learning"],
  sections: [
    {
      id: "s1",
      type: "overview",
      title: "Overview",
      content:
        "A neural network is a computational model inspired by the structure and function of the human brain. It consists of interconnected layers of nodes (neurons) that process information using connected nodes. Neural networks are the backbone of modern AI applications, from image recognition to natural language processing.",
    },
    {
      id: "s2",
      type: "learning_objectives",
      title: "Learning Objectives",
      content:
        "By the end of this section, you will be able to:\n• Explain the basic structure of a neural network\n• Describe how forward propagation works\n• Understand the role of activation functions\n• Understand the concept of backpropagation\n• Identify common neural network architectures",
    },
    {
      id: "s3",
      type: "key_concepts",
      title: "Key Concepts",
      content: "The following core concepts are essential for understanding neural networks:",
      keyConcepts: [
        {
          term: "Neuron (Node)",
          definition: "The basic computing unit that receives inputs, applies a weight, adds a bias, and passes through an activation function.",
          example: "A neuron checking if a pixel is bright or dark in image recognition.",
        },
        {
          term: "Weights & Biases",
          definition: "Learnable parameters that determine the strength and shift of connections between neurons.",
          example: "A weight of 0.8 means that input strongly influences the output.",
        },
        {
          term: "Activation Function",
          definition: "A function applied to a neuron's output to introduce non-linearity, enabling the network to learn complex patterns.",
          example: "ReLU: f(x) = max(0, x) — outputs 0 for negative values and x for positive.",
        },
        {
          term: "Backpropagation",
          definition: "The algorithm used to calculate gradients and update weights by propagating the error backwards through the network.",
          example: "If prediction = 0.9 but actual = 1.0, error is 0.1 — backprop updates weights to reduce this.",
        },
      ],
      mermaid: `graph LR\n  I1[Input 1] --> H1[Hidden 1]\n  I2[Input 2] --> H1\n  I1 --> H2[Hidden 2]\n  I2 --> H2\n  H1 --> O[Output]\n  H2 --> O`,
    },
    {
      id: "s4",
      type: "examples",
      title: "Examples",
      content:
        "Example 1: Image Classification\nInput: 28×28 pixel image of a handwritten digit.\nProcess: Pixels → input layer → hidden layers extract edges/shapes → output layer predicts digit 0–9.\n\nExample 2: Sentiment Analysis\nInput: 'This movie was amazing!'\nProcess: Word embeddings → LSTM layers → output: Positive (0.97 confidence)",
    },
    {
      id: "s5",
      type: "common_mistakes",
      title: "Common Mistakes",
      content:
        "• Overfitting: The model memorises training data but fails on new data. Fix: use dropout or regularisation.\n• Vanishing Gradients: Gradients become too small in deep networks, slowing learning. Fix: use ReLU instead of sigmoid.\n• Wrong learning rate: Too high causes divergence; too low causes very slow convergence.\n• Not normalising inputs: Raw pixel values (0–255) slow training. Always normalise to [0, 1] or standardise.",
    },
    {
      id: "s6",
      type: "applications",
      title: "Real-World Applications",
      content:
        "• Computer Vision: Self-driving cars, medical image diagnosis (detecting tumours from X-rays)\n• NLP: ChatGPT, Google Translate, document summarisation\n• Finance: Fraud detection, algorithmic trading\n• Healthcare: Drug discovery, protein structure prediction (AlphaFold)\n• Recommendation Systems: Netflix, Spotify, Amazon",
    },
    {
      id: "s7",
      type: "summary",
      title: "Summary",
      content:
        "Neural networks are layered computational models that learn from data by adjusting weights through backpropagation. Key components include neurons, activation functions, and loss functions. They excel at pattern recognition in high-dimensional data and form the foundation of modern AI — from vision systems to large language models.",
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const levelMeta: Record<LearnerLevel, { label: string; color: string }> = {
  beginner: { label: "Beginner", color: "bg-emerald-100 text-emerald-700" },
  intermediate: { label: "Intermediate", color: "bg-blue-100 text-blue-700" },
  advanced: { label: "Advanced", color: "bg-violet-100 text-violet-700" },
  expert: { label: "Expert", color: "bg-rose-100 text-rose-700" },
};

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "notes", label: "Notes", icon: "📝" },
  { id: "concepts", label: "Concepts", icon: "🔑" },
  { id: "summary", label: "Summary", icon: "📋" },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────

function NoteSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
            className="mb-3 h-4 w-1/3 rounded-full bg-gray-200"
          />
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-gray-100" />
            <div className="h-3 w-5/6 rounded-full bg-gray-100" />
            <div className="h-3 w-4/6 rounded-full bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Action panel ──────────────────────────────────────────────────────────────

function ActionPanel({
  docId,
  router,
}: {
  docId: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Study tools</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: "🤖", label: "AI Tutor", href: `/chat/${docId}` },
          { icon: "❓", label: "Quiz", href: `/quiz/${docId}` },
          { icon: "🃏", label: "Flashcards", href: `/flashcards/${docId}` },
          { icon: "📊", label: "Revision", href: `/revision/${docId}` },
        ].map((item) => (
          <motion.button
            key={item.href}
            type="button"
            onClick={() => router.push(item.href)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 py-3 text-xs font-semibold text-gray-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;
  const { fetchStudyNote } = useDocument();

  const [note, setNote] = useState<StudyNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("notes");
  const [highlightResponse, setHighlightResponse] = useState<{ action: string; text: string; result: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    // Try to fetch real data; fall back to demo after a brief delay
    const timer = setTimeout(() => {
      setNote(DEMO_NOTE);
      setLoading(false);
    }, 1200);

    fetchStudyNote(docId).then((/* data */) => {
      // In real integration: setNote(data); setLoading(false); clearTimeout(timer)
    });

    return () => clearTimeout(timer);
  }, [docId, fetchStudyNote]);

  const handleConceptAction = useCallback(
    (action: string, selectedText: string) => {
      const resultMap: Record<string, string> = {
        explain: `**Explanation:** "${selectedText}" refers to a concept where the system learns to identify patterns by adjusting internal parameters (weights) through a feedback process. Think of it as a student studying from mistakes until they get it right.`,
        simplify: `**Simplified:** "${selectedText}" just means the computer is adjusting its "guesses" to get better answers over time — like fine-tuning a radio until you hear the station clearly.`,
        analogy: `**Analogy for "${selectedText}":** It's like a chef tasting a dish and adding more salt or spice until it tastes perfect — each adjustment brings the result closer to ideal.`,
        example: `**Real-world example:** In spam detection, "${selectedText}" is used so that every time the filter incorrectly marks a real email as spam, it learns from that mistake and becomes more accurate next time.`,
      };
      setHighlightResponse({
        action,
        text: selectedText,
        result: resultMap[action] ?? `Understanding "${selectedText}" in context…`,
      });
    },
    []
  );

  const handleExportMarkdown = useCallback(() => {
    if (!note) return;
    const md = note.sections.map((s) => `## ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${note.title}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [note]);

  const handleCopy = useCallback(async () => {
    if (!note) return;
    const text = note.sections.map((s) => `${s.title}\n\n${s.content}`).join("\n\n");
    await navigator.clipboard.writeText(text);
  }, [note]);

  const conceptSections = note?.sections.filter((s) => s.keyConcepts?.length) ?? [];
  const summarySections = note?.sections.filter((s) => s.type === "summary" || s.type === "overview") ?? [];
  const noteSections: NoteSection[] = note?.sections ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/10">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.push("/upload")}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-sm font-bold text-gray-900 sm:text-base">
              {note?.title ?? "Loading…"}
            </h1>
          </div>
          {note && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelMeta[note.level].color}`}>
              {levelMeta[note.level].label}
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Metadata bar */}
            {note && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center gap-2"
              >
                {note.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    {tag}
                  </span>
                ))}
                <span className="ml-auto text-xs text-gray-400">
                  Generated {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(note.generatedAt))}
                </span>
              </motion.div>
            )}

            {/* Export */}
            {note && (
              <ExportButtons
                onExportMarkdown={handleExportMarkdown}
                onCopy={handleCopy}
                showDOCX={false}
              />
            )}

            {/* Tabs */}
            <div className="flex gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all",
                    activeTab === tab.id
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700",
                  ].join(" ")}
                >
                  {tab.icon} {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 rounded-xl bg-white shadow-sm"
                      style={{ zIndex: -1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <NoteSkeleton />
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "notes" && (
                    <ConceptHighlighter onAction={handleConceptAction}>
                      <div className="space-y-3">
                        {noteSections.map((section, i) => (
                          <NoteCard key={section.id} section={section} defaultOpen={i < 2} />
                        ))}
                      </div>
                    </ConceptHighlighter>
                  )}

                  {activeTab === "concepts" && (
                    <div className="space-y-3">
                      {conceptSections.length === 0 ? (
                        <p className="py-8 text-center text-gray-400">No concept sections available.</p>
                      ) : (
                        conceptSections.map((section) => (
                          <NoteCard key={section.id} section={section} defaultOpen />
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "summary" && (
                    <div className="space-y-3">
                      {summarySections.map((section) => (
                        <NoteCard key={section.id} section={section} defaultOpen />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Highlight response panel */}
            <AnimatePresence>
              {highlightResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">
                      AI Response — {highlightResponse.action}
                    </p>
                    <button
                      type="button"
                      onClick={() => setHighlightResponse(null)}
                      className="rounded p-1 text-indigo-400 hover:bg-indigo-100"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <blockquote className="mb-2 border-l-4 border-indigo-300 pl-3 text-xs italic text-indigo-600">
                    "{highlightResponse.text}"
                  </blockquote>
                  <p className="text-sm text-indigo-900 whitespace-pre-wrap">{highlightResponse.result}</p>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="mt-3 text-xs font-medium text-indigo-500 underline hover:text-indigo-700"
                  >
                    Continue this in AI Tutor →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {note && <ActionPanel docId={docId} router={router} />}

            {/* Tip */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700">
              <p className="font-bold">💡 Pro tip</p>
              <p className="mt-1">
                Select any text in the notes to get an AI explanation, simplification, analogy, or real-world example.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
