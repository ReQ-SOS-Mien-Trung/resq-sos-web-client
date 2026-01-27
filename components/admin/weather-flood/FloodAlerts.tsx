"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, Clock, CheckCircle } from "lucide-react";
import type { FloodAlert } from "@/types/admin-pages";
import { cn } from "@/lib/utils";

interface FloodAlertsProps {
  alerts: FloodAlert[];
  onView?: (alert: FloodAlert) => void;
  onResolve?: (alert: FloodAlert) => void;
}

export function FloodAlerts({
  alerts,
  onView,
  onResolve,
}: FloodAlertsProps) {
  const getLevelBadge = (level: FloodAlert["level"]) => {
    const variants = {
      low: {
        label: "Thấp",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      },
      medium: {
        label: "Trung bình",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      },
      high: {
        label: "Cao",
        className: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
      },
      critical: {
        label: "Khẩn cấp",
        className: "bg-red-500/10 text-red-700 dark:text-red-400",
      },
    };
    return variants[level];
  };

  const getStatusBadge = (status: FloodAlert["status"]) => {
    const variants = {
      active: {
        label: "Đang hoạt động",
        className: "bg-red-500/10 text-red-700 dark:text-red-400",
      },
      monitoring: {
        label: "Đang theo dõi",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      },
      resolved: {
        label: "Đã giải quyết",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      },
    };
    return variants[status];
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Cảnh báo lũ lụt
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Không có cảnh báo nào
            </p>
          ) : (
            alerts.map((alert) => {
              const levelBadge = getLevelBadge(alert.level);
              const statusBadge = getStatusBadge(alert.status);
              return (
                <div
                  key={alert.id}
                  className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">
                          {alert.region}
                        </span>
                        <Badge className={levelBadge.className}>
                          {levelBadge.label}
                        </Badge>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground/80 mb-2">
                        {alert.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {alert.affectedAreas.map((area, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-muted rounded-md text-foreground/70"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(alert.createdAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView?.(alert)}
                      >
                        Xem chi tiết
                      </Button>
                      {alert.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onResolve?.(alert)}
                          className="text-emerald-600 dark:text-emerald-400"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Giải quyết
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
