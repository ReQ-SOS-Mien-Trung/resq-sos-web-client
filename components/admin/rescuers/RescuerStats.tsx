"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, ShieldCheck, Handshake, UserMinus } from "@phosphor-icons/react";

export interface RescuerStatsData {
  total: number;
  core: number;
  volunteer: number;
  banned: number;
}

const RescuerStats = ({ stats }: { stats: RescuerStatsData }) => {
  const statItems = [
    {
      label: "Tổng cứu hộ viên",
      value: stats.total,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Core",
      value: stats.core,
      icon: ShieldCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Volunteer",
      value: stats.volunteer,
      icon: Handshake,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      label: "Bị cấm",
      value: stats.banned,
      icon: UserMinus,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <Icon size={24} className={item.color} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RescuerStats;
