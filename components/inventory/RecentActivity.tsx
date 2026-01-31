"use client";

import { useState, useEffect } from "react";
import { ActivityLog } from "@/types/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ArrowLineDown,
  ArrowLineUp,
  ClipboardText,
  PencilSimple,
  Truck,
  Package,
  ClockCounterClockwise,
} from "@phosphor-icons/react";

interface RecentActivityProps {
  activities: ActivityLog[];
  maxItems?: number;
}

const actionConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string; label: string }
> = {
  STOCK_IN: {
    icon: <ArrowLineDown className="h-4 w-4" />,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Nhập kho",
  },
  STOCK_OUT: {
    icon: <ArrowLineUp className="h-4 w-4" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Xuất kho",
  },
  ADJUSTMENT: {
    icon: <PencilSimple className="h-4 w-4" />,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    label: "Điều chỉnh",
  },
  REQUEST_CREATED: {
    icon: <ClipboardText className="h-4 w-4" />,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    label: "Tạo yêu cầu",
  },
  REQUEST_APPROVED: {
    icon: <ClipboardText className="h-4 w-4" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    label: "Duyệt yêu cầu",
  },
  SHIPMENT_SENT: {
    icon: <Truck className="h-4 w-4" />,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    label: "Gửi hàng",
  },
  SHIPMENT_RECEIVED: {
    icon: <Package className="h-4 w-4" weight="fill" />,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    label: "Nhận hàng",
  },
};

function formatTimeAgo(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins} phút trước`;
  } else if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  } else {
    return `${diffDays} ngày trước`;
  }
}

export default function RecentActivity({
  activities,
  maxItems = 10,
}: RecentActivityProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const displayedActivities = activities.slice(0, maxItems);

  // Use setTimeout to avoid synchronous setState warning in effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentTime(new Date());
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClockCounterClockwise className="h-5 w-5 text-primary" />
          Hoạt Động Gần Đây
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-100 px-6">
          <div className="space-y-1 pb-4">
            {displayedActivities.map((activity, index) => {
              const config = actionConfig[activity.action];
              return (
                <div key={activity.id} className="relative">
                  {/* Timeline line */}
                  {index < displayedActivities.length - 1 && (
                    <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
                  )}

                  <div className="flex gap-4 py-3">
                    {/* Icon */}
                    <div
                      className={cn(
                        "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        config?.bgColor || "bg-muted",
                      )}
                    >
                      <span
                        className={config?.color || "text-muted-foreground"}
                      >
                        {config?.icon || (
                          <ClockCounterClockwise className="h-4 w-4" />
                        )}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            config?.color || "text-foreground",
                          )}
                        >
                          {config?.label || activity.action}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {currentTime
                            ? formatTimeAgo(activity.performedAt, currentTime)
                            : "..."}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {activity.details}
                      </p>
                      {activity.itemName && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {activity.itemName}
                          </span>
                          {activity.quantity && (
                            <span
                              className={cn(
                                "text-xs font-medium",
                                activity.quantity > 0
                                  ? "text-green-500"
                                  : "text-red-500",
                              )}
                            >
                              {activity.quantity > 0 ? "+" : ""}
                              {activity.quantity}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        bởi {activity.performedBy}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {activities.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <ClockCounterClockwise className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chưa có hoạt động nào</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
