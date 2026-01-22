"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  PanelLeft,
  Search,
  Bell,
  User,
  ChevronDown,
  Settings,
  LogOut,
  Download,
  Upload,
  LayoutGrid,
  Sparkles,
  Share2,
} from "lucide-react";

interface HeaderProps {
  onSidebarToggle?: () => void;
  sidebarOpen?: boolean;
}

export function Header({ onSidebarToggle, sidebarOpen = true }: HeaderProps) {
  const router = useRouter();
  const [notificationCount] = useState(3);

  const handleLogout = () => {
    // Clear any stored authentication data if needed
    // localStorage.removeItem('token');
    // sessionStorage.clear();

    // Redirect to sign-in page
    router.push("/sign-in");
  };

  return (
    <header className="h-16 border-b border-border/50 bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 z-20 sticky top-0">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
          className="shrink-0 hover:bg-muted/80 transition-colors"
        >
          <PanelLeft
            className={cn(
              "h-5 w-5 transition-transform duration-300",
              !sidebarOpen && "rotate-180",
            )}
          />
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
            <LayoutGrid className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">
              Dashboard
            </span>
          </div>
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors" />
          <Input
            placeholder="Search AI Mode"
            className="w-full pl-10 pr-4 h-10 bg-muted/50 border-border/50 rounded-xl focus:bg-background focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-violet-500" />
            <span>AI</span>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Customize Widget Button */}
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex gap-2 h-9 rounded-lg border-border/50 hover:border-violet-500/50 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all duration-200"
        >
          <Settings className="h-4 w-4" />
          Customize Widget
        </Button>

        {/* Imports Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex gap-1.5 h-9 rounded-lg border-border/50 hover:border-violet-500/50 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all duration-200"
            >
              Imports
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 rounded-xl border-border/50 shadow-xl"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Import Options
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <Upload className="h-4 w-4 text-violet-500" />
              Import CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <Upload className="h-4 w-4 text-violet-500" />
              Import Excel
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <Upload className="h-4 w-4 text-violet-500" />
              Import JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Exports Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 h-9 rounded-lg gap-1.5 transition-all duration-200"
            >
              Exports
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 rounded-xl border-border/50 shadow-xl"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Export Options
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <Download className="h-4 w-4 text-violet-500" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <Download className="h-4 w-4 text-violet-500" />
              Export Excel
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <Download className="h-4 w-4 text-violet-500" />
              Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-muted/80 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
              {notificationCount}
            </span>
          )}
        </Button>

        {/* Share Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-muted/80 transition-colors"
        >
          <Share2 className="h-5 w-5" />
        </Button>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9 p-0 hover:ring-2 hover:ring-violet-500/20 transition-all"
            >
              <Avatar className="h-9 w-9 ring-2 ring-border">
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-semibold">
                  W
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl border-border/50 shadow-xl"
          >
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold">williams@mesh.com</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <User className="h-4 w-4 text-violet-500" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <Settings className="h-4 w-4 text-violet-500" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 rounded-lg cursor-pointer text-red-500 focus:text-red-500"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
