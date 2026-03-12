"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Package } from "@phosphor-icons/react";
import { categoryCodeIcons } from "@/lib/constants";
import { CategoryOverviewProps } from "@/type";

const CategoryOverview = ({
  apiCategories,
  onCategorySelect,
  selectedCategory,
}: CategoryOverviewProps) => {
  // Nothing to render when no API data
  if (!apiCategories || apiCategories.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary " />
            Tổng Quan Danh Mục
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Không có dữ liệu danh mục</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Tổng Quan Danh Mục
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "grid gap-3",
            apiCategories.length <= 6
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
              : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
          )}
        >
          {apiCategories.map((cat) => {
            const icon = categoryCodeIcons[cat.code] ?? (
              <Package className="h-5 w-5" />
            );

            return (
              <div
                key={cat.id}
                onClick={() => onCategorySelect?.(cat.code)}
                className={cn(
                  "relative cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md",
                  selectedCategory === cat.code
                    ? "ring-2 ring-primary border-primary"
                    : "hover:border-primary/50",
                )}
              >
                {/* Category Icon */}
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 bg-primary/10 text-primary">
                  {icon}
                </div>

                {/* Category Name */}
                <h3 className="font-semibold text-sm mb-1">{cat.name}</h3>

                {/* Quantity */}
                <div className="text-xs text-muted-foreground mb-2">
                  {cat.quantity.toLocaleString("vi-VN")} sản phẩm
                </div>

                {/* Description tooltip badge */}
                {cat.quantity > 0 ? (
                  <Badge variant="success" className="text-xs px-1.5 py-0">
                    Có hàng
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    Hết hàng
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryOverview;
