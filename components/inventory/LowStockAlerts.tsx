"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
  Gear,
  CheckCircle,
} from "@phosphor-icons/react";
import { useMyDepotLowStock } from "@/services/inventory/hooks";
import type { LowStockItem } from "@/services/inventory/type";
import { useRouter } from "next/navigation";

// Map categoryName (Vietnamese) → icon
const categoryIconMap: Record<string, React.ReactNode> = {
  "Y tế": <Stethoscope className="h-4 w-4" weight="fill" />,
  Medical: <Stethoscope className="h-4 w-4" weight="fill" />,
  "Thực phẩm": <ForkKnife className="h-4 w-4" weight="fill" />,
  Food: <ForkKnife className="h-4 w-4" weight="fill" />,
  "Nước uống": <Drop className="h-4 w-4" weight="fill" />,
  Water: <Drop className="h-4 w-4" weight="fill" />,
  "Công cụ sửa chữa": <Wrench className="h-4 w-4" weight="fill" />,
  RepairTools: <Wrench className="h-4 w-4" weight="fill" />,
  "Thiết bị cứu hộ": <Wrench className="h-4 w-4" weight="fill" />,
  RescueEquipment: <Wrench className="h-4 w-4" weight="fill" />,
  "Nơi trú ẩn": <Tent className="h-4 w-4" weight="fill" />,
  Shelter: <Tent className="h-4 w-4" weight="fill" />,
  "Quần áo": <TShirt className="h-4 w-4" weight="fill" />,
  Clothing: <TShirt className="h-4 w-4" weight="fill" />,
};

function getIcon(item: LowStockItem) {
  return categoryIconMap[item.categoryName] ?? <Wrench className="h-4 w-4" weight="fill" />;
}

const MAX_VISIBLE = 5;

const LowStockAlerts = () => {
  const router = useRouter();
  const { data: lowStock, isLoading } = useMyDepotLowStock();

  const items = lowStock?.items ?? [];
  const dangerCount = lowStock?.summary?.dangerCount ?? 0;
  const warningCount = lowStock?.summary?.warningCount ?? 0;

  // Sort: Danger first, then by availableRatio ascending
  const sorted = [...items].sort((a, b) => {
    if (a.alertLevel === "Danger" && b.alertLevel !== "Danger") return -1;
    if (a.alertLevel !== "Danger" && b.alertLevel === "Danger") return 1;
    return a.availableRatio - b.availableRatio;
  });

  const navigateToFull = () => {
    router.push("/dashboard/inventory/threshold-config?tab=lowstock");
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Warning className="h-5 w-5 text-red-500" weight="fill" />
            Cảnh Báo Tồn Kho
          </CardTitle>
          <div className="flex items-center gap-2">
            {dangerCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {dangerCount} nghiêm trọng
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning" className="text-xs">
                {warningCount} sắp hết
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {isLoading ? (
          <div className="px-6 space-y-3 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length > 0 ? (
          <ScrollArea className="h-85 px-6">
            <div className="space-y-2 pb-4">
              {sorted.slice(0, MAX_VISIBLE).map((item) => {
                const isDanger = item.alertLevel === "Danger";
                const pct = Math.round(item.availableRatio * 100);
                const needsAmount = item.quantity - item.availableQuantity;

                return (
                  <div
                    key={`${item.depotId}-${item.itemModelId}`}
                    onClick={navigateToFull}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                      isDanger
                        ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                        : "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800",
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "p-2 rounded-lg shrink-0",
                        isDanger ? "bg-red-500/20" : "bg-orange-500/20",
                      )}
                    >
                      {getIcon(item)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-sm truncate">
                          {item.itemModelName}
                        </h4>
                        <Badge
                          variant={isDanger ? "destructive" : "warning"}
                          className="shrink-0 text-xs"
                        >
                          {isDanger ? "Cực Kỳ Thiếu" : "Sắp Hết"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {item.categoryName}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            isDanger ? "text-red-600" : "text-orange-600",
                          )}
                        >
                          {item.availableQuantity} / {item.quantity} {item.unit} ({pct}%)
                        </span>
                      </div>
                      {needsAmount > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendDown
                            className={cn(
                              "h-3 w-3",
                              isDanger ? "text-red-500" : "text-orange-500",
                            )}
                          />
                          <span className="text-xs text-muted-foreground">
                            Đã giữ: <strong>{item.reservedQuantity} {item.unit}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" weight="fill" />
            </div>
            <h3 className="font-medium text-lg">Tuyệt vời!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tất cả mặt hàng đều đủ tồn kho
            </p>
          </div>
        )}

        {/* Footer: xem tất cả + cấu hình */}
        <div className="px-4 pt-2 border-t flex gap-2">
          {sorted.length > MAX_VISIBLE && (
            <Button variant="outline" className="flex-1" onClick={navigateToFull}>
              Xem tất cả ({items.length} mặt hàng)
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          <Button
            variant="ghost"
            size={sorted.length > MAX_VISIBLE ? "icon" : "default"}
            className={cn(sorted.length <= MAX_VISIBLE && "w-full gap-1.5")}
            onClick={() => router.push("/dashboard/inventory/threshold-config")}
          >
            <Gear className="h-4 w-4" />
            {sorted.length <= MAX_VISIBLE && "Cấu hình ngưỡng tồn kho"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LowStockAlerts;
