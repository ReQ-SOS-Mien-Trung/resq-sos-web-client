"use client";

import { InventoryItem, ItemCategory } from "@/types/inventory";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getStockLevelBadgeVariant } from "@/lib/mock-data";
import {
  Package,
  MapPin,
  Calendar,
  Warning,
  TrendUp,
  TrendDown,
  PencilSimple,
  ArrowLineUp,
  ArrowLineDown,
  ClockCounterClockwise,
  Stethoscope,
  ForkKnife,
  Drop,
  Wrench,
  Tent,
  TShirt,
} from "@phosphor-icons/react";

// Category icon mapping
const categoryIcons: Record<ItemCategory, React.ReactNode> = {
  MEDICAL: <Stethoscope className="h-5 w-5" weight="fill" />,
  FOOD: <ForkKnife className="h-5 w-5" weight="fill" />,
  WATER: <Drop className="h-5 w-5" weight="fill" />,
  EQUIPMENT: <Wrench className="h-5 w-5" weight="fill" />,
  SHELTER: <Tent className="h-5 w-5" weight="fill" />,
  CLOTHING: <TShirt className="h-5 w-5" weight="fill" />,
};

const categoryNames: Record<ItemCategory, string> = {
  MEDICAL: "Y Tế",
  FOOD: "Thực Phẩm",
  WATER: "Nước Uống",
  EQUIPMENT: "Thiết Bị",
  SHELTER: "Lều Trại",
  CLOTHING: "Quần Áo",
};

const stockLevelNames: Record<string, string> = {
  CRITICAL: "Cực Kỳ Thiếu",
  LOW: "Sắp Hết",
  NORMAL: "Bình Thường",
  OVERSTOCKED: "Dư Thừa",
};

interface ItemDetailsSheetProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestInbound?: () => void;
  onRequestOutbound?: () => void;
  onEdit?: () => void;
}

export default function ItemDetailsSheet({
  item,
  open,
  onOpenChange,
  onRequestInbound,
  onRequestOutbound,
  onEdit,
}: ItemDetailsSheetProps) {
  if (!item) return null;

  const stockPercentage = Math.min((item.quantity / item.maxStock) * 100, 100);
  const needsRestock = item.quantity < item.minStock;
  const restockAmount = needsRestock ? item.minStock - item.quantity : 0;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "p-3 rounded-xl",
                item.stockLevel === "CRITICAL"
                  ? "bg-red-500/10"
                  : item.stockLevel === "LOW"
                    ? "bg-orange-500/10"
                    : "bg-primary/10",
              )}
            >
              {categoryIcons[item.category]}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">{item.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <span className="font-mono text-sm">{item.sku}</span>
                <span>•</span>
                <span>{categoryNames[item.category]}</span>
              </SheetDescription>
            </div>
          </div>
          <Badge
            variant={getStockLevelBadgeVariant(item.stockLevel)}
            className="w-fit"
          >
            {stockLevelNames[item.stockLevel]}
          </Badge>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Stock Level Visual */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Tình Trạng Tồn Kho
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">
                  {item.quantity.toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  / {item.maxStock.toLocaleString()} {item.unit}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    item.stockLevel === "CRITICAL" && "bg-red-500",
                    item.stockLevel === "LOW" && "bg-orange-500",
                    item.stockLevel === "NORMAL" && "bg-green-500",
                    item.stockLevel === "OVERSTOCKED" && "bg-blue-500",
                  )}
                  style={{ width: `${stockPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Tồn tối thiểu: {item.minStock} {item.unit}
                </span>
                <span>
                  Tồn tối đa: {item.maxStock} {item.unit}
                </span>
              </div>

              {needsRestock && (
                <div className="flex items-center gap-2 text-red-500 bg-red-500/10 rounded-md p-2 mt-2">
                  <Warning className="h-4 w-4" weight="fill" />
                  <span className="text-sm font-medium">
                    Cần bổ sung thêm {restockAmount} {item.unit}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Item Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Chi Tiết</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Vị trí:</span>
                <span className="font-medium">{item.location}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cập nhật:</span>
                <span className="font-medium">
                  {formatDate(item.lastUpdated)}
                </span>
              </div>
              {item.expiryDate && (
                <div className="flex items-center gap-3 text-sm">
                  <Warning
                    className={cn(
                      "h-4 w-4",
                      new Date(item.expiryDate) < new Date()
                        ? "text-red-500"
                        : "text-muted-foreground",
                    )}
                    weight="fill"
                  />
                  <span className="text-muted-foreground">Hạn sử dụng:</span>
                  <span
                    className={cn(
                      "font-medium",
                      new Date(item.expiryDate) < new Date() && "text-red-500",
                    )}
                  >
                    {formatDate(item.expiryDate)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Stock Indicators */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Chỉ Số Tồn Kho</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <TrendDown className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                <p className="text-lg font-bold">{item.minStock}</p>
                <p className="text-xs text-muted-foreground">Tồn tối thiểu</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <TrendUp className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="text-lg font-bold">{item.maxStock}</p>
                <p className="text-xs text-muted-foreground">Tồn tối đa</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Thao Tác</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={onRequestInbound}
              >
                <ArrowLineDown className="h-4 w-4 mr-2" />
                Nhập kho
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={onRequestOutbound}
              >
                <ArrowLineUp className="h-4 w-4 mr-2" />
                Xuất kho
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full" onClick={onEdit}>
                <PencilSimple className="h-4 w-4 mr-2" />
                Chỉnh sửa
              </Button>
              <Button variant="outline" className="w-full">
                <ClockCounterClockwise className="h-4 w-4 mr-2" />
                Lịch sử
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
