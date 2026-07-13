"use client";

import { motion } from "framer-motion";
import {
  FileText,
  BookOpen,
  Brain,
  Zap,
  TrendingUp,
  Clock,
  Target,
  Award,
  Bookmark,
  Upload,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  FlashlightIcon,
  ArrowRight,
  Flame,
  ChevronRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ── Mock Data ───────────────────────────────────────────────────── */
const recentUploads = [
  {
    id: "1",
    title: "Quantum Mechanics — Chapters 1–4",
    subject: "Physics",
    uploadedAt: "2 hours ago",
    pages: 42,
    color: "bg-ibm-500",
    progress: 65,
    status: "In Progress",
  },
  {
    id: "2",
    title: "Macroeconomics: Monetary Policy",
    subject: "Economics",
    uploadedAt: "Yesterday",
    pages: 28,
    color: "bg-purple-500",
    progress: 100,
    status: "Completed",
  },
  {
    id: "3",
    title: "Organic Chemistry — Reaction Mechanisms",
    subject: "Chemistry",
    uploadedAt: "3 days ago",
    pages: 55,
    color: "bg-cyan-500",
    progress: 30,
    status: "In Progress",
  },
  {
    id: "4",
    title: "Data Structures & Algorithms",
    subject: "Computer Science",
    uploadedAt: "1 week ago",
    pages: 80,
    color: "bg-green-500",
    progress: 85,
    status: "In Progress",
  },
];

const statsCards = [
  {
    label: "Day Streak",
    value: "14",
    icon: Flame,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    change: "+2 this week",
    trend: "up",
  },
  {
    label: "Quizzes Taken",
    value: "47",
    icon: Brain,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    change: "+5 this week",
    trend: "up",
  },
  {
    label: "Documents",
    value: "12",
    icon: FileText,
    color: "text-ibm-500",
    bg: "bg-ibm-50 dark:bg-ibm-900/20",
    change: "4 in progress",
    trend: "neutral",
  },
  {
    label: "Avg. Score",
    value: "84%",
    icon: Target,
    color: "text-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    change: "+3% vs last week",
    trend: "up",
  },
];

const topicProgress = [
  { topic: "Quantum Mechanics", progress: 65, color: "bg-ibm-500" },
  { topic: "Macroeconomics", progress: 100, color: "bg-purple-500" },
  { topic: "Organic Chemistry", progress: 30, color: "bg-cyan-500" },
  { topic: "Data Structures", progress: 85, color: "bg-green-500" },
  { topic: "Machine Learning", progress: 45, color: "bg-yellow-500" },
];

const recentQuizResults = [
  {
    id: "1",
    title: "Quantum Mechanics — Wave Functions",
    score: 9,
    total: 10,
    date: "Today, 2:30 PM",
    subject: "Physics",
  },
  {
    id: "2",
    title: "Monetary Policy Basics",
    score: 7,
    total: 10,
    date: "Yesterday",
    subject: "Economics",
  },
  {
    id: "3",
    title: "Reaction Mechanisms Quiz",
    score: 6,
    total: 10,
    date: "3 days ago",
    subject: "Chemistry",
  },
  {
    id: "4",
    title: "Big O Notation & Complexity",
    score: 10,
    total: 10,
    date: "1 week ago",
    subject: "CS",
  },
];

const bookmarks = [
  {
    id: "1",
    title: "Schrödinger's equation derivation",
    doc: "Quantum Mechanics",
    page: 14,
  },
  { id: "2", title: "IS-LM curve overview", doc: "Macroeconomics", page: 8 },
  { id: "3", title: "SN1 vs SN2 reactions", doc: "Organic Chemistry", page: 23 },
];

const quickActions = [
  {
    label: "Upload PDF",
    icon: Upload,
    href: "/upload",
    color: "gradient-bg text-white border-0",
  },
  {
    label: "Take Quiz",
    icon: Brain,
    href: "/quiz",
    color: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  {
    label: "Flashcards",
    icon: FlashlightIcon,
    href: "/flashcards",
    color: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  },
  {
    label: "Study Chat",
    icon: MessageSquare,
    href: "/chat",
    color: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 border-green-200 dark:border-green-800",
  },
];

/* ── Score color helper ───────────────────────────────────────── */
function scoreColor(score: number, total: number) {
  const pct = (score / total) * 100;
  if (pct >= 90) return "text-green-500";
  if (pct >= 70) return "text-ibm-500";
  if (pct >= 50) return "text-yellow-500";
  return "text-red-500";
}

/* ── Dashboard Page ───────────────────────────────────────────── */
export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* ── Greeting ──────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Good morning,{" "}
              <span className="gradient-text">Learner</span> 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{today}</p>
          </div>
          <Link href="/upload">
            <Button className="gradient-bg text-white border-0 shadow-md hover:opacity-90 transition-opacity gap-2">
              <Upload className="w-4 h-4" />
              Upload New PDF
            </Button>
          </Link>
        </motion.div>

        {/* ── Quick Actions ─────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link href={action.href} key={action.label}>
                <Button
                  variant="outline"
                  className={`w-full h-14 gap-2.5 flex-col text-xs font-medium border transition-all hover:scale-105 ${action.color}`}
                >
                  <Icon className="w-5 h-5" />
                  {action.label}
                </Button>
              </Link>
            );
          })}
        </motion.div>

        {/* ── Stats Cards ───────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statsCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="card-lift border border-border/60 gradient-bg-subtle"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}
                    >
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <TrendingUp
                      className={`w-3.5 h-3.5 ${
                        stat.trend === "up"
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="stat-number mb-1">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground mb-0.5">
                    {stat.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.change}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* ── Main Content Grid ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Recent Uploads + Topic Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Uploads */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
            >
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-ibm-500" />
                      Recent Uploads
                    </CardTitle>
                    <Link href="/upload">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-ibm-500 hover:text-ibm-600 h-7 px-2 gap-1"
                      >
                        View All
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentUploads.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <div
                        className={`w-10 h-12 rounded-lg ${doc.color} flex items-center justify-center flex-shrink-0 shadow-sm`}
                      >
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">
                            {doc.title}
                          </p>
                          <Badge
                            variant="secondary"
                            className={`text-xs flex-shrink-0 ${
                              doc.status === "Completed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-ibm-100 text-ibm-700 dark:bg-ibm-900/30 dark:text-ibm-400"
                            }`}
                          >
                            {doc.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          <span>{doc.subject}</span>
                          <span>•</span>
                          <span>{doc.pages} pages</span>
                          <span>•</span>
                          <span>{doc.uploadedAt}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={doc.progress}
                            className="h-1.5 flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {doc.progress}%
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all flex-shrink-0" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Topic Progress */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
            >
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    Topic Mastery
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topicProgress.map((topic) => (
                    <div key={topic.topic}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium">
                          {topic.topic}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {topic.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${topic.color} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${topic.progress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right column: Quiz results + Bookmarks */}
          <div className="space-y-6">
            {/* Recent Quiz Results */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={5}
            >
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-500" />
                      Quiz Results
                    </CardTitle>
                    <Link href="/quiz">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-ibm-500 hover:text-ibm-600 h-7 px-2 gap-1"
                      >
                        History
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentQuizResults.map((result, i) => (
                    <div key={result.id}>
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm ${scoreColor(
                            result.score,
                            result.total
                          )} bg-muted`}
                        >
                          {result.score}/{result.total}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {result.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Badge
                              variant="secondary"
                              className="text-xs py-0 px-1.5 h-4"
                            >
                              {result.subject}
                            </Badge>
                            <span>{result.date}</span>
                          </div>
                        </div>
                        {result.score === result.total && (
                          <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      {i < recentQuizResults.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Bookmarks */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={6}
            >
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-cyan-500" />
                    Bookmarks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {bookmarks.map((bm, i) => (
                    <div key={bm.id}>
                      <div className="flex items-start gap-3 cursor-pointer hover:text-ibm-500 transition-colors group">
                        <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-ibm-500 transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {bm.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {bm.doc} · Page {bm.page}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all flex-shrink-0 mt-0.5" />
                      </div>
                      {i < bookmarks.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 text-xs text-ibm-500 hover:text-ibm-600 hover:bg-ibm-50 dark:hover:bg-ibm-900/20"
                  >
                    View all bookmarks
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Learning tip */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={7}
            >
              <Card className="border border-ibm-200/60 dark:border-ibm-800/40 gradient-bg-subtle">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-ibm-500 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">
                        Today&apos;s Tip
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Review flashcards within 24 hours of creation to boost
                        retention by up to 80% using spaced repetition.
                      </p>
                      <Link href="/flashcards">
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 mt-1.5 text-xs text-ibm-500 hover:text-ibm-600 gap-1"
                        >
                          Review Flashcards
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
