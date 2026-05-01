import React, { useCallback, useDeferredValue, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Package,
  Calendar,
  HandHeart,
  Tag,
  Wrench,
  CheckCircle,
  WarningCircle,
  XCircle,
  Tray,
  Warning,
  ClockCountdown,
  Trash,
  SpinnerGap,
  Recycle,
  ArrowsIn,
  ArrowsOut,
  DotsThreeVertical,
  ArrowDown,
  ArrowUp,
  ArrowsDownUp,
  CaretDown,
  CaretUp,
  MagnifyingGlass,
  Wrench as MaintenanceIcon,
} from "@phosphor-icons/react";
import { X } from "lucide-react";
import {
  DepotReusableUnitSearchItem,
  InventoryItemEntity,
  InventoryLotItem,
} from "@/services/inventory/type";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import { useInventoryLotsRealtime } from "@/hooks/useInventoryLotsRealtime";
import {
  useInventoryItemTypes,
  useInventoryTargetGroups,
  useInventorySourceTypes,
  useInventoryLots,
  useDisposeLot,
  useDecommissionReusable,
  useReusableItemConditions,
  useReusableItemStatuses,
  useSearchDepotReusableUnits,
  useSetReusableAvailable,
  useSetReusableMaintenance,
} from "@/services/inventory/hooks";
import {
  getInventoryAvailable,
  getInventoryReservedForMission,
  getInventoryReservedForTransfer,
  getInventoryTotal,
  getInventoryTotalReserved,
} from "@/services/inventory/utils";
import { getInventorySourceLabelFallback } from "@/lib/inventory-movement-taxonomy";

interface VatTuDetailsSheetProps {
  item: InventoryItemEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReusableSortColumn =
  | "itemId"
  | "serialNumber"
  | "categoryName"
  | "status"
  | "condition"
  | "note"
  | "updatedAt"
  | "createdAt";
type ReusableSortDir = "asc" | "desc";
type ReusableSortState = {
  column: ReusableSortColumn;
  dir: ReusableSortDir;
} | null;

type ReusableRowAction = "maintenance" | "available" | "decommission";

function normalizeReusableStatusKey(status?: string | null): string {
  return (status ?? "").trim().toLowerCase();
}

function getReusableStatusTone(status?: string | null): string {
  const normalized = normalizeReusableStatusKey(status);

  if (normalized.includes("maint")) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
  if (normalized.includes("decommission")) {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300";
  }
  if (normalized.includes("use") || normalized.includes("transit")) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  }
  if (normalized.includes("reserved") || normalized.includes("reserve")) {
    return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
  }

  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
}

function ReusableSortIcon({
  column,
  sort,
}: {
  column: ReusableSortColumn;
  sort: ReusableSortState;
}) {
  if (sort?.column === column) {
    return sort.dir === "asc" ? (
      <ArrowUp size={13} className="text-primary shrink-0" />
    ) : (
      <ArrowDown size={13} className="text-primary shrink-0" />
    );
  }

  return (
    <ArrowsDownUp size={13} className="text-muted-foreground/30 shrink-0" />
  );
}

function ReusableSortHeader({
  column,
  label,
  sort,
  onSort,
  align = "left",
}: {
  column: ReusableSortColumn;
  label: string;
  sort: ReusableSortState;
  onSort: (column: ReusableSortColumn) => void;
  align?: "left" | "right";
}) {
  return (
    <th className={cn("p-3", align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "flex items-center gap-1 text-sm font-semibold text-foreground tracking-tighter hover:text-foreground/70 transition-colors",
          align === "right" && "ml-auto",
        )}
      >
        {label}
        <ReusableSortIcon column={column} sort={sort} />
      </button>
    </th>
  );
}

export function VatTuDetailsSheet({
  item,
  open,
  onOpenChange,
}: VatTuDetailsSheetProps) {
  const { selectedDepotId } = useManagerDepot();
  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: targetGroupsData } = useInventoryTargetGroups();
  const { data: sourceTypesData = [] } = useInventorySourceTypes();
  const { data: reusableStatusesData = [] } = useReusableItemStatuses();
  const { data: lotsData, isLoading: loadingLots } = useInventoryLots(
    {
      itemModelId: item?.itemModelId ?? 0,
      depotId: selectedDepotId ?? 0,
      pageNumber: 1,
      pageSize: 20,
    },
    { enabled: open && item?.itemType === "Consumable" && !!item?.itemModelId },
  );
  useInventoryLotsRealtime({
    depotId: selectedDepotId,
    itemModelId: item?.itemModelId,
    enabled: open && item?.itemType === "Consumable",
  });

  const itemTypeLabel = (key: string) =>
    itemTypesData?.find((t) => t.key === key)?.value ?? key;
  const targetGroupLabel = (key: string) =>
    targetGroupsData?.find((g) => g.key === key)?.value ?? key;
  const reusableStatusLabel = (key: string) =>
    reusableStatusesData.find((status) => status.key === key)?.value ?? key;
  const sourceTypeLabel = (key: string) =>
    sourceTypesData.find((s) => s.key === key)?.value ??
    getInventorySourceLabelFallback(key);
  const conditionLabel = (key: string) =>
    (reusableConditions ?? []).find((c) => c.key === key)?.value ?? key;

  const [barTooltip, setBarTooltip] = useState<{
    label: string;
    color: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reusableSerialSearch, setReusableSerialSearch] = useState("");
  const deferredReusableSerialSearch = useDeferredValue(
    reusableSerialSearch.trim(),
  );
  const [reusableUnitsPage, setReusableUnitsPage] = useState(1);
  const [reusableUnitsPageSize, setReusableUnitsPageSize] = useState(10);
  const [reusableSort, setReusableSort] = useState<ReusableSortState>(null);

  // ─── Dispose lot state ───
  const [disposeLot, setDisposeLot] = useState<InventoryLotItem | null>(null);
  const [disposeQty, setDisposeQty] = useState("");
  const [disposeReason, setDisposeReason] = useState("");
  const [disposeNote, setDisposeNote] = useState("");
  const disposeMutation = useDisposeLot();
  const decommissionMutation = useDecommissionReusable();
  const maintenanceMutation = useSetReusableMaintenance();
  const availableMutation = useSetReusableAvailable();
  const { data: reusableConditions } = useReusableItemConditions();
  const [reusableActionCondition, setReusableActionCondition] = useState("");
  const [expandedReusableAction, setExpandedReusableAction] = useState<{
    unitId: number;
    action: ReusableRowAction;
  } | null>(null);
  const [reusableActionNote, setReusableActionNote] = useState("");

  const { data: reusableUnitsData, isLoading: loadingReusableUnits } =
    useSearchDepotReusableUnits(
      {
        depotId: selectedDepotId ?? 0,
        itemModelId: item?.itemModelId ?? 0,
        serialNumber: deferredReusableSerialSearch || undefined,
        pageNumber: reusableUnitsPage,
        pageSize: reusableUnitsPageSize,
      },
      {
        enabled:
          open &&
          isFullscreen &&
          item?.itemType === "Reusable" &&
          Boolean(selectedDepotId) &&
          Boolean(item?.itemModelId),
      },
    );

  const openReusableActionDialog = useCallback(
    (action: ReusableRowAction, unit: DepotReusableUnitSearchItem) => {
      setExpandedReusableAction((prev) => {
        if (prev?.unitId === unit.itemId && prev?.action === action)
          return null;
        return { unitId: unit.itemId, action };
      });
      setReusableActionNote("");
      setReusableActionCondition("");
    },
    [],
  );

  const handleReusableSort = useCallback((column: ReusableSortColumn) => {
    setReusableSort((prev) => {
      if (!prev || prev.column !== column) {
        return { column, dir: "asc" };
      }
      if (prev.dir === "asc") {
        return { column, dir: "desc" };
      }
      return null;
    });
  }, []);

  const sortedReusableUnits = useMemo(() => {
    const units = reusableUnitsData?.items ?? [];

    if (!reusableSort) {
      return units;
    }

    return [...units].sort((left, right) => {
      const leftDate = (value?: string) =>
        value ? new Date(value).getTime() : 0;

      let comparison = 0;
      switch (reusableSort.column) {
        case "itemId":
          comparison = left.itemId - right.itemId;
          break;
        case "serialNumber":
          comparison = left.serialNumber.localeCompare(
            right.serialNumber,
            "vi",
          );
          break;
        case "categoryName":
          comparison = left.categoryName.localeCompare(
            right.categoryName,
            "vi",
          );
          break;
        case "status":
          comparison = left.status.localeCompare(right.status, "vi");
          break;
        case "condition":
          comparison = left.condition.localeCompare(right.condition, "vi");
          break;
        case "note":
          comparison = (left.note ?? "").localeCompare(right.note ?? "", "vi");
          break;
        case "updatedAt":
          comparison = leftDate(left.updatedAt) - leftDate(right.updatedAt);
          break;
        case "createdAt":
          comparison = leftDate(left.createdAt) - leftDate(right.createdAt);
          break;
      }

      return reusableSort.dir === "asc" ? comparison : -comparison;
    });
  }, [reusableSort, reusableUnitsData?.items]);

  const isReusableActionPending =
    maintenanceMutation.isPending ||
    availableMutation.isPending ||
    decommissionMutation.isPending;

  const handleReusableAction = useCallback(async () => {
    if (!selectedDepotId || !expandedReusableAction) return;
    const unit = sortedReusableUnits.find(
      (u) => u.itemId === expandedReusableAction.unitId,
    );
    if (!unit) return;

    if (!reusableActionNote.trim()) {
      toast.error("Vui lòng nhập ghi chú cho thao tác này.");
      return;
    }

    if (
      expandedReusableAction.action === "available" &&
      !reusableActionCondition
    ) {
      toast.error("Vui lòng chọn tình trạng vật phẩm.");
      return;
    }

    try {
      if (expandedReusableAction.action === "maintenance") {
        const response = await maintenanceMutation.mutateAsync({
          depotId: selectedDepotId,
          itemId: unit.itemId,
          payload: { note: reusableActionNote.trim() },
        });
        toast.success(response.message ?? "Đã chuyển vật phẩm sang bảo trì.");
      } else if (expandedReusableAction.action === "available") {
        const response = await availableMutation.mutateAsync({
          depotId: selectedDepotId,
          itemId: unit.itemId,
          payload: {
            note: reusableActionNote.trim(),
            condition: reusableActionCondition,
          },
        });
        toast.success(response.message ?? "Đã chuyển vật phẩm sang khả dụng.");
      } else {
        const response = await decommissionMutation.mutateAsync({
          depotId: selectedDepotId,
          itemId: unit.itemId,
          payload: { note: reusableActionNote.trim() },
        });
        toast.success(response.message ?? "Đã tiêu hủy vật phẩm tái sử dụng.");
      }

      setExpandedReusableAction(null);
      setReusableActionNote("");
      setReusableActionCondition("");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message ?? "Không thể cập nhật vật phẩm.",
      );
    }
  }, [
    availableMutation,
    decommissionMutation,
    maintenanceMutation,
    reusableActionCondition,
    expandedReusableAction,
    reusableActionNote,
    selectedDepotId,
    sortedReusableUnits,
  ]);

  const openDispose = useCallback(
    (lot: InventoryLotItem) => {
      const isSameLot = disposeLot?.lotId === lot.lotId;

      setDisposeLot(isSameLot ? null : lot);
      setDisposeQty(
        isSameLot ? "" : lot.isExpired ? String(lot.remainingQuantity) : "",
      );
      setDisposeReason("");
      setDisposeNote("");
    },
    [
      disposeLot?.lotId,
      setDisposeLot,
      setDisposeNote,
      setDisposeQty,
      setDisposeReason,
    ],
  );

  const handleDispose = useCallback(async () => {
    if (!disposeLot || !selectedDepotId) return;

    const qty = disposeLot.isExpired
      ? disposeLot.remainingQuantity
      : Number(disposeQty);

    if (!disposeLot.isExpired) {
      if (!Number.isInteger(qty) || qty <= 0) {
        toast.error("Số lượng phải là số nguyên lớn hơn 0");
        return;
      }
      if (qty > disposeLot.remainingQuantity) {
        toast.error(
          `Số lượng tiêu hủy (${qty}) vượt quá số lượng còn lại (${disposeLot.remainingQuantity})`,
        );
        return;
      }
    }
    if (!disposeReason.trim()) {
      toast.error("Vui lòng nhập lý do");
      return;
    }
    try {
      const res = await disposeMutation.mutateAsync({
        depotId: selectedDepotId,
        lotId: disposeLot.lotId,
        payload: {
          lotId: disposeLot.lotId,
          quantity: qty,
          reason: disposeReason.trim(),
          note: disposeNote.trim() || undefined,
        },
      });
      toast.success(res.message);
      setDisposeLot(null);
      setDisposeQty("");
      setDisposeReason("");
      setDisposeNote("");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Không thể tiêu hủy lô hàng.");
    }
  }, [
    disposeLot,
    disposeQty,
    disposeReason,
    disposeNote,
    disposeMutation,
    selectedDepotId,
    setDisposeLot,
    setDisposeNote,
    setDisposeQty,
    setDisposeReason,
  ]);

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setIsFullscreen(false);
        setDisposeLot(null);
        setDisposeQty("");
        setDisposeReason("");
        setDisposeNote("");
        setReusableSerialSearch("");
        setReusableUnitsPage(1);
        setReusableUnitsPageSize(10);
        setReusableSort(null);
        setExpandedReusableAction(null);
        setReusableActionNote("");
        setReusableActionCondition("");
      }
      onOpenChange(nextOpen);
    },
    [
      onOpenChange,
      setDisposeLot,
      setDisposeNote,
      setDisposeQty,
      setDisposeReason,
      setExpandedReusableAction,
      setIsFullscreen,
      setReusableActionCondition,
      setReusableActionNote,
      setReusableSerialSearch,
      setReusableSort,
      setReusableUnitsPage,
      setReusableUnitsPageSize,
    ],
  );

  if (!item) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Chưa cập nhật";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const totalQty = getInventoryTotal(item);
  const reservedQty = getInventoryTotalReserved(item);
  const availableQty = getInventoryAvailable(item);
  const reservedForMissionQty = getInventoryReservedForMission(item);
  const reservedForTransferQty = getInventoryReservedForTransfer(item);

  const missionPercent =
    totalQty > 0 ? (reservedForMissionQty / totalQty) * 100 : 0;
  const transferPercent =
    totalQty > 0 ? (reservedForTransferQty / totalQty) * 100 : 0;
  const availablePercent = totalQty > 0 ? (availableQty / totalQty) * 100 : 0;
  const reusableBreakdown =
    item.itemType === "Reusable" ? item.reusableBreakdown : null;

  const itemDetailsContent = (
    <div className="grid gap-3">
      <div className="flex items-center tracking-tighter gap-3 text-sm">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground tracking-tighter">
          Phân loại:
        </span>
        <span className="font-medium tracking-tighter">
          {itemTypeLabel(item.itemType)}
        </span>
      </div>
      <div className="flex items-start tracking-tighter gap-3 text-sm">
        <HandHeart className="h-4 w-4 text-muted-foreground mt-0.5" />
        <span className="text-muted-foreground tracking-tighter">
          Đối tượng:
        </span>
        <span className="font-medium tracking-tighter">
          {(item.targetGroups ?? [])
            .map((g) => targetGroupLabel(g))
            .join(", ") || "—"}
        </span>
      </div>
      <div className="flex items-center tracking-tighter gap-3 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground tracking-tighter">
          Lần nhập xuất kho cuối:
        </span>
        <span className="font-medium tracking-tighter">
          {formatDate(item.lastStockedAt)}
        </span>
      </div>
      {item.itemType === "Consumable" && (
        <>
          <div className="flex items-center tracking-tighter gap-3 text-sm">
            <Tray className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground tracking-tighter">
              Số lô hiện tại:
            </span>
            <span className="font-medium tracking-tighter">
              {item.lotCount ?? 0} lô
            </span>
          </div>
          {item.nearestExpiryDate && (
            <div className="flex items-center tracking-tighter gap-3 text-sm">
              <ClockCountdown className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground tracking-tighter">
                Hết hạn gần nhất:
              </span>
              <span
                className={`font-medium tracking-tighter ${item.isExpiringSoon ? "text-amber-600" : ""}`}
              >
                {formatDate(item.nearestExpiryDate)}
                {item.isExpiringSoon && (
                  <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                    <Warning size={10} weight="fill" /> Sắp hết hạn
                  </span>
                )}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent
        showClose={false}
        className={cn(
          "h-dvh bg-background overflow-hidden p-0",
          isFullscreen
            ? "w-[min(96vw,1560px)] sm:max-w-[96vw]"
            : "w-full sm:max-w-xl",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-border/50 px-6 py-4 shrink-0">
            <SheetHeader className="space-y-4 flex-1 min-w-0">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-orange-500/10 text-[#FF5722]">
                  <Package className="h-6 w-6" weight="fill" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <SheetTitle className="text-2xl tracking-tighter">
                    {item.itemModelName}
                  </SheetTitle>
                  <SheetDescription className="flex tracking-tighter items-center gap-2 mt-1">
                    Danh mục:{" "}
                    <span className="font-medium text-sm text-black dark:text-white uppercase tracking-tight">
                      {item.categoryName}
                    </span>
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-left">
                <Badge
                  className={cn(
                    "rounded-none tracking-tighter text-sm text-white",
                    availableQty > 0
                      ? "bg-[#FF5722] hover:bg-[#FF5722]/90 border-transparent"
                      : "bg-red-500 hover:bg-red-500/90 border-transparent",
                  )}
                >
                  {availableQty > 0 ? "Còn Hàng" : "Hết Hàng"}
                </Badge>
              </div>
            </SheetHeader>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 px-3 text-sm tracking-tighter"
                onClick={() => setIsFullscreen((prev) => !prev)}
              >
                {isFullscreen ? (
                  <>
                    <ArrowsIn className="h-4 w-4" />
                    Thu gọn
                  </>
                ) : (
                  <>
                    <ArrowsOut className="h-4 w-4" />
                    Xem chi tiết
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                onClick={() => handleSheetOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <motion.div
            layout
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Stock Level Visual */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium tracking-tighter flex items-center">
                  Tình Trạng Tồn Kho
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-3xl tracking-tighter font-bold">
                      {availableQty.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground tracking-tighter font-medium">
                      / {totalQty.toLocaleString()} (Tổng)
                    </span>
                  </div>

                  {/* Progress bar container */}
                  <div className="relative">
                    <div className="h-4 overflow-hidden rounded-full bg-slate-200/80 p-px">
                      <div className="flex h-full w-full gap-px overflow-hidden rounded-full bg-background/80">
                        {reservedForMissionQty > 0 && (
                          <div
                            className="h-full bg-blue-500 transition-all cursor-crosshair"
                            style={{ width: `${missionPercent}%` }}
                            onMouseMove={(e) =>
                              setBarTooltip({
                                label: "Nhiệm vụ",
                                color: "bg-blue-500",
                                value: reservedForMissionQty,
                                x: e.clientX,
                                y: e.clientY,
                              })
                            }
                            onMouseLeave={() => setBarTooltip(null)}
                          />
                        )}
                        {reservedForTransferQty > 0 && (
                          <div
                            className="h-full bg-emerald-500 transition-all cursor-crosshair"
                            style={{ width: `${transferPercent}%` }}
                            onMouseMove={(e) =>
                              setBarTooltip({
                                label: "Điều chuyển",
                                color: "bg-emerald-500",
                                value: reservedForTransferQty,
                                x: e.clientX,
                                y: e.clientY,
                              })
                            }
                            onMouseLeave={() => setBarTooltip(null)}
                          />
                        )}
                        {availableQty > 0 && (
                          <div
                            className="h-full bg-slate-400 transition-all cursor-crosshair"
                            style={{ width: `${availablePercent}%` }}
                            onMouseMove={(e) =>
                              setBarTooltip({
                                label: "Còn lại",
                                color: "bg-slate-400",
                                value: availableQty,
                                x: e.clientX,
                                y: e.clientY,
                              })
                            }
                            onMouseLeave={() => setBarTooltip(null)}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Floating cursor tooltip — portal to escape Sheet stacking context */}
                  {barTooltip &&
                    typeof window !== "undefined" &&
                    createPortal(
                      <div
                        className="fixed pointer-events-none px-2.5 py-1.5 rounded-lg border bg-popover text-popover-foreground shadow-lg text-xs font-medium tracking-tighter flex items-center gap-1.5"
                        style={{
                          left: barTooltip.x + 12,
                          top: barTooltip.y - 36,
                          zIndex: 99999,
                        }}
                      >
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${barTooltip.color}`}
                        />
                        {barTooltip.label}:{" "}
                        <strong>{barTooltip.value.toLocaleString()}</strong>
                      </div>,
                      document.body,
                    )}

                  <div className="flex justify-between text-sm text-muted-foreground mt-2">
                    <span className="text-slate-700 tracking-tighter font-semibold">
                      Còn lại: {availableQty.toLocaleString()}
                    </span>
                    <span className="text-slate-600 tracking-tighter font-semibold">
                      Đã phân bổ: {reservedQty.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 tracking-tighter text-sm font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span>
                        Nhiệm vụ:{" "}
                        <strong className="text-blue-700">
                          {reservedForMissionQty.toLocaleString()}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>
                        Điều chuyển:{" "}
                        <strong className="text-emerald-700">
                          {reservedForTransferQty.toLocaleString()}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                      <span>
                        Còn lại:{" "}
                        <strong className="text-slate-700">
                          {availableQty.toLocaleString()}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-5">
                {/* Reusable Breakdown */}
                {reusableBreakdown &&
                  (() => {
                    const rb = reusableBreakdown;
                    return (
                      <div className="space-y-5">
                        <div className="space-y-3">
                          <h3 className="flex items-center gap-2 text-xl font-medium tracking-tighter">
                            <Wrench className="h-5 w-5 text-muted-foreground" />
                            Tình Trạng Thiết Bị
                          </h3>

                          <div className="grid grid-cols-2 gap-3 text-center lg:grid-cols-4">
                            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                              <p className="text-2xl font-bold tracking-tighter text-green-700">
                                {rb.availableUnits}
                              </p>
                              <p className="mt-1 text-sm font-medium tracking-tighter text-green-600">
                                Khả dụng
                              </p>
                            </div>
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                              <p className="text-2xl font-bold tracking-tighter text-blue-700">
                                {rb.inUseUnits}
                              </p>
                              <p className="mt-1 text-sm font-medium tracking-tighter text-blue-600">
                                Đang dùng
                              </p>
                            </div>
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                              <p className="text-2xl font-bold tracking-tighter text-amber-700">
                                {rb.maintenanceUnits}
                              </p>
                              <p className="mt-1 text-sm font-medium tracking-tighter text-amber-600">
                                Bảo trì
                              </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                              <p className="text-2xl font-bold tracking-tighter text-gray-500">
                                {rb.decommissionedUnits}
                              </p>
                              <p className="mt-1 text-sm font-medium tracking-tighter text-gray-500">
                                Ngừng dùng
                              </p>
                            </div>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "grid gap-4",
                            isFullscreen &&
                              "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]",
                          )}
                        >
                          <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                            <p className="text-sm font-semibold tracking-tighter">
                              Chất lượng
                            </p>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <CheckCircle
                                  className="h-4 w-4 shrink-0 text-green-500"
                                  weight="fill"
                                />
                                <span className="flex-1 text-sm tracking-tighter text-muted-foreground">
                                  Còn tốt
                                </span>
                                <span className="w-8 text-right text-sm font-bold tracking-tighter">
                                  {rb.goodCount}
                                </span>
                                <div className="h-2 min-w-[120px] flex-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-green-500"
                                    style={{
                                      width: `${rb.totalUnits > 0 ? (rb.goodCount / rb.totalUnits) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <WarningCircle
                                  className="h-4 w-4 shrink-0 text-amber-500"
                                  weight="fill"
                                />
                                <span className="flex-1 text-sm tracking-tighter text-muted-foreground">
                                  Trung bình
                                </span>
                                <span className="w-8 text-right text-sm font-bold tracking-tighter">
                                  {rb.fairCount}
                                </span>
                                <div className="h-2 min-w-[120px] flex-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-amber-500"
                                    style={{
                                      width: `${rb.totalUnits > 0 ? (rb.fairCount / rb.totalUnits) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <XCircle
                                  className="h-4 w-4 shrink-0 text-red-500"
                                  weight="fill"
                                />
                                <span className="flex-1 text-sm tracking-tighter text-muted-foreground">
                                  Cần thay thế / sửa chữa
                                </span>
                                <span className="w-8 text-right text-sm font-bold tracking-tighter">
                                  {rb.poorCount}
                                </span>
                                <div className="h-2 min-w-[120px] flex-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-red-500"
                                    style={{
                                      width: `${rb.totalUnits > 0 ? (rb.poorCount / rb.totalUnits) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                            <h3 className="text-sm font-semibold tracking-tighter">
                              Chi Tiết
                            </h3>
                            {itemDetailsContent}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {!reusableBreakdown && (
                  <div className="space-y-3">
                    <h3 className="text-sm tracking-tighter font-semibold">
                      Chi Tiết
                    </h3>
                    {itemDetailsContent}
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {reusableBreakdown && isFullscreen && (
                    <motion.div
                      key="reusable-units-table"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold tracking-tighter">
                            Chi tiết vật phẩm tái sử dụng
                          </h3>
                          <p className="text-sm tracking-tighter text-muted-foreground mt-1">
                            Tra cứu theo serial, xem trạng thái hiện tại và thao
                            tác từng vật phẩm.
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <div className="relative min-w-[260px]">
                            <Input
                              value={reusableSerialSearch}
                              onChange={(event) => {
                                setReusableSerialSearch(event.target.value);
                                setReusableUnitsPage(1);
                              }}
                              placeholder="Tìm serial..."
                              className="h-10 pl-9 text-sm"
                            />
                            <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          </div>
                          <Select
                            value={String(reusableUnitsPageSize)}
                            onValueChange={(value) => {
                              setReusableUnitsPageSize(Number(value));
                              setReusableUnitsPage(1);
                            }}
                          >
                            <SelectTrigger className="h-10 w-28 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 / trang</SelectItem>
                              <SelectItem value="10">10 / trang</SelectItem>
                              <SelectItem value="20">20 / trang</SelectItem>
                              <SelectItem value="50">50 / trang</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-border/50">
                        <table className="w-full min-w-[1180px]">
                          <thead className="bg-muted/30">
                            <tr className="border-b border-border/50">
                              <ReusableSortHeader
                                column="itemId"
                                label="Item ID"
                                sort={reusableSort}
                                onSort={handleReusableSort}
                              />
                              <ReusableSortHeader
                                column="serialNumber"
                                label="Serial"
                                sort={reusableSort}
                                onSort={handleReusableSort}
                              />
                              <ReusableSortHeader
                                column="categoryName"
                                label="Danh mục"
                                sort={reusableSort}
                                onSort={handleReusableSort}
                              />
                              <ReusableSortHeader
                                column="status"
                                label="Trạng thái"
                                sort={reusableSort}
                                onSort={handleReusableSort}
                              />
                              <ReusableSortHeader
                                column="condition"
                                label="Tình trạng"
                                sort={reusableSort}
                                onSort={handleReusableSort}
                              />
                              <ReusableSortHeader
                                column="note"
                                label="Ghi chú"
                                sort={reusableSort}
                                onSort={handleReusableSort}
                              />
                              <ReusableSortHeader
                                column="updatedAt"
                                label="Cập nhật"
                                sort={reusableSort}
                                onSort={handleReusableSort}
                              />
                              <ReusableSortHeader
                                column="createdAt"
                                label="Ngày tạo"
                                sort={reusableSort}
                                onSort={handleReusableSort}
                              />
                              <th className="p-3 text-right text-sm font-semibold tracking-tighter text-foreground">
                                Thao tác
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {loadingReusableUnits ? (
                              Array.from({
                                length: Math.min(reusableUnitsPageSize, 6),
                              }).map((_, index) => (
                                <tr
                                  key={index}
                                  className="border-b border-border/30"
                                >
                                  {Array.from({ length: 9 }).map(
                                    (__, cellIndex) => (
                                      <td key={cellIndex} className="p-3">
                                        <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
                                      </td>
                                    ),
                                  )}
                                </tr>
                              ))
                            ) : sortedReusableUnits.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="p-10 text-center text-sm tracking-tighter text-muted-foreground"
                                >
                                  Không tìm thấy vật phẩm tái sử dụng phù hợp.
                                </td>
                              </tr>
                            ) : (
                              sortedReusableUnits.map((unit) => {
                                const normalizedStatus =
                                  normalizeReusableStatusKey(unit.status);
                                const isActionLocked =
                                  normalizedStatus.includes("reserv") ||
                                  normalizedStatus.includes("transit") ||
                                  normalizedStatus.includes("inuse") ||
                                  normalizedStatus.includes("in use");
                                const canMarkAvailable =
                                  normalizedStatus.includes("maint");

                                const isExpanded =
                                  expandedReusableAction?.unitId ===
                                  unit.itemId;

                                return (
                                  <React.Fragment key={unit.itemId}>
                                    <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                      <td className="p-3 text-sm tracking-tighter">
                                        {unit.itemId}
                                      </td>
                                      <td className="p-3">
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium tracking-tighter">
                                            {unit.serialNumber || "—"}
                                          </p>
                                          <p className="text-xs tracking-tighter text-muted-foreground">
                                            {unit.itemModelName}
                                          </p>
                                        </div>
                                      </td>
                                      <td className="p-3 text-sm tracking-tighter text-foreground/80">
                                        {unit.categoryName || "—"}
                                      </td>
                                      <td className="p-3">
                                        <Badge
                                          className={cn(
                                            "border-0 shadow-none",
                                            getReusableStatusTone(unit.status),
                                          )}
                                        >
                                          {reusableStatusLabel(unit.status)}
                                        </Badge>
                                      </td>
                                      <td className="p-3 text-sm tracking-tighter text-foreground/80">
                                        {unit.condition
                                          ? conditionLabel(unit.condition)
                                          : "—"}
                                      </td>
                                      <td className="p-3 text-sm tracking-tighter text-foreground/70">
                                        <div className="max-w-[280px] whitespace-normal wrap-break-word">
                                          {unit.note?.trim() || "—"}
                                        </div>
                                      </td>
                                      <td className="p-3 text-sm tracking-tighter text-foreground/70">
                                        {formatDate(unit.updatedAt)}
                                      </td>
                                      <td className="p-3 text-sm tracking-tighter text-foreground/70">
                                        {formatDate(unit.createdAt)}
                                      </td>
                                      <td className="p-3">
                                        {!isActionLocked ? (
                                          <div
                                            className="flex justify-end"
                                            onClick={(event) =>
                                              event.stopPropagation()
                                            }
                                          >
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                >
                                                  <DotsThreeVertical size={16} />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuPortal>
                                                <DropdownMenuContent align="end">
                                                  {canMarkAvailable ? (
                                                    <DropdownMenuItem
                                                      className="text-emerald-700 focus:text-emerald-700 data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-700"
                                                      onClick={() =>
                                                        openReusableActionDialog(
                                                          "available",
                                                          unit,
                                                        )
                                                      }
                                                    >
                                                      <CheckCircle
                                                        size={16}
                                                        className="mr-1 text-emerald-600"
                                                      />
                                                      Hoàn tất bảo trì
                                                    </DropdownMenuItem>
                                                  ) : (
                                                    <DropdownMenuItem
                                                      className="text-amber-700 focus:text-amber-700 data-[highlighted]:bg-amber-50 data-[highlighted]:text-amber-700"
                                                      onClick={() =>
                                                        openReusableActionDialog(
                                                          "maintenance",
                                                          unit,
                                                        )
                                                      }
                                                    >
                                                      <MaintenanceIcon
                                                        size={16}
                                                        className="mr-1 text-amber-600"
                                                      />
                                                      Bảo trì vật phẩm
                                                    </DropdownMenuItem>
                                                  )}
                                                  {!canMarkAvailable && (
                                                    <DropdownMenuItem
                                                      variant="destructive"
                                                      onClick={() =>
                                                        openReusableActionDialog(
                                                          "decommission",
                                                          unit,
                                                        )
                                                      }
                                                    >
                                                      <Recycle
                                                        size={16}
                                                        className="mr-1"
                                                      />
                                                      Tiêu hủy vật phẩm
                                                    </DropdownMenuItem>
                                                  )}
                                                </DropdownMenuContent>
                                              </DropdownMenuPortal>
                                            </DropdownMenu>
                                          </div>
                                        ) : null}
                                      </td>
                                    </tr>
                                    <AnimatePresence initial={false}>
                                      {isExpanded && expandedReusableAction && (
                                        <motion.tr
                                          key={`expand-${unit.itemId}`}
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{
                                            opacity: 1,
                                            height: "auto",
                                          }}
                                          exit={{ opacity: 0, height: 0 }}
                                          transition={{ duration: 0.25 }}
                                          className="overflow-hidden"
                                        >
                                          <td colSpan={9} className="p-0">
                                            <motion.div
                                              initial={{ opacity: 0, y: -6 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              transition={{
                                                duration: 0.2,
                                                delay: 0.05,
                                              }}
                                              className="bg-muted/30 px-6 py-4"
                                            >
                                              <div
                                                className={cn(
                                                  "grid items-start gap-3",
                                                  expandedReusableAction.action ===
                                                    "available"
                                                    ? "lg:grid-cols-[160px_minmax(0,1fr)_auto]"
                                                    : "lg:grid-cols-[minmax(0,1fr)_auto]",
                                                )}
                                              >
                                                {expandedReusableAction.action ===
                                                  "available" && (
                                                  <div className="w-full space-y-1.5">
                                                    <Label className="text-sm font-medium">
                                                      Tình trạng{" "}
                                                      <span className="text-red-500">
                                                        *
                                                      </span>
                                                    </Label>
                                                    <Select
                                                      value={
                                                        reusableActionCondition
                                                      }
                                                      onValueChange={
                                                        setReusableActionCondition
                                                      }
                                                    >
                                                      <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Chọn tình trạng..." />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {(
                                                          reusableConditions ??
                                                          []
                                                        ).map((c) => (
                                                          <SelectItem
                                                            key={c.key}
                                                            value={c.key}
                                                          >
                                                            {c.value}
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                )}
                                                <div className="min-w-0 space-y-1.5">
                                                  <Label className="text-sm font-medium">
                                                    Ghi chú{" "}
                                                    <span className="text-red-500">
                                                      *
                                                    </span>
                                                  </Label>
                                                  <Textarea
                                                    placeholder="Nhập ghi chú cho thao tác này..."
                                                    value={reusableActionNote}
                                                    onChange={(e) =>
                                                      setReusableActionNote(
                                                        e.target.value,
                                                      )
                                                    }
                                                    rows={1}
                                                    className="resize-none"
                                                  />
                                                </div>
                                                <div className="mt-6.5 flex gap-2 self-start lg:self-end">
                                                  <Button
                                                    variant={
                                                      expandedReusableAction.action ===
                                                      "decommission"
                                                        ? "destructive"
                                                        : "default"
                                                    }
                                                    size="sm"
                                                    disabled={
                                                      isReusableActionPending
                                                    }
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleReusableAction();
                                                    }}
                                                  >
                                                    {isReusableActionPending ? (
                                                      <SpinnerGap className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                    ) : expandedReusableAction.action ===
                                                      "maintenance" ? (
                                                      <MaintenanceIcon className="mr-2 h-3.5 w-3.5" />
                                                    ) : expandedReusableAction.action ===
                                                      "available" ? (
                                                      <CheckCircle className="mr-2 h-3.5 w-3.5" />
                                                    ) : (
                                                      <Recycle className="mr-2 h-3.5 w-3.5" />
                                                    )}
                                                    {expandedReusableAction.action ===
                                                    "maintenance"
                                                      ? "Xác nhận bảo trì"
                                                      : expandedReusableAction.action ===
                                                          "available"
                                                        ? "Xác nhận khả dụng"
                                                        : "Xác nhận tiêu hủy"}
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={
                                                      isReusableActionPending
                                                    }
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setExpandedReusableAction(
                                                        null,
                                                      );
                                                    }}
                                                  >
                                                    Hủy
                                                  </Button>
                                                </div>
                                              </div>
                                            </motion.div>
                                          </td>
                                        </motion.tr>
                                      )}
                                    </AnimatePresence>
                                  </React.Fragment>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col gap-2 border-t border-border/50 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span className="tracking-tighter">
                          Hiển thị{" "}
                          {(reusableUnitsData?.totalCount ?? 0) === 0
                            ? 0
                            : (reusableUnitsPage - 1) * reusableUnitsPageSize +
                              1}
                          –
                          {Math.min(
                            reusableUnitsPage * reusableUnitsPageSize,
                            reusableUnitsData?.totalCount ?? 0,
                          )}{" "}
                          trong{" "}
                          {(reusableUnitsData?.totalCount ?? 0).toLocaleString(
                            "vi-VN",
                          )}{" "}
                          vật phẩm
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReusableUnitsPage((prev) =>
                                Math.max(prev - 1, 1),
                              )
                            }
                            disabled={!reusableUnitsData?.hasPreviousPage}
                          >
                            Trước
                          </Button>
                          <span className="text-xs tracking-tighter">
                            Trang {reusableUnitsData?.pageNumber ?? 1}/
                            {Math.max(reusableUnitsData?.totalPages ?? 1, 1)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReusableUnitsPage((prev) => prev + 1)
                            }
                            disabled={!reusableUnitsData?.hasNextPage}
                          >
                            Sau
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {reusableBreakdown && <Separator />}

              {/* Lot Section for Consumable */}
              {item.itemType === "Consumable" && (
                <div className="space-y-3">
                  <h3 className="text-sm tracking-tighter font-semibold flex items-center gap-2">
                    <Tray className="h-6 w-6 text-muted-foreground" />
                    Lô hàng
                  </h3>
                  {loadingLots ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-12 bg-muted/50 animate-pulse rounded-lg"
                        />
                      ))}
                    </div>
                  ) : !lotsData?.items?.length ? (
                    <p className="text-sm text-muted-foreground tracking-tighter">
                      Không có lô nào
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/50">
                      <table className="w-full min-w-[920px]">
                        <thead className="bg-muted/30">
                          <tr className="border-b border-border/50">
                            <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                              Lô
                            </th>
                            <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                              Còn lại
                            </th>
                            <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                              Tổng số lượng
                            </th>
                            <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                              Nguồn
                            </th>
                            <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                              Hết hạn
                            </th>
                            <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                              Trạng thái
                            </th>
                            <th className="p-3 text-right text-sm font-semibold tracking-tighter text-foreground">
                              Thao tác
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {lotsData.items.map((lot) => {
                            const isExpanded = disposeLot?.lotId === lot.lotId;
                            const warningBadge = lot.isExpired ? (
                              <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[13px] tracking-tighter font-medium px-2 py-0.5">
                                Hết hạn
                              </Badge>
                            ) : lot.isExpiringSoon ? (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[13px] tracking-tighter font-medium px-2 py-0.5">
                                Sắp hết hạn
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[13px] tracking-tighter font-medium px-2 py-0.5">
                                Bình thường
                              </Badge>
                            );

                            return (
                              <React.Fragment key={lot.lotId}>
                                <tr
                                  className="border-b border-border/30 transition-colors hover:bg-muted/20 cursor-pointer"
                                  onClick={() => openDispose(lot)}
                                >
                                  <td className="p-3 text-sm font-medium tracking-tighter">
                                    Lô số {lot.lotId}
                                  </td>
                                  <td className="p-3 text-sm tracking-tighter text-foreground/80">
                                    {lot.remainingQuantity.toLocaleString()}
                                  </td>
                                  <td className="p-3 text-sm tracking-tighter text-foreground/80">
                                    {lot.quantity.toLocaleString()}
                                  </td>
                                  <td className="p-3 text-sm tracking-tighter text-foreground/80">
                                    {sourceTypeLabel(lot.sourceType)}
                                  </td>
                                  <td className="p-3 text-sm tracking-tighter text-foreground/80">
                                    {new Date(
                                      lot.expiredDate,
                                    ).toLocaleDateString("vi-VN", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}
                                  </td>
                                  <td className="p-3">{warningBadge}</td>
                                  <td className="p-3">
                                    <div className="flex justify-end">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-1.5 px-2 text-sm tracking-tighter"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openDispose(lot);
                                        }}
                                      >
                                        {isExpanded ? (
                                          <CaretUp className="h-4 w-4" />
                                        ) : (
                                          <CaretDown className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                                <AnimatePresence initial={false}>
                                  {isExpanded && (
                                    <motion.tr
                                      key={`lot-expand-${lot.lotId}`}
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.22 }}
                                      className="overflow-hidden"
                                    >
                                      <td colSpan={7} className="p-0">
                                        <motion.div
                                          initial={{ opacity: 0, y: -6 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{
                                            duration: 0.18,
                                            delay: 0.04,
                                          }}
                                          className="bg-muted/30 px-6 py-4"
                                        >
                                          <div className="flex flex-wrap items-start gap-4">
                                            <div className="w-40 space-y-1.5">
                                              <Label className="text-sm font-medium">
                                                Số lượng tiêu hủy{" "}
                                                <span className="text-red-500">
                                                  *
                                                </span>
                                              </Label>
                                              <Input
                                                type="number"
                                                min={1}
                                                max={lot.remainingQuantity}
                                                readOnly={lot.isExpired}
                                                value={
                                                  lot.isExpired
                                                    ? String(
                                                        lot.remainingQuantity,
                                                      )
                                                    : disposeQty
                                                }
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  if (val === "") {
                                                    setDisposeQty("");
                                                    return;
                                                  }
                                                  const num = Number(val);
                                                  if (
                                                    num > lot.remainingQuantity
                                                  ) {
                                                    setDisposeQty(
                                                      String(
                                                        lot.remainingQuantity,
                                                      ),
                                                    );
                                                  } else {
                                                    setDisposeQty(val);
                                                  }
                                                }}
                                                placeholder="Nhập số lượng..."
                                                className={cn(
                                                  lot.isExpired &&
                                                    "cursor-not-allowed bg-muted",
                                                )}
                                              />
                                            </div>
                                            <div className="w-56 space-y-1.5">
                                              <Label className="text-sm font-medium">
                                                Lý do{" "}
                                                <span className="text-red-500">
                                                  *
                                                </span>
                                              </Label>
                                              <Input
                                                value={disposeReason}
                                                onChange={(e) =>
                                                  setDisposeReason(
                                                    e.target.value,
                                                  )
                                                }
                                                placeholder="Ví dụ: Hết hạn, Ẩm mốc..."
                                              />
                                            </div>
                                            <div className="min-w-[260px] flex-1 space-y-1.5">
                                              <Label className="text-sm font-medium">
                                                Ghi chú chi tiết (tùy chọn)
                                              </Label>
                                              <Textarea
                                                value={disposeNote}
                                                onChange={(e) =>
                                                  setDisposeNote(e.target.value)
                                                }
                                                placeholder="Mô tả thêm..."
                                                rows={1}
                                                className="resize-none"
                                              />
                                            </div>
                                            <div className="mt-6.5 flex gap-2 self-start">
                                              <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={
                                                  disposeMutation.isPending
                                                }
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDispose();
                                                }}
                                              >
                                                {disposeMutation.isPending ? (
                                                  <SpinnerGap className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                  <Trash className="mr-2 h-3.5 w-3.5" />
                                                )}
                                                Tiêu hủy
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={
                                                  disposeMutation.isPending
                                                }
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDisposeLot(null);
                                                  setDisposeQty("");
                                                  setDisposeReason("");
                                                  setDisposeNote("");
                                                }}
                                              >
                                                Hủy
                                              </Button>
                                            </div>
                                          </div>
                                        </motion.div>
                                      </td>
                                    </motion.tr>
                                  )}
                                </AnimatePresence>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {item.itemType === "Consumable" && <Separator />}
            </div>
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
