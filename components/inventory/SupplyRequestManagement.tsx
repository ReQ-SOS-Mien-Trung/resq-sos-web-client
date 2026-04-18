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
import type { RequestingSupplyRequestStatus } from "@/services/inventory/type";
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

type OutgoingStatusFilter = "all" | RequestingSupplyRequestStatus;

function OutgoingRequestsPanel() {
  const { selectedDepotId } = useManagerDepot();
  const [statusFilter, setStatusFilter] = useState<OutgoingStatusFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [trackerRequestId, setTrackerRequestId] = useState<number | null>(null);
  const [trackerOpen, setTrackerOpen] = useState(false);

  const requestingStatusOptions: {
    value: OutgoingStatusFilter;
    label: string;
  }[] = [
    { value: "all", label: "Tất cả" },
    { value: "WaitingForApproval", label: "Chờ phê duyệt" },
    { value: "Approved", label: "Đã duyệt" },
    { value: "InTransit", label: "Đang được chi viện đến" },
    { value: "Received", label: "Đã nhận" },
    { value: "Rejected", label: "Từ chối" },
  ];

  const { data, isLoading, isFetching, refetch } = useSupplyRequests(
    {
      depotId: selectedDepotId ?? 0,
      role: "Requester",
      requestingStatus:
        statusFilter === "all" ? undefined : statusFilter,
      pageNumber,
      pageSize,
    },
    {
      refetchInterval: 10_000,
      refetchOnWindowFocus: true,
      enabled: Boolean(selectedDepotId),
    },
  );

  const requests = useMemo(
    () =>
      [...(data?.items ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [data],
  );

  const trackerRequest = useMemo(
    () =>
      trackerRequestId !== null
        ? (requests.find((r) => r.id === trackerRequestId) ?? null)
        : null,
    [requests, trackerRequestId],
  );

  const canPrev = data?.hasPreviousPage ?? pageNumber > 1;
  const canNext = data?.hasNextPage ?? (data?.items?.length ?? 0) >= pageSize;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground tracking-tighter whitespace-nowrap">
            Trạng thái
          </span>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as OutgoingStatusFilter);
              setPageNumber(1);
            }}
          >
            <SelectTrigger className="h-9 w-[220px] text-sm tracking-tighter">
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {requestingStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border bg-card animate-pulse"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
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
                      <th className="px-4 py-3 font-semibold w-56">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request, idx) => (
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
                            {request.items.length - 1 > 0 && (
                              <p className="text-xs italic text-muted-foreground tracking-tighter">
                                Có {request.items.length - 1} vật phẩm khác...
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(request.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground w-56 max-w-56 whitespace-normal wrap-break-word leading-snug">
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

      <SupplyRequestTracker
        request={trackerRequest}
        open={trackerOpen}
        onOpenChange={setTrackerOpen}
        onActionSuccess={() => refetch()}
      />
    </div>
  );
}
