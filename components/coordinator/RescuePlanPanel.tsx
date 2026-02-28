"use client";

import { RescuePlanPanelProps } from "@/type";
import {
  activityTypeConfig,
  resourceTypeIcons,
  severityConfig,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Rocket,
  Clock,
  CheckCircle,
  Lightning,
  Package,
  Warning,
  ShieldCheck,
} from "@phosphor-icons/react";

const RescuePlanPanel = ({
  open,
  onOpenChange,
  sosRequest,
  rescueSuggestion,
  onApprove,
}: RescuePlanPanelProps) => {
  if (!sosRequest || !rescueSuggestion) return null;

  const severity =
    severityConfig[rescueSuggestion.suggestedSeverityLevel] ||
    severityConfig["Medium"];

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1100] transition-all duration-500 ease-out",
        open
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-full pointer-events-none",
      )}
      style={{ right: 420 }}
    >
      <div className="h-full bg-background/98 backdrop-blur-sm border-t border-r shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b shrink-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Rocket
                  className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                  weight="fill"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">
                  {rescueSuggestion.suggestedMissionTitle}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-muted-foreground">
                    SOS #{sosRequest.id}
                  </p>
                  <Badge variant={severity.variant} className="text-xs">
                    {severity.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {rescueSuggestion.suggestedMissionType}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                <Lightning className="h-3 w-3" weight="fill" />
                {rescueSuggestion.modelName}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="bg-background/80 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-red-500">
                {rescueSuggestion.suggestedPriorityScore.toFixed(1)}
              </div>
              <div className="text-[10px] text-muted-foreground">Ưu tiên</div>
            </div>
            <div className="bg-background/80 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-blue-500">
                {rescueSuggestion.sosRequestCount}
              </div>
              <div className="text-[10px] text-muted-foreground">SOS</div>
            </div>
            <div className="bg-background/80 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-emerald-500">
                {(rescueSuggestion.confidenceScore * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                Độ tin cậy
              </div>
            </div>
            <div className="bg-background/80 rounded-lg p-2.5 text-center">
              <div className="text-lg font-bold text-orange-500">
                {(rescueSuggestion.responseTimeMs / 1000).toFixed(1)}s
              </div>
              <div className="text-[10px] text-muted-foreground">
                Thời gian AI
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content - single layout, no tabs */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-5">
            {/* Overall Assessment */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Lightning
                  className="h-4 w-4 text-yellow-500"
                  weight="fill"
                />
                Đánh giá tổng quan
              </h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {rescueSuggestion.overallAssessment}
                </p>
              </div>
            </div>

            <Separator />

            {/* Activity Steps */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Các bước thực hiện
              </h3>
              <div className="space-y-0">
                {rescueSuggestion.suggestedActivities.map(
                  (activity, index) => {
                    const config =
                      activityTypeConfig[activity.activityType] ||
                      activityTypeConfig["ASSESS"];
                    return (
                      <div key={index} className="flex gap-3 items-stretch">
                        {/* Timeline */}
                        <div className="flex flex-col items-center w-8 shrink-0">
                          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            {activity.step}
                          </div>
                          {index <
                            rescueSuggestion.suggestedActivities.length -
                              1 && (
                            <div className="w-px flex-1 bg-border" />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px] px-2 py-0",
                                config.color,
                                config.bgColor,
                              )}
                            >
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {activity.estimatedTime}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {activity.description}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            <Separator />

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Package className="h-4 w-4" />
                Tài nguyên cần thiết
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {rescueSuggestion.suggestedResources.length} loại
                </Badge>
              </h3>
              <div className="grid gap-2">
                {rescueSuggestion.suggestedResources.map(
                  (resource, index) => {
                    const icon = resourceTypeIcons[
                      resource.resourceType
                    ] || <Package className="h-5 w-5" />;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="p-2 rounded-lg shrink-0 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {resource.resourceType}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {resource.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          x{resource.quantity}
                        </Badge>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            <Separator />

            {/* Special Notes */}
            {rescueSuggestion.specialNotes && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Warning
                    className="h-4 w-4 text-orange-500"
                    weight="fill"
                  />
                  Lưu ý đặc biệt
                </h3>
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {rescueSuggestion.specialNotes}
                  </p>
                </div>
              </div>
            )}

            {/* AI Confidence Footer */}
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck
                    className="h-4 w-4 text-emerald-500"
                    weight="fill"
                  />
                  <span className="text-xs font-semibold">Độ tin cậy AI</span>
                  <span className="text-xs font-bold ml-auto">
                    {(rescueSuggestion.confidenceScore * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={rescueSuggestion.confidenceScore * 100}
                  className="h-1.5"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                  <span>Model: {rescueSuggestion.modelName}</span>
                  <span>
                    Phản hồi:{" "}
                    {(rescueSuggestion.responseTimeMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t shrink-0 bg-background">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Huỷ bỏ
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              onClick={onApprove}
            >
              <CheckCircle className="h-5 w-5 mr-2" weight="fill" />
              Phê duyệt & Gửi nhiệm vụ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RescuePlanPanel;
