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
  ArrowLeft,
  CalendarX,
  SpinnerGap,
  Trash,
  CaretDown,
  CaretRight,
} from "@phosphor-icons/react";
import { useDisposeLot, useExpiringLots } from "@/services/inventory/hooks";
import type { ExpiringLotItem } from "@/services/inventory/type";

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

  const [expandedLotId, setExpandedLotId] = useState<number | null>(null);
  const [expandedQuantity, setExpandedQuantity] = useState("");
  const [expandedNote, setExpandedNote] = useState("");
  const disposeMutation = useDisposeLot();

  const handleToggleExpand = useCallback((lot: ExpiringLotItem) => {
    setExpandedLotId((prev) => {
      if (prev === lot.lotId) {
        setExpandedQuantity("");
        return null;
      }
      setExpandedQuantity(String(lot.remainingQuantity));
      setExpandedNote("");
      return lot.lotId;
    });
  }, []);

  const handleDispose = useCallback(
    async (lot: ExpiringLotItem) => {
      const quantity = lot.isExpired
        ? lot.remainingQuantity
        : Number(expandedQuantity);

      if (!lot.isExpired) {
        if (!Number.isInteger(quantity) || quantity <= 0) {
          toast.error("Số lượng tiêu hủy phải là số nguyên lớn hơn 0.");
          return;
        }

        if (quantity > lot.remainingQuantity) {
          toast.error(
            `Số lượng tiêu hủy (${quantity}) vượt quá số lượng còn lại (${lot.remainingQuantity}).`,
          );
          return;
        }
      }

      try {
        const res = await disposeMutation.mutateAsync({
          depotId,
          lotId: lot.lotId,
          payload: {
            lotId: lot.lotId,
            quantity,
            reason: "Expired",
            note:
              expandedNote.trim() ||
              "Lô đã hết hạn, quản kho xác nhận tiêu hủy.",
          },
        });
        toast.success(res.message);
        setExpandedLotId(null);
        setExpandedQuantity("");
        setExpandedNote("");
      } catch (error: unknown) {
        const err = error as {
          response?: { data?: { message?: string }; status?: number };
        };
        toast.error(
          err.response?.data?.message ?? "Không thể tiêu hủy lô hàng.",
        );
      }
    },
    [depotId, disposeMutation, expandedNote, expandedQuantity],
  );

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
                  <TableHead>Lô</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead className="text-right">Số lượng còn lại</TableHead>
                  <TableHead>Ngày nhập</TableHead>
                  <TableHead>Hạn sử dụng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((lot, idx) => {
                  const days = daysUntil(lot.expiredDate);
                  const isExpanded = expandedLotId === lot.lotId;
                  const isPending =
                    disposeMutation.isPending && expandedLotId === lot.lotId;

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
                          "border-b transition-colors cursor-pointer select-none",
                          lot.isExpired
                            ? "bg-red-50/60 hover:bg-red-100/60"
                            : days <= 7
                              ? "bg-amber-50/60 hover:bg-amber-100/60"
                              : "hover:bg-muted/50",
                        )}
                        onClick={() => handleToggleExpand(lot)}
                      >
                        <TableCell className="text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1">
                            {isExpanded ? (
                              <CaretDown className="h-3 w-3 shrink-0" />
                            ) : (
                              <CaretRight className="h-3 w-3 shrink-0" />
                            )}
                            {lot.itemModelName}
                          </span>
                        </TableCell>
                        <TableCell>Lô số {lot.lotId}</TableCell>
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
                            <TableCell colSpan={8} className="p-0">
                              <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: 0.1 }}
                                className="bg-muted/30 px-8 py-4"
                              >
                                <div className="flex flex-wrap items-start gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">
                                      Số lượng tiêu hủy
                                    </Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={lot.remainingQuantity}
                                      readOnly={lot.isExpired}
                                      value={
                                        lot.isExpired
                                          ? String(lot.remainingQuantity)
                                          : expandedQuantity
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "") {
                                          setExpandedQuantity("");
                                          return;
                                        }
                                        const num = Number(val);
                                        if (num > lot.remainingQuantity) {
                                          setExpandedQuantity(
                                            String(lot.remainingQuantity),
                                          );
                                        } else {
                                          setExpandedQuantity(val);
                                        }
                                      }}
                                      className={cn(
                                        "w-36 bg-background",
                                        lot.isExpired &&
                                          "cursor-not-allowed bg-muted",
                                      )}
                                    />
                                  </div>
                                  <div className="space-y-1.5 flex-1 min-w-48">
                                    <Label className="text-sm font-medium">
                                      Ghi chú (tùy chọn)
                                    </Label>
                                    <Textarea
                                      placeholder="Lý do tiêu hủy..."
                                      value={expandedNote}
                                      onChange={(e) =>
                                        setExpandedNote(e.target.value)
                                      }
                                      rows={1}
                                      className="resize-none"
                                    />
                                  </div>
                                  <div className="flex gap-2 self-start mt-6.5">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      disabled={isPending}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDispose(lot);
                                      }}
                                    >
                                      {isPending ? (
                                        <SpinnerGap className="mr-2 h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash className="mr-2 h-3.5 w-3.5" />
                                      )}
                                      Xử lý hết hạn
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={isPending}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleExpand(lot);
                                      }}
                                    >
                                      Hủy
                                    </Button>
                                  </div>
                                </div>
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
    </div>
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
              Xử lý vật phẩm hết hạn
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
