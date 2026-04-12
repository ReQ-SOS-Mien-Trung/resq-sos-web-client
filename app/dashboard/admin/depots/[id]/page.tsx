"use client";

import React, { useState, useEffect } from "react";
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
  UserCircle,
  ArrowsLeftRight,
  Phone,
  EnvelopeSimple,
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
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  useDepotById,
  useDepots,
  useDepotChangeableStatuses,
  useDepotAvailableManagers,
  useDepotClosureResolutionMetadata,
  useDepotMetadata,
  useDepotStatuses,
  useAssignDepotManager,
  useUnassignDepotManager,
  useUpdateDepotStatus,
  useInitiateDepotClosure,
  useMarkDepotClosureExternal,
  useInitiateDepotClosureTransfer,
  useDepotClosureByDepotId,
  useDepotClosureDetailByDepotId,
} from "@/services/depot/hooks";
import { useDepotManagers } from "@/services/depot_manager";
import type { DepotStatus, DepotStatusMetadata } from "@/services/depot/type";
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
  const canManageDepotManager = depot?.status !== "Closed";
  const { data: changeableStatusMetadata } = useDepotChangeableStatuses();
  const { data: availableManagers = [] } = useDepotAvailableManagers();
  const [managerHistoryPage, setManagerHistoryPage] = useState(1);
  const [managerHistoryPageSize, setManagerHistoryPageSize] = useState(10);
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
  const changeableStatusOptions = changeableStatusMetadata?.length
    ? changeableStatusMetadata
    : [
        { key: "Available" as const, value: "Đang hoạt động" },
        { key: "Unavailable" as const, value: "Ngưng hoạt động" },
      ];

  const statusCfg = buildStatusCfg(statusMetadata);
  const listDepot = allDepotsData?.items.find((d) => d.id === depotId);
  const requests = listDepot?.requests ?? depot?.requests ?? [];
  const activeChangeableStatusOption = depot
    ? changeableStatusOptions.find((option) => option.key === depot.status)
    : undefined;
  const isCloseOptionSelected = Boolean(
    activeChangeableStatusOption?.value
      ?.toLocaleLowerCase("vi-VN")
      .includes("đóng kho"),
  );

  /* ── State ── */
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
  } | null>(null);

  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolutionType, setResolutionType] = useState<
    "TransferToDepot" | "ExternalResolution"
  >("TransferToDepot");
  const [targetDepotId, setTargetDepotId] = useState("");
  const [externalNote, setExternalNote] = useState("");
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState("");
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

  const initiateTimeoutCountdown = useCountdown(
    initiateResult?.closingTimeoutAt ?? initiateResult?.timeoutAt,
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
            value: "Chuyển toàn bộ hàng sang kho khác",
          },
          {
            key: "ExternalResolution",
            value: "Tự xử lý bên ngoài (admin ghi chú cách xử lý)",
          },
        ];
  const resolveActionPending =
    markExternalMutation.isPending || initiateTransferMutation.isPending;

  function handleRefresh() {
    setIsRefreshing(true);
    Promise.all([
      refetch(),
      refetchAllDepots(),
      refetchManagerHistory(),
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

      const sourceDepot = (allDepotsData?.items ?? []).find(
        (d) => d.manager?.id === selectedManagerId && d.id !== depot.id,
      );

      if (sourceDepot) {
        await unassignManagerMutation.mutateAsync({ id: sourceDepot.id });
      }

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

  async function handleUnassignCurrentManager() {
    if (!depot) return;

    try {
      await unassignManagerMutation.mutateAsync({ id: depot.id });
      toast.success("Đã gỡ quản kho khỏi kho này.");
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
            setInitiateResult({
              closureId: res.closureId ?? 0,
              closureStatus,
              closingTimeoutAt,
              timeoutAt: res.timeoutAt ?? null,
              inventorySummary: res.inventorySummary ?? null,
            });
            setResolutionType("TransferToDepot");
            setTargetDepotId("");
            setExternalNote("");
            setInitiateStep(2);
            handleRefresh();
          } else {
            setInitiateOpen(false);
            setInitiateStep(1);
            setInitiateResult(null);

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
      "Đóng kho và chuyển toàn bộ hàng tồn";

    if (resolutionType === "TransferToDepot") {
      initiateTransferMutation.mutate(
        {
          id: depot.id,
          targetDepotId: Number(targetDepotId),
          reason: transferReason,
        },
        {
          onSuccess: (res) => {
            toast.success(
              res.message ||
                `Đã tạo Transfer #${res.transferId} cho quy trình đóng kho.`,
            );
            setResolveOpen(false);
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
      "Đóng kho và chuyển toàn bộ hàng tồn";

    if (resolutionType === "TransferToDepot") {
      initiateTransferMutation.mutate(
        {
          id: depot.id,
          targetDepotId: Number(targetDepotId),
          reason: transferReason,
        },
        {
          onSuccess: (res) => {
            toast.success(
              res.message ||
                `Đã tạo Transfer #${res.transferId}. Chờ xác nhận giao nhận.`,
            );
            setInitiateOpen(false);
            setInitiateStep(1);
            setInitiateResult(null);
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
  const managerDisplayName = depot.manager
    ? `${depot.manager.lastName} ${depot.manager.firstName}`
    : "Chưa phân công quản lý";
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
                      <p className="mt-2 text-2xl font-semibold tracking-tight">
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
                      <p className="mt-2 text-2xl font-semibold tracking-tight">
                        {availableCapacity.toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/12 bg-black/40 p-4 text-white">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Người phụ trách
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-tight">
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
                {depot.status !== "Closed" && depot.status !== "Closing" && (
                  <div>
                    <p className="px-3 pb-2 font-semibold text-sm uppercase tracking-tighter text-muted-foreground">
                      Chuyển trạng thái kho
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {changeableStatusOptions.map((option) => {
                        const isActive = depot.status === option.key;
                        const isAvailable = option.key === "Available";

                        return (
                          <Button
                            key={option.key}
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            className={cn(
                              "h-11 flex-1 rounded-md px-4 text-sm font-semibold tracking-tighter shadow-none",
                              isActive
                                ? isAvailable
                                  ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "border-yellow-500 bg-yellow-500 text-white hover:bg-yellow-600"
                                : "border-border/60 bg-background text-foreground hover:bg-muted/30",
                            )}
                            disabled={
                              updateStatusMutation.isPending || isActive
                            }
                            onClick={() => handleDepotStatusChange(option.key)}
                          >
                            {isAvailable ? (
                              <Icon
                                icon="line-md:confirm"
                                width="24"
                                height="24"
                              />
                            ) : (
                              <Icon
                                icon="line-md:pause"
                                width="24"
                                height="24"
                              />
                            )}
                            {option.value}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <p className="px-3 font-semibold text-sm uppercase tracking-tighter text-muted-foreground">
                    THAY ĐỔI QUẢN KHO
                  </p>
                  {canManageDepotManager && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-11 flex-1 rounded-md border-slate-300 bg-background px-4 font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setSelectedManagerId(depot.manager?.id ?? "");
                          setManagerDialogOpen(true);
                        }}
                      >
                        <Icon
                          icon="line-md:account-small"
                          width="24"
                          height="24"
                        />
                        Thay quản kho
                      </Button>
                      {depot.manager && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 flex-1 rounded-md border-red-300 bg-background px-4 font-medium text-red-600 hover:bg-red-50"
                          disabled={unassignManagerMutation.isPending}
                          onClick={handleUnassignCurrentManager}
                        >
                          <Icon
                            icon="line-md:account-delete"
                            width="24"
                            height="24"
                          />
                          Gỡ quản kho
                        </Button>
                      )}
                    </div>
                  )}

                  {depot.status === "Unavailable" && !isCloseOptionSelected && (
                    <Button
                      className="h-12 w-full rounded-md border border-red-700 bg-red-600 px-5 text-base font-bold text-white transition-colors hover:border-red-800 hover:bg-red-700 hover:text-white shadow-none"
                      variant="outline"
                      onClick={() => {
                        setInitiateReason("");
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
                        setTargetDepotId("");
                        setExternalNote("");
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  : "Kho vẫn còn không gian để tiếp nhận vật tư mới."}
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

          <Card className="overflow-hidden rounded-2xl border border-border/60 bg-background py-0">
            <CardContent className="space-y-4 px-5 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-4xl bg-sky-50 text-sky-600">
                  <UserCircle size={28} weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-tighter text-muted-foreground">
                    Quản lý kho
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tighter text-slate-950">
                    {managerDisplayName}
                  </p>
                  <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                    {depot.manager?.email && (
                      <p className="flex items-center gap-2">
                        <EnvelopeSimple size={15} className="shrink-0" />
                        <span className="truncate tracking-tighter">
                          {depot.manager.email}
                        </span>
                      </p>
                    )}
                    {depot.manager?.phone && (
                      <p className="flex items-center gap-2">
                        <Phone size={15} className="shrink-0" />
                        <span className="tracking-tighter">
                          {depot.manager.phone}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
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
                    managerHistory.map((record) => (
                      <tr
                        key={`${record.userId}-${record.assignedAt}`}
                        className="border-b border-border/30 transition-colors hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <div className="text-sm font-medium text-foreground">
                            {record.fullName ||
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
                  Trang {managerHistoryData?.pageNumber ?? managerHistoryPage}
                  {managerHistoryData?.totalPages
                    ? ` / ${managerHistoryData.totalPages}`
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
                  disabled={!managerHistoryData?.hasPreviousPage}
                  onClick={() =>
                    setManagerHistoryPage((prev) => Math.max(1, prev - 1))
                  }
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!managerHistoryData?.hasNextPage}
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
                      label: "Vật tư tiêu thụ",
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
          }
        }}
      >
        <DialogContent
          className={
            initiateStep === 2 ? "sm:max-w-lg gap-3" : "gap-2 sm:max-w-md"
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
                {depot.currentUtilization > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <WarningCircle
                      size={15}
                      className="text-amber-500 shrink-0 mt-0.5"
                      weight="fill"
                    />
                    <p className="text-sm text-amber-800 dark:text-amber-300 tracking-tighter leading-relaxed">
                      Kho đang có hàng — sau khi xác nhận sẽ chuyển sang{" "}
                      <strong>Đang đóng</strong>. Nếu không chọn phương án xử lý
                      trong <strong>30 phút</strong>, kho sẽ{" "}
                      <strong>tự động trở về Available</strong>.
                    </p>
                  </div>
                )}
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
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 tracking-tighter text-amber-600 dark:text-amber-400">
                  <HourglassHigh size={18} weight="fill" />
                  Kho còn hàng — Vui lòng xử lý tồn kho
                </DialogTitle>
                <DialogDescription className="tracking-tighter">
                  Kho đã chuyển sang{" "}
                  <span className="font-semibold text-primary">Đang đóng</span>.
                  Nếu không chọn phương án trong vòng{" "}
                  <strong className="text-red-600">30 phút</strong>, kho sẽ{" "}
                  <strong>tự động trở về Available</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-1">
                {/* Summary row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <span className="text-base text-amber-600 dark:text-amber-400 font-bold tracking-tighter uppercase">
                      Tồn kho
                    </span>
                    {initiateResult?.inventorySummary ? (
                      <div className="space-y-0.5">
                        <p className="text-base font-bold tracking-tighter text-amber-900 dark:text-amber-200">
                          {initiateResult.inventorySummary.consumableUnitTotal.toLocaleString(
                            "vi-VN",
                          )}{" "}
                          <span className="text-sm font-normal">
                            vật tư tiêu thụ
                          </span>
                        </p>
                        <p className="text-base font-bold tracking-tighter text-amber-900 dark:text-amber-200">
                          {initiateResult.inventorySummary.reusableAvailableCount.toLocaleString(
                            "vi-VN",
                          )}{" "}
                          <span className="text-sm font-normal">
                            thiết bị sẵn sàng
                          </span>
                        </p>
                        <p className="text-base font-bold tracking-tighter text-amber-900 dark:text-amber-200">
                          {initiateResult.inventorySummary.reusableInUseCount.toLocaleString(
                            "vi-VN",
                          )}{" "}
                          <span className="text-sm font-normal">
                            thiết bị đang dùng
                          </span>
                        </p>
                      </div>
                    ) : (
                      <span className="text-xl font-bold tracking-tighter text-amber-900 dark:text-amber-200">
                        {depot.currentUtilization.toLocaleString("vi-VN")}{" "}
                        <span className="text-sm font-normal">mục</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <span className="text-base text-red-600 dark:text-red-400 font-semibold tracking-tighter uppercase">
                      Hết hạn xử lý
                    </span>
                    {initiateResult?.closingTimeoutAt ||
                    initiateResult?.timeoutAt ? (
                      <>
                        <span className="text-base font-semibold tracking-tighter text-black dark:text-white">
                          {new Date(
                            initiateResult.closingTimeoutAt ??
                              initiateResult.timeoutAt ??
                              Date.now(),
                          ).toLocaleString("vi-VN")}
                        </span>

                        {initiateTimeoutCountdown && (
                          <span className="text-base font-mono font-semibold text-red-600 dark:text-red-400 tabular-nums">
                            <span className="text-black">Còn lại:</span>{" "}
                            {initiateTimeoutCountdown}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xl font-bold tracking-tighter text-red-800 dark:text-red-300">
                        30 <span className="text-sm font-normal">phút</span>
                      </span>
                    )}
                  </div>
                </div>
                {/* Resolution type */}
                <div className="space-y-2">
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
                              ? "Chuyển toàn bộ sang kho đích"
                              : "Đóng kho ngay, ghi lại cách xử lý bên ngoài"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {resolutionType === "TransferToDepot" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold tracking-tighter">
                      Kho nhận hàng <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={targetDepotId}
                      onValueChange={setTargetDepotId}
                    >
                      <SelectTrigger className="text-sm tracking-tighter">
                        <SelectValue placeholder="Chọn kho nhận hàng..." />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        avoidCollisions={false}
                        className="z-10000 w-(--radix-select-trigger-width)"
                      >
                        {depotOptions
                          .filter((d) => d.key !== depot.id)
                          .map((d) => (
                            <SelectItem
                              key={d.key}
                              value={String(d.key)}
                              className="text-sm tracking-tighter"
                            >
                              {d.value}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {resolutionType === "ExternalResolution" && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="ext-note-inline"
                      className="text-sm font-semibold tracking-tighter"
                    >
                      Ghi chú cách xử lý <span className="text-red-500">*</span>
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
              <DialogFooter>
                <Button
                  variant="ghost"
                  className="tracking-tighter text-muted-foreground"
                  onClick={() => {
                    setInitiateOpen(false);
                    setInitiateStep(1);
                  }}
                >
                  Xử lý sau
                </Button>
                <Button
                  className="tracking-tighter gap-1.5"
                  disabled={
                    resolveActionPending ||
                    (resolutionType === "TransferToDepot" && !targetDepotId) ||
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
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════
          Dialog: Resolve Closure
      ═══════════════════════════════════ */}
      <Dialog
        open={resolveOpen}
        onOpenChange={(o) => !o && setResolveOpen(false)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 tracking-tighter">
              <WarehouseIcon size={18} className="text-blue-500" />
              Xử lý tồn kho
            </DialogTitle>
            <DialogDescription className="tracking-tight">
              Kho: <strong>{depot.name}</strong> — chọn phương án xử lý hàng
              trước khi đóng kho chính thức.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold tracking-tight">
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
                      <p className="text-sm font-semibold tracking-tight">
                        {opt.value}
                      </p>
                      <p className="text-sm text-muted-foreground tracking-tight mt-0.5">
                        {opt.key === "TransferToDepot"
                          ? "Chuyển toàn bộ sang kho đích"
                          : "Admin ghi lại cách xử lý bên ngoài"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {resolutionType === "TransferToDepot" && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold tracking-tight">
                  Kho nhận hàng <span className="text-red-500">*</span>
                </Label>
                <Select value={targetDepotId} onValueChange={setTargetDepotId}>
                  <SelectTrigger className="text-sm tracking-tight">
                    <SelectValue placeholder="Chọn kho nhận hàng..." />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    avoidCollisions={false}
                    className="z-10000 w-(--radix-select-trigger-width)"
                  >
                    {depotOptions
                      .filter((d) => d.key !== depot.id)
                      .map((d) => (
                        <SelectItem
                          key={d.key}
                          value={String(d.key)}
                          className="text-sm tracking-tight"
                        >
                          {d.value}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {resolutionType === "ExternalResolution" && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="ext-note"
                  className="text-sm font-semibold tracking-tight"
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
          <DialogFooter>
            <Button
              variant="outline"
              className="tracking-tight"
              onClick={() => setResolveOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className="tracking-tight gap-1.5"
              disabled={
                resolveActionPending ||
                (resolutionType === "TransferToDepot" && !targetDepotId) ||
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
              Thay quản kho
            </DialogTitle>
            <DialogDescription className="tracking-tight">
              Nếu quản kho đã thuộc kho khác, hệ thống sẽ gỡ khỏi kho cũ trước,
              rồi gán vào kho này.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="tracking-tight">Kho hiện tại</Label>
              <div className="text-sm tracking-tight rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
                {depot.name}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="tracking-tight">Chọn quản kho</Label>
              <Select
                value={selectedManagerId || "__none"}
                onValueChange={(value) =>
                  setSelectedManagerId(value === "__none" ? "" : value)
                }
              >
                <SelectTrigger className="tracking-tight">
                  <SelectValue placeholder="Chọn quản kho" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={4}
                  avoidCollisions={false}
                  className="z-10000 w-(--radix-select-trigger-width)"
                >
                  <SelectItem value="__none">Chọn quản kho</SelectItem>
                  {Array.from(
                    new Map(
                      [
                        ...availableManagers.map((m) => ({
                          id: m.id,
                          label: `${m.fullName} (${m.phone})`,
                        })),
                        ...(allDepotsData?.items ?? [])
                          .filter((d) => !!d.manager)
                          .map((d) => ({
                            id: d.manager!.id,
                            label: `${d.manager!.fullName ?? `${d.manager!.lastName} ${d.manager!.firstName}`} (${d.manager!.phone ?? "—"})`,
                          })),
                      ].map((x) => [x.id, x] as const),
                    ).values(),
                  ).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="tracking-tight"
              onClick={() => setManagerDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className="tracking-tight"
              disabled={!selectedManagerId || isSwitchingManager}
              onClick={handleSwitchManager}
            >
              {isSwitchingManager ? "Đang cập nhật..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
