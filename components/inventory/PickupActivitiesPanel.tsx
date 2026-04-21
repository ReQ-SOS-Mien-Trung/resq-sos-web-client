"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowsClockwise,
  ClipboardText,
  Clock,
  CheckCircle,
  X,
  Package,
  Users,
  CalendarBlank,
  Warning,
  Shield,
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
  Eye,
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
  ReturnConsumableLotAllocation,
  ReturnReusableUnit,
  ReusableItemCondition,
  PickupLotAllocation,
} from "@/services/inventory/type";
import type { ConfirmReturnResponse } from "@/services/mission/type";
import { toast } from "sonner";
import { useManagerDepot } from "@/hooks/use-manager-depot";

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
    upcomingItemsLabel: "Vật phẩm cần lấy",
    historyItemsLabel: "Vật phẩm đã lấy",
    detailCardTitle: "Chi tiết hoạt động",
    statusFilterLabel: "Trạng thái hoạt động",
  },
  return: {
    sectionTitle: "Hoạt động trả hàng",
    sectionDescription:
      "Theo dõi vật phẩm đang được trả về kho và lịch sử kho xác nhận hoàn trả",
    upcomingEmpty: "Không có hoạt động trả hàng sắp tới",
    historyEmpty: "Chưa có lịch sử trả hàng",
    upcomingLabel: "hoạt động trả hàng",
    historyLabel: "lượt trả hàng",
    upcomingItemsLabel: "Vật phẩm dự kiến trả",
    historyItemsLabel: "Vật phẩm đã trả",
    detailCardTitle: "Chi tiết trả hàng",
    statusFilterLabel: "Trạng thái trả hàng",
  },
};

const RETURN_UPCOMING_STATUS_OPTIONS = [
  { value: "PendingConfirmation", label: "Chờ kho xác nhận" },
  { value: "OnGoing", label: "Đang trên đường về kho" },
] as const;

const RETURN_DISCREPANCY_FIELDS = [
  {
    key: "quantityMismatch",
    label: "Chênh lệch số lượng",
    placeholder: "Ví dụ: thiếu 5 gói, thừa 2 chai...",
  },
  {
    key: "missingItems",
    label: "Vật phẩm/đơn vị thiếu",
    placeholder: "Liệt kê vật phẩm hoặc serial còn thiếu",
  },
  {
    key: "damagedItems",
    label: "Vật phẩm/đơn vị hư hỏng",
    placeholder: "Mô tả vật phẩm hư hỏng và tình trạng",
  },
  {
    key: "extraItems",
    label: "Vật phẩm/đơn vị trả thêm",
    placeholder: "Liệt kê vật phẩm được trả thêm",
  },
  {
    key: "additionalNotes",
    label: "Nguyên nhân / ghi chú bổ sung",
    placeholder: "Nhập nguyên nhân hoặc ghi chú bổ sung",
  },
] as const;

type ReturnDiscrepancyFieldKey =
  (typeof RETURN_DISCREPANCY_FIELDS)[number]["key"];

type ConfirmReturnDiscrepancyFields = Record<ReturnDiscrepancyFieldKey, string>;

interface ConfirmReturnConsumableLotAllocationDraft {
  lotId: number;
  quantityTaken: number;
  receivedDate: string;
  expiredDate: string;
  remainingQuantityAfterExecution: number;
}

interface ConfirmReturnConsumableDraft {
  itemId: number;
  itemModelId: number;
  itemName: string;
  unit: string;
  expectedQuantity: number;
  reportedQuantity: number;
  quantity: string;
  expiredDate?: string | null;
  lotAllocations: PickupLotAllocation[];
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
  discrepancyFields: ConfirmReturnDiscrepancyFields;
  consumableItems: ConfirmReturnConsumableDraft[];
  reusableItems: ConfirmReturnReusableDraft[];
}

function createEmptyDiscrepancyFields(): ConfirmReturnDiscrepancyFields {
  return {
    quantityMismatch: "",
    missingItems: "",
    damagedItems: "",
    extraItems: "",
    additionalNotes: "",
  };
}

function buildDiscrepancyNotePayload(
  fields: ConfirmReturnDiscrepancyFields,
): string | null {
  const hasAnyValue = Object.values(fields).some((value) => value.trim());

  if (!hasAnyValue) {
    return null;
  }

  return RETURN_DISCREPANCY_FIELDS.map(
    ({ key, label }) => `- ${label}: ${fields[key].trim()}`,
  ).join("\n");
}

const PRIORITY_MAP: Record<
  string,
  { label: string; cls: string; dot: string }
> = {
  Critical: {
    label: "Khẩn cấp",
    cls: "bg-red-500/10 text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
  High: {
    label: "Cao",
    cls: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  Medium: {
    label: "Trung bình",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Low: {
    label: "Thấp",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-green-500",
  },
};

const MISSION_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Active: {
    label: "Đang hoạt động",
    cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  Planned: {
    label: "Đã lên kế hoạch",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  OnGoing: {
    label: "Đang diễn ra",
    cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  Pending: {
    label: "Chờ xử lý",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  PendingConfirmation: {
    label: "Chờ xác nhận",
    cls: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  Completed: {
    label: "Hoàn thành",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  Succeed: {
    label: "Thành công",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  completed: {
    label: "Hoàn thành",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  succeed: {
    label: "Thành công",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  Failed: {
    label: "Thất bại",
    cls: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  Cancelled: {
    label: "Đã hủy",
    cls: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  InProgress: {
    label: "Đang tiến hành",
    cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
};

const ACTIVITY_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Planned: {
    label: "Đã lên kế hoạch",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  Pending: {
    label: "Chờ lấy hàng",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  Assigned: {
    label: "Đã phân công",
    cls: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  InProgress: {
    label: "Đang thực hiện",
    cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  OnGoing: {
    label: "Đang trên đường về kho",
    cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  PendingConfirmation: {
    label: "Chờ kho xác nhận",
    cls: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  Completed: {
    label: "Đã lấy hàng",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  Succeed: {
    label: "Hoàn tất",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  completed: {
    label: "Đã lấy hàng",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  succeed: {
    label: "Thành công",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  Failed: {
    label: "Thất bại",
    cls: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  Cancelled: {
    label: "Đã hủy",
    cls: "bg-red-500/10 text-red-700 dark:text-red-400",
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

function sumReturnLotAllocationQuantity(
  lotAllocations: ConfirmReturnConsumableLotAllocationDraft[],
): number {
  return lotAllocations.reduce(
    (sum, allocation) => sum + getSafeNumericValue(allocation.quantityTaken, 0),
    0,
  );
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
  return (
    item.itemModelId ??
    getReturnItemUnitCandidates(item)[0]?.itemModelId ??
    item.itemId
  );
}

function normalizeReturnConsumableLotAllocations(
  allocations: ReturnConsumableLotAllocation[] | null | undefined,
): ConfirmReturnConsumableLotAllocationDraft[] {
  if (!Array.isArray(allocations)) {
    return [];
  }

  return allocations
    .map((allocation) => ({
      lotId: getSafeNumericValue(allocation.lotId, 0),
      quantityTaken: getSafeNumericValue(allocation.quantityTaken, 0),
      receivedDate:
        typeof allocation.receivedDate === "string"
          ? allocation.receivedDate
          : "",
      expiredDate:
        typeof allocation.expiredDate === "string"
          ? allocation.expiredDate
          : "",
      remainingQuantityAfterExecution: getSafeNumericValue(
        allocation.remainingQuantityAfterExecution,
        0,
      ),
    }))
    .filter((allocation) => allocation.lotId > 0);
}

function resolveReturnConsumableLotAllocations(
  item: UpcomingReturnItem,
): ConfirmReturnConsumableLotAllocationDraft[] {
  const returnedLots = normalizeReturnConsumableLotAllocations(
    item.returnedLotAllocations,
  );

  if (returnedLots.length > 0) {
    return returnedLots;
  }

  const expectedLots = normalizeReturnConsumableLotAllocations(
    item.expectedReturnLotAllocations,
  );

  if (expectedLots.length > 0) {
    return expectedLots;
  }

  return normalizeReturnConsumableLotAllocations(item.pickupLotAllocations);
}

function resolveReturnConsumableExpiredDate(
  item: UpcomingReturnItem,
  lotAllocations: ConfirmReturnConsumableLotAllocationDraft[],
): string | null {
  if (typeof item.expiredDate === "string" && item.expiredDate.trim()) {
    return item.expiredDate.trim();
  }

  const firstLotWithExpiry = lotAllocations.find(
    (allocation) => allocation.expiredDate.trim().length > 0,
  );

  return firstLotWithExpiry?.expiredDate ?? null;
}

function getExpectedReturnLotAllocations(
  item: Pick<
    UpcomingReturnItem,
    "expectedReturnLotAllocations" | "pickupLotAllocations"
  >,
): PickupLotAllocation[] {
  return item.expectedReturnLotAllocations ?? item.pickupLotAllocations ?? [];
}

function getResolvedItemExpiredDate(
  item: Pick<
    UpcomingReturnItem,
    "expiredDate" | "expectedReturnLotAllocations" | "pickupLotAllocations"
  >,
): string | null {
  return (
    item.expiredDate ??
    getExpectedReturnLotAllocations(item).find((lot) =>
      Boolean(lot.expiredDate),
    )?.expiredDate ??
    null
  );
}

function buildConfirmReturnLotAllocations(row: ConfirmReturnConsumableDraft): {
  lotAllocations: PickupLotAllocation[];
  expiredDate: string | null;
} {
  const confirmedQuantity = Number.parseInt(row.quantity || "0", 10) || 0;
  const normalizedLots = row.lotAllocations
    .filter((lot) => getSafeNumericValue(lot.quantityTaken, 0) > 0)
    .map((lot) => ({
      lotId: lot.lotId,
      quantityTaken: getSafeNumericValue(lot.quantityTaken, 0),
      receivedDate: lot.receivedDate ?? null,
      expiredDate: lot.expiredDate ?? null,
    }));

  if (confirmedQuantity <= 0 || normalizedLots.length === 0) {
    return {
      lotAllocations: [],
      expiredDate: row.expiredDate ?? normalizedLots[0]?.expiredDate ?? null,
    };
  }

  const totalLotQuantity = normalizedLots.reduce(
    (sum, lot) => sum + lot.quantityTaken,
    0,
  );

  if (confirmedQuantity > totalLotQuantity) {
    throw new Error(
      `Số lượng xác nhận của "${row.itemName}" vượt tổng số lượng các lô dự kiến (${totalLotQuantity.toLocaleString("vi-VN")} ${row.unit}).`,
    );
  }

  let remainingQuantity = confirmedQuantity;
  const allocatedLots = normalizedLots
    .map((lot) => {
      if (remainingQuantity <= 0) {
        return null;
      }

      const nextQuantity = Math.min(remainingQuantity, lot.quantityTaken);
      remainingQuantity -= nextQuantity;

      return {
        ...lot,
        quantityTaken: nextQuantity,
      };
    })
    .filter((lot): lot is NonNullable<typeof lot> => Boolean(lot));

  return {
    lotAllocations: allocatedLots,
    expiredDate: row.expiredDate ?? allocatedLots[0]?.expiredDate ?? null,
  };
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

    const lotAllocations = resolveReturnConsumableLotAllocations(item);
    const lotQuantity = sumReturnLotAllocationQuantity(lotAllocations);

    const consumableDraft: ConfirmReturnConsumableDraft = {
      itemId: item.itemId,
      itemModelId,
      itemName: item.itemName,
      unit: item.unit,
      expectedQuantity,
      reportedQuantity,
      quantity: String(reportedQuantity),
      expiredDate: getResolvedItemExpiredDate(item),
      lotAllocations: getExpectedReturnLotAllocations(item),
    };
    consumableItems.push(consumableDraft);
  }

  return {
    discrepancyFields: createEmptyDiscrepancyFields(),
    consumableItems,
    reusableItems,
  };
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_MAP[priority] ?? {
    label: priority,
    cls: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    dot: "bg-gray-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1.5 text-[13px] font-semibold tracking-tighter",
        cfg.cls,
      )}
    >
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
    cls: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1.5 text-[13px] font-semibold tracking-tighter",
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
  const [confirmResult, setConfirmResult] =
    useState<ConfirmReturnResponse | null>(null);

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
                units: (row.units ?? []).map((unit) =>
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

  const handleDiscrepancyFieldChange = useCallback(
    (field: ReturnDiscrepancyFieldKey, value: string) => {
      setForm((prev) => ({
        ...prev,
        discrepancyFields: {
          ...prev.discrepancyFields,
          [field]: value,
        },
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
        const result = await confirmReturnMutation.mutateAsync({
          missionId: activity.missionId,
          activityId: activity.activityId,
          request: {
            discrepancyNote: buildDiscrepancyNotePayload(
              form.discrepancyFields,
            ),
            consumableItems: form.consumableItems.map((row) => {
              const quantity = Number.parseInt(row.quantity || "0", 10) || 0;
              const { lotAllocations, expiredDate } =
                buildConfirmReturnLotAllocations(row);

              return {
                itemModelId: row.itemModelId,
                quantity,
                lotAllocations,
                expiredDate,
              };
            }),
            reusableItems: form.reusableItems.map((row) => ({
              itemModelId: row.itemModelId,
              quantity: Number.parseInt(row.quantity || "0", 10) || 0,
              units: (row.units ?? []).map((unit) => ({
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

        setConfirmResult(result);
        toast.success(result.message || "Đã xác nhận team đã trả đồ về kho.");
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

  const hasConsumableItems = form.consumableItems.length > 0;
  const hasReusableItems = form.reusableItems.length > 0;

  const isFormReady =
    form.consumableItems.every((row) => {
      const v = Number.parseInt(row.quantity || "0", 10);
      return Number.isFinite(v) && v > 0;
    }) &&
    form.reusableItems.every(
      (row) =>
        Number.parseInt(row.quantity || "0", 10) > 0 &&
        row.units.every((u) => !!u.condition),
    );

  const consumableSection = hasConsumableItems ? (
    <div className="space-y-2 rounded-xl border border-dashed border-orange-200/60 bg-orange-50/30 p-3 dark:border-orange-900/40 dark:bg-orange-950/10">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 items-center rounded-full bg-orange-100 px-2.5 text-sm font-medium tracking-tighter text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
          Vật phẩm tiêu thụ
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                Tên vật phẩm
              </th>
              <th className="text-right p-3 text-sm font-semibold tracking-tighter text-foreground whitespace-nowrap">
                Dự kiến
              </th>
              <th className="text-right p-3 text-sm font-semibold tracking-tighter text-foreground whitespace-nowrap w-36">
                Số lượng kho xác nhận
              </th>
            </tr>
          </thead>
          <tbody>
            {form.consumableItems.map((row) => (
              <tr
                key={row.itemId}
                className="border-b border-border/30 hover:bg-muted/30 transition-colors"
              >
                <td className="p-3">
                  <p className="text-sm font-medium tracking-tighter">
                    {row.itemName}
                  </p>
                  {row.lotAllocations.length > 0 && (
                    <p className="text-[13px] tracking-tighter mt-0.5">
                      {row.lotAllocations
                        .map(
                          (lot) =>
                            `Lô #${lot.lotId} — ${lot.quantityTaken.toLocaleString("vi-VN")} ${row.unit}${lot.expiredDate ? ` · HSD: ${new Date(lot.expiredDate).toLocaleDateString("vi-VN")}` : ""}`,
                        )
                        .join(" · ")}
                    </p>
                  )}
                </td>
                <td className="p-3 text-right">
                  <span className="text-sm font-semibold tracking-tighter text-amber-700 dark:text-amber-300">
                    {row.expectedQuantity.toLocaleString("vi-VN")} {row.unit}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={row.quantity}
                    disabled={row.lockQuantityToLots}
                    onChange={(event) =>
                      handleConsumableQuantityChange(
                        row.itemId,
                        event.target.value,
                      )
                    }
                    className="h-8 bg-background text-right w-full"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : null;

  const reusableSection = hasReusableItems ? (
    <div className="space-y-2 rounded-xl border border-dashed border-emerald-200/60 bg-emerald-50/30 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/10">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 items-center rounded-lg bg-emerald-100 px-2.5 text-sm font-medium tracking-tighter text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Vật phẩm tái sử dụng
        </span>
      </div>

      {!isConditionsLoading && conditionOptions.length === 0 && (
        <div className="rounded-lg border border-dashed border-red-200/70 bg-red-50/80 px-3 py-2 text-xs tracking-tighter text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
          Chưa tải được tình trạng vật phẩm tái sử dụng — cần có tình trạng để
          xác nhận.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                Tên vật phẩm / Serial
              </th>
              <th className="text-right p-3 text-sm font-semibold tracking-tighter text-foreground whitespace-nowrap">
                Dự kiến
              </th>
              <th className="text-right p-3 text-sm font-semibold tracking-tighter text-foreground whitespace-nowrap w-32">
                Số lượng kho xác nhận
              </th>
              <th className="p-3 text-sm font-semibold tracking-tighter text-foreground w-44">
                Tình trạng
              </th>
              <th className="p-3 text-sm font-semibold tracking-tighter text-foreground">
                Ghi chú
              </th>
            </tr>
          </thead>
          <tbody>
            {form.reusableItems.map((row) => (
              <>
                {/* Item header row */}
                <tr
                  key={`item-${row.itemId}`}
                  className="border-b border-border/40 bg-muted/20"
                >
                  <td className="p-3">
                    <p className="text-sm font-medium tracking-tighter">
                      {row.itemName}
                    </p>
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-sm font-semibold tracking-tighter text-amber-700 dark:text-amber-300">
                      {row.expectedQuantity.toLocaleString("vi-VN")} {row.unit}
                    </span>
                  </td>
                  <td className="p-3 text-right">
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
                      className="h-8 bg-background text-right w-full"
                    />
                  </td>
                  <td className="p-3" />
                  <td className="p-3" />
                </tr>
                {/* Serial sub-rows */}
                {row.units.map((unit) => (
                  <tr
                    key={`${row.itemId}-${unit.reusableItemId}-${unit.serialNumber}`}
                    className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-3 pl-6">
                      <p className="text-sm font-medium tracking-tighter">
                        {unit.serialNumber || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground tracking-tighter">
                        Mã số {unit.reusableItemId}
                      </p>
                    </td>
                    <td className="p-3" />
                    <td className="p-3" />
                    <td className="p-3">
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
                        <SelectTrigger className="h-8 w-full bg-background text-sm">
                          <SelectValue placeholder="Chọn" />
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
                    </td>
                    <td className="p-3">
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
                        placeholder="Ghi chú..."
                        className="h-8 bg-background text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-blue-200/60 bg-blue-50/30 p-4 dark:border-blue-900/40 dark:bg-blue-950/10"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
              Biên bản đối soát
            </h3>
            <p className="text-sm tracking-tighter text-muted-foreground">
              Xác nhận số lượng thực nhận và tình trạng thiết bị trước khi hoàn
              tất.
            </p>
          </div>
          <Button
            type="submit"
            size="sm"
            className="gap-1.5 shrink-0"
            disabled={
              confirmReturnMutation.isPending ||
              isConditionsLoading ||
              !isFormReady
            }
          >
            {confirmReturnMutation.isPending ? (
              <SpinnerGap className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FloppyDisk className="h-3.5 w-3.5" weight="fill" />
            )}
            Xác nhận nhận đồ
          </Button>
        </div>

        {/* Discrepancy note */}
        <div className="space-y-1.5">
          <div className="flex gap-2 overflow-x-auto pb-0.5 px-0.5">
            {RETURN_DISCREPANCY_FIELDS.map((field) => (
              <div
                key={field.key}
                className="flex flex-col gap-1 min-w-36 flex-1"
              >
                <label className="text-sm font-medium tracking-tighter whitespace-nowrap">
                  - {field.label}
                </label>
                <Input
                  value={form.discrepancyFields[field.key]}
                  onChange={(event) =>
                    handleDiscrepancyFieldChange(field.key, event.target.value)
                  }
                  placeholder={field.placeholder}
                  className="h-10 bg-background text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        {hasConsumableItems && hasReusableItems ? (
          <div className="grid grid-cols-[2fr_3fr] gap-4">
            {consumableSection}
            {reusableSection}
          </div>
        ) : (
          <>
            {consumableSection}
            {reusableSection}
          </>
        )}
      </div>

      {/* ── Confirm Result ── */}
      {confirmResult && (
        <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-950/20 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0"
                weight="fill"
              />
              <span className="text-base font-bold tracking-tight text-emerald-800 dark:text-emerald-200">
                Xác nhận hoàn tất
              </span>
              {confirmResult.discrepancyRecorded && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <Warning className="h-3 w-3" weight="fill" />
                  Có sai lệch đã ghi nhận
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-muted-foreground"
              onClick={onConfirmed}
            >
              Đóng
            </Button>
          </div>

          <p className="text-sm tracking-tighter text-emerald-700 dark:text-emerald-300">
            {confirmResult.message}
          </p>

          {confirmResult.restoredItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Vật phẩm đã nhập lại kho ({confirmResult.restoredItems.length})
              </p>
              <div className="space-y-2">
                {confirmResult.restoredItems.map((restoredItem) => {
                  const hasDiscrepancy =
                    restoredItem.actualQuantity !==
                    restoredItem.expectedQuantity;
                  return (
                    <div
                      key={restoredItem.itemModelId}
                      className={cn(
                        "rounded-xl border px-4 py-3 space-y-2",
                        hasDiscrepancy
                          ? "border-amber-200/70 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-950/20"
                          : "border-border/60 bg-background/80",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold tracking-tight">
                          {restoredItem.itemName}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs tracking-tighter text-muted-foreground">
                            Dự kiến:{" "}
                            <strong>
                              {restoredItem.expectedQuantity.toLocaleString(
                                "vi-VN",
                              )}{" "}
                              {restoredItem.unit}
                            </strong>
                          </span>
                          <span className="text-xs text-muted-foreground/50">
                            →
                          </span>
                          <span
                            className={cn(
                              "text-sm font-bold tracking-tighter",
                              hasDiscrepancy
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-emerald-700 dark:text-emerald-300",
                            )}
                          >
                            Thực nhận:{" "}
                            {restoredItem.actualQuantity.toLocaleString(
                              "vi-VN",
                            )}{" "}
                            {restoredItem.unit}
                          </span>
                        </div>
                      </div>

                      {(restoredItem.expectedReturnLotAllocations.length > 0 ||
                        restoredItem.returnedLotAllocations.length > 0) && (
                        <div className="grid gap-3 lg:grid-cols-2">
                          {restoredItem.expectedReturnLotAllocations.length >
                            0 && (
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Lô dự kiến trả
                              </p>
                              <div className="grid grid-cols-1 gap-1.5">
                                {restoredItem.expectedReturnLotAllocations.map(
                                  (lot) => (
                                    <div
                                      key={`expected-${restoredItem.itemModelId}-${lot.lotId}`}
                                      className="rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-1.5 text-xs tracking-tighter dark:border-amber-800/40 dark:bg-amber-950/20"
                                    >
                                      <p className="font-semibold">
                                        Lô #{lot.lotId} —{" "}
                                        {lot.quantityTaken.toLocaleString(
                                          "vi-VN",
                                        )}{" "}
                                        {restoredItem.unit}
                                      </p>
                                      <p className="text-muted-foreground">
                                        HSD:{" "}
                                        {lot.expiredDate
                                          ? new Date(
                                              lot.expiredDate,
                                            ).toLocaleDateString("vi-VN")
                                          : "—"}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                          {restoredItem.returnedLotAllocations.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Lô được nhập lại
                              </p>
                              <div className="grid grid-cols-1 gap-1.5">
                                {restoredItem.returnedLotAllocations.map(
                                  (lot) => (
                                    <div
                                      key={`returned-${restoredItem.itemModelId}-${lot.lotId}`}
                                      className="rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs tracking-tighter"
                                    >
                                      <p className="font-semibold">
                                        Lô #{lot.lotId} —{" "}
                                        {lot.quantityTaken.toLocaleString(
                                          "vi-VN",
                                        )}{" "}
                                        {restoredItem.unit}
                                      </p>
                                      <p className="text-muted-foreground">
                                        Tồn kho mới:{" "}
                                        {lot.remainingQuantityAfterExecution.toLocaleString(
                                          "vi-VN",
                                        )}
                                      </p>
                                      <p className="text-muted-foreground">
                                        HSD:{" "}
                                        {lot.expiredDate
                                          ? new Date(
                                              lot.expiredDate,
                                            ).toLocaleDateString("vi-VN")
                                          : "—"}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {restoredItem.returnedReusableUnits.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Thiết bị tái sử dụng đã nhận lại
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {restoredItem.returnedReusableUnits.map((unit) => (
                              <div
                                key={unit.reusableItemId}
                                className="rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs tracking-tighter"
                              >
                                <p className="font-semibold">
                                  #{unit.reusableItemId} · {unit.serialNumber}
                                </p>
                                <p className="text-muted-foreground">
                                  Tình trạng: {unit.condition || "—"}
                                </p>
                                {unit.note && (
                                  <p className="text-muted-foreground">
                                    Ghi chú: {unit.note}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

interface DetailPanelProps {
  item: ActivityEntity | null;
  open: boolean;
  onClose: () => void;
  onConfirmed?: () => void;
  mode: TabType;
  activityKind: ActivityKind;
}

function DetailPanel({
  item,
  open,
  onClose,
  onConfirmed,
  mode,
  activityKind,
}: DetailPanelProps) {
  const isHistory = mode === "history";
  const hist = isHistory ? (item as HistoryActivityEntity) : null;
  const isReturnActivity = activityKind === "return";
  const copy = ACTIVITY_COPY[activityKind];

  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
    <>
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
                      <InfoKV
                        label="Loại hoạt động"
                        value={item.activityType}
                      />
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
                        Không có vật phẩm
                      </p>
                    ) : (
                      <div
                        className={
                          isReturnActivity
                            ? "overflow-x-auto"
                            : "flex flex-col gap-1.5"
                        }
                      >
                        {isReturnActivity ? (
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border/50">
                                <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground w-12"></th>
                                <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                                  Tên vật phẩm
                                </th>
                                <th className="text-right p-3 text-sm font-semibold tracking-tighter text-foreground whitespace-nowrap">
                                  Dự kiến hoàn trả
                                </th>
                                <th className="text-right p-3 text-sm font-semibold tracking-tighter text-foreground whitespace-nowrap">
                                  Đã trả thực tế
                                </th>
                                <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                                  Lô dự kiến trả
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(item.items as UpcomingReturnItem[]).map(
                                (it) => {
                                  const expectedQty = Number.isFinite(
                                    it.quantity,
                                  )
                                    ? it.quantity
                                    : 0;
                                  const actualQty = Number.isFinite(
                                    it.actualReturnedQuantity,
                                  )
                                    ? it.actualReturnedQuantity
                                    : 0;
                                  const lots =
                                    getExpectedReturnLotAllocations(it);
                                  return (
                                    <tr
                                      key={it.itemId}
                                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                                    >
                                      <td className="p-3 w-10">
                                        {it.imageUrl ? (
                                          <button
                                            onClick={() =>
                                              setPreviewUrl(it.imageUrl!)
                                            }
                                            className="inline-flex items-center justify-center h-8 w-8 rounded transition-colors"
                                            title="Xem ảnh"
                                          >
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                          </button>
                                        ) : (
                                          <div className="inline-flex items-center justify-center h-8 w-8">
                                            <Package
                                              className="h-4 w-4 text-muted-foreground/30"
                                              weight="fill"
                                            />
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-3">
                                        <p className="text-sm font-medium tracking-tighter">
                                          {it.itemName}
                                        </p>
                                        <p className="text-xs text-muted-foreground tracking-tighter">
                                          Mã vật phẩm số {it.itemId}
                                        </p>
                                      </td>
                                      <td className="p-3 text-right">
                                        <span className="text-sm font-semibold tracking-tighter text-blue-600 dark:text-blue-300">
                                          {expectedQty.toLocaleString("vi-VN")}{" "}
                                          {it.unit}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right">
                                        <span className="text-sm font-semibold tracking-tighter text-emerald-600 dark:text-emerald-300">
                                          {actualQty.toLocaleString("vi-VN")}{" "}
                                          {it.unit}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        {lots.length === 0 ? (
                                          <span className="text-sm text-muted-foreground tracking-tighter">
                                            —
                                          </span>
                                        ) : (
                                          <div className="flex flex-col gap-1">
                                            {lots.map((lot) => (
                                              <div
                                                key={lot.lotId}
                                                className="text-sm tracking-tighter leading-snug"
                                              >
                                                <span className="font-semibold text-foreground">
                                                  Lô số {lot.lotId}
                                                </span>
                                                <span className="text-muted-foreground">
                                                  {" "}
                                                  —{" "}
                                                  {lot.quantityTaken.toLocaleString(
                                                    "vi-VN",
                                                  )}{" "}
                                                  {it.unit}
                                                </span>
                                                {lot.expiredDate && (
                                                  <span className="text-muted-foreground">
                                                    {" "}
                                                    · HSD:{" "}
                                                    {new Date(
                                                      lot.expiredDate,
                                                    ).toLocaleDateString(
                                                      "vi-VN",
                                                    )}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                },
                              )}
                            </tbody>
                          </table>
                        ) : (
                          item.items.map((it, idx) => (
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
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {canConfirmReturn && (
                    <ConfirmReturnFormSection
                      activity={item as UpcomingReturnEntity}
                      onConfirmed={onConfirmed ?? onClose}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image preview dialog */}
      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
      >
        <DialogContent className="max-w-2xl p-2 bg-black/90 border-0">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Xem ảnh vật phẩm"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
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
                  activityKind === "return" ? "Vật phẩm trả" : "Vật phẩm",
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
                    : "Vật phẩm đã giao",
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
  const { selectedDepotId } = useManagerDepot();
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
    { depotId: selectedDepotId ?? 0, pageNumber: upcomingPage, pageSize },
    {
      refetchInterval: isReturnActivity ? false : 30_000,
      enabled: !isReturnActivity && Boolean(selectedDepotId),
    },
  );

  const {
    data: pickupHistoryData,
    isLoading: isPickupHistoryLoading,
    isFetching: isPickupHistoryFetching,
    refetch: refetchPickupHistory,
  } = useMyDepotPickupHistory(
    {
      depotId: selectedDepotId ?? 0,
      pageNumber: historyPage,
      pageSize,
      fromDate: appliedFrom || undefined,
      toDate: appliedTo || undefined,
    },
    {
      refetchInterval: isReturnActivity ? false : 60_000,
      enabled: !isReturnActivity && Boolean(selectedDepotId),
    },
  );

  const {
    data: returnUpcomingData,
    isLoading: isReturnUpcomingLoading,
    isFetching: isReturnUpcomingFetching,
    refetch: refetchReturnUpcoming,
  } = useMyDepotUpcomingReturns(
    {
      depotId: selectedDepotId ?? 0,
      pageNumber: upcomingPage,
      pageSize,
      status: returnStatus,
    },
    {
      refetchInterval: isReturnActivity ? 30_000 : false,
      enabled: isReturnActivity && Boolean(selectedDepotId),
    },
  );

  const {
    data: returnHistoryData,
    isLoading: isReturnHistoryLoading,
    isFetching: isReturnHistoryFetching,
    refetch: refetchReturnHistory,
  } = useMyDepotReturnHistory(
    {
      depotId: selectedDepotId ?? 0,
      pageNumber: historyPage,
      pageSize,
      fromDate: appliedFrom || undefined,
      toDate: appliedTo || undefined,
    },
    {
      refetchInterval: isReturnActivity ? 60_000 : false,
      enabled: isReturnActivity && Boolean(selectedDepotId),
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
        onConfirmed={() => {
          handleClose();
          setActiveTab("history");
        }}
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
