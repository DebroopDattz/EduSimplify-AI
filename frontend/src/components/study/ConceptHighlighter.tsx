"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Action {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

const ACTIONS: Action[] = [
  { id: "explain", label: "Explain this", icon: "💬", prompt: "explain" },
  { id: "simplify", label: "Simplify", icon: "✨", prompt: "simplify" },
  { id: "analogy", label: "Give analogy", icon: "🔗", prompt: "analogy" },
  { id: "example", label: "Real-life example", icon: "🌍", prompt: "example" },
];

interface PopupPosition {
  top: number;
  left: number;
}

interface ConceptHighlighterProps {
  onAction: (action: string, selectedText: string) => void;
  children: React.ReactNode;
  className?: string;
}

export default function ConceptHighlighter({
  onAction,
  children,
  className = "",
}: ConceptHighlighterProps) {
  const [popupPos, setPopupPos] = useState<PopupPosition | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const top = rect.top - containerRect.top - 8;
    const left = rect.left - containerRect.left + rect.width / 2;

    setSelectedText(text);
    setPopupPos({ top, left });
  }, []);

  const handleAction = useCallback(
    (action: Action) => {
      onAction(action.prompt, selectedText);
      setPopupPos(null);
      window.getSelection()?.removeAllRanges();
    },
    [onAction, selectedText]
  );

  // Close popup on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupPos(null);
      }
    }
    if (popupPos) {
      document.addEventListener("mousedown", handleMouseDown);
    }
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [popupPos]);

  // Close popup on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPopupPos(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseUp={handleMouseUp}
    >
      {children}

      <AnimatePresence>
        {popupPos && (
          <motion.div
            ref={popupRef}
            key="popup"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: popupPos.top,
              left: popupPos.left,
              transform: "translate(-50%, -100%)",
              zIndex: 50,
            }}
            className="pointer-events-auto"
          >
            {/* Arrow */}
            <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-gray-900" />

            <div className="flex items-center gap-1 rounded-xl bg-gray-900 px-2 py-1.5 shadow-2xl">
              {ACTIONS.map((action) => (
                <motion.button
                  key={action.id}
                  type="button"
                  onClick={() => handleAction(action)}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  <span>{action.icon}</span>
                  <span className="whitespace-nowrap">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
