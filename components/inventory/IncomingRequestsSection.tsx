"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Lightning,
  Truck,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  Package,
  ClipboardText,
  SealCheck,
  Note,
  Spinner,
  X,
  Funnel,
  ArrowRight,
} from "@phosphor-icons/react";
import {
  useSupplyRequests,
  useAcceptSupplyRequest,
  usePrepareSupplyRequest,
  useShipSupplyRequest,
  useCompleteSupplyRequest,
  useConfirmSupplyRequest,
  useRejectSupplyRequest,
} from "@/services/inventory/hooks";
import type { SupplyRequestListItem } from "@/services/inventory/type";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import { SupplyRequestTracker } from "./SupplyRequestTracker";
import { ResponseCountdown } from "./ResponseCountdown";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "needs_action" | "in_transit" | "done" | "rejected";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNeedsAction(r: SupplyRequestListItem): boolean {
  if (r.role === "Source") {
    return (
      r.sourceStatus === "Pending" ||
      r.sourceStatus === "Accepted" ||
      r.sourceStatus === "Preparing"
    );
  }
  if (r.role === "Requester") {
    // Source phải bấm "Xác nhận đã giao" (Completed) trước
    // thì Requester mới cần action
    return r.sourceStatus === "Completed" && r.requestingStatus === "InTransit";
  }
  return false;
}

function getStatusInfo(r: SupplyRequestListItem): {
  label: string;
  className: string;
} {
  if (r.sourceStatus === "Rejected" || r.requestingStatus === "Rejected") {
    return {
      label: "Từ chối",
      className: "bg-red-100 text-red-700 border-red-200",
    };
  }
  if (r.requestingStatus === "Received") {
    return {
      label: "Hoàn thành",
      className: "bg-green-100 text-green-700 border-green-200",
    };
  }
  if (r.sourceStatus === "Shipping" || r.requestingStatus === "InTransit") {
    return {
      label: "Đang vận chuyển",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    };
  }
  if (r.sourceStatus === "Preparing") {
    return {
      label: "Đang đóng gói",
      className: "bg-purple-100 text-purple-700 border-purple-200",
    };
  }
  if (r.sourceStatus === "Accepted" || r.requestingStatus === "Approved") {
    return {
      label: "Đã chấp nhận",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  }
  if (r.sourceStatus === "Completed") {
    return {
      label: "Đã giao hàng",
      className: "bg-teal-100 text-teal-700 border-teal-200",
    };
  }
  return {
    label: "Chờ duyệt",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  };
}

function getRoleInfo(role: "Source" | "Requester"): {
  label: string;
  className: string;
} {
  return role === "Source"
    ? {
      label: "Kho nguồn",
      className: "bg-orange-100 text-orange-700 border-orange-200",
    }
    : {
      label: "Kho yêu cầu",
      className: "bg-sky-100 text-sky-700 border-sky-200",
    };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function IncomingRequestsSection() {
  const { selectedDepotId } = useManagerDepot();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerRequestId, setTrackerRequestId] = useState<number | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useSupplyRequests(
    { depotId: selectedDepotId ?? 0, pageNumber: 1, pageSize: 100 },
    {
      refetchInterval: 10_000,
      refetchOnWindowFocus: true,
      enabled: Boolean(selectedDepotId),
    },
  );

  // Hiển thị:
  // 1. Kho nguồn (Source) — tất cả trạng thái: cần duyệt, đóng gói, gửi đi
  // 2. Kho yêu cầu (Requester) — CHỈ khi hàng đang trên đường (InTransit)
  //    để bên yêu cầu có thể xác nhận đã nhận hàng
  const allItems = useMemo(
    () =>
      (data?.items ?? []).filter(
        (r) =>
          r.role === "Source" ||
          (r.role === "Requester" && r.requestingStatus === "InTransit"),
      ),
    [data],
  );

  // ── Stats ──
  const needsActionCount = allItems.filter(getNeedsAction).length;
  const inTransitCount = allItems.filter(
    (r) =>
      r.sourceStatus === "Shipping" || r.requestingStatus === "InTransit",
  ).length;
  const doneCount = allItems.filter(
    (r) =>
      r.requestingStatus === "Received" || r.sourceStatus === "Completed",
  ).length;
  const rejectedCount = allItems.filter(
    (r) =>
      r.sourceStatus === "Rejected" || r.requestingStatus === "Rejected",
  ).length;

  // ── Filtered list ──
  const filteredItems = useMemo(() => {
    switch (filter) {
      case "needs_action":
        return allItems.filter(getNeedsAction);
      case "in_transit":
        return allItems.filter(
          (r) =>
            r.sourceStatus === "Shipping" || r.requestingStatus === "InTransit",
        );
      case "done":
        return allItems.filter(
          (r) =>
            r.requestingStatus === "Received" ||
            r.sourceStatus === "Completed",
        );
      case "rejected":
        return allItems.filter(
          (r) =>
            r.sourceStatus === "Rejected" ||
            r.requestingStatus === "Rejected",
        );
      default:
        return allItems;
    }
  }, [allItems, filter]);

  // Tracker request
  const trackerRequest = useMemo(
    () => (trackerRequestId !== null ? allItems.find((r) => r.id === trackerRequestId) ?? null : null),
    [allItems, trackerRequestId],
  );

  const openTracker = (id: number) => {
    setTrackerRequestId(id);
    setTrackerOpen(true);
  };

  // ── Card pagination ──
  const CARDS_PER_PAGE = 6;
  const [cardPage, setCardPage] = useState(1);
  const totalCardPages = Math.max(
    1,
    Math.ceil(filteredItems.length / CARDS_PER_PAGE),
  );
  const currentCardPage = Math.min(cardPage, totalCardPages);
  const pagedItems = filteredItems.slice(
    (currentCardPage - 1) * CARDS_PER_PAGE,
    currentCardPage * CARDS_PER_PAGE,
  );

  // ── Render ──
  return (
    <div className="space-y-5">
      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Lightning className="h-5 w-5" weight="fill" />}
          label="Cần xử lý ngay"
          value={needsActionCount}
          colorClass="from-red-500/10 to-orange-500/10 border-red-200/60"
          valueClass="text-red-600"
          iconClass="text-red-500 bg-red-100"
          active={filter === "needs_action"}
          onClick={() =>
            setFilter(filter === "needs_action" ? "all" : "needs_action")
          }
        />
        <StatCard
          icon={<Truck className="h-5 w-5" weight="fill" />}
          label="Đang vận chuyển"
          value={inTransitCount}
          colorClass="from-blue-500/10 to-sky-500/10 border-blue-200/60"
          valueClass="text-blue-600"
          iconClass="text-blue-500 bg-blue-100"
          active={filter === "in_transit"}
          onClick={() =>
            setFilter(filter === "in_transit" ? "all" : "in_transit")
          }
        />
        <StatCard
          icon={<SealCheck className="h-5 w-5" weight="fill" />}
          label="Hoàn thành"
          value={doneCount}
          colorClass="from-green-500/10 to-emerald-500/10 border-green-200/60"
          valueClass="text-green-600"
          iconClass="text-green-500 bg-green-100"
          active={filter === "done"}
          onClick={() => setFilter(filter === "done" ? "all" : "done")}
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" weight="fill" />}
          label="Từ chối"
          value={rejectedCount}
          colorClass="from-gray-500/10 to-slate-500/10 border-gray-200/60"
          valueClass="text-gray-600"
          iconClass="text-gray-500 bg-gray-100"
          active={filter === "rejected"}
          onClick={() =>
            setFilter(filter === "rejected" ? "all" : "rejected")
          }
        />
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex items-center gap-2 flex-wrap bg-muted/40 border border-border/50 rounded-xl px-3 py-2">
        <Funnel className="h-4 w-4 text-muted-foreground shrink-0" weight="duotone" />
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            icon={<ClipboardText className="h-3.5 w-3.5" />}
            label="Tất cả"
            count={allItems.length}
          />
          <div className="w-px h-4 bg-border/60 shrink-0" />
          <FilterChip
            active={filter === "needs_action"}
            onClick={() => setFilter(filter === "needs_action" ? "all" : "needs_action")}
            icon={<Lightning className="h-3.5 w-3.5" weight="fill" />}
            label="Cần xử lý"
            count={needsActionCount}
            urgent={needsActionCount > 0}
            color="orange"
          />
          <FilterChip
            active={filter === "in_transit"}
            onClick={() => setFilter(filter === "in_transit" ? "all" : "in_transit")}
            icon={<Truck className="h-3.5 w-3.5" weight="fill" />}
            label="Đang vận chuyển"
            count={inTransitCount}
            color="blue"
          />
          <FilterChip
            active={filter === "done"}
            onClick={() => setFilter(filter === "done" ? "all" : "done")}
            icon={<SealCheck className="h-3.5 w-3.5" weight="fill" />}
            label="Hoàn thành"
            count={doneCount}
            color="green"
          />
          <FilterChip
            active={filter === "rejected"}
            onClick={() => setFilter(filter === "rejected" ? "all" : "rejected")}
            icon={<XCircle className="h-3.5 w-3.5" weight="fill" />}
            label="Từ chối"
            count={rejectedCount}
            color="gray"
          />
        </div>
        {filter !== "all" && (
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors shrink-0"
          >
            <X className="h-3 w-3" />
            Xóa lọc
          </button>
        )}
        <div className="w-px h-4 bg-border/60 shrink-0" />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <ArrowsClockwise className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Làm mới
        </Button>
      </div>

      {/* ── Cards Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-xl border bg-card animate-pulse"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50 gap-3">
          <ClipboardText className="h-10 w-10 opacity-30" />
          <p className="text-sm tracking-tighter">Không có yêu cầu nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pagedItems.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              depotId={selectedDepotId ?? 0}
              onViewDetail={() => openTracker(request.id)}
              onActionSuccess={() => refetch()}
            />
          ))}
        </div>
      )}

      {/* ── Cards Pagination ── */}
      {totalCardPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground tracking-tighter order-2 sm:order-1">
            {filteredItems.length} yêu cầu • Trang {currentCardPage} / {totalCardPages}
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentCardPage === 1}
              onClick={() => setCardPage(1)}
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              disabled={currentCardPage === 1}
              onClick={() => setCardPage((p) => Math.max(1, p - 1))}
            >
              ‹ Trước
            </Button>
            {(() => {
              const pages: (number | "...")[] = [];
              if (totalCardPages <= 7) {
                for (let i = 1; i <= totalCardPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (currentCardPage > 3) pages.push("...");
                for (let i = Math.max(2, currentCardPage - 1); i <= Math.min(totalCardPages - 1, currentCardPage + 1); i++) {
                  pages.push(i);
                }
                if (currentCardPage < totalCardPages - 2) pages.push("...");
                pages.push(totalCardPages);
              }
              return pages.map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground select-none">
                    ···
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={currentCardPage === p ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setCardPage(p as number)}
                  >
                    {p}
                  </Button>
                ),
              );
            })()}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              disabled={currentCardPage === totalCardPages}
              onClick={() => setCardPage((p) => Math.min(totalCardPages, p + 1))}
            >
              Sau ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentCardPage === totalCardPages}
              onClick={() => setCardPage(totalCardPages)}
            >
              »
            </Button>
          </div>
        </div>
      )}

      {/* ── Embedded Tracker Sheet ── */}
      <SupplyRequestTracker
        request={trackerRequest}
        open={trackerOpen}
        onOpenChange={setTrackerOpen}
        onActionSuccess={() => refetch()}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  colorClass,
  valueClass,
  iconClass,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
  valueClass: string;
  iconClass: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-xl tracking-tighter border bg-linear-to-br px-4 py-6 text-left transition-all hover:shadow-md",
        colorClass,
        active && "ring-2 ring-primary shadow-md",
      )}
    >
      {/* Icon pinned to top-right */}
      <div className={cn("absolute top-3.5 right-3.5 h-9 w-9 rounded-xl flex items-center justify-center", iconClass)}>
        {icon}
      </div>
      {/* Number + label on the left */}
      <p className={cn("text-3xl font-bold tabular-nums tracking-tighter", valueClass)}>{value}</p>
      <p className="text-sm font-medium tracking-tighter mt-1 text-foreground/70 pr-10">{label}</p>
      {active && (
        <span className="absolute bottom-3 right-3.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      )}
    </button>
  );
}

const filterColorMap = {
  orange: {
    active: "bg-orange-500 text-white border-orange-500",
    idle: "text-orange-600 hover:bg-orange-50 hover:border-orange-200 border-transparent",
    count: "bg-orange-100 text-orange-700",
    countActive: "bg-orange-400/30 text-white",
  },
  blue: {
    active: "bg-blue-500 text-white border-blue-500",
    idle: "text-blue-600 hover:bg-blue-50 hover:border-blue-200 border-transparent",
    count: "bg-blue-100 text-blue-700",
    countActive: "bg-blue-400/30 text-white",
  },
  green: {
    active: "bg-green-500 text-white border-green-500",
    idle: "text-green-600 hover:bg-green-50 hover:border-green-200 border-transparent",
    count: "bg-green-100 text-green-700",
    countActive: "bg-green-400/30 text-white",
  },
  gray: {
    active: "bg-slate-500 text-white border-slate-500",
    idle: "text-slate-600 hover:bg-slate-50 hover:border-slate-200 border-transparent",
    count: "bg-slate-100 text-slate-600",
    countActive: "bg-slate-400/30 text-white",
  },
};

function FilterChip({
  active,
  onClick,
  label,
  icon,
  count,
  urgent,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  urgent?: boolean;
  color?: keyof typeof filterColorMap;
}) {
  const colors = color ? filterColorMap[color] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex tracking-tighter items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium transition-all border",
        colors
          ? active
            ? colors.active
            : colors.idle
          : active
            ? "bg-primary text-primary-foreground border-primary shadow-sm"
            : "text-foreground/70 hover:bg-background hover:text-foreground border-transparent hover:border-border/60",
      )}
    >
      {urgent && !active && (
        <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-md text-xs font-bold tabular-nums",
            colors
              ? active ? colors.countActive : colors.count
              : active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  request,
  depotId,
  onViewDetail,
  onActionSuccess,
}: {
  request: SupplyRequestListItem;
  depotId: number;
  onViewDetail: () => void;
  onActionSuccess: () => void;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const acceptMutation = useAcceptSupplyRequest();
  const rejectMutation = useRejectSupplyRequest();
  const prepareMutation = usePrepareSupplyRequest();
  const shipMutation = useShipSupplyRequest();
  const completeMutation = useCompleteSupplyRequest();
  const confirmMutation = useConfirmSupplyRequest();

  const isAnyPending =
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    prepareMutation.isPending ||
    shipMutation.isPending ||
    completeMutation.isPending ||
    confirmMutation.isPending;

  const statusInfo = getStatusInfo(request);
  const roleInfo = getRoleInfo(request.role);

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync({ id: request.id, depotId });
      toast.success(`Đã chấp nhận yêu cầu #${request.id}`);
      onActionSuccess();
    } catch {
      toast.error("Có lỗi xảy ra khi chấp nhận yêu cầu");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        params: { id: request.id, depotId },
        payload: { reason: rejectReason },
      });
      toast.success(`Đã từ chối yêu cầu #${request.id}`);
      setShowRejectForm(false);
      setRejectReason("");
      onActionSuccess();
    } catch {
      toast.error("Có lỗi xảy ra khi từ chối yêu cầu");
    }
  };

  const handlePrepare = async () => {
    try {
      await prepareMutation.mutateAsync({ id: request.id, depotId });
      toast.success("Đã bắt đầu đóng gói");
      onActionSuccess();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleShip = async () => {
    try {
      await shipMutation.mutateAsync({ id: request.id, depotId });
      toast.success("Đã xuất kho — hàng đang trên đường");
      onActionSuccess();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync({ id: request.id, depotId });
      toast.success("Đã xác nhận giao hàng thành công");
      onActionSuccess();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync({ id: request.id, depotId });
      toast.success("Đã xác nhận nhận hàng thành công");
      onActionSuccess();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  // Determine accent color based on status
  const isRejected = request.sourceStatus === "Rejected" || request.requestingStatus === "Rejected";
  const isDone = request.requestingStatus === "Received";
  const needsAction = getNeedsAction(request);
  const isInTransit = request.sourceStatus === "Shipping" || request.requestingStatus === "InTransit";

  const topStrip = isRejected
    ? "bg-slate-300"
    : isDone
      ? "bg-emerald-400"
      : needsAction
        ? "bg-orange-400"
        : isInTransit
          ? "bg-blue-400"
          : "bg-border";

  const formattedTime = new Date(request.createdAt).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onViewDetail}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onViewDetail(); }}
      className={cn(
        "rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col group",
        isRejected && "opacity-60 grayscale-[40%]",
      )}
    >
      {/* ── Colored top strip ── */}
      <div className={cn("h-1 w-full shrink-0", topStrip)} />

      {/* ── Card body ── */}
      <div className="p-4 flex flex-col gap-2 flex-1">

        {/* Row 1: Badges left | ID right */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border tracking-tighter", roleInfo.className)}>
              {roleInfo.label}
            </span>
            <span className={cn("inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border tracking-tighter", statusInfo.className)}>
              {statusInfo.label}
            </span>
            {needsAction && (
              <span className="relative flex h-2 w-2 mt-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
            )}
          </div>
          <p className="text-xs font-bold tracking-tight shrink-0">#{request.id}</p>
        </div>

        {/* Row 2: Countdown left | Created time right */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            {request.responseDeadline && !request.respondedAt ? (
              <ResponseCountdown deadline={request.responseDeadline} />
            ) : null}
          </div>
          <span className="text-xs tracking-tighter font-medium text-muted-foreground shrink-0">
            {formattedTime}
          </span>
        </div>

        {/* Route pill */}
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 min-w-0">
          <span className="text-xs font-medium tracking-tighter text-foreground truncate flex-1 min-w-0">
            {request.sourceDepotName}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-primary/60 shrink-0" />
          <span className="text-xs tracking-tighter text-muted-foreground truncate flex-1 min-w-0 text-right">
            {request.requestingDepotName}
          </span>
        </div>

        {/* Items */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1 mb-2">
            <Package className="h-3 w-3" />
            {request.items.length} mặt hàng
          </p>
          <div className="divide-y divide-dashed divide-border/50">
            {request.items.slice(0, 3).map((item) => (
              <div key={item.itemModelId} className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium tracking-tighter text-foreground/90 truncate flex-1 min-w-0">
                  {item.itemModelName}
                </span>
                <span className="text-sm font-bold text-primary tabular-nums tracking-tighter whitespace-nowrap shrink-0">
                  {item.quantity.toLocaleString("vi-VN")}
                  <span className="font-normal text-muted-foreground text-xs ml-1">{item.unit}</span>
                </span>
              </div>
            ))}
          </div>
          {request.items.length > 3 && (
            <p className="text-xs text-muted-foreground tracking-tighter pt-1.5">
              +{request.items.length - 3} mặt hàng khác…
            </p>
          )}
        </div>

        {/* Note / Rejected reason */}
        {(request.note || request.rejectedReason) && (
          <div className={cn(
            "flex gap-2 items-start rounded-lg px-3 py-2 text-xs tracking-tighter leading-relaxed",
            request.rejectedReason
              ? "bg-red-50/80 text-red-600 border border-red-100"
              : "bg-amber-50/60 text-amber-700 border border-amber-100/80",
          )}>
            {request.rejectedReason ? (
              <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" weight="fill" />
            ) : (
              <Note className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            )}
            <span className="line-clamp-2">{request.rejectedReason || request.note}</span>
          </div>
        )}

        {/* Reject form */}
        {showRejectForm && (
          <div className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-red-600 tracking-tighter flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" weight="fill" />
                Lý do từ chối
              </p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowRejectForm(false); setRejectReason(""); }}
                className="text-red-400 hover:text-red-600 transition-colors rounded p-0.5 hover:bg-red-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              className="text-xs h-16 resize-none bg-white tracking-tighter border-red-200 focus-visible:ring-red-300"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              size="sm"
              variant="destructive"
              className="w-full h-7 text-xs gap-1 tracking-tighter"
              onClick={(e) => { e.stopPropagation(); handleReject(); }}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? <Spinner className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" weight="fill" />}
              Xác nhận từ chối
            </Button>
          </div>
        )}
      </div>

      {/* ── Footer actions ── */}
      <div className="px-4 pb-3 mt-auto">
        {/* Source + Pending → Accept / Reject */}
        {request.role === "Source" && request.sourceStatus === "Pending" && !showRejectForm && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 tracking-tighter shrink-0"
              onClick={(e) => { e.stopPropagation(); setShowRejectForm(true); }}
              disabled={isAnyPending}
            >
              <XCircle className="h-3.5 w-3.5" weight="fill" />
              Từ chối
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1 flex-1 bg-emerald-600 hover:bg-emerald-700 tracking-tighter"
              onClick={(e) => { e.stopPropagation(); handleAccept(); }}
              disabled={isAnyPending}
            >
              {acceptMutation.isPending ? <Spinner className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" weight="fill" />}
              Chấp nhận
            </Button>
          </div>
        )}

        {/* Source + Accepted → Prepare */}
        {request.role === "Source" && request.sourceStatus === "Accepted" && (
          <Button size="sm" className="w-full h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 tracking-tighter"
            onClick={(e) => { e.stopPropagation(); handlePrepare(); }} disabled={isAnyPending}>
            {prepareMutation.isPending ? <Spinner className="h-3 w-3 animate-spin" /> : <Package className="h-3.5 w-3.5" weight="fill" />}
            Bắt đầu đóng gói
          </Button>
        )}

        {/* Source + Preparing → Ship */}
        {request.role === "Source" && request.sourceStatus === "Preparing" && (
          <Button size="sm" className="w-full h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 tracking-tighter"
            onClick={(e) => { e.stopPropagation(); handleShip(); }} disabled={isAnyPending}>
            {shipMutation.isPending ? <Spinner className="h-3 w-3 animate-spin" /> : <Truck className="h-3.5 w-3.5" weight="fill" />}
            Xuất kho — Gửi đi
          </Button>
        )}

        {/* Source + Shipping → Complete */}
        {request.role === "Source" && request.sourceStatus === "Shipping" && (
          <Button size="sm" className="w-full h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 tracking-tighter"
            onClick={(e) => { e.stopPropagation(); handleComplete(); }} disabled={isAnyPending}>
            {completeMutation.isPending ? <Spinner className="h-3 w-3 animate-spin" /> : <SealCheck className="h-3.5 w-3.5" weight="fill" />}
            Xác nhận đã giao
          </Button>
        )}

        {/* Requester + InTransit → Confirm received */}
        {request.role === "Requester" && request.requestingStatus === "InTransit" && (
          <Button
            size="sm"
            className={cn(
              "w-full h-8 text-xs gap-1.5 tracking-tighter",
              request.sourceStatus === "Completed"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed",
            )}
            onClick={(e) => { e.stopPropagation(); handleConfirm(); }}
            disabled={isAnyPending || request.sourceStatus !== "Completed"}
          >
            {confirmMutation.isPending ? <Spinner className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" weight="fill" />}
            {request.sourceStatus === "Completed" ? "Xác nhận đã nhận" : "Chờ bên gửi xác nhận giao"}
          </Button>
        )}
      </div>
    </div>
  );
}
