"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ExportOption {
  type: "pdf" | "markdown" | "docx" | "csv" | "copy";
  label: string;
  icon: React.ReactElement;
}

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

interface ExportButtonsProps {
  onExportPDF?: () => void | Promise<void>;
  onExportMarkdown?: () => void | Promise<void>;
  onExportDOCX?: () => void | Promise<void>;
  onExportCSV?: () => void | Promise<void>;
  onCopy?: () => void | Promise<void>;
  showCSV?: boolean;
  showDOCX?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export default function ExportButtons({
  onExportPDF,
  onExportMarkdown,
  onExportDOCX,
  onExportCSV,
  onCopy,
  showCSV = false,
  showDOCX = true,
  size = "md",
  className = "",
}: ExportButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (key: string, fn?: () => void | Promise<void>) => {
    if (!fn || loading) return;
    if (key === "copy") {
      await fn();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    setLoading(key);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  };

  const options: ExportOption[] = [
    {
      type: "pdf",
      label: "PDF",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 13h6M9 17h4" />
        </svg>
      ),
    },
    {
      type: "markdown",
      label: "Markdown",
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6h17.12C21.35 6 22 6.63 22 7.41v9.18c0 .78-.65 1.41-1.44 1.41zM6.81 15.95v-4.03l2.49 2.96 2.49-2.96v4.03h1.66V8.05h-1.66l-2.49 3.05-2.49-3.05H5.15v7.9h1.66zm9.25-3.55h2.43l-3.7 4.3V14.4h-2.43l3.7-4.3v2z" />
        </svg>
      ),
    },
    ...(showDOCX
      ? [
          {
            type: "docx" as const,
            label: "DOCX",
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
          },
        ]
      : []),
    ...(showCSV
      ? [
          {
            type: "csv" as const,
            label: "CSV",
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M3 10h18M3 14h18M10 3v18M14 3v18" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  const fnMap: Record<string, (() => void | Promise<void>) | undefined> = {
    pdf: onExportPDF,
    markdown: onExportMarkdown,
    docx: onExportDOCX,
    csv: onExportCSV,
    copy: onCopy,
  };

  const btnBase =
    size === "sm"
      ? "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      : "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {options.map((opt) => {
        const fn = fnMap[opt.type];
        const isLoading = loading === opt.type;
        return (
          <motion.button
            key={opt.type}
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            disabled={!fn || isLoading}
            onClick={() => handleAction(opt.type, fn)}
            className={[
              btnBase,
              fn
                ? "border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                : "cursor-not-allowed border border-gray-100 bg-gray-50 text-gray-300",
            ].join(" ")}
          >
            {isLoading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              opt.icon
            )}
            {opt.label}
          </motion.button>
        );
      })}

      {/* Copy button */}
      {onCopy && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleAction("copy", onCopy)}
          className={[
            btnBase,
            copied
              ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700",
          ].join(" ")}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <CheckIcon />
                Copied!
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      )}
    </div>
  );
}
