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
  SidebarSimple,
  MagnifyingGlass,
  Bell,
  User,
  CaretDown,
  Gear,
  SignOut,
  DownloadSimple,
  UploadSimple,
  SquaresFour,
  Sparkle,
  ShareNetwork,
} from "@phosphor-icons/react";
import { HeaderProps } from "@/type";

const Header = ({ onSidebarToggle, sidebarOpen = true }: HeaderProps) => {
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
          <SidebarSimple
            size={20}
            className={cn(
              "transition-transform duration-300",
              !sidebarOpen && "rotate-180",
            )}
          />
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
            <SquaresFour size={16} className="text-red-500" />
            <span className="text-sm font-semibold text-foreground">
              Tổng quan
            </span>
          </div>
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative group">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-red-500 transition-colors"
          />
          <Input
            placeholder="Tìm kiếm..."
            className="w-full pl-10 pr-4 h-10 bg-muted/60 border-2 border-border/60 rounded-xl focus:bg-background focus:border-red-600 focus:ring-2 focus:ring-red-500/30 transition-all duration-200 text-foreground placeholder:text-foreground/50"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground">
            <Sparkle size={12} className="text-red-500" />
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
          className="hidden md:flex gap-2 h-9 rounded-lg border-border/50 hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
        >
          <Gear size={16} />
          Tùy chỉnh
        </Button>

        {/* Imports Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex gap-1.5 h-9 rounded-lg border-border/50 hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
            >
              Nhập dữ liệu
              <CaretDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 rounded-xl border-border/50 shadow-xl"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Tùy chọn nhập
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <UploadSimple size={16} className="text-red-500" />
              Nhập CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <UploadSimple size={16} className="text-red-500" />
              Nhập Excel
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <UploadSimple size={16} className="text-red-500" />
              Nhập JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Exports Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 h-9 rounded-lg gap-1.5 transition-all duration-200"
            >
              Xuất dữ liệu
              <CaretDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 rounded-xl border-border/50 shadow-xl"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Tùy chọn xuất
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <DownloadSimple size={16} className="text-red-500" />
              Xuất CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <DownloadSimple size={16} className="text-red-500" />
              Xuất Excel
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <DownloadSimple size={16} className="text-red-500" />
              Xuất PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-muted/80 transition-colors"
        >
          <Bell size={20} />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-linear-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
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
          <ShareNetwork size={20} />
        </Button>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9 p-0 hover:ring-2 hover:ring-red-500/20 transition-all"
            >
              <Avatar className="h-9 w-9 ring-2 ring-border">
                <AvatarFallback className="bg-linear-to-br from-red-400 to-orange-500 text-white font-semibold">
                  A
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
                <p className="text-sm font-semibold">admin@sosresq.vn</p>
                <p className="text-xs text-muted-foreground">Quản trị viên</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <User size={16} className="text-red-500" />
              Hồ sơ
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer">
              <Gear size={16} className="text-red-500" />
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 rounded-lg cursor-pointer text-red-500 focus:text-red-500"
              onClick={handleLogout}
            >
              <SignOut size={16} />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
