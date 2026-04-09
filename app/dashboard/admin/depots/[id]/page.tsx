"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  X,
  MapPin,
  Package,
  ArrowClockwise,
  UserCircle,
  ArrowsLeftRight,
  Phone,
  EnvelopeSimple,
  ClockCounterClockwise,
  ArrowRight,
  CheckFat,
  XCircle,
  HourglassHigh,
  Truck,
  ArrowFatLinesDown,
  WarningCircle,
  Spinner,
  CaretLeft,
  WarehouseIcon,
  LockIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  useDepotById,
  useDepots,
  useDepotAvailableManagers,
  useDepotMetadata,
  useDepotStatuses,
  useAssignDepotManager,
  useUnassignDepotManager,
  useInitiateDepotClosure,
  useResolveDepotClosure,
  useCancelDepotClosure,
  useDepotClosureMetadata,
  useDepotClosures,
  useDepotClosureTransfer,
} from "@/services/depot/hooks";
import type {
  DepotStatus,
  DepotStatusMetadata,
  DepotClosureRecord,
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

    const id = setInterval(
      () => setTick((tick) => tick + 1),
      1_000,
    );
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
  Available: {
    color: "text-white",
    bg: "bg-emerald-600 border-emerald-400 dark:bg-emerald-700",
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
  Available: "Đang hoạt động",
  Full: "Đã đầy",
  PendingAssignment: "Chưa có quản lý",
  Closed: "Đã đóng",
  Closing: "Đang tiến hành đóng kho",
  UnderMaintenance: "Đang bảo trì",
};

function buildStatusCfg(apiStatuses?: DepotStatusMetadata[]): StatusCfgMap {
  const result: StatusCfgMap = {};
  const keys: DepotStatus[] = [
    "Available",
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

/* ── Closure status style ─────────────────────────────────────── */
const CLOSURE_STATUS_STYLE: Record<
  string,
  { label: string; color: string; bg: string; Icon: React.ElementType }
> = {
  InProgress: {
    label: "Đang xử lý",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50  dark:bg-amber-950/30  border-amber-200  dark:border-amber-800",
    Icon: HourglassHigh,
  },
  Processing: {
    label: "Đang xử lý",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    Icon: Spinner,
  },
  Completed: {
    label: "Hoàn thành",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    Icon: CheckFat,
  },
  Cancelled: {
    label: "Đã hủy",
    color: "text-zinc-600 dark:text-zinc-400",
    bg: "bg-zinc-50   dark:bg-zinc-950/30   border-zinc-200   dark:border-zinc-700",
    Icon: XCircle,
  },
  TimedOut: {
    label: "Hết thời hạn",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50    dark:bg-red-950/30    border-red-200    dark:border-red-800",
    Icon: XCircle,
  },
  TransferPending: {
    label: "Đang chuyển kho",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    Icon: ArrowsLeftRight,
  },
};

function getClosureStatusCfg(status: string) {
  return (
    CLOSURE_STATUS_STYLE[status] ?? {
      label: status,
      color: "text-muted-foreground",
      bg: "bg-muted border-border",
      Icon: ClockCounterClockwise,
    }
  );
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

const ACTIVE_CLOSURE_STATUSES = [
  "InProgress",
  "Processing",
  "TransferPending",
] as const;

/* ── Page ─────────────────────────────────────────────────────── */
export default function DepotDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const depotId = Number(rawId);
  const router = useRouter();

  /* ── Data ── */
  const { data: depot, isLoading, refetch } = useDepotById(depotId);
  const {
    data: closures = [],
    isLoading: closuresLoading,
    refetch: refetchClosures,
  } = useDepotClosures(depotId);
  /* requests only comes from the list endpoint, not GET /depot/{id} */
  const { data: allDepotsData, refetch: refetchAllDepots } = useDepots({
    params: { pageNumber: 1, pageSize: 200 },
  });
  const { data: depotOptions = [] } = useDepotMetadata();
  const { data: statusMetadata } = useDepotStatuses();
  const { data: closureMeta } = useDepotClosureMetadata();
  const { data: availableManagers = [] } = useDepotAvailableManagers();

  const statusCfg = buildStatusCfg(statusMetadata);
  const listDepot = allDepotsData?.items.find((d) => d.id === depotId);
  const requests = listDepot?.requests ?? depot?.requests ?? [];
  const activeInProgressClosure =
    closures.find((c) =>
      ACTIVE_CLOSURE_STATUSES.includes(
        c.status as (typeof ACTIVE_CLOSURE_STATUSES)[number],
      ),
    ) ?? null;
  const activeClosureStatus = activeInProgressClosure?.status ?? null;
  const activeTransferId =
    activeInProgressClosure?.transfer?.transferId ?? null;

  /* ── State ── */
  const [knownClosureIds, setKnownClosureIds] = useState<
    Record<number, number>
  >({});
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
  const [resolveClosureId, setResolveClosureId] = useState("");
  const [resolutionType, setResolutionType] = useState<
    "TransferToDepot" | "ExternalResolution"
  >("TransferToDepot");
  const [targetDepotId, setTargetDepotId] = useState("");
  const [externalNote, setExternalNote] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelClosureId, setCancelClosureId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [locallyResolvedClosureIds, setLocallyResolvedClosureIds] = useState<
    Record<number, true>
  >({});
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [isSwitchingManager, setIsSwitchingManager] = useState(false);
  const initiateMutation = useInitiateDepotClosure();
  const resolveMutation = useResolveDepotClosure();
  const cancelMutation = useCancelDepotClosure();
  const assignManagerMutation = useAssignDepotManager();
  const unassignManagerMutation = useUnassignDepotManager();

  const initiateTimeoutCountdown = useCountdown(
    initiateResult?.closingTimeoutAt ??
      initiateResult?.timeoutAt ??
      activeInProgressClosure?.closingTimeoutAt,
  );
  const closingTimeoutCountdown = useCountdown(
    activeInProgressClosure?.closingTimeoutAt,
  );

  const activeClosureId =
    knownClosureIds[depotId] ?? activeInProgressClosure?.id ?? null;
  const { data: activeTransfer, refetch: refetchTransfer } =
    useDepotClosureTransfer(
      depotId,
      activeClosureId ?? 0,
      activeTransferId ?? 0,
      { enabled: !!(activeClosureId && activeTransferId) },
    );
  const currentTransferStatus = normalizeTransferStatus(
    activeTransfer?.status ?? activeInProgressClosure?.transfer?.status,
  );
  const isLocallyResolved = Boolean(
    activeClosureId && locallyResolvedClosureIds[activeClosureId],
  );
  const shouldShowResolveButton = Boolean(
    activeInProgressClosure &&
      activeClosureStatus === "InProgress" &&
      !isLocallyResolved,
  );
  const canCancelClosure =
    activeClosureStatus !== "Processing" &&
    (!activeInProgressClosure?.transfer ||
      currentTransferStatus === "AwaitingPreparation");

  const resolutionTypes = closureMeta?.resolutionTypes ?? [
    { key: "TransferToDepot", value: "Chuyển toàn bộ hàng sang kho khác" },
    {
      key: "ExternalResolution",
      value: "Tự xử lý bên ngoài (admin ghi chú cách xử lý)",
    },
  ];

  function handleRefresh() {
    setIsRefreshing(true);
    Promise.all([
      refetch(),
      refetchAllDepots(),
      refetchClosures(),
      ...(activeTransferId ? [refetchTransfer()] : []),
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

  function handleInitiate() {
    if (!depot || !initiateReason.trim()) return;
    initiateMutation.mutate(
      { id: depot.id, reason: initiateReason.trim() },
      {
        onSuccess: (res) => {
          const closureStatus =
            res.closureStatus ?? (res.requiresResolution ? "InProgress" : "Completed");
          const closingTimeoutAt = res.closingTimeoutAt ?? res.timeoutAt ?? null;

          if (res.closureId) {
            setKnownClosureIds((prev) => ({
              ...prev,
              [depot.id]: res.closureId,
            }));
          }

          if (closureStatus === "InProgress" && res.closureId) {
            setInitiateResult({
              closureId: res.closureId,
              closureStatus,
              closingTimeoutAt,
              timeoutAt: res.timeoutAt ?? null,
              inventorySummary: res.inventorySummary ?? null,
            });
            setResolveClosureId(String(res.closureId));
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
              toast.error("Phiên đóng kho đã hết thời hạn và kho đã tự khôi phục.");
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
    const closureId = knownClosureIds[depot.id] ?? Number(resolveClosureId);
    if (!closureId) return;
    resolveMutation.mutate(
      {
        id: depot.id,
        closureId,
        resolutionType,
        targetDepotId:
          resolutionType === "TransferToDepot"
            ? Number(targetDepotId)
            : undefined,
        externalNote:
          resolutionType === "ExternalResolution"
            ? externalNote.trim()
            : undefined,
      },
      {
        onSuccess: () => {
          setLocallyResolvedClosureIds((prev) => ({
            ...prev,
            [closureId]: true,
          }));
          toast.success("Đã xử lý tồn kho — kho sẽ được đóng chính thức.");
          setResolveOpen(false);
          handleRefresh();
        },
        onError: (err) => toast.error(getApiError(err, "Giải quyết thất bại.")),
      },
    );
  }

  function handleResolveInDialog() {
    if (!depot) return;
    const closureId = knownClosureIds[depot.id] ?? Number(resolveClosureId);
    if (!closureId) return;
    resolveMutation.mutate(
      {
        id: depot.id,
        closureId,
        resolutionType,
        targetDepotId:
          resolutionType === "TransferToDepot"
            ? Number(targetDepotId)
            : undefined,
        externalNote:
          resolutionType === "ExternalResolution"
            ? externalNote.trim()
            : undefined,
      },
      {
        onSuccess: (res) => {
          setLocallyResolvedClosureIds((prev) => ({
            ...prev,
            [closureId]: true,
          }));
          if (res.transferPending && res.transferSummary) {
            toast.success(
              `Đã tạo Transfer #${res.transferSummary.transferId} → ${res.transferSummary.targetDepotName}. Chờ xác nhận giao nhận.`,
            );
          } else {
            toast.success("Đã xử lý tồn kho — kho đã đóng chính thức.");
          }
          setInitiateOpen(false);
          setInitiateStep(1);
          setInitiateResult(null);
          handleRefresh();
        },
        onError: (err) => toast.error(getApiError(err, "Giải quyết thất bại.")),
      },
    );
  }

  function handleCancel() {
    if (!depot) return;
    const closureId = knownClosureIds[depot.id] ?? Number(cancelClosureId);
    if (!closureId) return;
    cancelMutation.mutate(
      { id: depot.id, closureId, cancellationReason: cancelReason.trim() },
      {
        onSuccess: () => {
          toast.success("Đã hủy quy trình đóng kho.");
          setCancelOpen(false);
          handleRefresh();
        },
        onError: (err) => toast.error(getApiError(err, "Hủy thất bại.")),
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
  const pctColor =
    pct > 80
      ? "text-red-600 dark:text-red-400"
      : pct > 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";
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
      <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* ══ Header ══ */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-9 w-9 p-0 shrink-0 rounded-xl"
            >
              <CaretLeft size={18} />
            </Button>
            <div>
              <p className="text-sm font-semibold text-muted-foreground tracking-wider uppercase mb-0.5">
                Kho số {depot.id}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter leading-tight">
                {depot.name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1 flex-wrap justify-end">
            <Badge
              className={cn(
                "text-sm font-semibold tracking-tight px-3 py-1.5 border",
                cfg.bg,
                cfg.color,
              )}
            >
              {depot.status === "Closing" && (
                <span className="mr-1.5 h-2 w-2 rounded-full bg-red-300 animate-pulse inline-block" />
              )}
              {cfg.label}
            </Badge>

            {/* ── Inline action buttons ── */}
            {depot.status !== "Closed" && (
              <>
                {["Available", "Full", "PendingAssignment"].includes(
                  depot.status,
                ) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                    onClick={() => {
                      setInitiateReason("");
                      setInitiateOpen(true);
                    }}
                  >
                    <LockIcon size={15} />
                    Đóng kho
                  </Button>
                )}
                {depot.status === "Closing" && (
                  <>
                    {/* Chỉ hiện nút Giải quyết khi chưa resolve (chưa chọn cách xử lý) */}
                    {shouldShowResolveButton && (
                      <Button
                        size="sm"
                        className="gap-1.5 font-semibold"
                        onClick={() => {
                          const cid =
                            knownClosureIds[depot.id] ??
                            activeInProgressClosure?.id;
                          setResolveClosureId(String(cid ?? ""));
                          setResolutionType("TransferToDepot");
                          setTargetDepotId("");
                          setExternalNote("");
                          setResolveOpen(true);
                        }}
                      >
                        <Icon
                          icon="lsicon:goods-outline"
                          width="16"
                          height="16"
                        />
                        Giải quyết
                      </Button>
                    )}
                    {canCancelClosure && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 font-semibold"
                        onClick={() => {
                          const cid =
                            knownClosureIds[depot.id] ??
                            activeInProgressClosure?.id;
                          setCancelClosureId(String(cid ?? ""));
                          setCancelReason("");
                          setCancelOpen(true);
                        }}
                      >
                        <X size={15} />
                        Hủy đóng
                      </Button>
                    )}
                  </>
                )}
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 p-0 rounded-xl"
            >
              <ArrowClockwise
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </Button>
          </div>
        </div>

        {/* ══ Hero image ══ */}
        <div className="relative w-full rounded-2xl overflow-hidden">
          {depot.imageUrl ? (
            <div className="relative h-80 sm:h-88 w-full">
              <Image
                src={depot.imageUrl}
                alt={depot.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/40 via-black/5 to-transparent" />
            </div>
          ) : (
            <div className="h-48 w-full bg-muted/50 border border-border/50 flex items-center justify-center">
              <Warehouse size={48} className="text-muted-foreground/20" />
            </div>
          )}

          {/* Closing warning banner */}
          {depot.status === "Closing" && (
            <div
              className={cn(
                "absolute top-4 left-4 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 rounded-xl backdrop-blur-sm border shadow-xl text-white",
                closingBannerTheme.wrapper,
              )}
            >
              <div className="flex items-center gap-2">
                {activeClosureStatus === "Processing" ? (
                  <Spinner size={15} className="text-white shrink-0 animate-spin" />
                ) : activeClosureStatus === "TransferPending" ? (
                  <ArrowsLeftRight
                    size={15}
                    className="text-white shrink-0"
                    weight="fill"
                  />
                ) : (
                  <WarningCircle
                    size={15}
                    className="text-white shrink-0"
                    weight="fill"
                  />
                )}
                <span className="text-sm font-bold text-white tracking-tighter">
                  {closingBannerLabel}
                </span>
                {(knownClosureIds[depot.id] || activeInProgressClosure) && (
                  <span
                    className={cn(
                      "text-sm font-medium tracking-tighter opacity-80",
                      closingBannerTheme.muted,
                    )}
                  >
                    · Closure #
                    {knownClosureIds[depot.id] ?? activeInProgressClosure?.id}
                  </span>
                )}
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
              {activeInProgressClosure && (
                <>
                  <div className="flex items-center gap-4">
                    {activeInProgressClosure.closingTimeoutAt && (
                      <>
                        <div
                          className={cn(
                            "w-px h-3 opacity-50 hidden sm:block",
                            closingBannerTheme.divider,
                          )}
                        />
                        <div className="flex items-center gap-1.5 text-xs text-white tracking-tighter">
                          <HourglassHigh size={13} className="shrink-0" />
                          <span>
                            Hết hạn:{" "}
                            <strong>
                              {new Date(
                                activeInProgressClosure.closingTimeoutAt,
                              ).toLocaleString("vi-VN")}
                            </strong>
                            {closingTimeoutCountdown && (
                              <span className="ml-1.5 font-mono opacity-80">
                                ({closingTimeoutCountdown})
                              </span>
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ══ Info cards — 3 columns ══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Utilization */}
          <Card className="border border-border/60 p-0">
            <CardContent className="p-4 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Tình trạng tồn kho
              </p>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <span className="text-2xl font-bold tracking-tighter tabular-nums">
                    {depot.currentUtilization.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-sm text-muted-foreground tracking-tighter ml-1.5">
                    / {depot.capacity.toLocaleString("vi-VN")}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-2xl font-bold tabular-nums tracking-tighter",
                    pctColor,
                  )}
                >
                  {pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all rounded-full", barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium tracking-tighter">
                  Còn trống
                </span>
                <span className="text-base font-bold tabular-nums tracking-tighter">
                  {Math.max(
                    0,
                    depot.capacity - depot.currentUtilization,
                  ).toLocaleString("vi-VN")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="border border-border/60 p-0">
            <CardContent className="p-4 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Vị trí
              </p>
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                  <MapPin size={18} weight="fill" className="text-primary" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-base font-semibold tracking-tight leading-snug">
                    {depot.address}
                  </p>
                  <p className="text-sm text-muted-foreground tracking-tight font-mono">
                    Tọa độ:{" "}
                    <span className="font-medium text-black dark:text-white">
                      {depot.latitude.toFixed(6)}, {depot.longitude.toFixed(6)}
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground tracking-tight border-t border-border/50 pt-2">
                Cập nhật lần cuối:{" "}
                <span className="font-semibold text-foreground/80">
                  {new Date(depot.lastUpdatedAt).toLocaleString("vi-VN")}
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Manager */}
          <Card className="border border-border/60 p-0">
            <CardContent className="p-4 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Quản lý kho
              </p>
              {depot.manager ? (
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCircle
                      size={26}
                      weight="fill"
                      className="text-primary"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold tracking-tighter">
                      {depot.manager.lastName} {depot.manager.firstName}
                    </p>
                    <div className="mt-1 space-y-2">
                      {depot.manager.email && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground tracking-tight">
                          <EnvelopeSimple size={18} className="shrink-0" />
                          <span className="truncate">
                            {depot.manager.email}
                          </span>
                        </p>
                      )}
                      {depot.manager.phone && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground tracking-tight">
                          <Phone size={18} className="shrink-0" />
                          {depot.manager.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <UserCircle
                      size={26}
                      className="text-muted-foreground/40"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground/60 tracking-tight">
                    Chưa phân công
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-border/50 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 tracking-tight"
                  onClick={() => {
                    setSelectedManagerId(depot.manager?.id ?? "");
                    setManagerDialogOpen(true);
                  }}
                >
                  <ArrowsLeftRight size={14} />
                  Thay quản kho
                </Button>
                {depot.manager && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 tracking-tight text-amber-700 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    disabled={unassignManagerMutation.isPending}
                    onClick={handleUnassignCurrentManager}
                  >
                    <X size={14} />
                    Gỡ quản kho
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ══ Transfer Panel ══ */}
        {depot.status === "Closing" &&
          !!activeInProgressClosure?.transfer &&
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
                    Transfer #{activeInProgressClosure.transfer.transferId}
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
                {activeInProgressClosure.targetDepotName && (
                  <div className="flex items-center gap-1.5 text-sm font-semibold tracking-tighter text-blue-700 dark:text-blue-400">
                    <Icon
                      icon="fluent:vehicle-truck-cube-20-regular"
                      width="24"
                      height="24"
                    />
                    <span>
                      →{" "}
                      <span className="font-semibold">
                        {activeInProgressClosure.targetDepotName}
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
                        activeInProgressClosure.snapshotConsumableUnits
                      ).toLocaleString("vi-VN"),
                    },
                    {
                      label: "Thiết bị tái sử dụng",
                      value: (
                        activeTransfer?.snapshotReusableUnits ??
                        activeInProgressClosure.snapshotReusableUnits
                      ).toLocaleString("vi-VN"),
                    },
                    {
                      label: "Kho nhận",
                      value:
                        activeInProgressClosure.targetDepotName ??
                        (activeInProgressClosure.targetDepotId
                          ? `#${activeInProgressClosure.targetDepotId}`
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
          !activeInProgressClosure?.transfer && (
            <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Spinner size={18} className="animate-spin text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold tracking-tighter text-blue-900 dark:text-blue-200">
                    Hệ thống đang xử lý phiên đóng kho
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 tracking-tighter">
                    Server đang hoàn tất bước chuẩn bị dữ liệu. Màn hình sẽ cập nhật ngay khi có thể tiếp tục.
                  </p>
                </div>
              </div>
            </div>
          )}

        <Separator className="mb-3" />

        {/* ══ Active Requests ══ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tighter">
                Các đơn tiếp tế trong kho
              </h2>
            </div>
            {requests.length > 0 && (
              <Badge
                variant="secondary"
                className="text-sm text-white rounded-xl bg-green-600 border-green-100 border-4 font-semibold px-2.5 py-1.5"
              >
                Có {requests.length} yêu cầu
              </Badge>
            )}
          </div>

          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-border/50 rounded-2xl bg-muted/10">
              <Package size={36} className="text-muted-foreground/25 mb-3" />
              <p className="text-base font-medium text-muted-foreground tracking-tighter">
                Không có yêu cầu nào đang xử lý
              </p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
              {requests.map((req) => {
                const isRequester = req.role === "Requester";
                const priorityStyle =
                  req.priorityLevel === "Critical"
                    ? "text-red-700    bg-red-50    border-red-200    dark:bg-red-950/30    dark:border-red-800    dark:text-red-400"
                    : req.priorityLevel === "High"
                      ? "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400"
                      : req.priorityLevel === "Medium"
                        ? "text-blue-700   bg-blue-50   border-blue-200   dark:bg-blue-950/30   dark:border-blue-800   dark:text-blue-400"
                        : "text-zinc-600   bg-zinc-50   border-zinc-200   dark:bg-zinc-900/30   dark:border-zinc-700   dark:text-zinc-400";
                return (
                  <Card
                    key={req.id}
                    className="border border-border/60 py-0 shrink-0 w-88"
                  >
                    <CardContent className="p-5 space-y-3.5">
                      {/* Role + Priority */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                              isRequester
                                ? "bg-blue-50 dark:bg-blue-950/30"
                                : "bg-emerald-50 dark:bg-emerald-950/30",
                            )}
                          >
                            {isRequester ? (
                              <ArrowFatLinesDown
                                size={15}
                                weight="fill"
                                className="text-blue-500"
                              />
                            ) : (
                              <Truck
                                size={15}
                                weight="fill"
                                className="text-emerald-500"
                              />
                            )}
                          </div>
                          <span className="text-base font-bold tracking-tight">
                            {isRequester ? "Nhận hàng" : "Cung cấp hàng"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-bold tracking-tighter px-2 py-0.5 rounded-md border ${priorityStyle}`}
                          >
                            {req.priorityLevel}
                          </span>
                          <span className="text-xs tracking-tighter text-muted-foreground font-mono">
                            #{req.id}
                          </span>
                        </div>
                      </div>

                      {/* Route */}
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/40 text-sm tracking-tighter">
                        <span
                          className={cn(
                            "font-semibold flex-1 text-right leading-snug",
                            !isRequester && "text-primary",
                          )}
                        >
                          {req.sourceDepotName}
                        </span>
                        <ArrowRight
                          size={14}
                          className="text-muted-foreground shrink-0 mt-0.5"
                        />
                        <span
                          className={cn(
                            "font-semibold flex-1 leading-snug",
                            isRequester && "text-primary",
                          )}
                        >
                          {req.requestingDepotName}
                        </span>
                      </div>

                      {/* Statuses */}
                      <div className="grid grid-cols-2 gap-8 text-sm">
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground font-medium tracking-tighter">
                            Trạng thái nguồn
                          </p>
                          <p className="font-semibold tracking-tighter">
                            {req.sourceStatus}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground font-medium tracking-tighter">
                            Trạng thái nhận
                          </p>
                          <p className="font-semibold tracking-tighter">
                            {req.requestingStatus}
                          </p>
                        </div>
                      </div>

                      {/* Time */}
                      <p className="text-xs text-muted-foreground tracking-tighter border-t border-border/50 pt-2.5">
                        Tạo lúc:{" "}
                        <span className="font-semibold text-foreground/70">
                          {new Date(req.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Separator className="mb-3" />

        {/* ══ Closure History ══ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tighter">
                Lịch sử đóng kho
              </h2>
            </div>
            {closures.length > 0 && (
              <Badge
                variant="secondary"
                className="text-sm text-white rounded-xl bg-green-600 border-green-100 border-4 font-semibold px-2.5 py-1.5"
              >
                Có {closures.length} phiên
              </Badge>
            )}
          </div>

          {closuresLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/50 p-5 space-y-3"
                >
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2 mt-2" />
                </div>
              ))}
            </div>
          ) : closures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center border border-border/50 rounded-2xl bg-muted/10">
              <ClockCounterClockwise
                size={40}
                className="text-muted-foreground/20 mb-3"
              />
              <p className="text-base font-medium text-muted-foreground tracking-tighter">
                Chưa có phiên đóng kho nào
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {closures.map((c: DepotClosureRecord) => {
                const scfg = getClosureStatusCfg(c.status);
                const StatusIcon = scfg.Icon;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-2xl border px-5 py-3 space-y-3",
                      scfg.bg,
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          size={16}
                          weight="fill"
                          className={scfg.color}
                        />
                        <span
                          className={cn(
                            "text-base font-bold tracking-tighter",
                            scfg.color,
                          )}
                        >
                          {scfg.label}
                        </span>
                      </div>
                      <span className="text-sm tracking-tighter text-muted-foreground font-semibold">
                        Phiên số {c.id}
                      </span>
                    </div>

                    {c.closeReason && (
                      <p className="text-sm tracking-tighter font-semibold mb-1">
                        <span className="font-normal">Lý do đóng kho: </span>
                        {c.closeReason}
                      </p>
                    )}

                    {c.resolutionType && (
                      <div className="flex items-center gap-2 text-sm tracking-tighter">
                        <ArrowsLeftRight
                          size={14}
                          className="text-muted-foreground shrink-0"
                        />
                        {c.resolutionType === "TransferToDepot" ? (
                          <span>
                            Chuyển sang{" "}
                            <span className="font-semibold">
                              {c.targetDepotName ?? `Kho #${c.targetDepotId}`}
                            </span>
                          </span>
                        ) : (
                          <span>{c.externalNote ?? "Tự xử lý bên ngoài"}</span>
                        )}
                      </div>
                    )}

                    {c.transfer && (
                      <div className="flex items-center gap-2">
                        <ArrowRight
                          size={13}
                          className="text-muted-foreground shrink-0"
                        />
                        <span className="text-sm tracking-tighter text-muted-foreground">
                          Transfer #{c.transfer.transferId} —{" "}
                          <span className="font-semibold text-foreground/70">
                            {c.transfer.status}
                          </span>
                        </span>
                      </div>
                    )}

                    {c.cancellationReason && (
                      <p className="text-sm tracking-tighter font-bold">
                        <span className="font-normal">Lý do hủy đóng: </span>
                        {c.cancellationReason}
                      </p>
                    )}

                    <div className="pt-2 border-t border-current/10 space-y-1">
                      <p className="text-sm text-muted-foreground tracking-tighter">
                        Đóng kho bởi:{" "}
                        <span className="font-semibold text-black dark:text-white">
                          {c.initiatedByFullName}
                        </span>
                        {" — "} vào lúc{" "}
                        <span className="font-semibold text-black dark:text-white">
                          {new Date(c.initiatedAt).toLocaleString("vi-VN")}
                        </span>
                      </p>
                      {c.completedAt && (
                        <p className="text-sm text-muted-foreground tracking-tighter">
                          Hoàn thành:{" "}
                          <span className="font-semibold text-black dark:text-white">
                            {new Date(c.completedAt).toLocaleString("vi-VN")}
                          </span>
                        </p>
                      )}
                      {c.cancelledAt && c.cancelledByFullName && (
                        <p className="text-sm text-black dark:text-white tracking-tighter">
                          Hủy đóng kho bởi:{" "}
                          <span className="font-semibold text-black dark:text-white">
                            {c.cancelledByFullName}
                          </span>
                          {" — "} vào lúc{" "}
                          <span className="font-semibold text-black dark:text-white">
                            {new Date(c.cancelledAt).toLocaleString("vi-VN")}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
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
                {/* Closure ID */}
                {knownClosureIds[depot.id] && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/50 border border-border/50">
                    <span className="text-sm text-muted-foreground tracking-tighter">
                      Closure ID
                    </span>
                    <span className="text-sm font-bold tabular-nums tracking-tighter font-mono">
                      #{knownClosureIds[depot.id]}
                    </span>
                  </div>
                )}
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
                    resolveMutation.isPending ||
                    (resolutionType === "TransferToDepot" && !targetDepotId) ||
                    (resolutionType === "ExternalResolution" &&
                      !externalNote.trim())
                  }
                  onClick={handleResolveInDialog}
                >
                  {resolveMutation.isPending && (
                    <Spinner size={13} className="animate-spin" />
                  )}
                  Xử lý ngay &amp; đóng kho
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
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
              <span className="text-sm text-muted-foreground tracking-tight">
                Closure ID
              </span>
              <span className="text-sm font-bold tabular-nums tracking-tighter font-mono">
                #{knownClosureIds[depot.id] ?? resolveClosureId ?? "—"}
              </span>
            </div>
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
                resolveMutation.isPending ||
                (!knownClosureIds[depot.id] && !resolveClosureId) ||
                (resolutionType === "TransferToDepot" && !targetDepotId) ||
                (resolutionType === "ExternalResolution" &&
                  !externalNote.trim())
              }
              onClick={handleResolve}
            >
              {resolveMutation.isPending && (
                <Spinner size={13} className="animate-spin" />
              )}
              Xác nhận xử lý
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════
          Dialog: Cancel Closure
      ═══════════════════════════════════ */}
      <Dialog
        open={cancelOpen}
        onOpenChange={(o) => !o && setCancelOpen(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 tracking-tighter">
              <X size={18} className="text-amber-500" />
              Hủy đóng kho
            </DialogTitle>
            <DialogDescription className="tracking-tight">
              Kho: <strong>{depot.name}</strong>
              <br />
              Kho sẽ quay về trạng thái <strong>Available</strong> hoặc{" "}
              <strong>Full</strong> tùy lượng tồn kho.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
              <span className="text-sm text-muted-foreground tracking-tight">
                Closure ID
              </span>
              <span className="text-sm font-bold tabular-nums tracking-tighter font-mono">
                #{knownClosureIds[depot.id] ?? cancelClosureId ?? "—"}
              </span>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="cancel-reason"
                className="text-sm font-semibold tracking-tight"
              >
                Lý do hủy <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="Nhập lý do hủy quy trình đóng kho..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="text-sm tracking-tight resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="tracking-tight"
              onClick={() => setCancelOpen(false)}
            >
              Đóng
            </Button>
            <Button
              className="tracking-tight gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
              disabled={
                cancelMutation.isPending ||
                (!knownClosureIds[depot.id] && !cancelClosureId) ||
                !cancelReason.trim()
              }
              onClick={handleCancel}
            >
              {cancelMutation.isPending && (
                <Spinner size={13} className="animate-spin" />
              )}
              Xác nhận hủy đóng
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
