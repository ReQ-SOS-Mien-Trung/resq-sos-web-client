"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  deriveSOSNeeds,
  getSituationLabel,
  getSosTypeLabel,
  getSupplyLabel,
} from "@/lib/sos";
import { useSOSRequests } from "@/services/sos_request/hooks";
import type {
  SOSPriorityLevel,
  SOSRequestEntity,
  SOSRequestStatus,
} from "@/services/sos_request/type";
import {
  Anchor,
  ArrowRight,
  CheckCircle,
  Clock,
  ForkKnife,
  HourglassHigh,
  Pulse,
  Siren,
  Spinner,
  Stethoscope,
  Users,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const statusConfig: Record<
  SOSRequestStatus,
  {
    label: string;
    icon: React.ReactNode;
    badgeVariant: "destructive" | "warning" | "success" | "secondary" | "info";
    badgeClassName?: string;
  }
> = {
  Pending: {
    label: "Chờ xử lý",
    icon: <HourglassHigh className="h-3.5 w-3.5" weight="fill" />,
    badgeVariant: "warning",
  },
  InProgress: {
    label: "Đang thực thi",
    icon: <Spinner className="h-3.5 w-3.5 animate-spin" />,
    badgeVariant: "info",
  },
  Assigned: {
    label: "Đang thực thi",
    icon: <Spinner className="h-3.5 w-3.5 animate-spin" />,
    badgeVariant: "info",
  },
  Completed: {
    label: "Hoàn thành",
    icon: <CheckCircle className="h-3.5 w-3.5" weight="fill" />,
    badgeVariant: "success",
  },
  Incident: {
    label: "Sự cố",
    icon: <Warning className="h-3.5 w-3.5" weight="fill" />,
    badgeVariant: "destructive",
  },
  Resolved: {
    label: "Đã giải quyết",
    icon: <CheckCircle className="h-3.5 w-3.5" weight="fill" />,
    badgeVariant: "success",
  },
  Cancelled: {
    label: "Đã huỷ",
    icon: <XCircle className="h-3.5 w-3.5" weight="fill" />,
    badgeVariant: "secondary",
    badgeClassName: "bg-slate-500 text-white border-transparent",
  },
};

const priorityConfig: Record<
  SOSPriorityLevel,
  {
    label: string;
    dotClassName: string;
    borderClassName: string;
    badgeVariant: "p1" | "p2" | "p3" | "p4";
  }
> = {
  Critical: {
    label: "Nguy cấp",
    dotClassName: "bg-red-500",
    borderClassName:
      "border-red-200 bg-red-50/40 dark:border-red-900/50 dark:bg-red-950/10",
    badgeVariant: "p1",
  },
  High: {
    label: "Cao",
    dotClassName: "bg-orange-500",
    borderClassName:
      "border-orange-200 bg-orange-50/40 dark:border-orange-900/50 dark:bg-orange-950/10",
    badgeVariant: "p2",
  },
  Medium: {
    label: "Trung bình",
    dotClassName: "bg-yellow-500",
    borderClassName:
      "border-yellow-200 bg-yellow-50/40 dark:border-yellow-900/50 dark:bg-yellow-950/10",
    badgeVariant: "p3",
  },
  Low: {
    label: "Thấp",
    dotClassName: "bg-emerald-500",
    borderClassName:
      "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/10",
    badgeVariant: "p4",
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

function getPeopleCount(sos: SOSRequestEntity) {
  const people = sos.structuredData?.people_count;
  if (!people) return 0;
  return people.adult + people.child + people.elderly;
}

function buildSOSHeadline(sos: SOSRequestEntity) {
  const people = sos.structuredData?.people_count;
  const parts: string[] = [];
  const typeLabel = getSosTypeLabel(sos.sosType);

  if (typeLabel !== "SOS") {
    parts.push(`[${typeLabel}]`);
  }

  if (sos.structuredData?.situation) {
    parts.push(`Tình trạng: ${getSituationLabel(sos.structuredData.situation)}`);
  }

  const totalPeople = getPeopleCount(sos);
  if (totalPeople > 0) {
    parts.push(`Số người: ${totalPeople}`);
  }

  if ((people?.child ?? 0) > 0) {
    parts.push(`Trẻ em: ${people?.child}`);
  }

  if ((people?.elderly ?? 0) > 0) {
    parts.push(`Người già: ${people?.elderly}`);
  }

  if ((sos.structuredData?.injured_persons?.length ?? 0) > 0) {
    parts.push(`Bị thương: ${sos.structuredData?.injured_persons?.length}`);
  }

  return parts.join(" | ");
}

function buildSOSSupportingText(sos: SOSRequestEntity) {
  const parts: string[] = [];
  const supplies = sos.structuredData?.supplies ?? [];

  if (supplies.length > 0) {
    parts.push(
      `Cần: ${supplies
        .slice(0, 3)
        .map((item) => getSupplyLabel(item))
        .join(", ")}`,
    );
  }

  if (sos.msg?.trim()) {
    parts.push(`Ghi chú: ${sos.msg.trim()}`);
  }

  return parts.join(" | ");
}

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
      <div className="mb-1 flex items-center justify-center gap-1.5">
        {icon}
        {pulse && value > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
        )}
      </div>
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function NeedChip({
  children,
  className,
  icon,
}: {
  children: React.ReactNode;
  className: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium",
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

function SOSRow({ sos }: { sos: SOSRequestEntity }) {
  const status = statusConfig[sos.status];
  const priority = priorityConfig[sos.priorityLevel];
  const needs = deriveSOSNeeds(sos.structuredData, sos.sosType);
  const headline = buildSOSHeadline(sos);
  const supportingText = buildSOSSupportingText(sos);

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 transition-colors hover:bg-muted/20",
        priority.borderClassName,
      )}
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn("h-2.5 w-2.5 rounded-full", priority.dotClassName)}
              />
              <span className="text-sm font-semibold">SOS #{sos.id}</span>
            </div>

            <Badge
              variant={priority.badgeVariant}
              className="h-5 px-1.5 py-0 text-[10px] leading-none"
            >
              {priority.label}
            </Badge>

            <Badge
              variant={status.badgeVariant}
              className={cn(
                "h-5 gap-1 px-1.5 py-0 text-[10px] leading-none",
                status.badgeClassName,
              )}
            >
              {status.icon}
              {status.label}
            </Badge>
          </div>

          {headline && (
            <p className="mt-1.5 text-sm text-foreground/90">{headline}</p>
          )}

          {supportingText && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {supportingText}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {getPeopleCount(sos) > 0 && (
              <NeedChip
                className="bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                icon={<Users className="h-3.5 w-3.5" weight="fill" />}
              >
                {getPeopleCount(sos)} nạn nhân
              </NeedChip>
            )}
            {needs.medical && (
              <NeedChip
                className="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                icon={<Stethoscope className="h-3.5 w-3.5" weight="fill" />}
              >
                Y tế
              </NeedChip>
            )}
            {needs.food && (
              <NeedChip
                className="bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
                icon={<ForkKnife className="h-3.5 w-3.5" weight="fill" />}
              >
                Tiếp tế
              </NeedChip>
            )}
            {needs.boat && (
              <NeedChip
                className="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                icon={<Anchor className="h-3.5 w-3.5" weight="fill" />}
              >
                Phương tiện
              </NeedChip>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 self-end text-xs text-muted-foreground lg:self-start">
          <Clock className="h-3 w-3" />
          {timeAgo(sos.createdAt)}
        </div>
      </div>
    </div>
  );
}

const SOSOverview = () => {
  const { data, isLoading, isError } = useSOSRequests({
    params: { pageSize: 200 },
  });

  const stats = useMemo(() => {
    const list = data?.items ?? [];

    return {
      total: list.length,
      pending: list.filter((s) => s.status === "Pending").length,
      inProgress: list.filter(
        (s) => s.status === "InProgress" || s.status === "Assigned",
      ).length,
      completed: list.filter((s) => s.status === "Completed").length,
      cancelled: list.filter((s) => s.status === "Cancelled").length,
      byPriority: list.reduce(
        (acc, s) => {
          acc[s.priorityLevel] = (acc[s.priorityLevel] || 0) + 1;
          return acc;
        },
        {} as Record<SOSPriorityLevel, number>,
      ),
    };
  }, [data]);

  const activeRequests = useMemo(() => {
    const list = data?.items ?? [];
    const priorityOrder: Record<SOSPriorityLevel, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    };

    return list
      .filter(
        (s) =>
          s.status === "Pending" ||
          s.status === "InProgress" ||
          s.status === "Assigned",
      )
      .sort((a, b) => {
        const priorityDiff =
          priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel];

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [data]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden border border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border border-border/50">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <Warning
            className="mx-auto mb-2 h-8 w-8 text-orange-500"
            weight="fill"
          />
          Không thể tải dữ liệu SOS. Vui lòng thử lại sau.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-border/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/40">
              <Siren
                className="h-5 w-5 text-red-600 dark:text-red-400"
                weight="fill"
              />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Tổng quan SOS
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Theo dõi yêu cầu cứu hộ khẩn cấp
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-6 gap-1 text-[11px]">
              <Pulse className="h-3.5 w-3.5 text-emerald-500" weight="bold" />
              Realtime
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-6 gap-1 text-[11px] px-2.5"
              asChild
            >
              <Link href="/dashboard/admin/sos-requests">
                Xem tất cả
                <ArrowRight className="h-3 w-3" weight="bold" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Chờ xử lý"
            value={stats.pending}
            icon={
              <HourglassHigh className="h-4 w-4 text-amber-500" weight="fill" />
            }
            color="border-amber-500/20 bg-amber-500/5"
            pulse
          />
          <StatCard
            label="Đang thực thi"
            value={stats.inProgress}
            icon={<Spinner className="h-4 w-4 animate-spin text-blue-500" />}
            color="border-blue-500/20 bg-blue-500/5"
          />
          <StatCard
            label="Hoàn thành"
            value={stats.completed}
            icon={
              <CheckCircle className="h-4 w-4 text-emerald-500" weight="fill" />
            }
            color="border-emerald-500/20 bg-emerald-500/5"
          />
          <StatCard
            label="Đã huỷ"
            value={stats.cancelled}
            icon={<XCircle className="h-4 w-4 text-slate-400" weight="fill" />}
            color="border-slate-500/20 bg-slate-500/5"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Phân bổ theo mức độ ưu tiên
            </span>
            <span className="text-xs text-muted-foreground">
              Tổng: {stats.total}
            </span>
          </div>

          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/60">
            {(["Critical", "High", "Medium", "Low"] as SOSPriorityLevel[]).map(
              (level) => {
                const count = stats.byPriority[level] || 0;
                if (count === 0 || stats.total === 0) return null;

                const colors: Record<SOSPriorityLevel, string> = {
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
                    style={{ width: `${(count / stats.total) * 100}%` }}
                    title={`${priorityConfig[level].label}: ${count}`}
                  />
                );
              },
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(["Critical", "High", "Medium", "Low"] as SOSPriorityLevel[]).map(
              (level) => {
                const count = stats.byPriority[level] || 0;
                if (count === 0) return null;

                return (
                  <div
                    key={level}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        priorityConfig[level].dotClassName,
                      )}
                    />
                    {priorityConfig[level].label}: {count}
                  </div>
                );
              },
            )}
          </div>
        </div>

        <Separator />

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Siren className="h-3.5 w-3.5" weight="bold" />
              Yêu cầu đang hoạt động
            </h4>
            <Badge variant="secondary" className="h-5 px-2 text-[10px]">
              {activeRequests.length} yêu cầu
            </Badge>
          </div>

          {activeRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle
                className="mb-2 h-10 w-10 text-emerald-400"
                weight="fill"
              />
              <p className="text-sm font-medium text-foreground/70">
                Tất cả yêu cầu đã được xử lý
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Không có SOS nào đang chờ hoặc đang thực thi
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[320px]">
              <div className="space-y-2 pr-3">
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
