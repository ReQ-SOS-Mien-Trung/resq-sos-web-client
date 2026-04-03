"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRinging,
  BellSlash,
  CheckCircle,
  Circle,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
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

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 4;

// ─── Tone styles ──────────────────────────────────────────────────────────────

const TONE_STYLES: Record<
  NotificationTone,
  { dot: string; badge: string; leftBar: string }
> = {
  danger: {
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    leftBar: "bg-red-400",
  },
  warning: {
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    leftBar: "bg-amber-400",
  },
  success: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    leftBar: "bg-emerald-500",
  },
  info: {
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    leftBar: "bg-blue-400",
  },
  neutral: {
    dot: "bg-slate-400",
    badge: "bg-muted text-muted-foreground",
    leftBar: "bg-slate-300",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const createdAt = new Date(isoString);
  if (Number.isNaN(createdAt.getTime())) return "Không rõ";

  const diffMs = Date.now() - createdAt.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Vừa xong";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} phút trước`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} giờ trước`;
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(createdAt);
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function NotificationListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: PAGE_SIZE }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-border/50 p-3 animate-pulse flex gap-3"
        >
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/5 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-2/5 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [page, setPage] = useState(0);
  const [isRinging, setIsRinging] = useState(false);
  const prevIdsRef = useRef<Set<number>>(new Set());

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

  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));
  const pagedNotifications = notifications.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );

  // ── Detect new notifications → ring + sound ──
  useEffect(() => {
    if (notifications.length === 0) return;

    const currentIds = new Set(notifications.map((n) => n.userNotificationId));
    const prevIds = prevIdsRef.current;

    // First load: just record IDs, don't ring yet
    if (prevIds.size === 0) {
      prevIdsRef.current = currentIds;
      return;
    }

    const hasNew = notifications.some((n) => !prevIds.has(n.userNotificationId));
    if (hasNew) {
      setIsRinging(true);
      setTimeout(() => setIsRinging(false), 950);

      try {
        const audio = new Audio("/sounds/notification.mp3");
        audio.volume = 0.6;
        void audio.play().catch(() => null);
      } catch {
        // ignore autoplay policy errors
      }
    }

    prevIdsRef.current = currentIds;
  }, [notifications]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setPage(0);
  };

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
    if (destination) router.push(destination);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead(undefined, {
      onSuccess: () => toast.success("Đã đánh dấu tất cả là đã đọc"),
      onError: () => toast.error("Không thể cập nhật thông báo. Vui lòng thử lại."),
    });
  };

  const displayUnreadCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", buttonClassName)}
          aria-label="Mở bảng thông báo"
        >
          {unreadCount > 0 ? (
            <BellRinging
              className={cn("h-5 w-5", isRinging && "bell-ring")}
              weight="duotone"
            />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {displayUnreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className={cn("w-[360px] p-0 overflow-hidden shadow-xl", contentClassName)}
      >
        {/* ── Header ── */}
        <div className="border-b px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-tighter">{title}</p>
            <p className="text-xs text-muted-foreground tracking-tighter mt-0.5">
              {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Tất cả đã được đọc"}
            </p>
          </div>
          {showMarkAll && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground gap-1.5"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Đọc hết
            </Button>
          )}
        </div>

        {/* ── Body ── */}
        {isLoading ? (
          <NotificationListSkeleton />
        ) : notifications.length === 0 ? (
          <div className="px-4 py-10 text-center flex flex-col items-center justify-center gap-3">
            <BellSlash size={36} weight="light" className="text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium tracking-tighter">{emptyTitle}</p>
              <p className="text-xs text-muted-foreground mt-1 tracking-tighter">
                {emptyDescription}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-2 space-y-1">
              {pagedNotifications.map((notification) => {
                const tone = getNotificationTypeTone(notification.type);
                const styles = TONE_STYLES[tone] ?? TONE_STYLES.neutral;
                const isUnread = !notification.isRead;

                return (
                  <button
                    key={notification.userNotificationId}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full rounded-xl border text-left transition-all duration-150 overflow-hidden",
                      "hover:shadow-sm hover:border-border",
                      isUnread
                        ? "border-border/60 bg-muted/30"
                        : "border-transparent bg-transparent hover:bg-muted/40",
                    )}
                  >
                    <div className="flex">
                      {/* Accent bar */}
                      <div
                        className={cn(
                          "w-1 shrink-0 rounded-l-xl",
                          isUnread ? styles.leftBar : "bg-transparent",
                        )}
                      />
                      <div className="flex-1 px-3 py-2.5">
                        {/* Title + dot */}
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm tracking-tighter line-clamp-1 leading-snug",
                              isUnread
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground/80",
                            )}
                          >
                            {notification.title}
                          </p>
                          {isUnread && (
                            <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", styles.dot)} />
                          )}
                        </div>

                        {/* Body */}
                        {notification.body && (
                          <p className="text-xs font-medium text-muted-foreground tracking-tighter line-clamp-2 leading-relaxed">
                            {notification.body}
                          </p>
                        )}

                        {/* Badge + time */}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tracking-tighter",
                              styles.badge,
                            )}
                          >
                            <Circle size={6} weight="fill" className="shrink-0" />
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                          <span className="text-[11px] text-muted-foreground/70 tracking-tighter whitespace-nowrap">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-3 py-2 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded-md hover:bg-muted transition-colors"
                >
                  <CaretLeft size={12} />
                  Trước
                </button>
                <span className="text-xs text-muted-foreground tracking-tighter tabular-nums">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded-md hover:bg-muted transition-colors"
                >
                  Sau
                  <CaretRight size={12} />
                </button>
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
