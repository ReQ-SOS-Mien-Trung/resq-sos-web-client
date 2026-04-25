"use client";

import { useMemo, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner, ClipboardText, CheckCircle } from "@phosphor-icons/react";
import { useMissionTeamReportsSummary } from "@/services/admin_dashboard";

ChartJS.register(ArcElement, ChartTooltip, Legend);

/* ─── Config ─── */

const SEGMENTS = [
  {
    key: "submittedCount" as const,
    label: "Đã nộp",
    color: "#22c55e",
    bg: "bg-green-100 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
  },
  {
    key: "draftCount" as const,
    label: "Bản nháp",
    color: "#f59e0b",
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  {
    key: "notStartedCount" as const,
    label: "Chưa bắt đầu",
    color: "#e11d48",
    bg: "bg-rose-100 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
];

/* ─── Main Component ─── */

const MissionReportComplianceChart = () => {
  const chartRef = useRef(null);

  const { data, isLoading } = useMissionTeamReportsSummary();

  const summary = useMemo(
    () =>
      data ?? {
        totalCompletedTeams: 0,
        notStartedCount: 0,
        draftCount: 0,
        submittedCount: 0,
        submissionRate: 0,
      },
    [data],
  );

  const total =
    summary.submittedCount + summary.draftCount + summary.notStartedCount;

  const chartData = useMemo(
    () => ({
      labels: SEGMENTS.map((s) => s.label),
      datasets: [
        {
          data: SEGMENTS.map((s) => summary[s.key]),
          backgroundColor: SEGMENTS.map((s) => s.color),
          borderColor: "transparent",
          borderWidth: 0,
          hoverOffset: 0,
        },
      ],
    }),
    [summary],
  );

  const options = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      layout: { padding: 8 },
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
            label: (item: TooltipItem<"doughnut">) => {
              const val = Number(item.raw);
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return ` ${val} đội (${pct}%)`;
            },
          },
        },
      },
      animation: { duration: 800, easing: "easeInOutQuart" },
    }),
    [total],
  );

  return (
    <Card className="border border-border/50 overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ClipboardText
            size={20}
            weight="duotone"
            className="text-violet-500"
          />
          <CardTitle className="text-base font-semibold text-foreground">
            Tuân thủ báo cáo nhiệm vụ
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Doughnut chart + center label */}
            <div className="flex flex-col items-center gap-1">
              <div style={{ width: 180, height: 180, lineHeight: 0 }}>
                <Doughnut ref={chartRef} data={chartData} options={options} />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black tracking-tighter leading-none">
                  {total}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  đội
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              {SEGMENTS.map((seg) => {
                const val = summary[seg.key];
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return (
                  <div
                    key={seg.key}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.dot}`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {seg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${seg.text}`}>
                        {val}
                      </span>
                      <span className="text-xs text-muted-foreground w-9 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Total Completed Teams */}
              <div className="rounded-xl bg-muted/50 p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle
                    size={14}
                    weight="duotone"
                    className="text-emerald-500"
                  />
                  <span className="text-xs text-muted-foreground tracking-tighter">
                    Đội hoàn thành
                  </span>
                </div>
                <span className="text-xl font-black tracking-tighter leading-none">
                  {summary.totalCompletedTeams}
                </span>
              </div>

              {/* Submission Rate */}
              <div className="rounded-xl bg-muted/50 p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <ClipboardText
                    size={14}
                    weight="duotone"
                    className="text-violet-500"
                  />
                  <span className="text-xs text-muted-foreground tracking-tighter">
                    Tỉ lệ nộp báo cáo
                  </span>
                </div>
                <span className="text-xl font-black tracking-tighter leading-none">
                  {summary.submissionRate}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MissionReportComplianceChart;
