"use client";

import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip as ChartTooltip,
} from "chart.js";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RecentActivityProps } from "@/type";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

const actionConfig = {
  STOCK_IN: {
    label: "Nhập kho",
    color: "#22c55e",
    tone: "bg-green-500/10 text-green-600",
  },
  STOCK_OUT: {
    label: "Xuất kho",
    color: "#3b82f6",
    tone: "bg-blue-500/10 text-blue-600",
  },
  ADJUSTMENT: {
    label: "Điều chỉnh",
    color: "#f97316",
    tone: "bg-orange-500/10 text-orange-600",
  },
  REQUEST_CREATED: {
    label: "Tạo yêu cầu",
    color: "#a855f7",
    tone: "bg-purple-500/10 text-purple-600",
  },
  REQUEST_APPROVED: {
    label: "Duyệt yêu cầu",
    color: "#10b981",
    tone: "bg-emerald-500/10 text-emerald-600",
  },
  SHIPMENT_SENT: {
    label: "Gửi hàng",
    color: "#06b6d4",
    tone: "bg-cyan-500/10 text-cyan-600",
  },
  SHIPMENT_RECEIVED: {
    label: "Nhận hàng",
    color: "#14b8a6",
    tone: "bg-teal-500/10 text-teal-600",
  },
} as const;

const RecentActivity = ({ activities, maxItems = 10 }: RecentActivityProps) => {
  const displayedActivities = [...activities]
    .sort((left, right) => {
      return right.performedAt.getTime() - left.performedAt.getTime();
    })
    .slice(0, maxItems);

  const chartEntries = Object.entries(actionConfig)
    .map(([action, config]) => {
      const count = displayedActivities.filter(
        (activity) => activity.action === action,
      ).length;

      return {
        action,
        ...config,
        count,
      };
    })
    .filter((entry) => entry.count > 0);

  const dominantEntry = [...chartEntries].sort((left, right) => {
    return right.count - left.count;
  })[0];

  const lastUpdated = displayedActivities[0]?.performedAt;
  const totalQuantity = displayedActivities.reduce((sum, activity) => {
    return sum + Math.abs(activity.quantity ?? 0);
  }, 0);

  const chartData = {
    labels: chartEntries.map((entry) => entry.label),
    datasets: [
      {
        label: "Số hoạt động",
        data: chartEntries.map((entry) => entry.count),
        backgroundColor: chartEntries.map((entry) => entry.color),
        borderRadius: 999,
        borderSkipped: false,
        maxBarThickness: 38,
      },
    ],
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ClockCounterClockwise className="h-5 w-5 text-primary" />
          Hoạt Động Gần Đây
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5 p-6 pt-0">
        {displayedActivities.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Tổng hoạt động
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {displayedActivities.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Trong {maxItems} bản ghi gần nhất
                </p>
              </div>

              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Nổi bật nhất
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {dominantEntry?.label ?? "Chưa có dữ liệu"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dominantEntry?.count ?? 0} lần ghi nhận
                </p>
              </div>

              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Số lượng xử lý
                </p>
                <p className="mt-2 text-2xl font-semibold">{totalQuantity}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lastUpdated
                    ? `Cập nhật ${new Intl.DateTimeFormat("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(lastUpdated)}`
                    : "Chưa có cập nhật"}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border bg-linear-to-br from-slate-50 via-white to-slate-100 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold tracking-tighter">
                    Phân bố hoạt động theo nhóm
                  </p>
                  <p className="text-sm text-muted-foreground tracking-tighter">
                    Biểu đồ tạm thời để thay cho danh sách timeline cũ
                  </p>
                </div>
              </div>

              <div className="h-70">
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                      duration: 700,
                    },
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        backgroundColor: "#0f172a",
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                          label: (context) =>
                            `${context.label}: ${context.parsed.y} hoạt động`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: {
                          display: false,
                        },
                        ticks: {
                          color: "#64748b",
                          font: {
                            size: 11,
                            weight: 600,
                          },
                        },
                        border: {
                          display: false,
                        },
                      },
                      y: {
                        beginAtZero: true,
                        ticks: {
                          precision: 0,
                          stepSize: 1,
                          color: "#94a3b8",
                          font: {
                            size: 11,
                          },
                        },
                        grid: {
                          color: "rgba(148, 163, 184, 0.18)",
                          drawBorder: false,
                        },
                        border: {
                          display: false,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {chartEntries.map((entry) => (
                <div
                  key={entry.action}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
                    entry.tone,
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.label}
                  <span className="text-foreground/80">{entry.count}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <ClockCounterClockwise className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">Chưa có dữ liệu để vẽ biểu đồ</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
