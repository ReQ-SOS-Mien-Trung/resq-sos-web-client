"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowsClockwise,
  ClipboardText,
  Clock,
  CheckCircle,
  X,
  Package,
  Users,
  CalendarBlank,
  ArrowDown,
  Warning,
  Shield,
  Flag,
  CaretLeft,
  CaretRight,
  CaretUp,
  CaretDown,
  ArrowsOut,
  ArrowsIn,
  ArrowsDownUp,
  DotsSixVertical,
  FloppyDisk,
  SpinnerGap,
  ClockCounterClockwiseIcon,
} from "@phosphor-icons/react";
import {
  useMyDepotUpcomingPickups,
  useMyDepotPickupHistory,
  useMyDepotUpcomingReturns,
  useMyDepotReturnHistory,
  useReusableItemConditions,
} from "@/services/inventory/hooks";
import { useConfirmReturnSupplies } from "@/services/mission/hooks";
import type {
  UpcomingPickupEntity,
  PickupHistoryEntity,
  UpcomingReturnEntity,
  ReturnHistoryEntity,
  UpcomingReturnItem,
  ReturnReusableUnit,
  ReusableItemCondition,
} from "@/services/inventory/type";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────

type TabType = "upcoming" | "history";
type ActivityKind = "pickup" | "return";
type UpcomingActivityEntity = UpcomingPickupEntity | UpcomingReturnEntity;
type HistoryActivityEntity = PickupHistoryEntity | ReturnHistoryEntity;
type ActivityEntity = UpcomingActivityEntity | HistoryActivityEntity;

const MIN_PANEL_HEIGHT = 260;
const DEFAULT_PANEL_HEIGHT = 560;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

const ACTIVITY_COPY: Record<
  ActivityKind,
  {
    sectionTitle: string;
    sectionDescription: string;
    upcomingEmpty: string;
    historyEmpty: string;
    upcomingLabel: string;
    historyLabel: string;
    upcomingItemsLabel: string;
    historyItemsLabel: string;
    detailCardTitle: string;
    statusFilterLabel: string;
  }
> = {
  pickup: {
    sectionTitle: "Hoạt động lấy hàng",
    sectionDescription:
      "Xem các hoạt động lấy hàng sắp tới và lịch sử giao nhận tại kho",
    upcomingEmpty: "Không có hoạt động lấy hàng sắp tới",
    historyEmpty: "Chưa có lịch sử lấy hàng",
    upcomingLabel: "hoạt động lấy hàng",
    historyLabel: "lượt lấy hàng",
    upcomingItemsLabel: "Vật tư cần lấy",
    historyItemsLabel: "Vật tư đã lấy",
    detailCardTitle: "Chi tiết hoạt động",
    statusFilterLabel: "Trạng thái hoạt động",
  },
  return: {
    sectionTitle: "Hoạt động trả hàng",
    sectionDescription:
      "Theo dõi vật tư đang được trả về kho và lịch sử kho xác nhận hoàn trả",
    upcomingEmpty: "Không có hoạt động trả hàng sắp tới",
    historyEmpty: "Chưa có lịch sử trả hàng",
    upcomingLabel: "hoạt động trả hàng",
    historyLabel: "lượt trả hàng",
    upcomingItemsLabel: "Vật tư dự kiến trả",
    historyItemsLabel: "Vật tư đã trả",
    detailCardTitle: "Chi tiết trả hàng",
    statusFilterLabel: "Trạng thái trả hàng",
  },
};

const RETURN_UPCOMING_STATUS_OPTIONS = [
  { value: "PendingConfirmation", label: "Chờ kho xác nhận" },
  { value: "OnGoing", label: "Đang trên đường về kho" },
] as const;

const RETURN_DISCREPANCY_NOTE_TEMPLATE = [
  "- Chênh lệch số lượng:",
  "- Vật tư/đơn vị thiếu:",
  "- Vật tư/đơn vị hư hỏng:",
  "- Vật tư/đơn vị trả thêm:",
  "- Nguyên nhân / ghi chú bổ sung:",
].join("\n");

interface ConfirmReturnConsumableDraft {
  itemId: number;
  itemModelId: number;
  itemName: string;
  unit: string;
  expectedQuantity: number;
  reportedQuantity: number;
  quantity: string;
}

interface ConfirmReturnReusableUnitDraft {
  reusableItemId: number;
  itemModelId: number;
  itemName: string;
  serialNumber: string;
  condition: string;
  note: string;
}

interface ConfirmReturnReusableDraft {
  itemId: number;
  itemModelId: number;
  itemName: string;
  unit: string;
  expectedQuantity: number;
  reportedQuantity: number;
  quantity: string;
  lockQuantityToUnits?: boolean;
  units: ConfirmReturnReusableUnitDraft[];
}

interface ConfirmReturnFormState {
  discrepancyNote: string;
  consumableItems: ConfirmReturnConsumableDraft[];
  reusableItems: ConfirmReturnReusableDraft[];
}

const PRIORITY_MAP: Record<
  string,
  { label: string; cls: string; dot: string; icon: React.ReactNode }
> = {
  Critical: {
    label: "Khẩn cấp",
    cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",
    dot: "bg-red-500",
    icon: <Shield className="h-3 w-3" weight="fill" />,
  },
  High: {
    label: "Cao",
    cls: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400",
    dot: "bg-orange-500",
    icon: <Warning className="h-3 w-3" weight="fill" />,
  },
  Medium: {
    label: "Trung bình",
    cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
    dot: "bg-amber-500",
    icon: <Flag className="h-3 w-3" weight="fill" />,
  },
  Low: {
    label: "Thấp",
    cls: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400",
    dot: "bg-green-500",
    icon: <ArrowDown className="h-3 w-3" weight="bold" />,
  },
};

const MISSION_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Active: {
    label: "Đang hoạt động",
    cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  },
  Planned: {
    label: "Đã lên kế hoạch",
    cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  },
  OnGoing: {
    label: "Đang diễn ra",
    cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  },
  Pending: {
    label: "Chờ xử lý",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  PendingConfirmation: {
    label: "Chờ xác nhận",
    cls: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400",
  },
  Completed: {
    label: "Hoàn thành",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  Succeed: {
    label: "Thành công",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  completed: {
    label: "Hoàn thành",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  succeed: {
    label: "Thành công",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  Failed: {
    label: "Thất bại",
    cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",
  },
  Cancelled: {
    label: "Đã hủy",
    cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",
  },
  InProgress: {
    label: "Đang tiến hành",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
  },
};

const ACTIVITY_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Planned: {
    label: "Đã lên kế hoạch",
    cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  },
  Pending: {
    label: "Chờ lấy hàng",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  Assigned: {
    label: "Đã phân công",
    cls: "bg-violet-100 text-violet-700 border-violet-200",
  },
  InProgress: {
    label: "Đang thực hiện",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
  },
  OnGoing: {
    label: "Đang trên đường về kho",
    cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  },
  PendingConfirmation: {
    label: "Chờ kho xác nhận",
    cls: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400",
  },
  Completed: {
    label: "Đã lấy hàng",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  Succeed: {
    label: "Hoàn tất",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  completed: {
    label: "Đã lấy hàng",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  succeed: {
    label: "Thành công",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  Failed: {
    label: "Thất bại",
    cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",
  },
  Cancelled: {
    label: "Đã hủy",
    cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",
  },
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getActivityDisplayCode(item: {
  activityCode?: string;
  activityId: number;
}) {
  return item.activityCode?.trim() || `HĐ-${item.activityId}`;
}

function getSafeNumericValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sanitizeIntegerInput(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function normalizeReusableConditionKey(
  rawCondition: string,
  conditionOptions: ReusableItemCondition[],
): string {
  const normalizedCondition = rawCondition.trim();

  if (!normalizedCondition) {
    return "";
  }

  const matchedCondition = conditionOptions.find(
    (condition) =>
      condition.key === normalizedCondition ||
      condition.value === normalizedCondition,
  );

  return matchedCondition?.key ?? normalizedCondition;
}

function normalizeRequestNote(rawNote: string): string {
  return rawNote.trim();
}

function getReturnItemUnitCandidates(
  item: UpcomingReturnItem,
): ReturnReusableUnit[] {
  return [
    ...(item.returnedReusableUnits ?? []),
    ...(item.expectedReturnUnits ?? []),
  ];
}

function isReusableReturnItem(item: UpcomingReturnItem): boolean {
  return getReturnItemUnitCandidates(item).length > 0;
}

function resolveReturnItemModelId(item: UpcomingReturnItem): number {
  return getReturnItemUnitCandidates(item)[0]?.itemModelId ?? item.itemId;
}

function buildConfirmReturnFormState(
  activity: UpcomingReturnEntity,
): ConfirmReturnFormState {
  const consumableItems: ConfirmReturnConsumableDraft[] = [];
  const reusableItems: ConfirmReturnReusableDraft[] = [];

  for (const item of activity.items ?? []) {
    const expectedQuantity = getSafeNumericValue(item.quantity, 0);
    const reportedQuantity = getSafeNumericValue(
      item.actualReturnedQuantity,
      expectedQuantity,
    );
    const unitsSource =
      (item.returnedReusableUnits ?? []).length > 0
        ? (item.returnedReusableUnits ?? [])
        : (item.expectedReturnUnits ?? []);
    const itemModelId = resolveReturnItemModelId(item);

    if (isReusableReturnItem(item)) {
      const inferredQuantity = reportedQuantity || unitsSource.length;
      const reusableDraft: ConfirmReturnReusableDraft = {
        itemId: item.itemId,
        itemModelId,
        itemName: item.itemName,
        unit: item.unit,
        expectedQuantity,
        reportedQuantity,
        quantity: String(inferredQuantity),
        lockQuantityToUnits: false,
        units: unitsSource.map((unit) => ({
          reusableItemId: unit.reusableItemId,
          itemModelId: unit.itemModelId ?? itemModelId,
          itemName: unit.itemName || item.itemName,
          serialNumber: unit.serialNumber || "",
          condition: unit.condition || "",
          note: unit.note || "",
        })),
      };
      reusableItems.push(reusableDraft);
      continue;
    }

    const consumableDraft: ConfirmReturnConsumableDraft = {
      itemId: item.itemId,
      itemModelId,
      itemName: item.itemName,
      unit: item.unit,
      expectedQuantity,
      reportedQuantity,
      quantity: String(reportedQuantity),
    };
    consumableItems.push(consumableDraft);
  }

  return {
    discrepancyNote: RETURN_DISCREPANCY_NOTE_TEMPLATE,
    consumableItems,
    reusableItems,
  };
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_MAP[priority] ?? {
    label: priority,
    cls: "bg-gray-100 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
    icon: null,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full border tracking-tighter",
        cfg.cls,
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function StatusBadge({
  status,
  map,
}: {
  status: string;
  map: Record<string, { label: string; cls: string }>;
}) {
  const cfg = map[status] ?? {
    label: status,
    cls: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center text-sm font-semibold px-2 py-0.5 rounded-full border tracking-tighter",
        cfg.cls,
      )}
    >
      {cfg.label}
    </span>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/40">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// ── Sort ─────────────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc" | null;

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentKey: string | null;
  currentDir: SortDir;
  onSort: (key: string) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 group hover:text-foreground transition-colors whitespace-nowrap"
    >
      <span>{label}</span>
      {isActive && currentDir === "asc" ? (
        <CaretUp className="h-3 w-3 text-primary shrink-0" weight="fill" />
      ) : isActive && currentDir === "desc" ? (
        <CaretDown className="h-3 w-3 text-primary shrink-0" weight="fill" />
      ) : (
        <ArrowsDownUp className="h-3 w-3 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground/70 transition-colors" />
      )}
    </button>
  );
}

// ── DatePickerButton ──────────────────────────────────────────────────────────

function DatePickerButton({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-36 justify-start text-sm tracking-tighter font-normal gap-2",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarBlank className="h-3.5 w-3.5 shrink-0" />
          {value ? format(value, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ── InfoCard ──────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200/60 dark:border-blue-800/40",
    bar: "bg-blue-500",
    icon: "text-blue-500",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-violet-200/60 dark:border-violet-800/40",
    bar: "bg-violet-500",
    icon: "text-violet-500",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
    bar: "bg-emerald-500",
    icon: "text-emerald-500",
  },
} as const;

function InfoCard({
  title,
  color,
  icon,
  children,
}: {
  title: string;
  color: keyof typeof COLOR_MAP;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = COLOR_MAP[color];
  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-2.5 relative overflow-hidden",
        c.bg,
        c.border,
      )}
    >
      <div
        className={cn("absolute left-0 inset-y-0 w-1 rounded-l-xl", c.bar)}
      />
      <div className={cn("flex items-center gap-1.5 pl-2", c.icon)}>
        {icon}
        <span className="text-xl font-bold tracking-tight">{title}</span>
      </div>
      <div className="space-y-2 pl-2">{children}</div>
    </div>
  );
}

function InfoKV({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm text-muted-foreground tracking-tighter shrink-0 pt-px">
        {label}
      </span>
      <span
        className={cn(
          "text-sm tracking-tighter text-right",
          bold ? "font-semibold" : "font-medium",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ReusableUnitGrid({
  title,
  units,
  tone,
}: {
  title: string;
  units: ReturnReusableUnit[];
  tone: "amber" | "emerald";
}) {
  if (units.length === 0) return null;

  const toneCls =
    tone === "amber"
      ? "border-amber-200/70 bg-amber-50/80 dark:border-amber-800/60 dark:bg-amber-950/20"
      : "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/20";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </span>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background/80 px-1.5 text-[11px] font-bold text-foreground">
          {units.length}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {units.map((unit) => (
          <div
            key={`${title}-${unit.reusableItemId}-${unit.serialNumber}`}
            className={cn("rounded-lg border px-3 py-2 space-y-1", toneCls)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold tracking-tighter">
                {unit.itemName}
              </span>
              <span className="rounded-full border border-current/15 px-2 py-0.5 text-[11px] font-semibold tracking-tighter text-muted-foreground">
                #{unit.reusableItemId}
              </span>
            </div>
            <div className="text-xs text-muted-foreground tracking-tighter space-y-0.5">
              <p>
                Serial:{" "}
                <span className="font-medium text-foreground/85">
                  {unit.serialNumber || "—"}
                </span>
              </p>
              <p>
                Tình trạng:{" "}
                <span className="font-medium text-foreground/85">
                  {unit.condition || "—"}
                </span>
              </p>
              {unit.note && (
                <p>
                  Ghi chú:{" "}
                  <span className="font-medium text-foreground/85">
                    {unit.note}
                  </span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReturnItemCard({
  item,
  index,
}: {
  item: UpcomingReturnItem;
  index: number;
}) {
  const expectedQuantity = Number.isFinite(item.quantity) ? item.quantity : 0;
  const actualReturnedQuantity = Number.isFinite(item.actualReturnedQuantity)
    ? item.actualReturnedQuantity
    : 0;
  const expectedReturnUnits = item.expectedReturnUnits ?? [];
  const returnedReusableUnits = item.returnedReusableUnits ?? [];

  return (
    <motion.div
      className="rounded-xl border border-border/60 bg-muted/30 hover:bg-sky-50/60 dark:hover:bg-sky-950/20 transition-colors px-3 py-3 space-y-3"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: 0.04 + index * 0.03,
        type: "spring",
        stiffness: 260,
        damping: 22,
      }}
    >
      <div className="flex items-start gap-3">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.itemName}
            className="h-16 w-16 rounded-lg object-cover border border-border/60 shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border border-border/60 shrink-0">
            <Package className="h-7 w-7 text-muted-foreground" weight="fill" />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight leading-snug">
                {item.itemName}
              </p>
              <p className="text-xs text-muted-foreground tracking-tighter">
                Mã vật tư #{item.itemId}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Dự kiến
              </p>
              <p className="text-sm font-bold tracking-tighter text-amber-600 dark:text-amber-300">
                {expectedQuantity.toLocaleString("vi-VN")} {item.unit}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 dark:border-amber-800/60 dark:bg-amber-950/20">
              <p className="text-[11px] uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                Dự kiến hoàn trả
              </p>
              <p className="text-sm font-semibold tracking-tighter text-amber-800 dark:text-amber-200">
                {expectedQuantity.toLocaleString("vi-VN")} {item.unit}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 dark:border-emerald-800/60 dark:bg-emerald-950/20">
              <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                Đã trả thực tế
              </p>
              <p className="text-sm font-semibold tracking-tighter text-emerald-800 dark:text-emerald-200">
                {actualReturnedQuantity.toLocaleString("vi-VN")} {item.unit}
              </p>
            </div>
          </div>
        </div>
      </div>

      {(expectedReturnUnits.length > 0 || returnedReusableUnits.length > 0) && (
        <div className="space-y-3 border-t border-border/50 pt-3">
          <ReusableUnitGrid
            title="Đơn vị dự kiến trả"
            units={expectedReturnUnits}
            tone="amber"
          />
          <ReusableUnitGrid
            title="Đơn vị đã trả"
            units={returnedReusableUnits}
            tone="emerald"
          />
        </div>
      )}
    </motion.div>
  );
}

function ConfirmReturnFormSection({
  activity,
  onConfirmed,
}: {
  activity: UpcomingReturnEntity;
  onConfirmed: () => void;
}) {
  const confirmReturnMutation = useConfirmReturnSupplies();
  const { data: conditionOptions = [], isLoading: isConditionsLoading } =
    useReusableItemConditions();
  const [form, setForm] = useState<ConfirmReturnFormState>(() =>
    buildConfirmReturnFormState(activity),
  );

  useEffect(() => {
    setForm(buildConfirmReturnFormState(activity));
  }, [activity]);

  useEffect(() => {
    if (conditionOptions.length === 0) {
      return;
    }

    setForm((prev) => {
      let hasChanged = false;

      const reusableItems = prev.reusableItems.map((row) => ({
        ...row,
        units: row.units.map((unit) => {
          const normalizedCondition = normalizeReusableConditionKey(
            unit.condition,
            conditionOptions,
          );

          if (normalizedCondition !== unit.condition) {
            hasChanged = true;
            return {
              ...unit,
              condition: normalizedCondition,
            };
          }

          return unit;
        }),
      }));

      return hasChanged ? { ...prev, reusableItems } : prev;
    });
  }, [conditionOptions]);

  const handleConsumableQuantityChange = useCallback(
    (itemId: number, value: string) => {
      const nextValue = sanitizeIntegerInput(value);
      setForm((prev) => ({
        ...prev,
        consumableItems: prev.consumableItems.map((row) =>
          row.itemId === itemId ? { ...row, quantity: nextValue } : row,
        ),
      }));
    },
    [],
  );

  const handleReusableQuantityChange = useCallback(
    (itemId: number, value: string) => {
      const nextValue = sanitizeIntegerInput(value);
      setForm((prev) => ({
        ...prev,
        reusableItems: prev.reusableItems.map((row) =>
          row.itemId === itemId ? { ...row, quantity: nextValue } : row,
        ),
      }));
    },
    [],
  );

  const handleReusableUnitFieldChange = useCallback(
    (
      itemId: number,
      reusableItemId: number,
      field: "condition" | "note",
      value: string,
    ) => {
      setForm((prev) => ({
        ...prev,
        reusableItems: prev.reusableItems.map((row) =>
          row.itemId === itemId
            ? {
                ...row,
                units: row.units.map((unit) =>
                  unit.reusableItemId === reusableItemId
                    ? { ...unit, [field]: value }
                    : unit,
                ),
              }
            : row,
        ),
      }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      for (const row of form.consumableItems) {
        const parsed = Number.parseInt(row.quantity || "0", 10);
        if (!Number.isFinite(parsed) || parsed < 0) {
          toast.error(`Số lượng xác nhận của "${row.itemName}" chưa hợp lệ.`);
          return;
        }
      }

      for (const row of form.reusableItems) {
        const parsed = Number.parseInt(row.quantity || "0", 10);

        if (!Number.isFinite(parsed) || parsed < 0) {
          toast.error(`Số lượng xác nhận của "${row.itemName}" chưa hợp lệ.`);
          return;
        }

        for (const unit of row.units) {
          const normalizedCondition = normalizeReusableConditionKey(
            unit.condition,
            conditionOptions,
          );

          if (!normalizedCondition) {
            toast.error(
              `Vui lòng chọn tình trạng cho thiết bị serial "${unit.serialNumber || unit.reusableItemId}".`,
            );
            return;
          }
        }
      }

      try {
        await confirmReturnMutation.mutateAsync({
          missionId: activity.missionId,
          activityId: activity.activityId,
          request: {
            discrepancyNote:
              form.discrepancyNote.trim() &&
              form.discrepancyNote.trim() !==
                RETURN_DISCREPANCY_NOTE_TEMPLATE.trim()
                ? form.discrepancyNote.trim()
                : null,
            consumableItems: form.consumableItems.map((row) => ({
              itemModelId: row.itemModelId,
              quantity: Number.parseInt(row.quantity || "0", 10) || 0,
            })),
            reusableItems: form.reusableItems.map((row) => ({
              itemModelId: row.itemModelId,
              quantity: Number.parseInt(row.quantity || "0", 10) || 0,
              units: row.units.map((unit) => ({
                reusableItemId: unit.reusableItemId,
                serialNumber: unit.serialNumber,
                condition: normalizeReusableConditionKey(
                  unit.condition,
                  conditionOptions,
                ),
                note: normalizeRequestNote(unit.note),
              })),
            })),
          },
        });

        toast.success("Đã xác nhận team đã trả đồ về kho.");
        onConfirmed();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Không thể xác nhận trả hàng lúc này.";
        toast.error(message);
      }
    },
    [
      activity.activityId,
      activity.missionId,
      conditionOptions,
      confirmReturnMutation,
      form,
      onConfirmed,
    ],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-blue-200/70 bg-blue-50/40 p-4 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/10 md:p-5"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
              Biên bản đối soát - xác nhận team đã trả đồ
            </h3>
            <p className="text-sm tracking-tighter text-muted-foreground">
              Kiểm tra số lượng thực nhận, tình trạng từng thiết bị tái sử dụng
              và ghi chú chênh lệch trước khi xác nhận hoàn tất.
            </p>
          </div>
          {/* <div className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold tracking-tight text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
            Chỉ khả dụng khi trạng thái là PendingConfirmation
          </div> */}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-base font-semibold tracking-tighter text-foreground">
                Nội dung báo cáo sai lệch
              </label>
              <Textarea
                value={form.discrepancyNote}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    discrepancyNote: event.target.value,
                  }))
                }
                className="min-h-32 resize-y bg-background/90"
              />
            </div>

            {form.consumableItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 items-center rounded-full bg-orange-100 px-3 text-sm font-medium tracking-tighter text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                    Vật tư tiêu hao
                  </span>
                  <span className="text-sm tracking-tighter text-muted-foreground">
                    Xác nhận số lượng thực kho nhận
                  </span>
                </div>

                <div className="space-y-3">
                  {form.consumableItems.map((row) => (
                    <div
                      key={row.itemId}
                      className="rounded-xl border border-border/60 bg-background/90 p-4"
                    >
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
                        <div className="min-w-0 space-y-1">
                          <p className="text-base font-semibold tracking-tight">
                            {row.itemName}
                          </p>
                          <p className="text-xs tracking-tighter text-muted-foreground">
                            itemModelId gửi lên: {row.itemModelId}
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 dark:border-amber-800/60 dark:bg-amber-950/20">
                            <p className="text-sm uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                              Ban đầu
                            </p>
                            <p className="text-sm font-semibold tracking-tighter text-amber-900 dark:text-amber-100">
                              {row.expectedQuantity.toLocaleString("vi-VN")}{" "}
                              {row.unit}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Kho xác nhận
                            </label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={row.quantity}
                              onChange={(event) =>
                                handleConsumableQuantityChange(
                                  row.itemId,
                                  event.target.value,
                                )
                              }
                              className="h-10 bg-background"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {form.reusableItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="inline-flex h-7 items-center rounded-full bg-emerald-100 px-3 text-sm font-medium tracking-tighter text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Vật tư tái sử dụng
                  </span>
                </div>

                {!isConditionsLoading && conditionOptions.length === 0 && (
                  <div className="rounded-xl border border-red-200/70 bg-red-50/80 px-3 py-2 text-sm tracking-tighter text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                    Chưa tải được danh sách tình trạng vật tư tái sử dụng. Bạn
                    vẫn có thể xem danh sách, nhưng cần có tình trạng để xác
                    nhận.
                  </div>
                )}

                <div className="space-y-4">
                  {form.reusableItems.map((row) => (
                    <div
                      key={row.itemId}
                      className="rounded-xl border border-border/60 bg-background/90 p-4 shadow-sm"
                    >
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_minmax(320px,380px)] lg:items-start">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold tracking-tight">
                              {row.itemName}
                            </p>
                            <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium tracking-tighter text-muted-foreground">
                              itemModelId #{row.itemModelId}
                            </span>
                          </div>
                          <p className="text-sm tracking-tighter text-muted-foreground">
                            Kiểm tra từng serial bên dưới rồi nhập số kho thực
                            nhận.
                          </p>
                        </div>

                        <div className="min-w-0 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-950/20">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                            Ban đầu
                          </p>
                          <p className="mt-1 text-xl font-semibold tracking-tight text-amber-900 dark:text-amber-100">
                            {row.expectedQuantity.toLocaleString("vi-VN")}{" "}
                            {row.unit}
                          </p>
                        </div>

                        <div className="min-w-0 grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-3">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Kho xác nhận
                          </label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={row.quantity}
                            onChange={(event) =>
                              handleReusableQuantityChange(
                                row.itemId,
                                event.target.value,
                              )
                            }
                            className="h-10 w-full bg-background shadow-none"
                          />
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {row.units.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border/70 px-3 py-3 text-sm tracking-tighter text-muted-foreground">
                            Chưa có danh sách reusable unit để đối chiếu.
                          </div>
                        ) : (
                          row.units.map((unit) => (
                            <div
                              key={`${row.itemId}-${unit.reusableItemId}-${unit.serialNumber}`}
                              className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3"
                            >
                              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_minmax(260px,1fr)] lg:items-end">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold tracking-tight">
                                      {unit.itemName || row.itemName}
                                    </p>
                                    <span className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[11px] font-medium tracking-tighter text-muted-foreground">
                                      ID #{unit.reusableItemId}
                                    </span>
                                  </div>
                                  <p className="text-xs tracking-tighter text-muted-foreground">
                                    Serial:{" "}
                                    <span className="font-medium text-foreground/90">
                                      {unit.serialNumber || "—"}
                                    </span>
                                  </p>
                                </div>

                                <div className="min-w-0 space-y-1">
                                  <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    Tình trạng
                                  </label>
                                  <Select
                                    value={unit.condition}
                                    onValueChange={(value) =>
                                      handleReusableUnitFieldChange(
                                        row.itemId,
                                        unit.reusableItemId,
                                        "condition",
                                        value,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-10 w-full min-w-0 bg-background shadow-none">
                                      <SelectValue placeholder="Chọn tình trạng" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {conditionOptions.map((condition) => (
                                        <SelectItem
                                          key={condition.key}
                                          value={condition.key}
                                        >
                                          {condition.value}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="min-w-0 space-y-1">
                                  <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    Ghi chú unit
                                  </label>
                                  <Input
                                    value={unit.note}
                                    onChange={(event) =>
                                      handleReusableUnitFieldChange(
                                        row.itemId,
                                        unit.reusableItemId,
                                        "note",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="VD: trầy nhẹ vỏ ngoài"
                                    className="h-10 w-full min-w-0 bg-background shadow-none"
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="submit"
            className="gap-2"
            disabled={confirmReturnMutation.isPending || isConditionsLoading}
          >
            {confirmReturnMutation.isPending ? (
              <SpinnerGap className="h-4 w-4 animate-spin" />
            ) : (
              <FloppyDisk className="h-4 w-4" weight="fill" />
            )}
            Xác nhận team đã trả đồ
          </Button>
        </div>
      </div>
    </form>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

interface DetailPanelProps {
  item: ActivityEntity | null;
  open: boolean;
  onClose: () => void;
  mode: TabType;
  activityKind: ActivityKind;
}

function DetailPanel({
  item,
  open,
  onClose,
  mode,
  activityKind,
}: DetailPanelProps) {
  const isHistory = mode === "history";
  const hist = isHistory ? (item as HistoryActivityEntity) : null;
  const isReturnActivity = activityKind === "return";
  const copy = ACTIVITY_COPY[activityKind];

  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isFullscreen) return;
      e.preventDefault();
      dragStartY.current = e.clientY;
      dragStartHeight.current = panelHeight;
      isDragging.current = true;

      const maxH =
        typeof window !== "undefined" ? window.innerHeight * 0.93 : 900;

      const onMove = (ev: PointerEvent) => {
        if (!isDragging.current) return;
        const delta = dragStartY.current - ev.clientY; // up = positive = expand
        const next = Math.max(
          MIN_PANEL_HEIGHT,
          Math.min(maxH, dragStartHeight.current + delta),
        );
        setPanelHeight(next);
      };
      const onUp = () => {
        isDragging.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [isFullscreen, panelHeight],
  );

  if (!item) return null;

  const canConfirmReturn =
    isReturnActivity && !isHistory && item.status === "PendingConfirmation";

  const priorityCfg = PRIORITY_MAP[item.priority] ?? {
    dot: "bg-gray-400",
    cls: "bg-gray-100 text-gray-700 border-gray-200",
    label: item.priority,
    icon: null,
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            className="fixed inset-0 bg-black/25 backdrop-blur-[1.5px] z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className={cn(
              "fixed z-50 bg-background shadow-2xl flex flex-col",
              isFullscreen
                ? "inset-0 rounded-none border-0"
                : "bottom-0 left-0 right-0 rounded-t-2xl border-t border-border/60",
            )}
            style={isFullscreen ? undefined : { height: panelHeight }}
            initial={{ y: DEFAULT_PANEL_HEIGHT + 80 }}
            animate={{ y: 0 }}
            exit={{ y: DEFAULT_PANEL_HEIGHT + 80 }}
            transition={{
              type: "spring",
              stiffness: 340,
              damping: 34,
              mass: 0.85,
            }}
          >
            {/* ── Drag Handle ─────────────────────────────────────────────── */}
            {!isFullscreen && (
              <div
                className="flex flex-col items-center pt-2.5 pb-1 shrink-0 cursor-ns-resize select-none group touch-none"
                onPointerDown={handlePointerDown}
              >
                <div className="h-1.5 w-14 rounded-full bg-border group-hover:bg-primary/50 group-active:bg-primary/70 transition-colors duration-150" />
                <span className="text-xs text-muted-foreground/80 mt-1 group-hover:text-muted-foreground/70 transition-colors flex items-center gap-0.5 tracking-tighter">
                  <DotsSixVertical className="h-3 w-3" />
                  kéo để thay đổi kích cỡ
                </span>
              </div>
            )}

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full shrink-0",
                    priorityCfg.dot,
                  )}
                />
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap">
                    <span className="font-bold text-xl tracking-tighter">
                      {getActivityDisplayCode(item)}
                    </span>
                  </div>
                  <p className="text-sm tracking-tighter mt-0.5">
                    Loại: {item.activityType} · Hoạt động số{" "}
                    <strong>{item.activityId}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={item.priority} />
                <StatusBadge status={item.status} map={ACTIVITY_STATUS_MAP} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                >
                  {isFullscreen ? (
                    <ArrowsIn className="h-4 w-4" />
                  ) : (
                    <ArrowsOut className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ── Scrollable Body ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-5 space-y-5">
                {/* 3-column info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InfoCard
                    title="Thông tin nhiệm vụ"
                    color="blue"
                    icon={<Shield className="h-3.5 w-3.5" weight="fill" />}
                  >
                    <InfoKV label="Loại nhiệm vụ" value={item.missionType} />
                    <InfoKV
                      label="Trạng thái"
                      value={
                        <StatusBadge
                          status={item.missionStatus}
                          map={MISSION_STATUS_MAP}
                        />
                      }
                    />
                    <InfoKV
                      label="Bắt đầu"
                      value={formatDate(item.missionStartTime)}
                    />
                    <InfoKV
                      label="Dự kiến kết thúc"
                      value={formatDate(item.missionExpectedEndTime)}
                    />
                  </InfoCard>

                  <InfoCard
                    title={copy.detailCardTitle}
                    color="violet"
                    icon={
                      <ClipboardText className="h-3.5 w-3.5" weight="fill" />
                    }
                  >
                    <InfoKV
                      label="Mã hoạt động"
                      value={getActivityDisplayCode(item)}
                      mono
                    />
                    <InfoKV label="Loại hoạt động" value={item.activityType} />
                    <InfoKV
                      label="Thời gian ước tính"
                      value={formatDuration(item.estimatedTime)}
                    />
                    {isReturnActivity && (
                      <>
                        <InfoKV label="Kho xác nhận" value={item.depotName} />
                        {"depotAddress" in item && item.depotAddress && (
                          <InfoKV
                            label="Địa chỉ kho"
                            value={item.depotAddress}
                          />
                        )}
                      </>
                    )}
                    {item.description && (
                      <div className="pt-1.5 border-t border-border/30">
                        <p className="text-sm font-medium leading-relaxed tracking-tighter">
                          {item.description}
                        </p>
                      </div>
                    )}
                  </InfoCard>

                  <InfoCard
                    title="Đội cứu hộ"
                    color="emerald"
                    icon={<Users className="h-3.5 w-3.5" weight="fill" />}
                  >
                    <InfoKV
                      label="Tên đội"
                      value={
                        <span className="font-semibold tracking-tighter">
                          {item.rescueTeamName}
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            ({item.teamType})
                          </span>
                        </span>
                      }
                    />
                    <InfoKV
                      label="Phân công lúc"
                      value={formatDate(item.assignedAt)}
                    />
                    {isHistory && hist && (
                      <>
                        <InfoKV
                          label="Hoàn thành lúc"
                          value={formatDate(hist.completedAt)}
                        />
                        <InfoKV
                          label="Thực hiện bởi"
                          value={hist.completedByName || "—"}
                          bold
                        />
                      </>
                    )}
                  </InfoCard>
                </div>

                {/* Items grid */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-md bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                      <Package
                        className="h-5 w-5 text-orange-500"
                        weight="fill"
                      />
                    </div>
                    <span className="text-xl font-semibold tracking-tight">
                      {isHistory
                        ? copy.historyItemsLabel
                        : copy.upcomingItemsLabel}
                    </span>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold px-1.5 dark:bg-orange-950/50 dark:text-orange-400">
                      {item.items.length}
                    </span>
                  </div>
                  {item.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground tracking-tighter py-2">
                      Không có vật tư
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {isReturnActivity
                        ? (item.items as UpcomingReturnItem[]).map(
                            (it, idx) => (
                              <ReturnItemCard
                                key={it.itemId}
                                item={it}
                                index={idx}
                              />
                            ),
                          )
                        : item.items.map((it, idx) => (
                            <motion.div
                              key={it.itemId}
                              className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-orange-50/60 dark:hover:bg-orange-950/20 transition-colors px-3 py-2.5"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: 0.04 + idx * 0.03,
                                type: "spring",
                                stiffness: 260,
                                damping: 22,
                              }}
                            >
                              {it.imageUrl ? (
                                <img
                                  src={it.imageUrl}
                                  alt={it.itemName}
                                  className="h-16 w-16 rounded-lg object-cover border border-border/60 shrink-0"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border border-border/60 shrink-0">
                                  <Package
                                    className="h-7 w-7 text-muted-foreground"
                                    weight="fill"
                                  />
                                </div>
                              )}
                              <span className="flex-1 text-base font-semibold tracking-tight leading-snug line-clamp-1">
                                {it.itemName}
                              </span>
                              <div className="flex items-baseline gap-1 shrink-0">
                                <span className="text-xl font-bold text-orange-500 tabular-nums">
                                  {it.quantity.toLocaleString("vi-VN")}
                                </span>
                                <span className="text-sm text-muted-foreground tracking-tighter">
                                  {it.unit}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                    </div>
                  )}
                </div>

                {canConfirmReturn && (
                  <ConfirmReturnFormSection
                    activity={item as UpcomingReturnEntity}
                    onConfirmed={onClose}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Upcoming Table ────────────────────────────────────────────────────────────

function UpcomingTable({
  items,
  onSelect,
  selectedId,
  activityKind,
}: {
  items: UpcomingActivityEntity[];
  onSelect: (i: UpcomingActivityEntity) => void;
  selectedId: number | null;
  activityKind: ActivityKind;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const copy = ACTIVITY_COPY[activityKind];

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey, sortDir],
  );

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return items;
    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "activityCode":
          cmp = getActivityDisplayCode(a).localeCompare(
            getActivityDisplayCode(b),
          );
          break;
        case "rescueTeamName":
          cmp = (a.rescueTeamName ?? "").localeCompare(b.rescueTeamName ?? "");
          break;
        case "missionType":
          cmp = (a.missionType ?? "").localeCompare(b.missionType ?? "");
          break;
        case "priority":
          cmp =
            (PRIORITY_ORDER[a.priority] ?? 0) -
            (PRIORITY_ORDER[b.priority] ?? 0);
          break;
        case "status":
          cmp = (a.status ?? "").localeCompare(b.status ?? "");
          break;
        case "itemCount":
          cmp = a.items.length - b.items.length;
          break;
        case "missionStartTime":
          cmp =
            new Date(a.missionStartTime ?? 0).getTime() -
            new Date(b.missionStartTime ?? 0).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 gap-3">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Clock className="h-10 w-10 opacity-40" />
        </motion.div>
        <p className="text-sm tracking-tighter">{copy.upcomingEmpty}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tracking-tighter min-w-180">
        <thead>
          <tr className="bg-muted/40 border-b border-border/50 text-left">
            {(
              [
                ["activityCode", "Mã hoạt động"],
                ["rescueTeamName", "Đội cứu hộ"],
                ["missionType", "Loại nhiệm vụ"],
                ["priority", "Mức độ ưu tiên"],
                ["status", "Trạng thái"],
                [
                  "itemCount",
                  activityKind === "return" ? "Vật tư trả" : "Vật tư",
                ],
                ["missionStartTime", "Thời gian bắt đầu"],
              ] as [string, string][]
            ).map(([key, label]) => (
              <th
                key={key}
                className="px-4 py-3 font-semibold text-sm tracking-tighter"
              >
                <SortableHeader
                  label={label}
                  sortKey={key}
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => (
            <motion.tr
              key={item.activityId}
              className={cn(
                "border-b border-border/40 cursor-pointer transition-all hover:bg-primary/5",
                selectedId === item.activityId &&
                  "bg-primary/5 border-l-2 border-l-primary",
              )}
              onClick={() => onSelect(item)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                  <span className="font-semibold">
                    {getActivityDisplayCode(item)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 pl-4 tracking-tighter">
                  Bước {item.step} · #{item.missionId}
                </p>
              </td>
              <td className="px-4 py-3">
                <div className="flex font-semibold text-base items-center">
                  <span>
                    {item.rescueTeamName}{" "}
                    <span className="text-sm font-normal italic">
                      ({item.teamType})
                    </span>
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm tracking-tighter">
                {item.missionType}
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={item.priority} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} map={ACTIVITY_STATUS_MAP} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Package
                    className="h-3.5 w-3.5 text-orange-500 shrink-0"
                    weight="fill"
                  />
                  <span className="font-medium">{item.items.length} mục</span>
                </div>
                {item.items.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-0.5 tracking-tighter">
                    {item.items
                      .slice(0, 2)
                      .map((i) => i.itemName)
                      .join(", ")}
                    {item.items.length > 2 && "…"}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <div className="flex items-center gap-1.5">
                  <CalendarBlank className="h-3.5 w-3.5 shrink-0" />
                  {formatDate(item.missionStartTime)}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── History Table ─────────────────────────────────────────────────────────────

function HistoryTable({
  items,
  onSelect,
  selectedId,
  activityKind,
}: {
  items: HistoryActivityEntity[];
  onSelect: (i: HistoryActivityEntity) => void;
  selectedId: number | null;
  activityKind: ActivityKind;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const copy = ACTIVITY_COPY[activityKind];

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey, sortDir],
  );

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return items;
    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "activityCode":
          cmp = getActivityDisplayCode(a).localeCompare(
            getActivityDisplayCode(b),
          );
          break;
        case "rescueTeamName":
          cmp = (a.rescueTeamName ?? "").localeCompare(b.rescueTeamName ?? "");
          break;
        case "status":
          cmp = (a.status ?? "").localeCompare(b.status ?? "");
          break;
        case "priority":
          cmp =
            (PRIORITY_ORDER[a.priority] ?? 0) -
            (PRIORITY_ORDER[b.priority] ?? 0);
          break;
        case "itemCount":
          cmp = a.items.length - b.items.length;
          break;
        case "completedByName":
          cmp = (a.completedByName ?? "").localeCompare(
            b.completedByName ?? "",
          );
          break;
        case "completedAt":
          cmp =
            new Date(a.completedAt ?? 0).getTime() -
            new Date(b.completedAt ?? 0).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50 gap-3">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          <CheckCircle className="h-10 w-10 opacity-40" />
        </motion.div>
        <p className="text-sm tracking-tighter">{copy.historyEmpty}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tracking-tighter min-w-180">
        <thead>
          <tr className="bg-muted/40 border-b border-border/50 text-left">
            {(
              [
                ["activityCode", "Mã hoạt động"],
                ["rescueTeamName", "Đội cứu hộ"],
                ["status", "Trạng thái"],
                ["priority", "Mức độ ưu tiên"],
                [
                  "itemCount",
                  activityKind === "return"
                    ? copy.historyItemsLabel
                    : "Vật tư đã giao",
                ],
                ["completedByName", "Thực hiện bởi"],
                ["completedAt", "Hoàn thành lúc"],
              ] as [string, string][]
            ).map(([key, label]) => (
              <th
                key={key}
                className="px-4 py-3 font-semibold text-sm tracking-tighter"
              >
                <SortableHeader
                  label={label}
                  sortKey={key}
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => (
            <motion.tr
              key={item.activityId}
              className={cn(
                "border-b border-border/40 cursor-pointer transition-all hover:bg-primary/5",
                selectedId === item.activityId &&
                  "bg-primary/5 border-l-2 border-l-primary",
              )}
              onClick={() => onSelect(item)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle
                    className="h-3.5 w-3.5 text-emerald-500 shrink-0"
                    weight="fill"
                  />
                  <span className="font-semibold">
                    {getActivityDisplayCode(item)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 tracking-tighter">
                  Nhiệm vụ số {item.missionId}
                </p>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">
                    {item.rescueTeamName}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({item.teamType})
                    </span>
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} map={ACTIVITY_STATUS_MAP} />
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={item.priority} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Package
                    className="h-3.5 w-3.5 text-orange-500 shrink-0"
                    weight="fill"
                  />
                  <span className="font-medium">{item.items.length} mục</span>
                </div>
                {item.items.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5 tracking-tighter">
                    {item.items
                      .slice(0, 2)
                      .map((i) => i.itemName)
                      .join(", ")}
                    {item.items.length > 2 && "…"}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 font-medium text-sm tracking-tighter">
                {item.completedByName || "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <div className="flex items-center gap-1.5">
                  {formatDate(item.completedAt)}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  isFetching,
  onPrev,
  onNext,
  onPageSizeChange,
  onRefetch,
  label,
}: {
  page: number;
  totalPages?: number;
  totalCount?: number;
  pageSize: number;
  isFetching: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange: (next: number) => void;
  onRefetch: () => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border/40 mt-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground tracking-tighter">
        <span>Hiển thị</span>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="w-20 h-8 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>/ trang</span>
        <span>
          · Trang {page}
          {totalPages ? ` / ${totalPages}` : ""}
        </span>
        {totalCount !== undefined && (
          <span>
            · {totalCount} {label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
          disabled={page <= 1 || isFetching}
          onClick={onPrev}
        >
          <CaretLeft className="h-3.5 w-3.5" />
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
          disabled={page >= (totalPages ?? 1) || isFetching}
          onClick={onNext}
        >
          Sau
          <CaretRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={isFetching}
          onClick={onRefetch}
        >
          <ArrowsClockwise
            className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
          />
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ActivityOperationsPanelProps {
  activityKind: ActivityKind;
}

function ActivityOperationsPanel({
  activityKind,
}: ActivityOperationsPanelProps) {
  const isReturnActivity = activityKind === "return";
  const copy = ACTIVITY_COPY[activityKind];
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [returnStatus, setReturnStatus] = useState("PendingConfirmation");

  // History date filter — staged (user edits) vs applied (query param)
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const [selectedItem, setSelectedItem] = useState<ActivityEntity | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: pickupUpcomingData,
    isLoading: isPickupUpcomingLoading,
    isFetching: isPickupUpcomingFetching,
    refetch: refetchPickupUpcoming,
  } = useMyDepotUpcomingPickups(
    { pageNumber: upcomingPage, pageSize },
    {
      refetchInterval: isReturnActivity ? false : 30_000,
      enabled: !isReturnActivity,
    },
  );

  const {
    data: pickupHistoryData,
    isLoading: isPickupHistoryLoading,
    isFetching: isPickupHistoryFetching,
    refetch: refetchPickupHistory,
  } = useMyDepotPickupHistory(
    {
      pageNumber: historyPage,
      pageSize,
      fromDate: appliedFrom || undefined,
      toDate: appliedTo || undefined,
    },
    {
      refetchInterval: isReturnActivity ? false : 60_000,
      enabled: !isReturnActivity,
    },
  );

  const {
    data: returnUpcomingData,
    isLoading: isReturnUpcomingLoading,
    isFetching: isReturnUpcomingFetching,
    refetch: refetchReturnUpcoming,
  } = useMyDepotUpcomingReturns(
    {
      pageNumber: upcomingPage,
      pageSize,
      status: returnStatus,
    },
    {
      refetchInterval: isReturnActivity ? 30_000 : false,
      enabled: isReturnActivity,
    },
  );

  const {
    data: returnHistoryData,
    isLoading: isReturnHistoryLoading,
    isFetching: isReturnHistoryFetching,
    refetch: refetchReturnHistory,
  } = useMyDepotReturnHistory(
    {
      pageNumber: historyPage,
      pageSize,
      fromDate: appliedFrom || undefined,
      toDate: appliedTo || undefined,
    },
    {
      refetchInterval: isReturnActivity ? 60_000 : false,
      enabled: isReturnActivity,
    },
  );

  const upcomingData = isReturnActivity
    ? returnUpcomingData
    : pickupUpcomingData;
  const historyData = isReturnActivity ? returnHistoryData : pickupHistoryData;
  const upcomingItems = (
    isReturnActivity
      ? (returnUpcomingData?.items ?? [])
      : (pickupUpcomingData?.items ?? [])
  ) as UpcomingActivityEntity[];
  const historyItems = (
    isReturnActivity
      ? (returnHistoryData?.items ?? [])
      : (pickupHistoryData?.items ?? [])
  ) as HistoryActivityEntity[];
  const isUpcomingLoading = isReturnActivity
    ? isReturnUpcomingLoading
    : isPickupUpcomingLoading;
  const isHistoryLoading = isReturnActivity
    ? isReturnHistoryLoading
    : isPickupHistoryLoading;
  const isUpcomingFetching = isReturnActivity
    ? isReturnUpcomingFetching
    : isPickupUpcomingFetching;
  const isHistoryFetching = isReturnActivity
    ? isReturnHistoryFetching
    : isPickupHistoryFetching;
  const refetchUpcoming = isReturnActivity
    ? refetchReturnUpcoming
    : refetchPickupUpcoming;
  const refetchHistory = isReturnActivity
    ? refetchReturnHistory
    : refetchPickupHistory;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectUpcoming = useCallback(
    (item: UpcomingActivityEntity) => {
      if (selectedItem?.activityId === item.activityId && panelOpen) {
        setPanelOpen(false);
        return;
      }
      setSelectedItem(item);
      setPanelOpen(true);
    },
    [selectedItem, panelOpen],
  );

  const handleSelectHistory = useCallback(
    (item: HistoryActivityEntity) => {
      if (selectedItem?.activityId === item.activityId && panelOpen) {
        setPanelOpen(false);
        return;
      }
      setSelectedItem(item);
      setPanelOpen(true);
    },
    [selectedItem, panelOpen],
  );

  const handleClose = useCallback(() => setPanelOpen(false), []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setPanelOpen(false);
    setSelectedItem(null);
  }, []);

  const handlePageSizeChange = useCallback((next: number) => {
    setPageSize(next);
    setUpcomingPage(1);
    setHistoryPage(1);
    setPanelOpen(false);
  }, []);

  const handleApplyFilter = useCallback(() => {
    setAppliedFrom(fromDate ? format(fromDate, "yyyy-MM-dd") : "");
    setAppliedTo(toDate ? format(toDate, "yyyy-MM-dd") : "");
    setHistoryPage(1);
    setPanelOpen(false);
  }, [fromDate, toDate]);

  const handleClearFilter = useCallback(() => {
    setFromDate(undefined);
    setToDate(undefined);
    setAppliedFrom("");
    setAppliedTo("");
    setHistoryPage(1);
  }, []);

  const hasHistoryDateFilter = !!(appliedFrom || appliedTo);
  const isLoading =
    activeTab === "upcoming" ? isUpcomingLoading : isHistoryLoading;

  return (
    <div className="space-y-0">
      {/* Tab + Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-border/60 bg-muted/40 self-start shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange("upcoming")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium tracking-tighter transition-all duration-200",
              activeTab === "upcoming"
                ? "bg-background shadow-sm text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50",
            )}
          >
            <Clock
              className={cn(
                "h-4 w-4",
                activeTab === "upcoming"
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
              weight={activeTab === "upcoming" ? "fill" : "regular"}
            />
            Sắp tới
            {(upcomingData?.totalCount ?? 0) > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold px-1.5 dark:bg-blue-950/60 dark:text-blue-400">
                {upcomingData!.totalCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("history")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium tracking-tighter transition-all duration-200",
              activeTab === "history"
                ? "bg-background shadow-sm text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50",
            )}
          >
            <ClockCounterClockwiseIcon
              className={cn(
                "h-4 w-4",
                activeTab === "history"
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
              weight={activeTab === "history" ? "fill" : "regular"}
            />
            Lịch sử
            {(historyData?.totalCount ?? 0) > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold px-1.5 dark:bg-emerald-950/60 dark:text-emerald-400">
                {historyData!.totalCount}
              </span>
            )}
          </button>
        </div>

        {/* API-driven filters */}
        <AnimatePresence>
          {isReturnActivity && activeTab === "upcoming" ? (
            <motion.div
              key="filter"
              className="flex flex-wrap items-center gap-2"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium tracking-tighter">
                  {copy.statusFilterLabel}
                </span>
                <Select
                  value={returnStatus}
                  onValueChange={(value) => {
                    setReturnStatus(value);
                    setUpcomingPage(1);
                    setPanelOpen(false);
                  }}
                >
                  <SelectTrigger className="w-56 h-8 bg-background">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_UPCOMING_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          ) : activeTab === "history" ? (
            <motion.div
              key="filter"
              className="flex flex-wrap items-center gap-2"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium tracking-tighter">
                  Từ
                </span>
                <DatePickerButton
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="Chọn ngày"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium tracking-tighter">
                  Đến
                </span>
                <DatePickerButton
                  value={toDate}
                  onChange={setToDate}
                  placeholder="Chọn ngày"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1 text-sm tracking-tighter"
                onClick={handleApplyFilter}
                disabled={!fromDate && !toDate}
              >
                Lọc
              </Button>
              {hasHistoryDateFilter && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground gap-1"
                  onClick={handleClearFilter}
                >
                  <X className="h-3.5 w-3.5" />
                  Xóa lọc
                </Button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex-1" />
      </div>

      {/* Applied filter badges */}
      <AnimatePresence>
        {activeTab === "history" && hasHistoryDateFilter && (
          <motion.div
            key="filter-badges"
            className="flex items-center gap-2 mb-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="text-xs text-muted-foreground">Đang lọc:</span>
            {appliedFrom && (
              <span className="inline-flex items-center text-xs tracking-tighter bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium">
                Từ {new Date(appliedFrom).toLocaleDateString("vi-VN")}
              </span>
            )}
            {appliedTo && (
              <span className="inline-flex items-center text-xs tracking-tighter bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium">
                Đến {new Date(appliedTo).toLocaleDateString("vi-VN")}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Card className="border-border/60 py-0 shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4">
                  <table className="w-full">
                    <tbody>
                      {Array.from({ length: 7 }).map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "upcoming" ? (
                <UpcomingTable
                  items={upcomingItems}
                  onSelect={handleSelectUpcoming}
                  selectedId={
                    panelOpen ? (selectedItem?.activityId ?? null) : null
                  }
                  activityKind={activityKind}
                />
              ) : (
                <HistoryTable
                  items={historyItems}
                  onSelect={handleSelectHistory}
                  selectedId={
                    panelOpen ? (selectedItem?.activityId ?? null) : null
                  }
                  activityKind={activityKind}
                />
              )}

              <div className="px-4 pb-4">
                {activeTab === "upcoming" ? (
                  <Pagination
                    page={upcomingPage}
                    totalPages={upcomingData?.totalPages}
                    totalCount={upcomingData?.totalCount}
                    pageSize={pageSize}
                    isFetching={isUpcomingFetching}
                    onPrev={() => setUpcomingPage((p) => Math.max(1, p - 1))}
                    onNext={() => setUpcomingPage((p) => p + 1)}
                    onPageSizeChange={handlePageSizeChange}
                    onRefetch={() => refetchUpcoming()}
                    label={copy.upcomingLabel}
                  />
                ) : (
                  <Pagination
                    page={historyPage}
                    totalPages={historyData?.totalPages}
                    totalCount={historyData?.totalCount}
                    pageSize={pageSize}
                    isFetching={isHistoryFetching}
                    onPrev={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    onNext={() => setHistoryPage((p) => p + 1)}
                    onPageSizeChange={handlePageSizeChange}
                    onRefetch={() => refetchHistory()}
                    label={copy.historyLabel}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Detail Panel */}
      <DetailPanel
        key={`${activeTab}-${selectedItem?.activityId ?? "none"}-${panelOpen ? "open" : "closed"}`}
        item={selectedItem}
        open={panelOpen}
        onClose={handleClose}
        mode={activeTab}
        activityKind={activityKind}
      />
    </div>
  );
}

export function PickupActivitiesPanel() {
  return <ActivityOperationsPanel activityKind="pickup" />;
}

export function ReturnActivitiesPanel() {
  return <ActivityOperationsPanel activityKind="return" />;
}
