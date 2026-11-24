"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Settings,
  Shield,
  Cpu,
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
  Laptop,
  Languages,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [learnerLevel, setLearnerLevel] = useState("intermediate");
  const [defaultLang, setDefaultLang] = useState("English");
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleClearCache = () => {
    setIsResetting(true);
    setTimeout(() => {
      localStorage.removeItem("chat_sessions");
      setIsResetting(false);
      setResetMessage("Local cache cleared successfully.");
      setTimeout(() => setResetMessage(null), 3000);
    }, 600);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-ibm-500/10 flex items-center justify-center text-ibm-600 dark:text-ibm-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">System Settings &amp; Architecture</h1>
              <p className="text-sm text-muted-foreground">
                Manage your learner preferences and inspect connected IBM Cloud enterprise services.
              </p>
            </div>
          </div>
        </motion.div>

        {/* IBM Cloud Services Architecture Overview */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          <Card className="border border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-ibm-500" />
                    <span>IBM Cloud &amp; AI Stack</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time operational status of the underlying IBM technologies powering EduSimplify.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 text-xs">
                  All Systems Operational
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-ibm-50 dark:bg-ibm-950/60 flex items-center justify-center text-ibm-600 shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">IBM watsonx.ai</p>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      meta-llama/llama-3-70b-instruct
                    </p>
                    <p className="text-[11px] text-ibm-500 mt-1">Embedder: ibm/slate-30m-english-rtrvr</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">IBM Cloudant</p>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      NoSQL Document Store (edusimplify)
                    </p>
                    <p className="text-[11px] text-purple-500 mt-1">User sessions, study progress &amp; feedback</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-600 shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Cloud Object Storage</p>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      IBM COS S3 (edusimplify-documents)
                    </p>
                    <p className="text-[11px] text-cyan-500 mt-1">Encrypted PDF archive storage</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">IBM App ID</p>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      OAuth 2.0 / OIDC Identity Provider
                    </p>
                    <p className="text-[11px] text-amber-600 mt-1">JWKS RS256 token verification</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Learner & UI Preferences */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
          <Card className="border border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-ibm-500" />
                <span>Learner Preferences</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Customise how the AI tutor adapts complexity and language across all modules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cognitive Learner Level</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "beginner", label: "Beginner", desc: "Grade 6–8 level, analogies" },
                    { id: "intermediate", label: "Intermediate", desc: "Undergraduate level" },
                    { id: "advanced", label: "Advanced", desc: "Postgraduate rigor" },
                    { id: "expert", label: "Expert", desc: "Specialist peer precision" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setLearnerLevel(lvl.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        learnerLevel === lvl.id
                          ? "border-ibm-500 bg-ibm-50/50 dark:bg-ibm-950/40 text-foreground ring-1 ring-ibm-500"
                          : "border-border/60 hover:border-ibm-300 dark:hover:border-ibm-700 bg-card text-muted-foreground"
                      }`}
                    >
                      <p className="text-sm font-semibold capitalize text-foreground">{lvl.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Languages className="w-4 h-4 text-ibm-500" />
                    <span>Default Language</span>
                  </label>
                  <select
                    value={defaultLang}
                    onChange={(e) => setDefaultLang(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ibm-500"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Bengali">Bengali (বাংলা)</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="Marathi">Marathi (मराठी)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-ibm-500" />
                    <span>Interface Theme</span>
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: "light", icon: Sun, label: "Light" },
                      { id: "dark", icon: Moon, label: "Dark" },
                      { id: "system", icon: Laptop, label: "System" },
                    ].map((th) => {
                      const Icon = th.icon;
                      return (
                        <Button
                          key={th.id}
                          variant={theme === th.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTheme(th.id)}
                          className="flex-1 gap-2 text-xs"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{th.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data & Cache Management */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
          <Card className="border border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Data &amp; Cache Controls</CardTitle>
              <CardDescription className="text-xs">
                Manage locally cached session history and presentation demo data.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Clear Offline Client Cache</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Resets simulated chat streams and temporary browser states without deleting uploaded documents.
                </p>
                {resetMessage && <p className="text-xs text-emerald-600 font-medium mt-1">{resetMessage}</p>}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                disabled={isResetting}
                className="gap-2 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
                <span>Clear Cache</span>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
