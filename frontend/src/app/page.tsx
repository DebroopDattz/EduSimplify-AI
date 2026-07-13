"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import {
  BookOpen,
  Brain,
  FileText,
  Zap as FlashlightIcon,
  MessageSquare,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Upload,
  Sparkles,
  Zap,
  GraduationCap,
  Star,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/* ── Animation Variants ───────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ── Feature Data ─────────────────────────────────────────────── */
const features = [
  {
    icon: FileText,
    title: "Smart PDF Summaries",
    description:
      "Upload any PDF and get concise, leveled summaries tailored to your learning stage — from beginner to expert.",
    color: "text-ibm-500",
    bg: "bg-ibm-50 dark:bg-ibm-900/30",
    border: "border-ibm-100 dark:border-ibm-800/50",
  },
  {
    icon: Brain,
    title: "AI Quiz Generation",
    description:
      "Automatically generate multiple-choice, true/false, and short-answer quizzes from your uploaded materials.",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/30",
    border: "border-purple-100 dark:border-purple-800/50",
  },
  {
    icon: FlashlightIcon,
    title: "Smart Flashcards",
    description:
      "Create spaced-repetition flashcard decks in seconds from any document — perfect for exam preparation.",
    color: "text-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-900/30",
    border: "border-cyan-100 dark:border-cyan-800/50",
  },
  {
    icon: MessageSquare,
    title: "AI Study Chat",
    description:
      "Ask any question about your uploaded content. Get instant, context-aware answers powered by IBM watsonx.",
    color: "text-ibm-400",
    bg: "bg-ibm-50 dark:bg-ibm-900/20",
    border: "border-ibm-100 dark:border-ibm-800/40",
  },
  {
    icon: BookOpen,
    title: "Concept Simplification",
    description:
      "Struggle with complex topics? Our AI breaks down any concept into simple, memorable explanations.",
    color: "text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-100 dark:border-purple-800/40",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description:
      "Track your learning streaks, quiz scores, and mastery levels across all topics and documents.",
    color: "text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    border: "border-cyan-100 dark:border-cyan-800/40",
  },
];

/* ── Steps Data ───────────────────────────────────────────────── */
const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Upload Your PDF",
    description:
      "Drag and drop any study material, lecture notes, textbook chapter, or research paper. We accept PDFs up to 25 MB.",
    color: "bg-ibm-500",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "AI Processes It",
    description:
      "IBM watsonx.ai analyzes the content, extracts key concepts, and understands context at a deep level in seconds.",
    color: "bg-purple-500",
  },
  {
    step: "03",
    icon: GraduationCap,
    title: "Learn Smarter",
    description:
      "Access summaries, quizzes, flashcards, and chat — all personalized to your knowledge level and learning goals.",
    color: "bg-cyan-500",
  },
];

/* ── Testimonials ─────────────────────────────────────────────── */
const testimonials = [
  {
    quote:
      "EduSimplify cut my exam prep time in half. The AI quizzes are eerily accurate at targeting my weak spots.",
    name: "Priya Sharma",
    role: "Medical Student, IIT Delhi",
    initials: "PS",
    color: "bg-ibm-500",
  },
  {
    quote:
      "I uploaded 40 pages of economics notes and had a clean summary and 20 flashcards in under 2 minutes. Unbelievable.",
    name: "Marcus Chen",
    role: "MBA Candidate, Wharton",
    initials: "MC",
    color: "bg-purple-500",
  },
  {
    quote:
      "The concept simplifier explained quantum entanglement to me like I was 12. Finally I get it. Amazing tool.",
    name: "Amara Osei",
    role: "Physics Undergrad, UCL",
    initials: "AO",
    color: "bg-cyan-500",
  },
];

/* ── Section Wrapper ──────────────────────────────────────────── */
function SectionHeader({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: React.ReactNode;
  subtitle: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div ref={ref} className="text-center max-w-2xl mx-auto mb-14">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        custom={0}
      >
        <Badge
          variant="secondary"
          className="mb-4 px-3 py-1 text-xs font-medium tracking-widest uppercase bg-ibm-50 dark:bg-ibm-900/40 text-ibm-600 dark:text-ibm-300 border-ibm-200 dark:border-ibm-700"
        >
          {badge}
        </Badge>
      </motion.div>
      <motion.h2
        variants={fadeUp}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        custom={1}
        className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
      >
        {title}
      </motion.h2>
      <motion.p
        variants={fadeUp}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        custom={2}
        className="text-muted-foreground text-lg leading-relaxed"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}

/* ── Hero Particle ────────────────────────────────────────────── */
function FloatingOrb({
  className,
  delay = 0,
}: {
  className: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`hero-orb ${className}`}
      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
      transition={{
        duration: 6 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

/* ── Main Page ────────────────────────────────────────────────── */
export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  /* Feature section in-view */
  const featuresRef = useRef(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: "-60px" });
  const stepsRef = useRef(null);
  const stepsInView = useInView(stepsRef, { once: true, margin: "-60px" });
  const testimonialsRef = useRef(null);
  const testimonialsInView = useInView(testimonialsRef, {
    once: true,
    margin: "-60px",
  });
  const ctaRef = useRef(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: "-60px" });

  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="gradient-text">EduSimplify</span>
              <span className="text-muted-foreground font-normal ml-1">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {["Features", "How It Works", "Testimonials"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="sm"
                className="gradient-bg text-white border-0 shadow-md hover:opacity-90 transition-opacity"
              >
                Get Started
                <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero Section ──────────────────────────────────────── */}
        <section
          ref={heroRef}
          id="hero"
          className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
        >
          {/* Background orbs */}
          <FloatingOrb
            className="hero-orb-blue -top-24 -left-24 opacity-60"
            delay={0}
          />
          <FloatingOrb
            className="hero-orb-purple top-1/3 -right-32 opacity-50"
            delay={2}
          />
          <FloatingOrb
            className="hero-orb-cyan bottom-0 left-1/3 opacity-40"
            delay={4}
          />

          {/* Mesh grid bg */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(#0f62fe 1px, transparent 1px), linear-gradient(to right, #0f62fe 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <motion.div
            style={{ y: heroY, opacity: heroOpacity }}
            className="relative z-10 container text-center px-4"
          >
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center gap-6"
            >
              {/* Badge */}
              <motion.div variants={fadeUp} custom={0}>
                <Badge className="gap-1.5 px-4 py-1.5 text-sm font-medium bg-ibm-50 dark:bg-ibm-900/50 text-ibm-600 dark:text-ibm-300 border-ibm-200 dark:border-ibm-700 rounded-full">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Powered by IBM watsonx.ai
                </Badge>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={fadeUp}
                custom={1}
                className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl"
              >
                <span className="gradient-text">Transform</span>
                <br className="hidden sm:block" />
                <span> How You </span>
                <span className="gradient-text-cyan">Learn</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                variants={fadeUp}
                custom={2}
                className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
              >
                Upload any PDF and instantly unlock AI-powered summaries,
                quizzes, flashcards, and a personal study chatbot — all in one
                beautiful workspace.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                variants={fadeUp}
                custom={3}
                className="flex flex-col sm:flex-row gap-3 mt-2"
              >
                <Link href="/login">
                  <Button
                    size="lg"
                    className="gradient-bg text-white border-0 shadow-lg hover:opacity-90 transition-all hover:scale-105 px-8 h-12 text-base"
                  >
                    Start Learning Free
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-8 h-12 text-base hover:bg-ibm-50 dark:hover:bg-ibm-900/30 border-ibm-200 dark:border-ibm-700"
                  >
                    See How It Works
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>

              {/* Trust signals */}
              <motion.div
                variants={fadeUp}
                custom={4}
                className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mt-2"
              >
                {[
                  "No credit card required",
                  "Free forever plan",
                  "5,000+ students trust us",
                ].map((text) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-ibm-500 flex-shrink-0" />
                    {text}
                  </span>
                ))}
              </motion.div>

              {/* Hero preview card */}
              <motion.div
                variants={fadeUp}
                custom={5}
                className="mt-8 w-full max-w-3xl"
              >
                <div className="glass-card p-6 rounded-2xl border border-ibm-100/60 dark:border-ibm-800/40">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex gap-1.5">
                      {["bg-red-400", "bg-yellow-400", "bg-green-400"].map(
                        (c) => (
                          <div
                            key={c}
                            className={`w-3 h-3 rounded-full ${c}`}
                          />
                        )
                      )}
                    </div>
                    <div className="flex-1 h-6 bg-muted/60 rounded-md flex items-center px-3">
                      <span className="text-xs text-muted-foreground">
                        edusimplify.ai/dashboard
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        label: "Summary",
                        color: "bg-ibm-500",
                        lines: [3, 4, 2],
                      },
                      { label: "Quiz", color: "bg-purple-500", lines: [2, 3] },
                      {
                        label: "Flashcards",
                        color: "bg-cyan-500",
                        lines: [2, 2, 3],
                      },
                    ].map((panel) => (
                      <div
                        key={panel.label}
                        className="bg-background/60 rounded-xl p-4 border border-border/50"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className={`w-2 h-2 rounded-full ${panel.color}`}
                          />
                          <span className="text-xs font-medium">
                            {panel.label}
                          </span>
                        </div>
                        {panel.lines.map((w, i) => (
                          <div
                            key={i}
                            className="h-2 bg-muted/80 rounded-full mb-2"
                            style={{ width: `${w * 20 + 20}%` }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Features Section ──────────────────────────────────── */}
        <section
          id="features"
          className="py-24 relative"
          ref={featuresRef}
        >
          <div className="container px-4">
            <SectionHeader
              badge="Features"
              title={
                <>
                  Everything you need to{" "}
                  <span className="gradient-text">study smarter</span>
                </>
              }
              subtitle="From raw PDFs to mastered knowledge — EduSimplify gives you every tool to learn faster, retain more, and ace your exams."
            />

            <motion.div
              variants={stagger}
              initial="hidden"
              animate={featuresInView ? "visible" : "hidden"}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div key={feature.title} variants={fadeUp} custom={i}>
                    <Card
                      className={`card-lift h-full border ${feature.border} gradient-bg-subtle`}
                    >
                      <CardContent className="p-6">
                        <div
                          className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}
                        >
                          <Icon className={`w-6 h-6 ${feature.color}`} />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── How It Works Section ──────────────────────────────── */}
        <section
          id="how-it-works"
          className="py-24 gradient-bg-subtle"
          ref={stepsRef}
        >
          <div className="container px-4">
            <SectionHeader
              badge="How It Works"
              title={
                <>
                  From upload to{" "}
                  <span className="gradient-text">mastery</span> in minutes
                </>
              }
              subtitle="Three simple steps. No setup, no friction. Just faster, deeper learning."
            />

            <motion.div
              variants={stagger}
              initial="hidden"
              animate={stepsInView ? "visible" : "hidden"}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
            >
              {/* Connector line */}
              <div className="absolute hidden md:block top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-ibm-500 via-purple-500 to-cyan-500 opacity-30" />

              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.step}
                    variants={fadeUp}
                    custom={i}
                    className="relative flex flex-col items-center text-center"
                  >
                    <div className="relative mb-6">
                      <div
                        className={`w-20 h-20 rounded-2xl ${step.color} flex items-center justify-center shadow-lg`}
                      >
                        <Icon className="w-9 h-9 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-background border-2 border-border flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                      {step.description}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── Testimonials Section ──────────────────────────────── */}
        <section
          id="testimonials"
          className="py-24"
          ref={testimonialsRef}
        >
          <div className="container px-4">
            <SectionHeader
              badge="Testimonials"
              title={
                <>
                  Loved by{" "}
                  <span className="gradient-text">students worldwide</span>
                </>
              }
              subtitle="Join thousands of students who are already studying smarter with EduSimplify AI."
            />

            <motion.div
              variants={stagger}
              initial="hidden"
              animate={testimonialsInView ? "visible" : "hidden"}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {testimonials.map((t, i) => (
                <motion.div key={t.name} variants={fadeUp} custom={i}>
                  <Card className="card-lift h-full border border-border/60 gradient-bg-subtle">
                    <CardContent className="p-6">
                      <div className="flex gap-0.5 mb-4">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className="w-4 h-4 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                      </div>
                      <blockquote className="text-muted-foreground text-sm leading-relaxed mb-5 italic">
                        &ldquo;{t.quote}&rdquo;
                      </blockquote>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                        >
                          {t.initials}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{t.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {t.role}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── CTA Section ───────────────────────────────────────── */}
        <section className="py-24 gradient-bg-subtle" ref={ctaRef}>
          <div className="container px-4">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate={ctaInView ? "visible" : "hidden"}
              className="text-center max-w-2xl mx-auto"
            >
              <motion.div variants={fadeUp} custom={0}>
                <Badge className="mb-6 px-3 py-1 text-xs font-medium tracking-widest uppercase bg-ibm-50 dark:bg-ibm-900/40 text-ibm-600 dark:text-ibm-300 border-ibm-200 dark:border-ibm-700">
                  Get Started Today
                </Badge>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                custom={1}
                className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5"
              >
                Ready to{" "}
                <span className="gradient-text">supercharge</span> your studies?
              </motion.h2>
              <motion.p
                variants={fadeUp}
                custom={2}
                className="text-muted-foreground text-lg mb-8 leading-relaxed"
              >
                Join over 5,000 students already using EduSimplify AI to study
                more effectively. It&apos;s free to start.
              </motion.p>
              <motion.div
                variants={fadeUp}
                custom={3}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Link href="/login">
                  <Button
                    size="lg"
                    className="gradient-bg text-white border-0 shadow-lg hover:opacity-90 hover:scale-105 transition-all px-10 h-12 text-base"
                  >
                    Start for Free
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-10 h-12 text-base hover:bg-ibm-50 dark:hover:bg-ibm-900/30 border-ibm-200 dark:border-ibm-700"
                  >
                    Try as Guest
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-10 mt-auto">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
                <GraduationCap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm">
                <span className="gradient-text">EduSimplify</span>
                <span className="text-muted-foreground font-normal ml-1">
                  AI
                </span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground text-center">
              Built with ❤️ using IBM watsonx.ai &bull; &copy;{" "}
              {new Date().getFullYear()} EduSimplify AI
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
