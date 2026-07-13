"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import QuizCard from "@/components/quiz/QuizCard";
import type { Quiz, QuizAttempt, QuizResult, QuizSettings, QuizQuestion, MCQOption } from "@/types";

// ── Demo data ─────────────────────────────────────────────────────────────────

function makeOption(id: string, text: string, isCorrect: boolean): MCQOption {
  return { id, text, isCorrect };
}

const DEMO_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    type: "mcq",
    question: "What is the primary purpose of an activation function in a neural network?",
    options: [
      makeOption("a", "To initialise weights to zero", false),
      makeOption("b", "To introduce non-linearity into the network", true),
      makeOption("c", "To reduce the number of layers", false),
      makeOption("d", "To normalise the input data", false),
    ],
    correctAnswer: "To introduce non-linearity into the network",
    explanation: "Activation functions like ReLU, Sigmoid, and Tanh introduce non-linearity, allowing the network to learn complex patterns beyond simple linear relationships.",
    difficulty: "medium",
    topic: "Neural Networks",
    pointValue: 10,
  },
  {
    id: "q2",
    type: "true_false",
    question: "Backpropagation is used to update the weights of a neural network by computing gradients of the loss function.",
    correctAnswer: "True",
    explanation: "Backpropagation calculates the gradient of the loss function with respect to each weight by applying the chain rule, enabling gradient descent to update weights efficiently.",
    difficulty: "easy",
    topic: "Training",
    pointValue: 5,
  },
  {
    id: "q3",
    type: "mcq",
    question: "Which of the following best describes 'overfitting' in machine learning?",
    options: [
      makeOption("a", "The model performs well on training data but poorly on new data", true),
      makeOption("b", "The model is trained for too few epochs", false),
      makeOption("c", "The learning rate is set too low", false),
      makeOption("d", "The model has too few parameters", false),
    ],
    correctAnswer: "The model performs well on training data but poorly on new data",
    explanation: "Overfitting occurs when a model memorises the training data including noise, leading to poor generalisation. Common fixes include dropout, L2 regularisation, and early stopping.",
    difficulty: "medium",
    topic: "Model Evaluation",
    pointValue: 10,
  },
  {
    id: "q4",
    type: "true_false",
    question: "The vanishing gradient problem is more common in networks using ReLU than those using Sigmoid activation functions.",
    correctAnswer: "False",
    explanation: "The vanishing gradient problem is more prevalent in Sigmoid and Tanh activations because their gradients saturate near 0 or 1. ReLU avoids this for positive inputs by having a constant gradient of 1.",
    difficulty: "hard",
    topic: "Training",
    pointValue: 15,
  },
  {
    id: "q5",
    type: "short_answer",
    question: "Name two techniques used to prevent overfitting in deep learning models.",
    correctAnswer: "Dropout and L2 Regularisation (also accept: early stopping, data augmentation, batch normalisation)",
    explanation: "Dropout randomly deactivates neurons during training, forcing the network to learn redundant representations. L2 regularisation adds a penalty term to the loss function proportional to the magnitude of weights.",
    difficulty: "medium",
    topic: "Regularisation",
    pointValue: 10,
  },
];

const DEMO_QUIZ: Quiz = {
  id: "demo-quiz-1",
  documentId: "demo-id",
  title: "Neural Networks Quiz",
  questions: DEMO_QUESTIONS,
  settings: { type: "mcq", difficulty: "medium", numberOfQuestions: 5 },
  createdAt: new Date().toISOString(),
};

// ── Settings panel ────────────────────────────────────────────────────────────

function SettingsPanel({
  settings,
  onChange,
  onStart,
  totalAvailable,
}: {
  settings: QuizSettings;
  onChange: (s: QuizSettings) => void;
  onStart: () => void;
  totalAvailable: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg space-y-6"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-3xl">
          ❓
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Configure your Quiz</h2>
        <p className="mt-1 text-sm text-gray-500">Customise the quiz to match your study goals.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        {/* Question type */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">Question type</label>
          <div className="grid grid-cols-3 gap-2">
            {(["mcq", "true_false", "short_answer"] as const).map((type) => {
              const labels = { mcq: "Multiple Choice", true_false: "True / False", short_answer: "Short Answer" };
              const icons = { mcq: "🔵", true_false: "⚡", short_answer: "✍️" };
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChange({ ...settings, type })}
                  className={[
                    "rounded-xl border-2 py-2.5 text-xs font-semibold transition-all",
                    settings.type === type
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300",
                  ].join(" ")}
                >
                  <div className="text-base">{icons[type]}</div>
                  {labels[type]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">Difficulty</label>
          <div className="grid grid-cols-3 gap-2">
            {(["easy", "medium", "hard"] as const).map((diff) => {
              const colors = {
                easy: settings.difficulty === "easy" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300",
                medium: settings.difficulty === "medium" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300",
                hard: settings.difficulty === "hard" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300",
              };
              const icons = { easy: "🌱", medium: "🔥", hard: "💀" };
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => onChange({ ...settings, difficulty: diff })}
                  className={`rounded-xl border-2 py-2.5 text-xs font-semibold capitalize transition-all ${colors[diff]}`}
                >
                  <div className="text-base">{icons[diff]}</div>
                  {diff}
                </button>
              );
            })}
          </div>
        </div>

        {/* Number of questions */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Number of questions:{" "}
            <span className="text-indigo-600">{settings.numberOfQuestions}</span>
          </label>
          <input
            type="range"
            min={3}
            max={Math.min(20, totalAvailable)}
            value={settings.numberOfQuestions}
            onChange={(e) => onChange({ ...settings, numberOfQuestions: Number(e.target.value) })}
            className="w-full accent-indigo-600"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>3 min</span>
            <span>{Math.min(20, totalAvailable)} max</span>
          </div>
        </div>
      </div>

      <motion.button
        type="button"
        onClick={onStart}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-2xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        🚀 Start Quiz
      </motion.button>
    </motion.div>
  );
}

// ── Result screen ─────────────────────────────────────────────────────────────

function ResultScreen({
  result,
  questions,
  attempts,
  onRetry,
  onBack,
}: {
  result: QuizResult;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  onRetry: () => void;
  onBack: () => void;
}) {
  const pct = result.percentage;
  const grade = pct >= 90 ? "A" : pct >= 75 ? "B" : pct >= 60 ? "C" : pct >= 40 ? "D" : "F";
  const gradeColor = pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      {/* Score card */}
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-4xl">
          {pct >= 75 ? "🏆" : pct >= 50 ? "📚" : "💪"}
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">
          {pct >= 90 ? "Outstanding!" : pct >= 75 ? "Well done!" : pct >= 50 ? "Good effort!" : "Keep practising!"}
        </h2>
        <div className={`mt-2 text-6xl font-black ${gradeColor}`}>{grade}</div>
        <p className="mt-1 text-xl font-bold text-gray-700">
          {result.score} / {result.totalPoints} points
        </p>
        <p className="text-sm text-gray-400">
          {result.correctCount} correct · {result.incorrectCount} incorrect · {Math.round(result.timeTaken / 60)} min {result.timeTaken % 60}s
        </p>

        {/* Score bar */}
        <div className="mx-auto mt-4 h-3 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className={`h-full rounded-full ${pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
          />
        </div>
        <p className="mt-1 text-sm font-semibold text-gray-500">{pct.toFixed(0)}%</p>
      </div>

      {/* Detailed review */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-800">Detailed Review</h3>
        {questions.map((q, idx) => {
          const attempt = attempts.find((a) => a.questionId === q.id);
          const isCorrect = attempt?.isCorrect ?? false;
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`rounded-2xl border-2 p-4 ${isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 text-lg ${isCorrect ? "text-emerald-600" : "text-red-500"}`}>
                  {isCorrect ? "✅" : "❌"}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{q.question}</p>
                  {attempt && (
                    <p className="mt-1 text-xs text-gray-500">
                      Your answer: <span className="font-medium">{attempt.userAnswer || "—"}</span>
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-500">
                    Correct: <span className="font-semibold text-emerald-700">{q.correctAnswer}</span>
                  </p>
                  <p className="mt-1 text-xs italic text-gray-400">{q.explanation}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={onRetry}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 rounded-2xl border-2 border-indigo-200 bg-indigo-50 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
        >
          🔄 Retry Quiz
        </motion.button>
        <motion.button
          type="button"
          onClick={onBack}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700"
        >
          📚 Back to Notes
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type QuizPhase = "settings" | "quiz" | "results";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;

  const [phase, setPhase] = useState<QuizPhase>("settings");
  const [settings, setSettings] = useState<QuizSettings>({
    type: "mcq",
    difficulty: "medium",
    numberOfQuestions: 5,
  });
  const [quiz] = useState<Quiz>(DEMO_QUIZ);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [startTime, setStartTime] = useState(0);

  const handleStart = useCallback(() => {
    const filtered = quiz.questions.slice(0, settings.numberOfQuestions);
    setActiveQuestions(filtered);
    setCurrentIndex(0);
    setAttempts([]);
    setSubmitted(false);
    setResult(null);
    setStartTime(Date.now());
    setPhase("quiz");
  }, [quiz.questions, settings.numberOfQuestions]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (submitted) return;
      const question = activeQuestions[currentIndex];
      const isCorrect =
        question.type === "short_answer"
          ? true // Short answers always marked as "attempted" — real grading via LLM
          : question.type === "true_false"
          ? answer === question.correctAnswer
          : question.options?.find((o) => o.id === answer)?.isCorrect ?? false;

      const attempt: QuizAttempt = {
        questionId: question.id,
        userAnswer:
          question.type === "mcq"
            ? question.options?.find((o) => o.id === answer)?.text ?? answer
            : answer,
        isCorrect,
        timeTaken: Math.round((Date.now() - startTime) / 1000),
      };

      setAttempts((prev) => [...prev, attempt]);
      setSubmitted(true);
    },
    [submitted, activeQuestions, currentIndex, startTime]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSubmitted(false);
    } else {
      // Build result
      const correctCount = attempts.filter((a) => a.isCorrect).length + (submitted ? 1 : 0);
      const totalPoints = activeQuestions.reduce((s, q) => s + q.pointValue, 0);
      const score = activeQuestions.reduce((s, q, i) => {
        const att = attempts.find((a) => a.questionId === q.id);
        return s + (att?.isCorrect ? q.pointValue : 0);
      }, 0);
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const res: QuizResult = {
        quizId: quiz.id,
        attempts,
        score,
        totalPoints,
        percentage: totalPoints > 0 ? (score / totalPoints) * 100 : 0,
        timeTaken,
        completedAt: new Date().toISOString(),
        correctCount,
        incorrectCount: activeQuestions.length - correctCount,
      };
      setResult(res);
      setPhase("results");
    }
  }, [currentIndex, activeQuestions, attempts, submitted, startTime, quiz.id]);

  const progress = activeQuestions.length > 0 ? ((currentIndex + (submitted ? 1 : 0)) / activeQuestions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/10">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => phase === "quiz" ? setPhase("settings") : router.push(`/study/${docId}`)}
            className="rounded-xl px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 truncate text-sm font-bold text-gray-900">{quiz.title}</h1>

          {phase === "quiz" && (
            <span className="text-xs font-medium text-gray-400">
              {currentIndex + 1} / {activeQuestions.length}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {phase === "quiz" && (
          <div className="h-1 w-full bg-gray-100">
            <motion.div
              className="h-full bg-indigo-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait">
          {phase === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SettingsPanel
                settings={settings}
                onChange={setSettings}
                onStart={handleStart}
                totalAvailable={quiz.questions.length}
              />
            </motion.div>
          )}

          {phase === "quiz" && activeQuestions.length > 0 && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <AnimatePresence mode="wait">
                <QuizCard
                  key={activeQuestions[currentIndex].id}
                  question={activeQuestions[currentIndex]}
                  questionNumber={currentIndex + 1}
                  totalQuestions={activeQuestions.length}
                  onAnswer={handleAnswer}
                  submitted={submitted}
                />
              </AnimatePresence>

              {submitted && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleNext}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {currentIndex < activeQuestions.length - 1 ? "Next Question →" : "See Results 🏆"}
                </motion.button>
              )}
            </motion.div>
          )}

          {phase === "results" && result && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResultScreen
                result={result}
                questions={activeQuestions}
                attempts={attempts}
                onRetry={handleStart}
                onBack={() => router.push(`/study/${docId}`)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
