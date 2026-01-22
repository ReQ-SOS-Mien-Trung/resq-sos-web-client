"use client";

import { useState } from "react";
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrendingUp, ChevronUp } from "lucide-react";
import type { RevenueChartData } from "@/types/admin-dashboard";

interface RevenueChartProps {
  data: RevenueChartData;
}

const timeFrames: Array<"1D" | "1W" | "1M" | "6M" | "1Y" | "ALL"> = [
  "1D",
  "1W",
  "1M",
  "6M",
  "1Y",
  "ALL",
];

const formatCurrency = (value: number) => {
  // Format as $32.209 (with dot instead of comma)
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `$${formatted.replace(/,/g, ".")}`;
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { month: string; date: string; value: number } }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    // Get month name from date
    const date = new Date(data.date);
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sept", "Oct", "Nov", "Des"
    ];
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return (
      <div className="bg-white dark:bg-card border border-border/50 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-1 text-foreground">
          {monthName}, {year}
        </p>
        <p className="text-lg font-bold text-foreground">
          {formatCurrency(data.value)}
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          +2%
        </p>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data }: RevenueChartProps) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(data.timeFrame);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  return (
    <Card className="border border-border/50 overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold text-foreground">
                Revenue
              </CardTitle>
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {formatCurrency(data.currentValue)}
              </span>
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                +{data.change}% vs last month
              </span>
            </div>
          </div>
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5 gap-0.5">
            {timeFrames.map((tf) => (
              <Button
                key={tf}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2.5 text-xs font-medium rounded transition-all duration-200",
                  selectedTimeFrame === tf
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setSelectedTimeFrame(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={data.data}
            onMouseMove={(e) => {
              if (e && 'activeTooltipIndex' in e && typeof e.activeTooltipIndex === 'number') {
                setHoveredBar(e.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <defs>
              {/* Purple to white gradient bars */}
              <linearGradient id="colorBarRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9333ea" stopOpacity={0.8} />
                <stop offset="50%" stopColor="#a855f7" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#f3f4f6" stopOpacity={0.3} />
              </linearGradient>
              {/* Purple highlighted bar */}
              <linearGradient
                id="colorBarRevenueHover"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#9333ea" stopOpacity={1} />
                <stop offset="50%" stopColor="#a855f7" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#f3f4f6" stopOpacity={0.4} />
              </linearGradient>
              {/* Dotted line pattern */}
              <pattern
                id="dottedLine"
                x="0"
                y="0"
                width="2"
                height="4"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="2" r="0.5" fill="#000000" />
              </pattern>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted/30"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={10}
              tickFormatter={(value) => {
                // Map month abbreviations
                const monthMap: Record<string, string> = {
                  "Mar": "Mar",
                  "Apr": "Apr",
                  "May": "May",
                  "Jun": "Jun",
                  "Jul": "Jul",
                  "Aug": "Aug",
                  "Sep": "Sept",
                  "Oct": "Oct",
                  "Nov": "Nov",
                  "Dec": "Des",
                  "Jan": "Jan",
                  "Feb": "Feb",
                };
                return monthMap[value] || value;
              }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(value) => `${value / 1000}k`}
              axisLine={false}
              tickLine={false}
              dx={-10}
              domain={[0, 40000]}
              ticks={[0, 10000, 20000, 30000, 40000]}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
            />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              maxBarSize={35}
              animationDuration={1000}
              animationEasing="ease-out"
              shape={(props: { x?: number; y?: number; width?: number; height?: number; index?: number }) => {
                const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props;
                const isHovered = hoveredBar === index;
                const centerX = x + width / 2;

                return (
                  <g>
                    {/* Bar with gradient */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={isHovered ? "url(#colorBarRevenueHover)" : "url(#colorBarRevenue)"}
                      rx={4}
                      ry={4}
                    />
                    {/* Black dot at top center */}
                    <circle
                      cx={centerX}
                      cy={y}
                      r={2.5}
                      fill="#000000"
                    />
                    {/* Dotted vertical line */}
                    <line
                      x1={centerX}
                      y1={y}
                      x2={centerX}
                      y2={y + height}
                      stroke="#000000"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      opacity={0.3}
                    />
                  </g>
                );
              }}
            >
              {data.data.map((entry, index) => (
                <Cell key={`cell-${index}`} />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="value"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
