"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DropZone({ onFileAccepted, disabled = false, className = "" }: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) onFileAccepted(acceptedFiles[0]);
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_SIZE_BYTES,
    maxFiles: 1,
    disabled,
  });

  const rejection = fileRejections[0];
  const rejectionReason = rejection
    ? rejection.errors.map((e) => {
        if (e.code === "file-too-large")
          return `File is too large. Maximum size is ${formatBytes(MAX_SIZE_BYTES)}.`;
        if (e.code === "file-invalid-type") return "Only PDF files are accepted.";
        return e.message;
      })[0]
    : null;

  const borderColor = isDragReject
    ? "#ef4444"
    : isDragActive
    ? "#6366f1"
    : disabled
    ? "#e5e7eb"
    : "#d1d5db";

  const bgColor = isDragReject
    ? "#fef2f2"
    : isDragActive
    ? "#eef2ff"
    : disabled
    ? "#f9fafb"
    : "#ffffff";

  return (
    <div className={className}>
      {/* Plain div holds getRootProps so there's no type conflict with motion.div */}
      <div {...getRootProps()} style={{ outline: "none" }}>
        <input {...getInputProps()} />
        <motion.div
          animate={{ borderColor, backgroundColor: bgColor }}
          whileHover={disabled ? {} : { borderColor: "#a5b4fc", backgroundColor: "#f5f3ff" }}
          transition={{ duration: 0.2 }}
          className={[
            "relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center focus:outline-none",
            disabled ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          {/* Icon */}
          <AnimatePresence mode="wait">
            {isDragActive && !isDragReject ? (
              <motion.div
                key="active"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100"
              >
                <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </motion.div>
            ) : isDragReject ? (
              <motion.div
                key="reject"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100"
              >
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100"
              >
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text */}
          <div>
            <p className="text-base font-semibold text-gray-700">
              {isDragActive && !isDragReject
                ? "Release to upload"
                : isDragReject
                ? "Invalid file"
                : "Drop your PDF here"}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              or{" "}
              <span className="font-medium text-indigo-600 underline decoration-dotted underline-offset-2">
                browse files
              </span>
            </p>
          </div>

          {/* Constraints */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { icon: "📄", text: "PDF only" },
              { icon: "📦", text: `Max ${formatBytes(MAX_SIZE_BYTES)}` },
              { icon: "1️⃣", text: "One file at a time" },
            ].map((badge) => (
              <span
                key={badge.text}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500"
              >
                {badge.icon} {badge.text}
              </span>
            ))}
          </div>

          {/* Drag overlay shimmer */}
          {isDragActive && !isDragReject && (
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-2xl bg-indigo-400/10"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {rejectionReason && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 text-sm font-medium text-red-600"
          >
            ⚠️ {rejectionReason}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
