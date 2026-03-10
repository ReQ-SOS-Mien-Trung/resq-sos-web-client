"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { RescuePlanPanelProps } from "@/type";
import {
  activityTypeConfig,
  resourceTypeIcons,
  severityConfig,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateMission } from "@/services/mission/hooks";
import { useMissionSuggestions } from "@/services/sos_cluster/hooks";
import {
  ClusterSuggestedActivity,
  ClusterActivityType,
  MissionSuggestionEntity,
} from "@/services/sos_cluster/type";
import { useSOSRequestAnalysis } from "@/services/sos_request/hooks";
import { SOSRequest } from "@/type";
import {
  X,
  Rocket,
  Clock,
  CheckCircle,
  Lightning,
  Package,
  Warning,
  ShieldCheck,
  ListChecks,
  Cube,
  MapPin,
  TreeStructure,
  ArrowsClockwise,
  ClockCounterClockwise,
  CircleNotch,
  CaretDown,
  CaretUp,
  Storefront,
  Info,
  PencilSimpleLine,
  Trash,
  Plus,
  FloppyDisk,
  DotsSixVertical,
} from "@phosphor-icons/react";

const SOSRequestSidebarCard = ({ sos }: { sos: SOSRequest }) => {
  const {
    data: analysisData,
    isLoading,
    isError,
    error,
  } = useSOSRequestAnalysis(Number(sos.id), {
    enabled: !!sos.id && !isNaN(Number(sos.id)),
  });

  const ruleScore = analysisData?.ruleEvaluation?.totalScore;

  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 bg-card",
        sos.priority === "P1"
          ? "border-red-200 dark:border-red-800/40"
          : sos.priority === "P2"
            ? "border-orange-200 dark:border-orange-800/40"
            : "border-border",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <MapPin
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            sos.priority === "P1"
              ? "text-red-500"
              : sos.priority === "P2"
                ? "text-orange-500"
                : "text-yellow-500",
          )}
          weight="fill"
        />
        <span className="text-xs font-bold truncate">SOS #{sos.id}</span>

        {isLoading && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 h-3.5 ml-1 animate-pulse border-blue-200 bg-blue-50 text-blue-600"
          >
            Đang tải điểm...
          </Badge>
        )}

        {isError && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 h-3.5 ml-1 border-red-200 bg-red-50 text-red-600"
            title={error?.message}
          >
            Lỗi tải
          </Badge>
        )}

        {ruleScore !== undefined && !isLoading && !isError && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 h-3.5 ml-1 border-primary/20 bg-primary/5 text-primary"
          >
            Điểm: {ruleScore.toFixed(1)}
          </Badge>
        )}
        <Badge
          variant={
            sos.priority === "P1" ? "p1" : sos.priority === "P2" ? "p2" : "p3"
          }
          className="text-[9px] px-1 h-3.5 ml-auto shrink-0"
        >
          {sos.priority}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
        {sos.message}
      </p>
    </div>
  );
};

const SOSGroupHeader = ({
  matchedSOS,
  groupActivitiesLength,
}: {
  matchedSOS: SOSRequest;
  groupActivitiesLength: number;
}) => {
  const {
    data: analysisData,
    isLoading,
    isError,
  } = useSOSRequestAnalysis(Number(matchedSOS.id), {
    enabled: !!matchedSOS.id && !isNaN(Number(matchedSOS.id)),
  });
  const ruleScore = analysisData?.ruleEvaluation?.totalScore;

  return (
    <>
      <div
        className={cn(
          "p-1.5 rounded-lg",
          matchedSOS.priority === "P1"
            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
            : matchedSOS.priority === "P2"
              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
        )}
      >
        <MapPin className="h-4 w-4" weight="fill" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate">SOS #{matchedSOS.id}</p>
          {isLoading && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 h-4 animate-pulse"
            >
              ...
            </Badge>
          )}
          {ruleScore !== undefined && !isLoading && !isError && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 h-4 border-primary/20 bg-primary/5 text-primary"
            >
              Điểm: {ruleScore.toFixed(1)}
            </Badge>
          )}
          <Badge
            variant={
              matchedSOS.priority === "P1"
                ? "p1"
                : matchedSOS.priority === "P2"
                  ? "p2"
                  : "p3"
            }
            className="text-[10px] px-1.5 h-4"
          >
            {matchedSOS.priority}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
          {matchedSOS.message}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
        {groupActivitiesLength} bước
      </Badge>
    </>
  );
};

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

  // ── Custom resizable split ──
  const [splitPercent, setSplitPercent] = useState(55); // left panel %
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;
      // Clamp between 30% and 80%
      setSplitPercent(Math.min(80, Math.max(30, pct)));
    };
    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ── Edit mode state ──
  const [isEditMode, setIsEditMode] = useState(false);

  type EditableActivity = ClusterSuggestedActivity & { _id: string };
  const [editActivities, setEditActivities] = useState<EditableActivity[]>([]);
  const [editMissionType, setEditMissionType] = useState<"RESCUE" | "RESCUER">(
    "RESCUE",
  );
  const [editPriorityScore, setEditPriorityScore] = useState(5);
  const [editStartTime, setEditStartTime] = useState("");
  const [editExpectedEndTime, setEditExpectedEndTime] = useState("");

  const { mutate: createMission, isPending: isCreatingMission } =
    useCreateMission();

  const enterEditMode = useCallback(() => {
    if (!rescueSuggestion) return;
    setEditActivities(
      rescueSuggestion.suggestedActivities.map((a, i) => ({
        ...a,
        _id: `edit-${i}-${Date.now()}`,
      })),
    );
    setEditPriorityScore(rescueSuggestion.suggestedPriorityScore || 5);
    const now = new Date();
    setEditStartTime(now.toISOString().slice(0, 16));
    const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    setEditExpectedEndTime(end.toISOString().slice(0, 16));
    setIsEditMode(true);
  }, [rescueSuggestion]);

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setEditActivities([]);
  }, []);

  const updateEditActivity = useCallback(
    (id: string, field: string, value: string | number | null) => {
      setEditActivities((prev) =>
        prev.map((a) => (a._id === id ? { ...a, [field]: value } : a)),
      );
    },
    [],
  );

  const removeEditActivity = useCallback((id: string) => {
    setEditActivities((prev) => prev.filter((a) => a._id !== id));
  }, []);

  const addEditActivity = useCallback(() => {
    const newAct: EditableActivity = {
      _id: `edit-new-${Date.now()}`,
      step: editActivities.length + 1,
      activityType: "ASSESS" as ClusterActivityType,
      description: "",
      priority: "Medium",
      estimatedTime: "30 phút",
      sosRequestId: null,
      depotId: null,
      depotName: null,
      depotAddress: null,
      suppliesToCollect: null,
    };
    setEditActivities((prev) => [...prev, newAct]);
  }, [editActivities.length]);

  const moveEditActivity = useCallback((idx: number, dir: -1 | 1) => {
    setEditActivities((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const handleSubmitEdit = useCallback(() => {
    if (!clusterId) return;
    if (editActivities.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 hoạt động");
      return;
    }
    for (let i = 0; i < editActivities.length; i++) {
      if (!editActivities[i].description.trim()) {
        toast.error(`Bước ${i + 1}: Vui lòng nhập mô tả`);
        return;
      }
    }
    if (!editStartTime || !editExpectedEndTime) {
      toast.error("Vui lòng chọn thời gian bắt đầu và kết thúc");
      return;
    }

    const sos = clusterSOSRequests[0];
    createMission(
      {
        clusterId,
        missionType: editMissionType,
        priorityScore: editPriorityScore,
        startTime: new Date(editStartTime).toISOString(),
        expectedEndTime: new Date(editExpectedEndTime).toISOString(),
        activities: editActivities.map((a, i) => ({
          step: i + 1,
          activityCode: `${a.activityType}_${i + 1}`,
          activityType: a.activityType,
          description: a.description,
          target: a.depotName || `SOS #${a.sosRequestId || "general"}`,
          items: a.suppliesToCollect
            ? a.suppliesToCollect
                .map((s) => `${s.itemName} x${s.quantity}`)
                .join(", ")
            : "",
          targetLatitude: sos?.location?.lat ?? 0,
          targetLongitude: sos?.location?.lng ?? 0,
        })),
      },
      {
        onSuccess: () => {
          toast.success("Đã tạo nhiệm vụ từ kế hoạch chỉnh sửa!");
          exitEditMode();
          onApprove();
        },
        onError: (error) => {
          console.error("Failed to create mission:", error);
          toast.error("Không thể tạo nhiệm vụ. Vui lòng thử lại.");
        },
      },
    );
  }, [
    clusterId,
    editActivities,
    editMissionType,
    editPriorityScore,
    editStartTime,
    editExpectedEndTime,
    clusterSOSRequests,
    createMission,
    exitEditMode,
    onApprove,
  ]);

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

  // Derive the latest suggestion from mission history (sorted by createdAt desc)
  const latestSuggestion: MissionSuggestionEntity | null = useMemo(() => {
    if (rescueSuggestion) return null; // live mode takes priority
    if (!missionData || missionData.missionSuggestions.length === 0)
      return null;
    const sorted = [...missionData.missionSuggestions].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return sorted[0];
  }, [rescueSuggestion, missionData]);

  // Flatten activities from the latest history suggestion
  const latestActivities: ClusterSuggestedActivity[] = useMemo(() => {
    if (!latestSuggestion) return [];
    return latestSuggestion.activities.flatMap((g) => g.suggestedActivities);
  }, [latestSuggestion]);

  const hasSidebar = !!(rescueSuggestion || latestSuggestion);

  const severity = rescueSuggestion
    ? severityConfig[rescueSuggestion.suggestedSeverityLevel] ||
      severityConfig["Medium"]
    : null;

  // Group activities by SOS request or depot
  type ActivityGroup = {
    type: "sos" | "depot" | "general";
    sosRequestId?: number | null;
    depotId?: number | null;
    depotName?: string | null;
    depotAddress?: string | null;
    activities: ClusterSuggestedActivity[];
  };

  const activityGroups: ActivityGroup[] = useMemo(() => {
    const sourceActivities = rescueSuggestion
      ? rescueSuggestion.suggestedActivities
      : latestActivities;
    if (sourceActivities.length === 0) return [];
    const groups: ActivityGroup[] = [];
    for (const act of sourceActivities) {
      const isDepot = act.activityType === "COLLECT_SUPPLIES" && act.depotId;
      const key = isDepot
        ? `depot-${act.depotId}`
        : `sos-${act.sosRequestId ?? "general"}`;
      const last = groups[groups.length - 1];
      const lastKey = last
        ? last.type === "depot"
          ? `depot-${last.depotId}`
          : `sos-${last.sosRequestId ?? "general"}`
        : null;
      if (lastKey === key) {
        last.activities.push(act);
      } else {
        groups.push({
          type: isDepot ? "depot" : act.sosRequestId ? "sos" : "general",
          sosRequestId: act.sosRequestId,
          depotId: act.depotId,
          depotName: act.depotName,
          depotAddress: act.depotAddress,
          activities: [act],
        });
      }
    }
    return groups;
  }, [rescueSuggestion, latestActivities]);

  // Early returns AFTER all hooks
  if (!isHistoryMode && (!rescueSuggestion || clusterSOSRequests.length === 0))
    return null;
  if (isHistoryMode && !clusterId) return null;

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
                  {rescueSuggestion
                    ? rescueSuggestion.suggestedMissionTitle
                    : latestSuggestion
                      ? latestSuggestion.suggestedMissionTitle
                      : `Kế hoạch cứu hộ — Cụm #${clusterId}`}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  {rescueSuggestion ? (
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
                        {rescueSuggestion.suggestedMissionType}
                      </Badge>
                    </>
                  ) : latestSuggestion ? (
                    <>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 gap-1"
                      >
                        <Lightning className="h-3 w-3" weight="fill" />
                        {latestSuggestion.modelName}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 gap-1"
                      >
                        <ShieldCheck className="h-3 w-3" weight="fill" />
                        {(
                          (latestSuggestion.confidenceScore || 0) * 100
                        ).toFixed(0)}
                        %
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 gap-1 text-muted-foreground"
                      >
                        <Clock className="h-3 w-3" />
                        {new Date(latestSuggestion.createdAt).toLocaleString(
                          "vi-VN",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </Badge>
                    </>
                  ) : (
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
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {rescueSuggestion && !isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                  onClick={enterEditMode}
                >
                  <PencilSimpleLine className="h-3.5 w-3.5" />
                  Chỉnh sửa kế hoạch
                </Button>
              )}
              {isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={exitEditMode}
                >
                  <X className="h-3.5 w-3.5" />
                  Thoát chỉnh sửa
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  onReAnalyze();
                  // Refetch history after a delay to allow new suggestion to be saved
                  setTimeout(() => refetchMissions(), 3000);
                }}
                disabled={isReAnalyzing || isEditMode}
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
                {rescueSuggestion?.modelName ??
                  latestSuggestion?.modelName ??
                  "AI"}
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
          {(rescueSuggestion || latestSuggestion) && (
            <div
              className={cn(
                "grid gap-2 mt-3",
                rescueSuggestion ? "grid-cols-4" : "grid-cols-3",
              )}
            >
              {[
                {
                  value: (
                    rescueSuggestion?.suggestedPriorityScore ??
                    latestSuggestion?.suggestedPriorityScore ??
                    0
                  ).toFixed(1),
                  label: "Ưu tiên",
                  color: "text-red-500",
                  bg: "bg-red-500/5 border-red-500/15",
                  show: true,
                },
                {
                  value:
                    rescueSuggestion?.sosRequestCount ??
                    clusterSOSRequests.length,
                  label: "Yêu cầu SOS",
                  color: "text-blue-500",
                  bg: "bg-blue-500/5 border-blue-500/15",
                  show: true,
                },
                {
                  value: `${((rescueSuggestion?.confidenceScore ?? latestSuggestion?.confidenceScore ?? 0) * 100).toFixed(0)}%`,
                  label: "Độ tin cậy",
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/5 border-emerald-500/15",
                  show: true,
                },
                {
                  value: `${((rescueSuggestion?.responseTimeMs || 0) / 1000).toFixed(1)}s`,
                  label: "Thời gian AI",
                  color: "text-orange-500",
                  bg: "bg-orange-500/5 border-orange-500/15",
                  show: !!rescueSuggestion,
                },
              ]
                .filter((s) => s.show)
                .map((stat) => (
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

        {/* Two-column content */}
        <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden flex">
          {/* LEFT COLUMN — Plan steps */}
          <div
            className="h-full overflow-hidden"
            style={{ width: hasSidebar ? `${splitPercent}%` : "100%" }}
          >
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* === Edit mode content === */}
                {isEditMode && rescueSuggestion && (
                  <>
                    {/* Edit mode banner */}
                    <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <PencilSimpleLine
                          className="h-4 w-4 text-amber-600"
                          weight="fill"
                        />
                        <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                          Chế độ chỉnh sửa kế hoạch
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70">
                        Chỉnh sửa các bước, sau đó nhấn &quot;Xác nhận &amp; Tạo
                        nhiệm vụ&quot; để gửi kế hoạch đã chỉnh sửa.
                      </p>
                    </div>

                    {/* Mission config */}
                    <section className="rounded-xl border bg-card p-4 space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Rocket className="h-3.5 w-3.5" weight="fill" />
                        Cấu hình nhiệm vụ
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Loại nhiệm vụ
                          </Label>
                          <Select
                            value={editMissionType}
                            onValueChange={(v) =>
                              setEditMissionType(v as "RESCUE" | "RESCUER")
                            }
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[1200]">
                              <SelectItem value="RESCUE">Cứu hộ</SelectItem>
                              <SelectItem value="RESCUER">
                                Cứu hộ viên
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Điểm ưu tiên
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            step={0.1}
                            value={editPriorityScore}
                            onChange={(e) =>
                              setEditPriorityScore(
                                parseFloat(e.target.value) || 5,
                              )
                            }
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Bắt đầu
                          </Label>
                          <Input
                            type="datetime-local"
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Kết thúc dự kiến
                          </Label>
                          <Input
                            type="datetime-local"
                            value={editExpectedEndTime}
                            onChange={(e) =>
                              setEditExpectedEndTime(e.target.value)
                            }
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>
                    </section>

                    <Separator />

                    {/* Editable activities */}
                    <section>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <ListChecks className="h-3.5 w-3.5" weight="bold" />
                          Các bước thực hiện
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-2"
                          >
                            {editActivities.length} bước
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 border-dashed"
                            onClick={addEditActivity}
                          >
                            <Plus className="h-3 w-3" weight="bold" />
                            Thêm bước
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {editActivities.map((activity, idx) => {
                          const config =
                            activityTypeConfig[activity.activityType] ||
                            activityTypeConfig["ASSESS"];
                          return (
                            <div
                              key={activity._id}
                              className="rounded-xl border bg-background p-3 space-y-2.5 hover:shadow-sm transition-shadow"
                            >
                              {/* Step header */}
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                    config.bgColor,
                                    config.color,
                                  )}
                                >
                                  {idx + 1}
                                </div>
                                <Select
                                  value={activity.activityType}
                                  onValueChange={(v) =>
                                    updateEditActivity(
                                      activity._id,
                                      "activityType",
                                      v,
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-7 text-[11px] w-[140px] font-semibold">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="z-[1200]">
                                    {Object.entries(activityTypeConfig).map(
                                      ([key, cfg]) => (
                                        <SelectItem
                                          key={key}
                                          value={key}
                                          className="text-xs"
                                        >
                                          {cfg.label}
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                                <div className="flex-1" />
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveEditActivity(idx, -1)}
                                    disabled={idx === 0}
                                  >
                                    <CaretUp className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveEditActivity(idx, 1)}
                                    disabled={idx === editActivities.length - 1}
                                  >
                                    <CaretDown className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                    onClick={() =>
                                      removeEditActivity(activity._id)
                                    }
                                  >
                                    <Trash className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Description */}
                              <div>
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                  Mô tả
                                </Label>
                                <textarea
                                  value={activity.description}
                                  onChange={(e) =>
                                    updateEditActivity(
                                      activity._id,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Mô tả hoạt động..."
                                  rows={2}
                                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                                />
                              </div>

                              {/* Time + Priority */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Thời gian ước tính
                                  </Label>
                                  <Input
                                    value={activity.estimatedTime}
                                    onChange={(e) =>
                                      updateEditActivity(
                                        activity._id,
                                        "estimatedTime",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="VD: 30 phút"
                                    className="h-7 text-xs mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Độ ưu tiên
                                  </Label>
                                  <Select
                                    value={activity.priority || "Medium"}
                                    onValueChange={(v) =>
                                      updateEditActivity(
                                        activity._id,
                                        "priority",
                                        v,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-xs mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="z-[1200]">
                                      <SelectItem value="Critical">
                                        Critical
                                      </SelectItem>
                                      <SelectItem value="High">High</SelectItem>
                                      <SelectItem value="Medium">
                                        Medium
                                      </SelectItem>
                                      <SelectItem value="Low">Low</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {editActivities.length === 0 && (
                        <div className="text-center py-8 rounded-xl border-2 border-dashed border-border/50">
                          <ListChecks className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground/60">
                            Chưa có bước nào
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 gap-1.5 text-xs"
                            onClick={addEditActivity}
                          >
                            <Plus className="h-3 w-3" weight="bold" />
                            Thêm bước đầu tiên
                          </Button>
                        </div>
                      )}
                    </section>

                    <Separator />
                  </>
                )}

                {/* === Live mode content === */}
                {(rescueSuggestion || latestSuggestion) && !isEditMode && (
                  <>
                    {/* Overall Assessment — only available from live analysis */}
                    {rescueSuggestion?.overallAssessment && (
                      <>
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
                      </>
                    )}

                    {/* Activity Steps — Grouped by SOS / Depot */}
                    <section>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <ListChecks className="h-3.5 w-3.5" weight="bold" />
                          Kế hoạch thực hiện
                        </h3>
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5 px-2"
                        >
                          {
                            (
                              rescueSuggestion?.suggestedActivities ??
                              latestActivities ??
                              []
                            ).length
                          }{" "}
                          bước
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        {activityGroups.map((group, gIdx) => {
                          const matchedSOS =
                            group.type === "sos" && group.sosRequestId
                              ? clusterSOSRequests.find(
                                  (s) => s.id === String(group.sosRequestId),
                                )
                              : null;

                          return (
                            <div
                              key={gIdx}
                              className={cn(
                                "rounded-xl border overflow-hidden",
                                group.type === "depot"
                                  ? "border-amber-300/50 dark:border-amber-700/40"
                                  : group.type === "sos" &&
                                      matchedSOS?.priority === "P1"
                                    ? "border-red-300/50 dark:border-red-700/40"
                                    : group.type === "sos" &&
                                        matchedSOS?.priority === "P2"
                                      ? "border-orange-300/50 dark:border-orange-700/40"
                                      : "border-border",
                              )}
                            >
                              {/* Group Header */}
                              <div
                                className={cn(
                                  "flex items-center gap-2.5 px-3.5 py-2.5",
                                  group.type === "depot"
                                    ? "bg-amber-50 dark:bg-amber-900/15"
                                    : group.type === "sos" &&
                                        matchedSOS?.priority === "P1"
                                      ? "bg-red-50 dark:bg-red-900/15"
                                      : group.type === "sos" &&
                                          matchedSOS?.priority === "P2"
                                        ? "bg-orange-50 dark:bg-orange-900/15"
                                        : "bg-muted/40",
                                )}
                              >
                                {group.type === "depot" ? (
                                  <>
                                    <div className="p-2 rounded-lg bg-amber-200/80 text-amber-800 dark:bg-amber-800/50 dark:text-amber-300 ring-1 ring-amber-400/40">
                                      <Storefront
                                        className="h-5 w-5"
                                        weight="fill"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-extrabold text-amber-900 dark:text-amber-200 truncate tracking-tight">
                                        📦 Kho:{" "}
                                        <span className="underline decoration-amber-400 decoration-2 underline-offset-2">
                                          {group.depotName}
                                        </span>
                                      </p>
                                      {group.depotAddress && (
                                        <p className="text-[11px] text-amber-700/70 dark:text-amber-400/60 truncate mt-0.5">
                                          {group.depotAddress}
                                        </p>
                                      )}
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-5 px-1.5 shrink-0 border-amber-400/60 text-amber-700 dark:text-amber-300 font-semibold"
                                    >
                                      {group.activities.length} bước
                                    </Badge>
                                  </>
                                ) : group.type === "sos" && matchedSOS ? (
                                  <SOSGroupHeader
                                    matchedSOS={matchedSOS}
                                    groupActivitiesLength={
                                      group.activities.length
                                    }
                                  />
                                ) : (
                                  <>
                                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                                      <ListChecks
                                        className="h-4 w-4"
                                        weight="fill"
                                      />
                                    </div>
                                    <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                                      Nhiệm vụ chung
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-5 px-1.5 shrink-0"
                                    >
                                      {group.activities.length} bước
                                    </Badge>
                                  </>
                                )}
                              </div>

                              {/* Steps inside group */}
                              <div className="p-3 space-y-2 bg-card">
                                {group.activities.map((activity, aIdx) => {
                                  const config =
                                    activityTypeConfig[activity.activityType] ||
                                    activityTypeConfig["ASSESS"];
                                  const cleanDescription = activity.description
                                    .replace(
                                      /\b\d{1,2}\.\d+,\s*\d{1,3}\.\d+\b\s*(\(.*?\))?/g,
                                      "",
                                    )
                                    .replace(/\s+/g, " ")
                                    .replace(/\(\s*\)/g, "")
                                    .replace(/: \./g, ":")
                                    .trim();

                                  return (
                                    <div
                                      key={aIdx}
                                      className="rounded-lg border bg-background p-3 hover:bg-accent/20 transition-colors"
                                    >
                                      <div className="flex items-start gap-2.5">
                                        <div
                                          className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                            config.bgColor,
                                            config.color,
                                          )}
                                        >
                                          {activity.step}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                          <div className="flex items-center gap-1.5 flex-wrap">
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
                                          <p className="text-sm leading-relaxed text-foreground/80">
                                            {cleanDescription}
                                          </p>

                                          {/* Supply list */}
                                          {activity.suppliesToCollect &&
                                            activity.suppliesToCollect.length >
                                              0 && (
                                              <div className="mt-2 p-2 rounded-md bg-muted/50 border border-dashed">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                                                  {activity.activityType ===
                                                  "DELIVER_SUPPLIES"
                                                    ? "Danh sách giao hàng"
                                                    : "Yêu cầu lấy vật tư"}
                                                </p>
                                                <div className="space-y-1">
                                                  {activity.suppliesToCollect.map(
                                                    (supply, sIdx) => (
                                                      <div
                                                        key={sIdx}
                                                        className="flex items-center justify-between gap-2 text-xs py-1 px-2 bg-background rounded border shadow-sm"
                                                      >
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                          <Package className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                          <span className="font-medium truncate">
                                                            {supply.itemName}
                                                          </span>
                                                        </div>
                                                        <div className="shrink-0 text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                                          {supply.quantity}{" "}
                                                          {supply.unit}
                                                        </div>
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

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
                        const isExpanded =
                          expandedSuggestionId === suggestion.id;
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
                                    <span className="text-sm font-semibold truncate block">
                                      {suggestion.suggestedMissionTitle}
                                    </span>
                                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Lightning className="h-3 w-3" />
                                        {suggestion.modelName}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <ShieldCheck className="h-3 w-3" />
                                        {(
                                          (suggestion.confidenceScore || 0) *
                                          100
                                        ).toFixed(0)}
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
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-lg font-bold text-primary">
                                      {(
                                        suggestion.suggestedPriorityScore || 0
                                      ).toFixed(1)}
                                    </span>
                                    {isExpanded ? (
                                      <CaretUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <CaretDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="border-t px-3 pb-3 pt-2 space-y-2 bg-muted/20">
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
                                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {step.estimatedTime}
                                                  </span>
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
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
          </div>

          {/* DRAG HANDLE */}
          {hasSidebar && (
            <div
              ref={handleRef}
              onMouseDown={handleMouseDown}
              className="h-full w-2 shrink-0 cursor-col-resize flex items-center justify-center bg-border/50 hover:bg-primary/20 active:bg-primary/30 transition-colors select-none z-20"
            >
              <DotsSixVertical
                className="h-5 w-5 text-muted-foreground"
                weight="bold"
              />
            </div>
          )}

          {/* RIGHT COLUMN — SOS Context Sidebar */}
          {hasSidebar && (
            <div
              className="h-full min-w-0 overflow-hidden bg-muted/20"
              style={{ width: `${100 - splitPercent}%` }}
            >
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  {/* SOS Requests Overview */}
                  <section>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                      <Info className="h-3.5 w-3.5" weight="fill" />
                      Thông tin SOS
                    </h4>
                    <div className="space-y-2">
                      {clusterSOSRequests.map((sos) => (
                        <SOSRequestSidebarCard key={sos.id} sos={sos} />
                      ))}
                    </div>
                  </section>

                  <Separator />

                  {/* Resources — only from live analysis */}
                  {rescueSuggestion && (
                    <>
                      <section>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                          <Cube className="h-3.5 w-3.5" weight="bold" />
                          Tài nguyên cần thiết
                        </h4>
                        <div className="space-y-1.5">
                          {rescueSuggestion.suggestedResources.map(
                            (resource, index) => {
                              const icon = resourceTypeIcons[
                                resource.resourceType
                              ] || <Package className="h-4 w-4" />;
                              return (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                                >
                                  <div className="p-1.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shrink-0">
                                    {icon}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold truncate">
                                      {resource.description}
                                    </p>
                                  </div>
                                  <span className="text-xs font-bold text-primary shrink-0">
                                    x{resource.quantity}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </section>

                      {/* Special Notes */}
                      {rescueSuggestion.specialNotes && (
                        <>
                          <Separator />
                          <section>
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                              <Warning
                                className="h-3.5 w-3.5 text-orange-500"
                                weight="fill"
                              />
                              Lưu ý đặc biệt
                            </h4>
                            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-lg p-2.5">
                              <p className="text-[11px] text-foreground/75 leading-relaxed">
                                {rescueSuggestion.specialNotes}
                              </p>
                            </div>
                          </section>
                        </>
                      )}

                      <Separator />
                    </>
                  )}

                  {/* AI Confidence */}
                  <section>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                      <ShieldCheck
                        className="h-3.5 w-3.5 text-emerald-500"
                        weight="fill"
                      />
                      Độ tin cậy AI
                    </h4>
                    <Card className="bg-card border">
                      <CardContent className="p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-muted-foreground">
                            Confidence
                          </span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {(
                              (rescueSuggestion?.confidenceScore ??
                                latestSuggestion?.confidenceScore ??
                                0) * 100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                        <Progress
                          value={
                            (rescueSuggestion?.confidenceScore ??
                              latestSuggestion?.confidenceScore ??
                              0) * 100
                          }
                          className="h-1.5"
                        />
                        <div
                          className={cn(
                            "grid gap-2 mt-2 text-[10px] text-muted-foreground",
                            rescueSuggestion ? "grid-cols-2" : "grid-cols-2",
                          )}
                        >
                          <div>
                            <p className="text-muted-foreground/60">Model</p>
                            <p className="font-medium text-foreground/80">
                              {rescueSuggestion?.modelName ??
                                latestSuggestion?.modelName}
                            </p>
                          </div>
                          {rescueSuggestion && (
                            <div>
                              <p className="text-muted-foreground/60">
                                Phản hồi
                              </p>
                              <p className="font-medium text-foreground/80">
                                {(
                                  (rescueSuggestion.responseTimeMs || 0) / 1000
                                ).toFixed(1)}
                                s
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground/60">Ưu tiên</p>
                            <p className="font-medium text-foreground/80">
                              {(
                                rescueSuggestion?.suggestedPriorityScore ??
                                latestSuggestion?.suggestedPriorityScore ??
                                0
                              ).toFixed(1)}
                            </p>
                          </div>
                          {rescueSuggestion && (
                            <div>
                              <p className="text-muted-foreground/60">
                                Thời lượng
                              </p>
                              <p className="font-medium text-foreground/80">
                                {rescueSuggestion.estimatedDuration}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </section>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0 bg-background">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (isEditMode) {
                  exitEditMode();
                } else {
                  onOpenChange(false);
                }
              }}
            >
              {isEditMode
                ? "Quay lại xem"
                : isHistoryMode && !latestSuggestion
                  ? "Đóng"
                  : !rescueSuggestion
                    ? "Đóng"
                    : "Huỷ bỏ"}
            </Button>
            {isEditMode ? (
              <Button
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/20"
                onClick={handleSubmitEdit}
                disabled={isCreatingMission}
              >
                {isCreatingMission ? (
                  <CircleNotch className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <FloppyDisk className="h-5 w-5 mr-2" weight="fill" />
                )}
                {isCreatingMission ? "Đang tạo..." : "Xác nhận & Tạo nhiệm vụ"}
              </Button>
            ) : rescueSuggestion ? (
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
                onClick={onApprove}
              >
                <CheckCircle className="h-5 w-5 mr-2" weight="fill" />
                Phê duyệt & Gửi nhiệm vụ
              </Button>
            ) : latestSuggestion ? (
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  onReAnalyze();
                  setTimeout(() => refetchMissions(), 3000);
                }}
                disabled={isReAnalyzing}
              >
                {isReAnalyzing ? (
                  <CircleNotch className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <ArrowsClockwise className="h-5 w-5 mr-2" />
                )}
                {isReAnalyzing ? "Đang phân tích..." : "Phân tích lại"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RescuePlanPanel;
