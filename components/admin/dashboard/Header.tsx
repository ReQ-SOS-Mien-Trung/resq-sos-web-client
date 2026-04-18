"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  User,
  Gear,
  SignOut,
  SquaresFour,
  ShareNetwork,
  Warning,
  UsersThree,
  Buildings,
} from "@phosphor-icons/react";
import { HeaderProps } from "@/type";
import { useLogout } from "@/services/auth/hooks";
import { useAuthStore } from "@/stores/auth.store";
import { getUserAvatarInitials, getUserDisplayName } from "@/lib/user-avatar";
import { useSystemFund } from "@/services/system_fund";

function formatMoney(value: number) {
  return value.toLocaleString("vi-VN") + "đ";
}

const Header = ({
  onSidebarToggle,
  sidebarOpen = true,
}: HeaderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((state) => state.user);
  const { data: systemFund, isLoading: loadingSystemFund } = useSystemFund();

  const userDisplayName = getUserDisplayName(user);
  const userInitials = getUserAvatarInitials(user);
  const isSystemFundPage = pathname === "/dashboard/admin/system-fund";

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

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => router.push("/dashboard/admin/system-fund")}
          className={cn(
            "hidden md:flex gap-1.5 h-9 rounded-lg transition-all duration-200 shadow-sm",
            isSystemFundPage
              ? "bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600",
          )}
        >
          <Buildings size={16} className="text-white" />
          {loadingSystemFund
            ? "Số dư quỹ hệ thống: —"
            : `Số dư quỹ hệ thống: ${formatMoney(systemFund?.balance ?? 0)}`}
        </Button>

        {/* Customize Widget Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/admin/team-overview")}
          className="hidden md:flex gap-1.5 h-9 rounded-lg border-border/50 hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
        >
          <UsersThree size={16} className="text-red-500" />
          Tổng quan đội
        </Button>

        {/* Flood Alert Button */}
        <Button
          size="sm"
          onClick={() => router.push("/dashboard/admin/weather-flood")}
          className="hidden md:flex gap-1.5 h-9 rounded-lg bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-200"
        >
          <Warning size={16} weight="fill" />
          Phát cảnh báo lũ
        </Button>

        {/* Imports Dropdown */}
        {/* <DropdownMenu>
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
            <DropdownMenuLabel className="text-sm tracking-tighter text-muted-foreground">
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
        </DropdownMenu> */}

        {/* Exports Dropdown */}

        {/* <DropdownMenu>
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
            <DropdownMenuLabel className="text-sm tracking-tighter text-muted-foreground">
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
        </DropdownMenu> */}

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
                <p className="text-sm tracking-tighter text-muted-foreground">
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
