"use client";

import { InventoryItem, ItemCategory } from "@/types/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStockLevelBadgeVariant } from "@/lib/mock-data";
import {
  Stethoscope,
  UtensilsCrossed,
  Droplets,
  Wrench,
  Tent,
  Shirt,
  AlertTriangle,
  Package,
} from "lucide-react";

// Category icon mapping
const categoryIcons: Record<ItemCategory, React.ReactNode> = {
  MEDICAL: <Stethoscope className="h-5 w-5" />,
  FOOD: <UtensilsCrossed className="h-5 w-5" />,
  WATER: <Droplets className="h-5 w-5" />,
  EQUIPMENT: <Wrench className="h-5 w-5" />,
  SHELTER: <Tent className="h-5 w-5" />,
  CLOTHING: <Shirt className="h-5 w-5" />,
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
  CRITICAL: "Thiếu",
  LOW: "Thấp",
  NORMAL: "Đủ",
  OVERSTOCKED: "Dư",
};

interface CategoryOverviewProps {
  items: InventoryItem[];
  onCategorySelect?: (category: ItemCategory) => void;
  selectedCategory?: ItemCategory | null;
}

interface CategorySummary {
  category: ItemCategory;
  totalItems: number;
  totalQuantity: number;
  criticalCount: number;
  lowCount: number;
  normalCount: number;
}

export default function CategoryOverview({
  items,
  onCategorySelect,
  selectedCategory,
}: CategoryOverviewProps) {
  // Calculate category summaries
  const categories = (Object.keys(categoryNames) as ItemCategory[]).map(
    (category) => {
      const categoryItems = items.filter((item) => item.category === category);
      return {
        category,
        totalItems: categoryItems.length,
        totalQuantity: categoryItems.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
        criticalCount: categoryItems.filter(
          (item) => item.stockLevel === "CRITICAL",
        ).length,
        lowCount: categoryItems.filter((item) => item.stockLevel === "LOW")
          .length,
        normalCount: categoryItems.filter(
          (item) =>
            item.stockLevel === "NORMAL" || item.stockLevel === "OVERSTOCKED",
        ).length,
      } as CategorySummary;
    },
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Tổng Quan Danh Mục
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.category}
              onClick={() => onCategorySelect?.(cat.category)}
              className={cn(
                "relative cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md",
                selectedCategory === cat.category
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50",
                cat.criticalCount > 0 &&
                  "border-red-200 bg-red-50/50 dark:bg-red-950/20",
              )}
            >
              {/* Alert indicator */}
              {cat.criticalCount > 0 && (
                <div className="absolute -top-2 -right-2">
                  <span className="relative flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center">
                      <AlertTriangle className="h-3 w-3 text-white" />
                    </span>
                  </span>
                </div>
              )}

              {/* Category Icon */}
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-3",
                  cat.criticalCount > 0
                    ? "bg-red-500/10 text-red-500"
                    : cat.lowCount > 0
                      ? "bg-orange-500/10 text-orange-500"
                      : "bg-primary/10 text-primary",
                )}
              >
                {categoryIcons[cat.category]}
              </div>

              {/* Category Name */}
              <h3 className="font-semibold text-sm mb-1">
                {categoryNames[cat.category]}
              </h3>

              {/* Stats */}
              <div className="text-xs text-muted-foreground mb-2">
                {cat.totalItems} mặt hàng
              </div>

              {/* Stock Status Badges */}
              <div className="flex flex-wrap gap-1">
                {cat.criticalCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    {cat.criticalCount} {stockLevelNames.CRITICAL}
                  </Badge>
                )}
                {cat.lowCount > 0 && (
                  <Badge variant="warning" className="text-xs px-1.5 py-0">
                    {cat.lowCount} {stockLevelNames.LOW}
                  </Badge>
                )}
                {cat.criticalCount === 0 && cat.lowCount === 0 && (
                  <Badge variant="success" className="text-xs px-1.5 py-0">
                    Đủ hàng
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
