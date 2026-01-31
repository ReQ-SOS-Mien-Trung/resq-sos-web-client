"use client";

import { InventoryItem, ItemCategory } from "@/types/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getStockLevelBadgeVariant } from "@/lib/mock-data";
import {
  Warning,
  ArrowRight,
  Stethoscope,
  ForkKnife,
  Drop,
  Wrench,
  Tent,
  TShirt,
  TrendDown,
} from "@phosphor-icons/react";

const categoryIcons: Record<ItemCategory, React.ReactNode> = {
  MEDICAL: <Stethoscope className="h-4 w-4" weight="fill" />,
  FOOD: <ForkKnife className="h-4 w-4" weight="fill" />,
  WATER: <Drop className="h-4 w-4" weight="fill" />,
  EQUIPMENT: <Wrench className="h-4 w-4" weight="fill" />,
  SHELTER: <Tent className="h-4 w-4" weight="fill" />,
  CLOTHING: <TShirt className="h-4 w-4" weight="fill" />,
};

const stockLevelNames: Record<string, string> = {
  CRITICAL: "Cực Kỳ Thiếu",
  LOW: "Sắp Hết",
  NORMAL: "Bình Thường",
  OVERSTOCKED: "Dư Thừa",
};

interface LowStockAlertsProps {
  items: InventoryItem[];
  onItemClick?: (item: InventoryItem) => void;
  onViewAll?: () => void;
}

export default function LowStockAlerts({
  items,
  onItemClick,
  onViewAll,
}: LowStockAlertsProps) {
  // Filter critical and low stock items
  const alertItems = items
    .filter(
      (item) => item.stockLevel === "CRITICAL" || item.stockLevel === "LOW",
    )
    .sort((a, b) => {
      // Sort by stock level (CRITICAL first) then by quantity ratio
      if (a.stockLevel === "CRITICAL" && b.stockLevel !== "CRITICAL") return -1;
      if (a.stockLevel !== "CRITICAL" && b.stockLevel === "CRITICAL") return 1;
      return a.quantity / a.minStock - b.quantity / b.minStock;
    });

  const criticalCount = alertItems.filter(
    (item) => item.stockLevel === "CRITICAL",
  ).length;
  const lowCount = alertItems.filter(
    (item) => item.stockLevel === "LOW",
  ).length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Warning className="h-5 w-5 text-red-500" weight="fill" />
            Cảnh Báo Tồn Kho
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} nghiêm trọng
              </Badge>
            )}
            {lowCount > 0 && (
              <Badge variant="warning" className="text-xs">
                {lowCount} sắp hết
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-75 px-6">
          {alertItems.length > 0 ? (
            <div className="space-y-2 pb-4">
              {alertItems.slice(0, 8).map((item) => {
                const needsAmount = item.minStock - item.quantity;
                const stockPercentage = Math.round(
                  (item.quantity / item.minStock) * 100,
                );

                return (
                  <div
                    key={item.id}
                    onClick={() => onItemClick?.(item)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                      item.stockLevel === "CRITICAL"
                        ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                        : "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800",
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "p-2 rounded-lg shrink-0",
                        item.stockLevel === "CRITICAL"
                          ? "bg-red-500/20"
                          : "bg-orange-500/20",
                      )}
                    >
                      {categoryIcons[item.category]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-sm truncate">
                          {item.name}
                        </h4>
                        <Badge
                          variant={getStockLevelBadgeVariant(item.stockLevel)}
                          className="shrink-0 text-xs"
                        >
                          {stockLevelNames[item.stockLevel]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {item.sku}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            item.stockLevel === "CRITICAL"
                              ? "text-red-600"
                              : "text-orange-600",
                          )}
                        >
                          {item.quantity} / {item.minStock} {item.unit} (
                          {stockPercentage}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendDown
                          className={cn(
                            "h-3 w-3",
                            item.stockLevel === "CRITICAL"
                              ? "text-red-500"
                              : "text-orange-500",
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          Cần bổ sung:{" "}
                          <strong>
                            {needsAmount} {item.unit}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Warning className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-medium text-lg">Tuyệt vời!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tất cả mặt hàng đều đủ tồn kho
              </p>
            </div>
          )}
        </ScrollArea>
        {alertItems.length > 8 && (
          <div className="p-4 border-t">
            <Button variant="outline" className="w-full" onClick={onViewAll}>
              Xem tất cả ({alertItems.length} mặt hàng)
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
