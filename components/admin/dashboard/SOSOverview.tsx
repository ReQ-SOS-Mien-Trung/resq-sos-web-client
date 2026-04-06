"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useSOSRequests } from "@/services/sos_request/hooks";
import type {
  SOSRequestEntity,
  SOSRequestStatus,
  SOSPriorityLevel,
} from "@/services/sos_request/type";
import {
  Siren,
  HourglassHigh,
  Spinner,
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
  Warning,
  ArrowRight,
  Pulse,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

// ---------- helpers ----------

const statusConfig: Record<
  SOSRequestStatus,
  {
    label: string;
    icon: React.ReactNode;
    dotColor: string;
    badgeVariant: "destructive" | "warning" | "success" | "secondary";
  }
> = {
  Pending: {
    label: "Chờ xử lý",
    icon: <HourglassHigh className="h-3.5 w-3.5" weight="fill" />,
    dotColor: "bg-amber-500",
    badgeVariant: "warning",
  },
  InProgress: {
    label: "Đang thực thi",
    icon: <Spinner className="h-3.5 w-3.5 animate-spin" />,
    dotColor: "bg-blue-500",
    badgeVariant: "info" as never, // we will use a custom class
  },
  Completed: {
    label: "Hoàn thành",
    icon: <CheckCircle className="h-3.5 w-3.5" weight="fill" />,
    dotColor: "bg-emerald-500",
    badgeVariant: "success",
  },
  Cancelled: {
    label: "Đã huỷ",
    icon: <XCircle className="h-3.5 w-3.5" weight="fill" />,
    dotColor: "bg-gray-400",
    badgeVariant: "secondary",
  },
};

const priorityConfig: Record<
  SOSPriorityLevel,
  { label: string; color: string; bgColor: string; ringColor: string }
> = {
  Critical: {
    label: "Nguy cấp",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/40",
    ringColor: "ring-red-500/30",
  },
  High: {
    label: "Cao",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/40",
    ringColor: "ring-orange-500/30",
  },
  Medium: {
    label: "Trung bình",
    color: "text-yellow-600 dark:text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/40",
    ringColor: "ring-yellow-500/30",
  },
  Low: {
    label: "Thấp",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    ringColor: "ring-emerald-500/30",
  },
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: vi,
    });
  } catch {
    return "—";
  }
}

// ---------- sub-components ----------

function StatCard({
  label,
  value,
  icon,
  color,
  pulse,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border p-3 text-center transition-all duration-200 hover:shadow-md",
        color,
      )}
    >
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {icon}
        {pulse && value > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
          </span>
        )}
      </div>
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function SOSRow({ sos }: { sos: SOSRequestEntity }) {
  const status = statusConfig[sos.status];
  const priority = priorityConfig[sos.priorityLevel];

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors duration-150 cursor-default">
      {/* Priority indicator dot */}
      <div className="shrink-0">
        <div
          className={cn(
            "w-2 h-2 rounded-full ring-2 ring-offset-1 ring-offset-background",
            priority.ringColor,
            priority.bgColor.includes("red")
              ? "bg-red-500"
              : priority.bgColor.includes("orange")
                ? "bg-orange-500"
                : priority.bgColor.includes("yellow")
                  ? "bg-yellow-500"
                  : "bg-emerald-500",
          )}
        />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">SOS #{sos.id}</span>
          <Badge
            variant={
              sos.priorityLevel === "Critical" || sos.priorityLevel === "High"
                ? "p1"
                : sos.priorityLevel === "Medium"
                  ? "p2"
                  : "p3"
            }
            className="text-[10px] px-1.5 py-0 h-4 leading-none"
          >
            {priority.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {sos.msg || "Không có nội dung"}
        </p>
      </div>

      {/* Meta */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <Badge
          variant={status.badgeVariant}
          className={cn(
            "text-[10px] px-1.5 py-0 h-5 gap-1",
            sos.status === "InProgress" &&
              "bg-blue-500 text-white border-transparent",
          )}
        >
          {status.icon}
          {status.label}
        </Badge>
        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
          <Clock className="h-3 w-3" />
          {timeAgo(sos.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ---------- main component ----------

const SOSOverview = () => {
  const { data, isLoading, isError } = useSOSRequests();

  const stats = useMemo(() => {
    if (!data?.items)
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        byPriority: {} as Record<string, number>,
      };
    const list = data.items;
    return {
      total: list.length,
      pending: list.filter((s) => s.status === "Pending").length,
      inProgress: list.filter((s) => s.status === "InProgress").length,
      completed: list.filter((s) => s.status === "Completed").length,
      cancelled: list.filter((s) => s.status === "Cancelled").length,
      byPriority: list.reduce(
        (acc, s) => {
          acc[s.priorityLevel] = (acc[s.priorityLevel] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }, [data]);

  // Active SOS = Pending + InProgress, sorted by priority then date
  const activeRequests = useMemo(() => {
    if (!data?.items) return [];
    const priorityOrder: Record<string, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    };
    return data.items
      .filter((s) => s.status === "Pending" || s.status === "InProgress")
      .sort((a, b) => {
        const pDiff =
          (priorityOrder[a.priorityLevel] ?? 4) -
          (priorityOrder[b.priorityLevel] ?? 4);
        if (pDiff !== 0) return pDiff;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [data]);

  if (isLoading) {
    return (
      <Card className="border border-border/50 overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border border-border/50">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <Warning
            className="h-8 w-8 mx-auto mb-2 text-orange-500"
            weight="fill"
          />
          Không thể tải dữ liệu SOS. Vui lòng thử lại sau.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center border border-red-200 dark:border-red-800/40">
              <Siren
                className="h-5 w-5 text-red-600 dark:text-red-400"
                weight="fill"
              />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Tổng quan SOS
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Theo dõi yêu cầu cứu hộ khẩn cấp
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] gap-1 h-6">
            <Pulse className="h-3.5 w-3.5 text-emerald-500" weight="bold" />
            Realtime
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Stats Grid */}
        <div className="grid grid-cols-4 gap-2.5">
          <StatCard
            label="Chờ xử lý"
            value={stats.pending}
            icon={
              <HourglassHigh className="h-4 w-4 text-amber-500" weight="fill" />
            }
            color="bg-amber-500/5 border-amber-500/20"
            pulse
          />
          <StatCard
            label="Đang thực thi"
            value={stats.inProgress}
            icon={<Spinner className="h-4 w-4 text-blue-500 animate-spin" />}
            color="bg-blue-500/5 border-blue-500/20"
          />
          <StatCard
            label="Hoàn thành"
            value={stats.completed}
            icon={
              <CheckCircle className="h-4 w-4 text-emerald-500" weight="fill" />
            }
            color="bg-emerald-500/5 border-emerald-500/20"
          />
          <StatCard
            label="Đã huỷ"
            value={stats.cancelled}
            icon={<XCircle className="h-4 w-4 text-gray-400" weight="fill" />}
            color="bg-gray-500/5 border-gray-500/20"
          />
        </div>

        {/* Priority breakdown bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Phân bổ theo mức độ ưu tiên
            </span>
            <span className="text-xs text-muted-foreground">
              Tổng: {stats.total}
            </span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/60">
            {(["Critical", "High", "Medium", "Low"] as SOSPriorityLevel[]).map(
              (level) => {
                const count = stats.byPriority[level] || 0;
                if (count === 0) return null;
                const percent = (count / stats.total) * 100;
                const colors: Record<string, string> = {
                  Critical: "bg-red-500",
                  High: "bg-orange-500",
                  Medium: "bg-yellow-500",
                  Low: "bg-emerald-500",
                };
                return (
                  <div
                    key={level}
                    className={cn(
                      "h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full",
                      colors[level],
                    )}
                    style={{ width: `${percent}%` }}
                    title={`${priorityConfig[level].label}: ${count}`}
                  />
                );
              },
            )}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {(["Critical", "High", "Medium", "Low"] as SOSPriorityLevel[]).map(
              (level) => {
                const count = stats.byPriority[level] || 0;
                if (count === 0) return null;
                const dotColors: Record<string, string> = {
                  Critical: "bg-red-500",
                  High: "bg-orange-500",
                  Medium: "bg-yellow-500",
                  Low: "bg-emerald-500",
                };
                return (
                  <div
                    key={level}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                  >
                    <div
                      className={cn("h-2 w-2 rounded-full", dotColors[level])}
                    />
                    {priorityConfig[level].label}: {count}
                  </div>
                );
              },
            )}
          </div>
        </div>

        <Separator />

        {/* Active SOS list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Siren className="h-3.5 w-3.5" weight="bold" />
              Yêu cầu đang hoạt động
            </h4>
            <Badge variant="secondary" className="text-[10px] h-5 px-2">
              {activeRequests.length} yêu cầu
            </Badge>
          </div>

          {activeRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle
                className="h-10 w-10 text-emerald-400 mb-2"
                weight="fill"
              />
              <p className="text-sm font-medium text-foreground/70">
                Tất cả yêu cầu đã được xử lý
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Không có SOS nào đang chờ hoặc đang thực thi
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[280px]">
              <div className="space-y-0.5">
                {activeRequests.map((sos) => (
                  <SOSRow key={sos.id} sos={sos} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SOSOverview;
