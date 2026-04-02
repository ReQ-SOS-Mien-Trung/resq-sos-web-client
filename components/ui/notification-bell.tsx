"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle, BellSlash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import {
  getNotificationTypeLabel,
  getNotificationTypeTone,
  NOTIFICATION_RECENT_QUERY,
  resolveNotificationRoute,
  NotificationListParams,
  NotificationTone,
  useNotificationCenter,
  UserNotificationItem,
} from "@/services/noti_alert";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ScrollArea } from "./scroll-area";

interface NotificationBellProps {
  params?: NotificationListParams;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  buttonClassName?: string;
  contentClassName?: string;
  showMarkAll?: boolean;
  onNotificationClick?: (notification: UserNotificationItem) => void;
}

function formatRelativeTime(isoString: string): string {
  const createdAt = new Date(isoString);
  if (Number.isNaN(createdAt.getTime())) {
    return "Không rõ thời gian";
  }

  const diffMs = Date.now() - createdAt.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "Vừa xong";
  }

  if (diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / minute))} phút trước`;
  }

  if (diffMs < day) {
    return `${Math.max(1, Math.floor(diffMs / hour))} giờ trước`;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(createdAt);
}

function getTypeBadgeClass(tone: NotificationTone): string {
  if (tone === "danger") {
    return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  }

  if (tone === "warning") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }

  if (tone === "success") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (tone === "info") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  }

  return "bg-muted text-muted-foreground";
}

function NotificationListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-border/60 p-3 animate-pulse"
        >
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="mt-2 h-3 w-full rounded bg-muted" />
          <div className="mt-1 h-3 w-4/5 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function NotificationBell({
  params,
  title = "Thông báo",
  emptyTitle = "Chưa có thông báo",
  emptyDescription = "Thông báo mới sẽ xuất hiện tại đây.",
  buttonClassName,
  contentClassName,
  showMarkAll = true,
  onNotificationClick,
}: NotificationBellProps) {
  const router = useRouter();
  const roleId = useAuthStore((state) => state.user?.roleId);
  const [open, setOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAll,
  } = useNotificationCenter({
    params: params ?? NOTIFICATION_RECENT_QUERY,
  });

  const displayUnreadCount = unreadCount > 99 ? "99+" : String(unreadCount);

  const handleNotificationClick = (notification: UserNotificationItem) => {
    if (!notification.isRead) {
      markAsRead(notification.userNotificationId);
    }

    setOpen(false);

    if (onNotificationClick) {
      onNotificationClick(notification);
      return;
    }

    const destination = resolveNotificationRoute(notification.type, roleId);
    if (destination) {
      router.push(destination);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead(undefined, {
      onSuccess: () => {
        toast.success("Đã đánh dấu tất cả là đã đọc");
      },
      onError: () => {
        toast.error("Không thể cập nhật thông báo. Vui lòng thử lại.");
      },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", buttonClassName)}
          aria-label="Mở bảng thông báo"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
              {displayUnreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className={cn("w-90 p-0 overflow-hidden", contentClassName)}
      >
        <div className="border-b px-4 py-3 flex items-center justify-between gap-3 bg-background">
          <div>
            <p className="text-sm font-semibold tracking-tighter">{title}</p>
            <p className="text-xs text-muted-foreground tracking-tighter">
              {unreadCount > 0
                ? `${unreadCount} thông báo chưa đọc`
                : "Tất cả thông báo đã được đọc"}
            </p>
          </div>

          {showMarkAll && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="text-xs h-8 px-2.5"
            >
              <CheckCircle className="h-4 w-4" />
              Đã đọc tất cả
            </Button>
          )}
        </div>

        {isLoading ? (
          <NotificationListSkeleton />
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center flex flex-col items-center justify-center gap-3">
            <BellSlash
              size={40}
              weight="light"
              className="text-muted-foreground/50"
            />
            <div>
              <p className="text-sm font-medium tracking-tighter">
                {emptyTitle}
              </p>
              <p className="text-xs text-muted-foreground mt-1 tracking-tighter">
                {emptyDescription}
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-95">
            <div className="p-3 space-y-2">
              {notifications.map((notification) => {
                const tone = getNotificationTypeTone(notification.type);

                return (
                  <button
                    key={notification.userNotificationId}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      "hover:bg-muted/60 hover:border-border",
                      !notification.isRead &&
                        "border-red-200/80 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/20",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold tracking-tight line-clamp-1">
                        {notification.title}
                      </p>

                      {!notification.isRead && (
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                      )}
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground tracking-tight line-clamp-2">
                      {notification.body}
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          getTypeBadgeClass(tone),
                        )}
                      >
                        {getNotificationTypeLabel(notification.type)}
                      </span>

                      <span className="text-[11px] text-muted-foreground tracking-tight">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
