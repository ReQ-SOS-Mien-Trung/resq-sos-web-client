"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DepotEntity } from "@/services/depot/type";
import {
  useAssemblyPointById,
  useAssemblyPointEvents,
  useScheduleAssemblyPointGathering,
  useStartAssemblyPointGathering,
} from "@/services/assembly_points/hooks";
import type {
  AssemblyPointEntity,
  AssemblyPointDetailEntity,
  AssemblyPointEventEntity,
  AssemblyPointTeam,
  AssemblyPointTeamMember,
} from "@/services/assembly_points/type";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
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
import { useDepotInventory } from "@/services/inventory/hooks";
import type { InventoryItemEntity } from "@/services/inventory/type";
import { vi } from "date-fns/locale";
import {
  X,
  MapPin,
  Clock,
  User,
  Phone,
  EnvelopeSimple,
  Package,
  Users,
  Hash,
  Info,
  CalendarBlank,
  CaretDown,
  CaretUp,
  ArrowsClockwise,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { LocationDetailsPanelProps } from "@/type";
import { depotStatusConfig, assemblyPointStatusConfig } from "@/lib/constants";
import { ChartBar } from "lucide-react";
import {
  getBackendCircuitBlockedUntil,
  releaseBackendCircuitForRetry,
} from "@/lib/backend-circuit";
import { useBackendConnectionStore } from "@/stores/backend-connection.store";

// Panel width
const PANEL_WIDTH = 420;
const INVENTORY_PAGE_SIZE = 10;

const assemblyTeamTypeLabel: Record<string, string> = {
  Rescue: "Cứu hộ",
  Medical: "Y tế",
  Transportation: "Vận chuyển",
  Mixed: "Tổng hợp",
  MIXED: "Tổng hợp",
};

function getAssemblyTeamTypeLabel(teamType: unknown): string {
  const rawType = String(teamType ?? "").trim();
  if (!rawType) return "Không xác định";

  return (
    assemblyTeamTypeLabel[rawType] ??
    assemblyTeamTypeLabel[rawType.toUpperCase()] ??
    formatStatusText(rawType.replace(/_/g, " "))
  );
}

const assemblyTeamStatusLabel: Record<string, string> = {
  AwaitingAcceptance: "Chờ xác nhận",
  Ready: "Sẵn sàng",
  Gathering: "Đang tập hợp",
  Available: "Sẵn sàng điều phối",
  Assigned: "Đã phân công",
  OnMission: "Đang làm nhiệm vụ",
  Stuck: "Gặp sự cố",
  Unavailable: "Không khả dụng",
  Disbanded: "Đã giải tán",
};

const assemblyTeamStatusColor: Record<string, string> = {
  AwaitingAcceptance:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
  Ready:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  Gathering:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300",
  Available:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  Assigned:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300",
  OnMission:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-300",
  Stuck:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
  Unavailable:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-300",
  Disbanded:
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800/60 dark:bg-zinc-950/40 dark:text-zinc-300",
};

function formatStatusText(status: string): string {
  return status.replace(/([a-z])([A-Z])/g, "$1 $2");
}

const memberStatusLabel: Record<AssemblyPointTeamMember["status"], string> = {
  Accepted: "Đã xác nhận",
  Pending: "Đang chờ",
};

const memberRoleLabel: Record<AssemblyPointTeamMember["roleInTeam"], string> = {
  Leader: "Trưởng nhóm",
  Member: "Thành viên",
};

const assemblyEventStatusLabel: Record<string, string> = {
  Scheduled: "Đã lên lịch",
  Gathering: "Đang tập hợp",
  Completed: "Đã hoàn tất",
  Cancelled: "Đã hủy",
};

const assemblyEventStatusColor: Record<string, string> = {
  Scheduled:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
  Gathering:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300",
  Completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  Cancelled:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
};

function formatLastUpdated(dateStr: string | null): string {
  if (!dateStr) return "Chưa cập nhật";

  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatDateTimeVi(date: Date): string {
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMinimumGatheringDate(now = new Date()): Date {
  const date = new Date(now);

  // Keep minute precision to match picker values.
  date.setSeconds(0, 0);
  return date;
}

function formatRetryTime(blockedUntil: number | null): string | null {
  if (!blockedUntil) return null;

  try {
    return new Date(blockedUntil).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return null;
  }
}

function extractBackendErrorMessage(error: unknown): string | null {
  const err = error as AxiosError<{
    message?: string;
    title?: string;
    errors?: Record<string, string[] | undefined>;
  }>;

  const errors = err.response?.data?.errors;
  if (errors && typeof errors === "object") {
    const firstError = Object.values(errors).find(
      (messages) => Array.isArray(messages) && messages.length > 0,
    );
    if (firstError?.[0]) return firstError[0];
  }

  return err.response?.data?.message || err.response?.data?.title || null;
}

function resolveActiveEventId(payload: unknown): number | null {
  const data = payload as {
    activeEventId?: number | null;
    eventId?: number | null;
    currentEventId?: number | null;
    activeEvent?: {
      id?: number | null;
      eventId?: number | null;
    } | null;
  };

  if (typeof data?.activeEventId === "number") return data.activeEventId;
  if (typeof data?.eventId === "number") return data.eventId;
  if (typeof data?.currentEventId === "number") return data.currentEventId;
  if (typeof data?.activeEvent?.eventId === "number") {
    return data.activeEvent.eventId;
  }
  if (typeof data?.activeEvent?.id === "number") return data.activeEvent.id;
  return null;
}

function getDefaultEventId(
  events: AssemblyPointEventEntity[],
  activeEventId: number | null,
): number | null {
  if (!events.length) return null;

  if (
    typeof activeEventId === "number" &&
    events.some((event) => event.eventId === activeEventId)
  ) {
    return activeEventId;
  }

  const gatheringEvent = events.find((event) => event.status === "Gathering");
  if (gatheringEvent) return gatheringEvent.eventId;

  const scheduledEvent = events.find((event) => event.status === "Scheduled");
  if (scheduledEvent) return scheduledEvent.eventId;

  return events[0]?.eventId ?? null;
}

function parseFiniteNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = parseFiniteNumber(value);
  return parsed ?? fallback;
}

function readNumericFromObject(
  source: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): number | null {
  if (!source) return null;

  for (const key of keys) {
    const value = parseFiniteNumber(source[key]);
    if (value !== null) return value;
  }

  return null;
}

function getBackendInventorySummary(inventoryData: unknown): {
  totalStock: number | null;
  reservedStock: number | null;
  availableStock: number | null;
} {
  const root =
    inventoryData && typeof inventoryData === "object"
      ? (inventoryData as Record<string, unknown>)
      : null;
  const summary =
    root && typeof root.summary === "object" && root.summary !== null
      ? (root.summary as Record<string, unknown>)
      : null;

  const totalKeys = [
    "totalQuantity",
    "totalStock",
    "totalInventoryQuantity",
    "sumQuantity",
    "tongSoLuong",
    "tongTon",
    "tongTonKho",
  ] as const;
  const reservedKeys = [
    "totalReservedQuantity",
    "reservedStock",
    "reservedQuantity",
    "reservedForMissionQuantity",
    "sumReservedQuantity",
    "tongSoLuongDaGiuCho",
    "tongDaGiuCho",
  ] as const;
  const availableKeys = [
    "totalAvailableQuantity",
    "availableStock",
    "availableQuantity",
    "sumAvailableQuantity",
    "tongSoLuongKhaDung",
    "tongKhaDung",
  ] as const;

  return {
    totalStock:
      readNumericFromObject(summary, totalKeys) ??
      readNumericFromObject(root, totalKeys),
    reservedStock:
      readNumericFromObject(summary, reservedKeys) ??
      readNumericFromObject(root, reservedKeys),
    availableStock:
      readNumericFromObject(summary, availableKeys) ??
      readNumericFromObject(root, availableKeys),
  };
}

function isReusableItemType(value: unknown): boolean {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return (
    normalized === "reusable" ||
    normalized.includes("tai su dung") ||
    normalized.includes("tái sử dụng")
  );
}

function getInventoryItemTypeLabel(item: InventoryItemEntity): string {
  return isReusableItemType(item.itemType) ? "Tái sử dụng" : "Tiêu thụ";
}

function getInventoryQuantities(item: InventoryItemEntity): {
  total: number;
  reserved: number;
  available: number;
} {
  if (item.itemType === "Reusable") {
    const total = toFiniteNumber(item.unit, 0);
    const reserved = toFiniteNumber(
      item.reservedUnit ??
        item.totalReservedUnits ??
        item.reservedForMissionUnit ??
        item.reservedForMissionUnits,
      0,
    );
    const available = toFiniteNumber(
      item.availableUnit,
      Math.max(total - reserved, 0),
    );

    return { total, reserved, available };
  }

  const total = toFiniteNumber(item.quantity, 0);
  const reserved = toFiniteNumber(
    item.reservedQuantity ??
      item.totalReservedQuantity ??
      item.reservedForMissionQuantity,
    0,
  );
  const available = toFiniteNumber(
    item.availableQuantity,
    Math.max(total - reserved, 0),
  );

  return { total, reserved, available };
}

function getDepotManagerDisplayName(manager: DepotEntity["manager"]): string {
  if (!manager) return "Chưa có quản lý";
  if (manager.fullName?.trim()) return manager.fullName.trim();

  const fullName = [manager.firstName, manager.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || manager.email || manager.phone || "Chưa có quản lý";
}

function BackendConnectionErrorPanel({
  onClose,
  onRetry,
  blockedUntil,
  message,
}: {
  onClose: () => void;
  onRetry: () => void;
  blockedUntil: number | null;
  message: string | null;
}) {
  const retryAt = formatRetryTime(blockedUntil);

  return (
    <div className="h-full bg-background border-r shadow-2xl flex flex-col">
      <div className="relative h-20 shrink-0 border-b bg-linear-to-br from-[#FF5722]/15 via-background to-background">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-8 w-8 rounded-full"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 px-6 py-7 flex flex-col items-center justify-center text-center">
        <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 text-[#FF5722]">
          <WarningCircle className="h-7 w-7" weight="fill" />
        </div>

        <h3 className="text-base font-semibold tracking-tight">
          Mất kết nối backend API
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Hệ thống đang tạm dừng gửi request để tránh spam khi backend không
          phản hồi.
        </p>

        {retryAt ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Tạm khóa gọi API đến {retryAt}.
          </p>
        ) : null}

        {message ? (
          <p className="mt-2 max-w-[20rem] text-xs text-[#FF5722]">{message}</p>
        ) : null}

        <Button
          type="button"
          className="mt-5 bg-[#FF5722] text-white hover:bg-[#E64A19]"
          onClick={onRetry}
        >
          <ArrowsClockwise className="mr-1.5 h-4 w-4" />
          Thử kết nối lại
        </Button>
      </div>
    </div>
  );
}

const LocationDetailsPanel = ({
  open,
  onOpenChange,
  location,
}: LocationDetailsPanelProps) => {
  const backendStatus = useBackendConnectionStore((state) => state.status);
  const backendBlockedUntil = useBackendConnectionStore(
    (state) => state.blockedUntil,
  );
  const backendErrorMessage = useBackendConnectionStore(
    (state) => state.lastErrorMessage,
  );

  const isBackendOffline = backendStatus === "offline";
  const retryBlockUntil = useMemo(
    () => backendBlockedUntil ?? getBackendCircuitBlockedUntil(),
    [backendBlockedUntil],
  );
  const handleRetryBackendConnection = useCallback(() => {
    releaseBackendCircuitForRetry();
  }, []);

  if (!location && !open) return null;

  return (
    <div
      className={cn(
        "absolute top-0 left-0 h-full z-1000 transition-all duration-300 ease-in-out",
        open
          ? "opacity-100 translate-x-0"
          : "opacity-0 -translate-x-full pointer-events-none",
      )}
      style={{ width: PANEL_WIDTH }}
    >
      {isBackendOffline ? (
        <BackendConnectionErrorPanel
          onClose={() => onOpenChange(false)}
          onRetry={handleRetryBackendConnection}
          blockedUntil={retryBlockUntil}
          message={backendErrorMessage}
        />
      ) : (
        <div className="h-full bg-background border-r shadow-2xl overflow-y-auto">
          {location?.type === "depot" ? (
            <DepotDetails
              depot={location.data}
              onClose={() => onOpenChange(false)}
            />
          ) : location?.type === "assemblyPoint" ? (
            <AssemblyPointDetails
              assemblyPoint={location.data}
              onClose={() => onOpenChange(false)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════
// Depot Details
// ════════════════════════════════
function DepotDetails({
  depot,
  onClose,
}: {
  depot: DepotEntity;
  onClose: () => void;
}) {
  const [inventoryPageNumber, setInventoryPageNumber] = useState(1);

  useEffect(() => {
    setInventoryPageNumber(1);
  }, [depot.id]);

  const {
    data: inventoryData,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    isFetching: isInventoryFetching,
    refetch: refetchInventory,
  } = useDepotInventory({
    depotId: depot.id,
    pageNumber: inventoryPageNumber,
    pageSize: INVENTORY_PAGE_SIZE,
  });

  const handleRefreshInventory = useCallback(() => {
    void refetchInventory();
  }, [refetchInventory]);

  const statusConfig = depotStatusConfig[depot.status];
  const StatusIcon = statusConfig.icon;

  const utilizationPercent = useMemo(() => {
    if (depot.capacity === 0) return 0;
    return Math.min(
      100,
      Math.round((depot.currentUtilization / depot.capacity) * 100),
    );
  }, [depot.currentUtilization, depot.capacity]);

  const utilizationColor =
    utilizationPercent >= 90
      ? "bg-red-500"
      : utilizationPercent >= 70
        ? "bg-orange-500"
        : utilizationPercent >= 40
          ? "bg-yellow-500"
          : "bg-green-500";
  const depotImageUrl = depot.imageUrl?.trim() || null;
  const depotManagerName = getDepotManagerDisplayName(depot.manager);

  const inventorySummary = useMemo(() => {
    const summary = getBackendInventorySummary(inventoryData);

    return {
      ...summary,
      hasCompleteValues:
        summary.totalStock !== null &&
        summary.reservedStock !== null &&
        summary.availableStock !== null,
    };
  }, [inventoryData]);

  const inventoryRange = useMemo(() => {
    if (!inventoryData || inventoryData.totalCount === 0) {
      return { start: 0, end: 0 };
    }

    const start = (inventoryData.pageNumber - 1) * inventoryData.pageSize + 1;
    const end = Math.min(
      inventoryData.pageNumber * inventoryData.pageSize,
      inventoryData.totalCount,
    );

    return { start, end };
  }, [inventoryData]);

  return (
    <>
      {/* Header Banner */}
      <div className="relative shrink-0">
        <div
          className={cn(
            "h-36 relative overflow-hidden",
            depotImageUrl
              ? "bg-slate-900"
              : "bg-linear-to-br from-blue-500 via-blue-600 to-indigo-700",
          )}
        >
          {depotImageUrl && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${depotImageUrl})` }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/40 via-black/15 to-transparent" />
            </>
          )}

          {/* Abstract warehouse pattern */}
          <div
            className={cn(
              "absolute inset-0 opacity-10",
              depotImageUrl && "opacity-0",
            )}
          >
            <div className="absolute top-4 left-4 w-16 h-16 border-2 border-white rounded-lg" />
            <div className="absolute top-8 left-24 w-12 h-12 border-2 border-white rounded-lg" />
            <div className="absolute bottom-4 right-8 w-20 h-14 border-2 border-white rounded-lg" />
            <div className="absolute bottom-8 right-32 w-10 h-10 border-2 border-white rounded-lg" />
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 text-white hover:bg-white/20 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title Section */}
      <div className="px-5 pt-4 pb-3 border-b shrink-0">
        <h3 className="text-lg font-bold leading-tight">{depot.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{depot.address}</p>

        {/* Rating-like status row */}
        <div className="flex items-center gap-2 mt-3">
          <Badge
            className={cn(
              "gap-1.5 px-2.5 py-1",
              statusConfig.bgColor,
              statusConfig.textColor,
              "border-0",
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" weight="fill" />
            {statusConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">Kho vật tư</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 py-3 border-b shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            icon={
              <ArrowsClockwise
                className={cn("h-5 w-5", isInventoryFetching && "animate-spin")}
              />
            }
            label="Làm mới tồn kho"
            color="text-[#FF5722]"
            active={isInventoryFetching}
            disabled={isInventoryFetching}
            onClick={handleRefreshInventory}
          />
        </div>
      </div>

      {/* Content */}
      <div className="py-2">
        {/* Capacity & Utilization */}
        <div className="px-5 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Package className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <div className="text-sm">Sức chứa</div>
              <div className="text-xs text-muted-foreground">
                {depot.currentUtilization} / {depot.capacity} đơn vị
              </div>
            </div>
          </div>

          {/* Utilization bar */}
          <div className="ml-8">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Mức sử dụng</span>
              <span className="text-xs font-semibold">
                {utilizationPercent}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  utilizationColor,
                )}
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-border mx-5" />

        {/* Address */}
        <InfoRow
          icon={<MapPin className="h-5 w-5" />}
          primary={depot.address}
        />

        <div className="h-px bg-border mx-5" />

        <div className="h-px bg-border mx-5" />

        {/* Manager Info */}
        {depot.manager ? (
          <>
            <InfoRow
              icon={<User className="h-5 w-5" />}
              primary={depotManagerName}
              secondary="Quản lý kho"
            />

            <div className="h-px bg-border mx-5" />

            <InfoRow
              icon={<Phone className="h-5 w-5" />}
              primary={depot.manager.phone || "Chưa cập nhật"}
              secondary="Số điện thoại"
              isLink={!!depot.manager.phone}
            />

            {depot.manager.email && (
              <>
                <div className="h-px bg-border mx-5" />
                <InfoRow
                  icon={<EnvelopeSimple className="h-5 w-5" />}
                  primary={depot.manager.email}
                  secondary="Email"
                  isLink
                />
              </>
            )}
          </>
        ) : (
          <>
            <InfoRow
              icon={<User className="h-5 w-5" />}
              primary="Chưa có quản lý"
              secondary="Quản lý kho"
              isMuted
            />
          </>
        )}

        <div className="h-px bg-border mx-5" />

        {/* Last Updated */}
        <InfoRow
          icon={<Clock className="h-5 w-5" />}
          primary={formatLastUpdated(depot.lastUpdatedAt)}
          secondary="Cập nhật lần cuối"
        />

        <div className="h-px bg-border mx-5" />

        {/* Inventory from backend */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Tồn kho hiện tại</h4>
            {inventoryData ? (
              <Badge variant="outline" className="text-xs h-5 px-1.5">
                {inventoryData.totalCount} loại
              </Badge>
            ) : null}
          </div>

          {isInventoryLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : isInventoryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              Không tải được dữ liệu tồn kho.
            </div>
          ) : inventoryData?.items && inventoryData.items.length > 0 ? (
            <div className="space-y-3">
              {inventorySummary.hasCompleteValues ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                    <p className="text-xs text-muted-foreground">Tổng tồn</p>
                    <p className="text-sm font-bold text-slate-800">
                      {inventorySummary.totalStock?.toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2">
                    <p className="text-xs text-amber-700">Đã giữ chỗ</p>
                    <p className="text-sm font-bold text-amber-800">
                      {inventorySummary.reservedStock?.toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2">
                    <p className="text-xs text-emerald-700">Còn khả dụng</p>
                    <p className="text-sm font-bold text-emerald-800">
                      {inventorySummary.availableStock?.toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Backend chưa trả số liệu tổng kho, đang hiển thị chi tiết theo
                  từng vật phẩm.
                </div>
              )}

              {inventoryData.items.map((item) => {
                const qty = getInventoryQuantities(item);

                return (
                  <div
                    key={item.itemModelId}
                    className="rounded-lg border border-border/60 bg-card px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {item.itemModelName}
                      </p>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {getInventoryItemTypeLabel(item)}
                      </Badge>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.categoryName}</span>
                      <span>•</span>
                      <span>
                        {item.targetGroups.length > 0
                          ? item.targetGroups.join(", ")
                          : "Chưa phân nhóm"}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                        <p className="text-[11px] text-slate-600">Tổng tồn</p>
                        <p className="text-sm font-semibold leading-none text-slate-800">
                          {qty.total.toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
                        <p className="text-[11px] text-amber-700">Giữ chỗ</p>
                        <p className="text-sm font-semibold leading-none text-amber-800">
                          {qty.reserved.toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5">
                        <p className="text-[11px] text-emerald-700">Khả dụng</p>
                        <p className="text-sm font-semibold leading-none text-emerald-800">
                          {qty.available.toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {inventoryData.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    disabled={!inventoryData.hasPreviousPage}
                    onClick={() =>
                      setInventoryPageNumber((prev) => Math.max(1, prev - 1))
                    }
                  >
                    Trang trước
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Trang {inventoryData.pageNumber}/{inventoryData.totalPages}
                    <br />
                    {inventoryRange.start}-{inventoryRange.end}/
                    {inventoryData.totalCount} vật phẩm
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    disabled={!inventoryData.hasNextPage}
                    onClick={() =>
                      setInventoryPageNumber((prev) =>
                        Math.min(inventoryData.totalPages, prev + 1),
                      )
                    }
                  >
                    Trang sau
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Kho chưa có dữ liệu vật tư.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════
// Assembly Point Details
// ════════════════════════════════
function AssemblyPointDetails({
  assemblyPoint,
  onClose,
}: {
  assemblyPoint: AssemblyPointEntity;
  onClose: () => void;
}) {
  const router = useRouter();
  const [assemblyDateInput, setAssemblyDateInput] = useState<Date | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [expandedTeamIds, setExpandedTeamIds] = useState<
    Record<number, boolean>
  >({});

  const {
    data: assemblyPointDetail,
    isLoading: isAssemblyPointDetailLoading,
    isError: isAssemblyPointDetailError,
    isFetching: isAssemblyPointDetailFetching,
    refetch: refetchAssemblyPointDetail,
  } = useAssemblyPointById(assemblyPoint.id, { enabled: true });
  const {
    data: assemblyPointEvents,
    isLoading: isAssemblyPointEventsLoading,
    isError: isAssemblyPointEventsError,
    isFetching: isAssemblyPointEventsFetching,
    refetch: refetchAssemblyPointEvents,
  } = useAssemblyPointEvents(assemblyPoint.id, {
    enabled: true,
    params: {
      pageNumber: 1,
      pageSize: 10,
    },
  });

  const { mutateAsync: scheduleGathering, isPending: isSchedulingGathering } =
    useScheduleAssemblyPointGathering();
  const { mutateAsync: startGathering, isPending: isStartingGathering } =
    useStartAssemblyPointGathering();

  const displayAssemblyPoint: AssemblyPointDetailEntity | AssemblyPointEntity =
    assemblyPointDetail ?? assemblyPoint;

  const teams: AssemblyPointTeam[] =
    "teams" in displayAssemblyPoint && Array.isArray(displayAssemblyPoint.teams)
      ? displayAssemblyPoint.teams
      : [];
  const hasActiveEvent = Boolean(displayAssemblyPoint.hasActiveEvent);
  const activeEventId = resolveActiveEventId(displayAssemblyPoint);
  const events = useMemo(() => {
    if (!assemblyPointEvents?.items) return [];
    return [...assemblyPointEvents.items].sort(
      (a, b) =>
        new Date(b.assemblyDate).getTime() - new Date(a.assemblyDate).getTime(),
    );
  }, [assemblyPointEvents]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.eventId === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  useEffect(() => {
    if (hasActiveEvent) {
      setShowScheduleForm(false);
    }
  }, [hasActiveEvent]);

  useEffect(() => {
    setSelectedEventId((previous) => {
      if (typeof previous === "number") {
        const exists = events.some((event) => event.eventId === previous);
        if (exists) return previous;
      }

      return getDefaultEventId(events, activeEventId);
    });
  }, [events, activeEventId]);

  const statusConfig = assemblyPointStatusConfig[
    displayAssemblyPoint.status as keyof typeof assemblyPointStatusConfig
  ] ?? {
    label: String(displayAssemblyPoint.status ?? "Không xác định"),
    color: "bg-slate-500",
    textColor: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-50 dark:bg-slate-900/30",
    icon: Info,
  };
  const StatusIcon = statusConfig.icon;

  const handleScheduleGathering = async () => {
    if (!assemblyDateInput) {
      toast.error("Vui lòng chọn thời gian tập trung.");
      return;
    }

    const assemblyDate = new Date(assemblyDateInput);
    if (Number.isNaN(assemblyDate.getTime())) {
      toast.error("Thời gian không hợp lệ.");
      return;
    }

    const minAllowedDate = getMinimumGatheringDate();
    if (assemblyDate.getTime() < minAllowedDate.getTime()) {
      toast.error(
        `Thời điểm triệu tập không được ở quá khứ. Vui lòng chọn từ ${formatDateTimeVi(minAllowedDate)} (giờ VN).`,
      );
      return;
    }

    try {
      const result = await scheduleGathering({
        id: assemblyPoint.id,
        assemblyDate: assemblyDate.toISOString(),
      });
      toast.success(`Đã lên lịch tập trung thành công.`);
      setAssemblyDateInput(null);
    } catch (error) {
      const backendMessage = extractBackendErrorMessage(error);
      toast.error(backendMessage || "Yeu cau that bai. Vui long thu lai.");
    }
  };

  const handleStartGathering = async () => {
    if (selectedEvent?.status === "Gathering") {
      return;
    }

    let targetEventId = selectedEventId ?? activeEventId;

    if (!targetEventId) {
      const refreshed = await refetchAssemblyPointDetail();
      targetEventId = resolveActiveEventId(refreshed.data);
    }

    if (!targetEventId) {
      const refreshedEvents = await refetchAssemblyPointEvents();
      const fallbackEvents = refreshedEvents.data?.items ?? [];
      targetEventId = getDefaultEventId(fallbackEvents, null);
    }

    if (!targetEventId) {
      toast.error(
        "Chưa có sự kiện tập kết phù hợp để mở check-in. Vui lòng lên lịch trước.",
      );
      return;
    }

    try {
      await startGathering({
        eventId: targetEventId,
        assemblyPointId: assemblyPoint.id,
      });
      toast.success(`Đã mở check-in cho sự kiện #${targetEventId}.`);
      void refetchAssemblyPointEvents();
      void refetchAssemblyPointDetail();
    } catch (error) {
      const backendMessage = extractBackendErrorMessage(error);
      toast.error(backendMessage || "Yeu cau that bai. Vui long thu lai.");
    }
  };

  const selectedEventStatusLabel = selectedEvent
    ? (assemblyEventStatusLabel[selectedEvent.status] ?? selectedEvent.status)
    : "Chưa chọn sự kiện";

  const selectedEventStatusClass = selectedEvent
    ? (assemblyEventStatusColor[selectedEvent.status] ??
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-300")
    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-300";

  const shouldShowOpenCheckIn =
    hasActiveEvent && selectedEvent?.status !== "Gathering";
  const shouldShowCreateTeam =
    hasActiveEvent && selectedEvent?.status === "Gathering";
  const canToggleSchedule = !hasActiveEvent;
  const canOpenCheckIn =
    shouldShowOpenCheckIn && !isStartingGathering && !!selectedEventId;
  const canCreateTeam = shouldShowCreateTeam;
  const checkInActionLabel =
    selectedEvent?.status === "Gathering" ? "Đang check-in" : "Mở check-in";
  const isRefreshingAssemblyData =
    isAssemblyPointDetailFetching || isAssemblyPointEventsFetching;
  const assemblyPointImageUrl = displayAssemblyPoint.imageUrl?.trim() || null;

  const handleRefreshAssemblyData = useCallback(() => {
    void refetchAssemblyPointDetail();
    void refetchAssemblyPointEvents();
  }, [refetchAssemblyPointDetail, refetchAssemblyPointEvents]);

  const handleCreateTeam = () => {
    const eventId = selectedEvent?.eventId ?? selectedEventId;
    const query = eventId
      ? `?assemblyPointId=${assemblyPoint.id}&eventId=${eventId}`
      : "";
    router.push(`/dashboard/coordinator/rescue-teams/create${query}`);
  };

  const toggleTeamExpand = (teamId: number) => {
    setExpandedTeamIds((previous) => ({
      ...previous,
      [teamId]: !previous[teamId],
    }));
  };

  return (
    <>
      {/* Header Banner */}
      <div className="relative shrink-0">
        <div
          className={cn(
            "h-36 relative overflow-hidden",
            assemblyPointImageUrl
              ? "bg-slate-900"
              : "bg-linear-to-br from-purple-500 via-purple-600 to-violet-700",
          )}
        >
          {assemblyPointImageUrl && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${assemblyPointImageUrl})` }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/40 via-black/15 to-transparent" />
            </>
          )}

          {/* Abstract pattern */}
          <div
            className={cn(
              "absolute inset-0 opacity-10",
              assemblyPointImageUrl && "opacity-0",
            )}
          ></div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 text-white hover:bg-white/20 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title Section */}
      <div className="px-5 pt-4 pb-3 border-b shrink-0">
        <h3 className="text-lg font-bold leading-tight">
          {displayAssemblyPoint.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Mã: {displayAssemblyPoint.code}
        </p>

        {/* Status row */}
        <div className="flex items-center gap-2 mt-3">
          <Badge
            className={cn(
              "gap-1.5 px-2.5 py-1",
              statusConfig.bgColor,
              statusConfig.textColor,
              "border-0",
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" weight="fill" />
            {statusConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">Điểm tập kết</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 py-3 border-b shrink-0">
        <div className="grid grid-cols-4 gap-2">
          <div className="flex justify-center">
            <ActionButton
              icon={<CalendarBlank className="h-5 w-5" weight="fill" />}
              label={showScheduleForm ? "Ẩn triệu tập" : "Triệu tập"}
              color={
                canToggleSchedule
                  ? "text-[#FF5722]"
                  : "text-slate-600 dark:text-slate-300"
              }
              active={canToggleSchedule && showScheduleForm}
              disabled={!canToggleSchedule}
              onClick={
                canToggleSchedule
                  ? () => setShowScheduleForm((prev) => !prev)
                  : undefined
              }
            />
          </div>

          <div className="flex justify-center">
            <ActionButton
              icon={<Hash className="h-5 w-5" weight="bold" />}
              label={checkInActionLabel}
              color={
                canOpenCheckIn
                  ? "text-[#FF5722]"
                  : "text-slate-600 dark:text-slate-300"
              }
              active={isStartingGathering}
              disabled={!canOpenCheckIn}
              onClick={canOpenCheckIn ? handleStartGathering : undefined}
            />
          </div>

          <div className="flex justify-center">
            <ActionButton
              icon={<Users className="h-5 w-5" />}
              label="Tạo team"
              color={
                canCreateTeam
                  ? "text-[#FF5722]"
                  : "text-slate-600 dark:text-slate-300"
              }
              disabled={!canCreateTeam}
              onClick={canCreateTeam ? handleCreateTeam : undefined}
            />
          </div>

          <div className="flex justify-center">
            <ActionButton
              icon={
                <ArrowsClockwise
                  className={cn(
                    "h-5 w-5",
                    isRefreshingAssemblyData && "animate-spin",
                  )}
                />
              }
              label="Làm mới"
              color="text-slate-600 dark:text-slate-300"
              active={isRefreshingAssemblyData}
              disabled={isRefreshingAssemblyData}
              onClick={handleRefreshAssemblyData}
            />
          </div>
        </div>

        {!hasActiveEvent && showScheduleForm && (
          <div className="mt-3 rounded-lg border border-[#FF5722]/25 bg-[#FF5722]/5 p-3 space-y-2">
            <AssemblyDateTimePicker
              value={assemblyDateInput}
              onChange={setAssemblyDateInput}
            />
            <p className="text-xs text-muted-foreground">
              Giờ triệu tập là thời điểm rescuer cần có mặt tại điểm tập kết để
              check-in.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-[#FF5722] hover:bg-[#E64A19] text-white"
                onClick={handleScheduleGathering}
                disabled={isSchedulingGathering || !assemblyDateInput}
              >
                {isSchedulingGathering ? "Đang lên lịch..." : "Lên lịch"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="py-2">
        {/* Events */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Sự kiện tập kết</h4>
            <Badge variant="outline" className="text-xs h-5 px-1.5">
              {assemblyPointEvents?.totalCount ?? 0} sự kiện
            </Badge>
          </div>

          {isAssemblyPointEventsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : isAssemblyPointEventsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              Không tải được danh sách sự kiện tập kết.
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-3">
              <Select
                value={selectedEventId ? String(selectedEventId) : undefined}
                onValueChange={(value) => setSelectedEventId(Number(value))}
              >
                <SelectTrigger className="h-10 w-full border-border/70 bg-white px-3 py-2">
                  {selectedEvent ? (
                    <div className="w-full pr-5 text-left">
                      <p className="text-sm font-semibold text-foreground">
                        Sự kiện #{selectedEvent.eventId}
                      </p>
                    </div>
                  ) : (
                    <SelectValue placeholder="Chọn sự kiện để mở check-in" />
                  )}
                </SelectTrigger>
                <SelectContent className="z-1250">
                  {events.map((event) => (
                    <SelectItem
                      key={event.eventId}
                      value={String(event.eventId)}
                      className="py-2"
                    >
                      <div className="min-w-0">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">
                            Sự kiện #{event.eventId}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatDateTimeVi(new Date(event.assemblyDate))}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedEvent ? (
                <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Sự kiện #{selectedEvent.eventId}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs h-5 px-2 shrink-0 border",
                        selectedEventStatusClass,
                      )}
                    >
                      {selectedEventStatusLabel}
                    </Badge>
                  </div>

                  <div className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-2">
                    <p className="text-xs text-muted-foreground mb-0.5">
                      Thời gian tập kết
                    </p>
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <CalendarBlank className="h-4 w-4 text-[#FF5722]" />
                      <span>
                        {formatDateTimeVi(new Date(selectedEvent.assemblyDate))}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <StatCard
                      label="Tổng tham gia"
                      value={String(selectedEvent.participantCount)}
                      icon={<Users className="h-3.5 w-3.5" />}
                    />
                    <StatCard
                      label="Đã check-in"
                      value={String(selectedEvent.checkedInCount)}
                      icon={<ChartBar className="h-3.5 w-3.5" />}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Chưa có sự kiện nào. Hãy tạo lịch triệu tập trước khi mở check-in.
            </div>
          )}
        </div>

        <div className="h-px bg-border mx-5" />

        {/* Code */}
        <InfoRow
          icon={<Hash className="h-5 w-5" />}
          primary={displayAssemblyPoint.code}
          secondary="Mã điểm tập kết"
        />

        <div className="h-px bg-border mx-5" />

        {/* Capacity */}
        <InfoRow
          icon={<Users className="h-5 w-5" />}
          primary={`${displayAssemblyPoint.maxCapacity} người`}
          secondary="Sức chứa người tại điểm tập kết"
        />

        <div className="h-px bg-border mx-5" />

        <div className="h-px bg-border mx-5" />

        {/* Teams */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Đội tại điểm tập kết</h4>
            <Badge variant="outline" className="text-xs h-5 px-1.5">
              {teams.length} đội
            </Badge>
          </div>

          {isAssemblyPointDetailLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, idx) => (
                <Skeleton key={idx} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : isAssemblyPointDetailError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              Không tải được chi tiết đội của điểm tập kết.
            </div>
          ) : teams.length > 0 ? (
            <div className="space-y-3">
              {teams.map((team) => {
                const statusKey = String(team.status);
                const statusLabel =
                  assemblyTeamStatusLabel[statusKey] ??
                  formatStatusText(statusKey);
                const statusColor =
                  assemblyTeamStatusColor[statusKey] ??
                  "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-300";
                const isExpanded = Boolean(expandedTeamIds[team.id]);

                return (
                  <div
                    key={team.id}
                    className="rounded-lg border border-border/60 bg-card px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {team.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {team.code}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs h-5 px-2 shrink-0 border",
                          statusColor,
                        )}
                      >
                        {statusLabel}
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getAssemblyTeamTypeLabel(team.teamType)}</span>
                      <span>•</span>
                      <span>
                        {team.members.length}/{team.maxMembers} thành viên
                      </span>
                    </div>

                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#FF5722] hover:opacity-80"
                      onClick={() => toggleTeamExpand(team.id)}
                    >
                      {isExpanded ? "Ẩn thành viên" : "Xem thành viên"}
                      {isExpanded ? (
                        <CaretUp className="h-3.5 w-3.5" />
                      ) : (
                        <CaretDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5">
                        {team.members.map((member) => (
                          <div
                            key={member.userId}
                            className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {memberRoleLabel[member.roleInTeam]}
                                {member.isLeader ? " • Leader" : ""}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs h-5 px-2 shrink-0",
                                member.status === "Accepted"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
                              )}
                            >
                              {memberStatusLabel[member.status]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Điểm tập kết hiện chưa có đội nào.
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="h-2 bg-muted/50" />
      </div>
    </>
  );
}

function AssemblyDateTimePicker({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (value: Date | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? getMinimumGatheringDate());
  const [hourInput, setHourInput] = useState<string>(
    String(draft.getHours()).padStart(2, "0"),
  );
  const [minuteInput, setMinuteInput] = useState<string>(
    String(draft.getMinutes()).padStart(2, "0"),
  );
  const hourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")),
    [],
  );
  const minuteOptions = useMemo(
    () =>
      Array.from({ length: 60 }, (_, minute) =>
        String(minute).padStart(2, "0"),
      ),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const d = value ?? getMinimumGatheringDate();
    setDraft(d);
    setHourInput(String(d.getHours()).padStart(2, "0"));
    setMinuteInput(String(d.getMinutes()).padStart(2, "0"));
  }, [open, value]);

  const clampToCurrentOrFuture = (date: Date): Date => {
    const minAllowedDate = getMinimumGatheringDate();
    if (date.getTime() < minAllowedDate.getTime()) {
      return minAllowedDate;
    }
    return date;
  };

  const updateTime = (newHour?: number, newMinute?: number) => {
    const hour = newHour !== undefined ? newHour : parseInt(hourInput, 10) || 0;
    const minute =
      newMinute !== undefined ? newMinute : parseInt(minuteInput, 10) || 0;

    const next = new Date(draft);
    next.setHours(
      Math.max(0, Math.min(23, hour)),
      Math.max(0, Math.min(59, minute)),
      0,
      0,
    );
    const clamped = clampToCurrentOrFuture(next);
    setDraft(clamped);
    setHourInput(String(clamped.getHours()).padStart(2, "0"));
    setMinuteInput(String(clamped.getMinutes()).padStart(2, "0"));
  };

  const handleHourSelect = (val: string) => {
    setHourInput(val);
    updateTime(parseInt(val, 10), undefined);
  };

  const handleMinuteSelect = (val: string) => {
    setMinuteInput(val);
    updateTime(undefined, parseInt(val, 10));
  };

  const applySelection = () => {
    onChange(clampToCurrentOrFuture(draft));
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setDraft(value ?? getMinimumGatheringDate());
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-between border-[#FF5722]/35 px-3 text-left font-normal",
            "hover:bg-[#FF5722]/10",
            !value && "text-muted-foreground",
          )}
        >
          <span>
            {value
              ? formatDateTimeVi(value)
              : `Chọn ngày giờ (từ ${formatDateTimeVi(getMinimumGatheringDate())})`}
          </span>
          <CalendarBlank className="h-4 w-4 text-[#FF5722]" weight="fill" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="z-1200 w-[calc(100vw-20px)] max-w-85 space-y-2.5 p-2.5"
        align="start"
        side="bottom"
        sideOffset={6}
        avoidCollisions
        collisionPadding={12}
      >
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Chọn ngày
          </p>
          <Calendar
            mode="single"
            selected={draft}
            onSelect={(date) => {
              if (!date) return;
              const next = new Date(date);
              next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
              const clamped = clampToCurrentOrFuture(next);
              setDraft(clamped);
              setHourInput(String(clamped.getHours()).padStart(2, "0"));
              setMinuteInput(String(clamped.getMinutes()).padStart(2, "0"));
            }}
            locale={vi}
            disabled={(date) => {
              const dayEnd = new Date(date);
              dayEnd.setHours(23, 59, 59, 999);
              return dayEnd.getTime() < getMinimumGatheringDate().getTime();
            }}
            initialFocus
            className="rounded-md border border-border/60 bg-background p-2"
            classNames={{
              months: "flex flex-col gap-2",
              month: "flex flex-col gap-2",
              month_grid: "w-full border-collapse",
              month_caption: "flex h-6 items-center justify-center pt-0.5",
              nav: "absolute top-2 left-0 right-0 flex items-center justify-between px-1 z-10",
              weekdays: "grid grid-cols-7 gap-0",
              week: "mt-1 grid grid-cols-7 gap-0",
              weekday:
                "rounded-md text-center text-xs font-normal text-muted-foreground",
              day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
              day_button:
                "h-7 w-full rounded-none p-0 text-xs font-normal aria-selected:opacity-100",
            }}
          />
        </div>

        <div className="border-t pt-2.5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Chọn thời gian
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {/* Hour Picker */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Giờ</label>
              <Select value={hourInput} onValueChange={handleHourSelect}>
                <SelectTrigger className="h-9 w-full border-border/60 bg-muted/40 text-sm font-semibold">
                  <SelectValue placeholder="Chọn giờ" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="z-1250 max-h-44 w-(--radix-select-trigger-width) overflow-y-auto"
                >
                  {hourOptions.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Minute Picker */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Phút</label>
              <Select value={minuteInput} onValueChange={handleMinuteSelect}>
                <SelectTrigger className="h-9 w-full border-border/60 bg-muted/40 text-sm font-semibold">
                  <SelectValue placeholder="Chọn phút" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="z-1250 max-h-44 w-(--radix-select-trigger-width) overflow-y-auto"
                >
                  {minuteOptions.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-2.5">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Xóa
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            className="h-7 bg-[#FF5722] px-3.5 text-xs text-white hover:bg-[#E64A19]"
            onClick={applySelection}
          >
            Áp dụng
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ════════════════════════════════
// Shared Components
// ════════════════════════════════

function ActionButton({
  icon,
  label,
  color,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors group",
        disabled
          ? "opacity-45 cursor-not-allowed"
          : active
            ? "bg-accent/70"
            : "hover:bg-accent",
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all group-hover:scale-105",
          active && !disabled && "scale-105",
          color,
          "border-current",
        )}
      >
        {icon}
      </div>
      <span className={cn("text-xs font-medium", color)}>{label}</span>
    </button>
  );
}

function InfoRow({
  icon,
  primary,
  secondary,
  isLink,
  isMuted,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  isLink?: boolean;
  isMuted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-accent/50 transition-colors cursor-default">
      <div className="text-muted-foreground shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm truncate",
            isLink && "text-blue-600 dark:text-blue-400",
            isMuted && "text-muted-foreground italic",
          )}
        >
          {primary}
        </div>
        {secondary && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {secondary}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  statusColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  statusColor?: string;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-sm font-bold", statusColor)}>{value}</div>
    </div>
  );
}

export default LocationDetailsPanel;
