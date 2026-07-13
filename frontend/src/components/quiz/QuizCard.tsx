"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { QuizQuestion, MCQOption } from "@/types";

interface QuizCardProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string) => void;
  submitted: boolean;
  userAnswer?: string;
}

function DifficultyBadge({ difficulty }: { difficulty: QuizQuestion["difficulty"] }) {
  const map = {
    easy: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    hard: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[difficulty]}`}>
      {difficulty}
    </span>
  );
}

// ── MCQ ─────────────────────────────────────────────────────────────────────

function MCQOptions({
  options,
  selected,
  submitted,
  onSelect,
}: {
  options: MCQOption[];
  selected: string;
  submitted: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-4 space-y-2">
      {options.map((opt, i) => {
        const isSelected = selected === opt.id;
        const isCorrect = opt.isCorrect;
        const label = String.fromCharCode(65 + i); // A, B, C, D

        let style = "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50";
        if (submitted) {
          if (isCorrect) style = "border-emerald-400 bg-emerald-50 text-emerald-800";
          else if (isSelected) style = "border-red-400 bg-red-50 text-red-800";
          else style = "border-gray-100 bg-gray-50 text-gray-400";
        } else if (isSelected) {
          style = "border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm";
        }

        return (
          <motion.button
            key={opt.id}
            type="button"
            disabled={submitted}
            onClick={() => !submitted && onSelect(opt.id)}
            whileHover={submitted ? {} : { scale: 1.01 }}
            whileTap={submitted ? {} : { scale: 0.99 }}
            className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${style}`}
          >
            <span
              className={[
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                submitted && isCorrect
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : submitted && isSelected
                  ? "border-red-500 bg-red-500 text-white"
                  : isSelected
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-current",
              ].join(" ")}
            >
              {submitted && isCorrect ? "✓" : submitted && isSelected ? "✗" : label}
            </span>
            {opt.text}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── True / False ──────────────────────────────────────────────────────────────

function TrueFalseOptions({
  selected,
  submitted,
  correctAnswer,
  onSelect,
}: {
  selected: string;
  submitted: boolean;
  correctAnswer: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="mt-4 flex gap-3">
      {["True", "False"].map((opt) => {
        const isSelected = selected === opt;
        const isCorrect = opt === correctAnswer;

        let style = "border-gray-200 bg-white text-gray-700 hover:border-indigo-300";
        if (submitted) {
          if (isCorrect) style = "border-emerald-400 bg-emerald-50 text-emerald-800";
          else if (isSelected) style = "border-red-400 bg-red-50 text-red-800";
          else style = "border-gray-100 bg-gray-50 text-gray-400";
        } else if (isSelected) {
          style = "border-indigo-500 bg-indigo-50 text-indigo-800";
        }

        return (
          <motion.button
            key={opt}
            type="button"
            disabled={submitted}
            onClick={() => !submitted && onSelect(opt)}
            whileHover={submitted ? {} : { scale: 1.03 }}
            whileTap={submitted ? {} : { scale: 0.97 }}
            className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all focus:outline-none ${style}`}
          >
            {opt === "True" ? "✅ True" : "❌ False"}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Short Answer ──────────────────────────────────────────────────────────────

function ShortAnswerInput({
  value,
  submitted,
  onChange,
}: {
  value: string;
  submitted: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      disabled={submitted}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      placeholder="Type your answer here…"
      className="mt-4 w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-50 disabled:text-gray-400"
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function QuizCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  submitted,
  userAnswer = "",
}: QuizCardProps) {
  const [localAnswer, setLocalAnswer] = useState(userAnswer);

  const handleSubmit = () => {
    if (!localAnswer.trim()) return;
    onAnswer(localAnswer);
  };

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="flex items-center gap-2">
          <DifficultyBadge difficulty={question.difficulty} />
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            {question.topic}
          </span>
        </div>
      </div>

      {/* Question body */}
      <div className="px-6 py-5">
        <p className="text-base font-semibold leading-relaxed text-gray-800">
          {question.question}
        </p>

        {/* Answer input */}
        {question.type === "mcq" && question.options && (
          <MCQOptions
            options={question.options}
            selected={localAnswer}
            submitted={submitted}
            onSelect={setLocalAnswer}
          />
        )}

        {question.type === "true_false" && (
          <TrueFalseOptions
            selected={localAnswer}
            submitted={submitted}
            correctAnswer={question.correctAnswer}
            onSelect={setLocalAnswer}
          />
        )}

        {question.type === "short_answer" && (
          <ShortAnswerInput
            value={localAnswer}
            submitted={submitted}
            onChange={setLocalAnswer}
          />
        )}

        {/* Submit button */}
        {!submitted && (
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={!localAnswer.trim()}
            whileHover={localAnswer.trim() ? { scale: 1.02 } : {}}
            whileTap={localAnswer.trim() ? { scale: 0.97 } : {}}
            className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Submit Answer
          </motion.button>
        )}

        {/* Explanation */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 overflow-hidden"
            >
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-500">
                  Explanation
                </p>
                <p className="text-sm text-indigo-900">{question.explanation}</p>
                <p className="mt-2 text-xs text-indigo-600 font-medium">
                  Correct answer:{" "}
                  <span className="font-bold">{question.correctAnswer}</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
