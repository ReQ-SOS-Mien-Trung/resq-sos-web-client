"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TrendUp,
  TrendDown,
  Info,
  WarningCircle,
  Users,
  Target,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useRescuersDailyStatistics,
  useMissionSuccessRateSummary,
  useSosRequestsSummary,
} from "@/services/admin_dashboard";

interface CardData {
  label: string;
  numericValue: number;
  suffix: string;
  decimalPlaces: number;
  changePercent: number | null;
  changeDirection: "increase" | "decrease" | "no_change" | "new";
  comparison: string;
}

const CARD_THEMES = [
  {
    gradient: "from-orange-500/10 via-rose-500/5 to-transparent",
    iconBg:
      "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700/50",
    iconColor: "text-orange-600 dark:text-orange-400",
    accentBar: "bg-orange-500",
    hoverShadow: "hover:shadow-orange-500/10",
  },
  {
    gradient: "from-blue-500/10 via-sky-500/5 to-transparent",
    iconBg:
      "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    accentBar: "bg-blue-500",
    hoverShadow: "hover:shadow-blue-500/10",
  },
  {
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
    iconBg:
      "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accentBar: "bg-emerald-500",
    hoverShadow: "hover:shadow-emerald-500/10",
  },
] as const;

function useCountUp(target: number, duration = 1400, decimalPlaces = 0) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(parseFloat((eased * target).toFixed(decimalPlaces)));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, decimalPlaces]);

  return display;
}

const SummaryCard = ({
  card,
  index,
  loading,
  Icon,
}: {
  card: CardData;
  index: number;
  loading: boolean;
  Icon: React.ElementType;
}) => {
  const theme = CARD_THEMES[index];
  const animated = useCountUp(
    loading ? 0 : card.numericValue,
    1400,
    card.decimalPlaces,
  );

  if (loading) {
    return (
      <Card className="py-0 border border-border/50 bg-card overflow-hidden">
        <div className={cn("h-1 w-full opacity-40", theme.accentBar)} />
        <CardContent className="p-5 flex flex-col min-h-36 gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-10 w-28 mt-2" />
          <Skeleton className="h-4 w-36 mt-auto" />
        </CardContent>
      </Card>
    );
  }

  const isIncrease = card.changeDirection === "increase";
  const showTrend =
    card.changePercent !== null &&
    card.changeDirection !== "no_change" &&
    card.changeDirection !== "new";

  const displayValue =
    card.decimalPlaces > 0
      ? `${animated.toFixed(card.decimalPlaces)}${card.suffix}`
      : `${Math.round(animated)}${card.suffix}`;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden py-0 border border-border/60 bg-card",
        "hover:shadow-xl transition-all duration-300 hover:-translate-y-1",
        theme.hoverShadow,
      )}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {/* Top accent bar */}
      <div
        className={cn(
          "h-1 w-full transition-all duration-300 group-hover:h-1.5",
          theme.accentBar,
        )}
      />

      {/* Background gradient on hover */}
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
          theme.gradient,
        )}
      />

      <CardContent className="p-5 relative flex flex-col min-h-36">
        {/* Top Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center border transition-colors shrink-0",
                theme.iconBg,
              )}
            >
              <Icon size={20} className={theme.iconColor} />
            </div>
            <span className="text-sm font-semibold text-foreground leading-tight truncate">
              {card.label}
            </span>
          </div>
          <button className="h-6 w-6 rounded-full border border-border/50 flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0 ml-2">
            <Info
              size={15}
              className="text-foreground/60 hover:text-foreground"
            />
          </button>
        </div>

        {/* Animated number */}
        <div className="flex items-baseline gap-2.5 mb-4 flex-1 min-h-12">
          <div className="text-4xl font-bold tracking-tighter text-foreground leading-none tabular-nums">
            {displayValue}
          </div>
          {showTrend && card.changePercent !== null && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm tracking-tighter font-bold whitespace-nowrap shrink-0",
                isIncrease
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-rose-700 dark:text-rose-400",
              )}
            >
              {isIncrease ? <TrendUp size={14} /> : <TrendDown size={14} />}
              <span>
                {isIncrease ? "+" : "-"}
                {Math.abs(card.changePercent).toFixed(1)}%
              </span>
            </div>
          )}
          {card.changeDirection === "new" && (
            <div className="flex items-center gap-1 text-sm tracking-tighter font-bold whitespace-nowrap shrink-0 text-blue-600 dark:text-blue-400">
              <TrendUp size={14} />
              <span>Mới</span>
            </div>
          )}
        </div>

        {/* Comparison */}
        <div className="mt-auto">
          <div className="text-sm tracking-tighter text-foreground/70 dark:text-foreground/60 leading-relaxed font-medium">
            {card.comparison}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SummaryCards = () => {
  const { data: sosData, isLoading: isSosLoading } = useSosRequestsSummary();
  const { data: rescuersData, isLoading: isRescuersLoading } =
    useRescuersDailyStatistics();
  const { data: successRateData, isLoading: isSuccessRateLoading } =
    useMissionSuccessRateSummary();

  const cards: CardData[] = [
    {
      label: "Yêu cầu SOS",
      numericValue: sosData?.totalSosRequests ?? 0,
      suffix: "",
      decimalPlaces: 0,
      changePercent: sosData?.changePercent ?? null,
      changeDirection: sosData?.changeDirection ?? "no_change",
      comparison: sosData?.comparisonLabel ?? "so với hôm qua",
    },
    {
      label: "Cứu hộ viên",
      numericValue: rescuersData?.totalRescuers ?? 0,
      suffix: "",
      decimalPlaces: 0,
      changePercent: rescuersData?.dailyChange.changePercent ?? null,
      changeDirection: rescuersData?.dailyChange.changeDirection ?? "no_change",
      comparison: rescuersData?.dailyChange.comparisonLabel ?? "so với hôm qua",
    },
    {
      label: "Tỷ lệ thành công",
      numericValue: successRateData?.successRate ?? 0,
      suffix: "%",
      decimalPlaces: 1,
      changePercent: successRateData?.changePercent ?? null,
      changeDirection: successRateData?.changeDirection ?? "no_change",
      comparison: successRateData?.comparisonLabel ?? "so với hôm qua",
    },
  ];

  const loadingStates = [isSosLoading, isRescuersLoading, isSuccessRateLoading];
  const icons = [WarningCircle, Users, Target];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {cards.map((card, index) => (
        <SummaryCard
          key={index}
          card={card}
          index={index}
          loading={loadingStates[index]}
          Icon={icons[index]}
        />
      ))}
    </div>
  );
};

export default SummaryCards;
