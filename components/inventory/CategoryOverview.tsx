"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Package } from "@phosphor-icons/react";
import { categoryCodeIcons } from "@/lib/constants";
import { CategoryOverviewProps } from "@/type";

const CARD_COLOR_THEMES = [
  {
    container: "bg-red-50 border-red-300 hover:border-red-400",
    icon: "bg-red-100 text-red-600",
  },
  {
    container: "bg-orange-50 border-orange-300 hover:border-orange-400",
    icon: "bg-orange-100 text-orange-600",
  },
  {
    container: "bg-amber-50 border-amber-300 hover:border-amber-400",
    icon: "bg-amber-100 text-amber-600",
  },
  {
    container: "bg-emerald-50 border-emerald-300 hover:border-emerald-400",
    icon: "bg-emerald-100 text-emerald-600",
  },
  {
    container: "bg-teal-50 border-teal-300 hover:border-teal-400",
    icon: "bg-teal-100 text-teal-600",
  },
  {
    container: "bg-cyan-50 border-cyan-300 hover:border-cyan-400",
    icon: "bg-cyan-100 text-cyan-600",
  },
  {
    container: "bg-blue-50 border-blue-300 hover:border-blue-400",
    icon: "bg-blue-100 text-blue-600",
  },
  {
    container: "bg-indigo-50 border-indigo-300 hover:border-indigo-400",
    icon: "bg-indigo-100 text-indigo-600",
  },
  {
    container: "bg-violet-50 border-violet-300 hover:border-violet-400",
    icon: "bg-violet-100 text-violet-600",
  },
  {
    container: "bg-fuchsia-50 border-fuchsia-300 hover:border-fuchsia-400",
    icon: "bg-fuchsia-100 text-fuchsia-600",
  },
  {
    container: "bg-rose-50 border-rose-300 hover:border-rose-400",
    icon: "bg-rose-100 text-rose-600",
  },
];

const OTHERS_GRAY_THEME = {
  container: "bg-slate-50 border-slate-300 hover:border-slate-400",
  icon: "bg-slate-100 text-slate-600",
};

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
          {apiCategories.map((cat, index) => {
            const icon = categoryCodeIcons[cat.code] ?? (
              <Package className="h-5 w-5" />
            );
            const codeLower = cat.code.toLowerCase();
            const nameLower = cat.name.toLowerCase();
            const isOthersCategory =
              codeLower === "others" ||
              nameLower.includes("khác") ||
              nameLower.includes("khac");
            const theme = isOthersCategory
              ? OTHERS_GRAY_THEME
              : CARD_COLOR_THEMES[index % CARD_COLOR_THEMES.length];

            return (
              <div
                key={cat.id}
                onClick={() => onCategorySelect?.(cat.code)}
                className={cn(
                  "relative cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md",
                  theme.container,
                  selectedCategory === cat.code
                    ? "ring-2 ring-primary"
                    : "",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Category Icon */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                      theme.icon,
                    )}
                  >
                    {icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Category Name */}
                    <h3 className="font-semibold text-sm mb-1 tracking-tighter text-right">
                      {cat.name}
                    </h3>

                    {/* Quantity */}
                    <div className="text-xs mb-2 tracking-tighter text-right">
                      {cat.quantity.toLocaleString("vi-VN")} sản phẩm
                    </div>

                    {/* Description tooltip badge */}
                    <div className="flex justify-end">
                      {cat.quantity > 0 ? (
                        <Badge
                          variant="success"
                          className="text-xs px-1.5 py-0 tracking-tighter"
                        >
                          Có hàng
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="text-xs px-1.5 py-0 tracking-tighter"
                        >
                          Hết hàng
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryOverview;
