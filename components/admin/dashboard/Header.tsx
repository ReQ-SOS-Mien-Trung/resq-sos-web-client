"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/ui/notification-bell";
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
  User,
  CaretDown,
  Gear,
  SignOut,
  DownloadSimple,
  UploadSimple,
  SquaresFour,
  Sparkle,
  ShareNetwork,
  Warning,
} from "@phosphor-icons/react";
import { HeaderProps } from "@/type";
import { useLogout } from "@/services/auth/hooks";
import { useAuthStore } from "@/stores/auth.store";
import { getUserAvatarInitials, getUserDisplayName } from "@/lib/user-avatar";
import { FloodAlertModal } from "./FloodAlertModal";

const Header = ({ onSidebarToggle, sidebarOpen = true }: HeaderProps) => {
  const [floodAlertOpen, setFloodAlertOpen] = useState(false);
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((state) => state.user);

  const userDisplayName = getUserDisplayName(user);
  const userInitials = getUserAvatarInitials(user);

  // Get role name based on roleId
  const getRoleName = (roleId?: number) => {
    switch (roleId) {
      case 1:
        return "Quản trị viên";
      case 2:
        return "Điều phối viên";
      case 4:
        return "Quản lý kho";
      default:
        return "Người dùng";
    }
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

        {/* Flood Alert Button */}
        <Button
          size="sm"
          onClick={() => setFloodAlertOpen(true)}
          className="hidden md:flex gap-1.5 h-9 rounded-lg bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-200"
        >
          <Warning size={16} weight="fill" />
          Phát cảnh báo lũ
        </Button>

        <FloodAlertModal
          open={floodAlertOpen}
          onOpenChange={setFloodAlertOpen}
        />

        {/* Exports Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex gap-1.5 h-9 rounded-lg border-border/50 hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
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
        <NotificationBell
          buttonClassName="h-9 w-9 rounded-lg hover:bg-muted/80 transition-colors"
          contentClassName="w-95"
        />

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
                  {userInitials}
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
                <p className="text-sm font-semibold">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground">
                  {getRoleName(user?.roleId)}
                </p>
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
              onClick={() => logout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                  Đang đăng xuất...
                </>
              ) : (
                <>
                  <SignOut size={16} />
                  Đăng xuất
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
