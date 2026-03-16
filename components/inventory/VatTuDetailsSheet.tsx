import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Package,
  Calendar,
  PencilSimple,
  ArrowLineUp,
  ArrowLineDown,
  ClockCounterClockwise,
  HandHeart,
  Tag
} from "@phosphor-icons/react";
import { InventoryItemEntity } from "@/services/inventory/type";
import { useInventoryItemTypes, useInventoryTargetGroups } from "@/services/inventory/hooks";

interface VatTuDetailsSheetProps {
  item: InventoryItemEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VatTuDetailsSheet({ item, open, onOpenChange }: VatTuDetailsSheetProps) {
  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: targetGroupsData } = useInventoryTargetGroups();

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

  const reservedPercent = item.quantity > 0 ? (item.reservedQuantity / item.quantity) * 100 : 0;
  const availablePercent = item.quantity > 0 ? (item.availableQuantity / item.quantity) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto h-dvh bg-background p-6">
        <SheetHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10 text-[#FF5722]">
              <Package className="h-6 w-6" weight="fill" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <SheetTitle className="text-xl tracking-tighter">{item.reliefItemName}</SheetTitle>
              <SheetDescription className="flex tracking-tighter items-center gap-2 mt-1">
                Danh mục: <span className="font-medium text-sm text-black dark:text-white uppercase tracking-tight">{item.categoryName}</span>
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-left">
            {/* <Badge variant="outline" className="rounded-none tracking-tighter border-black/20 text-sm">{targetGroupLabel(item.targetGroup)}</Badge> */}
            <Badge className={cn("rounded-none tracking-tighter text-sm text-white", item.availableQuantity > 0 ? "bg-[#FF5722] hover:bg-[#FF5722]/90 border-transparent" : "bg-red-500 hover:bg-red-500/90 border-transparent")}>
              {item.availableQuantity > 0 ? "Còn Hàng" : "Hết Hàng"}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Stock Level Visual */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium tracking-tighter flex items-center">
              Tình Trạng Tồn Kho
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-3xl tracking-tighter font-bold">
                  {item.availableQuantity.toLocaleString()}
                </span>
                <span className="text-muted-foreground tracking-tighter font-medium">
                  / {item.quantity.toLocaleString()} (Tổng)
                </span>
              </div>

              {/* Progress bar container */}
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-[#FF5722] tracking-tighter transition-all"
                  style={{ width: `${availablePercent}%` }}
                  title={`Có sẵn: ${item.availableQuantity.toLocaleString()}`}
                />
                <div
                  className="h-full bg-orange-300 tracking-tighter transition-all"
                  style={{ width: `${reservedPercent}%` }}
                  title={`Đã cọc: ${item.reservedQuantity.toLocaleString()}`}
                />
              </div>

              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span className="text-[#FF5722] tracking-tighter font-semibold">Khả dụng: {item.availableQuantity.toLocaleString()}</span>
                <span className="text-orange-500 tracking-tighter font-semibold">Đã cọc: {item.reservedQuantity.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Item Details */}
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
            </div>
          </div>

          <Separator />

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
