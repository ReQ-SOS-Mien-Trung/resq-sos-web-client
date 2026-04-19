"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Package,
  Truck,
  House,
  FileText,
  XCircle,
  MapPin,
  CalendarBlank,
  User,
  ArrowRight,
  Spinner,
} from "@phosphor-icons/react";
import type { SupplyRequestListItem } from "@/services/inventory/type";
import {
  useAcceptSupplyRequest,
  usePrepareSupplyRequest,
  useShipSupplyRequest,
  useCompleteSupplyRequest,
  useConfirmSupplyRequest,
  useRejectSupplyRequest,
} from "@/services/inventory/hooks";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import { toast } from "sonner";
import { ResponseCountdown } from "./ResponseCountdown";

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  request: SupplyRequestListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after any successful action mutation so the parent can refetch */
  onActionSuccess?: () => void;
}

type StepState = "completed" | "current" | "pending" | "rejected";

// ── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    key: "created",
    label: "Đã tạo yêu cầu",
    description: "Yêu cầu tiếp tế đã được gửi đến kho nguồn",
    Icon: FileText,
    timestampField: "createdAt" as keyof SupplyRequestListItem | null,
  },
  {
    key: "accepted",
    label: "Kho nguồn chấp nhận",
    description: "Kho nguồn đã xem xét và chấp nhận yêu cầu",
    Icon: CheckCircle,
    timestampField: "respondedAt" as keyof SupplyRequestListItem | null,
  },
  {
    key: "preparing",
    label: "Đang đóng gói",
    description: "Kho nguồn đang chuẩn bị đóng gói hàng hóa",
    Icon: Package,
    timestampField: null,
  },
  {
    key: "shipping",
    label: "Đang vận chuyển",
    description: "Hàng hóa đã xuất kho — đang trên đường đến kho yêu cầu",
    Icon: Truck,
    timestampField: "shippedAt" as keyof SupplyRequestListItem | null,
  },
  {
    key: "source_delivered",
    label: "Kho nguồn xác nhận giao",
    description: "Kho nguồn xác nhận hàng hóa đã được bàn giao",
    Icon: CheckCircle,
    timestampField: "completedAt" as keyof SupplyRequestListItem | null,
  },
  {
    key: "received",
    label: "Kho yêu cầu đã nhận",
    description: "Kho yêu cầu xác nhận đã nhận hàng — tồn kho cập nhật",
    Icon: House,
    timestampField: null,
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns -1 if rejected, otherwise the 0-based index of the active step.
 * A step is "active" when it's the last completed + 1 (i.e., what's happening now).
 */
function getCurrentStepIndex(req: SupplyRequestListItem): number {
  const { sourceStatus, requestingStatus } = req;
  if (sourceStatus === "Rejected" || requestingStatus === "Rejected") return -1;
  if (requestingStatus === "Received") return 5;
  if (sourceStatus === "Completed" && requestingStatus === "InTransit")
    return 4;
  if (sourceStatus === "Shipping") return 3;
  if (sourceStatus === "Preparing") return 2;
  if (sourceStatus === "Accepted") return 1;
  return 0; // Pending / WaitingForApproval
}

function getStepState(
  index: number,
  currentStepIndex: number,
  isRejected: boolean,
  isDone: boolean,
): StepState {
  if (isRejected) return index === 0 ? "rejected" : "pending";
  if (isDone) return "completed";
  if (index < currentStepIndex) return "completed";
  if (index === currentStepIndex) return "current";
  return "pending";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SupplyRequestTracker({
  request,
  open,
  onOpenChange,
  onActionSuccess,
}: Props) {
  const { selectedDepotId } = useManagerDepot();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { mutate: acceptMutation, isPending: isAccepting } =
    useAcceptSupplyRequest();
  const { mutate: prepareMutation, isPending: isPreparing } =
    usePrepareSupplyRequest();
  const { mutate: shipMutation, isPending: isShipping } =
    useShipSupplyRequest();
  const { mutate: completeMutation, isPending: isCompleting } =
    useCompleteSupplyRequest();
  const { mutate: confirmMutation, isPending: isConfirming } =
    useConfirmSupplyRequest();
  const { mutate: rejectMutation, isPending: isRejecting } =
    useRejectSupplyRequest();

  if (!request) return null;

  const currentStepIndex = getCurrentStepIndex(request);
  const isRejected = currentStepIndex === -1;
  const isDone = request.requestingStatus === "Received";
  const isAnyPending =
    isAccepting ||
    isPreparing ||
    isShipping ||
    isCompleting ||
    isConfirming ||
    isRejecting;

  const makeOpts = (label: string) => ({
    onSuccess: () => {
      toast.success(label);
      onActionSuccess?.();
    },
    onError: () => {
      toast.error("Thao tác thất bại. Vui lòng thử lại.");
    },
  });

  const handleAccept = () =>
    acceptMutation(
      { id: request.id, depotId: selectedDepotId ?? 0 },
      makeOpts("Đã chấp nhận yêu cầu tiếp tế"),
    );
  const handlePrepare = () =>
    prepareMutation(
      { id: request.id, depotId: selectedDepotId ?? 0 },
      makeOpts("Đã bắt đầu đóng gói hàng hóa"),
    );
  const handleShip = () =>
    shipMutation(
      { id: request.id, depotId: selectedDepotId ?? 0 },
      makeOpts("Đã xuất kho — đang vận chuyển"),
    );
  const handleComplete = () =>
    completeMutation(
      { id: request.id, depotId: selectedDepotId ?? 0 },
      makeOpts("Đã xác nhận giao hàng thành công"),
    );
  const handleConfirm = () =>
    confirmMutation(
      { id: request.id, depotId: selectedDepotId ?? 0 },
      makeOpts("Đã xác nhận nhận hàng — tồn kho đã cập nhật"),
    );
  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    rejectMutation(
      {
        params: { id: request.id, depotId: selectedDepotId ?? 0 },
        payload: { reason: rejectReason.trim() },
      },
      {
        onSuccess: () => {
          toast.success("Đã từ chối yêu cầu");
          setShowRejectForm(false);
          setRejectReason("");
          onActionSuccess?.();
        },
        onError: () => {
          toast.error("Không thể từ chối yêu cầu. Vui lòng thử lại.");
        },
      },
    );
  };

  // ── Action panel ────────────────────────────────────────────────────────────
  const actionPanel = (() => {
    if (isRejected || isDone) return null;
    const { role, sourceStatus, requestingStatus } = request;

    if (role === "Source") {
      if (sourceStatus === "Pending") {
        if (showRejectForm) {
          return (
            <div className="space-y-3">
              <Label className="text-sm tracking-tighter font-medium text-destructive">
                Lý do từ chối <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Nhập lý do từ chối yêu cầu này..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="resize-none text-sm tracking-tighter"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={handleReject}
                  disabled={isRejecting || !rejectReason.trim()}
                >
                  {isRejecting && <Spinner className="h-4 w-4 animate-spin" />}
                  <XCircle className="h-4 w-4" />
                  Xác nhận từ chối
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectReason("");
                  }}
                >
                  Hủy
                </Button>
              </div>
            </div>
          );
        }
        return (
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleAccept}
              disabled={isAnyPending}
            >
              {isAccepting && <Spinner className="h-4 w-4 animate-spin" />}
              Chấp nhận
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-1.5"
              onClick={() => setShowRejectForm(true)}
              disabled={isAnyPending}
            >
              Từ chối
            </Button>
          </div>
        );
      }
      if (sourceStatus === "Accepted") {
        return (
          <Button
            className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handlePrepare}
            disabled={isPreparing}
          >
            {isPreparing && <Spinner className="h-4 w-4 animate-spin" />}
            <Package className="h-4 w-4" />
            Bắt đầu đóng gói
          </Button>
        );
      }
      if (sourceStatus === "Preparing") {
        return (
          <Button
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleShip}
            disabled={isShipping}
          >
            {isShipping && <Spinner className="h-4 w-4 animate-spin" />}
            <Truck className="h-4 w-4" />
            Xuất kho — Gửi đi
          </Button>
        );
      }
      if (sourceStatus === "Shipping") {
        return (
          <Button
            className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleComplete}
            disabled={isCompleting}
          >
            {isCompleting && <Spinner className="h-4 w-4 animate-spin" />}
            <CheckCircle className="h-4 w-4" />
            Xác nhận đã giao hàng
          </Button>
        );
      }
    }

    if (
      role === "Requester" &&
      sourceStatus === "Completed" &&
      requestingStatus === "InTransit"
    ) {
      return (
        <Button
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
          onClick={handleConfirm}
          disabled={isConfirming}
        >
          {isConfirming && <Spinner className="h-4 w-4 animate-spin" />}
          <House className="h-4 w-4" />
          Xác nhận đã nhận hàng
        </Button>
      );
    }

    return null;
  })();

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setShowRejectForm(false);
          setRejectReason("");
        }
        onOpenChange(o);
      }}
    >
      <SheetContent className="w-125 sm:max-w-125 overflow-y-auto flex flex-col p-0">
        {/* ── Sticky header ── */}
        <SheetHeader className="px-6 pt-5 pb-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="h-4 w-4 text-primary" weight="fill" />
              </div>
              <div>
                <SheetTitle className="tracking-tighter text-base mb-0.5 leading-tight">
                  Theo dõi yêu cầu tiếp tế
                </SheetTitle>
                <p className="text-sm text-muted-foreground tracking-tighter">
                  Đơn yêu cầu số{" "}
                  <span className="font-semibold text-foreground">
                    {request.id}
                  </span>
                </p>
              </div>
            </div>
            {!request.respondedAt && (
              <ResponseCountdown deadline={request.responseDeadline} />
            )}
          </div>
        </SheetHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-4 space-y-6">
          {/* Info card */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            {/* Depot route */}
            <div className="flex items-stretch gap-3">
              <div className="flex-1 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Kho nguồn
                </p>
                <div className="flex items-center gap-2">
                  <MapPin
                    className="h-4 w-4 text-orange-500 shrink-0"
                    weight="fill"
                  />
                  <p className="font-semibold text-sm tracking-tighter leading-snug">
                    {request.sourceDepotName}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="flex items-center gap-1">
                  <div className="h-px w-6 bg-border" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground animate-[bounceX_1s_ease-in-out_infinite]" />
                  <div className="h-px w-6 bg-border" />
                </div>
              </div>

              <div className="flex-1 space-y-0.5 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Kho yêu cầu
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <p className="font-semibold text-sm tracking-tighter leading-snug">
                    {request.requestingDepotName}
                  </p>
                  <MapPin
                    className="h-4 w-4 text-blue-500 shrink-0"
                    weight="fill"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CalendarBlank className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs mb-1 text-muted-foreground uppercase tracking-tight">
                    Thời gian tạo
                  </p>
                  <p className="text-sm tracking-tight font-medium">
                    {new Date(request.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs mb-1 text-muted-foreground uppercase tracking-tight">
                    Vai trò
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold mt-0.5",
                      request.role === "Source"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-blue-50 text-blue-700 border-blue-200",
                    )}
                  >
                    {request.role === "Source" ? "Kho nguồn" : "Kho yêu cầu"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* ── Timeline ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Trạng thái vận chuyển
            </p>

            {isRejected ? (
              // Rejected card
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-destructive" weight="fill" />
                </div>
                <div>
                  <p className="font-semibold text-destructive tracking-tighter">
                    Yêu cầu đã bị từ chối
                  </p>
                  {request.rejectedReason && (
                    <p className="text-sm text-muted-foreground mt-1 tracking-tighter">
                      Lý do: {request.rejectedReason}
                    </p>
                  )}
                  {request.respondedAt && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {new Date(request.respondedAt).toLocaleString("vi-VN")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {STEPS.map((step, index) => {
                  const stepState = getStepState(
                    index,
                    currentStepIndex,
                    isRejected,
                    isDone,
                  );
                  const isLast = index === STEPS.length - 1;
                  const StepIcon = step.Icon;

                  // Resolve timestamp
                  const rawTs =
                    step.timestampField && request[step.timestampField];
                  const timestamp =
                    typeof rawTs === "string"
                      ? new Date(rawTs).toLocaleString("vi-VN")
                      : null;

                  return (
                    <div key={step.key} className="flex gap-4">
                      {/* Icon column */}
                      <div className="flex flex-col items-center">
                        {/* Step node */}
                        <div
                          className={cn(
                            "h-9 w-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 z-10",
                            stepState === "completed" &&
                              "bg-green-50 border-green-500 text-green-600",
                            stepState === "current" &&
                              "bg-orange-50 border-orange-500 text-orange-600 shadow-[0_0_0_4px_rgba(249,115,22,0.12)]",
                            stepState === "pending" &&
                              "bg-muted border-border text-muted-foreground/50",
                          )}
                        >
                          {stepState === "current" ? (
                            <div className="h-3 w-3 rounded-full bg-orange-500 animate-pulse" />
                          ) : stepState === "completed" ? (
                            <CheckCircle
                              className="h-4 w-4 text-green-500"
                              weight="fill"
                            />
                          ) : (
                            <StepIcon className="h-4 w-4" />
                          )}
                        </div>

                        {/* Connector line */}
                        {!isLast && (
                          <div
                            className={cn(
                              "w-0.5 flex-1 min-h-8 my-1",
                              stepState === "completed"
                                ? "bg-green-300"
                                : stepState === "current"
                                  ? "bg-linear-to-b from-orange-300 to-border/50"
                                  : "bg-border/50",
                            )}
                          />
                        )}
                      </div>

                      {/* Content column */}
                      <div
                        className={cn(
                          "flex-1 min-w-0",
                          isLast ? "pb-0" : "pb-5",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={cn(
                                  "font-semibold text-sm tracking-tighter",
                                  stepState === "pending" &&
                                    "text-muted-foreground/60",
                                  stepState === "completed" &&
                                    "text-foreground",
                                  stepState === "current" && "text-orange-700",
                                )}
                              >
                                {step.label}
                              </p>
                              {stepState === "current" && (
                                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 tracking-tighter">
                                  Đang thực hiện
                                </span>
                              )}
                              {stepState === "completed" &&
                                isDone &&
                                index === STEPS.length - 1 && (
                                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 tracking-tighter">
                                    Hoàn tất
                                  </span>
                                )}
                            </div>
                            <p
                              className={cn(
                                "text-xs mt-0.5 tracking-tighter leading-snug",
                                stepState === "pending"
                                  ? "text-muted-foreground/40"
                                  : "text-muted-foreground",
                              )}
                            >
                              {step.description}
                            </p>
                          </div>
                          {timestamp && (
                            <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
                              {timestamp}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Items list ── */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Vật phẩm trong yêu cầu ({request.items.length})
            </p>
            <div className="rounded-xl border bg-card overflow-hidden divide-y">
              {request.items.map((item) => (
                <div
                  key={item.itemModelId}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Package
                        className="h-3.5 w-3.5 text-primary"
                        weight="fill"
                      />
                    </div>
                    <span className="tracking-tighter">
                      {item.itemModelName}
                    </span>
                  </div>
                  <span className="font-semibold tracking-tighter text-primary tabular-nums">
                    {item.quantity.toLocaleString("vi-VN")}{" "}
                    <span className="font-normal text-muted-foreground">
                      {item.unit}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Note / Rejected reason ── */}
          {(request.note || request.rejectedReason) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                {request.rejectedReason ? "Lý do từ chối" : "Ghi chú"}
              </p>
              <div
                className={cn(
                  "rounded-xl border p-4 text-sm tracking-tighter leading-relaxed",
                  request.rejectedReason
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "bg-muted/30 text-foreground",
                )}
              >
                {request.rejectedReason ?? request.note}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky action footer ── */}
        {actionPanel && (
          <div className="p-4 border-t bg-background sticky bottom-0 z-10">
            {actionPanel}
          </div>
        )}

        {/* Done state footer */}
        {isDone && (
          <div className="p-4 border-t bg-green-50 sticky bottom-0 z-10 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
            <p className="text-sm font-semibold tracking-tighter text-green-700">
              Yêu cầu tiếp tế đã hoàn tất thành công
            </p>
          </div>
        )}

        {isRejected && (
          <div className="p-4 border-t bg-destructive/5 sticky bottom-0 z-10 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" weight="fill" />
            <p className="text-sm font-semibold tracking-tighter text-destructive">
              Yêu cầu đã bị từ chối
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default SupplyRequestTracker;
