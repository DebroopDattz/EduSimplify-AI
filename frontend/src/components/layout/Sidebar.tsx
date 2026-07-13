"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  LayoutDashboard,
  Upload,
  FileText,
  Brain,
  FlashlightIcon,
  MessageSquare,
  BarChart3,
  Settings,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Upload PDF", href: "/upload", icon: Upload },
  { label: "Study Notes", href: "/notes", icon: FileText },
  { label: "Quiz", href: "/quiz", icon: Brain },
  { label: "Flashcards", href: "/flashcards", icon: FlashlightIcon },
  { label: "AI Chat", href: "/chat", icon: MessageSquare },
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

const sidebarVariants = {
  expanded: { width: 240 },
  collapsed: { width: 68 },
};

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <TooltipProvider delayDuration={200}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden bg-card border-r border-border flex flex-col"
          >
            <SidebarContent
              collapsed={false}
              isActive={isActive}
              navItems={navItems}
              onItemClick={onMobileClose}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        variants={sidebarVariants}
        animate={collapsed ? "collapsed" : "expanded"}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 border-r border-border bg-card overflow-hidden"
      >
        <SidebarContent
          collapsed={collapsed}
          isActive={isActive}
          navItems={navItems}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </motion.aside>
    </TooltipProvider>
  );
}

function SidebarContent({
  collapsed,
  isActive,
  navItems,
  onToggleCollapse,
  onItemClick,
}: {
  collapsed: boolean;
  isActive: (href: string) => boolean;
  navItems: NavItem[];
  onToggleCollapse?: () => void;
  onItemClick?: (() => void) | undefined;
}) {
  return (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border flex-shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 min-w-0"
          onClick={onItemClick}
        >
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0 shadow-md">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <span className="font-bold text-sm whitespace-nowrap">
                  <span className="gradient-text">EduSimplify</span>
                  <span className="text-muted-foreground font-normal ml-1">
                    AI
                  </span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          const linkContent = (
            <Link
              href={item.href}
              onClick={onItemClick}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "gradient-bg text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-4.5 h-4.5 flex-shrink-0 transition-transform duration-150",
                  active ? "text-white" : "group-hover:scale-110"
                )}
                style={{ width: "18px", height: "18px" }}
              />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.12 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge && !collapsed && (
                <span className="ml-auto text-xs bg-ibm-100 dark:bg-ibm-900/40 text-ibm-600 dark:text-ibm-300 px-1.5 py-0.5 rounded-full font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          );

          return collapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div key={item.href}>{linkContent}</div>
          );
        })}
      </nav>

      {/* Collapse toggle — desktop only */}
      {onToggleCollapse && (
        <div className="px-2 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 h-9 text-muted-foreground hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <AnimatePresence mode="wait">
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs"
                  >
                    Collapse
                  </motion.span>
                </AnimatePresence>
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
