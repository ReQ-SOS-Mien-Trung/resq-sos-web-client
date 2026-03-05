"use client";

import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useMissionSuggestions } from "@/services/sos_cluster/hooks";
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
  MapPin,
  TreeStructure,
  ArrowsClockwise,
  ClockCounterClockwise,
  CircleNotch,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";

const RescuePlanPanel = ({
  open,
  onOpenChange,
  clusterSOSRequests,
  clusterId,
  rescueSuggestion,
  onApprove,
  onReAnalyze,
  isReAnalyzing,
}: RescuePlanPanelProps) => {
  const [expandedSuggestionId, setExpandedSuggestionId] = useState<
    number | null
  >(null);

  // Fetch mission suggestion history for this cluster
  const {
    data: missionData,
    isLoading: isMissionLoading,
    refetch: refetchMissions,
  } = useMissionSuggestions(clusterId ?? 0, {
    enabled: !!clusterId && open,
  });

  // Two modes: "live" (rescueSuggestion present) or "history" (only clusterId, view past analyses)
  const isHistoryMode = !rescueSuggestion && !!clusterId;

  if (!isHistoryMode && (!rescueSuggestion || clusterSOSRequests.length === 0))
    return null;
  if (isHistoryMode && !clusterId) return null;

  const severity = rescueSuggestion
    ? severityConfig[rescueSuggestion.suggestedSeverityLevel] ||
      severityConfig["Medium"]
    : null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1100] transition-all duration-500 ease-out",
        open
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-full pointer-events-none",
      )}
    >
      <div className="h-full bg-background backdrop-blur-sm shadow-2xl flex flex-col">
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
                  {isHistoryMode
                    ? `Kế hoạch cứu hộ — Cụm #${clusterId}`
                    : rescueSuggestion!.suggestedMissionTitle}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  {isHistoryMode ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-5 gap-1"
                    >
                      <ClockCounterClockwise
                        className="h-3 w-3"
                        weight="fill"
                      />
                      Xem lịch sử phân tích
                    </Badge>
                  ) : (
                    <>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 gap-1"
                      >
                        <TreeStructure className="h-3 w-3" weight="fill" />
                        {clusterSOSRequests.length} SOS
                      </Badge>
                      <Badge
                        variant={severity!.variant}
                        className="text-[10px] px-1.5 py-0 h-5"
                      >
                        {severity!.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5"
                      >
                        {rescueSuggestion!.suggestedMissionType}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  onReAnalyze();
                  // Refetch history after a delay to allow new suggestion to be saved
                  setTimeout(() => refetchMissions(), 3000);
                }}
                disabled={isReAnalyzing}
              >
                {isReAnalyzing ? (
                  <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowsClockwise className="h-3.5 w-3.5" />
                )}
                {isReAnalyzing ? "Đang phân tích..." : "Phân tích lại"}
              </Button>
              <Badge
                variant="outline"
                className="text-[10px] gap-1 px-1.5 py-0 h-5"
              >
                <Lightning className="h-3 w-3" weight="fill" />
                {rescueSuggestion?.modelName ?? "AI"}
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

          {/* Quick Stats Bar — only in live mode */}
          {rescueSuggestion && (
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
                  className={cn("rounded-lg p-2 text-center border", stat.bg)}
                >
                  <div
                    className={cn(
                      "text-base font-bold leading-none",
                      stat.color,
                    )}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-5">
            {/* === Live mode content === */}
            {rescueSuggestion && (
              <>
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

                {/* SOS Requests in this cluster */}
                {clusterSOSRequests.length > 0 && (
                  <>
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                        <TreeStructure
                          className="h-3.5 w-3.5 text-violet-500"
                          weight="fill"
                        />
                        Yêu cầu SOS trong cụm
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {clusterSOSRequests.map((sos) => (
                          <div
                            key={sos.id}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                          >
                            <div className="shrink-0 mt-0.5">
                              <MapPin
                                className={cn(
                                  "h-4 w-4",
                                  sos.priority === "P1"
                                    ? "text-red-500"
                                    : sos.priority === "P2"
                                      ? "text-orange-500"
                                      : "text-yellow-500",
                                )}
                                weight="fill"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">
                                  SOS #{sos.id}
                                </span>
                                <Badge
                                  variant={
                                    sos.priority === "P1"
                                      ? "p1"
                                      : sos.priority === "P2"
                                        ? "p2"
                                        : "p3"
                                  }
                                  className="text-[10px] px-1.5 py-0 h-4"
                                >
                                  {sos.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {sos.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                    <Separator />
                  </>
                )}

                {/* Activity Steps */}
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
                    {rescueSuggestion.suggestedActivities.map(
                      (activity, index) => {
                        const config =
                          activityTypeConfig[activity.activityType] ||
                          activityTypeConfig["ASSESS"];
                        const isLast =
                          index ===
                          rescueSuggestion.suggestedActivities.length - 1;

                        return (
                          <div
                            key={index}
                            className="group relative rounded-xl border bg-card hover:bg-accent/30 transition-colors duration-150"
                          >
                            <div className="flex items-start gap-3 p-3.5">
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
                                {!isLast && (
                                  <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-[calc(100%+0.625rem)] bg-border" />
                                )}
                              </div>
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
                              {!isLast && (
                                <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </section>

                <Separator />

                {/* Resources */}
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
                    {rescueSuggestion.suggestedResources.map(
                      (resource, index) => {
                        const icon = resourceTypeIcons[
                          resource.resourceType
                        ] || <Package className="h-5 w-5" />;
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
                      },
                    )}
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
                      <span className="text-xs font-semibold">
                        Độ tin cậy AI
                      </span>
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

                <Separator />
              </>
            )}

            {/* Mission Suggestion History — shown in both modes */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                <ClockCounterClockwise
                  className="h-3.5 w-3.5 text-indigo-500"
                  weight="fill"
                />
                Lịch sử phân tích AI
              </h3>
              {isMissionLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : missionData && missionData.totalSuggestions > 0 ? (
                <div className="space-y-2">
                  {missionData.missionSuggestions.map((suggestion) => {
                    const isExpanded = expandedSuggestionId === suggestion.id;
                    return (
                      <Card
                        key={suggestion.id}
                        className={cn(
                          "overflow-hidden border transition-all duration-200",
                          isExpanded
                            ? "shadow-md ring-1 ring-primary/20"
                            : "hover:shadow-md",
                        )}
                      >
                        <CardContent className="p-0">
                          {/* Clickable header */}
                          <button
                            className="w-full p-3 text-left hover:bg-accent/30 transition-colors"
                            onClick={() =>
                              setExpandedSuggestionId(
                                isExpanded ? null : suggestion.id,
                              )
                            }
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold truncate">
                                    {suggestion.suggestedMissionTitle}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                                  >
                                    {suggestion.analysisType}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Lightning className="h-3 w-3" />
                                    {suggestion.modelName}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <ShieldCheck className="h-3 w-3" />
                                    {(suggestion.confidenceScore * 100).toFixed(
                                      0,
                                    )}
                                    %
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(
                                      suggestion.createdAt,
                                    ).toLocaleString("vi-VN", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                {!isExpanded &&
                                  suggestion.activities.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                      {suggestion.activities.map((act) => (
                                        <Badge
                                          key={act.id}
                                          variant="secondary"
                                          className="text-[10px] px-1.5 py-0 h-4"
                                        >
                                          {
                                            (
                                              activityTypeConfig[
                                                act.activityType
                                              ] || activityTypeConfig["ASSESS"]
                                            ).label
                                          }
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                              </div>
                              <div className="flex items-start gap-2 shrink-0">
                                <div className="text-right">
                                  <span className="text-lg font-bold text-primary">
                                    {suggestion.suggestedPriorityScore.toFixed(
                                      1,
                                    )}
                                  </span>
                                  <p className="text-[10px] text-muted-foreground">
                                    Ưu tiên
                                  </p>
                                </div>
                                {isExpanded ? (
                                  <CaretUp className="h-4 w-4 text-muted-foreground mt-1" />
                                ) : (
                                  <CaretDown className="h-4 w-4 text-muted-foreground mt-1" />
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Expandable detail */}
                          {isExpanded && (
                            <div className="border-t px-3 pb-3 pt-2 space-y-3 bg-muted/20">
                              {/* Quick stats */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-lg p-2 text-center border bg-blue-500/5 border-blue-500/15">
                                  <div className="text-sm font-bold text-blue-500">
                                    {suggestion.suggestedPriorityScore.toFixed(
                                      1,
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Ưu tiên
                                  </div>
                                </div>
                                <div className="rounded-lg p-2 text-center border bg-emerald-500/5 border-emerald-500/15">
                                  <div className="text-sm font-bold text-emerald-500">
                                    {(suggestion.confidenceScore * 100).toFixed(
                                      0,
                                    )}
                                    %
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Độ tin cậy
                                  </div>
                                </div>
                                <div className="rounded-lg p-2 text-center border bg-orange-500/5 border-orange-500/15">
                                  <div className="text-sm font-bold text-orange-500">
                                    {suggestion.activities.reduce(
                                      (sum, a) =>
                                        sum + a.suggestedActivities.length,
                                      0,
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Bước thực hiện
                                  </div>
                                </div>
                              </div>

                              {/* Activity phases */}
                              {suggestion.activities.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                                    <ListChecks
                                      className="h-3.5 w-3.5"
                                      weight="bold"
                                    />
                                    Kế hoạch thực hiện
                                  </h4>
                                  <div className="space-y-2">
                                    {suggestion.activities.map((actGroup) => {
                                      const config =
                                        activityTypeConfig[
                                          actGroup.activityType
                                        ] || activityTypeConfig["ASSESS"];
                                      return (
                                        <div
                                          key={actGroup.id}
                                          className="rounded-lg border bg-card"
                                        >
                                          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
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
                                            <span className="text-[11px] text-muted-foreground">
                                              {actGroup.suggestionPhase}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/60 ml-auto flex items-center gap-1">
                                              <ShieldCheck className="h-3 w-3" />
                                              {(
                                                actGroup.confidenceScore * 100
                                              ).toFixed(0)}
                                              %
                                            </span>
                                          </div>
                                          <div className="p-2 space-y-1.5">
                                            {actGroup.suggestedActivities.map(
                                              (step, idx) => (
                                                <div
                                                  key={idx}
                                                  className="flex items-start gap-2 px-1"
                                                >
                                                  <div
                                                    className={cn(
                                                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                                                      config.bgColor,
                                                      config.color,
                                                    )}
                                                  >
                                                    {step.step}
                                                  </div>
                                                  <div className="min-w-0 flex-1">
                                                    <p className="text-xs leading-relaxed text-foreground/80">
                                                      {step.description}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {step.estimatedTime}
                                                      </span>
                                                      {step.priority && (
                                                        <Badge
                                                          variant="outline"
                                                          className="text-[9px] px-1 py-0 h-3.5"
                                                        >
                                                          {step.priority}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Metadata footer */}
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-dashed">
                                <span>Model: {suggestion.modelName}</span>
                                <span>
                                  {new Date(
                                    suggestion.createdAt,
                                  ).toLocaleString("vi-VN", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <ClockCounterClockwise className="h-8 w-8 mx-auto text-muted-foreground/30 mb-1" />
                  <p className="text-xs text-muted-foreground">
                    Chưa có lịch sử phân tích
                  </p>
                </div>
              )}
            </section>
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
              {isHistoryMode ? "Đóng" : "Huỷ bỏ"}
            </Button>
            {rescueSuggestion && (
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
                onClick={onApprove}
              >
                <CheckCircle className="h-5 w-5 mr-2" weight="fill" />
                Phê duyệt & Gửi nhiệm vụ
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RescuePlanPanel;
