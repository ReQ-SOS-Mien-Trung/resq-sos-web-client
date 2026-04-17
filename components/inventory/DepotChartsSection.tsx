"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDepotCapacityChart,
  useDepotInventoryMovementChart,
  useDepotFundMovementChart,
} from "@/services/depot/hooks";
import {
  Cube,
  ArrowsDownUp,
  CurrencyCircleDollar,
  CalendarBlank,
} from "@phosphor-icons/react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatVND = (v: number) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function ChartCard({
  title,
  icon,
  iconClass,
  children,
  isLoading,
  className,
  headerExtra,
}: {
  title: string;
  icon: React.ReactNode;
  iconClass: string;
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  headerExtra?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 flex flex-col gap-4",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 flex-wrap">
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            iconClass,
          )}
        >
          {icon}
        </div>
        <h3 className="text-sm font-semibold tracking-tighter flex-1">
          {title}
        </h3>
        {headerExtra && (
          <div className="flex items-center gap-1.5">{headerExtra}</div>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ─── Chart 1: Capacity Doughnut Charts ───────────────────────────────────────

function CapacityDonut({
  label,
  value,
  max,
  percent,
  unit,
  fillColor,
  trackColor,
}: {
  label: string;
  value: number;
  max: number;
  percent: number;
  unit: string;
  fillColor: string;
  trackColor: string;
}) {
  const safe = Math.min(Math.max(percent, 0), 100);
  const data = {
    datasets: [
      {
        data: [safe, 100 - safe],
        backgroundColor: [fillColor, trackColor],
        borderWidth: 0,
        hoverOffset: 0,
      },
    ],
  };
  const percentColor =
    safe >= 90 ? "#ef4444" : safe >= 70 ? "#f97316" : "#22c55e";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <Doughnut
          data={data}
          options={{
            cutout: "72%",
            responsive: true,
            maintainAspectRatio: true,
            animation: { animateRotate: true, duration: 700 },
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false },
            },
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-xl font-bold tracking-tighter leading-none"
            style={{ color: percentColor }}
          >
            {safe.toFixed(1)}%
          </span>
          <span className="text-[10px] text-muted-foreground tracking-tighter mt-0.5">
            {label}
          </span>
        </div>
      </div>
      <p className="text-xs tracking-tighter text-center text-muted-foreground">
        <span className="font-semibold text-foreground">
          {value.toLocaleString("vi-VN")}
        </span>
        {" / "}
        {max.toLocaleString("vi-VN")} {unit}
      </p>
    </div>
  );
}

function Chart1Capacity({ depotId }: { depotId: number }) {
  const { data, isLoading } = useDepotCapacityChart(depotId);

  const volColor = !data
    ? "#3b82f6"
    : data.volumeUsagePercent >= 90
      ? "#ef4444"
      : data.volumeUsagePercent >= 70
        ? "#f97316"
        : "#3b82f6";

  const wgtColor = !data
    ? "#10b981"
    : data.weightUsagePercent >= 90
      ? "#ef4444"
      : data.weightUsagePercent >= 70
        ? "#f97316"
        : "#10b981";

  return (
    <ChartCard
      title="Sức chứa kho"
      icon={<Cube className="h-4 w-4" weight="fill" />}
      iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
      isLoading={isLoading}
    >
      {data ? (
        <div className="flex flex-col items-center gap-6 py-2">
          <CapacityDonut
            label="Thể tích"
            value={data.currentVolume}
            max={data.maxVolume}
            percent={data.volumeUsagePercent}
            unit="m³"
            fillColor={volColor}
            trackColor="#e5e7eb"
          />
          <CapacityDonut
            label="Khối lượng"
            value={data.currentWeight}
            max={data.maxWeight}
            percent={data.weightUsagePercent}
            unit="kg"
            fillColor={wgtColor}
            trackColor="#e5e7eb"
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground tracking-tighter">
          Không có dữ liệu
        </p>
      )}
    </ChartCard>
  );
}

// ─── Chart 2: Inventory Movement Line Chart ───────────────────────────────────

function DatePickerButton({
  value,
  onChange,
  placeholder,
  disabledDate,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
  disabledDate?: (d: Date) => boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 gap-1.5 text-xs font-normal min-w-25 justify-start"
        >
          <CalendarBlank className="h-3 w-3 shrink-0" />
          {value ? (
            format(value, "dd/MM/yyyy")
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
          disabled={disabledDate}
          locale={vi}
          initialFocus
        />
        {value && (
          <div className="border-t px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full text-xs text-muted-foreground"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              Xóa
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: Date | undefined;
  to: Date | undefined;
  onFromChange: (d: Date | undefined) => void;
  onToChange: (d: Date | undefined) => void;
}) {
  return (
    <>
      <DatePickerButton
        value={from}
        onChange={onFromChange}
        placeholder="Từ ngày"
        disabledDate={(d) => (to ? d > to : false)}
      />
      <span className="text-xs text-muted-foreground">–</span>
      <DatePickerButton
        value={to}
        onChange={onToChange}
        placeholder="Đến ngày"
        disabledDate={(d) => (from ? d < from : false)}
      />
    </>
  );
}

function Chart2InventoryMovement({ depotId }: { depotId: number }) {
  const [from, setFrom] = useState<Date | undefined>(undefined);
  const [to, setTo] = useState<Date | undefined>(undefined);
  const { data, isLoading } = useDepotInventoryMovementChart(depotId, {
    from: from ? from.toISOString() : undefined,
    to: to ? to.toISOString() : undefined,
  });

  const chartData = useMemo(() => {
    if (!data) return null;
    const labels = data.dataPoints.map((p) =>
      new Date(p.date).toLocaleDateString("vi-VN", {
        month: "short",
        day: "numeric",
      }),
    );
    return {
      labels,
      datasets: [
        {
          label: "Nhập kho",
          data: data.dataPoints.map((p) => p.totalIn),
          borderColor: "rgb(34,197,94)",
          backgroundColor: "rgba(34,197,94,0.08)",
          pointBackgroundColor: "rgb(34,197,94)",
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.4,
          fill: false,
        },
        {
          label: "Xuất kho",
          data: data.dataPoints.map((p) => p.totalOut),
          borderColor: "rgb(239,68,68)",
          backgroundColor: "rgba(239,68,68,0.08)",
          pointBackgroundColor: "rgb(239,68,68)",
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.4,
          fill: false,
        },
        {
          label: "Điều chỉnh",
          data: data.dataPoints.map((p) => p.totalAdjust),
          borderColor: "rgb(168,85,247)",
          backgroundColor: "rgba(168,85,247,0.08)",
          pointBackgroundColor: "rgb(168,85,247)",
          pointRadius: 3,
          pointHoverRadius: 5,
          borderDash: [4, 4],
          tension: 0.4,
          fill: false,
        },
      ],
    };
  }, [data]);

  return (
    <ChartCard
      title="Biến động hàng tồn kho"
      icon={<ArrowsDownUp className="h-4 w-4" weight="bold" />}
      iconClass="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
      isLoading={isLoading}
      headerExtra={
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      }
    >
      {chartData ? (
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: {
                position: "top",
                labels: { font: { size: 11 }, boxWidth: 12 },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) =>
                    ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString("vi-VN")}`,
                },
              },
            },
            scales: {
              x: {
                ticks: {
                  font: { size: 10 },
                  maxRotation: 45,
                  autoSkip: true,
                  maxTicksLimit: 14,
                },
              },
              y: {
                ticks: { font: { size: 10 } },
                beginAtZero: true,
              },
            },
          }}
        />
      ) : (
        <p className="text-xs text-muted-foreground tracking-tighter">
          Không có dữ liệu
        </p>
      )}
    </ChartCard>
  );
}

// ─── Chart 3: Fund Movement Line Chart ───────────────────────────────────────

function Chart3FundMovement({ depotId }: { depotId: number }) {
  const [from, setFrom] = useState<Date | undefined>(undefined);
  const [to, setTo] = useState<Date | undefined>(undefined);
  const { data, isLoading } = useDepotFundMovementChart(depotId, {
    from: from ? from.toISOString() : undefined,
    to: to ? to.toISOString() : undefined,
  });

  const chartData = useMemo(() => {
    if (!data) return null;
    const labels = data.dataPoints.map((p) =>
      new Date(p.date).toLocaleDateString("vi-VN", {
        month: "short",
        day: "numeric",
      }),
    );
    return {
      labels,
      datasets: [
        {
          label: "Thu (VND)",
          data: data.dataPoints.map((p) => p.totalIn),
          borderColor: "rgb(59,130,246)",
          backgroundColor: "rgba(59,130,246,0.1)",
          pointBackgroundColor: "rgb(59,130,246)",
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
        },
        {
          label: "Chi (VND)",
          data: data.dataPoints.map((p) => p.totalOut),
          borderColor: "rgb(249,115,22)",
          backgroundColor: "rgba(249,115,22,0.08)",
          pointBackgroundColor: "rgb(249,115,22)",
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: false,
        },
      ],
    };
  }, [data]);

  return (
    <ChartCard
      title="Biến động quỹ kho"
      icon={<CurrencyCircleDollar className="h-4 w-4" weight="fill" />}
      iconClass="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
      isLoading={isLoading}
      headerExtra={
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      }
    >
      {chartData ? (
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: {
                position: "top",
                labels: { font: { size: 11 }, boxWidth: 12 },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) =>
                    ` ${ctx.dataset.label}: ${formatVND(ctx.parsed.y)}đ`,
                },
              },
            },
            scales: {
              x: {
                ticks: {
                  font: { size: 10 },
                  maxRotation: 45,
                  autoSkip: true,
                  maxTicksLimit: 14,
                },
              },
              y: {
                ticks: {
                  font: { size: 10 },
                  callback: (v) => formatVND(Number(v)),
                },
                beginAtZero: true,
              },
            },
          }}
        />
      ) : (
        <p className="text-xs text-muted-foreground tracking-tighter">
          Không có dữ liệu
        </p>
      )}
    </ChartCard>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function DepotChartsSection({ depotId }: { depotId: number }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold tracking-tighter text-muted-foreground uppercase">
        Biểu đồ tổng quan
      </h2>
      {/* Row 1: Capacity (1 col) + Inventory Movement (3 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Chart1Capacity depotId={depotId} />
        <div className="lg:col-span-3">
          <Chart2InventoryMovement depotId={depotId} />
        </div>
      </div>
      {/* Row 2: Fund Movement (full) */}
      <Chart3FundMovement depotId={depotId} />
    </div>
  );
}
