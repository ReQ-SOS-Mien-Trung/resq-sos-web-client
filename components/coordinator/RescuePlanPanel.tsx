"use client";

import { useState } from "react";
import { RescuePlanPanelProps } from "@/type";
import {
  activityTypeConfig,
  resourceTypeIcons,
  severityConfig,
  priorityLabelMap,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  X,
  Rocket,
  Clock,
  CheckCircle,
  Lightning,
  Path,
  Package,
  Warning,
  Star,
  Info,
  ShieldCheck,
} from "@phosphor-icons/react";

const RescuePlanPanel = ({
  open,
  onOpenChange,
  sosRequest,
  rescueSuggestion,
  onApprove,
}: RescuePlanPanelProps) => {
  const [activeTab, setActiveTab] = useState("plan");

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
      style={{ right: 420 }} // Leave space for SOSDetailsPanel
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

        {/* Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              <div className="px-4 pt-3 border-b shrink-0">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                  <TabsTrigger value="plan" className="gap-2">
                    <Path className="h-4 w-4" />
                    Kế hoạch
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="gap-2">
                    <Package className="h-4 w-4" />
                    Tài nguyên
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-2">
                    <Info className="h-4 w-4" />
                    Ghi chú
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                {/* Plan Tab */}
                <TabsContent value="plan" className="m-0 p-4">
                  <div className="space-y-4">
                    {/* Overall Assessment */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Lightning
                            className="h-4 w-4 text-yellow-500"
                            weight="fill"
                          />
                          Đánh giá tổng quan
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground leading-relaxed">
                        {rescueSuggestion.overallAssessment}
                      </CardContent>
                    </Card>

                    {/* Activity Steps */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">
                        Các hoạt động đề xuất
                      </h3>
                      <div className="space-y-3">
                        {rescueSuggestion.suggestedActivities.map(
                          (activity, index) => {
                            const config =
                              activityTypeConfig[activity.activityType] ||
                              activityTypeConfig["ASSESS"];
                            return (
                              <div
                                key={index}
                                className="flex gap-3 items-start"
                              >
                                <div className="flex flex-col items-center">
                                  <div
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                                      activity.priority === "Critical"
                                        ? "bg-red-500"
                                        : activity.priority === "High"
                                          ? "bg-orange-500"
                                          : "bg-blue-500",
                                    )}
                                  >
                                    {activity.step}
                                  </div>
                                  {index <
                                    rescueSuggestion.suggestedActivities
                                      .length -
                                      1 && (
                                    <div className="w-0.5 h-12 bg-border mt-1" />
                                  )}
                                </div>
                                <Card className="flex-1">
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-xs",
                                          config.color,
                                          config.bgColor,
                                        )}
                                      >
                                        {config.label}
                                      </Badge>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={
                                            activity.priority === "Critical"
                                              ? "p1"
                                              : activity.priority === "High"
                                                ? "p2"
                                                : "p3"
                                          }
                                          className="text-[10px]"
                                        >
                                          {priorityLabelMap[
                                            activity.priority
                                          ] || activity.priority}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {activity.estimatedTime}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-sm leading-relaxed">
                                      {activity.description}
                                    </p>
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {/* Summary Card */}
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-xl font-bold text-emerald-600">
                              {rescueSuggestion.estimatedDuration}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Thời gian ước tính
                            </div>
                          </div>
                          <div>
                            <div className="text-xl font-bold text-blue-600">
                              {rescueSuggestion.suggestedActivities.length}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Hoạt động
                            </div>
                          </div>
                          <div>
                            <div className="text-xl font-bold text-orange-600">
                              {rescueSuggestion.suggestedResources.length}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Tài nguyên cần
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Resources Tab */}
                <TabsContent value="resources" className="m-0 p-4">
                  <div className="space-y-4">
                    {rescueSuggestion.suggestedResources.map(
                      (resource, index) => {
                        const icon = resourceTypeIcons[
                          resource.resourceType
                        ] || <Package className="h-5 w-5" />;
                        return (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div
                                  className={cn(
                                    "p-3 rounded-lg shrink-0",
                                    resource.priority === "Critical"
                                      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                                  )}
                                >
                                  {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-semibold text-sm">
                                      {resource.resourceType}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={
                                          resource.priority === "Critical"
                                            ? "p1"
                                            : "p2"
                                        }
                                        className="text-[10px]"
                                      >
                                        {priorityLabelMap[resource.priority] ||
                                          resource.priority}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        SL: {resource.quantity}
                                      </Badge>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {resource.description}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      },
                    )}
                  </div>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="m-0 p-4">
                  <div className="space-y-4">
                    {/* Special Notes */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Warning
                            className="h-4 w-4 text-orange-500"
                            weight="fill"
                          />
                          Lưu ý đặc biệt
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground leading-relaxed">
                        {rescueSuggestion.specialNotes}
                      </CardContent>
                    </Card>

                    {/* AI Confidence */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ShieldCheck
                            className="h-4 w-4 text-emerald-500"
                            weight="fill"
                          />
                          Độ tin cậy AI
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Điểm tin cậy
                            </span>
                            <span className="text-sm font-bold">
                              {(rescueSuggestion.confidenceScore * 100).toFixed(
                                0,
                              )}
                              %
                            </span>
                          </div>
                          <Progress
                            value={rescueSuggestion.confidenceScore * 100}
                            className="h-2"
                          />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Model: {rescueSuggestion.modelName}</span>
                            <span>
                              Phản hồi:{" "}
                              {(rescueSuggestion.responseTimeMs / 1000).toFixed(
                                1,
                              )}
                              s
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Mission Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Star
                            className="h-4 w-4 text-yellow-500"
                            weight="fill"
                          />
                          Thông tin nhiệm vụ
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Loại nhiệm vụ
                            </span>
                            <Badge variant="outline">
                              {rescueSuggestion.suggestedMissionType}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Mức độ nghiêm trọng
                            </span>
                            <Badge variant={severity.variant}>
                              {severity.label}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Điểm ưu tiên
                            </span>
                            <span className="font-semibold">
                              {rescueSuggestion.suggestedPriorityScore.toFixed(
                                1,
                              )}
                              /10
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Thời gian ước tính
                            </span>
                            <span className="font-semibold">
                              {rescueSuggestion.estimatedDuration}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Số yêu cầu SOS
                            </span>
                            <span className="font-semibold">
                              {rescueSuggestion.sosRequestCount}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>

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
