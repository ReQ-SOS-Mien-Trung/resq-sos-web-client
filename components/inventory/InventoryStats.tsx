"use client";

import { InventoryStats as IInventoryStats } from "@/types/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Warning,
  WarningCircle,
  CheckCircle,
  ArrowLineDown,
  ArrowLineUp,
  Truck,
  Clock,
} from "@phosphor-icons/react";

interface InventoryStatsProps {
  stats: IInventoryStats;
}

export default function InventoryStats({ stats }: InventoryStatsProps) {
  const statCards = [
    {
      title: "Tổng Mặt Hàng",
      value: stats.totalItems,
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: `${stats.totalCategories} danh mục`,
    },
    {
      title: "Cảnh Báo Nghiêm Trọng",
      value: stats.criticalStock,
      icon: Warning,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      description: "Cần bổ sung gấp",
    },
    {
      title: "Sắp Hết Hàng",
      value: stats.lowStock,
      icon: WarningCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      description: "Cần theo dõi",
    },
    {
      title: "Đủ Hàng",
      value: stats.normalStock,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      description: "Tồn kho ổn định",
    },
    {
      title: "Chờ Nhập",
      value: stats.pendingInbound,
      icon: ArrowLineDown,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      description: "Yêu cầu nhập kho",
    },
    {
      title: "Chờ Xuất",
      value: stats.pendingOutbound,
      icon: ArrowLineUp,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
      description: "Yêu cầu xuất kho",
    },
    {
      title: "Đang Vận Chuyển",
      value: stats.activeShipments,
      icon: Truck,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      description: "Đơn hàng đang giao",
    },
    {
      title: "Sắp Hết Hạn",
      value: stats.itemsExpiringSoon,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      description: "Trong 30 ngày tới",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              {stat.title}
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
          {/* Decorative gradient */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 ${stat.bgColor}`}
          />
        </Card>
      ))}
    </div>
  );
}
