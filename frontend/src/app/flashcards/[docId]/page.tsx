"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import FlipCard from "@/components/flashcards/FlipCard";
import type { Flashcard, FlashcardDeck, FlashcardStatus } from "@/types";

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_CARDS: Flashcard[] = [
  { id: "c1", documentId: "demo", front: "What is a neural network?", back: "A computational model inspired by the brain, consisting of layers of interconnected nodes (neurons) that process data and learn patterns by adjusting weights.", topic: "Fundamentals", status: "new", reviewCount: 0, difficulty: "easy" },
  { id: "c2", documentId: "demo", front: "What is backpropagation?", back: "An algorithm that computes gradients of the loss function with respect to each weight by applying the chain rule backwards through the network, enabling weight updates via gradient descent.", topic: "Training", status: "new", reviewCount: 0, difficulty: "medium" },
  { id: "c3", documentId: "demo", front: "What is the ReLU activation function?", back: "Rectified Linear Unit: f(x) = max(0, x). Outputs the input directly if positive, otherwise outputs zero. It avoids the vanishing gradient problem and is the most widely used activation function.", topic: "Activation Functions", status: "new", reviewCount: 0, difficulty: "easy" },
  { id: "c4", documentId: "demo", front: "What is overfitting?", back: "When a model memorises training data including noise, achieving high training accuracy but poor performance on unseen data. Prevented by dropout, regularisation, and early stopping.", topic: "Model Evaluation", status: "new", reviewCount: 0, difficulty: "medium" },
  { id: "c5", documentId: "demo", front: "What is the vanishing gradient problem?", back: "In deep networks, gradients become exponentially small during backpropagation through many layers (especially with Sigmoid/Tanh), making early layers learn extremely slowly.", topic: "Training", status: "new", reviewCount: 0, difficulty: "hard" },
  { id: "c6", documentId: "demo", front: "What is dropout regularisation?", back: "A technique where random neurons are 'dropped' (set to zero) during training with probability p. This forces the network to learn redundant representations and reduces overfitting.", topic: "Regularisation", status: "new", reviewCount: 0, difficulty: "medium" },
  { id: "c7", documentId: "demo", front: "What is a loss function?", back: "A function that quantifies the difference between the model's predictions and the actual target values. Common examples: Mean Squared Error (regression), Cross-Entropy (classification).", topic: "Fundamentals", status: "new", reviewCount: 0, difficulty: "easy" },
  { id: "c8", documentId: "demo", front: "What is gradient descent?", back: "An optimisation algorithm that iteratively adjusts model parameters in the direction of the negative gradient of the loss function to find the minimum loss.", topic: "Training", status: "new", reviewCount: 0, difficulty: "medium" },
];

const DEMO_DECK: FlashcardDeck = {
  id: "deck-1",
  documentId: "demo",
  title: "Neural Networks Flashcards",
  cards: DEMO_CARDS,
  createdAt: new Date().toISOString(),
  masteredCount: 0,
  reviewingCount: 0,
  newCount: DEMO_CARDS.length,
};

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ cards }: { cards: Flashcard[] }) {
  const mastered = cards.filter((c) => c.status === "mastered").length;
  const reviewing = cards.filter((c) => c.status === "reviewing").length;
  const newCount = cards.filter((c) => c.status === "new").length;
  const total = cards.length;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-sm font-medium text-gray-700">{mastered} Mastered</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-sm font-medium text-gray-700">{reviewing} Reviewing</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-gray-300" />
        <span className="text-sm font-medium text-gray-700">{newCount} New</span>
      </div>
      <div className="ml-auto text-sm text-gray-400">
        {total > 0 ? Math.round((mastered / total) * 100) : 0}% complete
      </div>

      {/* Progress bar */}
      <div className="hidden w-24 overflow-hidden rounded-full bg-gray-100 h-2 sm:block">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${total > 0 ? (mastered / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FlashcardsPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;

  const [deck, setDeck] = useState<FlashcardDeck>(DEMO_DECK);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<FlashcardStatus | "all">("all");

  const filteredCards = filter === "all" ? deck.cards : deck.cards.filter((c) => c.status === filter);
  const safeIndex = Math.min(currentIndex, Math.max(0, filteredCards.length - 1));
  const currentCard = filteredCards[safeIndex] ?? null;

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(i + 1, filteredCards.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(i - 1, 0));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [filteredCards.length]);

  const handleStatusChange = useCallback((id: string, status: FlashcardStatus) => {
    setDeck((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === id ? { ...c, status, reviewCount: c.reviewCount + 1, lastReviewedAt: new Date().toISOString() } : c
      ),
    }));
    // Move to next card after a short delay
    setTimeout(() => {
      setCurrentIndex((i) => {
        const nextFiltered = filter === "all" ? deck.cards : deck.cards.filter((c) => c.status === filter);
        return Math.min(i + 1, nextFiltered.length - 1);
      });
    }, 300);
  }, [filter, deck.cards]);

  const exportCSV = useCallback(() => {
    const header = "Front,Back,Topic,Status,Review Count";
    const rows = deck.cards.map((c) =>
      [
        `"${c.front.replace(/"/g, '""')}"`,
        `"${c.back.replace(/"/g, '""')}"`,
        c.topic,
        c.status,
        c.reviewCount,
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${deck.title}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [deck]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/10">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.push(`/study/${docId}`)}
            className="rounded-xl px-2 py-1.5 text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🃏</span>
            <h1 className="text-sm font-bold text-gray-900">{deck.title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <motion.button
              type="button"
              onClick={exportCSV}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-gray-300"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </motion.button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-6">
        {/* Stats */}
        <StatsBar cards={deck.cards} />

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1">
          {([
            { value: "all", label: "All Cards", count: deck.cards.length },
            { value: "new", label: "New", count: deck.cards.filter((c) => c.status === "new").length },
            { value: "reviewing", label: "Reviewing", count: deck.cards.filter((c) => c.status === "reviewing").length },
            { value: "mastered", label: "Mastered", count: deck.cards.filter((c) => c.status === "mastered").length },
          ] as const).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setFilter(tab.value); setCurrentIndex(0); }}
              className={[
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all",
                filter === tab.value
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 text-xs ${filter === tab.value ? "bg-indigo-100 text-indigo-600" : "bg-gray-200 text-gray-500"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Card display */}
        {filteredCards.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-400">
            <span className="text-4xl">🃏</span>
            <p className="text-sm">No cards in this category.</p>
          </div>
        ) : currentCard ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <FlipCard card={currentCard} onStatusChange={handleStatusChange} />
            </motion.div>
          </AnimatePresence>
        ) : null}

        {/* Navigation */}
        {filteredCards.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <motion.button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
              disabled={safeIndex === 0}
              whileHover={safeIndex > 0 ? { scale: 1.06 } : {}}
              whileTap={safeIndex > 0 ? { scale: 0.94 } : {}}
              className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition-all hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </motion.button>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 overflow-hidden max-w-xs">
              {filteredCards.slice(0, 12).map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={[
                    "h-2 rounded-full transition-all duration-300",
                    i === safeIndex ? "w-6 bg-indigo-600" : "w-2 bg-gray-300 hover:bg-gray-400",
                  ].join(" ")}
                />
              ))}
              {filteredCards.length > 12 && (
                <span className="text-xs text-gray-400">+{filteredCards.length - 12}</span>
              )}
            </div>

            <motion.button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.min(i + 1, filteredCards.length - 1))}
              disabled={safeIndex === filteredCards.length - 1}
              whileHover={safeIndex < filteredCards.length - 1 ? { scale: 1.06 } : {}}
              whileTap={safeIndex < filteredCards.length - 1 ? { scale: 0.94 } : {}}
              className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition-all hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>
        )}

        {/* Keyboard tip */}
        <p className="text-center text-xs text-gray-400">
          ← → arrow keys to navigate · Space / Enter to flip · Click ✅ or 🔄 after revealing
        </p>
      </main>
    </div>
  );
}
