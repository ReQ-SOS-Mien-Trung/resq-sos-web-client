"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Calendar,
  Hash,
  Tag,
  Warehouse,
  ClipboardText,
  Warning,
  CheckCircle,
  XCircle,
  FileText,
  ArrowsIn,
  ArrowsOut,
  X,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { StockMovementEntity } from "@/services/inventory/type";
import {
  useInventoryActionTypes,
  useInventoryItemTypes,
  useInventorySourceTypes,
} from "@/services/inventory/hooks";
import {
  getInventoryActionFallback,
  getInventorySourceLabelFallback,
  type InventoryActionTone,
} from "@/lib/inventory-movement-taxonomy";

interface StockMovementDetailSheetProps {
  movement: StockMovementEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_ICON_BY_TONE: Record<InventoryActionTone, React.ElementType> = {
  emerald: ArrowDown,
  red: ArrowUp,
  orange: SlidersHorizontal,
  blue: ArrowCounterClockwise,
  teal: ArrowDown,
  purple: ArrowsLeftRight,
  amber: Warning,
  slate: XCircle,
  cyan: CheckCircle,
};

const TARGET_GROUP_MAP: Record<string, string> = {
  Medical: "Y tế",
  Food: "Thực phẩm",
  Clothing: "Quần áo",
  Hygiene: "Vệ sinh",
  Emergency: "Khẩn cấp",
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

function formatItemNote(note: string | null | undefined) {
  const value = note?.trim();
  return value ? value : "—";
}

function getStockMovementItemRowKey(
  transactionId: string,
  item: StockMovementEntity["items"][number],
  index: number,
) {
  return [
    transactionId,
    item.itemId,
    item.itemModelId,
    item.lotId ?? item.supplyInventoryLotId ?? "no-lot",
    item.reusableItemId ?? "no-reusable",
    item.serialNumber ?? "no-serial",
    item.supplyInventoryLotId ?? "no-lot",
    item.receivedDate ?? "no-received",
    item.expiredDate ?? "no-expired",
    item.quantityChange,
    index,
  ].join("-");
}

function getLotDetailRowKey(
  item: StockMovementEntity["items"][number],
  lot: NonNullable<StockMovementEntity["items"][number]["lotDetails"]>[number],
  index: number,
) {
  return [
    item.itemModelId,
    "lot",
    lot.lotId,
    lot.receivedDate ?? "no-received",
    lot.expiredDate ?? "no-expired",
    lot.quantityChange,
    index,
  ].join("-");
}

function getReusableDetailRowKey(
  item: StockMovementEntity["items"][number],
  reusable: NonNullable<
    StockMovementEntity["items"][number]["reusableDetails"]
  >[number],
  index: number,
) {
  return [
    item.itemModelId,
    "reusable",
    reusable.reusableItemId,
    reusable.serialNumber ?? "no-serial",
    reusable.quantityChange,
    index,
  ].join("-");
}

export function StockMovementDetailSheet({
  movement,
  open,
  onOpenChange,
}: StockMovementDetailSheetProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: actionTypesData = [] } = useInventoryActionTypes();
  const { data: sourceTypesData = [] } = useInventorySourceTypes();

  const itemTypeLabel = (key: string) =>
    itemTypesData?.find((t) => t.key === key)?.value ?? key;

  if (!movement) return null;

  const actionFallback = getInventoryActionFallback(movement.actionType);
  const actionLabel =
    actionTypesData.find((item) => item.key === movement.actionType)?.value ??
    actionFallback.label;
  const sourceLabel =
    sourceTypesData.find((item) => item.key === movement.sourceType)?.value ??
    getInventorySourceLabelFallback(movement.sourceType);
  const ActionIcon = ACTION_ICON_BY_TONE[actionFallback.tone] ?? Package;

  return (
    <Sheet
      open={open}
      onOpenChange={(val) => {
        if (!val) setIsFullscreen(false);
        onOpenChange(val);
      }}
    >
      <SheetContent
        showClose={false}
        className={`overflow-y-auto ${
          isFullscreen
            ? "w-[min(96vw,1560px)] sm:max-w-[96vw]"
            : "w-full sm:max-w-4xl"
        }`}
        side="right"
      >
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground"
            onClick={() => setIsFullscreen((prev) => !prev)}
          >
            {isFullscreen ? (
              <ArrowsIn size={16} weight="bold" />
            ) : (
              <ArrowsOut size={16} weight="bold" />
            )}
            <span className="sr-only">
              {isFullscreen ? "Thu gọn" : "Bung toàn màn hình"}
            </span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground"
            onClick={() => {
              setIsFullscreen(false);
              onOpenChange(false);
            }}
          >
            <X size={16} weight="bold" />
            <span className="sr-only">Đóng</span>
          </Button>
        </div>
        <SheetHeader className="pb-4 pr-24">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg border ${actionFallback.className}`}
            >
              <ActionIcon size={20} />
            </div>
            <div className="flex-1 min-w-0 flex items-start gap-3">
              <SheetTitle className="text-2xl tracking-tighter break-all font-mono leading-tight mt-1">
                {movement.transactionId}
              </SheetTitle>
              <Badge
                variant="outline"
                className={`text-xs shrink-0 mt-0.5 ${actionFallback.className}`}
              >
                {actionLabel}
              </Badge>
              <SheetDescription className="sr-only">
                Chi tiết giao dịch {movement.transactionId}
              </SheetDescription>
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
                  <Hash size={18} /> Mã
                </span>
                <span className="font-medium text-sm break-all">
                  {movement.transactionId}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-muted-foreground tracking-tighter flex items-center gap-1">
                  <Calendar size={16} /> Thời gian tạo
                </span>
                <span className="font-medium tracking-tighter">
                  {formatDate(movement.createdAt)}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-muted-foreground tracking-tighter flex items-center gap-1">
                  <Tag size={16} /> Loại hành động
                </span>
                <span className="font-medium tracking-tighter">
                  {actionLabel}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-muted-foreground tracking-tighter flex items-center gap-1">
                  <Warehouse size={16} /> Loại nguồn
                </span>
                <span className="font-medium tracking-tighter">
                  {sourceLabel}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-muted-foreground tracking-tighter flex items-center gap-1">
                  <ClipboardText size={16} /> Nguồn
                </span>
                <span className="font-medium tracking-tighter">
                  {movement.sourceName || movement.supplierName || "—"}
                </span>
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

          {/* ── VAT Invoice Info ── */}
          {movement.vatInvoiceId != null && (
            <>
              <section className="space-y-3">
                <h3 className="text-base font-semibold tracking-tighter flex items-center gap-2">
                  <ClipboardText size={24} className="text-muted-foreground" />
                  Hóa đơn VAT
                </h3>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-muted-foreground tracking-tighter">
                        Ký hiệu
                      </span>
                      <span className="font-medium tracking-tighter">
                        {movement.invoiceSerial || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-muted-foreground tracking-tighter">
                        Số hóa đơn
                      </span>
                      <span className="font-medium tracking-tighter">
                        {movement.invoiceNumber || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 col-span-2">
                      <span className="text-sm text-muted-foreground tracking-tighter">
                        Nhà cung cấp
                      </span>
                      <span className="font-medium tracking-tighter text-sm">
                        {movement.supplierName || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-muted-foreground tracking-tighter">
                        Mã số thuế
                      </span>
                      <span className="font-medium tracking-tighter font-mono">
                        {movement.supplierTaxCode || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-muted-foreground tracking-tighter">
                        Ngày hóa đơn
                      </span>
                      <span className="font-medium tracking-tighter">
                        {formatDateShort(movement.invoiceDate)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-muted-foreground tracking-tighter">
                        Tổng tiền
                      </span>
                      <span className="font-semibold tracking-tighter text-emerald-700">
                        {movement.invoiceTotalAmount != null
                          ? movement.invoiceTotalAmount.toLocaleString("vi-VN")
                          : "—"}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          VNĐ
                        </span>
                      </span>
                    </div>
                    {movement.invoiceFileUrl && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-muted-foreground tracking-tighter">
                          File hóa đơn
                        </span>
                        <a
                          href={movement.invoiceFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline tracking-tighter transition-colors"
                        >
                          <FileText size={14} />
                          Xem PDF
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <Separator />
            </>
          )}
          {/* ── Items Table ── */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold tracking-tighter flex items-center gap-2">
              <Package size={24} className="text-muted-foreground" />
              Danh sách vật phẩm
              <span className="ml-1 text-xs font-normal bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {movement.items.length} mặt hàng
              </span>
            </h3>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[24%] text-sm tracking-tighter">
                      Vật phẩm
                    </TableHead>
                    <TableHead className="w-[12%] text-sm tracking-tighter">
                      Loại
                    </TableHead>
                    <TableHead className="w-[13%] text-sm tracking-tighter text-right pr-6">
                      Số lượng
                    </TableHead>
                    <TableHead className="w-[14%] text-sm tracking-tighter">
                      Ngày nhập / HSD
                    </TableHead>
                    <TableHead className="w-[17%] text-sm tracking-tighter">
                      Thông tin chi tiết
                    </TableHead>
                    <TableHead className="w-[20%] text-sm tracking-tighter">
                      Ghi chú
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movement.items.map((item, index) => {
                    const lotDetails =
                      item.lotDetails && item.lotDetails.length > 0
                        ? item.lotDetails
                        : item.lotId || item.supplyInventoryLotId
                          ? [
                              {
                                lotId:
                                  item.lotId ?? item.supplyInventoryLotId ?? 0,
                                receivedDate: item.receivedDate,
                                expiredDate: item.expiredDate,
                                quantityChange: item.quantityChange,
                              },
                            ]
                          : [];
                    const reusableDetails =
                      item.reusableDetails && item.reusableDetails.length > 0
                        ? item.reusableDetails
                        : item.reusableItemId || item.serialNumber
                          ? [
                              {
                                reusableItemId: item.reusableItemId ?? 0,
                                serialNumber: item.serialNumber,
                                quantityChange: item.quantityChange,
                              },
                            ]
                          : [];
                    return (
                      <TableRow
                        key={getStockMovementItemRowKey(
                          movement.transactionId,
                          item,
                          index,
                        )}
                      >
                        <TableCell className="py-2.5">
                          <div className="flex flex-col gap-1">
                            <p className="font-medium text-sm tracking-tighter">
                              {item.itemName}
                            </p>
                            <p className="text-xs text-muted-foreground tracking-tighter">
                              {item.categoryName}
                            </p>
                            {item.targetGroup && (
                              <p className="text-xs text-muted-foreground tracking-tighter">
                                {TARGET_GROUP_MAP[item.targetGroup] ??
                                  item.targetGroup}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-2.5">
                          <span className="text-sm font-medium tracking-tighter">
                            {itemTypeLabel(item.itemType)}
                          </span>
                        </TableCell>

                        <TableCell className="py-2.5 text-right pr-6">
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={`font-semibold text-sm tracking-tighter ${
                                item.quantityChange > 0
                                  ? "text-emerald-600"
                                  : item.quantityChange < 0
                                    ? "text-red-600"
                                    : ""
                              }`}
                            >
                              {item.formattedQuantityChange ||
                                `${item.quantityChange > 0 ? "+" : ""}${item.quantityChange.toLocaleString("vi-VN")}`}{" "}
                              <span className="text-sm text-muted-foreground ml-0.5 font-normal">
                                {item.unit}
                              </span>
                            </span>
                            {item.remainingQuantity !== undefined &&
                              item.remainingQuantity !== null && (
                                <p className="text-sm text-muted-foreground tracking-tighter">
                                  SL còn lại:{" "}
                                  <span className="font-medium text-black">
                                    {item.remainingQuantity.toLocaleString(
                                      "vi-VN",
                                    )}
                                  </span>{" "}
                                  {item.unit}
                                </p>
                              )}
                          </div>
                        </TableCell>

                        <TableCell className="py-2.5">
                          {item.receivedDate || item.expiredDate ? (
                            <div className="space-y-0.5">
                              {item.receivedDate && (
                                <p className="text-sm tracking-tighter text-muted-foreground">
                                  Nhận:{" "}
                                  <span className="text-foreground">
                                    {formatDateShort(item.receivedDate)}
                                  </span>
                                </p>
                              )}
                              {item.expiredDate && (
                                <p className="text-sm tracking-tighter text-muted-foreground">
                                  HSD:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatDateShort(item.expiredDate)}
                                  </span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="py-2.5">
                          {item.itemType === "Consumable" ? (
                            <div className="space-y-2">
                              {lotDetails.length > 0 ? (
                                <div className="space-y-1.5">
                                  {lotDetails.map((lot, lotIndex) => (
                                    <div
                                      key={getLotDetailRowKey(
                                        item,
                                        lot,
                                        lotIndex,
                                      )}
                                      className="py-1"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-sm font-normal tracking-tighter">
                                          Lô số{" "}
                                          <span className="font-semibold">
                                            {lot.lotId}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {reusableDetails.length > 0 ? (
                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                  {reusableDetails.map(
                                    (reusable, reusableIndex) => (
                                      <div
                                        key={getReusableDetailRowKey(
                                          item,
                                          reusable,
                                          reusableIndex,
                                        )}
                                        className="py-1"
                                      >
                                        <div className="min-w-0">
                                          <p className="text-sm font-normal tracking-tighter">
                                            Mã vật phẩm số{" "}
                                            <span className="font-semibold">
                                              {reusable.reusableItemId}
                                            </span>
                                          </p>
                                          <p
                                            className="truncate text-sm tracking-tighter text-muted-foreground"
                                            title={
                                              reusable.serialNumber ?? undefined
                                            }
                                          >
                                            {reusable.serialNumber || "—"}
                                          </p>
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 max-w-[200px]">
                          <p
                            className="whitespace-pre-wrap text-sm leading-relaxed tracking-tighter text-foreground/80 line-clamp-4"
                            title={item.note ?? undefined}
                          >
                            {formatItemNote(item.note)}
                          </p>
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
