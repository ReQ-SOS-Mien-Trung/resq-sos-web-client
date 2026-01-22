"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  LayoutDashboard,
  Handshake,
  StickyNote,
  Calendar,
  FileText,
  FolderKanban,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Settings,
  HelpCircle,
  ChevronRight as ChevronRightIcon,
  Building2,
  Users,
  Calendar as CalendarIcon,
  Cloud,
  Zap,
} from "lucide-react";
import type {
  FavoriteItem,
  Project,
  CloudStorage,
} from "@/types/admin-dashboard";

interface SidebarProps {
  favorites: FavoriteItem[];
  projects: Project[];
  cloudStorage: CloudStorage;
  isOpen?: boolean;
}

const navigationItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard/admin",
    active: true,
  },
  { icon: Handshake, label: "Deals", href: "#" },
  { icon: StickyNote, label: "Notes", href: "#" },
  { icon: Calendar, label: "Calendar", href: "#" },
  { icon: FileText, label: "Reports", href: "#" },
  { icon: FolderKanban, label: "Projects", href: "#" },
];

const getFavoriteIcon = (name: string) => {
  switch (name) {
    case "Companies":
      return Building2;
    case "Contacts":
      return Users;
    case "Meetings":
      return CalendarIcon;
    default:
      return Building2;
  }
};

export function Sidebar({
  favorites,
  projects,
  cloudStorage,
  isOpen = true,
}: SidebarProps) {
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "w-64" : "w-0",
      )}
    >
      {isOpen && (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-4 duration-300">
          {/* Logo & Brand Section */}
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
                <span className="text-lg font-bold">P</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-sidebar-foreground">
                  Pivora
                </div>
                <div className="text-xs text-sidebar-foreground/50">
                  CRM Platform
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors cursor-pointer" />
            </div>
          </div>

          {/* User Profile Section */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors cursor-pointer group">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-background">
                W
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-sidebar-foreground truncate">
                  williams@mesh.com
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/40 group-hover:text-sidebar-foreground transition-colors" />
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    item.active
                      ? "bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-600 dark:text-violet-400 shadow-sm border border-violet-500/10"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground hover:translate-x-1",
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      item.active && "text-violet-500",
                    )}
                  />
                  <span>{item.label}</span>
                  {item.active && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                  )}
                </Link>
              );
            })}

            {/* Favorites Section */}
            <div className="mt-6 pt-4 border-t border-sidebar-border/50">
              <button
                onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider hover:text-sidebar-foreground transition-colors"
              >
                <span>Favorites</span>
                <div className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 hover:text-violet-500 transition-colors" />
                  <MoreVertical className="h-3.5 w-3.5" />
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      !favoritesExpanded && "-rotate-90",
                    )}
                  />
                </div>
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  favoritesExpanded
                    ? "max-h-96 opacity-100"
                    : "max-h-0 opacity-0",
                )}
              >
                <div className="mt-1 space-y-0.5">
                  {favorites.map((favorite, index) => {
                    const Icon = getFavoriteIcon(favorite.name);
                    return (
                      <Link
                        key={favorite.id}
                        href="#"
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200 group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-sidebar-foreground/50 group-hover:text-violet-500 transition-colors" />
                          <span>{favorite.name}</span>
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sidebar-accent text-sidebar-foreground/60 group-hover:bg-violet-500/10 group-hover:text-violet-500 transition-colors">
                          {favorite.count.toLocaleString()}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Projects Section */}
            <div className="mt-4">
              <button
                onClick={() => setProjectsExpanded(!projectsExpanded)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider hover:text-sidebar-foreground transition-colors"
              >
                <span>Projects</span>
                <div className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 hover:text-violet-500 transition-colors" />
                  <MoreVertical className="h-3.5 w-3.5" />
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      !projectsExpanded && "-rotate-90",
                    )}
                  />
                </div>
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  projectsExpanded
                    ? "max-h-96 opacity-100"
                    : "max-h-0 opacity-0",
                )}
              >
                <div className="mt-1 space-y-0.5">
                  {projects.map((project, index) => (
                    <Link
                      key={project.id}
                      href="#"
                      className="block px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {project.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Cloud Storage Widget */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="bg-gradient-to-br from-sidebar-accent to-sidebar-accent/50 rounded-xl p-4 space-y-3 relative overflow-hidden group">
              {/* Background decoration */}
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl group-hover:bg-violet-500/20 transition-colors" />

              <div className="flex items-center gap-2 relative">
                <Cloud className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-semibold text-sidebar-foreground">
                  Cloud Storage
                </span>
                <span className="ml-auto text-xs font-bold text-violet-500">
                  {cloudStorage.percentage}%
                </span>
              </div>
              <div className="space-y-2 relative">
                <div className="text-xs text-sidebar-foreground/60">
                  {cloudStorage.used} {cloudStorage.unit} of{" "}
                  {cloudStorage.total} {cloudStorage.unit} used
                </div>
                <div className="h-2 bg-sidebar-border/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${cloudStorage.percentage}%` }}
                  />
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs font-medium bg-background/80 hover:bg-background border-0 shadow-sm group-hover:shadow-md transition-all"
                onClick={() => alert("Upgrade storage")}
              >
                <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                Upgrade Storage (up to 250GB)
              </Button>
            </div>
          </div>

          {/* Bottom Links */}
          <div className="p-3 border-t border-sidebar-border space-y-0.5">
            <Link
              href="#"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                <span>Settings</span>
              </div>
              <ChevronRightIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
            <Link
              href="#"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="h-4 w-4" />
                <span>Help Center</span>
              </div>
              <ChevronRightIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
