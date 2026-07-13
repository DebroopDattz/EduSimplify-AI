"use client";

import { motion } from "framer-motion";
import type { LearnerLevel } from "@/types";

interface LevelInfo {
  value: LearnerLevel;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
}

const LEVELS: LevelInfo[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "New to the topic — clear explanations with lots of examples",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-400",
    emoji: "🌱",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Some background knowledge — balanced depth and clarity",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    emoji: "📘",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Strong foundation — technical detail and nuanced concepts",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-400",
    emoji: "🔬",
  },
  {
    value: "expert",
    label: "Expert",
    description: "Deep expertise — concise, high-density, research-level notes",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-400",
    emoji: "🏆",
  },
];

interface LevelSelectorProps {
  value: LearnerLevel;
  onChange: (level: LearnerLevel) => void;
  className?: string;
}

export default function LevelSelector({
  value,
  onChange,
  className = "",
}: LevelSelectorProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>
      {LEVELS.map((level) => {
        const selected = value === level.value;
        return (
          <motion.button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={[
              "relative flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              selected
                ? `${level.bgColor} ${level.borderColor} shadow-sm`
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
            ].join(" ")}
            aria-pressed={selected}
          >
            {selected && (
              <motion.span
                layoutId="level-indicator"
                className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-current"
                style={{ color: "inherit" }}
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <svg
                  className="h-2.5 w-2.5 text-white"
                  viewBox="0 0 10 10"
                  fill="currentColor"
                >
                  <path d="M8.5 2.5L4 7 1.5 4.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.span>
            )}
            <span className="text-xl">{level.emoji}</span>
            <span
              className={`text-sm font-semibold ${selected ? level.color : "text-gray-700"}`}
            >
              {level.label}
            </span>
            <span className="text-xs leading-snug text-gray-500">
              {level.description}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export { LEVELS };
