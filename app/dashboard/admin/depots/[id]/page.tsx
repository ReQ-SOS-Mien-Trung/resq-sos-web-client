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
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  useDepotById,
  useDepots,
  useDepotChangeableStatuses,
  useDepotAvailableManagers,
  useDepotActiveManagers,
  useDepotClosureResolutionMetadata,
  useDepotMetadata,
  useDepotStatuses,
  useAssignDepotManager,
  useUnassignDepotManager,
  useUpdateDepotStatus,
  useInitiateDepotClosure,
  useMarkDepotClosureExternal,
  useInitiateDepotClosureTransfer,
  useDepotClosureTransferSuggestions,
  useDepotClosureByDepotId,
  useDepotClosureDetailByDepotId,
} from "@/services/depot/hooks";
import { useDepotManagers } from "@/services/depot_manager";
import { useInventoryItemTypes } from "@/services/inventory/hooks";
import type {
  DepotClosureRemainingInventoryItem,
  DepotClosureSuggestedTransfer,
  DepotStatus,
  DepotStatusMetadata,
} from "@/services/depot/type";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";

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
  weightPerUnit: number | null;
}

const TRANSFER_ASSIGNMENT_ACCENTS = [
  {
    border: "border-l-sky-500",
    bg: "bg-sky-50/70",
    badge: "bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    border: "border-l-violet-500",
    bg: "bg-violet-50/70",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50/70",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    border: "border-l-amber-500",
    bg: "bg-amber-50/70",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    border: "border-l-rose-500",
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
      const weightRaw = item.weightPerUnit ?? item.WeightPerUnit ?? null;
      const weightPerUnit =
        typeof weightRaw === "number" && Number.isFinite(weightRaw)
          ? weightRaw
          : null;

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

/* ── Transfer status normalizer ────────────────────────────────
 * API mới đã trả enum key tiếng Anh ở field `status`
 * (ví dụ: AwaitingPreparation, Preparing, Shipping...).
 * Giữ map legacy để tương thích dữ liệu cũ nếu còn.
 */
const TRANSFER_STATUS_KEYS = new Set([
  "AwaitingPreparation",
  "Preparing",
  "Shipping",
  "Completed",
  "Received",
  "Cancelled",
]);

const LEGACY_TRANSFER_STATUS_MAP: Record<string, string> = {
  "Chờ chuẩn bị": "AwaitingPreparation",
  "Đang chuẩn bị": "Preparing",
  "Đang vận chuyển": "Shipping",
  "Đã giao": "Completed",
  "Đã hoàn thành": "Completed",
  "Đã nhận": "Received",
  "Đã hủy": "Cancelled",
};

function normalizeTransferStatus(raw: string | undefined | null): string {
  if (!raw) return "AwaitingPreparation";
  if (TRANSFER_STATUS_KEYS.has(raw)) return raw;
  return LEGACY_TRANSFER_STATUS_MAP[raw] ?? raw;
}

/* ── Page ─────────────────────────────────────────────────────── */
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
  const canManageDepotManager =
    depot?.status !== "Closed" && depot?.status !== "Closing";
  const { data: changeableStatusMetadata } = useDepotChangeableStatuses();
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
  const changeableStatusOptions = useMemo<
    Array<{ key: "Available" | "Unavailable" | "Closing"; value: string }>
  >(() => {
    const filtered =
      changeableStatusMetadata?.filter(
        (option) =>
          option.key === "Available" ||
          option.key === "Unavailable" ||
          option.key === "Closing",
      ) ?? [];

    const closingLabel =
      statusMetadata?.find((status) => status.key === "Closing")?.value ??
      "Đang đóng kho";

    if (filtered.length > 0) {
      const normalized = filtered as Array<{
        key: "Available" | "Unavailable" | "Closing";
        value: string;
      }>;

      return normalized.some((option) => option.key === "Closing")
        ? normalized
        : [...normalized, { key: "Closing", value: closingLabel }];
    }

    return [
      { key: "Available", value: "Đang hoạt động" },
      { key: "Unavailable", value: "Ngưng hoạt động" },
      { key: "Closing", value: closingLabel },
    ];
  }, [changeableStatusMetadata, statusMetadata]);

  const statusCfg = buildStatusCfg(statusMetadata);
  const listDepot = allDepotsData?.items.find((d) => d.id === depotId);
  const requests = listDepot?.requests ?? depot?.requests ?? [];

  /* ── State ── */
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [initiateStep, setInitiateStep] = useState<1 | 2>(1);
  const [initiateReason, setInitiateReason] = useState("");
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
  const [isTransferDialogExpanded, setIsTransferDialogExpanded] =
    useState(false);
  const [hasAppliedTransferSuggestions, setHasAppliedTransferSuggestions] =
    useState(false);
  const [externalNote, setExternalNote] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [unassignSelectionId, setUnassignSelectionId] = useState("");
  const [selectedUnassignManagerIds, setSelectedUnassignManagerIds] = useState<
    string[]
  >([]);
  const [isSwitchingManager, setIsSwitchingManager] = useState(false);
  const initiateMutation = useInitiateDepotClosure();
  const markExternalMutation = useMarkDepotClosureExternal();
  const initiateTransferMutation = useInitiateDepotClosureTransfer();
  const updateStatusMutation = useUpdateDepotStatus();
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
  const activeTransfer = activeClosure?.transferDetail ?? null;
  const activeTransferId = activeTransfer?.id ?? null;
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

  const currentTransferStatus = normalizeTransferStatus(activeTransfer?.status);
  const shouldShowResolveButton = Boolean(
    depot?.status === "Closing" &&
    hasRenderableActiveClosure &&
    !activeTransfer &&
    !activeClosure.resolutionType,
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
            value: "Tự xử lý bên ngoài (admin ghi chú cách xử lý)",
          },
        ];
  const resolveActionPending =
    markExternalMutation.isPending || initiateTransferMutation.isPending;

  const closureInventoryItems = useMemo(
    () =>
      normalizeClosureInventoryItems(
        initiateResult?.remainingInventoryItems ??
          activeClosure?.remainingInventoryItems ??
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
  const targetDepotChoices = useMemo(
    () =>
      depotOptions.filter((option) => option.key !== (depot?.id ?? depotId)),
    [depot?.id, depotId, depotOptions],
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

    return Array.from(map.values()).sort((a, b) =>
      a.value.localeCompare(b.value, "vi"),
    );
  }, [depot?.id, depotId, targetDepotChoices, transferSuggestions]);

  const resetTransferAssignments = useCallback(
    (inventoryItems: ClosureInventoryOption[] = closureInventoryItems) => {
      setHasAppliedTransferSuggestions(false);
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
    setTransferAssignments((current) => [
      ...current,
      createTransferAssignmentDraft(closureInventoryItems),
    ]);
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
      }
    }

    const payload = Array.from(assignmentsByTargetDepotId.values()).filter(
      (assignment) => assignment.items.length > 0,
    );

    if (!payload.length) {
      toast.error("Hãy chọn ít nhất một kho đích và một vật phẩm để chuyển.");
      return null;
    }

    return payload;
  }, [
    closureInventoryItems.length,
    closureInventoryMap,
    depotId,
    transferAssignments,
  ]);

  const renderTransferAssignmentsEditor = useCallback(
    (context: "dialog" | "inline") => {
      const wrapperClassName = context === "dialog" ? "space-y-4" : "space-y-3";
      const sourceGridCols =
        context === "dialog"
          ? "grid-cols-[minmax(0,1.5fr)_140px_140px]"
          : "grid-cols-[minmax(0,1.35fr)_120px_128px]";

      return (
        <div className={wrapperClassName}>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold tracking-tighter">
                  Phân bổ vật phẩm sang nhiều kho đích
                </p>
                <p className="text-xs text-muted-foreground tracking-tighter mt-0.5">
                  Chọn một hoặc nhiều kho nhận, rồi phân chia vật phẩm tồn theo
                  từng kho.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {transferSuggestionsFetching && (
                  <Badge variant="outline" className="gap-1.5 tracking-tighter">
                    <Spinner size={12} className="animate-spin" />
                    Đang lấy gợi ý
                  </Badge>
                )}
                <Badge variant="outline" className="tracking-tighter">
                  {closureInventoryItems.length} vật phẩm nguồn
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 tracking-tighter"
                  disabled={
                    transferSuggestionsFetching || !closureInventoryItems.length
                  }
                  onClick={async () => {
                    const result = await refetchTransferSuggestions();
                    if (result.data) {
                      applyTransferSuggestionsToAssignments(
                        result.data.suggestedTransfers,
                      );
                      toast.success("Đã lấy lại gợi ý phân bổ từ hệ thống.");
                    } else {
                      toast.error(
                        "Chưa lấy được gợi ý. Bạn vẫn có thể phân bổ thủ công.",
                      );
                    }
                  }}
                >
                  {transferSuggestionsFetching ? (
                    <Spinner size={13} className="animate-spin" />
                  ) : (
                    <ArrowClockwise size={13} />
                  )}
                  Lấy gợi ý từ hệ thống
                </Button>
              </div>
            </div>
          </div>

          {Boolean(transferSuggestions?.targetDepotMetrics.length) && (
            <div className="rounded-2xl border border-border/60 bg-background/90 p-3.5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold tracking-tighter">
                    Gợi ý sức chứa kho đích
                  </p>
                  <p className="text-xs text-muted-foreground tracking-tighter mt-0.5">
                    Hệ thống quét phần trống còn lại theo thể tích và cân nặng
                    để đề xuất phương án chuyển kho.
                  </p>
                </div>
                <Badge variant="outline" className="tracking-tighter">
                  {transferSuggestions?.targetDepotMetrics.length ?? 0} kho khả
                  dụng
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {transferSuggestions?.targetDepotMetrics.map((metric, idx) => {
                  const usedPct =
                    metric.capacity > 0
                      ? Math.round(
                          (metric.currentUtilization / metric.capacity) * 100,
                        )
                      : 0;
                  const freePct = 100 - usedPct;
                  const rankColors = [
                    "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20",
                    "border-sky-300 bg-sky-50/60 dark:bg-sky-950/20",
                    "border-violet-300 bg-violet-50/60 dark:bg-violet-950/20",
                  ];
                  const rankBadgeColors = [
                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
                    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
                  ];
                  const barColors = [
                    "bg-emerald-500",
                    "bg-sky-500",
                    "bg-violet-500",
                  ];
                  const colorIdx = idx < 3 ? idx : -1;
                  const cardClass =
                    colorIdx >= 0
                      ? rankColors[colorIdx]
                      : "border-border/60 bg-muted/20";
                  const badgeClass =
                    colorIdx >= 0
                      ? rankBadgeColors[colorIdx]
                      : "bg-muted text-muted-foreground";
                  const barClass =
                    colorIdx >= 0
                      ? barColors[colorIdx]
                      : "bg-muted-foreground/40";

                  return (
                    <div
                      key={metric.depotId}
                      className={cn(
                        "rounded-xl border px-3.5 py-3 transition-shadow hover:shadow-md",
                        cardClass,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="truncate text-sm font-semibold tracking-tighter">
                          {metric.depotName}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            badgeClass,
                          )}
                        >
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Utilization bar */}
                      <div className="mb-2.5">
                        <div className="flex items-center justify-between text-[10px] tracking-wider text-muted-foreground mb-1">
                          <span>Đang dùng {usedPct}%</span>
                          <span className="font-semibold text-foreground">
                            Trống {freePct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              barClass,
                            )}
                            style={{ width: `${freePct}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] tracking-tighter text-muted-foreground tabular-nums">
                          {metric.currentUtilization.toLocaleString("vi-VN")} /{" "}
                          {metric.capacity.toLocaleString("vi-VN")}
                        </p>
                      </div>

                      <div className="grid gap-2 grid-cols-2">
                        <div className="rounded-lg bg-background/70 px-2.5 py-1.5">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            Trống thể tích
                          </p>
                          <p className="mt-0.5 text-sm font-bold tracking-tighter tabular-nums">
                            {metric.remainingVolume.toLocaleString("vi-VN")}
                          </p>
                        </div>
                        <div className="rounded-lg bg-background/70 px-2.5 py-1.5">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            Trống cân nặng
                          </p>
                          <p className="mt-0.5 text-sm font-bold tracking-tighter tabular-nums">
                            {metric.remainingWeight.toLocaleString("vi-VN")}
                          </p>
                        </div>
                      </div>
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
                <div className="space-y-1">
                  <p className="text-sm font-semibold tracking-tighter">
                    Hệ thống chưa đủ không gian để phân bổ hết hàng tồn kho
                  </p>
                  <p className="text-xs tracking-tighter leading-5 text-red-800/90">
                    Quản trị viên cần giảm số lượng, chỉnh lại đề xuất hoặc
                    chuyển sang phương án xử lý bên ngoài cho phần hàng chưa có
                    chỗ chứa phù hợp.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge
                      variant="outline"
                      className="border-red-300 bg-white/70 tracking-tighter text-red-700"
                    >
                      Thể tích dôi:{" "}
                      {(
                        transferSuggestions?.unallocatedVolume ?? 0
                      ).toLocaleString("vi-VN")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-red-300 bg-white/70 tracking-tighter text-red-700"
                    >
                      Cân nặng dôi:{" "}
                      {(
                        transferSuggestions?.unallocatedWeight ?? 0
                      ).toLocaleString("vi-VN")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-red-300 bg-white/70 tracking-tighter text-red-700"
                    >
                      {unallocatedSuggestedTransfers.length} dòng chưa phân bổ
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {transferSuggestionsError && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 text-sm tracking-tighter text-amber-800">
              Không lấy được gợi ý từ hệ thống. Bạn vẫn có thể phân bổ thủ công
              bằng form bên dưới.
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
                  <div className="rounded-2xl border border-red-200 bg-red-50/60 p-3.5">
                    <div className="mb-2">
                      <p className="text-sm font-semibold tracking-tighter text-red-700">
                        Chưa phân bổ được
                      </p>
                      <p className="text-xs tracking-tighter text-red-600/90 mt-0.5">
                        Các dòng dưới đây đang được AI đánh dấu là chưa tìm thấy
                        kho đích phù hợp. Chúng sẽ không được gửi vào payload
                        chuyển kho cho đến khi bạn tự phân bổ sang kho đích hợp
                        lệ.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {unallocatedSuggestedTransfers.map((item, index) => (
                        <div
                          key={`unallocated-${item.itemModelId}-${item.itemType}-${index}`}
                          className="rounded-xl border border-red-200 bg-white/80 px-3 py-2.5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold tracking-tighter text-red-900">
                                {item.itemName}
                              </p>
                              <p className="text-xs tracking-tighter text-red-700/80 mt-0.5">
                                {item.itemType}
                                {item.unit ? ` · Đơn vị: ${item.unit}` : ""}
                              </p>
                            </div>
                            <div className="grid gap-1 text-right text-xs tracking-tighter text-red-800 sm:text-sm">
                              <span>
                                SL đề xuất dôi:{" "}
                                <strong>
                                  {item.suggestedQuantity.toLocaleString(
                                    "vi-VN",
                                  )}
                                  {item.unit ? ` ${item.unit}` : ""}
                                </strong>
                              </span>
                              <span>
                                Thể tích:{" "}
                                <strong>
                                  {item.totalVolume.toLocaleString("vi-VN")}
                                </strong>
                              </span>
                              <span>
                                Cân nặng:{" "}
                                <strong>
                                  {item.totalWeight.toLocaleString("vi-VN")}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="space-y-3">
                {transferAssignments.map((assignment, assignmentIndex) =>
                  (() => {
                    const selectedTargetDepotIds = new Set(
                      transferAssignments
                        .filter(
                          (otherAssignment) =>
                            otherAssignment.id !== assignment.id &&
                            otherAssignment.targetDepotId,
                        )
                        .map(
                          (otherAssignment) => otherAssignment.targetDepotId,
                        ),
                    );
                    const availableTargetDepotChoices = Array.from(
                      new Map(
                        mergedTargetDepotChoices
                          .filter(
                            (option) =>
                              String(option.key) === assignment.targetDepotId ||
                              !selectedTargetDepotIds.has(String(option.key)),
                          )
                          .map(
                            (option) => [String(option.key), option] as const,
                          ),
                      ).values(),
                    );

                    return (
                      <div
                        key={assignment.id}
                        className={cn(
                          "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm",
                          "border-l-4",
                          TRANSFER_ASSIGNMENT_ACCENTS[
                            assignmentIndex % TRANSFER_ASSIGNMENT_ACCENTS.length
                          ]?.border,
                        )}
                      >
                        <div
                          className={cn(
                            "flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3",
                            TRANSFER_ASSIGNMENT_ACCENTS[
                              assignmentIndex %
                                TRANSFER_ASSIGNMENT_ACCENTS.length
                            ]?.bg,
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold tracking-tighter">
                                Kho đích #{assignmentIndex + 1}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "tracking-tighter",
                                  TRANSFER_ASSIGNMENT_ACCENTS[
                                    assignmentIndex %
                                      TRANSFER_ASSIGNMENT_ACCENTS.length
                                  ]?.badge,
                                )}
                              >
                                {
                                  assignment.items.filter(
                                    (item) => Number(item.quantity) > 0,
                                  ).length
                                }{" "}
                                vật phẩm đã chọn
                              </Badge>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            disabled={transferAssignments.length === 1}
                            onClick={() =>
                              removeTransferAssignment(assignment.id)
                            }
                          >
                            <Trash size={14} />
                          </Button>
                        </div>

                        <div className="space-y-3 px-4 py-3">
                          <div className="grid gap-3 xl:grid-cols-[minmax(0,280px)_1fr] xl:items-end">
                            <div className="space-y-1.5">
                              <Label className="text-sm font-semibold tracking-tighter">
                                Kho nhận hàng{" "}
                                <span className="text-red-500">*</span>
                              </Label>
                              <Select
                                value={assignment.targetDepotId}
                                onValueChange={(value) =>
                                  updateTransferAssignmentTarget(
                                    assignment.id,
                                    value,
                                  )
                                }
                              >
                                <SelectTrigger className="w-full text-sm tracking-tighter">
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
                                  {availableTargetDepotChoices.map((option) => (
                                    <SelectItem
                                      key={option.key}
                                      value={String(option.key)}
                                      className="text-sm tracking-tighter"
                                    >
                                      {option.value}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-3">
                              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                                <p className="text-xs font-medium tracking-tighter">
                                  Tổng mặt hàng
                                </p>
                                <p className="text-base font-semibold tracking-tighter">
                                  {closureInventoryItems.length.toLocaleString(
                                    "vi-VN",
                                  )}
                                </p>
                              </div>
                              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                                <p className="text-xs font-medium tracking-tighter">
                                  Đã nhập số lượng
                                </p>
                                <p className="text-base font-semibold tracking-tighter">
                                  {assignment.items
                                    .filter((item) => Number(item.quantity) > 0)
                                    .length.toLocaleString("vi-VN")}
                                </p>
                              </div>
                              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                                <p className="text-xs font-medium tracking-tighter">
                                  Tổng đơn vị chuyển
                                </p>
                                <p className="text-base font-semibold tracking-tighter tabular-nums">
                                  {assignment.items
                                    .reduce((sum, item) => {
                                      const quantity = Number(item.quantity);
                                      return (
                                        sum +
                                        (Number.isFinite(quantity)
                                          ? quantity
                                          : 0)
                                      );
                                    }, 0)
                                    .toLocaleString("vi-VN")}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-xl border border-border/60">
                            <div
                              className={cn(
                                "grid gap-3 border-b border-border/60 bg-muted/30 px-3 py-2 text-xs font-normal tracking-tighter",
                                sourceGridCols,
                              )}
                            >
                              <span>Vật phẩm nguồn</span>
                              <span>Có thể chuyển</span>
                              <span>Số lượng</span>
                            </div>
                            <div className="divide-y divide-border/50">
                              {closureInventoryItems.map((inventoryItem) => {
                                const assignmentItem =
                                  assignment.items.find(
                                    (item) =>
                                      item.itemKey === inventoryItem.itemKey,
                                  ) ?? null;
                                const remainingQuantity = Math.max(
                                  inventoryItem.transferableQuantity -
                                    getAssignedQuantityExcludingRow(
                                      inventoryItem.itemKey,
                                      assignment.id,
                                    ),
                                  0,
                                );

                                return (
                                  <div
                                    key={`${assignment.id}-${inventoryItem.itemKey}`}
                                    className={cn(
                                      "grid items-center gap-3 px-3 py-2.5",
                                      sourceGridCols,
                                    )}
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold tracking-tighter text-foreground">
                                        {inventoryItem.itemName}
                                      </p>
                                      <p className="truncate text-xs tracking-tighter text-muted-foreground">
                                        {itemTypes.find(
                                          (t) =>
                                            String(t.key) ===
                                            String(inventoryItem.itemType),
                                        )?.value ?? inventoryItem.itemType}
                                        {inventoryItem.unit
                                          ? ` · Đơn vị: ${inventoryItem.unit}`
                                          : ""}
                                        {inventoryItem.categoryName
                                          ? ` · Danh mục: ${inventoryItem.categoryName}`
                                          : ""}
                                        {inventoryItem.weightPerUnit != null
                                          ? ` · Khối lượng: ${inventoryItem.weightPerUnit.toLocaleString("vi-VN")} kg/đv`
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
                                      <p className="text-xs tracking-tighter text-muted-foreground">
                                        Tồn gốc{" "}
                                        {inventoryItem.stockQuantity.toLocaleString(
                                          "vi-VN",
                                        )}
                                      </p>
                                    </div>
                                    <Input
                                      inputMode="numeric"
                                      value={assignmentItem?.quantity ?? ""}
                                      onChange={(event) =>
                                        updateTransferAssignmentQuantity(
                                          assignment.id,
                                          inventoryItem.itemKey,
                                          event.target.value,
                                        )
                                      }
                                      placeholder="0"
                                      className="h-9 text-sm tracking-tighter tabular-nums"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })(),
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                className="gap-1.5 tracking-tighter"
                onClick={addTransferAssignment}
              >
                <Plus size={14} />
                Thêm kho đích
              </Button>
            </>
          )}
        </div>
      );
    },
    [
      addTransferAssignment,
      applyTransferSuggestionsToAssignments,
      closureInventoryItems,
      getAssignedQuantityExcludingRow,
      hasUnallocatedSuggestion,
      itemTypes,
      mergedTargetDepotChoices,
      removeTransferAssignment,
      refetchTransferSuggestions,
      transferSuggestions?.targetDepotMetrics,
      transferSuggestions?.unallocatedVolume,
      transferSuggestions?.unallocatedWeight,
      transferSuggestionsError,
      transferSuggestionsFetching,
      transferAssignments,
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

  async function handleSwitchManager() {
    if (!depot || !selectedManagerId) {
      toast.error("Vui lòng chọn quản kho.");
      return;
    }

    try {
      setIsSwitchingManager(true);

      await assignManagerMutation.mutateAsync({
        id: depot.id,
        managerId: selectedManagerId,
      });

      toast.success("Đã cập nhật quản kho thành công.");
      setManagerDialogOpen(false);
      setSelectedManagerId("");
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
    nextStatus: "Available" | "Unavailable" | "Closing",
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
          : nextStatus === "Closing"
            ? "Đã chuyển kho sang trạng thái đang đóng kho."
            : "Đã mở lại trạng thái hoạt động cho kho.",
      );
      handleRefresh();
    } catch (err) {
      toast.error(getApiError(err, "Cập nhật trạng thái kho thất bại."));
    }
  }

  function handleInitiate() {
    if (!depot || !initiateReason.trim()) return;
    initiateMutation.mutate(
      { id: depot.id, reason: initiateReason.trim() },
      {
        onSuccess: (res) => {
          const requiresResolution =
            res.httpStatus === 409 || Boolean(res.requiresResolution);
          const closureStatus =
            res.closureStatus ??
            (requiresResolution ? "InProgress" : "Completed");
          const closingTimeoutAt =
            res.closingTimeoutAt ?? res.timeoutAt ?? null;

          if (requiresResolution) {
            const normalizedRemainingInventoryItems =
              normalizeClosureInventoryItems(
                res.remainingInventoryItems ?? res.remainingItems ?? [],
              );
            setInitiateResult({
              closureId: res.closureId ?? 0,
              closureStatus,
              closingTimeoutAt,
              timeoutAt: res.timeoutAt ?? null,
              inventorySummary: res.inventorySummary ?? null,
              remainingInventoryItems:
                res.remainingInventoryItems ?? res.remainingItems ?? [],
            });
            setResolutionType("TransferToDepot");
            resetTransferAssignments(normalizedRemainingInventoryItems);
            setExternalNote("");
            setIsTransferDialogExpanded(false);
            setInitiateStep(2);
            handleRefresh();
          } else {
            setInitiateOpen(false);
            setInitiateStep(1);
            setInitiateResult(null);
            setIsTransferDialogExpanded(false);

            if (closureStatus === "Processing") {
              toast.info(
                "Hệ thống đang xử lý phiên đóng kho. Màn hình sẽ cập nhật ngay khi sẵn sàng.",
              );
            } else if (closureStatus === "TransferPending") {
              toast.success(
                "Đã chọn chuyển kho. Đang chờ hai bên quản lý kho xác nhận giao nhận.",
              );
            } else if (closureStatus === "Completed") {
              toast.success("Kho trống — đã đóng thành công!");
            } else if (closureStatus === "Cancelled") {
              toast.error("Phiên đóng kho hiện tại đã bị hủy.");
            } else if (closureStatus === "TimedOut") {
              toast.error(
                "Phiên đóng kho đã hết thời hạn và kho đã tự khôi phục.",
              );
            } else {
              toast.success(res.message || "Đã cập nhật trạng thái đóng kho.");
            }

            handleRefresh();
          }
        },
        onError: (err) =>
          toast.error(getApiError(err, "Không thể khởi tạo đóng kho.")),
      },
    );
  }

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
  const barColor =
    pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500";
  const availableCapacity = Math.max(
    0,
    depot.capacity - depot.currentUtilization,
  );
  const closingBannerTheme =
    activeClosureStatus === "Processing" ||
    activeClosureStatus === "TransferPending"
      ? {
          wrapper: "bg-blue-700/95 border-blue-600",
          divider: "bg-blue-500",
          muted: "text-blue-100",
        }
      : {
          wrapper: "bg-red-700/95 border-red-600",
          divider: "bg-red-500",
          muted: "text-red-100",
        };
  const closingBannerLabel =
    activeClosureStatus === "Processing"
      ? "Hệ thống đang xử lý phiên đóng kho"
      : activeClosureStatus === "TransferPending"
        ? "Đã chọn chuyển kho"
        : "Chờ xử lý tồn kho";

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
                  {depot.status === "Closing" ? (
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
                        ) : activeClosureStatus === "TransferPending" ? (
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
                      {activeClosureStatus === "TransferPending" && (
                        <span
                          className={cn(
                            "text-xs font-medium tracking-tighter",
                            closingBannerTheme.muted,
                          )}
                        >
                          Đang chờ hai bên quản lý kho xác nhận giao nhận.
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
                {depot.status !== "Closed" && (
                  <div>
                    <p className="pb-2 font-semibold text-sm uppercase tracking-tighter text-muted-foreground">
                      Chuyển trạng thái kho
                    </p>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedStatus || depot.status}
                        onValueChange={setSelectedStatus}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="h-11! flex-1 rounded-md shadow-none font-medium bg-background border-border/60 py-0">
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          avoidCollisions={false}
                        >
                          {changeableStatusOptions.map((option) => (
                            <SelectItem
                              key={option.key}
                              value={option.key}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full",
                                    option.key === "Available"
                                      ? "bg-emerald-500"
                                      : option.key === "Closing"
                                        ? "bg-red-500"
                                        : "bg-yellow-500",
                                  )}
                                />
                                {option.value}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        className="h-11 px-6 font-semibold tracking-tighter shadow-none shrink-0"
                        variant="default"
                        disabled={
                          updateStatusMutation.isPending ||
                          (selectedStatus || depot.status) === depot.status ||
                          !selectedStatus
                        }
                        onClick={() => {
                          if (
                            selectedStatus &&
                            selectedStatus !== depot.status
                          ) {
                            handleDepotStatusChange(selectedStatus as any);
                          }
                        }}
                      >
                        {updateStatusMutation.isPending && (
                          <Icon
                            icon="line-md:loading-loop"
                            width="16"
                            height="16"
                            className="mr-2"
                          />
                        )}
                        Thực hiện
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
                            setSelectedManagerId("");
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

                  {(depot.status === "Unavailable" ||
                    depot.status === "Closing") && (
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
                      Bắt đầu đóng kho
                    </Button>
                  )}

                  {depot.status === "Closing" && shouldShowResolveButton && (
                    <Button
                      className="h-12 w-full rounded-md bg-foreground px-5 text-base font-semibold text-background hover:bg-foreground/90 shadow-none"
                      onClick={() => {
                        setResolutionType("TransferToDepot");
                        resetTransferAssignments();
                        setExternalNote("");
                        setIsTransferDialogExpanded(false);
                        setResolveOpen(true);
                      }}
                    >
                      <Icon
                        icon="lsicon:goods-outline"
                        width="18"
                        height="18"
                        className="mr-2"
                      />
                      Chọn phương án xử lý tồn kho
                    </Button>
                  )}

                  {depot.status === "Closed" && (
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold tracking-tighter text-slate-900">
                        Kho đã đóng
                      </p>
                      <p className="mt-1 text-sm tracking-tighter leading-6 text-slate-600">
                        Trạng thái kho đã kết thúc. Các thao tác vận hành trực
                        tiếp đang được khóa.
                      </p>
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
                    Tồn kho
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {depot.currentUtilization.toLocaleString("vi-VN")}
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
                    {depot.capacity.toLocaleString("vi-VN")}
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
                    Còn trống
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {availableCapacity.toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-4xl bg-orange-50 text-orange-600">
                  <ArrowFatLinesDown size={20} weight="duotone" />
                </div>
              </div>
              <p className="text-sm tracking-tighter leading-6">
                {pct > 80
                  ? "Kho đang khá đầy, nên chuẩn bị phương án điều phối."
                  : "Kho vẫn còn không gian để tiếp nhận vật phẩm mới."}
              </p>
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
                    const cls =
                      s === "AwaitingPreparation"
                        ? "bg-zinc-100 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                        : s === "Preparing"
                          ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300"
                          : s === "Shipping"
                            ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300"
                            : s === "Completed"
                              ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300"
                              : "bg-muted border-border text-muted-foreground";
                    const lbl: Record<string, string> = {
                      AwaitingPreparation: "Chờ chuẩn bị",
                      Preparing: "Đang chuẩn bị",
                      Shipping: "Đang vận chuyển",
                      Completed: "Chờ xác nhận nhận",
                    };
                    return (
                      <span
                        className={cn(
                          "text-sm font-semibold tracking-tighter px-2 py-1 rounded-md border",
                          cls,
                        )}
                      >
                        {lbl[s] ?? s}
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
                  {[
                    { key: "AwaitingPreparation", label: "Chờ xử lý" },
                    { key: "Preparing", label: "Chuẩn bị" },
                    { key: "Shipping", label: "Đang vận chuyển" },
                    { key: "Completed", label: "Đã giao" },
                    { key: "Received", label: "Đã nhận" },
                  ].map((step, i) => {
                    const order = [
                      "AwaitingPreparation",
                      "Preparing",
                      "Shipping",
                      "Completed",
                      "Received",
                    ];
                    const cur = order.indexOf(currentTransferStatus);
                    const me = order.indexOf(step.key);
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
                        <div className="flex flex-col items-center gap-1.5 shrink-0 w-24">
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
                              "text-xs text-center font-medium leading-tight tracking-tighter whitespace-nowrap",
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
                      label: "Thiết bị tái sử dụng",
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
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold tracking-tighter">
                  Phiên đóng kho{" "}
                  <span className="text-primary">#{activeClosure.id}</span>
                </h2>
                <p className="text-sm text-muted-foreground tracking-tighter mt-0.5">
                  Theo dõi tiến độ xử lý tồn kho và kết quả đóng kho hiện tại.
                </p>
              </div>
              <Badge variant="outline" className="text-sm tracking-tighter">
                {activeClosure.status}
              </Badge>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-tighter text-muted-foreground border-b border-border/60 pb-2">
                    THÔNG TIN PHIÊN ĐÓNG KHO
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start justify-between text-sm gap-4">
                      <span className="text-black dark:text-white font-semibold tracking-tighter whitespace-nowrap">
                        Lý do đóng kho
                      </span>
                      <span className="font-semibold text-right text-amber-700 dark:text-amber-400 tracking-tighter">
                        {activeClosure.closeReason || "—"}
                      </span>
                    </li>
                    <li className="flex items-start justify-between text-sm gap-4">
                      <span className="text-black dark:text-white font-semibold tracking-tighter whitespace-nowrap">
                        Phương án xử lý hàng tồn kho
                      </span>
                      <span className="font-semibold text-right text-blue-700 dark:text-blue-400 tracking-tighter">
                        {activeClosure.resolutionType || "Chưa chọn"}
                      </span>
                    </li>
                    <li className="flex items-start justify-between text-sm gap-4">
                      <span className="text-black dark:text-white font-semibold tracking-tighter whitespace-nowrap">
                        Người khởi tạo
                      </span>
                      <span className="font-semibold text-right text-indigo-700 dark:text-indigo-400 tracking-tighter leading-tight">
                        {activeClosure.initiatedByFullName ||
                          activeClosure.initiatedBy}
                        <span className="block text-xs font-medium text-indigo-700/60 dark:text-indigo-400/60 mt-0.5">
                          {new Date(activeClosure.initiatedAt).toLocaleString(
                            "vi-VN",
                          )}
                        </span>
                      </span>
                    </li>
                    <li className="flex items-start justify-between text-sm gap-4">
                      <span className="text-black dark:text-white font-semibold tracking-tighter whitespace-nowrap">
                        Kho tiếp nhận hàng tồn kho (nếu có)
                      </span>
                      <span className="font-semibold text-right text-emerald-700 dark:text-emerald-400 tracking-tighter">
                        {activeClosure.targetDepotName ||
                          (activeClosure.targetDepotId
                            ? `Kho #${activeClosure.targetDepotId}`
                            : "—")}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="flex-1 space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-tighter text-muted-foreground border-b border-border/60 pb-2">
                    SỐ LIỆU KIỂM KÊ
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-center justify-between text-sm gap-4">
                      <span className="text-black dark:text-white font-semibold tracking-tighter whitespace-nowrap">
                        Số lượng hàng tiêu thụ
                      </span>
                      <span className="font-bold text-base text-rose-700 dark:text-rose-400 tracking-tighter tabular-nums">
                        {(
                          activeClosure.snapshotConsumableUnits ?? 0
                        ).toLocaleString("vi-VN")}
                      </span>
                    </li>
                    <li className="flex items-center justify-between text-sm gap-4">
                      <span className="text-black dark:text-white font-semibold tracking-tighter whitespace-nowrap">
                        Snapshot tái sử dụng
                      </span>
                      <span className="font-bold text-base text-orange-700 dark:text-orange-400 tracking-tighter tabular-nums">
                        {(
                          activeClosure.snapshotReusableUnits ?? 0
                        ).toLocaleString("vi-VN")}
                      </span>
                    </li>
                    <li className="flex items-center justify-between text-sm gap-4">
                      <span className="text-black dark:text-white font-semibold tracking-tighter whitespace-nowrap">
                        Thực tế tiêu thụ
                      </span>
                      <span className="font-bold text-base text-teal-700 dark:text-teal-400 tracking-tighter tabular-nums">
                        {(
                          ("actualConsumableUnits" in activeClosure
                            ? activeClosure.actualConsumableUnits
                            : 0) ?? 0
                        ).toLocaleString("vi-VN")}
                      </span>
                    </li>
                    <li className="flex items-center justify-between text-sm gap-4">
                      <span className="text-black dark:text-white font-semibold tracking-tighter whitespace-nowrap">
                        Thực tế tái sử dụng
                      </span>
                      <span className="font-bold text-base text-purple-700 dark:text-purple-400 tracking-tighter tabular-nums">
                        {(
                          ("actualReusableUnits" in activeClosure
                            ? activeClosure.actualReusableUnits
                            : 0) ?? 0
                        ).toLocaleString("vi-VN")}
                      </span>
                    </li>
                  </ul>
                </div>

                {(activeClosure.externalNote ||
                  activeClosure.driftNote ||
                  activeClosure.failureReason ||
                  activeClosure.forceReason ||
                  activeClosure.cancellationReason) && (
                  <div className="flex-1 space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-tighter text-muted-foreground border-b border-border/60 pb-2">
                      GHI CHÚ & BỔ SUNG
                    </h3>
                    <ul className="space-y-3.5">
                      {activeClosure.externalNote && (
                        <li>
                          <p className="text-sm font-semibold tracking-tighter whitespace-pre-wrap">
                            {activeClosure.externalNote}
                          </p>
                        </li>
                      )}
                      {activeClosure.driftNote && (
                        <li>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                            Drift note
                          </p>
                          <p className="text-sm font-semibold tracking-tighter whitespace-pre-wrap">
                            {activeClosure.driftNote}
                          </p>
                        </li>
                      )}
                      {activeClosure.failureReason && (
                        <li>
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-0.5">
                            Failure reason (Thất bại)
                          </p>
                          <p className="text-sm font-semibold tracking-tighter whitespace-pre-wrap text-red-700 dark:text-red-300">
                            {activeClosure.failureReason}
                          </p>
                        </li>
                      )}
                      {activeClosure.forceReason && (
                        <li>
                          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">
                            Lý do cưỡng chế
                          </p>
                          <p className="text-sm font-semibold tracking-tighter whitespace-pre-wrap text-amber-700 dark:text-amber-400">
                            {activeClosure.forceReason}
                          </p>
                        </li>
                      )}
                      {activeClosure.cancellationReason && (
                        <li>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                            Lý do hủy
                          </p>
                          <p className="text-sm font-semibold tracking-tighter whitespace-pre-wrap">
                            {activeClosure.cancellationReason}
                          </p>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {("externalItems" in activeClosure
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
              )}
            </div>
          </div>
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
            setInitiateResult(null);
            resetTransferAssignments();
            setIsTransferDialogExpanded(false);
          }
        }}
      >
        <DialogContent
          className={
            initiateStep === 2 ? transferDialogClassName : "gap-2 sm:max-w-md"
          }
        >
          {initiateStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl tracking-tighter">
                  Xác nhận đóng kho
                </DialogTitle>
                <DialogDescription className="tracking-tighter">
                  Kho:{" "}
                  <span className="text-primary font-semibold">
                    {depot.name}
                  </span>
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
                    {depot.currentUtilization.toLocaleString("vi-VN")} /{" "}
                    {depot.capacity.toLocaleString("vi-VN")}
                  </span>
                </div>
                {/* {depot.currentUtilization > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <WarningCircle
                      size={15}
                      className="text-amber-500 shrink-0 mt-0.5"
                      weight="fill"
                    />
                    <p className="text-sm text-amber-800 dark:text-amber-300 tracking-tighter leading-relaxed">
                      Kho đang có hàng — sau khi xác nhận sẽ chuyển sang{" "}
                      <strong>Đang đóng</strong>.
                    </p>
                  </div>
                )} */}
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
                    !initiateReason.trim() || initiateMutation.isPending
                  }
                  onClick={handleInitiate}
                >
                  {initiateMutation.isPending && (
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
                className="absolute right-12 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
              <div className="flex h-full max-h-[inherit] min-h-0 flex-col">
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
                <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-1 sm:pt-2 pb-3 sm:pb-4">
                  <div className="space-y-4">
                    {/* Resolution type */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold tracking-tighter">
                        Phương án xử lý <span className="text-red-500">*</span>
                      </Label>
                      <div className="grid gap-2 mt-1">
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
                              "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
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
          className={
            resolutionType === "TransferToDepot"
              ? transferDialogClassName
              : "sm:max-w-lg"
          }
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
          <div className="flex h-full max-h-[inherit] min-h-0 flex-col">
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
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-7">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold tracking-tighter">
                    Phương án xử lý <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid gap-2">
                    {resolutionTypes.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() =>
                          setResolutionType(opt.key as typeof resolutionType)
                        }
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
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
          if (!open) setSelectedManagerId("");
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
              <Label className="tracking-tighter">Chọn quản kho</Label>
              <Select
                value={selectedManagerId || "__none"}
                onValueChange={(value) =>
                  setSelectedManagerId(value === "__none" ? "" : value)
                }
              >
                <SelectTrigger className="w-full tracking-tighter">
                  <SelectValue placeholder="Chọn quản kho" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={4}
                  avoidCollisions={false}
                  className="z-[10000] w-(--radix-select-trigger-width)"
                >
                  <SelectItem value="__none">Chọn quản kho</SelectItem>
                  {availableManagers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {`${m.fullName} (${m.phone}) - ${m.assignedDepotsCount} kho`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              disabled={!selectedManagerId || isSwitchingManager}
              onClick={handleSwitchManager}
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
              <div className="min-h-16 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                {selectedUnassignManagers.length === 0 ? (
                  <p className="text-sm tracking-tight text-muted-foreground">
                    Chưa chọn quản kho nào.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedUnassignManagers.map((manager) => (
                      <div
                        key={manager.userId}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background px-2.5 py-1.5"
                      >
                        <span className="text-sm tracking-tight text-foreground">
                          {manager.fullName} ({manager.phone || "—"})
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() =>
                            handleRemoveSelectedUnassignManager(manager.userId)
                          }
                        >
                          Bỏ
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
    </DashboardLayout>
  );
}
