"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar — fixed, full width */}
      <Navbar onMenuClick={() => setMobileOpen(true)} />

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content — offset by sidebar width on desktop, top offset by navbar */}
      <main
        className="pt-16 lg:pl-[240px] min-h-screen transition-all duration-300"
        aria-label="Main content"
      >
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
