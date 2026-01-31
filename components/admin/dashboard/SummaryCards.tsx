"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TrendUp,
  TrendDown,
  WarningCircle,
  Users,
  Target,
  Clock,
  Info,
} from "@phosphor-icons/react";
import type { SummaryMetric } from "@/types/admin-dashboard";

interface SummaryCardsProps {
  metrics: SummaryMetric[];
}

const getMetricIcon = (label: string) => {
  switch (label.toLowerCase()) {
    case "yêu cầu sos":
      return WarningCircle;
    case "cứu hộ viên":
      return Users;
    case "tỷ lệ thành công":
      return Target;
    case "thời gian phản hồi":
      return Clock;
    default:
      return WarningCircle;
  }
};

export function SummaryCards({ metrics }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {metrics.map((metric, index) => {
        const Icon = getMetricIcon(metric.label);
        return (
          <Card
            key={index}
            className="group relative overflow-hidden border border-border/50 bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-4 relative flex flex-col min-h-[130px]">
              {/* Top Row: Icon + Label | Info Icon */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-muted/80 flex items-center justify-center border border-border/50 group-hover:border-primary/20 transition-colors flex-shrink-0">
                    <Icon size={18} className="text-foreground/80" />
                  </div>
                  <span className="text-sm font-semibold text-foreground leading-tight truncate">
                    {metric.label}
                  </span>
                </div>
                <button className="h-6 w-6 rounded-full border border-border/50 flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0 ml-2">
                  <Info
                    size={16}
                    className="text-foreground/70 hover:text-foreground"
                  />
                </button>
              </div>

              {/* Middle: Large Number with Change Indicator */}
              <div className="flex items-baseline gap-2.5 mb-4 flex-1 min-h-[50px]">
                <div className="text-4xl font-bold tracking-tight text-foreground leading-none">
                  {metric.value}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-bold whitespace-nowrap flex-shrink-0",
                    metric.changeType === "increase"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-700 dark:text-rose-400",
                  )}
                >
                  {metric.changeType === "increase" ? (
                    <TrendUp size={14} />
                  ) : (
                    <TrendDown size={14} />
                  )}
                  <span>
                    {metric.changeType === "increase" ? "+" : ""}
                    {metric.change}%
                  </span>
                </div>
              </div>

              {/* Bottom: Comparison Text */}
              <div className="mt-auto">
                <div className="text-xs text-foreground/80 dark:text-foreground/70 leading-relaxed font-medium">
                  {metric.comparison}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
