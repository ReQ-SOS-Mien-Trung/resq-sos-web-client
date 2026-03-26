"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  UsersThree,
  CalendarBlank,
  Spinner,
  ArrowRight,
} from "@phosphor-icons/react";
import { useVictimsByPeriod } from "@/services/admin_dashboard";
import type { VictimsByPeriodParams } from "@/services/admin_dashboard";
import { DatePickerInput } from "@/components/ui/date-picker-input";

/* ─── helpers ─── */

type Granularity = "day" | "week" | "month";

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
];

function formatPeriodLabel(period: string, granularity: Granularity): string {
  const d = new Date(period);
  if (isNaN(d.getTime())) return period;

  switch (granularity) {
    case "day":
      return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    case "week":
      return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    case "month":
      return `T${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
    default:
      return period;
  }
}

/* ─── Tooltip ─── */

const CustomTooltip = ({
  active,
  payload,
  granularity,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { label: string; totalVictims: number; period: string };
  }>;
  granularity: Granularity;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const granLabel =
      granularity === "day"
        ? "Ngày"
        : granularity === "week"
          ? "Tuần"
          : "Tháng";

    return (
      <div className="bg-white dark:bg-zinc-800 border border-border/60 rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm">
        <p className="text-xs font-medium text-muted-foreground mb-0.5">
          {granLabel}
        </p>
        <p className="text-sm font-semibold text-foreground">{data.label}</p>
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="text-xl font-bold text-rose-500">
            {data.totalVictims.toLocaleString("vi-VN")}
          </span>
          <span className="text-xs text-muted-foreground">nạn nhân</span>
        </div>
      </div>
    );
  }
  return null;
};

/* ─── Main Component ─── */

const VictimsBarChart = () => {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Build query params
  const params = useMemo<VictimsByPeriodParams>(() => {
    const p: VictimsByPeriodParams = { granularity };
    if (fromDate) p.from = fromDate;
    if (toDate) p.to = toDate;
    return p;
  }, [granularity, fromDate, toDate]);

  // Data hook
  const {
    data: chartData = [],
    isLoading: chartLoading,
    isFetching: chartFetching,
  } = useVictimsByPeriod(params);

  // Format data for recharts
  const formattedData = useMemo(
    () =>
      chartData.map((item) => ({
        ...item,
        label: formatPeriodLabel(item.period, granularity),
      })),
    [chartData, granularity],
  );

  // Total victims
  const totalVictims = useMemo(
    () => chartData.reduce((sum, item) => sum + item.totalVictims, 0),
    [chartData],
  );

  return (
    <Card className="border border-border/50 overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          {/* Title & total */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UsersThree
                size={20}
                weight="duotone"
                className="text-rose-500"
              />
              <CardTitle className="text-base font-semibold text-foreground">
                Thống kê nạn nhân
              </CardTitle>
              {chartFetching && !chartLoading && (
                <Spinner
                  size={14}
                  className="animate-spin text-muted-foreground"
                />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {totalVictims.toLocaleString("vi-VN")}
              </span>
              <span className="text-sm text-muted-foreground">nạn nhân</span>
            </div>
          </div>

          {/* Granularity selector */}
          <div className="flex items-center gap-1.5">
            <CalendarBlank size={14} className="text-muted-foreground" />
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5 gap-0.5">
              {GRANULARITY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium rounded transition-all duration-200",
                    granularity === opt.value
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setGranularity(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-muted-foreground shrink-0">
            Từ
          </span>
          <DatePickerInput
            value={fromDate}
            onChange={setFromDate}
            placeholder="Ngày bắt đầu"
            className="w-[160px]"
          />
          <ArrowRight size={14} className="text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">
            Đến
          </span>
          <DatePickerInput
            value={toDate}
            onChange={setToDate}
            placeholder="Ngày kết thúc"
            className="w-[160px]"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {chartLoading ? (
          <div className="flex items-center justify-center h-[380px]">
            <Spinner
              size={32}
              className="animate-spin text-muted-foreground"
            />
          </div>
        ) : formattedData.length === 0 ? (
          <div className="flex items-center justify-center h-[380px] text-muted-foreground text-sm">
            Không có dữ liệu cho khoảng thời gian này
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={formattedData}>
              <defs>
                <linearGradient
                  id="colorBarVictims"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.85} />
                  <stop offset="60%" stopColor="#f97316" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#fef3c7" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted/30"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fill: "hsl(var(--foreground) / 0.8)",
                  fontSize: 11,
                  fontWeight: 500,
                }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                allowDecimals={false}
                tick={{
                  fill: "hsl(var(--foreground) / 0.8)",
                  fontSize: 11,
                  fontWeight: 500,
                }}
                axisLine={false}
                tickLine={false}
                dx={-10}
              />
              <Tooltip
                content={<CustomTooltip granularity={granularity} />}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
              />
              <Bar
                dataKey="totalVictims"
                fill="url(#colorBarVictims)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default VictimsBarChart;
