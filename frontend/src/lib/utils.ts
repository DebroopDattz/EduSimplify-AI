import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with clsx — the standard ShadCN utility.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a Date or ISO string into a human-readable date string.
 * @example formatDate("2024-01-15T10:30:00Z") → "Jan 15, 2024"
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", options).format(d);
}

/**
 * Format a Date as a relative time string (e.g. "2 hours ago", "3 days ago").
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Unknown";

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
}

/**
 * Truncate text to a maximum length, appending an ellipsis.
 * @example truncateText("Hello World", 8) → "Hello Wo..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Format a file size in bytes into a human-readable string.
 * @example formatFileSize(1048576) → "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = (bytes / Math.pow(1024, exponent)).toFixed(1);
  return `${value} ${units[exponent]}`;
}

/**
 * Generate initials from a full name.
 * @example getInitials("John Doe") → "JD"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Sleep for a given number of milliseconds (useful in dev / mock contexts).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a string is a valid URL.
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}
