"use client";

import React, { useCallback, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CalendarX,
  SpinnerGap,
  Trash,
  CaretDown,
  CaretRight,
} from "@phosphor-icons/react";
import {
  useDisposeLot,
  useExpiringLots,
  useInventoryLots,
} from "@/services/inventory/hooks";
import type {
  ExpiringLotItem,
  InventoryLotItem,
} from "@/services/inventory/type";

// ─── Constants ───

const NUMBER_FORMATTER = new Intl.NumberFormat("vi-VN");
const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatNumber(value?: number | null): string {
  if (value == null) return "—";
  return NUMBER_FORMATTER.format(value);
}

function daysUntil(iso: string): number {
  return Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

// ─── Tab A: Expiring Lots ───

function ExpiringLotsTab({ depotId }: { depotId: number }) {
  const [daysAhead, setDaysAhead] = useState(30);
  const { data: lots, isLoading } = useExpiringLots({
    depotId,
    daysAhead,
  });

  const [expandedItemModelId, setExpandedItemModelId] = useState<number | null>(
    null,
  );

  // Dispose dialog
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [disposeLot, setDisposeLot] = useState<ExpiringLotItem | null>(null);
  const [disposeQuantity, setDisposeQuantity] = useState("");
  const [disposeNote, setDisposeNote] = useState("");
  const disposeMutation = useDisposeLot();

  const openDispose = useCallback((lot: ExpiringLotItem) => {
    setDisposeLot(lot);
    setDisposeQuantity(String(lot.remainingQuantity));
    setDisposeNote("");
    setDisposeOpen(true);
  }, []);

  const handleDispose = useCallback(async () => {
    if (!disposeLot) return;
    const qty = Number(disposeQuantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error("Số lượng phải là số nguyên lớn hơn 0");
      return;
    }
    if (qty > disposeLot.remainingQuantity) {
      toast.error(
        `Số lượng tiêu hủy (${qty}) vượt quá số lượng còn lại (${disposeLot.remainingQuantity})`,
      );
      return;
    }

    try {
      const res = await disposeMutation.mutateAsync({
        depotId,
        lotId: disposeLot.lotId,
        payload: {
          lotId: disposeLot.lotId,
          quantity: qty,
          reason: "Expired",
          note:
            disposeNote.trim() || "Lô đã hết hạn, quản kho xác nhận tiêu hủy.",
        },
      });
      toast.success(res.message);
      setDisposeOpen(false);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string }; status?: number };
      };
      toast.error(err.response?.data?.message ?? "Không thể tiêu hủy lô hàng.");
    }
  }, [depotId, disposeLot, disposeMutation, disposeNote, disposeQuantity]);

  const expiredCount = lots?.filter((l) => l.isExpired).length ?? 0;
  const expiringCount = (lots?.length ?? 0) - expiredCount;

  return (
    <div className="space-y-4">
      <motion.div
        className="flex flex-wrap items-center justify-between gap-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: MOTION_EASE }}
      >
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium tracking-tighter">
            Cảnh báo trước
          </Label>
          <Select
            value={String(daysAhead)}
            onValueChange={(v) => setDaysAhead(Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="14">14 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
              <SelectItem value="60">60 ngày</SelectItem>
              <SelectItem value="90">90 ngày</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {expiredCount > 0 && (
              <motion.div
                key="expired-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25 }}
              >
                <Badge className="border-0 bg-red-100 text-red-700 shadow-none">
                  {expiredCount} đã hết hạn
                </Badge>
              </motion.div>
            )}
            {expiringCount > 0 && (
              <motion.div
                key="expiring-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25, delay: 0.05 }}
              >
                <Badge className="border-0 bg-amber-100 text-amber-700 shadow-none">
                  {expiringCount} sắp hết hạn
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </motion.div>
        ) : !lots?.length ? (
          <motion.div
            key="empty"
            className="flex flex-col items-center justify-center py-16 text-muted-foreground"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: MOTION_EASE }}
          >
            <CalendarX className="mb-3 h-10 w-10 opacity-50" />
            <p className="text-sm tracking-tighter">
              Không có lô nào hết hạn hoặc sắp hết hạn.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="table"
            className="overflow-x-auto rounded-md border"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: MOTION_EASE }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Vật phẩm</TableHead>
                  <TableHead>Lô #</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead className="text-right">SL còn lại</TableHead>
                  <TableHead>Ngày nhập</TableHead>
                  <TableHead>Hạn sử dụng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-28 text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((lot, idx) => {
                  const days = daysUntil(lot.expiredDate);
                  const isExpanded = expandedItemModelId === lot.lotId;

                  return (
                    <React.Fragment key={lot.lotId}>
                      <motion.tr
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.35,
                          delay: Math.min(idx * 0.04, 0.4),
                          ease: MOTION_EASE,
                        }}
                        className={cn(
                          "border-b transition-colors hover:bg-muted/50",
                          lot.isExpired
                            ? "bg-red-50/60"
                            : days <= 7
                              ? "bg-amber-50/60"
                              : "",
                        )}
                      >
                        <TableCell className="text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          <button
                            className="flex items-center gap-1 hover:underline"
                            onClick={() =>
                              setExpandedItemModelId(
                                isExpanded ? null : lot.lotId,
                              )
                            }
                          >
                            {isExpanded ? (
                              <CaretDown className="h-3 w-3" />
                            ) : (
                              <CaretRight className="h-3 w-3" />
                            )}
                            {lot.itemModelName}
                          </button>
                        </TableCell>
                        <TableCell>#{lot.lotId}</TableCell>
                        <TableCell>{lot.sourceType}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(lot.remainingQuantity)}
                        </TableCell>
                        <TableCell>{formatDate(lot.receivedDate)}</TableCell>
                        <TableCell>{formatDate(lot.expiredDate)}</TableCell>
                        <TableCell>
                          {lot.isExpired ? (
                            <Badge className="border-0 bg-red-100 text-red-700 shadow-none">
                              Đã hết hạn
                            </Badge>
                          ) : (
                            <Badge className="border-0 bg-amber-100 text-amber-700 shadow-none">
                              Còn {days} ngày
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1.5 h-7"
                            onClick={() => openDispose(lot)}
                          >
                            <Trash className="h-3.5 w-3.5" />
                            Tiêu hủy
                          </Button>
                        </TableCell>
                      </motion.tr>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr
                            key={`expand-${lot.lotId}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: MOTION_EASE }}
                            className="overflow-hidden"
                          >
                            <TableCell colSpan={9} className="p-0">
                              <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: 0.1 }}
                              >
                                <LotDetailInline
                                  itemModelId={lot.itemModelId}
                                  depotId={depotId}
                                />
                              </motion.div>
                            </TableCell>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dispose Dialog */}
      <Dialog open={disposeOpen} onOpenChange={setDisposeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash className="h-5 w-5" />
              Tiêu hủy lô hết hạn
            </DialogTitle>
          </DialogHeader>
          {disposeLot && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-red-50/50 p-3 text-sm space-y-1">
                <p>
                  <span className="font-medium">Vật phẩm:</span>{" "}
                  {disposeLot.itemModelName}
                </p>
                <p>
                  <span className="font-medium">Lô:</span> #{disposeLot.lotId}
                </p>
                <p>
                  <span className="font-medium">SL còn lại:</span>{" "}
                  {formatNumber(disposeLot.remainingQuantity)}
                </p>
                <p>
                  <span className="font-medium">Hạn sử dụng:</span>{" "}
                  {formatDate(disposeLot.expiredDate)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Số lượng tiêu hủy</Label>
                <Input
                  type="number"
                  min={1}
                  max={disposeLot.remainingQuantity}
                  value={disposeQuantity}
                  onChange={(e) => setDisposeQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Ghi chú (tùy chọn)
                </Label>
                <Textarea
                  placeholder="Lý do tiêu hủy..."
                  value={disposeNote}
                  onChange={(e) => setDisposeNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposeOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={disposeMutation.isPending}
              onClick={handleDispose}
            >
              {disposeMutation.isPending ? (
                <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash className="mr-2 h-4 w-4" />
              )}
              Xác nhận tiêu hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Inline Lot Detail (expand row) ───

function LotDetailInline({
  itemModelId,
  depotId,
}: {
  itemModelId: number;
  depotId: number;
}) {
  const { data, isLoading } = useInventoryLots({
    itemModelId,
    depotId,
  });

  if (isLoading) {
    return (
      <div className="px-6 py-3 space-y-2">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  const items =
    (data as { items?: InventoryLotItem[] })?.items ??
    (Array.isArray(data) ? data : []);

  if (!items.length) {
    return (
      <div className="px-6 py-3 text-sm text-muted-foreground">
        Không có dữ liệu lô cho vật phẩm này.
      </div>
    );
  }

  return (
    <motion.div
      className="bg-muted/30 px-8 py-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-xs font-semibold text-muted-foreground mb-2 tracking-tighter uppercase">
        Tất cả lô của vật phẩm này
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground text-xs">
            <th className="pb-1 pr-4">Lô #</th>
            <th className="pb-1 pr-4">SL ban đầu</th>
            <th className="pb-1 pr-4">SL còn lại</th>
            <th className="pb-1 pr-4">Nguồn</th>
            <th className="pb-1 pr-4">Ngày nhập</th>
            <th className="pb-1 pr-4">Hạn SD</th>
            <th className="pb-1">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {items.map((lot: InventoryLotItem) => (
            <tr key={lot.lotId} className="border-t border-border/40">
              <td className="py-1.5 pr-4">#{lot.lotId}</td>
              <td className="py-1.5 pr-4">{formatNumber(lot.quantity)}</td>
              <td className="py-1.5 pr-4 font-medium">
                {formatNumber(lot.remainingQuantity)}
              </td>
              <td className="py-1.5 pr-4">{lot.sourceType}</td>
              <td className="py-1.5 pr-4">{formatDate(lot.receivedDate)}</td>
              <td className="py-1.5 pr-4">{formatDate(lot.expiredDate)}</td>
              <td className="py-1.5">
                {lot.isExpired ? (
                  <Badge className="border-0 bg-red-100 text-red-700 shadow-none text-xs">
                    Hết hạn
                  </Badge>
                ) : lot.isExpiringSoon ? (
                  <Badge className="border-0 bg-amber-100 text-amber-700 shadow-none text-xs">
                    Sắp hết hạn
                  </Badge>
                ) : (
                  <Badge className="border-0 bg-green-100 text-green-700 shadow-none text-xs">
                    Còn hạn
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

// ─── Main Page ───

export default function DisposalPage() {
  const router = useRouter();
  const { selectedDepotId } = useManagerDepot();
  const prefersReducedMotion = useReducedMotion();

  const entranceTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.42, ease: MOTION_EASE };

  if (!selectedDepotId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Chưa chọn kho quản lý.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <motion.header
        className="border-b bg-background px-6 py-3.5"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={entranceTransition}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/dashboard/inventory")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-foreground">
              Xử lý hư hỏng & hết hạn
            </h1>
            <p className="text-sm tracking-tighter text-muted-foreground">
              Tiêu hủy lô hết hạn hoặc sắp hết hạn trong kho
            </p>
          </div>
        </div>
      </motion.header>

      <motion.div
        className="flex-1 px-6 py-4"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          ...entranceTransition,
          delay: prefersReducedMotion ? 0 : 0.06,
        }}
      >
        <ExpiringLotsTab depotId={selectedDepotId} />
      </motion.div>
    </div>
  );
}
