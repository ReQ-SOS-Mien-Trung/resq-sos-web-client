"use client";

import { useState, useEffect } from "react";
import { SOSCluster, SOSRequest } from "@/types/coordinator";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  MapPin,
  Clock,
  Users,
  Stethoscope,
  UtensilsCrossed,
  Anchor,
  AlertCircle,
  Zap,
  ChevronRight,
} from "lucide-react";

// Time elapsed display component
function TimeElapsed({ date }: { date: Date }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const updateElapsed = () => {
      const now = Date.now();
      const minutes = Math.floor((now - date.getTime()) / 60000);
      if (minutes < 60) {
        setElapsed(`${minutes} phút trước`);
      } else {
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
          setElapsed(`${hours} giờ trước`);
        } else {
          const days = Math.floor(hours / 24);
          setElapsed(`${days} ngày trước`);
        }
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [date]);

  return <span>{elapsed}</span>;
}

interface ClusterDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: SOSCluster | null;
  onProcessCluster: () => void;
  onSOSSelect: (sos: SOSRequest) => void;
}

export default function ClusterDetailsSheet({
  open,
  onOpenChange,
  cluster,
  onProcessCluster,
  onSOSSelect,
}: ClusterDetailsSheetProps) {
  if (!cluster) return null;

  const priorityColors = {
    P1: "bg-red-500",
    P2: "bg-orange-500",
    P3: "bg-yellow-500",
  };

  const hasMedicalEmergency = cluster.sosRequests.some((s) => s.needs.medical);
  const needsBoat = cluster.sosRequests.some((s) => s.needs.boat);
  const needsFood = cluster.sosRequests.some((s) => s.needs.food);

  // Get all unique risk factors
  const allRiskFactors = [
    ...new Set(
      cluster.sosRequests.flatMap((s) => s.aiAnalysis?.riskFactors || [])
    ),
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 overflow-hidden"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full animate-pulse",
                      priorityColors[cluster.highestPriority]
                    )}
                  />
                  Cụm SOS #{cluster.id.split("-")[1]}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  Chi tiết nhóm cứu hộ theo gia đình
                </SheetDescription>
              </div>
              <Badge
                variant={
                  cluster.highestPriority === "P1"
                    ? "p1"
                    : cluster.highestPriority === "P2"
                    ? "p2"
                    : "p3"
                }
                className="text-sm"
              >
                {cluster.highestPriority}
              </Badge>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-muted rounded-lg p-3 text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold">{cluster.totalVictims}</div>
                <div className="text-xs text-muted-foreground">Nạn nhân</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <MapPin className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold">
                  {cluster.sosRequests.length}
                </div>
                <div className="text-xs text-muted-foreground">Điểm SOS</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <AlertCircle className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold">{allRiskFactors.length}</div>
                <div className="text-xs text-muted-foreground">Rủi ro</div>
              </div>
            </div>
          </SheetHeader>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Required Resources */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Yêu cầu hỗ trợ</h4>
                <div className="flex flex-wrap gap-2">
                  {hasMedicalEmergency && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                      <Stethoscope className="h-4 w-4" />
                      <span className="text-sm font-medium">Y tế khẩn cấp</span>
                    </div>
                  )}
                  {needsBoat && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                      <Anchor className="h-4 w-4" />
                      <span className="text-sm font-medium">Cần thuyền</span>
                    </div>
                  )}
                  {needsFood && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg">
                      <UtensilsCrossed className="h-4 w-4" />
                      <span className="text-sm font-medium">Cần thực phẩm</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Risk Analysis */}
              {allRiskFactors.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Phân tích AI
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {allRiskFactors.map((factor, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual SOS Requests */}
              <div>
                <h4 className="text-sm font-semibold mb-3">
                  Chi tiết các yêu cầu SOS
                </h4>
                <div className="space-y-3">
                  {cluster.sosRequests.map((sos) => (
                    <SOSDetailCard
                      key={sos.id}
                      sos={sos}
                      onClick={() => onSOSSelect(sos)}
                    />
                  ))}
                </div>
              </div>

              {/* Location Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2">Vị trí trung tâm</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Lat: {cluster.center.lat.toFixed(6)}</div>
                  <div>Lng: {cluster.center.lng.toFixed(6)}</div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <SheetFooter className="p-4 border-t">
            <Button
              className="w-full bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              size="lg"
              onClick={onProcessCluster}
            >
              <Zap className="h-5 w-5 mr-2" />
              Xử lý với AI Dispatch
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Individual SOS Detail Card
function SOSDetailCard({
  sos,
  onClick,
}: {
  sos: SOSRequest;
  onClick: () => void;
}) {
  const priorityColors = {
    P1: "border-l-red-500",
    P2: "border-l-orange-500",
    P3: "border-l-yellow-500",
  };

  const statusLabels = {
    PENDING: { text: "Chờ xử lý", variant: "warning" as const },
    ASSIGNED: { text: "Đã phân công", variant: "info" as const },
    RESCUED: { text: "Đã cứu", variant: "success" as const },
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-l-4 py-3",
        priorityColors[sos.priority]
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                sos.priority === "P1"
                  ? "p1"
                  : sos.priority === "P2"
                  ? "p2"
                  : "p3"
              }
            >
              {sos.priority}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              #{sos.id.split("-")[1]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={statusLabels[sos.status].variant}>
              {statusLabels[sos.status].text}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <p className="text-sm mb-2 line-clamp-2">{sos.message}</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {sos.needs.medical && (
              <Stethoscope className="h-3 w-3 text-red-500" />
            )}
            {sos.needs.food && (
              <UtensilsCrossed className="h-3 w-3 text-orange-500" />
            )}
            {sos.needs.boat && <Anchor className="h-3 w-3 text-blue-500" />}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <TimeElapsed date={sos.createdAt} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
