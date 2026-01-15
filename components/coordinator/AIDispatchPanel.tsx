"use client";

import { useState } from "react";
import {
  AIDispatchDecision,
  SOSCluster,
  Rescuer,
  MissionStep,
} from "@/types/coordinator";
import { getRescuerTypeIcon } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Users,
  Package,
  ArrowRight,
  Sparkles,
  RefreshCw,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AIDispatchPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: SOSCluster | null;
  aiDecision: AIDispatchDecision | null;
  availableRescuers: Rescuer[];
  onApprove: () => void;
  onOverride: (rescuerId: string) => void;
}

export default function AIDispatchPanel({
  open,
  onOpenChange,
  cluster,
  aiDecision,
  availableRescuers,
  onApprove,
  onOverride,
}: AIDispatchPanelProps) {
  const [showOverride, setShowOverride] = useState(false);
  const [selectedRescuerId, setSelectedRescuerId] = useState<string | null>(
    null
  );
  const [isApproving, setIsApproving] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState(true);

  if (!cluster || !aiDecision) return null;

  const handleApprove = async () => {
    setIsApproving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    onApprove();
    setIsApproving(false);
  };

  const handleOverrideConfirm = () => {
    if (selectedRescuerId) {
      onOverride(selectedRescuerId);
      setShowOverride(false);
    }
  };

  const totalEstimatedTime = aiDecision.proposedPlan.reduce(
    (acc, step) => acc + step.estimatedTime,
    0
  );

  return (
    <>
      {/* Main AI Dispatch Sheet */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 overflow-hidden"
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <SheetHeader className="p-6 pb-4 border-b bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-linear-to-br from-blue-500 to-purple-600">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="flex items-center gap-2">
                    AI Dispatch Decision
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                  </SheetTitle>
                  <SheetDescription>
                    Cụm SOS #{cluster.id.split("-")[1]} • {cluster.totalVictims}{" "}
                    nạn nhân
                  </SheetDescription>
                </div>
              </div>

              {/* Confidence Score */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-green-500 to-emerald-500 transition-all"
                    style={{ width: `${aiDecision.confidence}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-green-600">
                  {aiDecision.confidence}% Confidence
                </span>
              </div>
            </SheetHeader>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Situation Analysis */}
                <Card className="border-red-200 dark:border-red-900 py-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      Phân Tích Tình Huống
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm">{aiDecision.situation}</p>
                  </CardContent>
                </Card>

                {/* AI Reasoning */}
                <Card className="border-blue-200 dark:border-blue-900 py-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-blue-600">
                      <Brain className="h-4 w-4" />
                      Lập Luận AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm">{aiDecision.reasoning}</p>
                  </CardContent>
                </Card>

                {/* Recommended Rescuer */}
                <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20 py-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Đội Cứu Hộ Được Đề Xuất
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-background rounded-lg border">
                      <div className="text-3xl">
                        {getRescuerTypeIcon(aiDecision.recommendedRescuer.type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">
                          {aiDecision.recommendedRescuer.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Tải: {aiDecision.recommendedRescuer.currentLoad}/
                          {aiDecision.recommendedRescuer.capacity} •{" "}
                          {aiDecision.recommendedRescuer.capabilities.join(
                            ", "
                          )}
                        </div>
                      </div>
                      <Badge variant="success">Khớp nhất</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Proposed Mission Plan */}
                <Card className="py-4">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Kế Hoạch Nhiệm Vụ
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedSteps(!expandedSteps)}
                      >
                        {expandedSteps ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Tổng thời gian: ~{totalEstimatedTime} phút
                      </span>
                      <span>{aiDecision.proposedPlan.length} bước</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {expandedSteps && (
                      <div className="space-y-3">
                        {aiDecision.proposedPlan.map((step, idx) => (
                          <MissionStepItem
                            key={idx}
                            step={step}
                            isLast={idx === aiDecision.proposedPlan.length - 1}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Alternative Rescuers */}
                {aiDecision.alternativeRescuers.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Lựa chọn thay thế
                    </div>
                    {aiDecision.alternativeRescuers.map((rescuer) => (
                      <div
                        key={rescuer.id}
                        className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30 text-sm"
                      >
                        <span className="text-xl">
                          {getRescuerTypeIcon(rescuer.type)}
                        </span>
                        <span className="flex-1">{rescuer.name}</span>
                        <Badge variant="outline">Thay thế</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            <SheetFooter className="p-4 border-t bg-muted/30">
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowOverride(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ghi đè thủ công
                </Button>
                <Button
                  className="flex-1 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  onClick={handleApprove}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Phê duyệt nhiệm vụ
                    </>
                  )}
                </Button>
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manual Override Dialog */}
      <Dialog open={showOverride} onOpenChange={setShowOverride}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GripVertical className="h-5 w-5" />
              Ghi Đè Thủ Công
            </DialogTitle>
            <DialogDescription>
              Chọn đội cứu hộ khác thay vì đề xuất của AI
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {availableRescuers.map((rescuer) => (
              <div
                key={rescuer.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  selectedRescuerId === rescuer.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                )}
                onClick={() => setSelectedRescuerId(rescuer.id)}
              >
                <div className="text-2xl">
                  {getRescuerTypeIcon(rescuer.type)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{rescuer.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {rescuer.capabilities.join(", ")} • Tải:{" "}
                    {rescuer.currentLoad}/{rescuer.capacity}
                  </div>
                </div>
                {selectedRescuerId === rescuer.id && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverride(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleOverrideConfirm}
              disabled={!selectedRescuerId}
            >
              Xác nhận thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Mission Step Item Component
function MissionStepItem({
  step,
  isLast,
}: {
  step: MissionStep;
  isLast: boolean;
}) {
  const actionIcons = {
    PICKUP_SUPPLIES: <Package className="h-4 w-4" />,
    GO_TO_VICTIM: <Users className="h-4 w-4" />,
    TRANSPORT_TO_SAFETY: <ArrowRight className="h-4 w-4" />,
    RETURN_TO_BASE: <MapPin className="h-4 w-4" />,
  };

  const actionColors = {
    PICKUP_SUPPLIES: "bg-blue-500",
    GO_TO_VICTIM: "bg-red-500",
    TRANSPORT_TO_SAFETY: "bg-green-500",
    RETURN_TO_BASE: "bg-gray-500",
  };

  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white",
            actionColors[step.action]
          )}
        >
          {actionIcons[step.action]}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border my-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">{step.locationName}</div>
          <Badge variant="outline" className="text-xs">
            ~{step.estimatedTime} phút
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{step.details}</p>
      </div>
    </div>
  );
}
