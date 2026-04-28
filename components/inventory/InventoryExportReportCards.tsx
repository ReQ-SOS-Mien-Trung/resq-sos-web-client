"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, CalendarRange, Check, ChevronsUpDown, FileSpreadsheet, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useDepotInventoryItemModels,
  useExportInventoryMovements,
} from "@/services/inventory/hooks";
import type { InventoryItemModelMetadata } from "@/services/inventory/type";

interface InventoryExportReportCardsProps {
  depotId: number | null | undefined;
}

const MONTHS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(currentYear - 2 + i));
const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

function toInputDate(date: Date) {
  return date.toISOString().split("T")[0];
}

const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);

// ─── Searchable Item Model Picker ───

function ItemModelPicker({
  depotId,
  value,
  onChange,
}: {
  depotId: number | null | undefined;
  value: number | undefined;
  onChange: (id: number | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: itemModels = [], isLoading } = useDepotInventoryItemModels(
    depotId ?? 0,
    { enabled: Boolean(depotId) },
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return itemModels;
    const q = search.toLowerCase();
    return itemModels.filter((m: InventoryItemModelMetadata) =>
      m.value.toLowerCase().includes(q),
    );
  }, [itemModels, search]);

  const selectedLabel = itemModels.find(
    (m: InventoryItemModelMetadata) => m.key === value,
  )?.value;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setTimeout(() => inputRef.current?.focus(), 0);
        else setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="mt-1 h-10 w-full justify-between rounded-lg text-sm font-normal"
        >
          <span className="truncate">
            {selectedLabel ?? "Tất cả hàng hóa"}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {value !== undefined && (
              <span
                role="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(undefined);
                }}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm hàng hóa..."
            className="h-8 border-0 p-0 shadow-none focus-visible:ring-0 text-sm"
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {isLoading ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Đang tải...
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Không tìm thấy
            </p>
          ) : (
            filtered.map((m: InventoryItemModelMetadata) => (
              <button
                key={m.key}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm tracking-tighter hover:bg-accent transition-colors",
                  m.key === value && "bg-accent",
                )}
                onClick={() => {
                  onChange(m.key === value ? undefined : m.key);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    m.key === value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="truncate">{m.value}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ───

export function InventoryExportReportCards({
  depotId,
}: InventoryExportReportCardsProps) {
  const [leftFromDate, setLeftFromDate] = useState(toInputDate(thirtyDaysAgo));
  const [leftToDate, setLeftToDate] = useState(toInputDate(today));
  const [leftItemModelId, setLeftItemModelId] = useState<number | undefined>();
  const [rightMonth, setRightMonth] = useState(currentMonth);
  const [rightYear, setRightYear] = useState(String(currentYear));
  const [rightItemModelId, setRightItemModelId] = useState<number | undefined>();
  const { mutate: exportMovements, isPending: isExporting } =
    useExportInventoryMovements();

  const handleExport = (panel: "range" | "month") => {
    if (!depotId) {
      toast.error("Vui lòng chọn kho trước khi xuất báo cáo.");
      return;
    }

    if (panel === "range") {
      if (!leftFromDate || !leftToDate) {
        toast.error("Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.");
        return;
      }

      if (leftFromDate > leftToDate) {
        toast.error("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
        return;
      }
    }

    const params =
      panel === "range"
        ? {
            depotId,
            periodType: "ByDateRange" as const,
            fromDate: leftFromDate,
            toDate: leftToDate,
            itemModelId: leftItemModelId,
          }
        : {
            depotId,
            periodType: "ByMonth" as const,
            month: Number(rightMonth),
            year: Number(rightYear),
            itemModelId: rightItemModelId,
          };

    exportMovements(params, {
      onSuccess: ({ blob, filename }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Xuất file thành công!");
      },
      onError: () => {
        toast.error("Xuất báo cáo thất bại. Vui lòng thử lại.");
      },
    });
  };

  return (
    <section
      id="inventory-export-report"
      aria-label="Xuất báo cáo kho"
      className="scroll-mt-20"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500 to-cyan-400" />

          <div className="space-y-6 p-6 pt-7">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
                <CalendarRange className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tighter">
                  Báo cáo theo khoảng ngày
                </h2>
                <p className="mt-0.5 text-sm tracking-tighter text-muted-foreground">
                  Chọn ngày bắt đầu & kết thúc
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium tracking-tighter text-muted-foreground">
                  Từ ngày
                </Label>
                <DatePickerInput
                  value={leftFromDate}
                  onChange={(val) => {
                    setLeftFromDate(val);
                    if (val && leftToDate && val > leftToDate) {
                      setLeftToDate(val);
                    }
                  }}
                  maxDate={leftToDate || undefined}
                  placeholder="Chọn ngày..."
                  className="mt-1 h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium tracking-tighter text-muted-foreground">
                  Đến ngày
                </Label>
                <DatePickerInput
                  value={leftToDate}
                  onChange={(val) => {
                    setLeftToDate(val);
                    if (val && leftFromDate && val < leftFromDate) {
                      setLeftFromDate(val);
                    }
                  }}
                  minDate={leftFromDate || undefined}
                  placeholder="Chọn ngày..."
                  className="mt-1 h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium tracking-tighter text-muted-foreground">
                Hàng hóa
              </Label>
              <ItemModelPicker
                depotId={depotId}
                value={leftItemModelId}
                onChange={setLeftItemModelId}
              />
            </div>

            <div className="border-t" />

            <Button
              size="sm"
              className="h-10 w-full gap-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => handleExport("range")}
              disabled={isExporting}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {isExporting ? "Đang xuất..." : "Xuất Excel"}
            </Button>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-500 to-teal-400" />

          <div className="space-y-6 p-6 pt-7">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950">
                <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tighter">
                  Báo cáo theo tháng
                </h2>
                <p className="mt-0.5 text-sm tracking-tighter text-muted-foreground">
                  Xem báo cáo tổng hợp hàng tháng
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium tracking-tighter text-muted-foreground">
                  Tháng
                </Label>
                <Select value={rightMonth} onValueChange={setRightMonth}>
                  <SelectTrigger className="mt-1 h-10 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month}>
                        Tháng {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium tracking-tighter text-muted-foreground">
                  Năm
                </Label>
                <Select value={rightYear} onValueChange={setRightYear}>
                  <SelectTrigger className="mt-1 h-10 rounded-lg border-emerald-500/50 text-sm ring-1 ring-emerald-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium tracking-tighter text-muted-foreground">
                Hàng hóa
              </Label>
              <ItemModelPicker
                depotId={depotId}
                value={rightItemModelId}
                onChange={setRightItemModelId}
              />
            </div>

            <div className="border-t" />

            <Button
              size="sm"
              className="h-10 w-full gap-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => handleExport("month")}
              disabled={isExporting}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {isExporting ? "Đang xuất..." : "Xuất Excel"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
