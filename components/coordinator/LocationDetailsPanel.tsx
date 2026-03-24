"use client";

import { useEffect, useMemo, useState } from "react";
import type { DepotEntity } from "@/services/depot/type";
import {
  useAssemblyPointById,
  useScheduleAssemblyPointGathering,
  useStartAssemblyPointGathering,
} from "@/services/assembly_points/hooks";
import type {
  AssemblyPointEntity,
  AssemblyPointDetailEntity,
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
  Factory,
  Clock,
  User,
  Phone,
  EnvelopeSimple,
  Package,
  ChartBar,
  NavigationArrow,
  ShareNetwork,
  BookmarkSimple,
  DotsThree,
  Users,
  Hash,
  Info,
  CalendarBlank,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { LocationDetailsPanelProps } from "@/type";
import { depotStatusConfig, assemblyPointStatusConfig } from "@/lib/constants";

// Panel width
const PANEL_WIDTH = 420;
const MIN_GATHERING_HOURS = 48;
const GATHERING_SUBMIT_BUFFER_MINUTES = 5;

const assemblyTeamTypeLabel: Record<AssemblyPointTeam["teamType"], string> = {
  Rescue: "Cứu hộ",
  Medical: "Y tế",
  Transportation: "Vận chuyển",
};

const assemblyTeamStatusLabel: Record<AssemblyPointTeam["status"], string> = {
  AwaitingAcceptance: "Chờ xác nhận",
  Ready: "Sẵn sàng",
  Gathering: "Đang tập hợp",
};

const assemblyTeamStatusColor: Record<AssemblyPointTeam["status"], string> = {
  AwaitingAcceptance:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
  Ready:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  Gathering:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300",
};

const memberStatusLabel: Record<AssemblyPointTeamMember["status"], string> = {
  Accepted: "Đã xác nhận",
  Pending: "Đang chờ",
};

const memberRoleLabel: Record<AssemblyPointTeamMember["roleInTeam"], string> = {
  Leader: "Trưởng nhóm",
  Member: "Thành viên",
};

function formatLastUpdated(dateStr: string): string {
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

function formatDateTimeLocal(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
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
  const minDate = new Date(
    now.getTime() +
      MIN_GATHERING_HOURS * 60 * 60 * 1000 +
      GATHERING_SUBMIT_BUFFER_MINUTES * 60 * 1000,
  );

  // Input datetime-local uses minute precision, so normalize seconds.
  minDate.setSeconds(0, 0);
  return minDate;
}

function clampToMinimumDate(date: Date, minDate: Date): Date {
  if (date.getTime() < minDate.getTime()) {
    return new Date(minDate);
  }
  return date;
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

function getInventoryQuantities(item: InventoryItemEntity): {
  total: number;
  reserved: number;
  available: number;
} {
  if (item.itemType === "Consumable") {
    return {
      total: item.quantity,
      reserved: item.reservedQuantity,
      available: item.availableQuantity,
    };
  }

  return {
    total: item.unit,
    reserved: item.reservedUnit,
    available: item.availableUnit,
  };
}

const LocationDetailsPanel = ({
  open,
  onOpenChange,
  location,
}: LocationDetailsPanelProps) => {
  if (!location && !open) return null;

  return (
    <div
      className={cn(
        "absolute top-0 left-0 h-full z-[1000] transition-all duration-300 ease-in-out",
        open
          ? "opacity-100 translate-x-0"
          : "opacity-0 -translate-x-full pointer-events-none",
      )}
      style={{ width: PANEL_WIDTH }}
    >
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
  const {
    data: inventoryData,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
  } = useDepotInventory({
    depotId: depot.id,
    pageNumber: 1,
    pageSize: 8,
  });

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

  const inventorySummary = useMemo(() => {
    if (!inventoryData?.items) {
      return {
        totalStock: 0,
        reservedStock: 0,
        availableStock: 0,
      };
    }

    return inventoryData.items.reduce(
      (acc, item) => {
        const qty = getInventoryQuantities(item);
        acc.totalStock += qty.total;
        acc.reservedStock += qty.reserved;
        acc.availableStock += qty.available;
        return acc;
      },
      {
        totalStock: 0,
        reservedStock: 0,
        availableStock: 0,
      },
    );
  }, [inventoryData]);

  return (
    <>
      {/* Header Banner */}
      <div className="relative shrink-0">
        <div className="h-36 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 relative overflow-hidden">
          {/* Abstract warehouse pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 w-16 h-16 border-2 border-white rounded-lg" />
            <div className="absolute top-8 left-24 w-12 h-12 border-2 border-white rounded-lg" />
            <div className="absolute bottom-4 right-8 w-20 h-14 border-2 border-white rounded-lg" />
            <div className="absolute bottom-8 right-32 w-10 h-10 border-2 border-white rounded-lg" />
          </div>

          {/* Main icon */}
          <div className="absolute bottom-4 left-5 flex items-end gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Factory className="h-7 w-7 text-white" weight="fill" />
            </div>
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

      {/* Quick Actions - Google Maps style */}
      <div className="px-5 py-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <ActionButton
            icon={<NavigationArrow className="h-5 w-5" weight="fill" />}
            label="Chỉ đường"
            color="text-blue-600 dark:text-blue-400"
          />
          <ActionButton
            icon={<BookmarkSimple className="h-5 w-5" />}
            label="Lưu"
            color="text-blue-600 dark:text-blue-400"
          />
          <ActionButton
            icon={<ShareNetwork className="h-5 w-5" />}
            label="Chia sẻ"
            color="text-blue-600 dark:text-blue-400"
          />
          <ActionButton
            icon={<DotsThree className="h-5 w-5" weight="bold" />}
            label="Thêm"
            color="text-blue-600 dark:text-blue-400"
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
              primary={depot.manager.fullName}
              secondary="Quản lý kho"
            />

            <div className="h-px bg-border mx-5" />

            <InfoRow
              icon={<Phone className="h-5 w-5" />}
              primary={depot.manager.phone}
              secondary="Số điện thoại"
              isLink
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
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
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
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                  <p className="text-[10px] text-muted-foreground">Tổng tồn</p>
                  <p className="text-sm font-bold text-slate-800">
                    {inventorySummary.totalStock.toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2">
                  <p className="text-[10px] text-amber-700">Đã giữ chỗ</p>
                  <p className="text-sm font-bold text-amber-800">
                    {inventorySummary.reservedStock.toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2">
                  <p className="text-[10px] text-emerald-700">Còn khả dụng</p>
                  <p className="text-sm font-bold text-emerald-800">
                    {inventorySummary.availableStock.toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>

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
                      <Badge
                        variant="secondary"
                        className="text-[10px] shrink-0"
                      >
                        {item.itemType === "Consumable"
                          ? "Tiêu thụ"
                          : "Tái sử dụng"}
                      </Badge>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.categoryName}</span>
                      <span>•</span>
                      <span>{item.targetGroup}</span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                        <p className="text-[10px] text-slate-600">Tổng tồn</p>
                        <p className="text-sm font-semibold leading-none text-slate-800">
                          {qty.total.toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
                        <p className="text-[10px] text-amber-700">Đã giữ</p>
                        <p className="text-sm font-semibold leading-none text-amber-800">
                          {qty.reserved.toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5">
                        <p className="text-[10px] text-emerald-700">
                          Còn khả dụng
                        </p>
                        <p className="text-sm font-semibold leading-none text-emerald-800">
                          {qty.available.toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
  const [assemblyDateInput, setAssemblyDateInput] = useState<Date | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  const {
    data: assemblyPointDetail,
    isLoading: isAssemblyPointDetailLoading,
    isError: isAssemblyPointDetailError,
    refetch: refetchAssemblyPointDetail,
  } = useAssemblyPointById(assemblyPoint.id, { enabled: true });

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

  useEffect(() => {
    if (hasActiveEvent) {
      setShowScheduleForm(false);
    }
  }, [hasActiveEvent]);

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
        `Thời điểm triệu tập phải từ 48 giờ trở lên. Vui lòng chọn từ ${formatDateTimeVi(minAllowedDate)} (giờ VN).`,
      );
      return;
    }

    try {
      const result = await scheduleGathering({
        id: assemblyPoint.id,
        assemblyDate: assemblyDate.toISOString(),
      });
      toast.success(
        `Đã lên lịch tập trung thành công (Event #${result.eventId}).`,
      );
      setAssemblyDateInput(null);
    } catch (error) {
      const backendMessage = extractBackendErrorMessage(error);
      toast.error(backendMessage || "Yeu cau that bai. Vui long thu lai.");
    }
  };

  const handleStartGathering = async () => {
    let targetEventId = activeEventId;

    if (!targetEventId) {
      const refreshed = await refetchAssemblyPointDetail();
      targetEventId = resolveActiveEventId(refreshed.data);
      if (!targetEventId) {
        toast.error(
          "Khong xac dinh duoc eventId tu du lieu backend. Vui long kiem tra response detail assembly-point.",
        );
        return;
      }
    }

    try {
      await startGathering({
        eventId: targetEventId,
        assemblyPointId: assemblyPoint.id,
      });
      toast.success("Đã mở check-in cho sự kiện tập kết đang hoạt động.");
    } catch (error) {
      const backendMessage = extractBackendErrorMessage(error);
      toast.error(backendMessage || "Yeu cau that bai. Vui long thu lai.");
    }
  };

  return (
    <>
      {/* Header Banner */}
      <div className="relative shrink-0">
        <div className="h-36 bg-gradient-to-br from-purple-500 via-purple-600 to-violet-700 relative overflow-hidden">
          {/* Abstract pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-6 left-6 w-8 h-8 rounded-full border-2 border-white" />
            <div className="absolute top-3 left-20 w-6 h-6 rounded-full border-2 border-white" />
            <div className="absolute bottom-6 left-12 w-10 h-10 rounded-full border-2 border-white" />
            <div className="absolute top-10 right-10 w-12 h-12 rounded-full border-2 border-white" />
            <div className="absolute bottom-4 right-20 w-7 h-7 rounded-full border-2 border-white" />
          </div>

          {/* Main icon */}
          <div className="absolute bottom-4 left-5 flex items-end gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <MapPin className="h-7 w-7 text-white" weight="fill" />
            </div>
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
        <div className="flex items-center justify-between">
          <ActionButton
            icon={<NavigationArrow className="h-5 w-5" weight="fill" />}
            label="Chỉ đường"
            color="text-purple-600 dark:text-purple-400"
          />
          <ActionButton
            icon={<BookmarkSimple className="h-5 w-5" />}
            label="Lưu"
            color="text-purple-600 dark:text-purple-400"
          />
          <ActionButton
            icon={<ShareNetwork className="h-5 w-5" />}
            label="Chia sẻ"
            color="text-purple-600 dark:text-purple-400"
          />
          {hasActiveEvent ? (
            <ActionButton
              icon={<CalendarBlank className="h-5 w-5" weight="fill" />}
              label="Mở check-in"
              color="text-[#FF5722]"
              active={isStartingGathering}
              onClick={handleStartGathering}
            />
          ) : (
            <ActionButton
              icon={<CalendarBlank className="h-5 w-5" weight="fill" />}
              label="Triệu tập"
              color="text-[#FF5722]"
              active={showScheduleForm}
              onClick={() => setShowScheduleForm((prev) => !prev)}
            />
          )}
        </div>

        {!hasActiveEvent && showScheduleForm && (
          <div className="mt-3 rounded-lg border border-[#FF5722]/25 bg-[#FF5722]/5 p-3 space-y-2">
            <AssemblyDateTimePicker
              value={assemblyDateInput}
              onChange={setAssemblyDateInput}
            />
            <p className="text-[11px] text-muted-foreground">
              Điều kiện: thời điểm triệu tập phải từ 48 giờ trở lên kể từ hiện
              tại. Hệ thống cộng thêm {GATHERING_SUBMIT_BUFFER_MINUTES} phút để
              tránh lỗi sát giờ khi gửi yêu cầu.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-[#FF5722]/40 text-[#FF5722] hover:bg-[#FF5722]/10"
                onClick={() => setAssemblyDateInput(getMinimumGatheringDate())}
              >
                Gợi ý an toàn
              </Button>
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

        {/* Last Updated */}
        <InfoRow
          icon={<Clock className="h-5 w-5" />}
          primary={formatLastUpdated(displayAssemblyPoint.lastUpdatedAt)}
          secondary="Cập nhật lần cuối"
        />

        <div className="h-px bg-border mx-5" />

        {/* Teams */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Đội tại điểm tập kết</h4>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
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
              {teams.map((team) => (
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
                        "text-[10px] h-5 px-2 shrink-0 border",
                        assemblyTeamStatusColor[team.status],
                      )}
                    >
                      {assemblyTeamStatusLabel[team.status]}
                    </Badge>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{assemblyTeamTypeLabel[team.teamType]}</span>
                    <span>•</span>
                    <span>
                      {team.members.length}/{team.maxMembers} thành viên
                    </span>
                  </div>

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
                          <p className="text-[11px] text-muted-foreground truncate">
                            {memberRoleLabel[member.roleInTeam]}
                            {member.isLeader ? " • Leader" : ""}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] h-5 px-2 shrink-0",
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
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Điểm tập kết hiện chưa có đội nào.
            </div>
          )}
        </div>
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
  const minAllowedDate = getMinimumGatheringDate();
  const [draft, setDraft] = useState<Date>(value ?? minAllowedDate);

  useEffect(() => {
    if (!open) return;
    setDraft(value ?? getMinimumGatheringDate());
  }, [open, value]);

  const hourValue = String(draft.getHours()).padStart(2, "0");
  const minuteValue = String(draft.getMinutes()).padStart(2, "0");

  const updateHour = (hour: string) => {
    const base = new Date(draft);
    base.setHours(Number(hour), base.getMinutes(), 0, 0);
    setDraft(clampToMinimumDate(base, minAllowedDate));
  };

  const updateMinute = (minute: string) => {
    const base = new Date(draft);
    base.setHours(base.getHours(), Number(minute), 0, 0);
    setDraft(clampToMinimumDate(base, minAllowedDate));
  };

  const applySelection = () => {
    onChange(clampToMinimumDate(draft, minAllowedDate));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
              : `Chọn ngày giờ (từ ${formatDateTimeVi(minAllowedDate)})`}
          </span>
          <CalendarBlank className="h-4 w-4 text-[#FF5722]" weight="fill" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="z-[1200] w-[340px] space-y-3 p-3"
        align="start"
        side="bottom"
        sideOffset={8}
        avoidCollisions={false}
      >
        <Calendar
          mode="single"
          selected={draft}
          onSelect={(date) => {
            if (!date) return;
            const next = new Date(date);
            next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
            setDraft(clampToMinimumDate(next, minAllowedDate));
          }}
          locale={vi}
          disabled={(date) => {
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            return dayEnd.getTime() < minAllowedDate.getTime();
          }}
          initialFocus
        />

        <div className="grid grid-cols-2 gap-2">
          <Select value={hourValue} onValueChange={updateHour}>
            <SelectTrigger className="h-8 w-full border-border/60 bg-white text-xs">
              <SelectValue placeholder="Giờ" />
            </SelectTrigger>
            <SelectContent className="z-[1250]">
              {Array.from({ length: 24 }, (_, hour) => {
                const value = String(hour).padStart(2, "0");
                return (
                  <SelectItem key={value} value={value}>
                    {value} giờ
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={minuteValue} onValueChange={updateMinute}>
            <SelectTrigger className="h-8 w-full border-border/60 bg-white text-xs">
              <SelectValue placeholder="Phút" />
            </SelectTrigger>
            <SelectContent className="z-[1250]">
              {Array.from({ length: 60 }, (_, minute) => {
                const value = String(minute).padStart(2, "0");
                return (
                  <SelectItem key={value} value={value}>
                    {value} phút
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between border-t pt-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
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
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-[#FF5722] hover:bg-[#FF5722]/10"
              onClick={() => setDraft(getMinimumGatheringDate())}
            >
              Mốc an toàn
            </Button>

            <Button
              type="button"
              size="sm"
              className="h-7 bg-[#FF5722] px-2 text-xs text-white hover:bg-[#E64A19]"
              onClick={applySelection}
            >
              Áp dụng
            </Button>
          </div>
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
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors group",
        active ? "bg-accent/70" : "hover:bg-accent",
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all group-hover:scale-105",
          active && "scale-105",
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
