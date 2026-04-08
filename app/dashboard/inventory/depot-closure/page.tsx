"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowLeft,
  ArrowsLeftRight,
  ArrowRight,
  CheckFat,
  HourglassHigh,
  Package,
  Truck,
  WarningCircle,
  Spinner,
  XCircle,
  ClockCounterClockwise,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import {
  useDepotById,
  useDepotClosures,
  useDepotClosureTransfer,
  usePrepareDepotTransfer,
  useShipDepotTransfer,
  useCompleteDepotTransfer,
  useReceiveDepotTransfer,
} from "@/services/depot/hooks";
import type { DepotClosureRecord } from "@/services/depot/type";
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
  const [remaining, setRemaining] = useState(() => computeCountdown(deadline));
  useEffect(() => {
    const id = setInterval(
      () => setRemaining(computeCountdown(deadline)),
      1_000,
    );
    return () => clearInterval(id);
  }, [deadline]);
  return remaining;
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
  AwaitingPreparation: {
    label: "Chờ chuẩn bị",
    color: "text-zinc-700 dark:text-zinc-300",
    bg: "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-700",
    Icon: HourglassHigh,
  },
  Preparing: {
    label: "Đang chuẩn bị",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    Icon: Package,
  },
  Shipping: {
    label: "Đang vận chuyển",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    Icon: Truck,
  },
  Received: {
    label: "Đã nhận",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    Icon: CheckFat,
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
 * API mới trả enum key tiếng Anh; vẫn giữ map tiếng Việt để tương thích.
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

/* ── Transfer step config ─────────────────────────────────────── */
const TRANSFER_STEPS = [
  { key: "AwaitingPreparation", label: "Chờ xử lý" },
  { key: "Preparing", label: "Chuẩn bị" },
  { key: "Shipping", label: "Đang vận chuyển" },
  { key: "Completed", label: "Đã giao" },
  { key: "Received", label: "Đã nhận" },
] as const;

const STEP_ORDER: string[] = TRANSFER_STEPS.map((s) => s.key);

/* ── Page ─────────────────────────────────────────────────────── */
export default function DepotClosurePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const depotId = user?.depotId ?? 0;

  /* ── Data ── */
  const {
    data: depot,
    isLoading: depotLoading,
    refetch: refetchDepot,
  } = useDepotById(depotId);
  const {
    data: closures = [],
    isLoading: closuresLoading,
    refetch: refetchClosures,
  } = useDepotClosures(depotId);

  const activeInProgressClosure =
    closures.find((c) =>
      ["InProgress", "TransferPending"].includes(c.status),
    ) ?? null;
  const activeClosureId = activeInProgressClosure?.id ?? null;
  const activeTransferId =
    activeInProgressClosure?.transfer?.transferId ?? null;

  const { data: activeTransfer, refetch: refetchTransfer } =
    useDepotClosureTransfer(
      depotId,
      activeClosureId ?? 0,
      activeTransferId ?? 0,
      { enabled: !!(depotId && activeClosureId && activeTransferId) },
    );

  const currentTransferStatus = normalizeTransferStatus(
    activeTransfer?.status ?? activeInProgressClosure?.transfer?.status,
  );

  /* ── Role detection: source vs target depot manager ── */
  // Closures are queried for depotId, so if targetDepotId matches our depot
  // we're the receiving depot; otherwise we're the source depot.
  const isTargetManager =
    !!activeInProgressClosure &&
    activeInProgressClosure.targetDepotId === depotId;
  const isSourceManager = !!activeInProgressClosure && !isTargetManager;

  /* ── State ── */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transferAction, setTransferAction] = useState<
    "prepare" | "ship" | "complete" | "receive" | null
  >(null);
  const [transferNote, setTransferNote] = useState("");

  /* ── Mutations ── */
  const prepareMutation = usePrepareDepotTransfer();
  const shipMutation = useShipDepotTransfer();
  const completeMutation = useCompleteDepotTransfer();
  const receiveMutation = useReceiveDepotTransfer();
  const isActionPending =
    prepareMutation.isPending ||
    shipMutation.isPending ||
    completeMutation.isPending ||
    receiveMutation.isPending;

  const closingTimeoutCountdown = useCountdown(
    activeInProgressClosure?.closingTimeoutAt,
  );

  /* ── Handlers ── */
  function handleRefresh() {
    setIsRefreshing(true);
    Promise.all([
      refetchDepot(),
      refetchClosures(),
      ...(activeTransferId ? [refetchTransfer()] : []),
    ]).finally(() => setIsRefreshing(false));
  }

  function handleTransferAction() {
    if (!depotId || !activeClosureId || !activeTransferId || !transferAction)
      return;
    const action = transferAction;
    const payload = {
      id: depotId,
      closureId: activeClosureId,
      transferId: activeTransferId,
      ...(transferNote.trim() ? { note: transferNote.trim() } : {}),
    };
    const labels: Record<typeof action, string> = {
      prepare: "Đã xác nhận chuẩn bị hàng.",
      ship: "Đã xác nhận xuất hàng.",
      complete: "Đã xác nhận hoàn tất xuất hàng.",
      receive: "Đã xác nhận nhận hàng — kho đã đóng chính thức.",
    };
    function onDone() {
      toast.success(labels[action]);
      setTransferAction(null);
      setTransferNote("");
      handleRefresh();
    }
    function onFail(err: unknown) {
      toast.error(getApiError(err, "Thao tác thất bại."));
    }
    if (action === "prepare")
      prepareMutation.mutate(payload, { onSuccess: onDone, onError: onFail });
    else if (action === "ship")
      shipMutation.mutate(payload, { onSuccess: onDone, onError: onFail });
    else if (action === "complete")
      completeMutation.mutate(payload, { onSuccess: onDone, onError: onFail });
    else
      receiveMutation.mutate(payload, { onSuccess: onDone, onError: onFail });
  }

  /* ── No depot assigned ── */
  if (!depotId) {
    return (
      <div className="flex flex-col bg-background min-h-screen">
        <header className="border-b bg-background px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => router.push("/dashboard/inventory")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl tracking-tighter font-bold">
              Đóng kho & Chuyển hàng
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground tracking-tighter">
            Bạn chưa được phân công quản lý kho nào.
          </p>
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (depotLoading || closuresLoading) {
    return (
      <div className="flex flex-col bg-background min-h-screen">
        <header className="border-b bg-background px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </header>
        <div className="p-6 space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background min-h-screen">
      {/* ══ Header ══ */}
      <header className="border-b bg-background px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => router.push("/dashboard/inventory")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl tracking-tighter font-bold leading-tight mb-1">
                  Đóng kho & Chuyển hàng
                </h1>
                <div className="flex items-center gap-2 text-base tracking-tighter font-medium text-muted-foreground">
                  <span>{depot?.name ?? `Kho #${depotId}`}</span>
                  {depot?.status && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-sm",
                        depot.status === "Closing"
                          ? "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                          : depot.status === "Closed"
                            ? "border-zinc-300 border bg-zinc-700 text-zinc-100"
                            : "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400",
                      )}
                    >
                      {depot.status === "Closing"
                        ? "Đang đóng"
                        : depot.status === "Closed"
                          ? "Đã đóng"
                          : depot.status}
                    </Badge>
                  )}
                  {isTargetManager && (
                    <Badge
                      variant="outline"
                      className="text-sm border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400"
                    >
                      Kho nhận hàng
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 p-0 rounded-xl shrink-0"
          >
            <ArrowClockwise
              size={16}
              className={isRefreshing ? "animate-spin" : ""}
            />
          </Button>
        </div>
      </header>

      {/* ══ Main ══ */}
      <main className="px-6 py-6 space-y-6 flex-1">
        {/* ── Active Transfer Panel ── */}
        {activeInProgressClosure?.transfer && activeClosureId ? (
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
                            : s === "Received"
                              ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-300"
                              : "bg-muted border-border text-muted-foreground";
                  const lbl: Record<string, string> = {
                    AwaitingPreparation: "Chờ chuẩn bị",
                    Preparing: "Đang chuẩn bị",
                    Shipping: "Đang vận chuyển",
                    Completed: "Chờ xác nhận nhận",
                    Received: "Đã nhận",
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
              {isSourceManager && activeInProgressClosure.targetDepotName && (
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
              {isTargetManager && (
                <div className="flex items-center gap-1.5 text-sm font-semibold tracking-tighter text-emerald-700 dark:text-emerald-400">
                  <Icon
                    icon="fluent:vehicle-truck-cube-20-regular"
                    width="24"
                    height="24"
                  />
                  <span>
                    ←{" "}
                    <span className="font-semibold">
                      {activeInProgressClosure.sourceDepotName ??
                        `Kho #${activeInProgressClosure.depotId}`}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="p-5 space-y-5">
              {/* Step Progress */}
              <div className="flex items-start">
                {TRANSFER_STEPS.map((step, i) => {
                  const cur = STEP_ORDER.indexOf(currentTransferStatus);
                  const me = STEP_ORDER.indexOf(step.key);
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
                            <span className="text-xs font-bold leading-none">
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium text-center leading-tight tracking-tighter whitespace-nowrap",
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
                    label: isTargetManager ? "Kho nguồn" : "Kho nhận",
                    value: isTargetManager
                      ? (activeInProgressClosure.sourceDepotName ??
                        `Kho #${activeInProgressClosure.depotId}`)
                      : (activeInProgressClosure.targetDepotName ??
                        (activeInProgressClosure.targetDepotId
                          ? `#${activeInProgressClosure.targetDepotId}`
                          : "—")),
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

              {/* Transfer detail info */}
              {activeTransfer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
                  {activeTransfer.shippedAt && (
                    <div className="text-xs text-muted-foreground tracking-tighter">
                      Xuất hàng:{" "}
                      <span className="font-semibold text-foreground/70">
                        {new Date(activeTransfer.shippedAt).toLocaleString(
                          "vi-VN",
                        )}
                      </span>
                      {activeTransfer.shipNote && (
                        <span className="ml-1 italic">
                          — {activeTransfer.shipNote}
                        </span>
                      )}
                    </div>
                  )}
                  {activeTransfer.receivedAt && (
                    <div className="text-xs text-muted-foreground tracking-tighter">
                      Nhận hàng:{" "}
                      <span className="font-semibold text-foreground/70">
                        {new Date(activeTransfer.receivedAt).toLocaleString(
                          "vi-VN",
                        )}
                      </span>
                      {activeTransfer.receiveNote && (
                        <span className="ml-1 italic">
                          — {activeTransfer.receiveNote}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action button */}
              {(() => {
                /* Source manager actions: Pending→prepare, Preparing→ship, Shipping→complete */
                const sourceCfgMap: Record<
                  string,
                  {
                    label: string;
                    action: "prepare" | "ship" | "complete";
                  }
                > = {
                  AwaitingPreparation: {
                    label: "Bắt đầu chuẩn bị hàng",
                    action: "prepare",
                  },
                  Preparing: {
                    label: "Xác nhận xuất hàng",
                    action: "ship",
                  },
                  Shipping: {
                    label: "Hoàn tất xuất hàng",
                    action: "complete",
                  },
                };
                /* Target manager action: Completed→receive */
                const targetCfgMap: Record<
                  string,
                  {
                    label: string;
                    action: "receive";
                    emerald: boolean;
                  }
                > = {
                  Completed: {
                    label: "Xác nhận đã nhận hàng",
                    action: "receive",
                    emerald: true,
                  },
                };

                const cfg = isSourceManager
                  ? sourceCfgMap[currentTransferStatus]
                  : isTargetManager
                    ? targetCfgMap[currentTransferStatus]
                    : undefined;
                if (!cfg) {
                  /* Show waiting message for target manager when transfer is not yet Completed */
                  if (isTargetManager && currentTransferStatus !== "Received") {
                    const waitLabel: Record<string, string> = {
                      AwaitingPreparation: "Đang chờ kho nguồn chuẩn bị hàng…",
                      Preparing: "Kho nguồn đang chuẩn bị hàng…",
                      Shipping: "Hàng đang được vận chuyển đến kho bạn…",
                    };
                    const msg = waitLabel[currentTransferStatus];
                    if (msg) {
                      return (
                        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground tracking-tighter">
                          <HourglassHigh size={14} className="animate-pulse" />
                          <span className="font-medium">{msg}</span>
                        </div>
                      );
                    }
                  }
                  return null;
                }
                const isEmerald = "emerald" in cfg && cfg.emerald;
                return (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className={cn(
                        "gap-1.5 py-2 font-semibold tracking-tighter",
                        isEmerald
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20",
                      )}
                      onClick={() => {
                        setTransferNote("");
                        setTransferAction(cfg.action);
                      }}
                    >
                      <Truck size={14} />
                      {cfg.label}
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : depot?.status === "Closing" ? (
          /* Closing but no transfer — e.g. ExternalResolution */
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <div className="flex items-center gap-2">
              <WarningCircle
                size={15}
                className="text-amber-500 shrink-0"
                weight="fill"
              />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 tracking-tighter">
                Kho đang trong quy trình đóng — Quản trị viên đang xử lý tồn kho
                bên ngoài hệ thống.
              </span>
            </div>
            {activeInProgressClosure && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 tracking-tighter">
                  <Package size={13} className="shrink-0" />
                  <span>
                    Tồn kho:{" "}
                    <strong>
                      {(
                        activeInProgressClosure.snapshotConsumableUnits +
                        activeInProgressClosure.snapshotReusableUnits
                      ).toLocaleString("vi-VN")}{" "}
                      mục
                    </strong>
                  </span>
                </div>
                {activeInProgressClosure.closingTimeoutAt && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 tracking-tighter">
                    <HourglassHigh size={13} className="shrink-0" />
                    <span>
                      Hết hạn:{" "}
                      <strong>
                        {new Date(
                          activeInProgressClosure.closingTimeoutAt,
                        ).toLocaleString("vi-VN")}
                      </strong>
                      {closingTimeoutCountdown && (
                        <span className="ml-1.5 font-mono font-semibold text-amber-700 dark:text-amber-300">
                          ({closingTimeoutCountdown})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : depot?.status !== "Closed" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-border/50 rounded-2xl bg-muted/10">
            <ArrowsLeftRight
              size={40}
              className="text-muted-foreground/20 mb-3"
            />
            <p className="text-base font-medium text-muted-foreground tracking-tighter">
              Kho đang hoạt động bình thường
            </p>
            <p className="text-sm text-muted-foreground/60 tracking-tighter mt-1">
              Không có quy trình đóng kho hay chuyển hàng đang diễn ra.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-border/50 rounded-2xl bg-muted/10">
            <XCircle size={40} className="text-muted-foreground/20 mb-3" />
            <p className="text-base font-medium text-muted-foreground tracking-tighter">
              Kho đã đóng
            </p>
          </div>
        )}

        {/* ── Closure History ── */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tighter">
            Lịch sử đóng kho
          </h2>

          {closuresLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/50 p-5 space-y-3"
                >
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : closures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-border/50 rounded-2xl bg-muted/10">
              <ClockCounterClockwise
                size={36}
                className="text-muted-foreground/20 mb-3"
              />
              <p className="text-sm font-medium text-muted-foreground tracking-tighter">
                Chưa có phiên đóng kho nào
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {closures.map((c: DepotClosureRecord) => {
                const displayStatus = c.transfer?.status ?? c.status;
                const scfg = getClosureStatusCfg(displayStatus);
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
                            {c.depotId === depotId ? (
                              <>
                                Chuyển sang{" "}
                                <span className="font-semibold">
                                  {c.targetDepotName ??
                                    `Kho #${c.targetDepotId}`}
                                </span>
                              </>
                            ) : (
                              <>
                                Nhận hàng từ{" "}
                                <span className="font-semibold">
                                  {c.sourceDepotName ?? `Kho #${c.depotId}`}
                                </span>
                              </>
                            )}
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
      </main>

      {/* ═══════════════════════════════════
          Dialog: Transfer Action
      ═══════════════════════════════════ */}
      <Dialog
        open={!!transferAction}
        onOpenChange={(o) => {
          if (!o) {
            setTransferAction(null);
            setTransferNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm gap-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 tracking-tighter">
              <Truck size={17} className="text-blue-500" />
              {transferAction === "prepare"
                ? "Xác nhận chuẩn bị hàng"
                : transferAction === "ship"
                  ? "Xác nhận xuất hàng"
                  : transferAction === "complete"
                    ? "Hoàn tất xuất hàng"
                    : "Xác nhận đã nhận hàng"}
            </DialogTitle>
            <DialogDescription className="tracking-tighter">
              Transfer #{activeTransferId}
              {transferAction === "receive" && (
                <span className="block mt-0.5 text-emerald-700 dark:text-emerald-400 font-medium">
                  Kho đích xác nhận đã nhận đầy đủ hàng hóa. Kho nguồn sẽ đóng
                  chính thức.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label
                htmlFor="transfer-note"
                className="text-sm font-semibold tracking-tighter"
              >
                Ghi chú{" "}
                <span className="text-muted-foreground font-normal">
                  (tùy chọn)
                </span>
              </Label>
              <Textarea
                id="transfer-note"
                placeholder="Nhập ghi chú nếu cần..."
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                rows={2}
                className="text-sm tracking-tighter resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="tracking-tighter"
              onClick={() => {
                setTransferAction(null);
                setTransferNote("");
              }}
            >
              Hủy
            </Button>
            <Button
              className={cn(
                "tracking-tighter gap-1.5",
                transferAction === "receive"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "",
              )}
              disabled={isActionPending}
              onClick={handleTransferAction}
            >
              {isActionPending && (
                <Spinner size={13} className="animate-spin" />
              )}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
