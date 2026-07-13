"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Flashcard, FlashcardStatus } from "@/types";

interface FlipCardProps {
  card: Flashcard;
  onStatusChange: (id: string, status: FlashcardStatus) => void;
}

export default function FlipCard({ card, onStatusChange }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [exitDirection, setExitDirection] = useState(0);

  const flip = useCallback(() => setIsFlipped((v) => !v), []);

  const markMastered = useCallback(() => {
    setExitDirection(1);
    onStatusChange(card.id, "mastered");
  }, [card.id, onStatusChange]);

  const markReview = useCallback(() => {
    setExitDirection(-1);
    onStatusChange(card.id, "reviewing");
  }, [card.id, onStatusChange]);

  const statusColor = {
    new: "bg-gray-100 text-gray-600",
    reviewing: "bg-amber-100 text-amber-700",
    mastered: "bg-emerald-100 text-emerald-700",
  }[card.status];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Card wrapper — 3D perspective */}
      <div
        className="relative h-64 w-full max-w-lg cursor-pointer select-none"
        style={{ perspective: "1000px" }}
        onClick={flip}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? "Show question" : "Show answer (Space)"}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } }}
      >
        {/* Front face — question */}
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
          style={{ backfaceVisibility: "hidden", transformStyle: "preserve-3d" }}
          className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-indigo-100 bg-white p-8 shadow-xl"
        >
          <span className="mb-4 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
            {card.topic}
          </span>
          <p className="text-center text-lg font-semibold text-gray-800">{card.front}</p>
          <p className="mt-4 text-xs text-gray-400">Click or press Space to reveal answer</p>
        </motion.div>

        {/* Back face — answer */}
        <motion.div
          animate={{ rotateY: isFlipped ? 0 : -180 }}
          transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
          style={{
            backfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
            rotateY: -180,
          }}
          className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 shadow-xl"
        >
          <span className="mb-4 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Answer
          </span>
          <p className="text-center text-base leading-relaxed text-gray-800">{card.back}</p>
        </motion.div>
      </div>

      {/* Status badge */}
      <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColor}`}>
        {card.status === "new" ? "🆕 New" : card.status === "reviewing" ? "🔄 Reviewing" : "✅ Mastered"}
      </span>

      {/* Action buttons — only show when flipped */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="flex gap-3"
          >
            <motion.button
              type="button"
              onClick={(e) => { e.stopPropagation(); markReview(); }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              🔄 Still learning
            </motion.button>
            <motion.button
              type="button"
              onClick={(e) => { e.stopPropagation(); markMastered(); }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              ✅ Mastered!
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
