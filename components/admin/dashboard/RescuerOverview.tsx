"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAdminRescuers } from "@/services/user/hooks";
import type { UserEntity } from "@/services/user/type";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendUp,
  TrendDown,
  ShieldCheck,
  Handshake,
  UserPlus,
  ArrowRight,
  Pulse,
  Minus,
} from "@phosphor-icons/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Helpers ───

const MONTH_SHORT = [
  "Th1",
  "Th2",
  "Th3",
  "Th4",
  "Th5",
  "Th6",
  "Th7",
  "Th8",
  "Th9",
  "Th10",
  "Th11",
  "Th12",
];

interface MonthlyData {
  month: string;
  monthIndex: number;
  year: number;
  total: number; // cumulative total at end of month
  newCount: number; // joined this month
  core: number; // new core this month
  volunteer: number; // new volunteer this month
}

function buildMonthlyStats(rescuers: UserEntity[]): MonthlyData[] {
  const now = new Date();
  const months: MonthlyData[] = [];

  // Build last 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: MONTH_SHORT[d.getMonth()],
      monthIndex: d.getMonth(),
      year: d.getFullYear(),
      total: 0,
      newCount: 0,
      core: 0,
      volunteer: 0,
    });
  }

  // Count rescuers by month
  rescuers.forEach((r) => {
    const created = new Date(r.createdAt);
    months.forEach((m) => {
      const monthStart = new Date(m.year, m.monthIndex, 1);
      const monthEnd = new Date(m.year, m.monthIndex + 1, 0, 23, 59, 59);

      // Cumulative: created before or during this month
      if (created <= monthEnd) {
        m.total++;
      }

      // New this specific month
      if (created >= monthStart && created <= monthEnd) {
        m.newCount++;
        if (r.rescuerType === "Core") {
          m.core++;
        } else {
          m.volunteer++;
        }
      }
    });
  });

  return months;
}

// ─── Custom Tooltip ───

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
    payload?: MonthlyData;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as MonthlyData;
  return (
    <div className="bg-card border border-border/60 p-3 shadow-xl min-w-45">
      <p className="text-sm tracking-tighter font-bold uppercase text-muted-foreground mb-2">
        {label} / {data?.year}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm tracking-tighter">
          <span className="text-muted-foreground">Tổng tích lũy</span>
          <span className="font-bold">{data?.total}</span>
        </div>
        <div className="flex items-center justify-between text-sm tracking-tighter">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-[#FF5722]" />
            <span className="text-muted-foreground">Mới gia nhập</span>
          </div>
          <span className="font-bold text-[#FF5722]">+{data?.newCount}</span>
        </div>
        <div className="h-px bg-border/50 my-1" />
        <div className="flex items-center justify-between text-sm tracking-tighter">
          <span className="text-muted-foreground">Hệ thống</span>
          <span className="font-semibold">+{data?.core}</span>
        </div>
        <div className="flex items-center justify-between text-sm tracking-tighter">
          <span className="text-muted-foreground">Tình nguyện</span>
          <span className="font-semibold">+{data?.volunteer}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Cell ───

function StatCell({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="p-4 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm tracking-tighter font-bold uppercase text-muted-foreground">
          {label}
        </span>
        <div className={cn("h-8 w-8 flex items-center justify-center", accent)}>
          <Icon className="h-4 w-4" weight="bold" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-black tracking-tighter leading-none">
          {value}
        </p>
        {sub && (
          <p className="text-sm tracking-tighter text-muted-foreground mt-1.5">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function RescuerOverview() {
  const { data: rescuersData, isLoading } = useAdminRescuers();

  const rescuers = useMemo(
    () => (rescuersData?.items ?? []) as UserEntity[],
    [rescuersData],
  );

  const monthlyData = useMemo(() => buildMonthlyStats(rescuers), [rescuers]);

  // Computed stats
  const stats = useMemo(() => {
    const total = rescuers.length;
    const coreCount = rescuers.filter((r) => r.rescuerType === "Core").length;
    const volunteerCount = total - coreCount;
    const banned = rescuers.filter((r) => r.isBanned).length;

    const currentMonth = monthlyData[monthlyData.length - 1];
    const prevMonth = monthlyData[monthlyData.length - 2];
    const newThisMonth = currentMonth?.newCount ?? 0;
    const newPrevMonth = prevMonth?.newCount ?? 0;

    let growthPercent = 0;
    if (newPrevMonth > 0) {
      growthPercent = Math.round(
        ((newThisMonth - newPrevMonth) / newPrevMonth) * 100,
      );
    } else if (newThisMonth > 0) {
      growthPercent = 100;
    }

    // Peak month
    const peakMonth = [...monthlyData].sort(
      (a, b) => b.newCount - a.newCount,
    )[0];

    return {
      total,
      coreCount,
      volunteerCount,
      banned,
      newThisMonth,
      newPrevMonth,
      growthPercent,
      peakMonth,
    };
  }, [rescuers, monthlyData]);

  if (isLoading) {
    return <RescuerOverviewSkeleton />;
  }

  const isGrowth = stats.growthPercent >= 0;

  return (
    <div className="border border-border/50 bg-card overflow-hidden">
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#FF5722] flex items-center justify-center">
            <Users className="h-4 w-4 text-white" weight="bold" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tighter uppercase">
              Cứu hộ viên
            </h2>
            <p className="text-sm tracking-tighter text-muted-foreground">
              Thống kê 12 tháng gần nhất
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-sm font-bold tracking-tighter",
              isGrowth
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400",
            )}
          >
            {isGrowth ? (
              <TrendUp className="h-3.5 w-3.5" weight="bold" />
            ) : stats.growthPercent === 0 ? (
              <Minus className="h-3.5 w-3.5" weight="bold" />
            ) : (
              <TrendDown className="h-3.5 w-3.5" weight="bold" />
            )}
            {isGrowth ? "+" : ""}
            {stats.growthPercent}% so với tháng trước
          </div>
        </div>
      </div>

      {/* ── Editorial Grid ── */}
      <div className="grid grid-cols-12">
        {/* LEFT: Chart area — spans 8 cols */}
        <div className="col-span-12 lg:col-span-8 border-b lg:border-b-0 lg:border-r border-border/40 p-5 flex flex-col">
          {/* Chart title row */}
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-sm tracking-tighter font-bold uppercase text-muted-foreground">
                Biến động nhân sự
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black tracking-tighter leading-none">
                  {stats.total}
                </span>
                <span className="text-sm tracking-tighter text-muted-foreground">
                  cứu hộ viên
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm tracking-tighter text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#FF5722]" />
                <span>Mới gia nhập</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#FF5722]/25" />
                <span>Tổng tích lũy</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-44 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyData}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="rescuerGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#FF5722" stopOpacity={0.25} />
                    <stop
                      offset="100%"
                      stopColor="#FF5722"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                  <linearGradient
                    id="rescuerNewGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#FF5722" stopOpacity={0.5} />
                    <stop
                      offset="100%"
                      stopColor="#FF5722"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-border/30"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{
                    stroke: "#FF5722",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                {/* Cumulative area (background) */}
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#FF5722"
                  strokeWidth={1}
                  strokeOpacity={0.3}
                  fill="url(#rescuerGradient)"
                  dot={false}
                  activeDot={false}
                />
                {/* New rescuers per month (foreground) */}
                <Area
                  type="monotone"
                  dataKey="newCount"
                  stroke="#FF5722"
                  strokeWidth={2.5}
                  fill="url(#rescuerNewGradient)"
                  dot={({ cx, cy, index }) => (
                    <circle
                      key={index}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill="#FF5722"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  )}
                  activeDot={{
                    r: 5,
                    fill: "#FF5722",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT: Stat cells — 4 cols, 2×2 grid */}
        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-4">
          {/* New this month */}
          <div className="border-b border-r lg:border-r-0 border-border/40">
            <div className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm tracking-tighter font-bold uppercase text-muted-foreground">
                  Tháng này
                </span>
                <div className="h-8 w-8 bg-[#FF5722]/10 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-[#FF5722]" weight="bold" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black tracking-tighter leading-none">
                    +{stats.newThisMonth}
                  </p>
                  <div
                    className={cn(
                      "flex items-center gap-0.5 text-sm font-bold tracking-tighter",
                      isGrowth
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {isGrowth ? (
                      <TrendUp className="h-3 w-3" weight="bold" />
                    ) : (
                      <TrendDown className="h-3 w-3" weight="bold" />
                    )}
                    {Math.abs(stats.growthPercent)}%
                  </div>
                </div>
                <p className="text-sm tracking-tighter text-muted-foreground mt-1">
                  vs {stats.newPrevMonth} tháng trước
                </p>
              </div>
            </div>
          </div>

          {/* Core rescuers */}
          <div className="border-b border-border/40">
            <StatCell
              label="Hệ thống"
              value={stats.coreCount}
              icon={ShieldCheck}
              accent="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
              sub={`${stats.total > 0 ? Math.round((stats.coreCount / stats.total) * 100) : 0}% tổng số`}
            />
          </div>

          {/* Volunteer rescuers */}
          <div className="border-b border-r lg:border-r-0 border-border/40">
            <StatCell
              label="Tình nguyện"
              value={stats.volunteerCount}
              icon={Handshake}
              accent="bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400"
              sub={`${stats.total > 0 ? Math.round((stats.volunteerCount / stats.total) * 100) : 0}% tổng số`}
            />
          </div>

          {/* Peak month */}
          <div>
            <div className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm tracking-tighter font-bold uppercase text-muted-foreground">
                  Tháng cao điểm
                </span>
                <div className="h-8 w-8 bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                  <Pulse
                    className="h-4 w-4 text-amber-600 dark:text-amber-400"
                    weight="bold"
                  />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black tracking-tighter leading-none">
                  {stats.peakMonth?.month}
                </p>
                <p className="text-sm tracking-tighter text-muted-foreground mt-1">
                  {stats.peakMonth?.newCount} người gia nhập ·{" "}
                  {stats.peakMonth?.year}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/20">
        <div className="flex items-center gap-4">
          {/* Mini stats */}
          <div className="flex items-center gap-1.5 text-sm tracking-tighter text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-emerald-500" />
            <span>
              Hoạt động:{" "}
              <strong className="text-foreground">
                {stats.total - stats.banned}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm tracking-tighter text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-rose-500" />
            <span>
              Bị cấm:{" "}
              <strong className="text-foreground">{stats.banned}</strong>
            </span>
          </div>
        </div>
        <button className="flex items-center gap-1 text-sm tracking-tighter font-bold text-[#FF5722] hover:underline underline-offset-2 transition-all">
          Xem chi tiết
          <ArrowRight className="h-3 w-3" weight="bold" />
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ───

function RescuerOverviewSkeleton() {
  return (
    <div className="border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <Skeleton className="h-6 w-36" />
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-12">
        <div className="col-span-12 lg:col-span-8 border-b lg:border-b-0 lg:border-r border-border/40 p-5">
          <div className="space-y-2 mb-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-20" />
          </div>
          <Skeleton className="h-55 w-full" />
        </div>
        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-border/40 p-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-8" />
              </div>
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border/40">
        <div className="flex gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
