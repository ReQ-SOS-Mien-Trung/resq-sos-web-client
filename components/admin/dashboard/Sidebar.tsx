"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  LayoutDashboard,
  Users,
  CloudSun,
  Droplets,
  FileBarChart,
  UserCheck,
  Bot,
  MessageSquare,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Settings,
  HelpCircle,
  ChevronRight as ChevronRightIcon,
  Shield,
  AlertTriangle,
  Activity,
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
    label: "Tổng quan",
    href: "/dashboard/admin",
  },
  { icon: Users, label: "Quản lý người dùng", href: "/dashboard/admin/users" },
  { icon: CloudSun, label: "Bài đăng thời tiết", href: "/dashboard/admin/weather-posts" },
  { icon: Droplets, label: "Thời tiết & Lũ lụt", href: "/dashboard/admin/weather-flood" },
  { icon: FileBarChart, label: "Báo cáo cứu hộ", href: "/dashboard/admin/reports" },
  { icon: UserCheck, label: "Đăng ký cứu hộ viên", href: "/dashboard/admin/rescuer-registration" },
  { icon: Bot, label: "Cấu hình AI Prompt", href: "/dashboard/admin/ai-prompt" },
  { icon: MessageSquare, label: "Cấu hình phòng chat", href: "/dashboard/admin/chat-config" },
  { icon: UserPlus, label: "Xác nhận cứu hộ viên", href: "/dashboard/admin/rescuer-verification" },
];

const getFavoriteIcon = (name: string) => {
  switch (name) {
    case "Cứu hộ viên":
      return Shield;
    case "Cảnh báo":
      return AlertTriangle;
    case "Hoạt động":
      return Activity;
    default:
      return Shield;
  }
};

export function Sidebar({
  favorites,
  projects,
  cloudStorage,
  isOpen = true,
}: SidebarProps) {
  const pathname = usePathname();
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
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                <span className="text-lg font-bold">R</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-sidebar-foreground">
                  SOS ResQ
                </div>
                <div className="text-xs text-sidebar-foreground/50">
                  Hệ thống cứu hộ miền Trung
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors cursor-pointer" />
            </div>
          </div>

          {/* User Profile Section */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors cursor-pointer group">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-background">
                A
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-sidebar-foreground truncate">
                  admin@sosresq.vn
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/40 group-hover:text-sidebar-foreground transition-colors" />
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard/admin" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-red-500/10 to-orange-500/10 text-red-600 dark:text-red-400 shadow-sm border border-red-500/10"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground hover:translate-x-1",
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors flex-shrink-0",
                      isActive && "text-red-500",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
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
                <span>Thống kê nhanh</span>
                <div className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 hover:text-red-500 transition-colors" />
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
                          <Icon className="h-4 w-4 text-sidebar-foreground/50 group-hover:text-red-500 transition-colors" />
                          <span>{favorite.name}</span>
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sidebar-accent text-sidebar-foreground/60 group-hover:bg-red-500/10 group-hover:text-red-500 transition-colors">
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
                <span>Khu vực cứu hộ</span>
                <div className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 hover:text-red-500 transition-colors" />
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

          {/* Bottom Links - Fixed at bottom */}
          <div className="shrink-0 p-3 pb-16 border-t border-sidebar-border space-y-0.5">
            <Link
              href="#"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                <span>Cài đặt</span>
              </div>
              <ChevronRightIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
            <Link
              href="#"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="h-4 w-4" />
                <span>Trung tâm hỗ trợ</span>
              </div>
              <ChevronRightIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
