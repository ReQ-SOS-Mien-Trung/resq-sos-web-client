"use client";

import { useState, useEffect } from "react";
import { SOSDetailsPanelProps } from "@/type";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Clock,
  Stethoscope,
  ForkKnife,
  Anchor,
  Lightning,
  X,
  Rocket,
} from "@phosphor-icons/react";

// Panel width
const PANEL_WIDTH = 420;

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

const SOSDetailsPanel = ({
  open,
  onOpenChange,
  sosRequest,
  onProcessSOS,
  isProcessing = false,
}: SOSDetailsPanelProps) => {
  if (!sosRequest && !open) return null;

  const priorityColors = {
    P1: "bg-red-500",
    P2: "bg-orange-500",
    P3: "bg-yellow-500",
  };

  const statusLabels = {
    PENDING: { text: "Chờ xử lý", variant: "warning" as const },
    ASSIGNED: { text: "Đã phân công", variant: "info" as const },
    RESCUED: { text: "Đã cứu", variant: "success" as const },
  };

  // Handle case when sosRequest is null but panel is open (during close animation)
  if (!sosRequest) {
    return (
      <div
        className={cn(
          "absolute top-0 right-0 h-full z-[1000] transition-all duration-300 ease-in-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        style={{ width: PANEL_WIDTH }}
      />
    );
  }

  // Get risk factors from AI analysis
  const riskFactors = sosRequest.aiAnalysis?.riskFactors || [];

  return (
    <div
      className={cn(
        "absolute top-0 right-0 h-full z-[1000] transition-all duration-300 ease-in-out",
        open
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-full pointer-events-none",
      )}
      style={{ width: PANEL_WIDTH }}
    >
      <div className="h-full bg-background border-l shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full animate-pulse",
                    priorityColors[sosRequest.priority],
                  )}
                />
                SOS #{sosRequest.id}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Chi tiết yêu cầu cứu hộ
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  sosRequest.priority === "P1"
                    ? "p1"
                    : sosRequest.priority === "P2"
                      ? "p2"
                      : "p3"
                }
                className="text-sm px-3"
              >
                {sosRequest.priority}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-muted rounded-lg p-3 text-center">
              <Badge variant={statusLabels[sosRequest.status].variant}>
                {statusLabels[sosRequest.status].text}
              </Badge>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <MapPin className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">Vị trí</div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                <TimeElapsed date={sosRequest.createdAt} />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Message */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Nội dung cầu cứu</h4>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm">{sosRequest.message}</p>
              </div>
            </div>

            {/* Required Resources */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Yêu cầu hỗ trợ</h4>
              <div className="flex flex-wrap gap-2">
                {sosRequest.needs.medical && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                    <Stethoscope className="h-4 w-4" weight="fill" />
                    <span className="text-sm font-medium">Y tế khẩn cấp</span>
                  </div>
                )}
                {sosRequest.needs.boat && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                    <Anchor className="h-4 w-4" weight="fill" />
                    <span className="text-sm font-medium">Cần thuyền</span>
                  </div>
                )}
                {sosRequest.needs.food && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg">
                    <ForkKnife className="h-4 w-4" weight="fill" />
                    <span className="text-sm font-medium">Cần thực phẩm</span>
                  </div>
                )}
                {!sosRequest.needs.medical &&
                  !sosRequest.needs.boat &&
                  !sosRequest.needs.food && (
                    <div className="text-sm text-muted-foreground">
                      Không có yêu cầu cụ thể
                    </div>
                  )}
              </div>
            </div>

            {/* AI Risk Analysis */}
            {riskFactors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Lightning
                    className="h-4 w-4 text-yellow-500"
                    weight="fill"
                  />
                  Phân tích AI
                </h4>
                <div className="flex flex-wrap gap-2">
                  {riskFactors.map((factor, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Location Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Vị trí
              </h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Lat: {sosRequest.location.lat.toFixed(6)}</div>
                <div>Lng: {sosRequest.location.lng.toFixed(6)}</div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t shrink-0">
          <Button
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            size="lg"
            onClick={onProcessSOS}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                AI đang phân tích...
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5 mr-2" weight="fill" />
                Lên kế hoạch giải cứu
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SOSDetailsPanel;
