"use client";

import { useMemo, useState } from "react";
import { RefreshCcw, WalletCards } from "lucide-react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDepotFundMovementMultiLineChart,
  useDepotMetadata,
} from "@/services/depot/hooks";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const LINE_COLORS = [
  "#ff4d4f",
  "#14b8a6",
  "#60a5fa",
  "#f59e0b",
  "#a78bfa",
  "#fb7185",
  "#2dd4bf",
  "#facc15",
];

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type ChartRow = {
  date: string;
  label: string;
  [key: string]: string | number | null;
};

type LineMeta = {
  key: string;
  name: string;
  color: string;
  currentBalance: number;
};

function toDateTimeStart(value: string) {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function toDateTimeEnd(value: string) {
  return value ? `${value}T23:59:59.999Z` : undefined;
}

function formatCurrency(value: number) {
  return `${currencyFormatter.format(value)}đ`;
}

function formatCompactCurrency(value: number) {
  return `${compactCurrencyFormatter.format(value)}đ`;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function DepotFundMovementChart() {
  const [selectedDepotId, setSelectedDepotId] = useState<number | undefined>();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: depots = [], isLoading: isLoadingDepots } = useDepotMetadata();
  const effectiveDepotId = selectedDepotId ?? depots[0]?.key;

  const params = useMemo(
    () => ({
      from: toDateTimeStart(fromDate),
      to: toDateTimeEnd(toDate),
    }),
    [fromDate, toDate],
  );

  const {
    data,
    isLoading: isLoadingChart,
    isFetching,
    isError,
  } = useDepotFundMovementMultiLineChart(effectiveDepotId, params, {
    enabled: effectiveDepotId !== undefined,
  });

  const chartModel = useMemo(() => {
    const series = data?.series ?? [];
    const rowsByDate = new Map<string, ChartRow>();
    const lines: LineMeta[] = series.map((item, index) => ({
      key: `fund_${item.fundId}_${index}`,
      name: item.fundSourceName || `Quỹ ${index + 1}`,
      color: LINE_COLORS[index % LINE_COLORS.length],
      currentBalance: item.currentBalance ?? 0,
    }));

    series.forEach((item, index) => {
      const line = lines[index];
      item.dataPoints?.forEach((point) => {
        const date = point.date?.slice(0, 10) || "";
        if (!date) return;

        const row =
          rowsByDate.get(date) ??
          ({
            date,
            label: formatDateLabel(date),
          } as ChartRow);

        const totalIn = Number(point.totalIn ?? 0);
        const totalOut = Number(point.totalOut ?? 0);
        const currentNet = Number(row[line.key] ?? 0);
        const currentIn = Number(row[`${line.key}In`] ?? 0);
        const currentOut = Number(row[`${line.key}Out`] ?? 0);

        row[line.key] = currentNet + totalIn - totalOut;
        row[`${line.key}In`] = currentIn + totalIn;
        row[`${line.key}Out`] = currentOut + totalOut;
        rowsByDate.set(date, row);
      });
    });

    const rows = Array.from(rowsByDate.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );

    const totals = series.reduce(
      (acc, item) => {
        item.dataPoints?.forEach((point) => {
          acc.totalIn += Number(point.totalIn ?? 0);
          acc.totalOut += Number(point.totalOut ?? 0);
        });
        acc.currentBalance += Number(item.currentBalance ?? 0);
        return acc;
      },
      { totalIn: 0, totalOut: 0, currentBalance: 0 },
    );

    return { rows, lines, totals };
  }, [data]);

  const hasChartData = chartModel.rows.length > 0 && chartModel.lines.length > 0;
  const isLoading = isLoadingDepots || isLoadingChart;

  const lineChartData = useMemo<ChartData<"line", Array<number | null>, string>>(
    () => ({
      labels: chartModel.rows.map((row) => row.label),
      datasets: chartModel.lines.map((line) => ({
        label: line.name,
        data: chartModel.rows.map((row) => {
          const value = row[line.key];
          return typeof value === "number" ? value : null;
        }),
        borderColor: line.color,
        backgroundColor: `${line.color}1A`,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: line.color,
        pointHoverBackgroundColor: line.color,
        pointHoverBorderColor: "#ffffff",
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.42,
        fill: false,
        spanGaps: true,
      })),
    }),
    [chartModel],
  );

  const lineChartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: true },
      hover: { mode: "nearest", intersect: true },
      elements: {
        line: {
          capBezierPoints: true,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          position: "nearest",
          backgroundColor: "rgba(255,255,255,0.96)",
          borderColor: "rgba(15,23,42,0.12)",
          borderWidth: 1,
          bodyColor: "#111827",
          titleColor: "#111827",
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const line = chartModel.lines[context.datasetIndex];
              const value =
                typeof context.parsed.y === "number" ? context.parsed.y : 0;
              return ` ${line?.name ?? context.dataset.label}: ${formatCurrency(value)}`;
            },
            afterLabel: (context) => {
              const line = chartModel.lines[context.datasetIndex];
              const row = chartModel.rows[context.dataIndex];
              if (!line || !row) return "";
              const totalIn = Number(row[`${line.key}In`] ?? 0);
              const totalOut = Number(row[`${line.key}Out`] ?? 0);
              return ` Thu ${formatCurrency(totalIn)} · Chi ${formatCurrency(totalOut)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
          ticks: {
            color: "#111827",
            font: { size: 12 },
            maxRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(148,163,184,0.18)",
            tickBorderDash: [4, 4],
          },
          border: {
            display: false,
          },
          ticks: {
            color: "#111827",
            font: { size: 12 },
            callback: (value) => formatCompactCurrency(Number(value)),
          },
        },
      },
    }),
    [chartModel],
  );

  return (
    <Card className="h-full border border-border/50 overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 pt-6 pb-10">
      <CardHeader className="space-y-4 pb-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <WalletCards className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base tracking-tighter font-semibold">
                  Biến động quỹ theo kho
                </CardTitle>
                <p className="text-sm tracking-tighter text-muted-foreground">
                  Thu, chi ròng theo từng nguồn quỹ
                </p>
              </div>
            </div>
            {data && (
              <div className="flex flex-wrap gap-2 tracking-tighter text-sm">
                <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Thu {formatCompactCurrency(chartModel.totals.totalIn)}
                </span>
                <span className="rounded-md bg-red-50 px-2 py-1 font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  Chi {formatCompactCurrency(chartModel.totals.totalOut)}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  Số dư {formatCompactCurrency(chartModel.totals.currentBalance)}
                </span>
              </div>
            )}
          </div>

          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-[minmax(260px,320px)_150px_150px_36px]">
            <Select
              value={
                effectiveDepotId !== undefined ? String(effectiveDepotId) : undefined
              }
              onValueChange={(value) => setSelectedDepotId(Number(value))}
              disabled={isLoadingDepots || depots.length === 0}
            >
              <SelectTrigger className="h-9 w-full min-w-0 overflow-hidden bg-background text-sm [&_[data-slot=select-value]]:truncate">
                <SelectValue placeholder="Chọn kho" />
              </SelectTrigger>
              <SelectContent className="w-[min(360px,calc(100vw-2rem))]">
                {depots.map((depot) => (
                  <SelectItem
                    key={depot.key}
                    value={String(depot.key)}
                    className="pr-8"
                  >
                    {depot.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DatePickerInput
              value={fromDate}
              onChange={setFromDate}
              placeholder="Từ ngày"
              maxDate={toDate || undefined}
              className="h-9"
            />
            <DatePickerInput
              value={toDate}
              onChange={setToDate}
              placeholder="Đến ngày"
              minDate={fromDate || undefined}
              className="h-9"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-full sm:w-9"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              disabled={!fromDate && !toDate}
              title="Xóa bộ lọc ngày"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        ) : isError ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Không tải được dữ liệu biến động quỹ
          </div>
        ) : effectiveDepotId === undefined ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Chưa có kho để hiển thị
          </div>
        ) : !hasChartData ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Không có dữ liệu trong khoảng thời gian đã chọn
          </div>
        ) : (
          <>
            <div className="h-72 w-full">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {chartModel.lines.map((line) => (
                <div
                  key={line.key}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: line.color }}
                  />
                  <span className="font-medium tracking-tighter">{line.name}</span>
                  <span className="text-muted-foreground">
                    {formatCompactCurrency(line.currentBalance)}
                  </span>
                </div>
              ))}
              {isFetching && (
                <span className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                  Đang cập nhật...
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
