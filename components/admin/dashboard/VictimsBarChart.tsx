"use client";

import { useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
);

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

/* ─── Main Component ─── */

const VictimsBarChart = () => {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const chartRef = useRef(null);

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

  // Format data
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

  const granLabel =
    granularity === "day" ? "Ngày" : granularity === "week" ? "Tuần" : "Tháng";

  const chartJsData = useMemo(
    () => ({
      labels: formattedData.map((d) => d.label),
      datasets: [
        {
          label: "Nạn nhân",
          data: formattedData.map((d) => d.totalVictims),
          backgroundColor: (ctx: { chart: ChartJS }) => {
            const canvas = ctx.chart.ctx;
            const gradient = canvas.createLinearGradient(0, 0, 0, 380);
            gradient.addColorStop(0, "rgba(239,68,68,0.85)");
            gradient.addColorStop(0.6, "rgba(249,115,22,0.5)");
            gradient.addColorStop(1, "rgba(254,243,199,0.2)");
            return gradient;
          },
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 48,
        },
      ],
    }),
    [formattedData],
  );

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing: "easeInOutQuart",
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "white",
          titleColor: "#6b7280",
          bodyColor: "#111827",
          borderColor: "rgba(0,0,0,0.08)",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            title: (items: TooltipItem<"bar">[]) =>
              `${granLabel}: ${items[0]?.label ?? ""}`,
            label: (item: TooltipItem<"bar">) =>
              ` ${Number(item.raw).toLocaleString("vi-VN")} nạn nhân`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: "rgba(100,116,139,0.8)",
            font: { size: 11, weight: "500" },
          },
        },
        y: {
          grid: {
            color: "rgba(100,116,139,0.1)",
          },
          border: { display: false, dash: [4, 4] },
          ticks: {
            color: "rgba(100,116,139,0.8)",
            font: { size: 11, weight: "500" },
            precision: 0,
          },
        },
      },
    }),
    [granLabel],
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
              <span className="text-2xl font-bold tracking-tighter text-foreground">
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
                    "h-7 px-2.5 text-sm tracking-tighter font-medium rounded transition-all duration-200",
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
          <span className="text-sm tracking-tighter text-muted-foreground shrink-0">
            Từ
          </span>
          <DatePickerInput
            value={fromDate}
            onChange={setFromDate}
            placeholder="Ngày bắt đầu"
            className="w-[160px]"
          />
          <ArrowRight size={14} className="text-muted-foreground shrink-0" />
          <span className="text-sm tracking-tighter text-muted-foreground shrink-0">
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
            <Spinner size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : formattedData.length === 0 ? (
          <div className="flex items-center justify-center h-[380px] text-muted-foreground text-sm">
            Không có dữ liệu cho khoảng thời gian này
          </div>
        ) : (
          <div style={{ height: 380 }}>
            <Bar ref={chartRef} data={chartJsData} options={options} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VictimsBarChart;
