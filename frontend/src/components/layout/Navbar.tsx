"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  Menu,
  X,
  Bell,
  ChevronDown,
  User,
  LogOut,
  Settings,
  LayoutDashboard,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onMenuClick?: () => void;
}

const userNavLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Profile", href: "/settings", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Navbar({ onMenuClick }: NavbarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications] = useState(3);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 glass border-b border-border/60 flex items-center">
      <div className="flex items-center gap-3 px-4 w-full">
        {/* Hamburger — mobile / sidebar trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden flex-shrink-0"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Logo — visible on mobile when sidebar is closed */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 lg:hidden flex-shrink-0"
        >
          <div className="w-7 h-7 rounded-md gradient-bg flex items-center justify-center">
            <GraduationCap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm">
            <span className="gradient-text">EduSimplify</span>
            <span className="text-muted-foreground font-normal text-xs ml-1">
              AI
            </span>
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
            {notifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-ibm-500 border border-background" />
            )}
          </Button>

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mounted && isDark ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* User avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
                userMenuOpen
                  ? "bg-muted"
                  : "hover:bg-muted/60"
              )}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                U
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium leading-none">Learner</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Free plan
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-muted-foreground transition-transform hidden sm:block",
                  userMenuOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 w-56 z-50 rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold">
                          U
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Learner</p>
                          <p className="text-xs text-muted-foreground">
                            learner@example.com
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="mt-2 text-xs bg-ibm-50 dark:bg-ibm-900/30 text-ibm-600 dark:text-ibm-300"
                      >
                        Free Plan
                      </Badge>
                    </div>

                    {/* Nav items */}
                    <div className="py-1">
                      {userNavLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors"
                          >
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>

                    <Separator />

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          window.location.href = "/";
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
