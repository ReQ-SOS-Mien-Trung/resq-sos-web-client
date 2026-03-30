"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowsLeftRight,
  ArrowCounterClockwise,
  SlidersHorizontal,
  Package,
  User,
  Calendar,
  Hash,
  Tag,
  Warehouse,
  ClipboardText,
  Warning,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { StockMovementEntity } from "@/services/inventory/type";

interface StockMovementDetailSheetProps {
  movement: StockMovementEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_TYPE_MAP: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  Import:      { label: "Nhập kho",    className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: ArrowDown },
  Export:      { label: "Xuất kho",    className: "bg-red-100 text-red-700 border-red-200", icon: ArrowUp },
  Adjust:      { label: "Điều chỉnh",  className: "bg-orange-100 text-orange-700 border-orange-200", icon: SlidersHorizontal },
  Return:      { label: "Hoàn trả",    className: "bg-blue-100 text-blue-700 border-blue-200", icon: ArrowCounterClockwise },
  TransferIn:  { label: "Chuyển nhập", className: "bg-teal-100 text-teal-700 border-teal-200", icon: ArrowDown },
  TransferOut: { label: "Chuyển xuất", className: "bg-purple-100 text-purple-700 border-purple-200", icon: ArrowsLeftRight },
};

const SOURCE_TYPE_MAP: Record<string, string> = {
  Donation:   "Quyên góp",
  Mission:    "Nhiệm vụ",
  Purchase:   "Mua sắm",
  Adjustment: "Điều chỉnh",
  Transfer:   "Chuyển kho",
  Manual:     "Thủ công",
};

const ITEM_TYPE_MAP: Record<string, string> = {
  Consumable: "Tiêu hao",
  Reusable:   "Tái sử dụng",
};

const TARGET_GROUP_MAP: Record<string, string> = {
  Medical:    "Y tế",
  Food:       "Thực phẩm",
  Clothing:   "Quần áo",
  Hygiene:    "Vệ sinh",
  Emergency:  "Khẩn cấp",
};

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: vi });
  } catch {
    return dateString;
  }
}

function formatDateShort(dateString: string | null | undefined) {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: vi });
  } catch {
    return dateString;
  }
}

export function StockMovementDetailSheet({
  movement,
  open,
  onOpenChange,
}: StockMovementDetailSheetProps) {
  if (!movement) return null;

  const actionConfig = ACTION_TYPE_MAP[movement.actionType];
  const ActionIcon = actionConfig?.icon ?? Package;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" side="right">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg border ${actionConfig?.className ?? "bg-muted"}`}>
              <ActionIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base tracking-tighter truncate font-mono">
                {movement.transactionId}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Chi tiết giao dịch {movement.transactionId}
              </SheetDescription>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className={`text-xs ${actionConfig?.className ?? ""}`}
                >
                  {actionConfig?.label ?? movement.actionType}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* ── Stock Movement Info ── */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold tracking-tighter flex items-center gap-2">
              <ClipboardText size={24} className="text-muted-foreground" />
              Thông tin giao dịch
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-muted-foreground tracking-tighter flex items-center gap-1">
                  <Hash size={18} /> Mã giao dịch
                </span>
                <span className="font-medium text-sm break-all">{movement.transactionId}</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-muted-foreground tracking-tighter flex items-center gap-1">
                  <Calendar size={16} /> Thời gian nhập kho
                </span>
                <span className="font-medium tracking-tighter">{formatDate(movement.createdAt)}</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-muted-foreground tracking-tighter flex items-center gap-1">
                  <Tag size={16} /> Loại nguồn
                </span>
                <span className="font-medium tracking-tighter">
                  {SOURCE_TYPE_MAP[movement.sourceType] ?? (movement.sourceType || "—")}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-muted-foreground tracking-tighter flex items-center gap-1">
                  <Warehouse size={16} /> Nguồn
                </span>
                <span className="font-medium tracking-tighter">{movement.sourceName || "—"}</span>
              </div>

              {/* {movement.sourceId != null && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-muted-foreground tracking-tighter flex items-center gap-1">
                    <Hash size={16} /> ID nguồn
                  </span>
                  <span className="font-medium text-xs">{movement.sourceId}</span>
                </div>
              )} */}

              {/* <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground tracking-tighter flex items-center gap-1">
                  <User size={11} /> Người thực hiện
                </span>
                <span className="font-medium tracking-tighter">{movement.performedByName || "—"}</span>
              </div> */}
            </div>

            {movement.note && (
              <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm tracking-tighter">
                <p className="text-xs text-muted-foreground mb-1">Ghi chú</p>
                <p>{movement.note}</p>
              </div>
            )}
          </section>

          <Separator />

          {/* ── Items Table ── */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold tracking-tighter flex items-center gap-2">
              <Package size={24} className="text-muted-foreground" />
              Danh sách vật tư
              <span className="ml-1 text-xs font-normal bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {movement.items.length} mặt hàng
              </span>
            </h3>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs tracking-tighter">Vật tư</TableHead>
                    <TableHead className="text-xs tracking-tighter">Loại</TableHead>
                    <TableHead className="text-xs tracking-tighter text-right">Số lượng</TableHead>
                    <TableHead className="text-xs tracking-tighter">Ngày nhập / HSD</TableHead>
                    <TableHead className="text-xs tracking-tighter">Lô</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movement.items.map((item) => {
                    const expired = item.expiredDate ? new Date(item.expiredDate) < new Date(movement.createdAt) : false;
                    const thirtyDaysLater = new Date(movement.createdAt);
                    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
                    const expiringSoon =
                      !expired &&
                      item.expiredDate != null &&
                      new Date(item.expiredDate) < thirtyDaysLater;

                    return (
                      <TableRow key={`${item.itemId}-${item.supplyInventoryLotId ?? "no-lot"}`}>
                        <TableCell className="py-2.5">
                          <p className="font-medium text-sm tracking-tighter">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground tracking-tighter">{item.categoryName}</p>
                          {item.targetGroup && (
                            <p className="text-xs text-muted-foreground tracking-tighter">
                              {TARGET_GROUP_MAP[item.targetGroup] ?? item.targetGroup}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="py-2.5">
                          <span className="text-sm font-medium tracking-tighter">
                            {ITEM_TYPE_MAP[item.itemType] ?? item.itemType}
                          </span>
                        </TableCell>

                        <TableCell className="py-2.5 text-right">
                          <span
                            className={`font-semibold text-sm tracking-tighter ${
                              item.quantityChange > 0
                                ? "text-emerald-600"
                                : item.quantityChange < 0
                                ? "text-red-600"
                                : ""
                            }`}
                          >
                            {item.formattedQuantityChange || `${item.quantityChange > 0 ? "+" : ""}${item.quantityChange.toLocaleString("vi-VN")}`}
                          </span>
                          <p className="text-xs text-muted-foreground">{item.unit}</p>
                        </TableCell>

                        <TableCell className="py-2.5">
                          {item.receivedDate || item.expiredDate ? (
                            <div className="space-y-0.5">
                              {item.receivedDate && (
                                <p className="text-xs tracking-tighter text-muted-foreground">
                                  Nhận: <span className="text-foreground">{formatDateShort(item.receivedDate)}</span>
                                </p>
                              )}
                              {item.expiredDate && (
                                <p className="text-xs tracking-tighter text-muted-foreground flex items-center gap-1">
                                  HSD:{" "}
                                  <span
                                    className={`font-medium ${
                                      expired
                                        ? "text-red-600"
                                        : expiringSoon
                                        ? "text-amber-600"
                                        : "text-foreground"
                                    }`}
                                  >
                                    {formatDateShort(item.expiredDate)}
                                  </span>
                                  {expired && <XCircle size={12} className="text-red-500" weight="fill" />}
                                  {expiringSoon && !expired && <Warning size={12} className="text-amber-500" weight="fill" />}
                                  {!expired && !expiringSoon && item.expiredDate && (
                                    <CheckCircle size={12} className="text-emerald-500" weight="fill" />
                                  )}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="py-2.5">
                          {item.supplyInventoryLotId != null ? (
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                              #{item.supplyInventoryLotId}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          {/* ── Raw summary ── */}
          {/* <Separator />
          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-tighter text-muted-foreground uppercase">
              Tổng kết
            </h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-black tracking-tighter">{movement.items.length}</p>
                <p className="text-xs text-muted-foreground tracking-tighter mt-0.5">Mặt hàng</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-black tracking-tighter">
                  {movement.items
                    .filter((i) => i.quantityChange > 0)
                    .reduce((s, i) => s + i.quantityChange, 0)
                    .toLocaleString("vi-VN")}
                </p>
                <p className="text-xs text-muted-foreground tracking-tighter mt-0.5">Nhập</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-black tracking-tighter text-red-600">
                  {Math.abs(
                    movement.items
                      .filter((i) => i.quantityChange < 0)
                      .reduce((s, i) => s + i.quantityChange, 0),
                  ).toLocaleString("vi-VN")}
                </p>
                <p className="text-xs text-muted-foreground tracking-tighter mt-0.5">Xuất</p>
              </div>
            </div>
          </section> */}
        </div>
      </SheetContent>
    </Sheet>
  );
}
