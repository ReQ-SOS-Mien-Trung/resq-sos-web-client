"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Siren,
  HourglassHigh,
  Spinner,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";

export interface SOSRequestStatsData {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

const SOSRequestStats = ({ stats }: { stats: SOSRequestStatsData }) => {
  const statItems = [
    {
      label: "Tổng yêu cầu SOS",
      value: stats.total,
      icon: Siren,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/30",
    },
    {
      label: "Chờ xử lý",
      value: stats.pending,
      icon: HourglassHigh,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Đang thực thi",
      value: stats.inProgress,
      icon: Spinner,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Hoàn thành",
      value: stats.completed,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Đã huỷ",
      value: stats.cancelled,
      icon: XCircle,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-50 dark:bg-slate-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="border border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm tracking-tighter text-muted-foreground font-medium mb-1">
                    {item.label}
                  </p>
                  <p className="text-2xl tracking-tighter font-bold text-foreground">
                    {item.value}
                  </p>
                </div>
                <div
                  className={`h-12 w-12 rounded-lg ${item.bgColor} flex items-center justify-center`}
                >
                  <Icon size={24} className={item.color} weight="fill" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SOSRequestStats;
