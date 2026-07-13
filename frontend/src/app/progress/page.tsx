"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { UserProgress, Achievement, TopicMastery, WeakArea, QuizPerformanceEntry } from "@/types";

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_PROGRESS: UserProgress = {
  userId: "local-user",
  streak: 7,
  longestStreak: 14,
  totalDocumentsProcessed: 12,
  totalQuizzesTaken: 34,
  totalFlashcardsReviewed: 287,
  averageQuizScore: 72,
  quizHistory: [
    { date: "Mon", score: 65, total: 100, documentTitle: "Intro to ML" },
    { date: "Tue", score: 70, total: 100, documentTitle: "Neural Networks" },
    { date: "Wed", score: 55, total: 100, documentTitle: "Backpropagation" },
    { date: "Thu", score: 80, total: 100, documentTitle: "CNNs" },
    { date: "Fri", score: 88, total: 100, documentTitle: "Transformers" },
    { date: "Sat", score: 75, total: 100, documentTitle: "Attention" },
    { date: "Sun", score: 92, total: 100, documentTitle: "GPT Overview" },
  ],
  topicMastery: [
    { topic: "Neural Network Basics", masteryPercent: 85, questionsAttempted: 42, correctCount: 36 },
    { topic: "Backpropagation", masteryPercent: 62, questionsAttempted: 29, correctCount: 18 },
    { topic: "Activation Functions", masteryPercent: 90, questionsAttempted: 20, correctCount: 18 },
    { topic: "Regularisation", masteryPercent: 55, questionsAttempted: 22, correctCount: 12 },
    { topic: "Optimisation", masteryPercent: 48, questionsAttempted: 25, correctCount: 12 },
    { topic: "CNNs", masteryPercent: 73, questionsAttempted: 30, correctCount: 22 },
    { topic: "Transformers", masteryPercent: 38, questionsAttempted: 16, correctCount: 6 },
  ],
  weakAreas: [
    { topic: "Transformers", reason: "Low quiz score (38%) across 16 questions", recommendedAction: "Review the Attention Mechanism flashcards and re-take the Transformers quiz." },
    { topic: "Optimisation", reason: "Consistent mistakes on Adam vs SGD questions", recommendedAction: "Study the Optimisation cheat sheet and practice with the AI Tutor." },
    { topic: "Regularisation", reason: "Confusing dropout with batch normalisation", recommendedAction: "Re-read the Regularisation section of your Neural Networks notes." },
  ],
  achievements: [
    { id: "a1", title: "First Upload", description: "Uploaded your first document", icon: "📄", unlockedAt: "2024-01-15T10:00:00Z", locked: false },
    { id: "a2", title: "Quiz Master", description: "Score 90%+ on any quiz", icon: "🏆", unlockedAt: "2024-01-18T14:30:00Z", locked: false },
    { id: "a3", title: "7-Day Streak", description: "Study 7 days in a row", icon: "🔥", unlockedAt: "2024-01-21T09:00:00Z", locked: false },
    { id: "a4", title: "Card Collector", description: "Review 200+ flashcards", icon: "🃏", unlockedAt: "2024-01-22T16:00:00Z", locked: false },
    { id: "a5", title: "Deep Learner", description: "Process 10+ documents", icon: "🧠", unlockedAt: "2024-01-23T11:00:00Z", locked: false },
    { id: "a6", title: "30-Day Streak", description: "Study 30 days in a row", icon: "⚡", locked: true },
    { id: "a7", title: "Perfect Score", description: "Score 100% on any quiz", icon: "💯", locked: true },
    { id: "a8", title: "Polyglot", description: "Study in 3+ languages", icon: "🌍", locked: true },
  ],
  lastUpdated: new Date().toISOString(),
};

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

function BarChart({ data }: { data: QuizPerformanceEntry[] }) {
  const maxVal = 100;
  const barWidth = 32;
  const gap = 12;
  const chartH = 140;
  const chartW = data.length * (barWidth + gap) - gap;
  const paddingBottom = 28;
  const paddingLeft = 30;

  return (
    <div className="overflow-x-auto">
      <svg
        width={chartW + paddingLeft + 16}
        height={chartH + paddingBottom + 8}
        className="select-none"
      >
        {/* Y-axis guidelines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = chartH - (v / maxVal) * chartH;
          return (
            <g key={v}>
              <line
                x1={paddingLeft}
                x2={chartW + paddingLeft}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <text x={paddingLeft - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">
                {v}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((entry, i) => {
          const x = paddingLeft + i * (barWidth + gap);
          const pct = (entry.score / entry.total) * 100;
          const barH = (pct / maxVal) * chartH;
          const y = chartH - barH;
          const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";

          return (
            <g key={entry.date}>
              {/* Bar background */}
              <rect x={x} y={0} width={barWidth} height={chartH} rx={6} fill="#f3f4f6" />
              {/* Animated fill */}
              <motion.rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={6}
                fill={color}
                initial={{ height: 0, y: chartH }}
                animate={{ height: barH, y }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }}
              />
              {/* Score label */}
              <motion.text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={9}
                fontWeight="600"
                fill="#374151"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08 + 0.6 }}
              >
                {pct.toFixed(0)}%
              </motion.text>
              {/* Day label */}
              <text
                x={x + barWidth / 2}
                y={chartH + paddingBottom - 8}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {entry.date}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Mastery bar ───────────────────────────────────────────────────────────────

function MasteryBar({ topic }: { topic: TopicMastery }) {
  const color =
    topic.masteryPercent >= 80
      ? "bg-emerald-500"
      : topic.masteryPercent >= 60
      ? "bg-blue-500"
      : topic.masteryPercent >= 40
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{topic.topic}</span>
        <span className="text-xs font-semibold text-gray-500">{topic.masteryPercent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${topic.masteryPercent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {topic.correctCount}/{topic.questionsAttempted} correct
      </p>
    </div>
  );
}

// ── Achievement badge ─────────────────────────────────────────────────────────

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <motion.div
      whileHover={achievement.locked ? {} : { scale: 1.06 }}
      className={[
        "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all",
        achievement.locked
          ? "border-gray-100 bg-gray-50 opacity-50 grayscale"
          : "border-indigo-100 bg-white shadow-sm",
      ].join(" ")}
      title={achievement.locked ? `Locked: ${achievement.description}` : achievement.description}
    >
      <span className="text-2xl">{achievement.locked ? "🔒" : achievement.icon}</span>
      <div>
        <p className="text-xs font-bold text-gray-800">{achievement.title}</p>
        <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{achievement.description}</p>
      </div>
      {achievement.unlockedAt && !achievement.locked && (
        <p className="text-xs text-indigo-400">
          {new Intl.DateTimeFormat("en-GB", { dateStyle: "short" }).format(new Date(achievement.unlockedAt))}
        </p>
      )}
    </motion.div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color} text-xl`}>
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="mt-0.5 text-sm text-gray-500">{label}</p>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const router = useRouter();
  const progress = DEMO_PROGRESS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/10">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.push("/upload")}
            className="rounded-xl px-2 py-1.5 text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h1 className="text-base font-bold text-gray-900">My Progress</h1>
          </div>
          <p className="ml-auto text-xs text-gray-400">
            Last updated{" "}
            {new Intl.DateTimeFormat("en-GB", { dateStyle: "short" }).format(new Date(progress.lastUpdated))}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        {/* Streak banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4 rounded-3xl bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white shadow-lg"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-5xl"
          >
            🔥
          </motion.div>
          <div>
            <p className="text-sm font-semibold opacity-90">Current streak</p>
            <p className="text-4xl font-extrabold">{progress.streak} days</p>
            <p className="text-sm opacity-75">Longest streak: {progress.longestStreak} days</p>
          </div>
          <div className="ml-auto hidden flex-col items-end gap-1 sm:flex">
            <p className="text-xs opacity-75">Keep it going!</p>
            <div className="flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-6 w-6 rounded-lg ${
                    i < progress.streak ? "bg-white/30" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon="📄" value={progress.totalDocumentsProcessed} label="Documents Processed" color="bg-blue-100" />
          <StatCard icon="❓" value={progress.totalQuizzesTaken} label="Quizzes Taken" color="bg-violet-100" />
          <StatCard icon="🃏" value={progress.totalFlashcardsReviewed} label="Flashcards Reviewed" color="bg-amber-100" />
          <StatCard icon="🎯" value={`${progress.averageQuizScore}%`} label="Average Quiz Score" color="bg-emerald-100" />
        </div>

        {/* Quiz performance chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">📈 Quiz Performance (Last 7 days)</h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> ≥80%</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> ≥60%</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> &lt;60%</span>
            </div>
          </div>
          <BarChart data={progress.quizHistory} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Topic mastery */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-base font-bold text-gray-900">🧠 Topic Mastery</h2>
            <div className="space-y-4">
              {progress.topicMastery.map((topic) => (
                <MasteryBar key={topic.topic} topic={topic} />
              ))}
            </div>
          </div>

          {/* Weak areas */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-base font-bold text-gray-900">⚠️ Weak Areas</h2>
            <div className="space-y-4">
              {progress.weakAreas.map((area, i) => (
                <motion.div
                  key={area.topic}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border border-red-100 bg-red-50 p-4"
                >
                  <p className="font-semibold text-red-800">{area.topic}</p>
                  <p className="mt-0.5 text-xs text-red-600">{area.reason}</p>
                  <div className="mt-2 flex items-start gap-2 rounded-xl bg-white px-3 py-2">
                    <span className="text-sm">💡</span>
                    <p className="text-xs text-gray-700">{area.recommendedAction}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">🏅 Achievements</h2>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {progress.achievements.filter((a) => !a.locked).length} / {progress.achievements.length} unlocked
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {progress.achievements.map((achievement, i) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
              >
                <AchievementBadge achievement={achievement} />
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
