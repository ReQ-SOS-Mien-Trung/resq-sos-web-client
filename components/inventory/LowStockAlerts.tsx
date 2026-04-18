"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle,
  Gear,
  Warning,
  Wrench,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import { useMyDepotLowStock } from "@/services/inventory/hooks";
import {
  compareLowStockItems,
  getLowStockSeverityRatio,
  getLowStockWarningLabel,
  getLowStockWarningLevel,
  getResolvedThresholdScopeLabel,
  getWarningLevelPriority,
} from "@/services/inventory/utils";

const MAX_VISIBLE = 5;

const WARNING_LEVEL_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  MEDIUM:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  LOW: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  OK: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  UNCONFIGURED:
    "bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
};

function getContainerTone(level: string): string {
  switch (level) {
    case "CRITICAL":
      return "border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-950/25";
    case "HIGH":
      return "border-orange-200 bg-orange-50 dark:border-orange-800/60 dark:bg-orange-950/25";
    case "MEDIUM":
      return "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/25";
    case "LOW":
      return "border-yellow-200 bg-yellow-50 dark:border-yellow-800/60 dark:bg-yellow-950/25";
    default:
      return "border-slate-200 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/50";
  }
}

const LowStockAlerts = () => {
  const router = useRouter();
  const { selectedDepotId } = useManagerDepot();
  const { data: lowStock, isLoading } = useMyDepotLowStock(
    selectedDepotId ? { depotId: selectedDepotId } : undefined,
  );

  const items = (lowStock?.items ?? [])
    .filter((item) => getLowStockWarningLevel(item) !== "OK")
    .sort(compareLowStockItems);

  const levelCounts = items.reduce<Record<string, number>>((acc, item) => {
    const level = getLowStockWarningLevel(item);
    acc[level] = (acc[level] ?? 0) + 1;
    return acc;
  }, {});

  const highlightedLevels: string[] = Object.keys(levelCounts)
    .sort(
      (left, right) =>
        getWarningLevelPriority(left) - getWarningLevelPriority(right),
    )
    .slice(0, 2);

  const navigateToFull = () => {
    router.push("/dashboard/inventory/threshold-config?tab=lowstock");
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-0.5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Warning className="h-5 w-5 text-red-500" weight="fill" />
            Cảnh Báo Tồn Kho
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {highlightedLevels.map((level) => (
              <Badge
                key={level}
                className={cn(
                  "border-0 text-xs shadow-none",
                  WARNING_LEVEL_COLORS[level] ?? "bg-slate-100 text-slate-700",
                )}
              >
                {levelCounts[level]} {getLowStockWarningLabel(level)}
              </Badge>
            ))}
            {items.length > 0 ? (
              <Badge variant="info" className="text-xs tracking-tighter">
                {items.length} mục
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-0">
        {isLoading ? (
          <div className="space-y-3 px-6 py-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <ScrollArea className="min-h-0 flex-1 px-6">
            <div className="space-y-2 pb-4">
              {items.slice(0, MAX_VISIBLE).map((item) => {
                const level = getLowStockWarningLevel(item);
                const severity = getLowStockSeverityRatio(item);
                const shortage =
                  item.minimumThreshold != null
                    ? Math.max(
                        item.minimumThreshold - item.availableQuantity,
                        0,
                      )
                    : null;

                return (
                  <div
                    key={`${item.depotId ?? "my"}-${item.itemModelId}`}
                    onClick={navigateToFull}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3 transition-all hover:shadow-md",
                      getContainerTone(level),
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 rounded-lg bg-white/80 p-2 dark:bg-background/60">
                        <Wrench
                          className="h-4 w-4 text-current"
                          weight="fill"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="truncate text-base font-semibold tracking-tighter">
                            {item.itemModelName}
                          </h4>
                          <Badge
                            className={cn(
                              "border-0 text-xs shadow-none",
                              WARNING_LEVEL_COLORS[level] ??
                                "bg-slate-100 text-slate-700",
                            )}
                          >
                            {getLowStockWarningLabel(level)}
                          </Badge>
                        </div>

                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-muted-foreground tracking-tighter">
                            Danh mục: {item.categoryName ?? "Chưa rõ danh mục"}
                          </span>
                          <span className="text-xs font-medium">
                            Khả dụng {item.availableQuantity}
                            {item.unit ? ` ${item.unit}` : ""}
                            {item.minimumThreshold != null
                              ? ` / Ngưỡng ${item.minimumThreshold}${item.unit ? ` ${item.unit}` : ""}`
                              : ""}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between font-medium gap-2 text-xs tracking-tighter text-muted-foreground">
                          <span className="truncate">
                            Cấu hình:{" "}
                            {getResolvedThresholdScopeLabel(
                              item.resolvedThresholdScope,
                            )}
                            {item.isUsingGlobalDefault
                              ? " · Mặc định hệ thống"
                              : ""}
                          </span>
                          <span>
                            {item.minimumThreshold != null
                              ? `ratio ${severity.toFixed(2)}`
                              : "chưa cấu hình ngưỡng"}
                          </span>
                        </div>

                        {shortage != null ? (
                          <div className="mt-1 text-xs text-muted-foreground tracking-tighter">
                            Thiếu{" "}
                            <strong className="text-black">
                              {shortage}
                              {item.unit ? ` ${item.unit}` : ""}
                            </strong>{" "}
                            để đạt ngưỡng tối thiểu
                          </div>
                        ) : null}
                      </div>

                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-500" weight="fill" />
            </div>
            <h3 className="text-lg font-medium">Tuyệt vời!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tất cả mặt hàng đều đủ tồn kho
            </p>
          </div>
        )}

        <div className="flex gap-2 border-t px-4 pt-2">
          {items.length > MAX_VISIBLE ? (
            <Button
              variant="outline"
              className="flex-1"
              onClick={navigateToFull}
            >
              Xem tất cả ({items.length} mặt hàng)
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size={items.length > MAX_VISIBLE ? "icon" : "default"}
            className={cn(items.length <= MAX_VISIBLE && "w-full gap-1.5")}
            onClick={() => router.push("/dashboard/inventory/threshold-config")}
          >
            <Gear className="h-4 w-4" />
            {items.length <= MAX_VISIBLE ? "Cấu hình ngưỡng tồn kho" : null}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LowStockAlerts;
