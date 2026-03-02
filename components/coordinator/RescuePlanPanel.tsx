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
  ArrowRight,
  ListChecks,
  Cube,
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
        <div className="p-4 pb-3 border-b shrink-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shadow-sm">
                <Rocket
                  className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                  weight="fill"
                />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">
                  {rescueSuggestion.suggestedMissionTitle}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                    SOS #{sosRequest.id}
                  </Badge>
                  <Badge variant={severity.variant} className="text-[10px] px-1.5 py-0 h-5">
                    {severity.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                    {rescueSuggestion.suggestedMissionType}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5">
                <Lightning className="h-3 w-3" weight="fill" />
                {rescueSuggestion.modelName}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              {
                value: rescueSuggestion.suggestedPriorityScore.toFixed(1),
                label: "Ưu tiên",
                color: "text-red-500",
                bg: "bg-red-500/5 border-red-500/15",
              },
              {
                value: rescueSuggestion.sosRequestCount,
                label: "Yêu cầu SOS",
                color: "text-blue-500",
                bg: "bg-blue-500/5 border-blue-500/15",
              },
              {
                value: `${(rescueSuggestion.confidenceScore * 100).toFixed(0)}%`,
                label: "Độ tin cậy",
                color: "text-emerald-500",
                bg: "bg-emerald-500/5 border-emerald-500/15",
              },
              {
                value: `${(rescueSuggestion.responseTimeMs / 1000).toFixed(1)}s`,
                label: "Thời gian AI",
                color: "text-orange-500",
                bg: "bg-orange-500/5 border-orange-500/15",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "rounded-lg p-2 text-center border",
                  stat.bg,
                )}
              >
                <div className={cn("text-base font-bold leading-none", stat.color)}>
                  {stat.value}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-5">
            {/* Overall Assessment */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                <Lightning
                  className="h-3.5 w-3.5 text-yellow-500"
                  weight="fill"
                />
                Đánh giá tổng quan
              </h3>
              <div className="bg-muted/40 rounded-xl p-3.5 border border-border/50">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {rescueSuggestion.overallAssessment}
                </p>
              </div>
            </section>

            <Separator />

            {/* Activity Steps — redesigned as cards with clear numbering */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ListChecks className="h-3.5 w-3.5" weight="bold" />
                  Kế hoạch thực hiện
                </h3>
                <Badge variant="secondary" className="text-[10px] h-5 px-2">
                  {rescueSuggestion.suggestedActivities.length} bước
                </Badge>
              </div>

              <div className="space-y-2.5">
                {rescueSuggestion.suggestedActivities.map((activity, index) => {
                  const config =
                    activityTypeConfig[activity.activityType] ||
                    activityTypeConfig["ASSESS"];
                  const isLast =
                    index === rescueSuggestion.suggestedActivities.length - 1;

                  return (
                    <div
                      key={index}
                      className="group relative rounded-xl border bg-card hover:bg-accent/30 transition-colors duration-150"
                    >
                      <div className="flex items-start gap-3 p-3.5">
                        {/* Step number circle */}
                        <div className="relative shrink-0">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-offset-2 ring-offset-card",
                              config.bgColor,
                              config.color,
                              config.color.includes("blue")
                                ? "ring-blue-400/40"
                                : config.color.includes("red")
                                  ? "ring-red-400/40"
                                  : config.color.includes("emerald")
                                    ? "ring-emerald-400/40"
                                    : "ring-orange-400/40",
                            )}
                          >
                            {activity.step}
                          </div>
                          {/* Connector line */}
                          {!isLast && (
                            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-[calc(100%+0.625rem)] bg-border" />
                          )}
                        </div>

                        {/* Step content */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px] font-semibold px-2 py-0 h-5",
                                config.color,
                                config.bgColor,
                                "border-transparent",
                              )}
                            >
                              {config.label}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/60 px-1.5 py-0.5 rounded-md">
                              <Clock className="h-3 w-3" />
                              {activity.estimatedTime}
                            </span>
                            {activity.priority && (
                              <span className="text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                                {activity.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/75">
                            {activity.description}
                          </p>
                        </div>

                        {/* Arrow indicator */}
                        {!isLast && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* Resources — redesigned as a grid */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Cube className="h-3.5 w-3.5" weight="bold" />
                  Tài nguyên cần thiết
                </h3>
                <Badge variant="secondary" className="text-[10px] h-5 px-2">
                  {rescueSuggestion.suggestedResources.length} loại
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {rescueSuggestion.suggestedResources.map((resource, index) => {
                  const icon =
                    resourceTypeIcons[resource.resourceType] || (
                      <Package className="h-5 w-5" />
                    );
                  return (
                    <Card
                      key={index}
                      className="overflow-hidden border hover:shadow-md transition-shadow duration-150"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-lg shrink-0 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                            {icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-sm font-semibold truncate">
                                {resource.resourceType}
                              </span>
                              <span className="text-base font-bold text-primary shrink-0">
                                x{resource.quantity}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                              {resource.description}
                            </p>
                            {resource.priority && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 px-1.5 mt-1.5"
                              >
                                {resource.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* Special Notes */}
            {rescueSuggestion.specialNotes && (
              <>
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                    <Warning
                      className="h-3.5 w-3.5 text-orange-500"
                      weight="fill"
                    />
                    Lưu ý đặc biệt
                  </h3>
                  <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-xl p-3.5">
                    <p className="text-sm text-foreground/75 leading-relaxed">
                      {rescueSuggestion.specialNotes}
                    </p>
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* AI Confidence Footer */}
            <Card className="bg-muted/30 border-dashed">
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
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
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
