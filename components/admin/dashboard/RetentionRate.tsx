"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MoreVertical } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RetentionRateData } from "@/types/admin-dashboard";

interface RetentionRateProps {
  data: RetentionRateData;
}

// Get color mapping helper
const getSegmentColor = (name: string) => {
  if (name === "Lũ lụt") return "#ef4444"; // Red
  if (name === "Sạt lở") return "#f97316"; // Orange
  if (name === "Bão") return "#eab308"; // Yellow
  return "#ef4444";
};

// CustomTooltip component outside render
const CustomTooltip = ({
  active,
  payload,
  segments,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { month: string; [key: string]: string | number };
  }>;
  segments: RetentionRateData["segments"];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <p className="text-sm font-semibold mb-2">{String(data.month)}</p>
        {segments.map((segment) => {
          const color = getSegmentColor(segment.name);
          const value =
            typeof data[segment.name] === "number" ? data[segment.name] : 0;
          return (
            <div
              key={segment.name}
              className="flex items-center justify-between gap-4 text-xs py-0.5"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{segment.name}</span>
              </div>
              <span className="font-medium">{value}%</span>
            </div>
          );
        })}
        <div className="border-t border-border/50 mt-2 pt-2">
          <p className="text-sm font-bold">
            Total: {typeof data.total === "number" ? data.total : 0}%
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function RetentionRate({ data }: RetentionRateProps) {
  const chartData = data.monthlyData.map((item) => ({
    month: item.month,
    ...item.segments,
    total: item.total,
  }));

  // Order segments: Bão (bottom), Sạt lở (middle), Lũ lụt (top)
  const orderedSegments = [
    data.segments.find((s) => s.name === "Bão")!,
    data.segments.find((s) => s.name === "Sạt lở")!,
    data.segments.find((s) => s.name === "Lũ lụt")!,
  ].filter(Boolean);

  return (
    <Card className="border border-border/50 overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">
                Hiệu suất cứu hộ
              </CardTitle>
              <MoreVertical className="h-4 w-4 text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold tracking-tight">
                {data.currentRate}%
              </span>
              <div className="flex items-center gap-1 text-xs text-emerald-500 font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                <TrendingUp className="h-3 w-3" />
                <span>+{data.change}% so với tháng trước</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3">
          {data.segments.map((segment) => {
            const color = getSegmentColor(segment.name);
            return (
              <div
                key={segment.name}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {segment.name}
                </span>
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={chartData}
            barCategoryGap="15%"
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted/30"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              dx={-5}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip
              content={<CustomTooltip segments={data.segments} />}
              cursor={{ fill: "transparent" }}
            />
            {/* Render in order: Enterprises (bottom), Startups (middle), SMEs (top) */}
            {orderedSegments.map((segment, index) => {
              const color = getSegmentColor(segment.name);
              const isTopSegment = index === orderedSegments.length - 1;

              return (
                <Bar
                  key={segment.name}
                  dataKey={segment.name}
                  stackId="retention"
                  fill={color}
                  radius={isTopSegment ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
