"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FlashlightIcon, ArrowRight, Sparkles, BookOpen, Layers, FileText } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDocument } from "@/hooks/useDocument";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function FlashcardsIndexPage() {
  const router = useRouter();
  const { documents, fetchDocuments } = useDocument();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchDocuments();
  }, [fetchDocuments]);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FlashlightIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Interactive Flashcards</h1>
              <p className="text-sm text-muted-foreground">
                Master core terms and definitions with 3D flipcards and spaced repetition.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Featured Demo Deck */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          <Card className="border-ibm-200/60 dark:border-ibm-800/40 gradient-bg-subtle shadow-md overflow-hidden relative">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-ibm-400 text-ibm-600 dark:text-ibm-400 font-semibold text-xs">
                    Curated Deck
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> 8 Flashcards
                  </span>
                </div>
                <h3 className="text-xl font-bold">Neural Networks & Deep Learning Essentials</h3>
                <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                  Interactive flashcards covering activation functions, backpropagation, vanishing gradients, and dropout regularisation.
                </p>
              </div>
              <Button
                onClick={() => router.push("/flashcards/demo")}
                className="gradient-bg text-white hover:opacity-95 shadow-lg group shrink-0"
              >
                <span>Practice Deck</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Available Document Decks */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-ibm-500" />
            <span>Generate Flashcards from Documents</span>
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.length > 0 ? (
              documents.map((doc, idx) => (
                <Card
                  key={doc.id || idx}
                  className="border border-border/60 hover:border-ibm-300 dark:hover:border-ibm-700 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between"
                  onClick={() => router.push(`/flashcards/${doc.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {doc.level || "intermediate"}
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-2 line-clamp-1">{doc.title}</CardTitle>
                    <CardDescription className="text-xs">{doc.fileName}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-ibm-500">
                      <span>Open Deck</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="sm:col-span-2 lg:col-span-3 border-dashed border-border/80 p-8 text-center bg-muted/20">
                <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-sm mb-1">No custom documents uploaded yet</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Upload a PDF to generate a tailored flashcard deck with key terms and concepts.
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => router.push("/upload")}>
                    Upload PDF
                  </Button>
                  <Button size="sm" className="gradient-bg text-white" onClick={() => router.push("/flashcards/demo")}>
                    Try Demo Cards
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
