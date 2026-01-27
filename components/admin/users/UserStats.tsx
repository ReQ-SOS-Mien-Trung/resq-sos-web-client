"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { UserStats as UserStatsType } from "@/types/admin-pages";
import { Users, UserCheck, UserX, Clock } from "lucide-react";

interface UserStatsProps {
  stats: UserStatsType;
}

export function UserStats({ stats }: UserStatsProps) {
  const statItems = [
    {
      label: "Tổng người dùng",
      value: stats.total,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Đang hoạt động",
      value: stats.active,
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Đang chờ",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Bị cấm",
      value: stats.banned,
      icon: UserX,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="border border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">
                    {item.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {item.value}
                  </p>
                </div>
                <div
                  className={`h-12 w-12 rounded-lg ${item.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
