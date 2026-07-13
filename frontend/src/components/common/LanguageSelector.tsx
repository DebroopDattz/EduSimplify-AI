"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SupportedLanguage } from "@/types";

interface LanguageOption {
  value: SupportedLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { value: "english", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { value: "hindi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳" },
  { value: "bengali", label: "Bengali", nativeLabel: "বাংলা", flag: "🇧🇩" },
  { value: "tamil", label: "Tamil", nativeLabel: "தமிழ்", flag: "🏴" },
  { value: "telugu", label: "Telugu", nativeLabel: "తెలుగు", flag: "🏴" },
  { value: "marathi", label: "Marathi", nativeLabel: "मराठी", flag: "🇮🇳" },
];

interface LanguageSelectorProps {
  value: SupportedLanguage;
  onChange: (lang: SupportedLanguage) => void;
  className?: string;
}

export default function LanguageSelector({
  value,
  onChange,
  className = "",
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = LANGUAGES.find((l) => l.value === value) ?? LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-lg">{selected.flag}</span>
        <span>{selected.label}</span>
        <span className="text-xs text-gray-400">({selected.nativeLabel})</span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-1 h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Select language"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          >
            {LANGUAGES.map((lang) => {
              const isSelected = lang.value === value;
              return (
                <motion.li
                  key={lang.value}
                  role="option"
                  aria-selected={isSelected}
                  whileHover={{ backgroundColor: "#f0f4ff" }}
                  onClick={() => {
                    onChange(lang.value);
                    setOpen(false);
                  }}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isSelected
                      ? "bg-indigo-50 font-semibold text-indigo-700"
                      : "text-gray-700"
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <div className="flex flex-col">
                    <span>{lang.label}</span>
                    <span className="text-xs text-gray-400">{lang.nativeLabel}</span>
                  </div>
                  {isSelected && (
                    <svg
                      className="ml-auto h-4 w-4 text-indigo-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-5.121-5.121a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export { LANGUAGES };
