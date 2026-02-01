"use client";

import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { DashboardLayoutProps } from "@/type";

const DashboardLayout = ({
  children,
  favorites,
  projects,
  cloudStorage,
}: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Header
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          favorites={favorites}
          projects={projects}
          cloudStorage={cloudStorage}
          isOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-y-auto bg-linear-to-br from-muted/30 via-background to-muted/20 p-6 relative">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
