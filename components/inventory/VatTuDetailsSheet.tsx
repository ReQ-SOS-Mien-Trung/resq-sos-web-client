import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Package,
  Calendar,
  HandHeart,
  Tag,
  Wrench,
  CheckCircle,
  WarningCircle,
  XCircle,
  Tray,
  Warning,
  ClockCountdown,
} from "@phosphor-icons/react";
import { InventoryItemEntity } from "@/services/inventory/type";
import { useInventoryItemTypes, useInventoryTargetGroups, useInventoryLots } from "@/services/inventory/hooks";

interface VatTuDetailsSheetProps {
  item: InventoryItemEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VatTuDetailsSheet({ item, open, onOpenChange }: VatTuDetailsSheetProps) {
  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: targetGroupsData } = useInventoryTargetGroups();
  const { data: lotsData, isLoading: loadingLots } = useInventoryLots(
    item?.itemModelId ?? 0,
    { enabled: open && item?.itemType === "Consumable" && !!item?.itemModelId },
  );

  const itemTypeLabel = (key: string) =>
    itemTypesData?.find((t) => t.key === key)?.value ?? key;
  const targetGroupLabel = (key: string) =>
    targetGroupsData?.find((g) => g.key === key)?.value ?? key;

  if (!item) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Chưa cập nhật";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  // Normalize qty fields: Consumable uses quantity/reservedQuantity/availableQuantity;
  // Reusable uses unit/reservedUnit/availableUnit
  const totalQty = item.itemType === "Reusable" ? item.unit : item.quantity;
  const reservedQty = item.itemType === "Reusable" ? item.reservedUnit : item.reservedQuantity;
  const availableQty = item.itemType === "Reusable" ? item.availableUnit : item.availableQuantity;

  const reservedPercent = totalQty > 0 ? (reservedQty / totalQty) * 100 : 0;
  const availablePercent = totalQty > 0 ? (availableQty / totalQty) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto h-dvh bg-background p-6">
        <SheetHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10 text-[#FF5722]">
              <Package className="h-6 w-6" weight="fill" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <SheetTitle className="text-2xl tracking-tighter">{item.itemModelName}</SheetTitle>
              <SheetDescription className="flex tracking-tighter items-center gap-2 mt-1">
                Danh mục: <span className="font-medium text-sm text-black dark:text-white uppercase tracking-tight">{item.categoryName}</span>
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-left">
            {/* <Badge variant="outline" className="rounded-none tracking-tighter border-black/20 text-sm">{targetGroupLabel(item.targetGroup)}</Badge> */}
            <Badge className={cn("rounded-none tracking-tighter text-sm text-white", availableQty > 0 ? "bg-[#FF5722] hover:bg-[#FF5722]/90 border-transparent" : "bg-red-500 hover:bg-red-500/90 border-transparent")}>
              {availableQty > 0 ? "Còn Hàng" : "Hết Hàng"}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Stock Level Visual */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium tracking-tighter flex items-center">
              Tình Trạng Tồn Kho
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-3xl tracking-tighter font-bold">
                  {availableQty.toLocaleString()}
                </span>
                <span className="text-muted-foreground tracking-tighter font-medium">
                  / {totalQty.toLocaleString()} (Tổng)
                </span>
              </div>

              {/* Progress bar container */}
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-[#FF5722] tracking-tighter transition-all"
                  style={{ width: `${availablePercent}%` }}
                  title={`Có sẵn: ${availableQty.toLocaleString()}`}
                />
                <div
                  className="h-full bg-orange-300 tracking-tighter transition-all"
                  style={{ width: `${reservedPercent}%` }}
                  title={`Đã cọc: ${reservedQty.toLocaleString()}`}
                />
              </div>

              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span className="text-[#FF5722] tracking-tighter font-semibold">Khả dụng: {availableQty.toLocaleString()}</span>
                <span className="text-orange-500 tracking-tighter font-semibold">Đã phân bổ: {reservedQty.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reusable Breakdown */}
          {item.itemType === "Reusable" && item.reusableBreakdown && (() => {
            const rb = item.reusableBreakdown;
            return (
              <div className="space-y-3">
                <h3 className="text-xl tracking-tighter font-medium flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  Tình Trạng Thiết Bị
                </h3>

                {/* Status row */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-green-50 border border-green-200 p-2">
                    <p className="text-lg font-bold tracking-tighter text-green-700">{rb.availableUnits}</p>
                    <p className="text-sm font-medium text-green-600 tracking-tighter">Khả dụng</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-2">
                    <p className="text-lg font-bold tracking-tighter text-blue-700">{rb.inUseUnits}</p>
                    <p className="text-sm font-medium text-blue-600 tracking-tighter">Đang dùng</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
                    <p className="text-lg font-bold tracking-tighter text-amber-700">{rb.maintenanceUnits}</p>
                    <p className="text-sm font-medium text-amber-600 tracking-tighter">Bảo trì</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-2">
                    <p className="text-lg font-bold tracking-tighter text-gray-500">{rb.decommissionedUnits}</p>
                    <p className="text-sm font-medium text-gray-500 tracking-tighter">Ngừng dùng</p>
                  </div>
                </div>

                {/* Quality row */}
                <div className="space-y-1.5">
                  <p className="text-sm tracking-tighter font-semibold py-2">Chất lượng</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" weight="fill" />
                      <span className="text-sm tracking-tighter text-muted-foreground flex-1">Còn tốt</span>
                      <span className="text-sm font-bold tracking-tighter">{rb.goodCount}</span>
                      <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${rb.totalUnits > 0 ? (rb.goodCount / rb.totalUnits) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <WarningCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" weight="fill" />
                      <span className="text-sm tracking-tighter text-muted-foreground flex-1">Trung bình</span>
                      <span className="text-sm font-bold tracking-tighter">{rb.fairCount}</span>
                      <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${rb.totalUnits > 0 ? (rb.fairCount / rb.totalUnits) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" weight="fill" />
                      <span className="text-sm tracking-tighter text-muted-foreground flex-1">Cần thay thế / sửa chữa</span>
                      <span className="text-sm font-bold tracking-tighter">{rb.poorCount}</span>
                      <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${rb.totalUnits > 0 ? (rb.poorCount / rb.totalUnits) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {item.itemType === "Reusable" && item.reusableBreakdown && <Separator />}
          <div className="space-y-3">
            <h3 className="text-sm tracking-tighter font-semibold">Chi Tiết</h3>
            <div className="grid gap-3">
              <div className="flex items-center tracking-tighter gap-3 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground tracking-tighter">Phân loại:</span>
                <span className="font-medium tracking-tighter">{itemTypeLabel(item.itemType)}</span>
              </div>
              <div className="flex items-center tracking-tighter gap-3 text-sm">
                <HandHeart className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground tracking-tighter">Đối tượng:</span>
                <span className="font-medium tracking-tighter">{targetGroupLabel(item.targetGroup)}</span>
              </div>
              <div className="flex items-center tracking-tighter gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground tracking-tighter">Lần nhập xuất kho cuối:</span>
                <span className="font-medium tracking-tighter">
                  {formatDate(item.lastStockedAt)}
                </span>
              </div>
              {item.itemType === "Consumable" && (
                <>
                  <div className="flex items-center tracking-tighter gap-3 text-sm">
                    <Tray className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground tracking-tighter">Số lô hiện tại:</span>
                    <span className="font-medium tracking-tighter">{item.lotCount ?? 0} lô</span>
                  </div>
                  {item.nearestExpiryDate && (
                    <div className="flex items-center tracking-tighter gap-3 text-sm">
                      <ClockCountdown className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground tracking-tighter">Hết hạn gần nhất:</span>
                      <span className={`font-medium tracking-tighter ${item.isExpiringSoon ? "text-amber-600" : ""}`}>
                        {formatDate(item.nearestExpiryDate)}
                        {item.isExpiringSoon && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                            <Warning size={10} weight="fill" /> Sắp hết hạn
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Lot Section for Consumable */}
          {item.itemType === "Consumable" && (
            <div className="space-y-3">
              <h3 className="text-sm tracking-tighter font-semibold flex items-center gap-2">
                <Tray className="h-6 w-6 text-muted-foreground" />
                Lô hàng
              </h3>
              {loadingLots ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-muted/50 animate-pulse rounded-lg" />)}
                </div>
              ) : !lotsData?.items?.length ? (
                <p className="text-sm text-muted-foreground tracking-tighter">Không có lô nào</p>
              ) : (
                <div className="space-y-1.5">
                  {lotsData.items.map((lot) => (
                    <div
                      key={lot.lotId}
                      className={`rounded-lg border px-3 py-3 text-xs tracking-tighter ${
                        lot.isExpired
                          ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                          : lot.isExpiringSoon
                          ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                          : "border-border/50 bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">Lô số {lot.lotId}</span>
                        <div className="flex items-center gap-1.5">
                          {lot.isExpired && (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-sm font-semibold">
                              Hết hạn
                            </span>
                          )}
                          {lot.isExpiringSoon && !lot.isExpired && (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-sm font-semibold">
                              Sắp hết hạn
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-sm">
                        <span>Còn lại: <span className="font-semibold text-foreground">{lot.remainingQuantity.toLocaleString()}</span> / {lot.quantity.toLocaleString()}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-sm text-muted-foreground tracking-tighter">
                        <span>Nguồn: <span className="font-medium text-foreground">{lot.sourceType}</span></span>
                        <span>Hết hạn: {new Date(lot.expiredDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {item.itemType === "Consumable" && <Separator />}

          {/* Actions */}
          {/* <div className="space-y-3">
            <h3 className="text-sm font-semibold">Thao Tác</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full border-black/20 hover:bg-[#FF5722] hover:text-white hover:border-[#FF5722] transition-colors rounded-none gap-2">
                <ArrowLineDown className="h-4 w-4" />
                Nhập kho
              </Button>
              <Button variant="outline" className="w-full border-black/20 hover:bg-[#FF5722] hover:text-white hover:border-[#FF5722] transition-colors rounded-none gap-2">
                <ArrowLineUp className="h-4 w-4" />
                Xuất kho
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full border-black/20 rounded-none gap-2">
                <PencilSimple className="h-4 w-4" />
                Chỉnh sửa
              </Button>
              <Button variant="outline" className="w-full border-black/20 rounded-none gap-2">
                <ClockCounterClockwise className="h-4 w-4" />
                Lịch sử
              </Button>
            </div>
          </div> */}
        </div>
      </SheetContent>
    </Sheet>
  );
}
