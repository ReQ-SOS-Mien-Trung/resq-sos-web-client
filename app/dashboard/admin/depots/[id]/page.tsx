"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Warehouse,
  MapPin,
  Package,
  ArrowClockwise,
  ArrowsLeftRight,
  ArrowRight,
  CheckFat,
  HourglassHigh,
  Truck,
  ArrowFatLinesDown,
  WarningCircle,
  Spinner,
  WarehouseIcon,
  LockIcon,
  ArrowLeftIcon,
  Plus,
  Trash,
  ArrowsOutIcon,
  ArrowsInIcon,
  XCircle,
  ArrowsClockwise,
  CaretDown,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  useDepotById,
  useDepots,
  useDepotAvailableManagers,
  useDepotActiveManagers,
  useDepotClosureResolutionMetadata,
  useDepotMetadata,
  useDepotStatuses,
  useAssignDepotManager,
  useUnassignDepotManager,
  useUpdateDepotStatus,
  useInitiateDepotClosing,
  useInitiateDepotClosure,
  useMarkDepotClosureExternal,
  useInitiateDepotClosureTransfer,
  useDepotClosureTransferSuggestions,
  useDepotClosureByDepotId,
  useDepotClosureDetailByDepotId,
  useDepotClosureTransferDetailByDepotId,
  useDepotClosuresListByDepotId,
  useCancelDepotClosureTransfer,
  useDepotClosureTransferStatuses,
} from "@/services/depot/hooks";
import { useDepotManagers } from "@/services/depot_manager";
import { useInventoryItemTypes } from "@/services/inventory/hooks";
import type {
  DepotClosureDetailTransfer,
  DepotClosureRemainingInventoryItem,
  DepotClosureSuggestedTransfer,
  DepotClosureTransferSuggestionTargetMetric,
  DepotStatus,
  DepotStatusMetadata,
} from "@/services/depot/type";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  buildDepotClosureTransferStepItems,
  buildDepotClosureTransferStatusValueMap,
  getDepotClosureTransferStatusLabel,
  getDepotClosureTransferStatusToneClass,
  normalizeDepotClosureTransferStatus,
  DEPOT_CLOSURE_TRANSFER_TERMINAL_STATUSES,
} from "@/lib/depot-closure-transfer-status";

/* ── helpers ──────────────────────────────────────────────────── */
function getApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return fallback;
}

function computeCountdown(deadline: string | null | undefined): string {
  if (!deadline) return "";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Đã hết hạn";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return h > 0
    ? `${h}g ${String(m).padStart(2, "0")}p ${String(s).padStart(2, "0")}s`
    : `${m}p ${String(s).padStart(2, "0")}s`;
}

function useCountdown(deadline: string | null | undefined): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!deadline) return;

    const id = setInterval(() => setTick((tick) => tick + 1), 1_000);
    return () => clearInterval(id);
  }, [deadline]);
  return computeCountdown(deadline);
}

type DepotMetricUnit = "dm3" | "kg";

function getDepotMetricUnitLabel(unit: DepotMetricUnit): string {
  return unit === "dm3" ? "dm³" : "kg";
}

function formatDepotMetric(
  value: number | null | undefined,
  unit: DepotMetricUnit,
): string {
  const safeValue = Number.isFinite(value) ? Number(value) : 0;
  return `${safeValue.toLocaleString("vi-VN", {
    minimumFractionDigits: safeValue % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })} ${getDepotMetricUnitLabel(unit)}`;
}

function formatDateTimeValue(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleString("vi-VN");
}

function getClosureResolutionLabel(value: string | null | undefined): string {
  if (value === "TransferToDepot") return "Chuyển kho";
  if (value === "ExternalResolution" || value === "MarkExternal") {
    return "Xử lý ngoài";
  }
  return value || "—";
}

function toFiniteNumberOrNull(value: unknown): number | null {
  const parsed =
    typeof value === "number" ? value : Number(value ?? Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function isConsumableItemType(value: string | null | undefined): boolean {
  return value?.trim().toLocaleLowerCase("en-US") === "consumable";
}

function getInventoryItemTypeLabel(
  value: string | null | undefined,
  itemTypeValueMap: Record<string, string>,
): string {
  if (!value) return "—";
  return itemTypeValueMap[String(value)] ?? value;
}

const TRANSFER_RECORD_TONES = [
  {
    accentBorder: "border-l-emerald-400",
    headerBg: "bg-emerald-50/85",
    headerBorder: "border-emerald-100/80",
    tableHeadBg: "bg-emerald-50/70",
    tableHeadStickyBg: "bg-emerald-50/95",
  },
  {
    accentBorder: "border-l-sky-400",
    headerBg: "bg-sky-50/85",
    headerBorder: "border-sky-100/80",
    tableHeadBg: "bg-sky-50/70",
    tableHeadStickyBg: "bg-sky-50/95",
  },
  {
    accentBorder: "border-l-violet-400",
    headerBg: "bg-violet-50/85",
    headerBorder: "border-violet-100/80",
    tableHeadBg: "bg-violet-50/70",
    tableHeadStickyBg: "bg-violet-50/95",
  },
  {
    accentBorder: "border-l-amber-400",
    headerBg: "bg-amber-50/85",
    headerBorder: "border-amber-100/80",
    tableHeadBg: "bg-amber-50/70",
    tableHeadStickyBg: "bg-amber-50/95",
  },
  {
    accentBorder: "border-l-rose-400",
    headerBg: "bg-rose-50/85",
    headerBorder: "border-rose-100/80",
    tableHeadBg: "bg-rose-50/70",
    tableHeadStickyBg: "bg-rose-50/95",
  },
  {
    accentBorder: "border-l-orange-400",
    headerBg: "bg-orange-50/85",
    headerBorder: "border-orange-100/80",
    tableHeadBg: "bg-orange-50/70",
    tableHeadStickyBg: "bg-orange-50/95",
  },
] as const;

function ClosureTransferRecordCard({
  depotId,
  closureId,
  transfer,
  index,
  itemTypeValueMap,
  transferStatusValueMap,
}: {
  depotId: number;
  closureId: number;
  transfer: DepotClosureDetailTransfer;
  index: number;
  itemTypeValueMap: Record<string, string>;
  transferStatusValueMap: Record<string, string>;
}) {
  const tone = TRANSFER_RECORD_TONES[index % TRANSFER_RECORD_TONES.length];
  const { data: transferDetail } = useDepotClosureTransferDetailByDepotId(
    depotId,
    closureId,
    transfer.id,
    {
      enabled: depotId > 0 && closureId > 0 && transfer.id > 0,
    },
  );
  const resolvedTransfer = transferDetail ?? transfer;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/40 border-l-4 bg-white",
        tone.accentBorder,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3",
          tone.headerBg,
          tone.headerBorder,
        )}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tighter text-foreground">
              Đơn điều chuyển số {resolvedTransfer.id}
            </span>
            <Badge
              className={cn(
                "text-xs font-medium tracking-tighter",
                getDepotClosureTransferStatusToneClass(resolvedTransfer.status),
              )}
            >
              {getDepotClosureTransferStatusLabel(
                resolvedTransfer.status,
                transferStatusValueMap,
              )}
            </Badge>
          </div>
          <p className="text-xs tracking-tighter font-medium text-foreground/80">
            {resolvedTransfer.sourceDepotName ||
              `Kho #${resolvedTransfer.sourceDepotId}`}{" "}
            →{" "}
            {resolvedTransfer.targetDepotName ||
              `Kho #${resolvedTransfer.targetDepotId}`}
          </p>
        </div>
        <div className="text-right text-xs tracking-tighter font-medium text-foreground/80">
          <p>Tạo lúc {formatDateTimeValue(resolvedTransfer.createdAt)}</p>
          <p>
            Vận chuyển lúc: {formatDateTimeValue(resolvedTransfer.shippedAt)}
          </p>
          <p>Nhận lúc: {formatDateTimeValue(resolvedTransfer.receivedAt)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-b border-border/30 px-4 py-3 sm:grid-cols-4">
        {[
          {
            label: "Số lượng vật phẩm tiêu thụ",
            value:
              resolvedTransfer.snapshotConsumableUnits.toLocaleString("vi-VN"),
          },
          {
            label: "Số lượng vật phẩm tái sử dụng",
            value:
              resolvedTransfer.snapshotReusableUnits.toLocaleString("vi-VN"),
          },
          {
            label: "Người xuất kho",
            value:
              resolvedTransfer.shippedByName ||
              resolvedTransfer.shippedBy ||
              "—",
          },
          {
            label: "Người nhận",
            value:
              resolvedTransfer.receivedByName ||
              resolvedTransfer.receivedBy ||
              "—",
          },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-[13px] tracking-tighter text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-sm font-semibold tracking-tighter text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      {resolvedTransfer.items.length > 0 && (
        <div className="max-h-80 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className={cn("border-b border-border/30", tone.tableHeadBg)}>
                <th
                  className={cn(
                    "sticky top-0 z-10 text-left px-4 py-2 text-xs font-semibold tracking-tighter text-foreground",
                    tone.tableHeadStickyBg,
                  )}
                >
                  Vật phẩm
                </th>
                <th
                  className={cn(
                    "sticky top-0 z-10 text-left px-4 py-2 text-xs font-semibold tracking-tighter text-foreground",
                    tone.tableHeadStickyBg,
                  )}
                >
                  Loại
                </th>
                <th
                  className={cn(
                    "sticky top-0 z-10 text-right px-4 py-2 text-xs font-semibold tracking-tighter text-foreground",
                    tone.tableHeadStickyBg,
                  )}
                >
                  Số lượng
                </th>
              </tr>
            </thead>
            <tbody>
              {resolvedTransfer.items.map((item) => (
                <tr
                  key={`${resolvedTransfer.id}-${item.itemModelId}-${item.itemType}`}
                  className="border-b border-border/20 last:border-0"
                >
                  <td className="px-4 py-2 text-sm tracking-tighter text-foreground">
                    {item.itemName}
                  </td>
                  <td className="px-4 py-2 text-sm tracking-tighter text-muted-foreground">
                    {getInventoryItemTypeLabel(item.itemType, itemTypeValueMap)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm tracking-tighter text-foreground">
                    {item.quantity.toLocaleString("vi-VN")} {item.unit || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface TransferCapacityLoad {
  requiredVolume: number;
  requiredWeight: number;
  consumableUnits: number;
  consumableLineCount: number;
}

interface TransferCapacityStatus extends TransferCapacityLoad {
  targetDepotId: number | null;
  targetDepotName: string | null;
  remainingVolume: number | null;
  remainingWeight: number | null;
  overflowVolume: number;
  overflowWeight: number;
  hasTarget: boolean;
  hasMetric: boolean;
  requiresCapacityCheck: boolean;
  fitsVolume: boolean;
  fitsWeight: boolean;
  fitsBoth: boolean;
}

function createEmptyTransferCapacityLoad(): TransferCapacityLoad {
  return {
    requiredVolume: 0,
    requiredWeight: 0,
    consumableUnits: 0,
    consumableLineCount: 0,
  };
}

function buildTransferCapacityStatus(params: {
  load: TransferCapacityLoad;
  targetDepotId: number | null;
  targetDepotName: string | null;
  metric?: DepotClosureTransferSuggestionTargetMetric | null;
}): TransferCapacityStatus {
  const { load, targetDepotId, targetDepotName, metric } = params;
  const hasTarget =
    targetDepotId != null &&
    Number.isFinite(targetDepotId) &&
    Number(targetDepotId) > 0;
  const remainingVolume =
    metric == null
      ? null
      : Math.max(toFiniteNumberOrNull(metric.remainingVolume) ?? 0, 0);
  const remainingWeight =
    metric == null
      ? null
      : Math.max(toFiniteNumberOrNull(metric.remainingWeight) ?? 0, 0);
  const requiresCapacityCheck =
    load.requiredVolume > 0 || load.requiredWeight > 0;
  const hasMetric = metric != null;
  const fitsVolume =
    load.requiredVolume <= 0 ||
    (remainingVolume != null && load.requiredVolume <= remainingVolume);
  const fitsWeight =
    load.requiredWeight <= 0 ||
    (remainingWeight != null && load.requiredWeight <= remainingWeight);
  const overflowVolume =
    load.requiredVolume <= 0
      ? 0
      : Math.max(load.requiredVolume - (remainingVolume ?? 0), 0);
  const overflowWeight =
    load.requiredWeight <= 0
      ? 0
      : Math.max(load.requiredWeight - (remainingWeight ?? 0), 0);

  return {
    ...load,
    targetDepotId: hasTarget ? Number(targetDepotId) : null,
    targetDepotName,
    remainingVolume,
    remainingWeight,
    overflowVolume,
    overflowWeight,
    hasTarget,
    hasMetric,
    requiresCapacityCheck,
    fitsVolume,
    fitsWeight,
    fitsBoth:
      hasTarget &&
      (!requiresCapacityCheck || (hasMetric && fitsVolume && fitsWeight)),
  };
}

function getTransferCapacityValidationMessage(
  status: TransferCapacityStatus,
): string {
  const depotLabel = status.targetDepotName
    ? `Kho "${status.targetDepotName}"`
    : "Kho đích";

  if (!status.requiresCapacityCheck) {
    return `${depotLabel} không có tải Consumable nên không bị ràng buộc sức chứa.`;
  }

  if (!status.hasMetric) {
    return `${depotLabel} chưa có dữ liệu sức chứa khả dụng cho phần hàng tiêu hao.`;
  }

  const issueParts: string[] = [];
  if (!status.fitsVolume && status.overflowVolume > 0) {
    issueParts.push(
      `vượt ${formatDepotMetric(status.overflowVolume, "dm3")} thể tích`,
    );
  }
  if (!status.fitsWeight && status.overflowWeight > 0) {
    issueParts.push(
      `vượt ${formatDepotMetric(status.overflowWeight, "kg")} khối lượng`,
    );
  }

  return issueParts.length
    ? `${depotLabel} ${issueParts.join(" và ")} cho phần hàng tiêu hao.`
    : `${depotLabel} không còn đủ sức chứa cho phần hàng tiêu hao.`;
}

interface TransferAssignmentItemDraft {
  itemKey: string;
  quantity: string;
}

interface TransferAssignmentDraft {
  id: string;
  targetDepotId: string;
  items: TransferAssignmentItemDraft[];
}

interface ClosureInventoryOption {
  itemKey: string;
  itemModelId: number;
  itemName: string;
  itemType: string;
  quantity: number;
  stockQuantity: number;
  transferableQuantity: number;
  blockedQuantity: number;
  unit: string | null;
  categoryName: string | null;
  volumePerUnit: number | null;
  weightPerUnit: number | null;
}

const TRANSFER_ASSIGNMENT_ACCENTS = [
  {
    border: "border-l-sky-500",
    borderColor: "border-sky-400",
    bg: "bg-sky-50/70",
    badge: "bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    border: "border-l-violet-500",
    borderColor: "border-violet-400",
    bg: "bg-violet-50/70",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    border: "border-l-emerald-500",
    borderColor: "border-emerald-400",
    bg: "bg-emerald-50/70",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    border: "border-l-amber-500",
    borderColor: "border-amber-400",
    bg: "bg-amber-50/70",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    border: "border-l-rose-500",
    borderColor: "border-rose-400",
    bg: "bg-rose-50/70",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
  },
];

function createDraftId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTransferAssignmentItemsFromInventory(
  inventoryItems: ClosureInventoryOption[],
  existingItems?: TransferAssignmentItemDraft[],
): TransferAssignmentItemDraft[] {
  const existingMap = new Map(
    (existingItems ?? []).map((item) => [item.itemKey, item.quantity]),
  );

  return inventoryItems.map((inventoryItem) => ({
    itemKey: inventoryItem.itemKey,
    quantity: existingMap.get(inventoryItem.itemKey) ?? "",
  }));
}

function createTransferAssignmentDraft(
  inventoryItems: ClosureInventoryOption[] = [],
  existingItems?: TransferAssignmentItemDraft[],
): TransferAssignmentDraft {
  return {
    id: createDraftId("transfer-assignment"),
    targetDepotId: "",
    items: createTransferAssignmentItemsFromInventory(
      inventoryItems,
      existingItems,
    ),
  };
}

function normalizeDepotName(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase("vi") ?? "";
}

function normalizeClosureInventoryItems(
  items: DepotClosureRemainingInventoryItem[] | null | undefined,
): ClosureInventoryOption[] {
  if (!items?.length) return [];

  return items
    .map((item) => {
      const itemModelId = Number(item.itemModelId);
      const stockQuantity = Number(item.quantity);
      const transferableRaw = item.transferableQuantity ?? item.quantity;
      const blockedRaw = item.blockedQuantity ?? 0;
      const quantity = Number(transferableRaw);
      const blockedQuantity = Number(blockedRaw);
      const itemType = String(item.itemType ?? "").trim();
      if (!Number.isFinite(itemModelId) || itemModelId <= 0) return null;
      if (!Number.isFinite(stockQuantity) || stockQuantity <= 0) return null;
      if (!Number.isFinite(quantity) || quantity <= 0) return null;
      if (!itemType) return null;

      const itemName = item.itemName?.trim() || `Vật phẩm #${itemModelId}`;
      const volumePerUnit = toFiniteNumberOrNull(item.volumePerUnit);
      const weightRaw = item.weightPerUnit ?? item.WeightPerUnit ?? null;
      const weightPerUnit = toFiniteNumberOrNull(weightRaw);

      return {
        itemKey: `${itemModelId}::${itemType}`,
        itemModelId,
        itemName,
        itemType,
        quantity,
        stockQuantity,
        transferableQuantity: quantity,
        blockedQuantity:
          Number.isFinite(blockedQuantity) && blockedQuantity > 0
            ? blockedQuantity
            : 0,
        unit: item.unit?.trim() || null,
        categoryName: item.categoryName?.trim() || null,
        volumePerUnit,
        weightPerUnit,
      } satisfies ClosureInventoryOption;
    })
    .filter((item): item is ClosureInventoryOption => item !== null)
    .sort((a, b) => a.itemName.localeCompare(b.itemName, "vi"));
}

function createTransferAssignmentsFromSuggestions(
  inventoryItems: ClosureInventoryOption[],
  suggestions: DepotClosureSuggestedTransfer[] | null | undefined,
): TransferAssignmentDraft[] {
  if (!inventoryItems.length || !suggestions?.length) {
    return [createTransferAssignmentDraft(inventoryItems)];
  }

  const quantitiesByTargetDepot = new Map<number, Map<string, number>>();

  for (const suggestion of suggestions) {
    if (
      suggestion.targetDepotId == null ||
      !Number.isFinite(suggestion.targetDepotId) ||
      suggestion.targetDepotId <= 0
    ) {
      continue;
    }

    const quantity = Number(suggestion.suggestedQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const itemKey = `${suggestion.itemModelId}::${suggestion.itemType}`;
    const itemExists = inventoryItems.some((item) => item.itemKey === itemKey);
    if (!itemExists) continue;

    const targetMap =
      quantitiesByTargetDepot.get(suggestion.targetDepotId) ??
      (() => {
        const created = new Map<string, number>();
        quantitiesByTargetDepot.set(suggestion.targetDepotId!, created);
        return created;
      })();

    targetMap.set(itemKey, (targetMap.get(itemKey) ?? 0) + quantity);
  }

  const entries = Array.from(quantitiesByTargetDepot.entries());

  if (!entries.length) {
    return [createTransferAssignmentDraft(inventoryItems)];
  }

  return entries.map(([targetDepotId, quantitiesMap], index) => ({
    ...createTransferAssignmentDraft(
      inventoryItems,
      inventoryItems.map((item) => ({
        itemKey: item.itemKey,
        quantity:
          quantitiesMap.has(item.itemKey) &&
          (quantitiesMap.get(item.itemKey) ?? 0) > 0
            ? String(quantitiesMap.get(item.itemKey))
            : "",
      })),
    ),
    id: createDraftId(`transfer-suggestion-${index + 1}`),
    targetDepotId: String(targetDepotId),
  }));
}

/* ── Status config ────────────────────────────────────────────── */
type StatusCfgMap = Record<
  string,
  { label: string; color: string; bg: string }
>;

const STATUS_STYLE: Record<DepotStatus, { color: string; bg: string }> = {
  Created: {
    color: "text-white",
    bg: "bg-sky-600 border-sky-400 dark:bg-sky-700",
  },
  Available: {
    color: "text-white",
    bg: "bg-emerald-600 border-emerald-400 dark:bg-emerald-700",
  },
  Unavailable: {
    color: "text-white",
    bg: "bg-orange-600 border-orange-400 dark:bg-orange-700",
  },
  Full: {
    color: "text-white",
    bg: "bg-amber-500  border-amber-400  dark:bg-amber-600",
  },
  PendingAssignment: {
    color: "text-white",
    bg: "bg-blue-600   border-blue-400   dark:bg-blue-700",
  },
  Closed: {
    color: "text-white",
    bg: "bg-zinc-500   border-zinc-400   dark:bg-zinc-600",
  },
  Closing: {
    color: "text-white",
    bg: "bg-red-600    border-red-400    dark:bg-red-700",
  },
  UnderMaintenance: {
    color: "text-white",
    bg: "bg-purple-600 border-purple-400 dark:bg-purple-700",
  },
};

const STATUS_FALLBACK: Record<DepotStatus, string> = {
  Created: "Vừa tạo, chưa có quản lý",
  Available: "Đang hoạt động",
  Unavailable: "Ngưng hoạt động",
  Full: "Đã đầy",
  PendingAssignment: "Chưa có quản lý",
  Closed: "Đã đóng",
  Closing: "Đang tiến hành đóng kho",
  UnderMaintenance: "Đang bảo trì",
};

function buildStatusCfg(apiStatuses?: DepotStatusMetadata[]): StatusCfgMap {
  const result: StatusCfgMap = {};
  const keys: DepotStatus[] = [
    "Created",
    "Available",
    "Unavailable",
    "Full",
    "PendingAssignment",
    "Closed",
    "Closing",
    "UnderMaintenance",
  ];
  for (const key of keys) {
    const apiLabel = apiStatuses?.find((s) => s.key === key)?.value;
    const style = STATUS_STYLE[key] ?? STATUS_STYLE.Closed;
    result[key] = { label: apiLabel ?? STATUS_FALLBACK[key] ?? key, ...style };
  }
  return result;
}

/* ── Page ─────────────────────────────────────────────────────── */
// ── Depot Closures List Panel (admin) ────────────────────────────────────────

const CLOSURE_STATUS_LABEL: Record<string, string> = {
  InProgress: "Đang xử lý",
  Processing: "Đang chuẩn bị",
  TransferPending: "Chờ chuyển kho",
  Completed: "Hoàn tất",
  Cancelled: "Đã hủy",
  Expired: "Hết hạn",
};

const CLOSURE_STATUS_CLASS: Record<string, string> = {
  InProgress: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  Processing: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  TransferPending: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Cancelled: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  Expired: "bg-red-500/10 text-red-700 dark:text-red-400",
};

function DepotClosuresListPanel({ depotId }: { depotId: number }) {
  const {
    data: closures = [],
    isLoading,
    refetch,
    isFetching,
  } = useDepotClosuresListByDepotId(depotId);
  const { data: itemTypes = [] } = useInventoryItemTypes();
  const itemTypeValueMap = useMemo(
    () =>
      Object.fromEntries(
        itemTypes.map((itemType) => [String(itemType.key), itemType.value]),
      ),
    [itemTypes],
  );
  const { data: transferStatusMetadata = [] } = useDepotClosureTransferStatuses(
    {
      enabled: depotId > 0,
    },
  );
  const transferStatusValueMap = useMemo(
    () => buildDepotClosureTransferStatusValueMap(transferStatusMetadata),
    [transferStatusMetadata],
  );
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const { data: expandedClosureDetail, isFetching: isFetchingExpandedDetail } =
    useDepotClosureDetailByDepotId(depotId, expandedId ?? 0, {
      enabled: depotId > 0 && expandedId != null,
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tighter">
            Lịch sử phiên đóng kho
          </h2>
          <p className="text-sm text-muted-foreground tracking-tight mt-0.5">
            {closures.length > 0
              ? `${closures.length} phiên đóng kho`
              : "Chưa có phiên nào."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 tracking-tighter"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <ArrowsClockwise
            size={14}
            className={isFetching ? "animate-spin" : ""}
          />
          Làm mới
        </Button>
      </div>

      <Card className="border border-border/50 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : closures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <p className="text-sm text-muted-foreground tracking-tighter">
                Không có phiên đóng kho nào.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground w-14">
                      #
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Lý do
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Phương án xử lý
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Người khởi tạo
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Thời gian
                    </th>
                    <th className="text-left p-3 text-sm font-semibold tracking-tighter text-foreground">
                      Trạng thái
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {closures.map((closure) => {
                    const isExpanded = expandedId === closure.id;
                    const allTransfers = closure.transfers?.length
                      ? closure.transfers
                      : closure.transfer
                        ? [closure.transfer]
                        : [];
                    const detail =
                      isExpanded && expandedClosureDetail?.id === closure.id
                        ? expandedClosureDetail
                        : null;
                    const transferRecords = detail?.transferDetails?.length
                      ? detail.transferDetails
                      : detail?.transferDetail
                        ? [detail.transferDetail]
                        : [];
                    const closureMetrics = detail
                      ? [
                          // {
                          //   label: "Tiêu thụ snapshot / thực tế",
                          //   value:
                          //     detail.snapshotConsumableUnits.toLocaleString(
                          //       "vi-VN",
                          //     ),
                          //   hint: `Thực tế ${detail.actualConsumableUnits.toLocaleString(
                          //     "vi-VN",
                          //   )}`,
                          // },
                          // {
                          //   label: "Tái sử dụng snapshot / thực tế",
                          //   value:
                          //     detail.snapshotReusableUnits.toLocaleString(
                          //       "vi-VN",
                          //     ),
                          //   hint: `Thực tế ${detail.actualReusableUnits.toLocaleString(
                          //     "vi-VN",
                          //   )}`,
                          // },
                          {
                            label: "Vật phẩm tồn còn lại",
                            value: (
                              detail.remainingItemCount ?? 0
                            ).toLocaleString("vi-VN"),
                            hint: detail.hasRemainingItems
                              ? "Cần xử lý tiếp"
                              : "Đã hết vật phẩm tồn",
                          },
                          {
                            label: "Số lượng còn lại có thể điều chuyển",
                            value: (
                              detail.transferableRemainingItemCount ?? 0
                            ).toLocaleString("vi-VN"),
                            // hint: `${(
                            //   detail.transferableRemainingUnitCount ?? 0
                            // ).toLocaleString("vi-VN")} đơn vị`,
                          },
                          {
                            label: "Số lượng chưa thể xuất",
                            value: (
                              detail.blockedRemainingItemCount ?? 0
                            ).toLocaleString("vi-VN"),
                            // hint: `${(
                            //   detail.blockedRemainingUnitCount ?? 0
                            // ).toLocaleString("vi-VN")} đơn vị`,
                          },
                          {
                            label: "Ghi nhận hoàn tất",
                            value: formatDateTimeValue(detail.completedAt),
                            hint: detail.cancelledAt
                              ? `Hủy lúc ${formatDateTimeValue(
                                  detail.cancelledAt,
                                )}`
                              : `Khởi tạo ${formatDateTimeValue(
                                  detail.initiatedAt,
                                )}`,
                          },
                        ]
                      : [
                          // {
                          //   label: "Số lượng tiêu thụ",
                          //   value:
                          //     closure.snapshotConsumableUnits.toLocaleString(
                          //       "vi-VN",
                          //     ),
                          //   hint: "Theo snapshot closure",
                          // },
                          // {
                          //   label: "Snapshot tái sử dụng",
                          //   value:
                          //     closure.snapshotReusableUnits.toLocaleString(
                          //       "vi-VN",
                          //     ),
                          //   hint: "Theo snapshot closure",
                          // },
                          {
                            label: "Hoàn tất",
                            value: formatDateTimeValue(closure.completedAt),
                            hint: `Khởi tạo ${formatDateTimeValue(
                              closure.initiatedAt,
                            )}`,
                          },
                        ];
                    const closureSignals = detail
                      ? [
                          {
                            label: "Còn đơn điều chuyển",
                            active: detail.hasOpenTransfers ?? false,
                            activeClass:
                              "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-300",
                          },
                          {
                            label: "Còn vật phẩm tồn kho",
                            active: detail.hasRemainingItems ?? false,
                            activeClass:
                              "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300",
                          },
                          {
                            label: "Có vật phẩm chưa thể xuất",
                            active: detail.hasClosingBlockers ?? false,
                            activeClass:
                              "border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300",
                          },
                          {
                            label: "Xác nhận có thể đóng kho",
                            active: detail.canConfirmClose ?? false,
                            activeClass:
                              "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300",
                          },
                          {
                            label: "Có record đơn điều chuyển",
                            active: detail.hasTransferRecords ?? false,
                            activeClass:
                              "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300",
                          },
                          {
                            label: "Có record xử lý bên ngoài",
                            active:
                              detail.hasExternalResolutionRecords ?? false,
                            activeClass:
                              "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/60 dark:bg-violet-950/30 dark:text-violet-300",
                          },
                        ]
                      : [];
                    const closureNotes = [
                      detail?.externalNote ?? closure.externalNote ?? null,
                      detail?.driftNote ?? null,
                      detail?.failureReason ?? null,
                      detail?.forceReason ?? null,
                      detail?.cancellationReason ??
                        closure.cancellationReason ??
                        null,
                    ].filter(
                      (note): note is string =>
                        typeof note === "string" && note.trim().length > 0,
                    );
                    return (
                      <React.Fragment key={closure.id}>
                        <tr
                          className={cn(
                            "border-b border-border/30 cursor-pointer transition-colors select-none",
                            isExpanded ? "bg-muted/40" : "hover:bg-muted/30",
                          )}
                          onClick={() =>
                            setExpandedId(isExpanded ? null : closure.id)
                          }
                        >
                          <td className="p-3 text-sm font-medium tracking-tighter text-foreground/80">
                            #{closure.id}
                          </td>
                          <td className="p-3">
                            <span className="text-sm font-medium tracking-tighter text-foreground line-clamp-1">
                              {closure.closeReason || "—"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm tracking-tighter">
                              {getClosureResolutionLabel(
                                closure.resolutionType,
                              )}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm tracking-tighter">
                              {closure.initiatedByFullName || "—"}
                            </span>
                          </td>
                          <td className="p-3 text-sm tracking-tighter">
                            {formatDateTimeValue(closure.initiatedAt)}
                          </td>
                          <td className="p-3">
                            <Badge
                              className={cn(
                                "font-medium tracking-tighter",
                                CLOSURE_STATUS_CLASS[closure.status] ??
                                  "bg-muted text-muted-foreground",
                              )}
                            >
                              {CLOSURE_STATUS_LABEL[closure.status] ??
                                closure.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end">
                              <CaretDown
                                size={15}
                                className={cn(
                                  "transition-transform duration-200 text-muted-foreground",
                                  isExpanded && "rotate-180 text-orange-500",
                                )}
                              />
                            </div>
                          </td>
                        </tr>
                        <tr
                          aria-hidden={!isExpanded}
                          className={cn(
                            "transition-[background-color] duration-300",
                            isExpanded ? "bg-muted/10" : "bg-transparent",
                          )}
                        >
                          <td colSpan={7} className="p-0 border-0">
                            <div
                              className={cn(
                                "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                                isExpanded
                                  ? "grid-rows-[1fr] opacity-100"
                                  : "grid-rows-[0fr] opacity-0",
                              )}
                            >
                              <div className="overflow-hidden">
                                <div
                                  className={cn(
                                    "bg-muted/20 border-t border-border/40 px-5 py-4 space-y-4 origin-top transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                                    isExpanded
                                      ? "translate-y-0 scale-y-100"
                                      : "-translate-y-2 scale-y-95 pointer-events-none",
                                  )}
                                >
                                  {isFetchingExpandedDetail && !detail ? (
                                    <div className="space-y-3">
                                      <Skeleton className="h-24 w-full rounded-xl" />
                                      <Skeleton className="h-40 w-full rounded-xl" />
                                    </div>
                                  ) : (
                                    <>
                                      {/* Meta info */}
                                      <div
                                        className={cn(
                                          "grid gap-3",
                                          detail
                                            ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
                                            : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
                                        )}
                                      >
                                        {closureMetrics.map((item) => (
                                          <div
                                            key={item.label}
                                            className="rounded-xl border border-dashed border-border/60 bg-background px-3.5 py-3"
                                          >
                                            <p className="text-[13px] font-medium tracking-tighter text-foreground/80">
                                              {item.label}
                                            </p>
                                            <p className="text-base font-semibold tracking-tighter mt-0.5 text-foreground">
                                              {item.value}
                                            </p>
                                            <p className="mt-1 text-xs tracking-tighter text-muted-foreground">
                                              {item.hint}
                                            </p>
                                          </div>
                                        ))}
                                      </div>

                                      {detail && closureSignals.length > 0 && (
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
                                          {closureSignals.map((signal) => (
                                            <div
                                              key={signal.label}
                                              className={cn(
                                                "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium tracking-tighter",
                                                signal.active
                                                  ? signal.activeClass
                                                  : "border-border/60 bg-background text-muted-foreground",
                                              )}
                                            >
                                              {signal.active ? (
                                                <CheckFat
                                                  size={12}
                                                  weight="fill"
                                                  className="shrink-0"
                                                />
                                              ) : (
                                                <XCircle
                                                  size={12}
                                                  weight="fill"
                                                  className="shrink-0"
                                                />
                                              )}
                                              <span>{signal.label}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Notes */}
                                      {closureNotes.length > 0 && (
                                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                          {(detail?.externalNote ??
                                            closure.externalNote) && (
                                            <div className="flex w-full items-center gap-2 rounded-lg border border-dashed border-blue-200/70 bg-blue-50 px-3 py-2 tracking-tighter text-blue-700/90 dark:border-blue-800/40 dark:bg-background dark:text-blue-300/90">
                                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                              <span className="min-w-0 flex-1 font-medium text-[13px]">
                                                Ghi chú xử lý ngoài:{" "}
                                                <strong className="text-foreground font-medium text-[13px]">
                                                  {detail?.externalNote ??
                                                    closure.externalNote}
                                                </strong>
                                              </span>
                                            </div>
                                          )}
                                          {detail?.driftNote && (
                                            <div className="flex w-full items-center gap-2 rounded-lg border border-dashed border-amber-200/70 bg-amber-50 px-3 py-2 tracking-tighter text-amber-700/90 dark:border-amber-800/40 dark:bg-background dark:text-amber-300/90">
                                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                              <span className="min-w-0 flex-1 font-medium text-[13px]">
                                                Ghi chú chênh lệch:{" "}
                                                <strong className="text-foreground font-medium text-[13px]">
                                                  {detail.driftNote}
                                                </strong>
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {detail?.remainingInventoryItems &&
                                        detail.remainingInventoryItems.length >
                                          0 && (
                                          <div>
                                            <p className="mb-2 text-xs font-semibold tracking-tighter text-muted-foreground uppercase">
                                              Tồn kho còn lại (
                                              {
                                                detail.remainingInventoryItems
                                                  .length
                                              }
                                              )
                                            </p>
                                            <div className="max-h-96 overflow-y-auto rounded-xl border border-border/40">
                                              <table className="w-full">
                                                <thead>
                                                  <tr className="sticky top-0 z-10 border-b border-border/40 bg-muted/95 backdrop-blur-sm">
                                                    <th className="text-left px-3 py-2 text-sm font-semibold tracking-tighter text-foreground">
                                                      Vật phẩm
                                                    </th>
                                                    <th className="text-left px-3 py-2 text-sm font-semibold tracking-tighter text-foreground">
                                                      Loại
                                                    </th>
                                                    <th className="text-right px-3 py-2 text-sm font-semibold tracking-tighter text-foreground">
                                                      Tổng
                                                    </th>
                                                    <th className="text-right px-3 py-2 text-sm font-semibold tracking-tighter text-foreground">
                                                      Chuyển được
                                                    </th>
                                                    <th className="text-right px-3 py-2 text-sm font-semibold tracking-tighter text-foreground">
                                                      Bị khóa
                                                    </th>
                                                    <th className="text-right px-3 py-2 text-sm font-semibold tracking-tighter text-foreground">
                                                      Còn sau chuyển
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {detail.remainingInventoryItems.map(
                                                    (item) => (
                                                      <tr
                                                        key={`history-remaining-${closure.id}-${item.itemModelId}-${item.itemType}`}
                                                        className="border-b border-border/20 last:border-0"
                                                      >
                                                        <td className="px-3 py-2">
                                                          <p className="text-sm font-medium tracking-tighter text-foreground">
                                                            {item.itemName}
                                                          </p>
                                                          <p className="text-xs tracking-tighter text-muted-foreground">
                                                            {item.categoryName ||
                                                              "—"}
                                                          </p>
                                                        </td>
                                                        <td className="px-3 py-2 text-sm tracking-tighter text-foreground">
                                                          {getInventoryItemTypeLabel(
                                                            item.itemType,
                                                            itemTypeValueMap,
                                                          )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-sm tracking-tighter text-foreground">
                                                          {(
                                                            item.quantity ?? 0
                                                          ).toLocaleString(
                                                            "vi-VN",
                                                          )}{" "}
                                                          {item.unit || ""}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-sm tracking-tighter text-emerald-600 dark:text-emerald-400">
                                                          {(
                                                            item.transferableQuantity ??
                                                            0
                                                          ).toLocaleString(
                                                            "vi-VN",
                                                          )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-sm tracking-tighter text-red-700 dark:text-red-400">
                                                          {(
                                                            item.blockedQuantity ??
                                                            0
                                                          ).toLocaleString(
                                                            "vi-VN",
                                                          )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-sm tracking-tighter text-muted-foreground">
                                                          {(
                                                            item.remainingTransferableQuantity ??
                                                            item.currentQuantity ??
                                                            0
                                                          ).toLocaleString(
                                                            "vi-VN",
                                                          )}
                                                        </td>
                                                      </tr>
                                                    ),
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        )}

                                      {/* Transfers sub-table */}
                                      {(transferRecords.length > 0 ||
                                        allTransfers.length > 0) && (
                                        <div>
                                          <p className="text-base font-semibold tracking-tighter text-muted-foreground mb-2 uppercase">
                                            Các đợt điều chuyển (
                                            {transferRecords.length ||
                                              allTransfers.length}
                                            )
                                          </p>
                                          <div className="space-y-3">
                                            {transferRecords.length > 0 ? (
                                              transferRecords.map(
                                                (t, index) => (
                                                  <ClosureTransferRecordCard
                                                    key={t.id}
                                                    depotId={depotId}
                                                    closureId={closure.id}
                                                    transfer={t}
                                                    index={index}
                                                    itemTypeValueMap={
                                                      itemTypeValueMap
                                                    }
                                                    transferStatusValueMap={
                                                      transferStatusValueMap
                                                    }
                                                  />
                                                ),
                                              )
                                            ) : (
                                              <div className="rounded-xl border border-border/40 overflow-hidden">
                                                <table className="w-full">
                                                  <thead>
                                                    <tr className="border-b border-border/40 bg-muted/30">
                                                      <th className="text-left px-3 py-2 text-xs font-semibold tracking-tighter text-foreground">
                                                        #Transfer
                                                      </th>
                                                      <th className="text-left px-3 py-2 text-xs font-semibold tracking-tighter text-foreground">
                                                        Kho nhận
                                                      </th>
                                                      <th className="text-left px-3 py-2 text-xs font-semibold tracking-tighter text-foreground">
                                                        Trạng thái
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {allTransfers.map((t) => (
                                                      <tr
                                                        key={t.transferId}
                                                        className="border-b border-border/20 last:border-0"
                                                      >
                                                        <td className="px-3 py-2 text-sm tracking-tighter text-muted-foreground">
                                                          #{t.transferId}
                                                        </td>
                                                        <td className="px-3 py-2 text-sm tracking-tighter text-foreground">
                                                          {t.targetDepotName ||
                                                            `Kho #${t.targetDepotId}`}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                          <Badge
                                                            className={cn(
                                                              "text-xs font-medium tracking-tighter",
                                                              getDepotClosureTransferStatusToneClass(
                                                                t.status,
                                                              ),
                                                            )}
                                                          >
                                                            {getDepotClosureTransferStatusLabel(
                                                              t.status,
                                                              transferStatusValueMap,
                                                            )}
                                                          </Badge>
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {detail?.externalItems &&
                                        detail.externalItems.length > 0 && (
                                          <div>
                                            <p className="text-base font-semibold tracking-tighter text-muted-foreground mb-2 uppercase">
                                              Xử lý bên ngoài (
                                              {detail.externalItems.length})
                                            </p>
                                            <div className="max-h-96 overflow-y-auto rounded-xl border border-border/40">
                                              <table className="w-full">
                                                <thead>
                                                  <tr className="sticky top-0 z-10 border-b border-border/40 bg-muted/95 backdrop-blur-sm">
                                                    <th className="text-left px-3 py-2 text-xs font-semibold tracking-tighter text-foreground">
                                                      Vật phẩm
                                                    </th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold tracking-tighter text-foreground">
                                                      Xử lý / người nhận
                                                    </th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold tracking-tighter text-foreground">
                                                      Thời gian xử lý
                                                    </th>
                                                    <th className="text-right px-3 py-2 text-xs font-semibold tracking-tighter text-foreground">
                                                      Số lượng / tiền
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {detail.externalItems.map(
                                                    (item) => (
                                                      <tr
                                                        key={`history-external-${closure.id}-${item.id}`}
                                                        className="border-b border-border/20 last:border-0"
                                                      >
                                                        <td className="px-3 py-2">
                                                          <p className="text-sm font-medium tracking-tighter text-foreground">
                                                            {item.itemName}
                                                          </p>
                                                          <p className="text-xs tracking-tighter text-muted-foreground">
                                                            {item.categoryName ||
                                                              "—"}
                                                          </p>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                          <p className="text-sm tracking-tighter text-foreground">
                                                            {item.handlingMethodDisplay ||
                                                              item.handlingMethod}
                                                          </p>
                                                          <p className="text-xs tracking-tighter text-muted-foreground">
                                                            {item.recipient ||
                                                              "—"}
                                                          </p>
                                                          {item.note && (
                                                            <p className="mt-1 text-xs tracking-tighter text-muted-foreground">
                                                              {item.note}
                                                            </p>
                                                          )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                          <p className="text-sm tracking-tighter text-foreground">
                                                            {formatDateTimeValue(
                                                              item.processedAt,
                                                            )}
                                                          </p>
                                                          {/* <p className="text-xs tracking-tighter text-muted-foreground">
                                                            {item.processedByFullName ||
                                                              item.processedBy ||
                                                              "—"}
                                                          </p> */}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                          <p className="text-sm tracking-tighter text-foreground">
                                                            {item.quantity.toLocaleString(
                                                              "vi-VN",
                                                            )}{" "}
                                                            {item.unit}
                                                          </p>
                                                          <p className="text-xs tracking-tighter text-muted-foreground">
                                                            {item.totalPrice.toLocaleString(
                                                              "vi-VN",
                                                            )}
                                                          </p>
                                                        </td>
                                                      </tr>
                                                    ),
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function DepotDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const depotId = Number(rawId);
  const router = useRouter();

  /* ── Data ── */
  const { data: depot, isLoading, refetch } = useDepotById(depotId);
  /* requests only comes from the list endpoint, not GET /depot/{id} */
  const { data: allDepotsData, refetch: refetchAllDepots } = useDepots({
    params: { pageNumber: 1, pageSize: 200 },
  });
  const { data: depotOptions = [] } = useDepotMetadata();
  const { data: closureResolutionMetadata = [] } =
    useDepotClosureResolutionMetadata();
  const { data: statusMetadata } = useDepotStatuses();
  const { data: transferStatusMetadata = [] } =
    useDepotClosureTransferStatuses();
  const transferStatusValueMap = useMemo(
    () => buildDepotClosureTransferStatusValueMap(transferStatusMetadata),
    [transferStatusMetadata],
  );
  const transferSteps = useMemo(
    () => buildDepotClosureTransferStepItems(transferStatusMetadata),
    [transferStatusMetadata],
  );
  const transferStepOrder = useMemo(
    () => transferSteps.map((step) => step.key),
    [transferSteps],
  );
  const canUpdateOperationalStatus =
    depot?.status === "Available" || depot?.status === "Unavailable";
  const canInitiateClosure = canUpdateOperationalStatus;
  const canManageDepotManager =
    depot?.status !== "Closed" && depot?.status !== "Closing";
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [removeManagerDialogOpen, setRemoveManagerDialogOpen] = useState(false);
  const { data: availableManagers = [] } = useDepotAvailableManagers({
    depotId,
    enabled: managerDialogOpen && Number.isFinite(depotId) && depotId > 0,
  });
  const {
    data: activeManagers = [],
    isLoading: activeManagersLoading,
    refetch: refetchActiveManagers,
  } = useDepotActiveManagers(depotId, {
    enabled: removeManagerDialogOpen && Number.isFinite(depotId) && depotId > 0,
  });
  const [managerHistoryPage, setManagerHistoryPage] = useState(1);
  const [managerHistoryPageSize, setManagerHistoryPageSize] = useState(10);
  const { data: itemTypes = [] } = useInventoryItemTypes();
  const itemTypeValueMap = useMemo(
    () =>
      Object.fromEntries(
        itemTypes.map((itemType) => [String(itemType.key), itemType.value]),
      ),
    [itemTypes],
  );
  const {
    data: managerHistoryData,
    isLoading: managerHistoryLoading,
    refetch: refetchManagerHistory,
  } = useDepotManagers({
    params: {
      depotId,
      pageNumber: managerHistoryPage,
      pageSize: managerHistoryPageSize,
    },
    enabled: Number.isFinite(depotId) && depotId > 0,
  });
  const managerHistory = managerHistoryData?.items ?? [];
  const managerHistoryCurrentPage =
    managerHistoryData?.pageNumber ?? managerHistoryPage;
  const managerHistoryTotalPages = Math.max(
    managerHistoryData?.totalPages ?? 0,
    managerHistoryData?.totalCount
      ? Math.ceil(managerHistoryData.totalCount / managerHistoryPageSize)
      : 0,
  );
  const managerHistoryHasPrevious =
    (managerHistoryData?.hasPreviousPage ?? false) ||
    managerHistoryCurrentPage > 1;
  const managerHistoryHasNext =
    (managerHistoryData?.hasNextPage ?? false) ||
    (managerHistoryTotalPages > 0 &&
      managerHistoryCurrentPage < managerHistoryTotalPages);
  const statusCfg = buildStatusCfg(statusMetadata);
  const listDepot = allDepotsData?.items.find((d) => d.id === depotId);
  const requests = listDepot?.requests ?? depot?.requests ?? [];

  /* ── State ── */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [initiateStep, setInitiateStep] = useState<1 | 2>(1);
  const [initiateReason, setInitiateReason] = useState("");
  const [confirmCloseDialogOpen, setConfirmCloseDialogOpen] = useState(false);
  const [confirmCloseReason, setConfirmCloseReason] = useState("");
  const [initiateResult, setInitiateResult] = useState<{
    closureId: number;
    closureStatus: string;
    closingTimeoutAt: string | null;
    timeoutAt: string | null;
    inventorySummary: {
      consumableItemTypeCount: number;
      consumableUnitTotal: number;
      reusableAvailableCount: number;
      reusableInUseCount: number;
    } | null;
    remainingInventoryItems: DepotClosureRemainingInventoryItem[];
  } | null>(null);

  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolutionType, setResolutionType] = useState<
    "TransferToDepot" | "ExternalResolution"
  >("TransferToDepot");
  const [transferAssignments, setTransferAssignments] = useState<
    TransferAssignmentDraft[]
  >([]);
  const [activeTransferAssignmentId, setActiveTransferAssignmentId] =
    useState("");
  const [transferItemSearch, setTransferItemSearch] = useState("");
  const [showOnlyRelevantTransferItems, setShowOnlyRelevantTransferItems] =
    useState(true);
  const [isTransferDialogExpanded, setIsTransferDialogExpanded] =
    useState(false);
  const [hasAppliedTransferSuggestions, setHasAppliedTransferSuggestions] =
    useState(false);
  const [externalNote, setExternalNote] = useState("");
  const [assignSelectionId, setAssignSelectionId] = useState("");
  const [selectedAssignManagerIds, setSelectedAssignManagerIds] = useState<
    string[]
  >([]);
  const [unassignSelectionId, setUnassignSelectionId] = useState("");
  const [selectedUnassignManagerIds, setSelectedUnassignManagerIds] = useState<
    string[]
  >([]);
  const [isSwitchingManager, setIsSwitchingManager] = useState(false);
  const initiateMutation = useInitiateDepotClosure();
  const markExternalMutation = useMarkDepotClosureExternal();
  const initiateTransferMutation = useInitiateDepotClosureTransfer();
  const cancelTransferMutation = useCancelDepotClosureTransfer();
  const updateStatusMutation = useUpdateDepotStatus();
  const initiateClosingMutation = useInitiateDepotClosing();
  const assignManagerMutation = useAssignDepotManager();
  const unassignManagerMutation = useUnassignDepotManager();
  const { data: activeClosureSummary, refetch: refetchActiveClosureSummary } =
    useDepotClosureByDepotId(depotId, {
      enabled: Number.isFinite(depotId) && depotId > 0,
    });
  const activeClosureId =
    activeClosureSummary?.id ?? initiateResult?.closureId ?? null;
  const { data: activeClosureDetail, refetch: refetchActiveClosureDetail } =
    useDepotClosureDetailByDepotId(depotId, activeClosureId ?? 0, {
      enabled: Number.isFinite(depotId) && depotId > 0 && !!activeClosureId,
    });

  const activeClosure = activeClosureDetail ?? activeClosureSummary ?? null;
  const hasRenderableActiveClosure = Boolean(
    activeClosure &&
    typeof activeClosure.id === "number" &&
    activeClosure.id > 0,
  );
  const activeClosureStatus = activeClosure?.status ?? null;
  const _rawActiveTransfer = activeClosure?.transferDetail ?? null;
  // Treat terminal-status transfers (Received / Cancelled) as "no active transfer"
  // so the next-batch and resolve buttons can appear after a batch completes.
  const activeTransfer =
    _rawActiveTransfer &&
    !DEPOT_CLOSURE_TRANSFER_TERMINAL_STATUSES.has(
      normalizeDepotClosureTransferStatus(_rawActiveTransfer.status),
    )
      ? _rawActiveTransfer
      : null;
  const activeTransferId = _rawActiveTransfer?.id ?? null;
  const selectedAssignManagers = useMemo(
    () =>
      selectedAssignManagerIds
        .map((id) => availableManagers.find((manager) => manager.id === id))
        .filter((manager): manager is NonNullable<typeof manager> => !!manager),
    [availableManagers, selectedAssignManagerIds],
  );
  const selectedUnassignManagers = useMemo(
    () =>
      selectedUnassignManagerIds
        .map((userId) =>
          activeManagers.find((manager) => manager.userId === userId),
        )
        .filter((manager): manager is NonNullable<typeof manager> => !!manager),
    [activeManagers, selectedUnassignManagerIds],
  );

  const closingTimeoutCountdown = useCountdown(null);

  const currentTransferStatus = normalizeDepotClosureTransferStatus(
    activeTransfer?.status,
  );
  const canSelectResolution =
    activeClosureDetail?.canSelectResolutionOption ?? false;
  const canConfirmClose = activeClosureDetail?.canConfirmClose ?? false;
  // Có lịch sử chuyển kho trước đó hay không (để phân biệt "lần đầu" vs "đợt tiếp theo")
  const hasPreviousTransferBatch = Boolean(
    (activeClosureDetail?.transferDetails?.length ?? 0) > 0 ||
    initiateResult?.closureId,
  );
  // Nút "Chọn phương án" — chỉ hiện khi CHƯA có đợt nào trước đó
  const shouldShowResolveButton = Boolean(
    depot?.status === "Closing" &&
    hasRenderableActiveClosure &&
    !activeTransfer &&
    canSelectResolution &&
    !hasPreviousTransferBatch,
  );
  // Nút "Đợt tiếp theo" — hiện khi đã có ít nhất 1 đợt và còn hàng cần xử lý
  const shouldShowNextBatchButton = Boolean(
    depot?.status === "Closing" &&
    hasRenderableActiveClosure &&
    !activeTransfer &&
    canSelectResolution &&
    hasPreviousTransferBatch,
  );
  const shouldShowConfirmCloseButton = Boolean(
    depot?.status === "Closing" && canConfirmClose,
  );
  const resolutionTypes =
    closureResolutionMetadata.length > 0
      ? closureResolutionMetadata
      : [
          {
            key: "TransferToDepot",
            value: "Điều phối hàng tồn sang kho khác",
          },
          {
            key: "ExternalResolution",
            value: "Tự xử lý bên ngoài (quản trị viên ghi chú cách xử lý)",
          },
        ];
  const resolveActionPending =
    markExternalMutation.isPending || initiateTransferMutation.isPending;

  const closureInventoryItems = useMemo(
    () =>
      normalizeClosureInventoryItems(
        // Prefer fresh data from the active closure detail over potentially stale
        // initiateResult (which may have items from a previous batch with
        // transferableQuantity already at 0 after being processed).
        activeClosure?.remainingInventoryItems ??
          initiateResult?.remainingInventoryItems ??
          [],
      ),
    [
      activeClosure?.remainingInventoryItems,
      initiateResult?.remainingInventoryItems,
    ],
  );
  const closureInventoryMap = useMemo(
    () => new Map(closureInventoryItems.map((item) => [item.itemKey, item])),
    [closureInventoryItems],
  );
  const currentDepotName = useMemo(
    () => normalizeDepotName(depot?.name ?? ""),
    [depot?.name],
  );
  const isCurrentDepotChoice = useCallback(
    (option: { key: number; value: string }) =>
      option.key === (depot?.id ?? depotId) ||
      normalizeDepotName(option.value) === currentDepotName,
    [currentDepotName, depot?.id, depotId],
  );
  const targetDepotChoices = useMemo(
    () => depotOptions.filter((option) => !isCurrentDepotChoice(option)),
    [depotOptions, isCurrentDepotChoice],
  );

  const shouldLoadTransferSuggestions =
    Number.isFinite(depotId) &&
    depotId > 0 &&
    resolutionType === "TransferToDepot" &&
    closureInventoryItems.length > 0 &&
    ((initiateOpen && initiateStep === 2) || resolveOpen);

  const {
    data: transferSuggestions,
    isFetching: transferSuggestionsFetching,
    error: transferSuggestionsError,
    refetch: refetchTransferSuggestions,
  } = useDepotClosureTransferSuggestions(depotId, {
    enabled: shouldLoadTransferSuggestions,
  });

  const mergedTargetDepotChoices = useMemo(() => {
    const map = new Map<number, { key: number; value: string }>();

    for (const option of targetDepotChoices) {
      map.set(option.key, option);
    }

    for (const metric of transferSuggestions?.targetDepotMetrics ?? []) {
      if (
        Number.isFinite(metric.depotId) &&
        metric.depotId > 0 &&
        metric.depotId !== (depot?.id ?? depotId) &&
        !map.has(metric.depotId)
      ) {
        map.set(metric.depotId, {
          key: metric.depotId,
          value: metric.depotName,
        });
      }
    }

    for (const suggestion of transferSuggestions?.suggestedTransfers ?? []) {
      if (
        suggestion.targetDepotId != null &&
        Number.isFinite(suggestion.targetDepotId) &&
        suggestion.targetDepotId > 0 &&
        suggestion.targetDepotName &&
        suggestion.targetDepotId !== (depot?.id ?? depotId) &&
        !map.has(suggestion.targetDepotId)
      ) {
        map.set(suggestion.targetDepotId, {
          key: suggestion.targetDepotId,
          value: suggestion.targetDepotName,
        });
      }
    }

    return Array.from(map.values())
      .filter((option) => !isCurrentDepotChoice(option))
      .sort((a, b) => a.value.localeCompare(b.value, "vi"));
  }, [
    depot?.id,
    depotId,
    isCurrentDepotChoice,
    targetDepotChoices,
    transferSuggestions,
  ]);
  const mergedTargetDepotChoiceMap = useMemo(
    () =>
      new Map(
        mergedTargetDepotChoices.map((option) => [
          String(option.key),
          option.value,
        ]),
      ),
    [mergedTargetDepotChoices],
  );
  const transferTargetMetricMap = useMemo(
    () =>
      new Map(
        (transferSuggestions?.targetDepotMetrics ?? [])
          .filter(
            (metric) => Number.isFinite(metric.depotId) && metric.depotId > 0,
          )
          .map((metric) => [String(metric.depotId), metric]),
      ),
    [transferSuggestions?.targetDepotMetrics],
  );
  const transferAssignmentLoadMap = useMemo(() => {
    const map = new Map<string, TransferCapacityLoad>();

    for (const assignment of transferAssignments) {
      const load = createEmptyTransferCapacityLoad();

      for (const item of assignment.items) {
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) continue;

        const selectedItem = closureInventoryMap.get(item.itemKey);
        if (!selectedItem || !isConsumableItemType(selectedItem.itemType)) {
          continue;
        }

        load.consumableUnits += quantity;
        load.consumableLineCount += 1;
        if (selectedItem.volumePerUnit != null) {
          load.requiredVolume += selectedItem.volumePerUnit * quantity;
        }
        if (selectedItem.weightPerUnit != null) {
          load.requiredWeight += selectedItem.weightPerUnit * quantity;
        }
      }

      map.set(assignment.id, load);
    }

    return map;
  }, [closureInventoryMap, transferAssignments]);
  const getTransferCapacityStatusForTarget = useCallback(
    (
      targetDepotId: number | string | null | undefined,
      load: TransferCapacityLoad,
    ): TransferCapacityStatus => {
      const numericTargetDepotId = Number(targetDepotId);
      const normalizedTargetDepotId =
        Number.isFinite(numericTargetDepotId) && numericTargetDepotId > 0
          ? numericTargetDepotId
          : null;
      const metric =
        normalizedTargetDepotId == null
          ? null
          : (transferTargetMetricMap.get(String(normalizedTargetDepotId)) ??
            null);
      const targetDepotName =
        normalizedTargetDepotId == null
          ? null
          : (mergedTargetDepotChoiceMap.get(String(normalizedTargetDepotId)) ??
            metric?.depotName ??
            null);

      return buildTransferCapacityStatus({
        load,
        targetDepotId: normalizedTargetDepotId,
        targetDepotName,
        metric,
      });
    },
    [mergedTargetDepotChoiceMap, transferTargetMetricMap],
  );
  const transferAssignmentCapacityMap = useMemo(() => {
    const map = new Map<string, TransferCapacityStatus>();

    for (const assignment of transferAssignments) {
      map.set(
        assignment.id,
        getTransferCapacityStatusForTarget(
          assignment.targetDepotId,
          transferAssignmentLoadMap.get(assignment.id) ??
            createEmptyTransferCapacityLoad(),
        ),
      );
    }

    return map;
  }, [
    getTransferCapacityStatusForTarget,
    transferAssignmentLoadMap,
    transferAssignments,
  ]);

  const resetTransferAssignments = useCallback(
    (inventoryItems: ClosureInventoryOption[] = closureInventoryItems) => {
      setHasAppliedTransferSuggestions(false);
      setTransferItemSearch("");
      setShowOnlyRelevantTransferItems(true);
      setTransferAssignments([createTransferAssignmentDraft(inventoryItems)]);
    },
    [closureInventoryItems],
  );

  const applyTransferSuggestionsToAssignments = useCallback(
    (
      suggestions:
        | DepotClosureSuggestedTransfer[]
        | null
        | undefined = transferSuggestions?.suggestedTransfers,
    ) => {
      setTransferAssignments(
        createTransferAssignmentsFromSuggestions(
          closureInventoryItems,
          suggestions,
        ),
      );
      setHasAppliedTransferSuggestions(true);
    },
    [closureInventoryItems, transferSuggestions?.suggestedTransfers],
  );

  const addTransferAssignment = useCallback(() => {
    const created = createTransferAssignmentDraft(closureInventoryItems);
    setTransferAssignments((current) => [...current, created]);
    setActiveTransferAssignmentId(created.id);
  }, [closureInventoryItems]);

  const removeTransferAssignment = useCallback((assignmentId: string) => {
    setTransferAssignments((current) => {
      if (current.length === 1) return current;
      return current.filter((assignment) => assignment.id !== assignmentId);
    });
  }, []);

  const updateTransferAssignmentTarget = useCallback(
    (assignmentId: string, targetDepotId: string) => {
      setTransferAssignments((current) =>
        current.map((assignment) =>
          assignment.id === assignmentId
            ? { ...assignment, targetDepotId }
            : assignment,
        ),
      );
    },
    [],
  );

  const getAssignedQuantityExcludingRow = useCallback(
    (itemKey: string, excludedAssignmentId?: string): number =>
      transferAssignments.reduce((total, assignment) => {
        return (
          total +
          assignment.items.reduce((itemSum, item) => {
            if (!item.itemKey || item.itemKey !== itemKey) return itemSum;
            if (
              excludedAssignmentId &&
              assignment.id === excludedAssignmentId
            ) {
              return itemSum;
            }
            const quantity = Number(item.quantity);
            return itemSum + (Number.isFinite(quantity) ? quantity : 0);
          }, 0)
        );
      }, 0),
    [transferAssignments],
  );

  const updateTransferAssignmentQuantity = useCallback(
    (assignmentId: string, itemKey: string, rawValue: string) => {
      const digitsOnly = rawValue.replace(/\D/g, "");

      setTransferAssignments((current) => {
        const selectedItem = closureInventoryMap.get(itemKey);
        const transferableQuantity = selectedItem?.transferableQuantity ?? 0;
        const usedByOtherAssignments = current.reduce((sum, assignment) => {
          if (assignment.id === assignmentId) return sum;
          const matchedItem = assignment.items.find(
            (item) => item.itemKey === itemKey,
          );
          const quantity = Number(matchedItem?.quantity ?? "");
          return sum + (Number.isFinite(quantity) ? quantity : 0);
        }, 0);
        const maxAllowed = Math.max(
          transferableQuantity - usedByOtherAssignments,
          0,
        );

        const normalizedValue = digitsOnly
          ? String(Math.min(Number(digitsOnly), maxAllowed))
          : "";

        return current.map((assignment) =>
          assignment.id === assignmentId
            ? {
                ...assignment,
                items: assignment.items.map((item) =>
                  item.itemKey === itemKey
                    ? { ...item, quantity: normalizedValue }
                    : item,
                ),
              }
            : assignment,
        );
      });
    },
    [closureInventoryMap],
  );

  useEffect(() => {
    if (!closureInventoryItems.length) return;

    setTransferAssignments((current) => {
      if (!current.length) {
        return [createTransferAssignmentDraft(closureInventoryItems)];
      }

      return current.map((assignment) => ({
        ...assignment,
        items: createTransferAssignmentItemsFromInventory(
          closureInventoryItems,
          assignment.items,
        ),
      }));
    });
  }, [closureInventoryItems]);

  useEffect(() => {
    if (!transferAssignments.length) {
      setActiveTransferAssignmentId("");
      return;
    }

    setActiveTransferAssignmentId((current) =>
      current &&
      transferAssignments.some((assignment) => assignment.id === current)
        ? current
        : (transferAssignments[0]?.id ?? ""),
    );
  }, [transferAssignments]);

  useEffect(() => {
    const isTransferWorkflowOpen =
      (initiateOpen && initiateStep === 2) || resolveOpen;

    if (!isTransferWorkflowOpen) {
      setHasAppliedTransferSuggestions(false);
      return;
    }

    if (
      !shouldLoadTransferSuggestions ||
      !transferSuggestions ||
      hasAppliedTransferSuggestions
    ) {
      return;
    }

    applyTransferSuggestionsToAssignments(
      transferSuggestions.suggestedTransfers,
    );
  }, [
    applyTransferSuggestionsToAssignments,
    hasAppliedTransferSuggestions,
    initiateOpen,
    initiateStep,
    resolveOpen,
    shouldLoadTransferSuggestions,
    transferSuggestions,
  ]);

  const unallocatedSuggestedTransfers = useMemo(
    () =>
      transferSuggestions?.suggestedTransfers.filter(
        (item) => item.targetDepotId == null,
      ) ?? [],
    [transferSuggestions],
  );

  const hasUnallocatedSuggestion = Boolean(
    (transferSuggestions?.unallocatedVolume ?? 0) > 0 ||
    (transferSuggestions?.unallocatedWeight ?? 0) > 0 ||
    unallocatedSuggestedTransfers.length > 0,
  );

  const buildTransferAssignmentsPayload = useCallback(() => {
    if (!closureInventoryItems.length) {
      toast.error("Chưa có danh sách vật phẩm tồn để phân bổ chuyển kho.");
      return null;
    }

    const usedQuantityByItemKey = new Map<string, number>();
    const assignmentsByTargetDepotId = new Map<
      number,
      {
        targetDepotId: number;
        items: Array<{
          itemModelId: number;
          itemType: string;
          quantity: number;
        }>;
        load: TransferCapacityLoad;
      }
    >();

    for (const assignment of transferAssignments) {
      const nonEmptyItems = assignment.items.filter((item) =>
        item.quantity.trim(),
      );
      const hasAnyData = assignment.targetDepotId || nonEmptyItems.length > 0;
      if (!hasAnyData) continue;

      const targetDepotId = Number(assignment.targetDepotId);
      if (!Number.isFinite(targetDepotId) || targetDepotId <= 0) {
        toast.error(
          "Mỗi kho đích cần được chọn trước khi xác nhận chuyển kho.",
        );
        return null;
      }

      if (targetDepotId === depotId) {
        toast.error("Kho đích không thể trùng với kho đang đóng.");
        return null;
      }

      if (nonEmptyItems.length === 0) {
        toast.error("Mỗi kho đích cần có ít nhất một vật phẩm để chuyển.");
        return null;
      }

      const targetAssignment =
        assignmentsByTargetDepotId.get(targetDepotId) ??
        (() => {
          const created = {
            targetDepotId,
            items: [] as Array<{
              itemModelId: number;
              itemType: string;
              quantity: number;
            }>,
            load: createEmptyTransferCapacityLoad(),
          };
          assignmentsByTargetDepotId.set(targetDepotId, created);
          return created;
        })();

      for (const item of nonEmptyItems) {
        const selectedItem = closureInventoryMap.get(item.itemKey);
        if (!selectedItem) {
          toast.error(
            "Có vật phẩm chưa được chọn đúng trong danh sách chuyển kho.",
          );
          return null;
        }

        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          toast.error("Số lượng chuyển phải lớn hơn 0.");
          return null;
        }

        const nextUsed =
          (usedQuantityByItemKey.get(item.itemKey) ?? 0) + quantity;
        if (nextUsed > selectedItem.quantity) {
          toast.error(
            `Số lượng "${selectedItem.itemName}" đang vượt tồn còn lại của kho.`,
          );
          return null;
        }
        usedQuantityByItemKey.set(item.itemKey, nextUsed);

        const existingTargetItem = targetAssignment.items.find(
          (entry) =>
            entry.itemModelId === selectedItem.itemModelId &&
            entry.itemType === selectedItem.itemType,
        );
        if (existingTargetItem) {
          existingTargetItem.quantity += quantity;
        } else {
          targetAssignment.items.push({
            itemModelId: selectedItem.itemModelId,
            itemType: selectedItem.itemType,
            quantity,
          });
        }

        if (isConsumableItemType(selectedItem.itemType)) {
          targetAssignment.load.consumableUnits += quantity;
          targetAssignment.load.consumableLineCount += 1;
          if (selectedItem.volumePerUnit != null) {
            targetAssignment.load.requiredVolume +=
              selectedItem.volumePerUnit * quantity;
          }
          if (selectedItem.weightPerUnit != null) {
            targetAssignment.load.requiredWeight +=
              selectedItem.weightPerUnit * quantity;
          }
        }
      }
    }

    const payload = Array.from(assignmentsByTargetDepotId.values()).filter(
      (assignment) => assignment.items.length > 0,
    );

    if (!payload.length) {
      toast.error("Hãy chọn ít nhất một kho đích và một vật phẩm để chuyển.");
      return null;
    }

    for (const assignment of payload) {
      const capacityStatus = getTransferCapacityStatusForTarget(
        assignment.targetDepotId,
        assignment.load,
      );
      if (!capacityStatus.fitsBoth) {
        toast.error(getTransferCapacityValidationMessage(capacityStatus));
        return null;
      }
    }

    return payload.map(({ targetDepotId, items }) => ({
      targetDepotId,
      items,
    }));
  }, [
    closureInventoryItems.length,
    closureInventoryMap,
    depotId,
    getTransferCapacityStatusForTarget,
    transferAssignments,
  ]);

  const renderTransferAssignmentsEditor = useCallback(
    (context: "dialog" | "inline") => {
      const wrapperClassName =
        context === "dialog" ? "min-w-0 space-y-4" : "min-w-0 space-y-3";
      const sourceGridCols =
        context === "dialog"
          ? "grid-cols-[minmax(0,1fr)_120px_140px] xl:grid-cols-[minmax(0,1fr)_130px_150px] 2xl:grid-cols-[minmax(0,1fr)_140px_160px]"
          : "grid-cols-[minmax(0,1fr)_110px_130px] xl:grid-cols-[minmax(0,1fr)_120px_140px]";

      return (
        <div className={wrapperClassName}>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3.5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tighter">
                  Phân bổ vật phẩm sang nhiều kho đích
                </p>
                <p className="text-xs text-muted-foreground tracking-tighter mt-0.5">
                  Chọn một hoặc nhiều kho nhận, rồi phân chia vật phẩm tồn theo
                  từng kho.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {transferSuggestionsFetching ? (
                  <Badge variant="outline" className="gap-1.5 tracking-tighter">
                    <Spinner size={12} className="animate-spin" />
                    Đang lấy gợi ý
                  </Badge>
                ) : (
                  <>
                    <Badge variant="outline" className="tracking-tighter">
                      {closureInventoryItems.length} vật phẩm nguồn
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 tracking-tighter"
                      disabled={!closureInventoryItems.length}
                      onClick={async () => {
                        const result = await refetchTransferSuggestions();
                        if (result.data) {
                          applyTransferSuggestionsToAssignments(
                            result.data.suggestedTransfers,
                          );
                          toast.success(
                            "Đã lấy lại gợi ý phân bổ từ hệ thống.",
                          );
                        } else {
                          toast.error(
                            "Chưa lấy được gợi ý, có thể phân bổ thủ công.",
                          );
                        }
                      }}
                    >
                      <ArrowClockwise size={13} />
                      Lấy gợi ý từ hệ thống
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {Boolean(transferSuggestions?.targetDepotMetrics.length) && (
            <div className="rounded-2xl border border-border/60 bg-background/90 p-3.5 space-y-3">
              {/* Block 1: Tổng quan */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tighter">
                    Gợi ý phân bổ tồn kho
                  </p>
                  {transferSuggestions?.recommendationStrategy && (
                    <p className="text-xs text-muted-foreground tracking-tighter mt-0.5 leading-5">
                      {transferSuggestions.recommendationStrategy}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {(transferSuggestions?.suggestedTargetDepotCount ?? 0) >
                    0 && (
                    <Badge variant="outline" className="tracking-tighter">
                      {transferSuggestions!.suggestedTargetDepotCount} kho được
                      đề xuất
                    </Badge>
                  )}
                  {(transferSuggestions?.unallocatedItemLineCount ?? 0) > 0 && (
                    <Badge className="tracking-tighter bg-red-500/10 text-red-700 dark:text-red-400 border-0">
                      {transferSuggestions!.unallocatedItemLineCount} dòng chưa
                      phân được
                    </Badge>
                  )}
                </div>
              </div>

              {/* Block 2: Danh sách kho được đề xuất (sort theo recommendationRank asc) */}
              <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                {[...(transferSuggestions?.targetDepotMetrics ?? [])]
                  .sort(
                    (a, b) =>
                      (a.recommendationRank ?? 999) -
                      (b.recommendationRank ?? 999),
                  )
                  .map((metric) => {
                    const rank = metric.recommendationRank ?? 99;
                    const isUnranked = rank <= 0;
                    const greyPalette = {
                      card: "border-border bg-muted/30 opacity-60",
                      badge: "bg-muted text-muted-foreground",
                    };
                    const rankPalettes = [
                      {
                        card: "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20",
                        badge:
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                      },
                      {
                        card: "border-sky-300 bg-sky-50/60 dark:bg-sky-950/20",
                        badge:
                          "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
                      },
                      {
                        card: "border-violet-300 bg-violet-50/60 dark:bg-violet-950/20",
                        badge:
                          "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
                      },
                      {
                        card: "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20",
                        badge:
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                      },
                      {
                        card: "border-rose-300 bg-rose-50/60 dark:bg-rose-950/20",
                        badge:
                          "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
                      },
                      {
                        card: "border-cyan-300 bg-cyan-50/60 dark:bg-cyan-950/20",
                        badge:
                          "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
                      },
                    ] as const;
                    const palette = isUnranked
                      ? greyPalette
                      : rankPalettes[
                          (((rank - 1) % rankPalettes.length) +
                            rankPalettes.length) %
                            rankPalettes.length
                        ];

                    return (
                      <div
                        key={metric.depotId}
                        className={cn(
                          "min-w-0 rounded-xl border px-3.5 py-3 transition-shadow hover:shadow-md space-y-2",
                          palette.card,
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-base font-semibold tracking-tighter">
                            {metric.depotName}
                          </p>
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              palette.badge,
                            )}
                          >
                            {isUnranked ? "—" : `#${rank}`}
                          </span>
                        </div>

                        {metric.distanceKm != null && (
                          <p className="text-xs tracking-tighter text-muted-foreground">
                            Cách {metric.distanceKm.toFixed(1)} km
                          </p>
                        )}

                        <div className="grid gap-2 grid-cols-2">
                          <div className="rounded-lg bg-background/70 border border-dashed px-2.5 py-1.5">
                            <p className="text-xs tracking-tighter text-muted-foreground">
                              Dự kiến nhận
                            </p>
                            <p className="mt-0.5 text-sm font-bold tracking-tighter">
                              <span className="font-normal text-[13px]">
                                Thể tích:{" "}
                              </span>
                              {metric.plannedVolume != null
                                ? formatDepotMetric(metric.plannedVolume, "dm3")
                                : "—"}
                            </p>
                            <p className="text-sm font-bold tracking-tighter">
                              <span className="font-normal text-[13px]">
                                Khối lượng:{" "}
                              </span>
                              {metric.plannedWeight != null
                                ? formatDepotMetric(metric.plannedWeight, "kg")
                                : ""}
                            </p>
                          </div>
                          <div className="rounded-lg bg-background/70 border border-dashed px-2.5 py-1.5">
                            <p className="text-xs tracking-tighter text-muted-foreground">
                              Còn sau khi nhận
                            </p>
                            <p className="mt-0.5 text-sm font-bold tracking-tighter">
                              <span className="font-normal text-[13px]">
                                Thể tích:{" "}
                              </span>
                              {metric.projectedRemainingVolume != null
                                ? formatDepotMetric(
                                    metric.projectedRemainingVolume,
                                    "dm3",
                                  )
                                : formatDepotMetric(
                                    metric.remainingVolume,
                                    "dm3",
                                  )}
                            </p>
                            <p className="text-sm font-bold tracking-tighter">
                              <span className="font-normal text-[13px]">
                                Khối lượng:{" "}
                              </span>
                              {metric.projectedRemainingWeight != null
                                ? formatDepotMetric(
                                    metric.projectedRemainingWeight,
                                    "kg",
                                  )
                                : formatDepotMetric(
                                    metric.remainingWeight,
                                    "kg",
                                  )}
                            </p>
                          </div>
                        </div>

                        {metric.recommendationReason && (
                          <p className="text-xs leading-4 tracking-tighter text-foreground/80">
                            {metric.recommendationReason}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {hasUnallocatedSuggestion && (
            <div className="rounded-2xl border border-red-300 bg-red-50/80 p-4 text-red-900">
              <div className="flex items-start gap-3">
                <WarningCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-red-600"
                  weight="fill"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-semibold tracking-tighter">
                        Hệ thống chưa đủ không gian để phân bổ hết hàng tồn kho
                      </p>
                      <p className="text-xs tracking-tighter leading-5 text-red-800/90">
                        Quản trị viên cần giảm số lượng, chỉnh lại đề xuất hoặc
                        chuyển sang phương án xử lý bên ngoài cho phần hàng chưa
                        có chỗ chứa phù hợp.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className="border-red-300 bg-white/70 tracking-tighter text-red-700"
                      >
                        Thể tích còn dư:{" "}
                        {formatDepotMetric(
                          transferSuggestions?.unallocatedVolume ?? 0,
                          "dm3",
                        )}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-red-300 bg-white/70 tracking-tighter text-red-700"
                      >
                        Khối lượng còn dư:{" "}
                        {formatDepotMetric(
                          transferSuggestions?.unallocatedWeight ?? 0,
                          "kg",
                        )}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-red-300 bg-white/70 tracking-tighter text-red-700"
                      >
                        {unallocatedSuggestedTransfers.length} vật phẩm chưa
                        phân bổ
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {transferSuggestionsError && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 text-sm tracking-tighter text-amber-800">
              Không lấy được gợi ý từ hệ thống, có thể phân bổ thủ công bằng
              form bên dưới.
            </div>
          )}

          {!closureInventoryItems.length ? (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-sm tracking-tighter text-amber-700">
              Hệ thống chưa trả danh sách vật phẩm tồn có thể điều phối, nên
              hiện chưa thể chia vật phẩm sang nhiều kho đích từ màn hình này.
            </div>
          ) : (
            <>
              {hasUnallocatedSuggestion &&
                unallocatedSuggestedTransfers.length > 0 && (
                  <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3.5">
                    <div className="mb-2">
                      <p className="text-base font-semibold tracking-tighter text-foreground">
                        Chưa phân bổ được
                      </p>
                      <p className="mt-0.5 text-sm tracking-tighter text-muted-foreground">
                        Các vật phẩm dưới đây đang được hệ thống đánh dấu là
                        chưa tìm thấy kho đích phù hợp.
                      </p>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border/50 bg-background">
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-muted/30">
                            <TableRow className="border-border/50 hover:bg-muted/30">
                              <TableHead className="p-3 text-sm font-semibold tracking-tighter text-foreground">
                                Vật phẩm
                              </TableHead>
                              <TableHead className="p-3 text-right text-sm font-semibold tracking-tighter text-foreground">
                                Số lượng đề xuất bị dư
                              </TableHead>
                              <TableHead className="p-3 text-right text-sm font-semibold tracking-tighter text-foreground">
                                Thể tích
                              </TableHead>
                              <TableHead className="p-3 text-right text-sm font-semibold tracking-tighter text-foreground">
                                Khối lượng
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unallocatedSuggestedTransfers.map(
                              (item, index) => (
                                <TableRow
                                  key={`unallocated-${item.itemModelId}-${item.itemType}-${index}`}
                                  className="border-border/30 hover:bg-muted/20"
                                >
                                  <TableCell className="p-3 align-top">
                                    <div className="min-w-0 space-y-1">
                                      <p className="min-w-55 text-sm font-semibold tracking-tighter text-foreground">
                                        {item.itemName}
                                      </p>
                                      {item.allocationMode ===
                                        "SplitByCapacity" && (
                                        <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium tracking-tight text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                          Bị tách
                                        </span>
                                      )}
                                      {(item.allocationMode == null ||
                                        item.allocationMode ===
                                          "Unallocated") && (
                                        <span className="inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-xs font-medium tracking-tight text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                          Chưa phân được
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell className="p-3 text-right align-top text-sm tracking-tighter text-foreground">
                                    {item.suggestedQuantity.toLocaleString(
                                      "vi-VN",
                                    )}
                                    {item.unit ? ` ${item.unit}` : ""}
                                  </TableCell>
                                  <TableCell className="p-3 text-right align-top text-sm tracking-tighter text-foreground">
                                    {formatDepotMetric(item.totalVolume, "dm3")}
                                  </TableCell>
                                  <TableCell className="p-3 text-right align-top text-sm tracking-tighter text-foreground">
                                    {formatDepotMetric(item.totalWeight, "kg")}
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}

              {(() => {
                const activeAssignment =
                  transferAssignments.find(
                    (assignment) =>
                      assignment.id === activeTransferAssignmentId,
                  ) ??
                  transferAssignments[0] ??
                  null;

                if (!activeAssignment) {
                  return null;
                }

                const activeAssignmentIndex = Math.max(
                  transferAssignments.findIndex(
                    (assignment) => assignment.id === activeAssignment.id,
                  ),
                  0,
                );
                const activeAccent =
                  TRANSFER_ASSIGNMENT_ACCENTS[
                    activeAssignmentIndex % TRANSFER_ASSIGNMENT_ACCENTS.length
                  ];
                const selectedTargetDepotIds = new Set(
                  transferAssignments
                    .filter(
                      (otherAssignment) =>
                        otherAssignment.id !== activeAssignment.id &&
                        otherAssignment.targetDepotId,
                    )
                    .map((otherAssignment) => otherAssignment.targetDepotId),
                );
                const activeAssignmentLoad =
                  transferAssignmentLoadMap.get(activeAssignment.id) ??
                  createEmptyTransferCapacityLoad();
                const availableTargetDepotChoices = Array.from(
                  new Map(
                    mergedTargetDepotChoices
                      .filter(
                        (option) =>
                          !isCurrentDepotChoice(option) &&
                          (String(option.key) ===
                            activeAssignment.targetDepotId ||
                            (!selectedTargetDepotIds.has(String(option.key)) &&
                              getTransferCapacityStatusForTarget(
                                option.key,
                                activeAssignmentLoad,
                              ).fitsBoth)),
                      )
                      .map((option) => [String(option.key), option] as const),
                  ).values(),
                );
                const activeAssignmentCapacityStatus =
                  transferAssignmentCapacityMap.get(activeAssignment.id) ??
                  getTransferCapacityStatusForTarget(
                    activeAssignment.targetDepotId,
                    activeAssignmentLoad,
                  );
                const activeTargetDepotLabel =
                  mergedTargetDepotChoiceMap.get(
                    activeAssignment.targetDepotId,
                  ) ??
                  activeAssignmentCapacityStatus.targetDepotName ??
                  null;
                const activeAssignmentHasCapacityIssue =
                  activeAssignmentCapacityStatus.hasTarget &&
                  !activeAssignmentCapacityStatus.fitsBoth;
                const activeSelectedItemsCount = activeAssignment.items.filter(
                  (item) => Number(item.quantity) > 0,
                ).length;
                const activeTransferUnits = activeAssignment.items
                  .reduce((sum, item) => {
                    const quantity = Number(item.quantity);
                    return sum + (Number.isFinite(quantity) ? quantity : 0);
                  }, 0)
                  .toLocaleString("vi-VN");
                const normalizedSearch = transferItemSearch
                  .trim()
                  .toLocaleLowerCase("vi-VN");
                const filteredInventoryItems = closureInventoryItems.filter(
                  (inventoryItem) => {
                    const assignmentItem =
                      activeAssignment.items.find(
                        (item) => item.itemKey === inventoryItem.itemKey,
                      ) ?? null;
                    const currentQuantity = Number(
                      assignmentItem?.quantity ?? "",
                    );
                    const remainingQuantity = Math.max(
                      inventoryItem.transferableQuantity -
                        getAssignedQuantityExcludingRow(
                          inventoryItem.itemKey,
                          activeAssignment.id,
                        ),
                      0,
                    );
                    const searchHaystack = [
                      inventoryItem.itemName,
                      inventoryItem.itemType,
                      getInventoryItemTypeLabel(
                        inventoryItem.itemType,
                        itemTypeValueMap,
                      ),
                      inventoryItem.unit,
                      inventoryItem.categoryName,
                    ]
                      .filter(Boolean)
                      .join(" ")
                      .toLocaleLowerCase("vi-VN");
                    const matchesSearch =
                      !normalizedSearch ||
                      searchHaystack.includes(normalizedSearch);
                    const isRelevant =
                      !showOnlyRelevantTransferItems ||
                      remainingQuantity > 0 ||
                      (Number.isFinite(currentQuantity) && currentQuantity > 0);

                    return matchesSearch && isRelevant;
                  },
                );
                const listHeightClass =
                  context === "dialog"
                    ? isTransferDialogExpanded
                      ? "max-h-[calc(100vh-26rem)]"
                      : "max-h-[52vh]"
                    : "max-h-[55vh]";

                return (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold tracking-tighter">
                            Không gian phân bổ theo kho đích
                          </p>
                          <p className="mt-0.5 text-xs tracking-tighter text-muted-foreground">
                            Chuyển giữa các kho đích để phân bổ từng nhóm hàng
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="tracking-tighter">
                            {transferAssignments.length.toLocaleString("vi-VN")}{" "}
                            kho đích
                          </Badge>
                          <Badge variant="outline" className="tracking-tighter">
                            {closureInventoryItems.length.toLocaleString(
                              "vi-VN",
                            )}{" "}
                            vật phẩm nguồn
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-1.5 tracking-tighter"
                            onClick={addTransferAssignment}
                          >
                            <Plus size={14} />
                            Thêm kho đích
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2 overflow-x-auto px-4 py-3">
                        {transferAssignments.map((assignment, index) => {
                          const accent =
                            TRANSFER_ASSIGNMENT_ACCENTS[
                              index % TRANSFER_ASSIGNMENT_ACCENTS.length
                            ];
                          const assignmentSelectedItems =
                            assignment.items.filter(
                              (item) => Number(item.quantity) > 0,
                            ).length;
                          const assignmentTargetLabel =
                            mergedTargetDepotChoiceMap.get(
                              assignment.targetDepotId,
                            ) ?? null;
                          const assignmentCapacityStatus =
                            transferAssignmentCapacityMap.get(assignment.id) ??
                            getTransferCapacityStatusForTarget(
                              assignment.targetDepotId,
                              transferAssignmentLoadMap.get(assignment.id) ??
                                createEmptyTransferCapacityLoad(),
                            );
                          const assignmentHasCapacityIssue =
                            assignmentCapacityStatus.hasTarget &&
                            !assignmentCapacityStatus.fitsBoth;
                          const isActive =
                            assignment.id === activeAssignment.id;

                          return (
                            <button
                              key={assignment.id}
                              type="button"
                              onClick={() =>
                                setActiveTransferAssignmentId(assignment.id)
                              }
                              className={cn(
                                "min-w-50 rounded-xl border px-3 py-2 text-left transition-all",
                                assignmentHasCapacityIssue
                                  ? "border-rose-300 bg-rose-50/70 text-rose-950 shadow-sm hover:border-rose-400 hover:bg-rose-50"
                                  : isActive
                                    ? cn(
                                        "shadow-sm",
                                        accent?.bg,
                                        accent?.borderColor,
                                      )
                                    : "border-border/60 bg-background hover:border-border hover:bg-muted/20",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold tracking-tighter text-foreground">
                                  Kho đích #{index + 1}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "tracking-tighter text-[13px]",
                                    assignmentHasCapacityIssue
                                      ? "border-rose-200 bg-rose-100 text-rose-700"
                                      : isActive
                                        ? accent?.badge
                                        : "",
                                  )}
                                >
                                  {assignmentSelectedItems} đã chọn
                                </Badge>
                              </div>
                              <p className="mt-1 truncate text-[13px] tracking-tighter">
                                {assignmentTargetLabel || "Chưa chọn kho nhận"}
                              </p>
                              {assignmentHasCapacityIssue && (
                                <p className="mt-1 text-[11px] font-medium tracking-tighter text-rose-700">
                                  Vượt sức chứa phần Consumable
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid gap-4 px-4 pb-4 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
                        <div className="space-y-3 xl:sticky xl:top-0 self-start">
                          <div
                            className={cn(
                              "rounded-2xl border border-border/70 bg-background p-3.5",
                              "border-l-4",
                              activeAssignmentHasCapacityIssue
                                ? "border-l-rose-500 border-rose-200 bg-rose-50/40"
                                : activeAccent?.border,
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold tracking-tighter">
                                  Kho đích #{activeAssignmentIndex + 1}
                                </p>
                                <p className="mt-0.5 text-xs tracking-tighter text-muted-foreground">
                                  {activeTargetDepotLabel ||
                                    "Chọn kho nhận để bắt đầu phân bổ"}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                disabled={transferAssignments.length === 1}
                                onClick={() =>
                                  removeTransferAssignment(activeAssignment.id)
                                }
                              >
                                <Trash size={14} />
                              </Button>
                            </div>

                            <div className="mt-3 space-y-1.5">
                              <Label className="text-sm font-semibold tracking-tighter">
                                Kho nhận hàng{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Select
                                value={activeAssignment.targetDepotId}
                                onValueChange={(value) =>
                                  updateTransferAssignmentTarget(
                                    activeAssignment.id,
                                    value,
                                  )
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    "w-full text-sm tracking-tighter",
                                    activeAssignmentHasCapacityIssue &&
                                      "border-rose-300 bg-rose-50/60 text-rose-900 focus-visible:ring-rose-200",
                                  )}
                                >
                                  <SelectValue placeholder="Chọn kho đích..." />
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  side="bottom"
                                  align="start"
                                  sideOffset={4}
                                  avoidCollisions={false}
                                  className="z-[10000] w-(--radix-select-trigger-width)"
                                >
                                  {availableTargetDepotChoices.length > 0 ? (
                                    availableTargetDepotChoices.map(
                                      (option) => (
                                        <SelectItem
                                          key={option.key}
                                          value={String(option.key)}
                                          className="text-sm tracking-tighter"
                                        >
                                          {option.value}
                                        </SelectItem>
                                      ),
                                    )
                                  ) : (
                                    <div className="px-3 py-2 text-sm tracking-tighter text-muted-foreground">
                                      Không còn kho nào đủ sức chứa cho phân bổ
                                      hiện tại.
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                              <p className="text-xs font-medium tracking-tighter text-muted-foreground">
                                Tổng mặt hàng nguồn
                              </p>
                              <p className="mt-1 text-base font-semibold tracking-tighter">
                                {closureInventoryItems.length.toLocaleString(
                                  "vi-VN",
                                )}
                              </p>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                              <p className="text-xs font-medium tracking-tighter text-muted-foreground">
                                Đã nhập số lượng
                              </p>
                              <p className="mt-1 text-base font-semibold tracking-tighter">
                                {activeSelectedItemsCount.toLocaleString(
                                  "vi-VN",
                                )}
                              </p>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                              <p className="text-xs font-medium tracking-tighter text-muted-foreground">
                                Tổng đơn vị chuyển
                              </p>
                              <p className="mt-1 text-base font-semibold tracking-tighter tabular-nums">
                                {activeTransferUnits}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 rounded-2xl border border-dashed bg-background">
                          <div className="border-b border-border/60 bg-background/95 px-3 py-3">
                            <div className="flex flex-row items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold tracking-tighter">
                                  Danh sách vật phẩm nguồn
                                </p>
                                <p className="mt-0.5 text-xs tracking-tighter text-muted-foreground">
                                  Mặc định chỉ hiện các dòng còn có thể chuyển
                                  hoặc đã nhập số lượng để giảm nhiễu.
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Input
                                  value={transferItemSearch}
                                  onChange={(event) =>
                                    setTransferItemSearch(event.target.value)
                                  }
                                  placeholder="Tìm theo tên, loại, danh mục..."
                                  className="h-9 w-50 text-sm tracking-tighter"
                                />
                                <Button
                                  type="button"
                                  variant={
                                    showOnlyRelevantTransferItems
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  className="shrink-0 tracking-tighter"
                                  onClick={() =>
                                    setShowOnlyRelevantTransferItems(
                                      (current) => !current,
                                    )
                                  }
                                >
                                  {showOnlyRelevantTransferItems
                                    ? "Đang lọc dòng cần xử lý"
                                    : "Hiện mọi vật phẩm"}
                                </Button>
                              </div>
                            </div>

                            <div
                              className={cn(
                                "mt-3 grid gap-3 border-t border-border/60 pt-3 text-xs font-medium tracking-tighter text-muted-foreground",
                                sourceGridCols,
                              )}
                            >
                              <span>Vật phẩm nguồn</span>
                              <span>Có thể chuyển</span>
                              <span>Số lượng phân bổ</span>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "overflow-y-auto overflow-x-hidden rounded-b-2xl",
                              listHeightClass,
                            )}
                          >
                            {filteredInventoryItems.length === 0 ? (
                              <div className="px-4 py-8 text-center text-sm tracking-tighter text-muted-foreground">
                                Không có vật phẩm phù hợp với bộ lọc hiện tại.
                              </div>
                            ) : (
                              <div className="divide-y divide-border/50">
                                {filteredInventoryItems.map((inventoryItem) => {
                                  const assignmentItem =
                                    activeAssignment.items.find(
                                      (item) =>
                                        item.itemKey === inventoryItem.itemKey,
                                    ) ?? null;
                                  const itemTypeLabel =
                                    getInventoryItemTypeLabel(
                                      inventoryItem.itemType,
                                      itemTypeValueMap,
                                    );
                                  const currentQuantity = Number(
                                    assignmentItem?.quantity ?? "",
                                  );
                                  const remainingQuantity = Math.max(
                                    inventoryItem.transferableQuantity -
                                      getAssignedQuantityExcludingRow(
                                        inventoryItem.itemKey,
                                        activeAssignment.id,
                                      ),
                                    0,
                                  );
                                  const hasAssignedQuantity =
                                    Number.isFinite(currentQuantity) &&
                                    currentQuantity > 0;

                                  const allocationMode =
                                    transferSuggestions?.suggestedTransfers.find(
                                      (s) =>
                                        `${s.itemModelId}::${s.itemType}` ===
                                          inventoryItem.itemKey &&
                                        String(s.targetDepotId) ===
                                          activeAssignment.targetDepotId,
                                    )?.allocationMode ?? null;

                                  return (
                                    <div
                                      key={`${activeAssignment.id}-${inventoryItem.itemKey}`}
                                      className={cn(
                                        "grid items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/20",
                                        sourceGridCols,
                                        hasAssignedQuantity &&
                                          "bg-primary/[0.03]",
                                      )}
                                    >
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-baseline gap-1.5">
                                          <p className="line-clamp-2 text-sm font-semibold tracking-tighter text-foreground">
                                            {inventoryItem.itemName}
                                          </p>
                                          {allocationMode ===
                                            "SplitByCapacity" && (
                                            <span className="shrink-0 inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium tracking-tight text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                              Bị tách
                                            </span>
                                          )}
                                          {allocationMode === "Unallocated" && (
                                            <span className="shrink-0 inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-xs font-medium tracking-tight text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                              Chưa phân được
                                            </span>
                                          )}
                                          {(allocationMode ===
                                            "FullFitSingleDepot" ||
                                            allocationMode ===
                                              "Consolidated") && (
                                            <span className="shrink-0 inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-medium tracking-tight text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                              Phù hợp
                                            </span>
                                          )}
                                        </div>
                                        <p className="mt-1 line-clamp-2 break-words text-[11px] leading-4 tracking-tighter text-muted-foreground xl:line-clamp-3">
                                          {itemTypeLabel}
                                          {inventoryItem.unit
                                            ? ` · Đơn vị: ${inventoryItem.unit}`
                                            : ""}
                                          {inventoryItem.categoryName
                                            ? ` · Danh mục: ${inventoryItem.categoryName}`
                                            : ""}
                                          {inventoryItem.volumePerUnit != null
                                            ? ` · Thể tích: ${formatDepotMetric(inventoryItem.volumePerUnit, "dm3")}/đv`
                                            : ""}
                                          {inventoryItem.weightPerUnit != null
                                            ? ` · Khối lượng: ${formatDepotMetric(inventoryItem.weightPerUnit, "kg")}/đv`
                                            : ""}
                                          {inventoryItem.blockedQuantity > 0
                                            ? ` · Khóa ${inventoryItem.blockedQuantity.toLocaleString("vi-VN")}`
                                            : ""}
                                        </p>
                                      </div>

                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold tracking-tighter tabular-nums">
                                          {remainingQuantity.toLocaleString(
                                            "vi-VN",
                                          )}
                                          {inventoryItem.unit
                                            ? ` ${inventoryItem.unit}`
                                            : ""}
                                        </p>
                                        <p className="mt-1 text-xs tracking-tighter text-muted-foreground">
                                          Tồn gốc{" "}
                                          {inventoryItem.stockQuantity.toLocaleString(
                                            "vi-VN",
                                          )}
                                        </p>
                                      </div>

                                      <div className="relative">
                                        <Input
                                          inputMode="numeric"
                                          value={assignmentItem?.quantity ?? ""}
                                          onChange={(event) =>
                                            updateTransferAssignmentQuantity(
                                              activeAssignment.id,
                                              inventoryItem.itemKey,
                                              event.target.value,
                                            )
                                          }
                                          placeholder="0"
                                          className={cn(
                                            "h-10 pr-14 text-sm tracking-tighter",
                                            activeAssignmentHasCapacityIssue &&
                                              hasAssignedQuantity &&
                                              "border-rose-300 bg-rose-50/60 text-rose-900 focus-visible:ring-rose-200",
                                          )}
                                        />
                                        <button
                                          type="button"
                                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold tracking-tighter text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:text-muted-foreground"
                                          disabled={remainingQuantity <= 0}
                                          onClick={() =>
                                            updateTransferAssignmentQuantity(
                                              activeAssignment.id,
                                              inventoryItem.itemKey,
                                              String(remainingQuantity),
                                            )
                                          }
                                        >
                                          Tối đa
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      );
    },
    [
      activeTransferAssignmentId,
      addTransferAssignment,
      applyTransferSuggestionsToAssignments,
      closureInventoryItems,
      getAssignedQuantityExcludingRow,
      getTransferCapacityStatusForTarget,
      hasUnallocatedSuggestion,
      isTransferDialogExpanded,
      isCurrentDepotChoice,
      itemTypeValueMap,
      mergedTargetDepotChoices,
      mergedTargetDepotChoiceMap,
      removeTransferAssignment,
      refetchTransferSuggestions,
      showOnlyRelevantTransferItems,
      transferAssignmentCapacityMap,
      transferAssignmentLoadMap,
      transferSuggestions,
      transferSuggestionsError,
      transferSuggestionsFetching,
      transferAssignments,
      transferItemSearch,
      unallocatedSuggestedTransfers,
      updateTransferAssignmentQuantity,
      updateTransferAssignmentTarget,
    ],
  );

  const transferDialogClassName = isTransferDialogExpanded
    ? "h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none overflow-hidden p-0 gap-0"
    : "w-[min(100vw-2rem,1280px)] sm:max-w-[1280px] max-h-[90vh] overflow-hidden p-0 gap-0";

  function handleRefresh() {
    setIsRefreshing(true);
    Promise.all([
      refetch(),
      refetchAllDepots(),
      refetchManagerHistory(),
      refetchActiveManagers(),
      refetchActiveClosureSummary(),
      ...(activeClosureId ? [refetchActiveClosureDetail()] : []),
    ]).finally(() => setIsRefreshing(false));
  }

  function handleAddManagerToAssignList(managerId: string) {
    if (!managerId || managerId === "__none") {
      setAssignSelectionId("");
      return;
    }

    setSelectedAssignManagerIds((prev) =>
      prev.includes(managerId) ? prev : [...prev, managerId],
    );
    setAssignSelectionId("");
  }

  function handleRemoveSelectedAssignManager(managerId: string) {
    setSelectedAssignManagerIds((prev) =>
      prev.filter((id) => id !== managerId),
    );
  }

  async function handleAssignManagers() {
    if (!depot || selectedAssignManagerIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 quản kho.");
      return;
    }

    try {
      setIsSwitchingManager(true);

      await assignManagerMutation.mutateAsync({
        id: depot.id,
        managerIds: selectedAssignManagerIds,
      });

      toast.success("Đã cập nhật quản kho thành công.");
      setManagerDialogOpen(false);
      setSelectedAssignManagerIds([]);
      setAssignSelectionId("");
      handleRefresh();
    } catch (err) {
      toast.error(getApiError(err, "Cập nhật quản kho thất bại."));
    } finally {
      setIsSwitchingManager(false);
    }
  }

  function handleAddManagerToUnassignList(userId: string) {
    if (!userId || userId === "__none") {
      setUnassignSelectionId("");
      return;
    }

    setSelectedUnassignManagerIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId],
    );
    setUnassignSelectionId("");
  }

  function handleRemoveSelectedUnassignManager(userId: string) {
    setSelectedUnassignManagerIds((prev) => prev.filter((id) => id !== userId));
  }

  async function handleUnassignManagers() {
    if (!depot) return;
    if (selectedUnassignManagerIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 quản kho để gỡ.");
      return;
    }

    try {
      await unassignManagerMutation.mutateAsync({
        id: depot.id,
        userIds: selectedUnassignManagerIds,
      });
      toast.success("Đã gỡ quản kho đã chọn khỏi kho này.");
      setRemoveManagerDialogOpen(false);
      setSelectedUnassignManagerIds([]);
      setUnassignSelectionId("");
      handleRefresh();
    } catch (err) {
      toast.error(getApiError(err, "Gỡ quản kho thất bại."));
    }
  }

  async function handleDepotStatusChange(
    nextStatus: "Available" | "Unavailable",
  ) {
    if (!depot || depot.status === nextStatus) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: depot.id,
        status: nextStatus,
      });
      toast.success(
        nextStatus === "Unavailable"
          ? "Đã chuyển kho sang trạng thái ngưng hoạt động."
          : "Đã mở lại trạng thái hoạt động cho kho.",
      );
      handleRefresh();
    } catch (err) {
      toast.error(getApiError(err, "Cập nhật trạng thái kho thất bại."));
    }
  }

  async function handleInitiate() {
    if (!depot || !initiateReason.trim()) return;
    try {
      const closingRes = await initiateClosingMutation.mutateAsync({
        id: depot.id,
      });

      // Store closureId so the detail query activates immediately
      if (closingRes.closureId) {
        setInitiateResult({
          closureId: closingRes.closureId,
          closureStatus: String(closingRes.status ?? "Closing"),
          closingTimeoutAt: null,
          timeoutAt: null,
          inventorySummary: null,
          remainingInventoryItems: [],
        });
      }

      setInitiateOpen(false);
      setInitiateStep(1);
      toast.success(
        "Đã bắt đầu quy trình đóng kho. Vui lòng kiểm tra tồn kho bên dưới.",
      );
      handleRefresh();
    } catch (err) {
      toast.error(
        getApiError(err, "Không thể chuyển kho sang trạng thái đang đóng."),
      );
    }
  }

  async function handleResumeClosureResolution() {
    if (!depot) return;

    try {
      const result = await refetchActiveClosureDetail();
      const freshItems = normalizeClosureInventoryItems(
        result.data?.remainingInventoryItems ?? [],
      );

      handleRefresh();

      if (freshItems.length > 0) {
        resetTransferAssignments(freshItems);
        setResolveOpen(true);
        return;
      }

      if (result.data?.canConfirmClose) {
        toast.info(
          "Kho đã xử lý xong tồn kho. Bấm nút xác nhận đóng kho để hoàn tất.",
        );
      } else {
        toast.info("Kho không còn hàng tồn cần xử lý.");
      }
    } catch {
      toast.error("Không thể tải dữ liệu xử lý tồn kho.");
    }
  }

  async function handleOpenResolveDialog() {
    setResolutionType("TransferToDepot");
    setExternalNote("");
    setIsTransferDialogExpanded(false);

    if (closureInventoryItems.length > 0) {
      resetTransferAssignments();
      setResolveOpen(true);
      return;
    }

    await handleResumeClosureResolution();
  }

  async function handleOpenNextBatchDialog(
    resType: "TransferToDepot" | "ExternalResolution",
  ) {
    setResolutionType(resType);
    setExternalNote("");
    setIsTransferDialogExpanded(false);

    try {
      const result = await refetchActiveClosureDetail();
      const freshItems = normalizeClosureInventoryItems(
        result.data?.remainingInventoryItems ?? [],
      );
      if (freshItems.length > 0) {
        setInitiateResult((prev) => ({
          closureId: prev?.closureId ?? result.data?.id ?? 0,
          closureStatus:
            prev?.closureStatus ?? result.data?.status ?? "InProgress",
          closingTimeoutAt: prev?.closingTimeoutAt ?? null,
          timeoutAt: prev?.timeoutAt ?? null,
          inventorySummary: prev?.inventorySummary ?? null,
          remainingInventoryItems: result.data?.remainingInventoryItems ?? [],
        }));
        if (resType === "TransferToDepot") {
          resetTransferAssignments(freshItems);
        }
        setResolveOpen(true);
        return;
      }
    } catch {
      // fall through
    }

    await handleResumeClosureResolution();
  }

  /**
   * Xác nhận đóng kho chính thức khi canConfirmClose = true
   * POST /logistics/depot/{id}/closed
   */
  async function handleConfirmClose() {
    if (!depot) return;
    const reason =
      confirmCloseReason.trim() ||
      activeClosure?.closeReason?.trim() ||
      initiateReason.trim() ||
      "Đóng kho theo kế hoạch";
    try {
      const res = await initiateMutation.mutateAsync({
        id: depot.id,
        reason,
      });
      setConfirmCloseDialogOpen(false);
      toast.success(res.message || "Kho đã được đóng chính thức!");
      handleRefresh();
    } catch (err) {
      toast.error(getApiError(err, "Không thể xác nhận đóng kho."));
    }
  }

  useEffect(() => {
    if (!confirmCloseDialogOpen) {
      return;
    }

    setConfirmCloseReason(
      activeClosure?.closeReason?.trim() ||
        initiateReason.trim() ||
        "Đóng kho theo kế hoạch",
    );
  }, [activeClosure?.closeReason, confirmCloseDialogOpen, initiateReason]);

  function handleResolve() {
    if (!depot) return;
    const transferReason =
      initiateReason.trim() ||
      activeClosure?.closeReason?.trim() ||
      "Đóng kho và điều phối hàng tồn sang kho đích";

    if (resolutionType === "TransferToDepot") {
      const assignments = buildTransferAssignmentsPayload();
      if (!assignments) return;

      initiateTransferMutation.mutate(
        {
          id: depot.id,
          reason: transferReason,
          assignments,
        },
        {
          onSuccess: (res) => {
            if (res.hasRemainingItems && res.remainingItems?.length) {
              // Partial transfer — still has leftover items
              const normalizedRemaining = normalizeClosureInventoryItems(
                res.remainingItems,
              );
              setInitiateResult((prev) => ({
                ...(prev ?? {
                  closureId: res.closureId ?? 0,
                  closureStatus: "InProgress",
                  closingTimeoutAt: null,
                  timeoutAt: null,
                  inventorySummary: null,
                }),
                closureId: res.closureId ?? prev?.closureId ?? 0,
                closureStatus: "InProgress",
                remainingInventoryItems: res.remainingItems,
              }));
              resetTransferAssignments(normalizedRemaining);
              toast.success(
                res.message ||
                  "Đã tạo batch chuyển kho. Kho vẫn còn hàng tồn — chọn bước tiếp theo.",
              );
              // Close the resolve dialog — user can continue from the transfer table
              setResolveOpen(false);
              handleRefresh();
              return;
            }
            toast.success(
              res.message ||
                "Đã tạo phương án chuyển kho cho quy trình đóng kho.",
            );
            setResolveOpen(false);
            resetTransferAssignments();
            setIsTransferDialogExpanded(false);
            handleRefresh();
          },
          onError: (err) =>
            toast.error(getApiError(err, "Khởi tạo chuyển kho thất bại.")),
        },
      );
      return;
    }

    markExternalMutation.mutate(
      {
        id: depot.id,
        reason: externalNote.trim(),
      },
      {
        onSuccess: (res) => {
          toast.success(
            res.message ||
              "Đã đánh dấu phiên đóng kho là xử lý bên ngoài. Chờ bước gửi kết quả xử lý.",
          );
          setResolveOpen(false);
          handleRefresh();
        },
        onError: (err) =>
          toast.error(getApiError(err, "Đánh dấu xử lý bên ngoài thất bại.")),
      },
    );
  }

  function handleResolveInDialog() {
    if (!depot) return;
    const transferReason =
      initiateReason.trim() ||
      activeClosure?.closeReason?.trim() ||
      "Đóng kho và điều phối hàng tồn sang kho đích";

    if (resolutionType === "TransferToDepot") {
      const assignments = buildTransferAssignmentsPayload();
      if (!assignments) return;

      initiateTransferMutation.mutate(
        {
          id: depot.id,
          reason: transferReason,
          assignments,
        },
        {
          onSuccess: (res) => {
            if (res.hasRemainingItems && res.remainingItems?.length) {
              // Partial transfer — still has leftover items; stay in dialog step 2
              const normalizedRemaining = normalizeClosureInventoryItems(
                res.remainingItems,
              );
              setInitiateResult((prev) => ({
                ...(prev ?? {
                  closureId: res.closureId ?? 0,
                  closureStatus: "InProgress",
                  closingTimeoutAt: null,
                  timeoutAt: null,
                  inventorySummary: null,
                }),
                closureId: res.closureId ?? prev?.closureId ?? 0,
                closureStatus: "InProgress",
                remainingInventoryItems: res.remainingItems,
              }));
              resetTransferAssignments(normalizedRemaining);
              toast.success(
                res.message ||
                  "Đã tạo batch chuyển kho. Kho vẫn còn hàng tồn — chọn bước tiếp theo.",
              );
              handleRefresh();
              return;
            }
            toast.success(
              res.message ||
                "Đã tạo phương án chuyển kho. Chờ xác nhận giao nhận.",
            );
            setInitiateOpen(false);
            setInitiateStep(1);
            setInitiateResult(null);
            resetTransferAssignments();
            setIsTransferDialogExpanded(false);
            handleRefresh();
          },
          onError: (err) =>
            toast.error(getApiError(err, "Khởi tạo chuyển kho thất bại.")),
        },
      );
      return;
    }

    markExternalMutation.mutate(
      {
        id: depot.id,
        reason: externalNote.trim(),
      },
      {
        onSuccess: (res) => {
          toast.success(
            res.message ||
              "Đã đánh dấu xử lý bên ngoài. Tiếp theo hãy gửi kết quả xử lý tồn kho.",
          );
          setInitiateOpen(false);
          setInitiateStep(1);
          setInitiateResult(null);
          handleRefresh();
        },
        onError: (err) =>
          toast.error(getApiError(err, "Đánh dấu xử lý bên ngoài thất bại.")),
      },
    );
  }

  /* ── Loading skeleton ── */
  if (isLoading || !depot) {
    return (
      <DashboardLayout
        favorites={[]}
        projects={[]}
        cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
      >
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-72" />
            </div>
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const cfg = statusCfg[depot.status] ?? {
    label: depot.status,
    color: "text-muted-foreground",
    bg: "bg-muted",
  };
  const pct =
    depot.capacity > 0
      ? Math.min(
          100,
          Math.round((depot.currentUtilization / depot.capacity) * 100),
        )
      : 0;
  const weightPct =
    (depot.weightCapacity ?? 0) > 0
      ? Math.min(
          100,
          Math.round(
            ((depot.currentWeightUtilization ?? 0) /
              (depot.weightCapacity ?? 1)) *
              100,
          ),
        )
      : 0;
  const barColor =
    pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500";
  const weightBarColor =
    weightPct > 80
      ? "bg-red-500"
      : weightPct > 50
        ? "bg-amber-500"
        : "bg-emerald-500";
  // Banner uses activeTransfer (nil when terminal) to avoid showing "pending" after batch done
  const isTransferActive = activeTransfer !== null;
  const isTransferDoneWithRemainingItems =
    !activeTransfer && (shouldShowNextBatchButton || shouldShowResolveButton);
  const closingBannerTheme =
    activeClosureStatus === "Processing" || isTransferActive
      ? {
          wrapper: "bg-blue-700/95 border-blue-600",
          divider: "bg-blue-500",
          muted: "text-blue-100",
        }
      : isTransferDoneWithRemainingItems
        ? {
            wrapper: "bg-amber-700/95 border-amber-600",
            divider: "bg-amber-500",
            muted: "text-amber-100",
          }
        : activeClosureStatus === "InProgress"
          ? {
              wrapper: "bg-amber-700/95 border-amber-600",
              divider: "bg-amber-500",
              muted: "text-amber-100",
            }
          : {
              wrapper: "bg-red-700/95 border-red-600",
              divider: "bg-red-500",
              muted: "text-red-100",
            };
  const closingBannerLabel =
    activeClosureStatus === "Processing"
      ? "Hệ thống đang xử lý phiên đóng kho"
      : isTransferActive
        ? "Đã chọn chuyển kho — đang chờ giao nhận"
        : isTransferDoneWithRemainingItems
          ? "Còn hàng tồn — Vui lòng xử lý"
          : activeClosureStatus === "InProgress"
            ? "Chờ xử lý tồn kho"
            : "Đang xử lý đóng kho";

  return (
    <DashboardLayout
      favorites={[]}
      projects={[]}
      cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="relative px-5 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="absolute right-0 top-0 hidden h-9 rounded-lg px-3 font-medium text-foreground xl:inline-flex"
          >
            <ArrowClockwise
              size={15}
              className={cn("mr-2", isRefreshing && "animate-spin")}
            />
            Làm mới
          </Button>
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <ArrowLeftIcon
                      size={16}
                      className="group-hover:-translate-x-0.5 transition-transform"
                    />
                    <span className="tracking-tighter text-sm font-medium">
                      Quay lại
                    </span>
                  </button>
                  <div className="space-y-2 xl:hidden">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Kho số {depot.id}
                    </p>
                    <div className="space-y-2">
                      <h1 className="max-w-4xl text-3xl font-bold tracking-tighter text-slate-950 sm:text-4xl">
                        {depot.name}
                      </h1>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-9 rounded-lg bg-background px-3 font-medium text-foreground xl:hidden"
                >
                  <ArrowClockwise
                    size={15}
                    className={cn("mr-2", isRefreshing && "animate-spin")}
                  />
                  Làm mới
                </Button>
              </div>

              <div className="relative overflow-hidden rounded-[24px] border border-border/60 bg-slate-950">
                {depot.imageUrl ? (
                  <div className="relative h-85 w-full sm:h-100">
                    <Image
                      src={depot.imageUrl}
                      alt={depot.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.36)_55%,rgba(15,23,42,0.78))]" />
                  </div>
                ) : (
                  <div className="flex h-[340px] w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.26),_transparent_34%),linear-gradient(180deg,_#0f172a,_#111827)] sm:h-[400px]">
                    <div className="flex flex-col items-center gap-3 text-white/70">
                      <Warehouse size={56} weight="duotone" />
                      <p className="text-sm font-medium tracking-[0.18em] uppercase text-white/65">
                        Chưa có ảnh kho
                      </p>
                    </div>
                  </div>
                )}

                <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                  {depot.status === "Closing" &&
                  (isTransferActive ||
                    isTransferDoneWithRemainingItems ||
                    activeClosureStatus === "Processing" ||
                    activeClosureStatus === "InProgress") ? (
                    <div
                      className={cn(
                        "flex max-w-xl flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-white",
                        closingBannerTheme.wrapper,
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {activeClosureStatus === "Processing" ? (
                          <Spinner
                            size={16}
                            className="shrink-0 animate-spin text-white"
                          />
                        ) : isTransferActive ? (
                          <ArrowsLeftRight
                            size={16}
                            className="shrink-0 text-white"
                            weight="fill"
                          />
                        ) : (
                          <WarningCircle
                            size={16}
                            className="shrink-0 text-white"
                            weight="fill"
                          />
                        )}
                        <span className="text-sm font-bold tracking-tighter">
                          {closingBannerLabel}
                        </span>
                      </div>
                      {isTransferActive && (
                        <span
                          className={cn(
                            "text-xs font-medium tracking-tighter",
                            closingBannerTheme.muted,
                          )}
                        >
                          Đang chờ hai bên quản lý kho xác nhận giao nhận.
                        </span>
                      )}
                      {isTransferDoneWithRemainingItems && (
                        <span
                          className={cn(
                            "text-xs font-medium tracking-tighter",
                            closingBannerTheme.muted,
                          )}
                        >
                          {/* Đợt điều chuyển vừa hoàn tất. Chọn bước tiếp theo bên
                          phải. */}
                        </span>
                      )}
                      {initiateResult?.closingTimeoutAt && (
                        <div className="flex items-center gap-1.5 text-xs tracking-tighter text-white">
                          <HourglassHigh size={13} className="shrink-0" />
                          <span>
                            Hết hạn:{" "}
                            <strong>
                              {new Date(
                                initiateResult.closingTimeoutAt,
                              ).toLocaleString("vi-VN")}
                            </strong>
                            {closingTimeoutCountdown && (
                              <span className="ml-1.5 font-mono opacity-80">
                                ({closingTimeoutCountdown})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge className="min-h-11 rounded-xl border border-white/20 bg-black/35 px-4 py-2 text-sm font-semibold text-white">
                      <MapPin size={15} className="mr-2" weight="fill" />
                      {depot.address}
                    </Badge>
                  )}

                  <Badge
                    className={cn(
                      "min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold",
                      cfg.bg,
                      cfg.color,
                    )}
                  >
                    {depot.status === "Closing" && (
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-300 animate-pulse" />
                    )}
                    {cfg.label}
                  </Badge>
                </div>

                {/* <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-white/12 bg-black/40 p-4 text-white">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Tồn kho hiện tại
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-tighter">
                        {depot.currentUtilization.toLocaleString("vi-VN")}
                        <span className="ml-2 text-sm font-medium text-white/65">
                          / {depot.capacity.toLocaleString("vi-VN")}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/12 bg-black/40 p-4 text-white">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Dung lượng còn trống
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-tighter">
                        {availableCapacity.toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/12 bg-black/40 p-4 text-white">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Người phụ trách
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-tighter">
                        {managerDisplayName}
                      </p>
                    </div>
                  </div>
                </div> */}
              </div>
            </div>

            <div className="space-y-6 xl:flex xl:h-full xl:flex-col xl:pt-8">
              <div className="hidden xl:block space-y-2 px-5">
                <p className="text-base font-semibold tracking-tighter text-slate-500">
                  Kho số {depot.id}
                </p>
                <h1 className="text-4xl font-bold tracking-tighter text-slate-950">
                  {depot.name}
                </h1>
              </div>

              <div className="p-5 xl:mt-auto">
                {canUpdateOperationalStatus && (
                  <div>
                    <p className="pb-2 font-semibold text-sm uppercase tracking-tighter text-muted-foreground">
                      Chuyển trạng thái kho
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        className={cn(
                          "h-11 w-full px-6 font-semibold tracking-tighter shadow-none",
                          depot.status === "Available"
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : "bg-emerald-600 text-white hover:bg-emerald-700",
                        )}
                        variant="default"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          handleDepotStatusChange(
                            depot.status === "Available"
                              ? "Unavailable"
                              : "Available",
                          )
                        }
                      >
                        {updateStatusMutation.isPending && (
                          <Icon
                            icon="line-md:loading-loop"
                            width="16"
                            height="16"
                            className="mr-2"
                          />
                        )}
                        {depot.status === "Available"
                          ? "Tạm ngưng hoạt động"
                          : "Kích hoạt"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {canManageDepotManager && (
                    <>
                      <p className="px-3 font-semibold text-sm uppercase tracking-tighter text-muted-foreground">
                        THAY ĐỔI QUẢN KHO
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 flex-1 rounded-md border-slate-300 bg-background px-4 font-medium text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setSelectedAssignManagerIds([]);
                            setAssignSelectionId("");
                            setManagerDialogOpen(true);
                          }}
                        >
                          <Icon
                            icon="line-md:account-small"
                            width="24"
                            height="24"
                          />
                          Thêm quản kho
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 flex-1 rounded-md border-red-300 bg-background px-4 font-medium text-red-600 hover:bg-red-50"
                          disabled={unassignManagerMutation.isPending}
                          onClick={() => {
                            setSelectedUnassignManagerIds([]);
                            setUnassignSelectionId("");
                            setRemoveManagerDialogOpen(true);
                          }}
                        >
                          <Icon
                            icon="line-md:account-delete"
                            width="24"
                            height="24"
                          />
                          Gỡ quản kho
                        </Button>
                      </div>
                    </>
                  )}

                  {canInitiateClosure && (
                    <Button
                      className="h-12 w-full rounded-md border border-red-700 bg-red-600 px-5 text-base font-bold text-white transition-colors hover:border-red-800 hover:bg-red-700 hover:text-white shadow-none"
                      variant="outline"
                      onClick={() => {
                        setInitiateReason("");
                        resetTransferAssignments();
                        setIsTransferDialogExpanded(false);
                        setInitiateOpen(true);
                      }}
                    >
                      <LockIcon size={24} />
                      Đóng kho
                    </Button>
                  )}

                  {depot.status === "Closing" && shouldShowResolveButton && (
                    <Button
                      className="h-12 w-full rounded-md bg-foreground px-5 text-base font-semibold text-background hover:bg-foreground/90 shadow-none"
                      disabled={initiateMutation.isPending}
                      onClick={() => {
                        void handleOpenResolveDialog();
                      }}
                    >
                      {initiateMutation.isPending ? (
                        <Spinner size={18} className="mr-2 animate-spin" />
                      ) : (
                        <Icon
                          icon="lsicon:goods-outline"
                          width="18"
                          height="18"
                          className="mr-2"
                        />
                      )}
                      {closureInventoryItems.length > 0
                        ? "Chọn phương án xử lý tồn kho"
                        : "Khôi phục dữ liệu xử lý tồn kho"}
                    </Button>
                  )}

                  {depot.status === "Closing" && shouldShowNextBatchButton && (
                    <div className="space-y-2">
                      <Button
                        className="h-11 w-full rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90 shadow-none"
                        disabled={initiateMutation.isPending}
                        onClick={() => {
                          void handleOpenNextBatchDialog("TransferToDepot");
                        }}
                      >
                        {initiateMutation.isPending ? (
                          <Spinner size={24} className="animate-spin" />
                        ) : (
                          <ArrowsLeftRight size={24} />
                        )}
                        Tạo đợt điều chuyển
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 w-full rounded-md border-primary text-primary hover:bg-primary/10 px-5 text-sm font-semibold shadow-none"
                        disabled={markExternalMutation.isPending}
                        onClick={() => {
                          void handleOpenNextBatchDialog("ExternalResolution");
                        }}
                      >
                        {markExternalMutation.isPending ? (
                          <Spinner size={24} className="animate-spin" />
                        ) : (
                          <Icon icon="mdi:human-dolly" width="24" height="24" />
                        )}
                        Chuyển sang xử lý bên ngoài
                      </Button>
                    </div>
                  )}

                  {/* {depot.status === "Closed" && (
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text- font-semibold tracking-tighter text-slate-900">
                        Kho đã đóng
                      </p>
                      <p className="mt-1 text-sm tracking-tighter leading-6 text-slate-600">
                        Trạng thái kho đã kết thúc. Các thao tác vận hành trực
                        tiếp đã khóa.
                      </p>
                    </div>
                  )} */}

                  {shouldShowConfirmCloseButton && (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-4 py-3">
                        <p className="text-sm font-semibold tracking-tighter text-emerald-800 dark:text-emerald-300">
                          Sẵn sàng đóng kho vĩnh viễn
                        </p>
                        <p className="text-xs tracking-tighter text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">
                          Tất cả hàng tồn đã được xử lý. Hành động này không thể
                          hoàn tác.
                        </p>
                      </div>
                      <Button
                        className="h-12 w-full rounded-md border border-emerald-700 bg-emerald-600 px-5 text-base font-bold text-white transition-colors hover:border-emerald-800 hover:bg-emerald-700 shadow-none"
                        variant="outline"
                        disabled={initiateMutation.isPending}
                        onClick={() => setConfirmCloseDialogOpen(true)}
                      >
                        {initiateMutation.isPending ? (
                          <Spinner size={18} className="mr-2 animate-spin" />
                        ) : (
                          <CheckFat size={20} className="mr-2" weight="fill" />
                        )}
                        Xác nhận đóng kho vĩnh viễn
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="overflow-hidden rounded-2xl border border-border/60 bg-background py-0">
            <CardContent className="space-y-3 px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-tighter text-muted-foreground">
                    Thể tích hiện tại
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {formatDepotMetric(depot.currentUtilization, "dm3")}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-4xl bg-emerald-50 text-emerald-600">
                  <Package size={20} weight="duotone" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      barColor,
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm tracking-tighter">
                  <span className="text-slate-500">Sức chứa tối đa</span>
                  <span className="font-semibold text-slate-900">
                    {formatDepotMetric(depot.capacity, "dm3")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-border/60 bg-background py-0">
            <CardContent className="space-y-3 px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-tighter text-muted-foreground">
                    Khối lượng hiện tại
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {formatDepotMetric(
                      depot.currentWeightUtilization ?? 0,
                      "kg",
                    )}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-4xl bg-sky-50 text-sky-600">
                  <WarehouseIcon size={20} weight="duotone" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      weightBarColor,
                    )}
                    style={{ width: `${weightPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm tracking-tighter">
                  <span className="text-slate-500">Sức chứa tối đa</span>
                  <span className="font-semibold text-slate-900">
                    {formatDepotMetric(depot.weightCapacity ?? 0, "kg")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-border/60 bg-background py-0">
            <CardContent className="space-y-3 px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-tighter text-muted-foreground">
                    Vị trí kho
                  </p>
                  <p className="mt-2 line-clamp-2 text-lg font-semibold tracking-tighter text-slate-950">
                    {depot.address}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-4xl bg-rose-50 text-rose-600">
                  <MapPin size={20} weight="fill" />
                </div>
              </div>
              <p className="text-sm font-normal tracking-tighter text-foreground/80">
                Tọa độ: {depot.latitude.toFixed(6)},{" "}
                {depot.longitude.toFixed(6)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border/50">
          <CardContent>
            <div className="mb-2">
              <p className="text-sm font-semibold uppercase tracking-tighter text-muted-foreground">
                Quản lý phụ trách
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tighter text-foreground">
                Lịch sử quản lý kho
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-190">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                      Quản kho
                    </th>
                    <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                      Trạng thái
                    </th>
                    <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                      Ngày phân công
                    </th>
                    <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                      Ngày hủy phân công
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {managerHistoryLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-border/30">
                        <td className="p-3">
                          <Skeleton className="h-10 w-52 rounded" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-6 w-24 rounded" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-4 w-40 rounded" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-4 w-32 rounded" />
                        </td>
                      </tr>
                    ))
                  ) : managerHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-10 text-center text-sm tracking-tighter text-muted-foreground"
                      >
                        Chưa có lịch sử phân công thủ kho cho kho này.
                      </td>
                    </tr>
                  ) : (
                    managerHistory.map((record, index) => (
                      <tr
                        key={`${record.userId}-${record.assignedAt}-${record.unassignedAt ?? "current"}-${index}`}
                        className="border-b border-border/30 transition-colors hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <div className="text-sm font-medium tracking-tighter text-foreground">
                            {`${record.lastName ?? ""} ${record.firstName ?? ""}`.trim() ||
                              record.fullName ||
                              record.email?.split("@")[0] ||
                              "Không rõ tên"}
                          </div>
                          <div className="mt-1 text-sm tracking-tighter text-foreground/70">
                            {record.email ?? "Chưa có email"}
                            {record.phone ? ` • ${record.phone}` : ""}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            className={
                              record.isCurrent
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400"
                            }
                          >
                            {record.isCurrent ? "Đang phụ trách" : "Đã gỡ"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm tracking-tighter text-foreground/80">
                          {new Date(record.assignedAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="p-3 text-sm tracking-tighter text-foreground/80">
                          {record.unassignedAt
                            ? new Date(record.unassignedAt).toLocaleString(
                                "vi-VN",
                              )
                            : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
              <div className="flex items-center gap-3">
                <div className="text-sm tracking-tighter text-muted-foreground">
                  Trang {managerHistoryCurrentPage}
                  {managerHistoryTotalPages
                    ? ` / ${managerHistoryTotalPages}`
                    : ""}
                </div>
                <div className="flex items-center gap-1.5">
                  <Select
                    value={String(managerHistoryPageSize)}
                    onValueChange={(val) => {
                      setManagerHistoryPageSize(Number(val));
                      setManagerHistoryPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-16 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm tracking-tighter text-muted-foreground">
                    / trang
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!managerHistoryHasPrevious}
                  onClick={() =>
                    setManagerHistoryPage((prev) => Math.max(1, prev - 1))
                  }
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!managerHistoryHasNext}
                  onClick={() => setManagerHistoryPage((prev) => prev + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ══ Transfer Panel ══ */}
        {depot.status === "Closing" &&
          !!activeTransfer &&
          !!activeClosureId && (
            <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-blue-200 dark:border-blue-800 bg-blue-100/40 dark:bg-blue-900/20 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <ArrowsLeftRight
                    size={15}
                    weight="fill"
                    className="text-blue-500 shrink-0"
                  />
                  <span className="text-base font-bold tracking-tighter text-blue-800 dark:text-blue-300">
                    Transfer #{activeTransferId}
                  </span>
                  {(() => {
                    const s = currentTransferStatus;
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2.5 py-1.5 text-[13px] font-semibold tracking-tighter",
                          getDepotClosureTransferStatusToneClass(s),
                        )}
                      >
                        {getDepotClosureTransferStatusLabel(
                          s,
                          transferStatusValueMap,
                        )}
                      </span>
                    );
                  })()}
                </div>
                {activeClosure?.targetDepotName && (
                  <div className="flex items-center gap-1.5 text-sm font-semibold tracking-tighter text-blue-700 dark:text-blue-400">
                    <Icon
                      icon="fluent:vehicle-truck-cube-20-regular"
                      width="24"
                      height="24"
                    />
                    <span>
                      →{" "}
                      <span className="font-semibold">
                        {activeClosure.targetDepotName}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-5">
                {/* Step Progress */}
                <div className="flex items-start">
                  {transferSteps.map((step, i) => {
                    const cur = transferStepOrder.indexOf(
                      currentTransferStatus,
                    );
                    const me = transferStepOrder.indexOf(step.key);
                    const done = me < cur;
                    const active = me === cur;
                    return (
                      <React.Fragment key={step.key}>
                        {i > 0 && (
                          <div
                            className={cn(
                              "h-0.5 flex-1 mt-3.5 mx-0.5 transition-colors",
                              done || active
                                ? "bg-blue-400 dark:bg-blue-500"
                                : "bg-blue-200 dark:bg-blue-800",
                            )}
                          />
                        )}
                        <div className="flex w-24 shrink-0 flex-col items-center gap-1.5 md:w-28">
                          <div
                            className={cn(
                              "h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all",
                              done
                                ? "bg-blue-500 border-blue-500 text-white"
                                : active
                                  ? "bg-white border-blue-500 text-blue-600 dark:bg-blue-950 ring-2 ring-blue-200 dark:ring-blue-800"
                                  : "bg-white border-blue-200 text-blue-300 dark:bg-blue-950/50 dark:border-blue-800",
                            )}
                          >
                            {done ? (
                              <CheckFat size={11} weight="fill" />
                            ) : (
                              <span className="text-sm font-bold leading-none">
                                {i + 1}
                              </span>
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-xs text-center font-medium leading-tight tracking-tighter whitespace-normal",
                              done
                                ? "text-blue-500 dark:text-blue-400 font-medium"
                                : active
                                  ? "text-blue-700 dark:text-blue-300 font-bold"
                                  : "text-muted-foreground",
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Transfer stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    {
                      label: "Vật phẩm tiêu thụ",
                      value: (
                        activeTransfer?.snapshotConsumableUnits ??
                        activeClosure?.snapshotConsumableUnits ??
                        0
                      ).toLocaleString("vi-VN"),
                    },
                    {
                      label: "Vật phẩm tái sử dụng",
                      value: (
                        activeTransfer?.snapshotReusableUnits ??
                        activeClosure?.snapshotReusableUnits ??
                        0
                      ).toLocaleString("vi-VN"),
                    },
                    {
                      label: "Kho nhận",
                      value:
                        activeClosure?.targetDepotName ??
                        (activeClosure?.targetDepotId
                          ? `#${activeClosure.targetDepotId}`
                          : "—"),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-blue-100/60 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/60"
                    >
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-medium tracking-tighter">
                        {item.label}
                      </span>
                      <span className="text-base font-bold text-blue-900 dark:text-blue-200 tracking-tighter tabular-nums">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Cancel transfer — admin only, only when transfer is still open */}
                {canInitiateClosure &&
                  activeTransferId &&
                  !["Received", "Cancelled"].includes(
                    currentTransferStatus,
                  ) && (
                    <div className="flex justify-end border-t border-blue-200/60 dark:border-blue-800/60 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 tracking-tighter border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                        disabled={cancelTransferMutation.isPending}
                        onClick={() => {
                          if (!depot || !activeTransferId) return;
                          if (
                            !window.confirm(
                              "Xác nhận hủy transfer này? Closure sẽ quay lại InProgress nếu kho vẫn còn hàng.",
                            )
                          )
                            return;
                          cancelTransferMutation.mutate(
                            { id: depot.id, transferId: activeTransferId },
                            {
                              onSuccess: (res) => {
                                if (res.requiresFurtherResolution) {
                                  toast.info(
                                    res.message ||
                                      "Transfer đã hủy. Kho vẫn còn hàng tồn — chọn bước tiếp theo.",
                                  );
                                } else {
                                  toast.success(
                                    res.message || "Transfer đã hủy.",
                                  );
                                }
                                handleRefresh();
                              },
                              onError: (err) =>
                                toast.error(
                                  getApiError(err, "Hủy transfer thất bại."),
                                ),
                            },
                          );
                        }}
                      >
                        {cancelTransferMutation.isPending ? (
                          <Spinner size={13} className="animate-spin" />
                        ) : (
                          <XCircle size={13} />
                        )}
                        Hủy transfer
                      </Button>
                    </div>
                  )}
              </div>
            </div>
          )}

        {depot.status === "Closing" &&
          activeClosureStatus === "Processing" &&
          !activeTransfer && (
            <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Spinner
                    size={18}
                    className="animate-spin text-blue-600 dark:text-blue-400"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold tracking-tighter text-blue-900 dark:text-blue-200">
                    Hệ thống đang xử lý phiên đóng kho
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 tracking-tighter">
                    Server đang hoàn tất bước chuẩn bị dữ liệu. Màn hình sẽ cập
                    nhật ngay khi có thể tiếp tục.
                  </p>
                </div>
              </div>
            </div>
          )}

        {hasRenderableActiveClosure && activeClosure && (
          <>
            {/* ── Closure status flags ── */}
            {"hasRemainingItems" in activeClosure && (
              <div className="rounded-xl border border-border/60 bg-white overflow-hidden">
                {/* <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-3 min-w-0">
                  <div className="shrink-0">
                    <p className="text-base font-bold tracking-tighter">
                      Tình trạng tồn kho hiện tại
                    </p>
                    <p className="text-sm text-muted-foreground tracking-tighter mt-0.5">
                      Dữ liệu thời gian thực từ phiên đóng kho này.
                    </p>
                  </div>
                  <div className="flex gap-2 items-center overflow-x-auto min-w-0 pb-0.5">
             
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
                      <span className="text-sm font-semibold tracking-tighter whitespace-nowrap">
                        Còn transfer đang mở
                      </span>
                      {activeClosure.hasOpenTransfers ? (
                        <Icon
                          icon="teenyicons:tick-circle-solid"
                          width="24"
                          height="24"
                          className="text-emerald-600 dark:text-emerald-400 shrink-0"
                        />
                      ) : (
                        <XCircle
                          size={24}
                          weight="fill"
                          className="text-muted-foreground shrink-0"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/90 px-3 py-2">
                      <span className="text-sm font-semibold tracking-tighter whitespace-nowrap">
                        Còn hàng tồn kho
                      </span>
                      {activeClosure.hasRemainingItems ? (
                        <Icon
                          icon="teenyicons:tick-circle-solid"
                          width="24"
                          height="24"
                          className="text-amber-600 dark:text-amber-400 shrink-0"
                        />
                      ) : (
                        <XCircle
                          size={24}
                          weight="fill"
                          className="text-muted-foreground shrink-0"
                        />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
                      <span className="text-sm font-semibold tracking-tighter whitespace-nowrap">
                        Cho phép chọn phương án
                      </span>
                      {activeClosure.canSelectResolutionOption ? (
                        <Icon
                          icon="teenyicons:tick-circle-solid"
                          width="24"
                          height="24"
                          className="text-emerald-600 dark:text-emerald-400 shrink-0"
                        />
                      ) : (
                        <XCircle
                          size={24}
                          weight="fill"
                          className="text-muted-foreground shrink-0"
                        />
                      )}
                    </div>
                  
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
                      <span className="text-sm font-semibold tracking-tighter whitespace-nowrap">
                        Có thể đóng kho vĩnh viễn
                      </span>
                      {activeClosure.canConfirmClose ? (
                        <Icon
                          icon="teenyicons:tick-circle-solid"
                          width="24"
                          height="24"
                          className="text-emerald-600 dark:text-emerald-400 shrink-0"
                        />
                      ) : (
                        <XCircle
                          size={24}
                          weight="fill"
                          className="text-muted-foreground shrink-0"
                        />
                      )}
                    </div>
                  </div>
                </div> */}

                {/* Remaining inventory items table */}
                {activeClosure.hasRemainingItems &&
                  (activeClosure.remainingInventoryItems?.length ?? 0) > 0 && (
                    <div className="border-t border-border/60">
                      <div className="px-4 py-3 border-b border-border/60">
                        <p className="text-sm font-bold tracking-tighter text-amber-700 dark:text-amber-400">
                          Danh sách hàng tồn chưa xử lý (
                          {activeClosure.remainingInventoryItems!.length} vật
                          phẩm)
                        </p>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-muted/40">
                            <TableRow className="border-border/60 hover:bg-muted/30">
                              <TableHead className="p-3 text-sm font-semibold tracking-tighter text-foreground">
                                Vật phẩm
                              </TableHead>
                              <TableHead className="p-3 text-sm font-semibold tracking-tighter text-foreground">
                                Loại
                              </TableHead>
                              <TableHead className="p-3 text-right text-sm font-semibold tracking-tighter text-foreground">
                                Tổng số lượng
                              </TableHead>
                              <TableHead className="p-3 text-right text-sm font-semibold tracking-tighter text-foreground">
                                Chuyển được
                              </TableHead>
                              <TableHead className="p-3 text-right text-sm font-semibold tracking-tighter text-foreground">
                                Đang bị khóa
                              </TableHead>
                              <TableHead className="p-3 text-right text-sm font-semibold tracking-tighter text-foreground">
                                Thể tích
                              </TableHead>
                              <TableHead className="p-3 text-right text-sm font-semibold tracking-tighter text-foreground">
                                Khối lượng
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeClosure.remainingInventoryItems!.map(
                              (item) => (
                                <TableRow
                                  key={`remaining-${item.itemModelId}-${item.itemType}`}
                                  className="border-border/60 hover:bg-muted/20"
                                >
                                  <TableCell className="p-3">
                                    <p className="text-sm font-semibold tracking-tighter">
                                      {item.itemName}
                                    </p>
                                    <p className="text-xs text-muted-foreground tracking-tighter mt-0.5">
                                      {item.categoryName}
                                    </p>
                                  </TableCell>
                                  <TableCell className="p-3">
                                    <Badge
                                      className={cn(
                                        "rounded-full border-0 text-xs font-semibold shadow-none",
                                        item.itemType === "Reusable"
                                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                                          : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
                                      )}
                                    >
                                      {getInventoryItemTypeLabel(
                                        item.itemType,
                                        itemTypeValueMap,
                                      )}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="p-3 text-right text-sm font-bold tracking-tighter tabular-nums">
                                    {(item.quantity ?? 0).toLocaleString(
                                      "vi-VN",
                                    )}{" "}
                                    <span className="font-normal text-muted-foreground">
                                      {item.unit}
                                    </span>
                                  </TableCell>
                                  <TableCell className="p-3 text-right text-sm font-semibold tracking-tighter tabular-nums">
                                    {(item.transferableQuantity ?? 0) > 0 ? (
                                      <span className="text-emerald-700 dark:text-emerald-400">
                                        {(
                                          item.transferableQuantity ?? 0
                                        ).toLocaleString("vi-VN")}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        0
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="p-3 text-right text-sm font-semibold tracking-tighter tabular-nums">
                                    {(item.blockedQuantity ?? 0) > 0 ? (
                                      <span className="text-amber-700 dark:text-amber-400">
                                        {(
                                          item.blockedQuantity ?? 0
                                        ).toLocaleString("vi-VN")}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        0
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="p-3 text-right text-sm tracking-tighter tabular-nums text-muted-foreground">
                                    {formatDepotMetric(
                                      item.volumePerUnit,
                                      "dm3",
                                    )}
                                  </TableCell>
                                  <TableCell className="p-3 text-right text-sm tracking-tighter tabular-nums text-muted-foreground">
                                    {formatDepotMetric(
                                      item.weightPerUnit,
                                      "kg",
                                    )}
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* {("externalItems" in activeClosure
              ? (activeClosure.externalItems?.length ?? 0)
              : 0) > 0 && (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold tracking-tighter">
                      Danh sách xử lý bên ngoài
                    </p>
                    <p className="text-sm text-muted-foreground tracking-tighter">
                      {(
                        ("externalItems" in activeClosure
                          ? activeClosure.externalItems?.length
                          : 0) ?? 0
                      ).toLocaleString("vi-VN")}{" "}
                      mục đã được ghi nhận
                    </p>
                  </div>
                </div>
                <div className="w-full">
                  <div className="px-5 py-3.5 grid grid-cols-1 md:grid-cols-[1.35fr_4fr_1.55fr_1.4fr_1.1fr] gap-4 items-center bg-muted/40 border-b border-border/60 text-sm font-semibold tracking-tighter md:grid">
                    <div>Vật phẩm</div>
                    <div>Cách xử lý</div>
                    <div>Người nhận</div>
                    <div>Số lượng / tổng tiền</div>
                    <div>Xử lý lúc</div>
                  </div>
                  <div className="divide-y divide-border/60">
                    {(
                      ("externalItems" in activeClosure
                        ? activeClosure.externalItems
                        : []) ?? []
                    ).map((item) => {
                      const hm = item.handlingMethod || "";
                      const hmBadgeCls =
                        hm === "DonatedToOrganization"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : hm === "Liquidated"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            : hm === "Destroyed" || hm === "Expired"
                              ? "bg-red-500/10 text-red-700 dark:text-red-400"
                              : hm === "Disposed"
                                ? "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400"
                                : "bg-muted text-muted-foreground";

                      return (
                        <div
                          key={item.id}
                          className="px-5 py-3.5 grid grid-cols-1 md:grid-cols-[1.35fr_4fr_1.55fr_1.4fr_1.1fr] gap-4 items-start hover:bg-muted/30 transition-colors"
                        >
                          <div>
                            <p className="text-xs text-muted-foreground tracking-tighter mb-1 md:hidden">
                              Vật phẩm
                            </p>
                            <p className="text-sm font-semibold tracking-tighter">
                              {item.itemName}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground tracking-tighter mb-1.5 md:hidden">
                              Cách xử lý
                            </p>
                            <Badge
                              className={cn(
                                "h-auto w-fit max-w-full rounded-full border-0 px-3 py-1 text-left text-sm font-semibold leading-5 tracking-tighter shadow-none whitespace-normal wrap-break-words",
                                hmBadgeCls,
                              )}
                            >
                              {item.handlingMethodDisplay ||
                                item.handlingMethod}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground tracking-tighter mb-1 md:hidden">
                              Người nhận
                            </p>
                            <p className="text-sm font-normal tracking-tighter">
                              {item.recipient || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground tracking-tight mb-1 md:hidden">
                              Số lượng / tổng tiền
                            </p>
                            <p className="text-sm font-normal tracking-tighter">
                              {item.quantity.toLocaleString("vi-VN")}{" "}
                              {item.unit} /{" "}
                              {item.totalPrice.toLocaleString("vi-VN")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground tracking-tighter mb-1 md:hidden">
                              Xử lý lúc
                            </p>
                            <p className="text-sm font-normal tracking-tighter">
                              {new Date(item.processedAt).toLocaleString(
                                "vi-VN",
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )} */}
          </>
        )}

        {/* ══ Closure History Table ══ */}
        {activeClosure && depotId > 0 && (
          <DepotClosuresListPanel depotId={depotId} />
        )}

        {/* ══ Active Requests ══ */}
        <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tighter text-slate-950">
                Các đơn tiếp tế trong kho
              </h2>
              <p className="mt-1 text-sm tracking-tighter leading-6 text-slate-600">
                Kiểm tra nhanh các yêu cầu mà kho này đang nhận hoặc đang cấp.
              </p>
            </div>
            <Badge className="rounded-xl border border-border/60 bg-muted/20 px-4 py-2 text-sm font-semibold text-foreground">
              {requests.length > 0
                ? `${requests.length} yêu cầu đang xử lý`
                : "Hiện không có yêu cầu tiếp tế nào."}
            </Badge>
          </div>

          {requests.length === 0 ? (
            <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-14 text-center">
              <Package size={40} className="mb-3 text-slate-300" />
              <p className="text-sm font-normal tracking-tighter text-slate-600">
                Không có yêu cầu nào đang xử lý
              </p>
            </div>
          ) : (
            <div className="mt-5 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
              {requests.map((req) => {
                const isRequester = req.role === "Requester";
                const priorityStyle =
                  req.priorityLevel === "Critical"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : req.priorityLevel === "High"
                      ? "border-orange-200 bg-orange-50 text-orange-700"
                      : req.priorityLevel === "Medium"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-slate-50 text-slate-600";

                return (
                  <Card
                    key={req.id}
                    className="w-[320px] shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-background py-0"
                  >
                    <CardContent className="space-y-3.5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl",
                              isRequester
                                ? "bg-blue-50 text-blue-600"
                                : "bg-emerald-50 text-emerald-600",
                            )}
                          >
                            {isRequester ? (
                              <ArrowFatLinesDown size={18} weight="fill" />
                            ) : (
                              <Truck size={18} weight="fill" />
                            )}
                          </div>
                          <div>
                            <p className="text-base font-semibold tracking-tighter text-slate-950">
                              {isRequester
                                ? "Nhận vật phẩm"
                                : "Tiếp tế vật phẩm"}
                            </p>
                            <p className="text-xs tracking-tighter text-slate-500">
                              Mã yêu cầu #{req.id}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "rounded-md border tracking-tighter px-3 py-1 text-xs font-semibold",
                            priorityStyle,
                          )}
                        >
                          {req.priorityLevel}
                        </span>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <div className="flex items-start gap-2 text-sm">
                          <span
                            className={cn(
                              "flex-1 text-right tracking-tighter font-semibold leading-snug text-slate-700 line-clamp-2",
                              !isRequester && "text-slate-950",
                            )}
                          >
                            {req.sourceDepotName}
                          </span>
                          <ArrowRight
                            size={14}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />
                          <span
                            className={cn(
                              "flex-1 font-semibold tracking-tighter leading-snug text-slate-700 line-clamp-2",
                              isRequester && "text-slate-950",
                            )}
                          >
                            {req.requestingDepotName}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border/60 p-3">
                          <p className="font-semibold text-xs uppercase tracking-tighter text-slate-500">
                            Tình trạng kho nguồn
                          </p>
                          <p className="mt-1 text-sm font-semibold tracking-tight text-slate-900">
                            {req.sourceStatus}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/60 p-3">
                          <p className="font-semibold text-xs uppercase tracking-tighter text-slate-500">
                            Tình trạng kho nhận
                          </p>
                          <p className="mt-1 text-sm font-semibold tracking-tighter text-slate-900">
                            {req.requestingStatus}
                          </p>
                        </div>
                      </div>

                      <div className="border-t text-xs tracking-tighter border-slate-100 pt-3 text-slate-500">
                        Tạo lúc{" "}
                        <span className="font-semibold text-xs tracking-tighter text-slate-900">
                          {new Date(req.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════
          Dialog: Initiate Closure
      ═══════════════════════════════════ */}
      <Dialog
        open={initiateOpen}
        onOpenChange={(o) => {
          if (!o) {
            setInitiateOpen(false);
            setInitiateStep(1);
            // Do not clear initiateResult — closureId is still needed for the detail query
            resetTransferAssignments();
            setIsTransferDialogExpanded(false);
          }
        }}
      >
        <DialogContent
          className={
            initiateStep === 2
              ? cn(transferDialogClassName, "flex flex-col p-0 gap-0")
              : "gap-2 sm:max-w-md"
          }
        >
          {initiateStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl tracking-tighter">
                  Xác nhận đóng kho
                </DialogTitle>
                <DialogDescription className="tracking-tighter">
                  Bạn có chắc chắn muốn đóng kho{" "}
                  <span className="text-primary font-semibold">
                    {depot.name}
                  </span>
                  ?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-muted-foreground" />
                    <span className="text-sm tracking-tighter text-muted-foreground">
                      Tồn kho hiện tại
                    </span>
                  </div>
                  <span className="text-sm font-bold tracking-tighter">
                    {formatDepotMetric(depot.currentUtilization, "dm3")} /{" "}
                    {formatDepotMetric(depot.capacity, "dm3")}
                  </span>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                  <WarningCircle
                    size={16}
                    className="mt-0.5 shrink-0 text-amber-500"
                    weight="fill"
                  />
                  <p className="text-sm leading-relaxed tracking-tighter text-amber-800 dark:text-amber-300">
                    Sau khi xác nhận, hệ thống sẽ chuyển kho sang trạng thái{" "}
                    <strong>Đóng kho</strong> và bắt đầu quy trình đóng kho. Kho
                    sẽ không thể hoạt động lại như trước, nên mọi thao tác tiếp
                    theo đều có thể ảnh hưởng đến toàn hệ thống.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="initiate-reason"
                    className="text-sm font-semibold tracking-tighter"
                  >
                    Lý do đóng kho <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="initiate-reason"
                    placeholder="Nhập lý do đóng kho..."
                    value={initiateReason}
                    onChange={(e) => setInitiateReason(e.target.value)}
                    rows={3}
                    className="text-sm tracking-tighter resize-none mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="tracking-tighter"
                  onClick={() => setInitiateOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  className="tracking-tighter gap-1.5"
                  disabled={
                    !initiateReason.trim() || initiateClosingMutation.isPending
                  }
                  onClick={handleInitiate}
                >
                  {initiateClosingMutation.isPending && (
                    <Spinner size={13} className="animate-spin" />
                  )}
                  Xác nhận đóng kho
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <button
                type="button"
                aria-label={
                  isTransferDialogExpanded
                    ? "Thu gọn cửa sổ xử lý tồn kho"
                    : "Mở rộng cửa sổ xử lý tồn kho"
                }
                className="absolute right-12 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground/80 opacity-70 ring-offset-background transition hover:text-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() =>
                  setIsTransferDialogExpanded((current) => !current)
                }
              >
                {isTransferDialogExpanded ? (
                  <ArrowsInIcon className="h-5 w-5" />
                ) : (
                  <ArrowsOutIcon className="h-5 w-5" />
                )}
              </button>
              <div className="flex min-h-0 flex-1 flex-col">
                <DialogHeader className="border-b border-border/60 px-6 py-4 sm:px-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pr-16 sm:pr-20">
                    <div className="min-w-0">
                      <DialogTitle className="flex items-center gap-2 tracking-tighter text-amber-600 dark:text-amber-400">
                        <HourglassHigh size={18} weight="fill" />
                        Kho còn hàng — Vui lòng xử lý tồn kho
                      </DialogTitle>
                      <DialogDescription className="mt-1 tracking-tighter">
                        Kho đã chuyển sang trạng thái{" "}
                        <span className="font-semibold text-red-500">
                          Đang đóng.
                        </span>{" "}
                        Vui lòng chọn phương án xử lý hàng tồn kho.
                      </DialogDescription>
                    </div>

                    <div className="shrink-0 md:text-right">
                      <p className="text-xs font-bold uppercase tracking-tight text-amber-600/80 dark:text-amber-400/80 mb-0.5">
                        Tồn kho
                      </p>
                      {initiateResult?.inventorySummary ? (
                        <div className="space-y-0 text-amber-900 dark:text-amber-200">
                          <p className="text-sm tracking-tighter">
                            <strong className="text-base">
                              {initiateResult.inventorySummary.consumableUnitTotal.toLocaleString(
                                "vi-VN",
                              )}
                            </strong>{" "}
                            vật phẩm tiêu thụ
                          </p>
                          <p className="text-sm tracking-tighter">
                            <strong className="text-base">
                              {initiateResult.inventorySummary.reusableAvailableCount.toLocaleString(
                                "vi-VN",
                              )}
                            </strong>{" "}
                            tb sẵn sàng
                          </p>
                          <p className="text-sm tracking-tighter">
                            <strong className="text-base">
                              {initiateResult.inventorySummary.reusableInUseCount.toLocaleString(
                                "vi-VN",
                              )}
                            </strong>{" "}
                            tb đang dùng
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center md:justify-end gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-2.5 py-1 text-amber-900 dark:text-amber-200">
                          <strong className="text-xl tracking-tighter">
                            {depot.currentUtilization.toLocaleString("vi-VN")}
                          </strong>
                          <span className="text-sm tracking-tighter pt-0.5">
                            vật phẩm
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-6 pt-1 sm:pt-2 pb-3 sm:pb-4">
                  <div className="space-y-4">
                    {/* Resolution type */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold tracking-tighter">
                        Phương án xử lý <span className="text-red-500">*</span>
                      </Label>
                      <div className="mt-1 grid gap-2 md:grid-cols-2">
                        {resolutionTypes.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() =>
                              setResolutionType(
                                opt.key as typeof resolutionType,
                              )
                            }
                            className={cn(
                              "flex h-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                              resolutionType === opt.key
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "border-border/60 hover:border-border hover:bg-muted/30",
                            )}
                          >
                            <div
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                resolutionType === opt.key
                                  ? "bg-primary/10"
                                  : "bg-muted",
                              )}
                            >
                              {opt.key === "TransferToDepot" ? (
                                <Icon
                                  icon="material-symbols:delivery-truck-bolt-outline-rounded"
                                  width="24"
                                  height="24"
                                  className={
                                    resolutionType === opt.key
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  }
                                />
                              ) : (
                                <Icon
                                  icon="mdi:human-hand-truck"
                                  width="24"
                                  height="24"
                                  className={
                                    resolutionType === opt.key
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  }
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold tracking-tighter">
                                {opt.value}
                              </p>
                              <p className="text-xs text-muted-foreground tracking-tighter mt-0.5">
                                {opt.key === "TransferToDepot"
                                  ? "Phân bổ vật phẩm sang một hoặc nhiều kho đích"
                                  : "Đóng kho ngay, ghi lại cách xử lý bên ngoài"}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {resolutionType === "TransferToDepot" &&
                      renderTransferAssignmentsEditor("dialog")}
                    {resolutionType === "ExternalResolution" && (
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="ext-note-inline"
                          className="text-sm font-semibold tracking-tighter"
                        >
                          Ghi chú cách xử lý{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="ext-note-inline"
                          placeholder="Mô tả cách xử lý tồn kho bên ngoài..."
                          value={externalNote}
                          onChange={(e) => setExternalNote(e.target.value)}
                          rows={2}
                          className="text-sm tracking-tighter resize-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter className="border-t border-border/60 px-6 py-4 sm:px-7">
                  <Button
                    variant="ghost"
                    className="tracking-tighter text-muted-foreground"
                    onClick={() => {
                      setInitiateOpen(false);
                      setInitiateStep(1);
                      setIsTransferDialogExpanded(false);
                    }}
                  >
                    Xử lý sau
                  </Button>
                  <Button
                    className="tracking-tighter gap-1.5"
                    disabled={
                      resolveActionPending ||
                      (resolutionType === "TransferToDepot" &&
                        !closureInventoryItems.length) ||
                      (resolutionType === "ExternalResolution" &&
                        !externalNote.trim())
                    }
                    onClick={handleResolveInDialog}
                  >
                    {resolveActionPending && (
                      <Spinner size={13} className="animate-spin" />
                    )}
                    Xử lý ngay
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════
          Dialog: Resolve Closure
      ═══════════════════════════════════ */}
      <Dialog
        open={resolveOpen}
        onOpenChange={(o) => {
          if (!o) {
            setResolveOpen(false);
            resetTransferAssignments();
            setIsTransferDialogExpanded(false);
          }
        }}
      >
        <DialogContent
          className={cn(
            "flex flex-col p-0 gap-0",
            resolutionType === "TransferToDepot"
              ? transferDialogClassName
              : "w-[min(100vw-2rem,960px)] sm:max-w-[960px] max-h-[90vh]",
          )}
        >
          {resolutionType === "TransferToDepot" && (
            <button
              type="button"
              aria-label={
                isTransferDialogExpanded
                  ? "Thu gọn cửa sổ xử lý tồn kho"
                  : "Mở rộng cửa sổ xử lý tồn kho"
              }
              className="absolute right-12 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground/80 transition hover:text-foreground"
              onClick={() => setIsTransferDialogExpanded((current) => !current)}
            >
              {isTransferDialogExpanded ? (
                <ArrowsInIcon className="h-6 w-6" />
              ) : (
                <ArrowsOutIcon className="h-6 w-6" />
              )}
            </button>
          )}
          <div className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="border-b border-border/60 px-6 py-5 sm:px-7">
              <div className="min-w-0 pr-10">
                <DialogTitle className="flex items-center gap-2 tracking-tighter">
                  <WarehouseIcon size={18} className="text-blue-500" />
                  Xử lý tồn kho
                </DialogTitle>
                <DialogDescription className="mt-1 tracking-tighter">
                  Kho: <strong>{depot.name}</strong> — chọn phương án xử lý hàng
                  trước khi đóng kho chính thức.
                </DialogDescription>
              </div>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-6 py-5 sm:px-7">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold tracking-tighter">
                    Phương án xử lý <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {resolutionTypes.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() =>
                          setResolutionType(opt.key as typeof resolutionType)
                        }
                        className={cn(
                          "flex h-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                          resolutionType === opt.key
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border/60 hover:border-border hover:bg-muted/30",
                        )}
                      >
                        <div
                          className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                            resolutionType === opt.key
                              ? "bg-primary/10"
                              : "bg-muted",
                          )}
                        >
                          {opt.key === "TransferToDepot" ? (
                            <Icon
                              icon="material-symbols:delivery-truck-bolt-outline-rounded"
                              width="24"
                              height="24"
                              className={
                                resolutionType === opt.key
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }
                            />
                          ) : (
                            <Icon
                              icon="mdi:human-hand-truck"
                              width="24"
                              height="24"
                              className={
                                resolutionType === opt.key
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold tracking-tighter">
                            {opt.value}
                          </p>
                          <p className="text-sm text-muted-foreground tracking-tight mt-0.5">
                            {opt.key === "TransferToDepot"
                              ? "Phân bổ vật phẩm sang một hoặc nhiều kho đích"
                              : "Admin ghi lại cách xử lý bên ngoài"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {resolutionType === "TransferToDepot" &&
                  renderTransferAssignmentsEditor("inline")}
                {resolutionType === "ExternalResolution" && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="ext-note"
                      className="text-sm font-semibold tracking-tighter"
                    >
                      Ghi chú cách xử lý <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="ext-note"
                      placeholder="Mô tả cách xử lý tồn kho bên ngoài..."
                      value={externalNote}
                      onChange={(e) => setExternalNote(e.target.value)}
                      rows={3}
                      className="text-sm tracking-tight resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="border-t border-border/60 px-6 py-4 sm:px-7">
              <Button
                variant="outline"
                className="tracking-tighter"
                onClick={() => {
                  setResolveOpen(false);
                  setIsTransferDialogExpanded(false);
                }}
              >
                Hủy
              </Button>
              <Button
                className="tracking-tight gap-1.5"
                disabled={
                  resolveActionPending ||
                  (resolutionType === "TransferToDepot" &&
                    !closureInventoryItems.length) ||
                  (resolutionType === "ExternalResolution" &&
                    !externalNote.trim())
                }
                onClick={handleResolve}
              >
                {resolveActionPending && (
                  <Spinner size={13} className="animate-spin" />
                )}
                Xác nhận xử lý
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={managerDialogOpen}
        onOpenChange={(open) => {
          setManagerDialogOpen(open);
          if (!open) {
            setSelectedAssignManagerIds([]);
            setAssignSelectionId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tighter">
              Thêm quản kho
            </DialogTitle>
            <DialogDescription className="tracking-tighter">
              Nếu quản kho đang được gán ở kho khác, hệ thống sẽ giữ nguyên kho
              cũ và thêm quản kho này vào kho hiện tại.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="tracking-tighter">Kho hiện tại</Label>
              <div className="text-sm tracking-tight rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
                {depot.name}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="tracking-tighter">Chọn quản kho cần thêm</Label>
              <Select
                value={assignSelectionId || "__none"}
                onValueChange={handleAddManagerToAssignList}
                disabled={availableManagers.length === 0}
              >
                <SelectTrigger className="w-full tracking-tighter">
                  <SelectValue placeholder="Chọn quản kho cần thêm" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={4}
                  avoidCollisions={false}
                  className="z-[10000] w-(--radix-select-trigger-width)"
                >
                  <SelectItem value="__none">Chọn quản kho cần thêm</SelectItem>
                  {availableManagers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {`${m.fullName} (${m.phone}) - Hiện quản lý ${m.assignedDepotsCount} kho`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="tracking-tighter">Danh sách sẽ thêm</Label>
              <div className="min-h-16 py-1">
                {selectedAssignManagers.length === 0 ? (
                  <p className="text-sm tracking-tight text-muted-foreground">
                    Chưa chọn quản kho nào.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-md border border-border/50 bg-background divide-y divide-border/50">
                    {selectedAssignManagers.map((manager) => (
                      <div
                        key={manager.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-2"
                      >
                        <span className="text-sm tracking-tight text-foreground">
                          {manager.fullName} ({manager.phone || "—"})
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() =>
                            handleRemoveSelectedAssignManager(manager.id)
                          }
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="tracking-tighter"
              onClick={() => setManagerDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className="tracking-tighter"
              disabled={
                selectedAssignManagerIds.length === 0 || isSwitchingManager
              }
              onClick={handleAssignManagers}
            >
              {isSwitchingManager ? "Đang cập nhật..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeManagerDialogOpen}
        onOpenChange={(open) => {
          setRemoveManagerDialogOpen(open);
          if (!open) {
            setSelectedUnassignManagerIds([]);
            setUnassignSelectionId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tighter">Gỡ quản kho</DialogTitle>
            <DialogDescription className="tracking-tighter">
              Chọn một hoặc nhiều quản kho đang active trong kho để gỡ phân
              công.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="tracking-tighter">Kho hiện tại</Label>
              <div className="text-sm tracking-tight rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
                {depot.name}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="tracking-tighter">Chọn quản kho cần gỡ</Label>
              <Select
                value={unassignSelectionId || "__none"}
                onValueChange={handleAddManagerToUnassignList}
                disabled={activeManagersLoading || activeManagers.length === 0}
              >
                <SelectTrigger className="w-full tracking-tighter">
                  <SelectValue placeholder="Chọn quản kho cần gỡ" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={4}
                  avoidCollisions={false}
                  className="z-[10000] w-(--radix-select-trigger-width)"
                >
                  <SelectItem value="__none">Chọn quản kho cần gỡ</SelectItem>
                  {activeManagers.map((manager) => (
                    <SelectItem key={manager.userId} value={manager.userId}>
                      {`${manager.fullName} (${manager.phone || "—"})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="tracking-tighter">Danh sách sẽ gỡ</Label>
              <div className="min-h-16 py-1">
                {selectedUnassignManagers.length === 0 ? (
                  <p className="text-sm tracking-tight text-muted-foreground">
                    Chưa chọn quản kho nào.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-md border border-border/50 bg-background divide-y divide-border/50">
                    {selectedUnassignManagers.map((manager) => (
                      <div
                        key={manager.userId}
                        className="flex items-center justify-between gap-2 px-2.5 py-2"
                      >
                        <span className="text-sm tracking-tight text-foreground">
                          {manager.fullName} ({manager.phone || "—"})
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() =>
                            handleRemoveSelectedUnassignManager(manager.userId)
                          }
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="tracking-tighter"
              onClick={() => setRemoveManagerDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className="tracking-tighter"
              disabled={
                selectedUnassignManagerIds.length === 0 ||
                unassignManagerMutation.isPending
              }
              onClick={handleUnassignManagers}
            >
              {unassignManagerMutation.isPending ? "Đang gỡ..." : "Xác nhận gỡ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmCloseDialogOpen}
        onOpenChange={(open) => {
          if (initiateMutation.isPending) return;
          setConfirmCloseDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md gap-1">
          <DialogHeader>
            <DialogTitle className="tracking-tighter text-emerald-700 dark:text-emerald-400">
              Xác nhận đóng kho vĩnh viễn
            </DialogTitle>
            <DialogDescription className="tracking-tighter leading-6">
              Kho{" "}
              <span className="font-semibold text-foreground">
                {depot?.name ?? `Kho số ${depotId}`}
              </span>{" "}
              sẽ chuyển sang trạng thái đã đóng và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-1">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/20">
              <p className="text-sm font-semibold tracking-tighter text-emerald-800 dark:text-emerald-300">
                Bạn chỉ nên tiếp tục khi mọi hàng tồn đã được xử lý xong.
              </p>
              <p className="mt-1 text-sm tracking-tighter text-emerald-700/80 dark:text-emerald-400/80">
                Sau khi xác nhận, các thao tác vận hành trực tiếp của kho sẽ bị
                khóa.
              </p>
            </div>

            <div className="py-1">
              <Label className="text-sm font-medium tracking-tighter text-foreground/80">
                Lý do đóng kho
              </Label>
              <Textarea
                value={confirmCloseReason}
                onChange={(event) => setConfirmCloseReason(event.target.value)}
                placeholder="Nhập lý do đóng kho"
                className="mt-2 min-h-24 resize-none border-border/60 bg-background tracking-tighter"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="tracking-tighter"
              disabled={initiateMutation.isPending}
              onClick={() => setConfirmCloseDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className="tracking-tighter bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={initiateMutation.isPending}
              onClick={() => void handleConfirmClose()}
            >
              {initiateMutation.isPending ? (
                <Spinner size={16} className="mr-2 animate-spin" />
              ) : (
                <CheckFat size={16} className="mr-2" weight="fill" />
              )}
              Xác nhận đóng kho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
