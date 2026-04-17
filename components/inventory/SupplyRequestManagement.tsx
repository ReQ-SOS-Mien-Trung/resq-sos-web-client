"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowsClockwise,
  ArrowDown,
  ArrowUp,
  Package,
  ClipboardText,
} from "@phosphor-icons/react";
import { useSupplyRequests } from "@/services/inventory/hooks";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import IncomingRequestsSection from "./IncomingRequestsSection";
import { SupplyRequestTracker } from "./SupplyRequestTracker";
import SupplyRequestSection from "./SupplyRequestSection";

// ── Status labels & colors ───────────────────────────────────────────────────

const requestingStatusLabels: Record<string, string> = {
  WaitingForApproval: "Chờ phê duyệt",
  Approved: "Đã duyệt",
  InTransit: "Đang được chi viện đến",
  Received: "Đã nhận",
  Rejected: "Từ chối",
};

const requestingStatusColors: Record<string, string> = {
  WaitingForApproval: "bg-amber-100 text-amber-700 border-amber-200",
  Approved: "bg-violet-100 text-violet-700 border-violet-200",
  InTransit: "bg-blue-100 text-blue-700 border-blue-200",
  Received: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

// ── Main Component ────────────────────────────────────────────────────────────

type SubTab = "incoming" | "outgoing" | "create";

export default function SupplyRequestManagement({
  onPanelOpenChange,
}: {
  onPanelOpenChange?: (open: boolean) => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>("create");

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tighter">
            Quản lý yêu cầu tiếp tế
          </h2>
          <p className="text-muted-foreground tracking-tighter text-sm mt-0.5">
            Quản lý toàn bộ đơn tiếp tế đến và đơn đã gửi đi từ kho của bạn
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/50 p-1 lg:self-start">
          <button
            onClick={() => setSubTab("create")}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium tracking-tighter transition-all",
              subTab === "create"
                ? "border border-border/60 bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ClipboardText className="h-4 w-4" weight="bold" />
            Tạo yêu cầu
          </button>

          <button
            onClick={() => setSubTab("outgoing")}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium tracking-tighter transition-all",
              subTab === "outgoing"
                ? "border border-border/60 bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowUp className="h-4 w-4" weight="bold" />
            Đơn đã gửi
          </button>
          <button
            onClick={() => setSubTab("incoming")}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium tracking-tighter transition-all",
              subTab === "incoming"
                ? "border border-border/60 bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowDown className="h-4 w-4" weight="bold" />
            Đơn đến
          </button>
        </div>
      </motion.div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {subTab === "incoming" ? (
          <motion.div
            key="incoming"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <IncomingRequestsSection />
          </motion.div>
        ) : subTab === "create" ? (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <SupplyRequestSection
              onSelectionSidebarChange={onPanelOpenChange}
            />
          </motion.div>
        ) : (
          <motion.div
            key="outgoing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <OutgoingRequestsPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Outgoing Requests Panel ──────────────────────────────────────────────────

type OutgoingFilter = "all" | "pending" | "in_transit" | "done" | "rejected";

function OutgoingRequestsPanel() {
  const { selectedDepotId } = useManagerDepot();
  const [filter, setFilter] = useState<OutgoingFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [trackerRequestId, setTrackerRequestId] = useState<number | null>(null);
  const [trackerOpen, setTrackerOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useSupplyRequests(
    { depotId: selectedDepotId ?? 0, pageNumber, pageSize },
    {
      refetchInterval: 10_000,
      refetchOnWindowFocus: true,
      enabled: Boolean(selectedDepotId),
    },
  );

  // Only show Requester-role requests (requests we sent out)
  const allItems = useMemo(
    () =>
      [...(data?.items ?? [])]
        .filter((r) => r.role === "Requester")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [data],
  );

  // Stats
  const pendingCount = allItems.filter(
    (r) =>
      r.requestingStatus === "WaitingForApproval" ||
      r.requestingStatus === "Approved",
  ).length;
  const inTransitCount = allItems.filter(
    (r) => r.requestingStatus === "InTransit",
  ).length;
  const doneCount = allItems.filter(
    (r) => r.requestingStatus === "Received",
  ).length;
  const rejectedCount = allItems.filter(
    (r) => r.requestingStatus === "Rejected",
  ).length;

  // Filter
  const filteredItems = useMemo(() => {
    switch (filter) {
      case "pending":
        return allItems.filter(
          (r) =>
            r.requestingStatus === "WaitingForApproval" ||
            r.requestingStatus === "Approved",
        );
      case "in_transit":
        return allItems.filter((r) => r.requestingStatus === "InTransit");
      case "done":
        return allItems.filter((r) => r.requestingStatus === "Received");
      case "rejected":
        return allItems.filter((r) => r.requestingStatus === "Rejected");
      default:
        return allItems;
    }
  }, [allItems, filter]);

  const trackerRequest = useMemo(
    () =>
      trackerRequestId !== null
        ? ((data?.items ?? []).find((r) => r.id === trackerRequestId) ?? null)
        : null,
    [data, trackerRequestId],
  );

  const canPrev = data?.hasPreviousPage ?? pageNumber > 1;
  const canNext = data?.hasNextPage ?? (data?.items?.length ?? 0) >= pageSize;

  return (
    <div className="space-y-4">
      {/* ── Stats strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <OutgoingStatCard
          label="Đang chờ duyệt"
          value={pendingCount}
          colorClass="border-amber-200 bg-amber-50 dark:bg-amber-950/20"
          valueClass="text-amber-600"
          active={filter === "pending"}
          onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
        />
        <OutgoingStatCard
          label="Đang vận chuyển"
          value={inTransitCount}
          colorClass="border-blue-200 bg-blue-50 dark:bg-blue-950/20"
          valueClass="text-blue-600"
          active={filter === "in_transit"}
          onClick={() =>
            setFilter(filter === "in_transit" ? "all" : "in_transit")
          }
        />
        <OutgoingStatCard
          label="Đã nhận hàng"
          value={doneCount}
          colorClass="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20"
          valueClass="text-emerald-600"
          active={filter === "done"}
          onClick={() => setFilter(filter === "done" ? "all" : "done")}
        />
        <OutgoingStatCard
          label="Đã từ chối"
          value={rejectedCount}
          colorClass="border-red-200 bg-red-50 dark:bg-red-950/20"
          valueClass="text-red-600"
          active={filter === "rejected"}
          onClick={() => setFilter(filter === "rejected" ? "all" : "rejected")}
        />
      </motion.div>

      {/* ── Filter chips + refresh ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { key: "all", label: `Tất cả (${allItems.length})` },
              { key: "pending", label: `Chờ duyệt (${pendingCount})` },
              { key: "in_transit", label: `Đang đến (${inTransitCount})` },
              { key: "done", label: `Hoàn thành (${doneCount})` },
              { key: "rejected", label: `Từ chối (${rejectedCount})` },
            ] as { key: OutgoingFilter; label: string }[]
          ).map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium tracking-tighter transition-all border",
                filter === chip.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border/60 hover:border-foreground/30",
              )}
            >
              {chip.label}
            </button>
          ))}
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
      </motion.div>

      {/* ── Table ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border bg-card animate-pulse"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50 gap-3">
          <Package className="h-10 w-10 opacity-30" />
          <p className="text-sm tracking-tighter">Không có đơn nào</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
        >
          <Card className="border-border/60 py-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-200 text-sm tracking-tighter">
                  <thead className="bg-muted/40">
                    <tr className="border-b border-border/60 text-left">
                      <th className="px-4 py-3 font-semibold">Mã yêu cầu</th>
                      <th className="px-4 py-3 font-semibold">Kho nguồn</th>
                      <th className="px-4 py-3 font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold">Vật phẩm</th>
                      <th className="px-4 py-3 font-semibold">Thời gian tạo</th>
                      <th className="px-4 py-3 font-semibold w-44">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((request, idx) => (
                      <motion.tr
                        key={request.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.25,
                          ease: "easeOut",
                          delay: 0.2 + idx * 0.05,
                        }}
                        className="border-b border-border/50 align-top cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => {
                          setTrackerRequestId(request.id);
                          setTrackerOpen(true);
                        }}
                      >
                        <td className="px-4 py-3 font-semibold">
                          #{request.id}
                        </td>
                        <td className="px-4 py-3">{request.sourceDepotName}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              requestingStatusColors[
                                request.requestingStatus
                              ] ?? "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {requestingStatusLabels[request.requestingStatus] ??
                              request.requestingStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            {request.items[0] && (
                              <div className="flex items-center justify-between gap-3">
                                <span>{request.items[0].itemModelName}</span>
                                <span className="font-semibold text-primary whitespace-nowrap">
                                  {request.items[0].quantity.toLocaleString(
                                    "vi-VN",
                                  )}{" "}
                                  {request.items[0].unit}
                                </span>
                              </div>
                            )}
                            {request.items.length >= 2 && (
                              <p className="text-xs italic text-muted-foreground tracking-tighter">
                                Có {request.items.length} vật phẩm khác...
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(request.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground w-44 max-w-44 whitespace-normal wrap-break-word leading-snug">
                          {request.note || "—"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Pagination ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <p className="text-xs text-muted-foreground tracking-tighter">
          Trang {pageNumber}
          {data?.totalPages ? ` / ${data.totalPages}` : ""}
          {data?.totalCount !== undefined
            ? ` • ${data.totalCount} yêu cầu`
            : ""}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tracking-tighter whitespace-nowrap">
              Hiển thị
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPageNumber(1);
              }}
            >
              <SelectTrigger className="h-8 w-20 text-xs tracking-tighter">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev || isFetching}
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext || isFetching}
            onClick={() => setPageNumber((prev) => prev + 1)}
          >
            Sau
          </Button>
        </div>
      </motion.div>

      {/* ── Tracker Sheet ── */}
      <SupplyRequestTracker
        request={trackerRequest}
        open={trackerOpen}
        onOpenChange={setTrackerOpen}
        onActionSuccess={() => refetch()}
      />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function OutgoingStatCard({
  label,
  value,
  colorClass,
  valueClass,
  active,
  onClick,
}: {
  label: string;
  value: number;
  colorClass: string;
  valueClass: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3.5 text-left transition-all",
        colorClass,
        active && "ring-2 ring-foreground/20 ring-offset-1",
      )}
    >
      <p className={cn("text-2xl font-bold tracking-tighter", valueClass)}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground tracking-tighter mt-0.5 font-medium">
        {label}
      </p>
    </button>
  );
}
