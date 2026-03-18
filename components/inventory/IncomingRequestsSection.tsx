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
  MapPin,
  SealCheck,
  CaretRight,
  Note,
  Spinner,
  X,
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
import { SupplyRequestTracker } from "./SupplyRequestTracker";
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
  const [filter, setFilter] = useState<FilterTab>("all");
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerRequestId, setTrackerRequestId] = useState<number | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useSupplyRequests(
    { pageNumber: 1, pageSize: 100 },
    { refetchInterval: 10_000, refetchOnWindowFocus: true },
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

  // ── Render ──
  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tighter">
            Quản lý yêu cầu tiếp tế
          </h2>
          <p className="text-muted-foreground tracking-tighter text-sm mt-0.5">
            Xem và xử lý toàn bộ yêu cầu tiếp tế từ các kho trong hệ thống
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <ArrowsClockwise
            className={cn("h-4 w-4", isFetching && "animate-spin")}
          />
          Làm mới
        </Button>
      </div>

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
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`Tất cả (${allItems.length})`}
        />
        <FilterChip
          active={filter === "needs_action"}
          onClick={() => setFilter("needs_action")}
          label={`Cần xử lý (${needsActionCount})`}
          dot={needsActionCount > 0}
        />
        <FilterChip
          active={filter === "in_transit"}
          onClick={() => setFilter("in_transit")}
          label={`Đang vận chuyển (${inTransitCount})`}
        />
        <FilterChip
          active={filter === "done"}
          onClick={() => setFilter("done")}
          label={`Hoàn thành (${doneCount})`}
        />
        <FilterChip
          active={filter === "rejected"}
          onClick={() => setFilter("rejected")}
          label={`Từ chối (${rejectedCount})`}
        />
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
          {filteredItems.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onViewDetail={() => openTracker(request.id)}
              onActionSuccess={() => refetch()}
            />
          ))}
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
        "relative rounded-xl tracking-tighter border bg-linear-to-br p-4 text-left transition-all hover:shadow-md",
        colorClass,
        active && "ring-2 ring-primary shadow-md",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconClass)}>
          {icon}
        </div>
        {active && (
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        )}
      </div>
      <p className={cn("text-2xl tracking-tighter font-bold tabular-nums", valueClass)}>{value}</p>
      <p className="text-sm font-medium tracking-tighter mt-0.5">{label}</p>
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dot?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex tracking-tighter items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted hover:bg-muted/80",
      )}
    >
      {dot && !active && (
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
      )}
      {label}
    </button>
  );
}

// ── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  request,
  onViewDetail,
  onActionSuccess,
}: {
  request: SupplyRequestListItem;
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
      await acceptMutation.mutateAsync(request.id);
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
      await rejectMutation.mutateAsync({ id: request.id, payload: { reason: rejectReason } });
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
      await prepareMutation.mutateAsync(request.id);
      toast.success("Đã bắt đầu đóng gói");
      onActionSuccess();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleShip = async () => {
    try {
      await shipMutation.mutateAsync(request.id);
      toast.success("Đã xuất kho — hàng đang trên đường");
      onActionSuccess();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync(request.id);
      toast.success("Đã xác nhận giao hàng thành công");
      onActionSuccess();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync(request.id);
      toast.success("Đã xác nhận nhận hàng thành công");
      onActionSuccess();
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  // Determine border accent color
  const accentBorder =
    request.sourceStatus === "Rejected" || request.requestingStatus === "Rejected"
      ? "border-l-red-400"
      : request.requestingStatus === "Received"
        ? "border-l-green-400"
        : getNeedsAction(request)
          ? "border-l-orange-400"
          : "border-l-border";

  const needsAction = getNeedsAction(request);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onViewDetail}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onViewDetail(); }}
      className={cn(
        "rounded-xl border-y border-r border-l-4 bg-card overflow-hidden transition-all hover:shadow-lg cursor-pointer",
        accentBorder,
      )}
    >
      {/* ── Top: badges + id ── */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full border tracking-tighter",
              roleInfo.className,
            )}
          >
            {roleInfo.label}
          </span>
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full border tracking-tighter",
              statusInfo.className,
            )}
          >
            {statusInfo.label}
          </span>
          {needsAction && (
            <span className="relative flex h-1.5 w-1.5 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums tracking-tighter">
          Mã yêu cầu số {request.id}
        </span>
      </div>

      {/* ── Route ── */}
      <div className="px-4 pb-3 space-y-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm tracking-tighter font-semibold truncate min-w-0 flex-1">
            {request.sourceDepotName}
          </span>
          {/* Animated flowing arrow: chevrons light up left→right in sequence */}
          <span className="flex items-center shrink-0 gap-0">
            <CaretRight weight="bold" className="h-3.5 w-3.5 text-primary/20 animate-[pulse_1.2s_ease-in-out_0ms_infinite]" />
            <CaretRight weight="bold" className="h-3.5 w-3.5 text-primary/55 animate-[pulse_1.2s_ease-in-out_250ms_infinite]" />
            <CaretRight weight="bold" className="h-3.5 w-3.5 text-primary animate-[pulse_1.2s_ease-in-out_500ms_infinite]" />
          </span>
          <span className="text-sm tracking-tighter text-muted-foreground truncate min-w-0 flex-1 text-right">
            {request.requestingDepotName}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground tracking-tighter">
          Thời gian gửi yêu cầu: <span className="text-black">{new Date(request.createdAt).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
          </span>
          
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-border/70 mx-4" />

      {/* ── Items ── */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight flex items-center gap-1.5">
          <Package className="h-3 w-3" />
          Vật tư ({request.items.length} mặt hàng)
        </p>
        <div className="space-y-1.5">
          {request.items.slice(0, 3).map((item, idx) => (
            <div
              key={item.itemModelId}
              className={cn(
                "flex items-baseline justify-between gap-2",
                idx < Math.min(request.items.slice(0, 3).length, 3) - 1 &&
                  "pb-1.5 border-b border-dashed border-border/50",
              )}
            >
              <span className="text-sm font-medium tracking-tighter text-foreground truncate leading-tight">
                {item.itemModelName}
              </span>
              <span className="text-sm font-bold text-primary whitespace-nowrap tabular-nums tracking-tighter leading-tight">
                {item.quantity.toLocaleString("vi-VN")}{" "}
                <span className="font-normal text-muted-foreground">{item.unit}</span>
              </span>
            </div>
          ))}
          {request.items.length > 3 && (
            <p className="text-xs text-muted-foreground tracking-tighter pt-0.5">
              +{request.items.length - 3} mặt hàng khác…
            </p>
          )}
        </div>
      </div>

      {/* ── Note ── */}
      {request.note && (
        <>
          <div className="h-px bg-border/70 mx-4" />
          <div className="px-4 py-2.5 flex gap-2 items-start">
            <Note className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-px" />
            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug tracking-tighter">
              {request.note}
            </p>
          </div>
        </>
      )}

      {/* ── Rejected reason ── */}
      {request.rejectedReason && (
        <>
          <div className="h-px bg-border/70 mx-4" />
          <div className="px-4 py-2.5 bg-red-50/60 flex gap-2 items-start">
            <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-px" weight="fill" />
            <p className="text-xs text-red-600 line-clamp-2 leading-snug tracking-tighter">
              {request.rejectedReason}
            </p>
          </div>
        </>
      )}

      {/* ── Reject form ── */}
      {showRejectForm && (
        <>
          <div className="h-px bg-border/70 mx-4" />
          <div className="px-4 py-3 bg-red-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-red-600 tracking-tighter">Lý do từ chối</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowRejectForm(false); setRejectReason(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              className="text-xs h-20 resize-none bg-background tracking-tighter"
              autoFocus
            />
            <Button
              size="sm"
              variant="destructive"
              className="w-full h-8 text-xs gap-1 tracking-tighter"
              onClick={(e) => { e.stopPropagation(); handleReject(); }}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? (
                <Spinner className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" weight="fill" />
              )}
              Xác nhận từ chối
            </Button>
          </div>
        </>
      )}

      {/* ── Footer actions ── */}
      <div className="px-4 py-3 flex items-center gap-2 border-t bg-muted/20 mt-auto">
        {/* Source + Pending → Accept / Reject */}
        {request.role === "Source" && request.sourceStatus === "Pending" && !showRejectForm && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 font-medium text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 tracking-tighter"
              onClick={(e) => { e.stopPropagation(); setShowRejectForm(true); }}
              disabled={isAnyPending}
            >
              <XCircle className="h-3.5 w-3.5" weight="fill" />
              Từ chối
            </Button>
            <Button
              size="sm"
              className="h-8 font-medium text-xs gap-1.5 flex-1 bg-green-600 hover:bg-green-700 tracking-tighter"
              onClick={(e) => { e.stopPropagation(); handleAccept(); }}
              disabled={isAnyPending}
            >
              {acceptMutation.isPending ? (
                <Spinner className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" weight="fill" />
              )}
              Chấp nhận
            </Button>
          </>
        )}

        {/* Source + Accepted → Prepare */}
        {request.role === "Source" && request.sourceStatus === "Accepted" && (
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 flex-1 bg-purple-600 hover:bg-purple-700 tracking-tighter"
            onClick={(e) => { e.stopPropagation(); handlePrepare(); }}
            disabled={isAnyPending}
          >
            {prepareMutation.isPending ? (
              <Spinner className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Package className="h-3.5 w-3.5" weight="fill" />
            )}
            Bắt đầu đóng gói
          </Button>
        )}

        {/* Source + Preparing → Ship */}
        {request.role === "Source" && request.sourceStatus === "Preparing" && (
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 flex-1 bg-blue-600 hover:bg-blue-700 tracking-tighter"
            onClick={(e) => { e.stopPropagation(); handleShip(); }}
            disabled={isAnyPending}
          >
            {shipMutation.isPending ? (
              <Spinner className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Truck className="h-3.5 w-3.5" weight="fill" />
            )}
            Xuất kho — Gửi đi
          </Button>
        )}

        {/* Source + Shipping → Complete */}
        {request.role === "Source" && request.sourceStatus === "Shipping" && (
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 flex-1 bg-teal-600 hover:bg-teal-700 tracking-tighter"
            onClick={(e) => { e.stopPropagation(); handleComplete(); }}
            disabled={isAnyPending}
          >
            {completeMutation.isPending ? (
              <Spinner className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SealCheck className="h-3.5 w-3.5" weight="fill" />
            )}
            Xác nhận đã giao
          </Button>
        )}

        {/* Requester + InTransit + Source đã Completed → Confirm received */}
        {request.role === "Requester" &&
          request.requestingStatus === "InTransit" &&
          request.sourceStatus === "Completed" && (
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 flex-1 bg-green-600 hover:bg-green-700 tracking-tighter"
            onClick={(e) => { e.stopPropagation(); handleConfirm(); }}
            disabled={isAnyPending}
          >
            {confirmMutation.isPending ? (
              <Spinner className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5" weight="fill" />
            )}
            Xác nhận đã nhận
          </Button>
        )}
      </div>
    </div>
  );
}
