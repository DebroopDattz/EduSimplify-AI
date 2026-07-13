"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { RevisionSheet, FormulaEntry } from "@/types";

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_SHEET: RevisionSheet = {
  id: "rev-1",
  documentId: "demo",
  title: "Neural Networks — Revision Sheet",
  generatedAt: new Date().toISOString(),
  formulaSheet: [
    { name: "Loss — Mean Squared Error", formula: "L = (1/n) Σ(yᵢ - ŷᵢ)²", description: "Measures average squared difference between predictions and targets.", unit: "—" },
    { name: "Loss — Binary Cross-Entropy", formula: "L = -[y·log(ŷ) + (1-y)·log(1-ŷ)]", description: "Used for binary classification tasks.", unit: "nats" },
    { name: "Sigmoid Activation", formula: "σ(x) = 1 / (1 + e^{-x})", description: "Squashes output to (0, 1). Used in output layer for probability.", unit: "—" },
    { name: "ReLU Activation", formula: "ReLU(x) = max(0, x)", description: "Outputs input if positive, else zero. Most common hidden layer activation.", unit: "—" },
    { name: "Softmax", formula: "softmax(xᵢ) = e^{xᵢ} / Σⱼ e^{xⱼ}", description: "Converts logits to probability distribution over K classes.", unit: "—" },
    { name: "Gradient Descent Update", formula: "θ ← θ − α · ∇L(θ)", description: "Updates parameter θ by step α in the negative gradient direction.", unit: "—" },
    { name: "L2 Regularisation Term", formula: "Lᵣₑ𝓰 = L + λ Σ wᵢ²", description: "Adds penalty proportional to squared weights to prevent overfitting.", unit: "—" },
  ],
  cheatSheet: `## Neural Networks — Cheat Sheet

### Architecture
| Component | Description |
|-----------|-------------|
| Input Layer | Receives raw features (pixels, numbers, etc.) |
| Hidden Layers | Learn intermediate representations |
| Output Layer | Produces final prediction |
| Weights (W) | Learnable parameters connecting neurons |
| Biases (b) | Shift the activation threshold |

### Key Algorithms
- **Forward Pass**: Compute activations layer-by-layer: a = f(Wx + b)
- **Loss Computation**: Compare ŷ to y using L (MSE or CrossEntropy)
- **Backpropagation**: Compute ∂L/∂W using chain rule, propagating backwards
- **Gradient Descent**: Update W ← W − α∂L/∂W

### Common Hyperparameters
| Parameter | Typical Range |
|-----------|--------------|
| Learning Rate | 0.0001 – 0.01 |
| Batch Size | 32 – 512 |
| Epochs | 10 – 100 |
| Dropout Rate | 0.2 – 0.5 |

### Regularisation Techniques
1. **Dropout** — randomly disable neurons during training
2. **L2 / Weight Decay** — penalise large weights
3. **Batch Normalisation** — normalise layer inputs
4. **Early Stopping** — stop when validation loss plateaus
5. **Data Augmentation** — artificially increase training data`,

  mindMap: `mindmap
  root((Neural Networks))
    Architecture
      Input Layer
      Hidden Layers
        Weights
        Biases
      Output Layer
    Training
      Forward Pass
      Loss Function
        MSE
        Cross-Entropy
      Backpropagation
      Gradient Descent
    Activation Functions
      Sigmoid
      ReLU
      Tanh
      Softmax
    Regularisation
      Dropout
      L2 Regularisation
      Early Stopping
    Applications
      Image Recognition
      NLP
      Recommendation`,

  summary: `## Summary

Neural networks are layered computational models that **learn from data** by iteratively adjusting their internal parameters (weights and biases) through a process called **backpropagation** combined with **gradient descent**.

### Core Ideas
1. Data flows **forward** through layers (Forward Pass)
2. Predictions are compared to ground truth using a **Loss Function**
3. Gradients flow **backwards** (Backpropagation) to attribute blame
4. **Gradient Descent** updates weights to minimise loss
5. This cycle repeats for many **epochs** until the loss converges

### Why They Work
Neural networks are **universal function approximators** — given enough neurons, they can represent any continuous function. Their power comes from learning hierarchical representations: early layers detect simple features (edges), later layers combine them into complex concepts (faces, objects).`,

  examNotes: `## Exam Notes — Neural Networks

### Must-Know Definitions
- **Epoch**: One complete pass through the training dataset
- **Batch**: Subset of training data used per gradient update
- **Overfitting**: High train accuracy, low test accuracy
- **Underfitting**: High train error — model too simple
- **Vanishing Gradient**: Gradients → 0 in deep sigmoid networks

### Common Exam Questions
1. "Explain the role of activation functions" → Non-linearity to learn complex patterns
2. "What is the vanishing gradient problem?" → Gradients ≈ 0, early layers don't learn
3. "How does backpropagation work?" → Chain rule, compute ∂L/∂W backwards
4. "Difference between batch and stochastic gradient descent?" → Full dataset vs. one sample vs. mini-batch
5. "What is dropout?" → Random neuron deactivation during training to prevent overfitting

### Tricky Points
- ReLU can cause "dead neurons" (output always 0) if weights become very negative — use Leaky ReLU
- Sigmoid/Tanh saturate → vanishing gradients → prefer ReLU in hidden layers
- Learning rate too high → divergence; too low → slow convergence → use adaptive optimisers (Adam)
- Batch Norm accelerates training by normalising layer inputs, reducing internal covariate shift`,
};

// ── Types ─────────────────────────────────────────────────────────────────────

type RevisionTab = "formula" | "cheat" | "mindmap" | "summary" | "exam";

const TABS: { id: RevisionTab; label: string; icon: string }[] = [
  { id: "formula", label: "Formula Sheet", icon: "📐" },
  { id: "cheat", label: "Cheat Sheet", icon: "📄" },
  { id: "mindmap", label: "Mind Map", icon: "🧠" },
  { id: "summary", label: "Summary", icon: "📋" },
  { id: "exam", label: "Exam Notes", icon: "📝" },
];

// ── Formula table ─────────────────────────────────────────────────────────────

function FormulaTable({ formulas }: { formulas: FormulaEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Formula</th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:table-cell">Description</th>
          </tr>
        </thead>
        <tbody>
          {formulas.map((f, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border-b border-gray-100 bg-white last:border-0 hover:bg-gray-50"
            >
              <td className="px-4 py-3 font-semibold text-gray-800">{f.name}</td>
              <td className="px-4 py-3">
                <code className="rounded-lg bg-indigo-50 px-2 py-1 font-mono text-xs text-indigo-700">
                  {f.formula}
                </code>
              </td>
              <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{f.description}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-to-HTML renderer for printable content
  const lines = content.split("\n");
  return (
    <div className="prose prose-sm max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-gray-900 mt-6 mb-2">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-base font-bold text-gray-700 mt-4 mb-2">{line.slice(4)}</h3>;
        if (line.startsWith("| ") && line.endsWith(" |")) {
          // Simple table row — skip separator rows
          if (/^\|[\s-|]+\|$/.test(line)) return null;
          const cells = line.split("|").filter((c) => c.trim());
          return (
            <div key={i} className="flex gap-3 border-b border-gray-100 py-1.5 text-sm">
              {cells.map((cell, j) => (
                <span key={j} className={`${j === 0 ? "font-medium text-gray-800 w-40 shrink-0" : "text-gray-600 flex-1"}`}>
                  {cell.trim()}
                </span>
              ))}
            </div>
          );
        }
        if (line.startsWith("- ")) return (
          <li key={i} className="ml-4 list-disc text-sm text-gray-700">
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
          </li>
        );
        if (/^\d+\. /.test(line)) return (
          <li key={i} className="ml-4 list-decimal text-sm text-gray-700">
            <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\. /, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
          </li>
        );
        if (line.trim() === "") return <br key={i} />;
        return (
          <p key={i} className="text-sm text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/`(.*?)`/g, '<code class="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-indigo-700">$1</code>') }} />
        );
      })}
    </div>
  );
}

// ── Mind map ──────────────────────────────────────────────────────────────────

function MindMapDisplay({ mermaidCode }: { mermaidCode: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Mind Map (Mermaid diagram source)
      </p>
      <div data-mermaid={mermaidCode} className="mermaid-container">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-white p-4 font-mono text-xs text-gray-600 shadow-inner">
          {mermaidCode}
        </pre>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        💡 Render this with a Mermaid-compatible viewer or the app's Mermaid integration.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RevisionPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;

  const [activeTab, setActiveTab] = useState<RevisionTab>("formula");
  const sheet = DEMO_SHEET;

  const handlePrint = useCallback(() => window.print(), []);

  const handleExportMarkdown = useCallback(() => {
    const content = `# ${sheet.title}\n\n## Formula Sheet\n\n${sheet.formulaSheet.map((f) => `**${f.name}**: \`${f.formula}\`\n${f.description}`).join("\n\n")}\n\n## Cheat Sheet\n\n${sheet.cheatSheet}\n\n## Summary\n\n${sheet.summary}\n\n## Exam Notes\n\n${sheet.examNotes}`;
    const blob = new Blob([content], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${sheet.title}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [sheet]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/10 print:bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm print:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => router.push(`/study/${docId}`)}
            className="rounded-xl px-2 py-1.5 text-gray-500 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h1 className="truncate text-sm font-bold text-gray-900">{sheet.title}</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <motion.button
              type="button"
              onClick={handleExportMarkdown}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-gray-300"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export .md
            </motion.button>
            <motion.button
              type="button"
              onClick={handlePrint}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </motion.button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Print title */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{sheet.title}</h1>
          <p className="text-sm text-gray-500">Generated by EduSimplify AI</p>
        </div>

        {/* Tabs */}
        <div className="print:hidden mb-6 flex overflow-x-auto gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "formula" && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-gray-800">📐 Formula Sheet</h2>
                <FormulaTable formulas={sheet.formulaSheet} />
              </div>
            )}

            {activeTab === "cheat" && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-bold text-gray-800">📄 Cheat Sheet</h2>
                <MarkdownContent content={sheet.cheatSheet} />
              </div>
            )}

            {activeTab === "mindmap" && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-gray-800">🧠 Mind Map</h2>
                <MindMapDisplay mermaidCode={sheet.mindMap} />
              </div>
            )}

            {activeTab === "summary" && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-bold text-gray-800">📋 Summary</h2>
                <MarkdownContent content={sheet.summary} />
              </div>
            )}

            {activeTab === "exam" && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-bold text-gray-800">📝 Exam Notes</h2>
                <MarkdownContent content={sheet.examNotes} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
