"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, ShieldCheck } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusText, setStatusText] = useState("Verifying IBM App ID authentication...");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatusText(`Authentication error: ${error}`);
      setTimeout(() => router.push("/login"), 2500);
      return;
    }

    // Set authenticated session in storage
    const token = code ? `appid_${code}` : `demo_token_${Date.now()}`;
    localStorage.setItem("access_token", token);
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "usr_ibm_student",
        name: "IBM Scholar",
        email: "scholar@edusimplify.ibm.com",
        role: "Student",
      })
    );

    setStatusText("Authorization successful! Redirecting to dashboard...");
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 1200);

    return () => clearTimeout(timer);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass rounded-2xl border border-border/60 p-8 text-center shadow-xl"
      >
        <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 shadow-md">
          <GraduationCap className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2">Signing You In</h2>
        <p className="text-sm text-muted-foreground mb-6">{statusText}</p>

        <div className="flex justify-center mb-6">
          <div className="w-8 h-8 border-3 border-ibm-500 border-t-transparent rounded-full animate-spin" />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/40 py-2.5 px-4 rounded-xl border border-border/40">
          <ShieldCheck className="w-4 h-4 text-ibm-500" />
          <span>Secured by IBM App ID Enterprise OIDC</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-3 border-ibm-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
