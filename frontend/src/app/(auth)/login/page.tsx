"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GraduationCap, ArrowRight, Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function IBMIcon() {
  return (
    <svg viewBox="0 0 48 20" className="w-10 h-4" aria-hidden fill="currentColor">
      <rect x="0" y="0" width="48" height="4" rx="1" />
      <rect x="6" y="8" width="36" height="4" rx="1" />
      <rect x="0" y="16" width="48" height="4" rx="1" />
    </svg>
  );
}

export default function LoginPage() {
  const appIdClientId =
    process.env.NEXT_PUBLIC_APP_ID_CLIENT_ID ?? "demo-client-id";
  const appIdDiscovery =
    process.env.NEXT_PUBLIC_APP_ID_DISCOVERY_ENDPOINT ?? "";
  const redirectUri =
    process.env.NEXT_PUBLIC_APP_ID_REDIRECT_URI ??
    "http://localhost:3000/auth/callback";

  const handleIBMLogin = () => {
    const params = new URLSearchParams({
      client_id: appIdClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile email",
      state: crypto.randomUUID(),
    });
    const authBase = appIdDiscovery
      ? appIdDiscovery.replace("/.well-known/openid-configuration", "")
      : "https://us-south.appid.cloud.ibm.com/oauth/v4/demo-tenant";
    window.location.href = `${authBase}/authorization?${params.toString()}`;
  };

  const handleGoogleLogin = () => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile email",
      access_type: "offline",
      prompt: "consent",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background px-4">
      {/* Background orbs */}
      <div className="hero-orb hero-orb-blue -top-32 -left-32 opacity-40 absolute" />
      <div className="hero-orb hero-orb-purple bottom-0 -right-20 opacity-30 absolute" />
      <div className="hero-orb hero-orb-cyan top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 absolute" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#0f62fe 1px, transparent 1px), linear-gradient(to right, #0f62fe 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-extrabold tracking-tight">
                <span className="gradient-text">EduSimplify</span>
                <span className="text-muted-foreground font-normal ml-1 text-lg">
                  AI
                </span>
              </div>
              <div className="text-xs text-muted-foreground -mt-0.5">
                Transform How You Learn
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <Card className="glass border-border/60 shadow-2xl">
            <CardContent className="p-8">
              <div className="text-center mb-7">
                <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
                <p className="text-muted-foreground text-sm">
                  Sign in to continue your learning journey
                </p>
              </div>

              {/* IBM App ID Button */}
              <motion.div variants={fadeUp} custom={2}>
                <Button
                  onClick={handleIBMLogin}
                  variant="outline"
                  className="w-full h-12 gap-3 border-ibm-200 dark:border-ibm-700 hover:bg-ibm-50 dark:hover:bg-ibm-900/30 hover:border-ibm-400 dark:hover:border-ibm-500 transition-all group"
                >
                  <span className="text-ibm-600 dark:text-ibm-300 group-hover:scale-105 transition-transform">
                    <IBMIcon />
                  </span>
                  <span className="font-medium">Continue with IBM App ID</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </motion.div>

              <div className="flex items-center gap-3 my-4">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground px-1">or</span>
                <Separator className="flex-1" />
              </div>

              {/* Google Button */}
              <motion.div variants={fadeUp} custom={3}>
                <Button
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full h-12 gap-3 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all group"
                >
                  <GoogleIcon />
                  <span className="font-medium">Continue with Google</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </motion.div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground px-1">
                  or try without account
                </span>
                <Separator className="flex-1" />
              </div>

              {/* Guest Button */}
              <motion.div variants={fadeUp} custom={4}>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    className="w-full h-11 gap-2 text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-ibm-300 dark:hover:border-ibm-600 transition-all group"
                  >
                    <Sparkles className="w-4 h-4 group-hover:text-ibm-500 transition-colors" />
                    <span>Continue as Guest</span>
                    <Badge
                      variant="secondary"
                      className="ml-auto text-xs py-0 px-2"
                    >
                      Limited
                    </Badge>
                  </Button>
                </Link>
              </motion.div>

              {/* Trust note */}
              <motion.div
                variants={fadeUp}
                custom={5}
                className="mt-6 flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border/40"
              >
                <Shield className="w-4 h-4 text-ibm-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your data is encrypted and never sold. We use IBM App ID for
                  enterprise-grade authentication. Guest sessions are anonymous.
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer links */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={6}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          By signing in, you agree to our{" "}
          <Link
            href="#"
            className="underline underline-offset-2 hover:text-ibm-500 transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="#"
            className="underline underline-offset-2 hover:text-ibm-500 transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </motion.p>
      </div>
    </div>
  );
}
