import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EduSimplify AI – AI-Powered Learning Platform",
    template: "%s | EduSimplify AI",
  },
  description:
    "Upload academic PDFs and get AI-powered personalized study notes, quizzes, flashcards, and revision sheets. Powered by IBM watsonx.ai and Meta Llama.",
  keywords: [
    "AI learning",
    "study notes",
    "quiz generator",
    "flashcards",
    "IBM watsonx",
    "PDF simplifier",
    "personalized education",
    "RAG AI",
  ],
  authors: [{ name: "EduSimplify AI Team" }],
  creator: "EduSimplify AI",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://edusimplify.vercel.app"
  ),
  openGraph: {
    title: "EduSimplify AI – AI-Powered Learning Platform",
    description:
      "Transform how you learn. Upload PDFs, get personalized AI study materials.",
    type: "website",
    locale: "en_US",
    siteName: "EduSimplify AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduSimplify AI",
    description:
      "AI-powered course content simplification & personalized learning.",
    creator: "@EduSimplifyAI",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                duration: 4000,
                classNames: {
                  toast:
                    "glass-card text-foreground border-border shadow-lg",
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
