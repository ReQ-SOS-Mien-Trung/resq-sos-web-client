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
        <main
          className="flex-1 overflow-y-auto bg-muted/20 p-6"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.015) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.015) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
