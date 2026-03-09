"use client";

import { useState, useEffect } from "react";
import { SOSRequest, Rescuer, Mission, SOSSidebarProps } from "@/type";
import { getRescuerTypeIcon } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { activityTypeConfig } from "@/lib/constants";
import { useMissions } from "@/services/mission/hooks";
import type { MissionEntity } from "@/services/mission/type";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Warning,
  Clock,
  Pulse,
  Stethoscope,
  ForkKnife,
  Anchor,
  TreeStructure,
  Spinner,
  MapPin,
  Lightning,
  Users,
  CaretDown,
  CaretUp,
  PencilSimpleLine,
  Eye,
  Rocket,
  CheckCircle,
  Play,
  Circle,
} from "@phosphor-icons/react";

// Client-side time elapsed hook
function useTimeElapsed(date: Date): string {
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
    const interval = setInterval(updateElapsed, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [date]);

  return elapsed;
}

// Time elapsed display component
function TimeElapsed({ date }: { date: Date }) {
  const elapsed = useTimeElapsed(date);
  return <span>{elapsed}</span>;
}

const SOSSidebar = ({
  sosRequests,
  rescuers,
  missions,
  onSOSSelect,
  onRescuerSelect,
  selectedSOS,
  autoClusters,
  onCreateCluster,
  onClusterOnly,
  isCreatingCluster = false,
  processingClusterIndex = null,
  processingSosId = null,
  backendClusters,
  onAnalyzeCluster,
  isAnalyzingCluster = false,
  analyzingClusterId = null,
  onManualMission,
  onViewClusterPlan,
  onViewMission,
}: SOSSidebarProps) => {
  const [activeTab, setActiveTab] = useState("incoming");
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(
    new Set(),
  );

  const pendingRequests = sosRequests.filter((s) => s.status === "PENDING");
  const assignedRequests = sosRequests.filter((s) => s.status === "ASSIGNED");
  const availableRescuers = rescuers.filter((r) => r.status === "AVAILABLE");
  const busyRescuers = rescuers.filter((r) => r.status === "BUSY");

  // IDs that belong to any auto-cluster (to identify standalone requests)
  const clusteredIds = new Set(autoClusters.flat().map((s) => s.id));
  // Also exclude SOS that are already in a backend cluster
  const backendClusteredIds = new Set(
    backendClusters.flatMap((c) => c.sosRequestIds.map(String)),
  );
  const standaloneRequests = pendingRequests.filter(
    (s) => !clusteredIds.has(s.id) && !backendClusteredIds.has(s.id),
  );

  // Backend clusters that have at least one PENDING SOS request
  const activeClusters = backendClusters.filter((c) => {
    const clusterSOS = sosRequests.filter((s) =>
      c.sosRequestIds.includes(Number(s.id)),
    );
    return clusterSOS.some((s) => s.status === "PENDING");
  });

  return (
    <div className="h-full flex flex-col bg-background border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Warning className="h-5 w-5 text-red-500" weight="fill" />
          Trung Tâm Điều Phối
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          ResQ-SOS Miền Trung
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b bg-muted/30">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500">
            {pendingRequests.length}
          </div>
          <div className="text-xs text-muted-foreground">Chờ xử lý</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">
            {assignedRequests.length}
          </div>
          <div className="text-xs text-muted-foreground">Đang cứu</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {availableRescuers.length}
          </div>
          <div className="text-xs text-muted-foreground">Đội sẵn sàng</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="mx-3 mt-3 grid grid-cols-3">
          <TabsTrigger value="incoming" className="text-xs">
            SOS Mới
          </TabsTrigger>
          <TabsTrigger value="missions" className="text-xs">
            Nhiệm vụ
          </TabsTrigger>
          <TabsTrigger value="rescuers" className="text-xs">
            Đội cứu hộ
          </TabsTrigger>
        </TabsList>

        {/* Incoming SOS Tab */}
        <TabsContent
          value="incoming"
          className="flex-1 overflow-hidden m-0 mt-3"
        >
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {/* Auto-cluster all nearby groups button */}
              {autoClusters.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-xs font-semibold border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                  onClick={() => onClusterOnly(autoClusters)}
                  disabled={isCreatingCluster}
                >
                  {isCreatingCluster ? (
                    <>
                      <Spinner className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <TreeStructure
                        className="h-3.5 w-3.5 mr-1.5"
                        weight="fill"
                      />
                      Gom cụm tự động ({autoClusters.length} cụm •{" "}
                      {autoClusters.reduce((sum, c) => sum + c.length, 0)} SOS)
                    </>
                  )}
                </Button>
              )}

              {/* Existing backend clusters */}
              {activeClusters.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Cụm đã gom ({activeClusters.length})
                  </div>
                  {activeClusters.map((cluster) => {
                    const severityColors: Record<string, string> = {
                      Critical:
                        "border-red-400 bg-red-50/50 dark:border-red-800/40 dark:bg-red-900/10",
                      High: "border-orange-400 bg-orange-50/50 dark:border-orange-800/40 dark:bg-orange-900/10",
                      Medium:
                        "border-yellow-400 bg-yellow-50/50 dark:border-yellow-800/40 dark:bg-yellow-900/10",
                      Low: "border-teal-400 bg-teal-50/50 dark:border-teal-800/40 dark:bg-teal-900/10",
                    };
                    const severityBadge: Record<string, string> = {
                      Critical:
                        "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30",
                      High: "text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30",
                      Medium:
                        "text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30",
                      Low: "text-teal-700 bg-teal-100 dark:text-teal-300 dark:bg-teal-900/30",
                    };
                    const severityLabels: Record<string, string> = {
                      Critical: "Nghiêm trọng",
                      High: "Cao",
                      Medium: "Trung bình",
                      Low: "Thấp",
                    };
                    const isAnalyzing =
                      isAnalyzingCluster && analyzingClusterId === cluster.id;
                    const sosCount =
                      cluster.sosRequestCount || cluster.sosRequestIds.length;
                    const isExpanded = expandedClusters.has(cluster.id);
                    const clusterSOS = sosRequests.filter((s) =>
                      cluster.sosRequestIds.includes(Number(s.id)),
                    );
                    const pendingClusterSOS = clusterSOS.filter(
                      (s) => s.status === "PENDING",
                    );
                    const assignedClusterSOS = clusterSOS.filter(
                      (s) => s.status === "ASSIGNED",
                    );

                    return (
                      <div
                        key={cluster.id}
                        className={cn(
                          "rounded-xl border overflow-hidden",
                          severityColors[cluster.severityLevel] ||
                            severityColors.Low,
                        )}
                      >
                        {/* Cluster header - clickable to expand */}
                        <div
                          className="px-3 py-2.5 cursor-pointer"
                          onClick={() => {
                            setExpandedClusters((prev) => {
                              const next = new Set(prev);
                              if (next.has(cluster.id)) {
                                next.delete(cluster.id);
                              } else {
                                next.add(cluster.id);
                              }
                              return next;
                            });
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TreeStructure
                                className="h-4 w-4 text-violet-600 dark:text-violet-400"
                                weight="fill"
                              />
                              <span className="text-xs font-semibold">
                                Cụm #{cluster.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground">
                                {pendingClusterSOS.length} chờ xử lý
                              </span>
                              {isExpanded ? (
                                <CaretUp className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Cluster info */}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1.5">
                            {cluster.victimEstimated && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" weight="fill" />~
                                {cluster.victimEstimated} nạn nhân
                              </span>
                            )}
                            {cluster.waterLevel && (
                              <span>🌊 {cluster.waterLevel}</span>
                            )}
                          </div>
                        </div>

                        {/* Expandable SOS list */}
                        {isExpanded && (
                          <>
                            <div className="border-t border-inherit divide-y divide-inherit">
                              {pendingClusterSOS.length > 0 ? (
                                pendingClusterSOS.map((sos) => (
                                  <div
                                    key={sos.id}
                                    className={cn(
                                      "px-3 py-2 cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5",
                                      selectedSOS?.id === sos.id &&
                                        "bg-black/10 dark:bg-white/10",
                                    )}
                                    onClick={() => onSOSSelect(sos)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <MapPin
                                          className={cn(
                                            "h-3.5 w-3.5",
                                            sos.priority === "P1"
                                              ? "text-red-500"
                                              : sos.priority === "P2"
                                                ? "text-orange-500"
                                                : "text-yellow-500",
                                          )}
                                          weight="fill"
                                        />
                                        <Badge
                                          variant={
                                            sos.priority === "P1"
                                              ? "p1"
                                              : sos.priority === "P2"
                                                ? "p2"
                                                : "p3"
                                          }
                                          className="text-[10px] h-4 px-1.5"
                                        >
                                          {sos.priority}
                                        </Badge>
                                        <span className="text-xs font-mono text-muted-foreground">
                                          #{sos.id}
                                        </span>
                                        <Badge
                                          variant="warning"
                                          className="text-[9px] h-3.5 px-1"
                                        >
                                          Chờ
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <TimeElapsed date={sos.createdAt} />
                                      </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                      {sos.message}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-[11px] text-muted-foreground italic">
                                  SOS IDs: [{cluster.sosRequestIds.join(", ")}]
                                </div>
                              )}
                            </div>

                            {/* Action buttons + Missions (uses hook inside) */}
                            <ClusterActionButtons
                              clusterId={cluster.id}
                              isAnalyzing={!!isAnalyzing}
                              isAnalyzingCluster={isAnalyzingCluster}
                              onAnalyzeCluster={onAnalyzeCluster}
                              onViewClusterPlan={onViewClusterPlan}
                              onManualMission={onManualMission}
                              onViewMission={onViewMission}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Auto-detected clusters */}
              {autoClusters.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Cụm tự động phát hiện ({autoClusters.length})
                  </div>
                  {autoClusters.map((cluster, clusterIdx) => {
                    const highestPriority = cluster.reduce(
                      (best, s) => {
                        const order = { P1: 0, P2: 1, P3: 2 };
                        return order[s.priority] < order[best]
                          ? s.priority
                          : best;
                      },
                      "P3" as "P1" | "P2" | "P3",
                    );
                    const isProcessing =
                      isCreatingCluster &&
                      processingClusterIndex === clusterIdx;

                    return (
                      <div
                        key={clusterIdx}
                        className="rounded-xl border border-violet-200 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-900/10 overflow-hidden"
                      >
                        {/* Cluster header */}
                        <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-violet-100/60 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800/30">
                          <div className="flex items-center gap-2">
                            <TreeStructure
                              className="h-4 w-4 text-violet-600 dark:text-violet-400"
                              weight="fill"
                            />
                            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                              Cụm {clusterIdx + 1} • {cluster.length} SOS
                            </span>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-[11px] px-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
                            onClick={() =>
                              onCreateCluster(cluster.map((s) => s.id))
                            }
                            disabled={isCreatingCluster}
                          >
                            {isProcessing ? (
                              <>
                                <Spinner className="h-3 w-3 mr-1 animate-spin" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <TreeStructure
                                  className="h-3 w-3 mr-1"
                                  weight="fill"
                                />
                                Gom & AI
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Cluster SOS items */}
                        <div className="divide-y divide-violet-100 dark:divide-violet-800/20">
                          {cluster.map((sos) => (
                            <div
                              key={sos.id}
                              className={cn(
                                "px-3 py-2 cursor-pointer transition-colors hover:bg-violet-100/60 dark:hover:bg-violet-900/20",
                                selectedSOS?.id === sos.id &&
                                  "bg-violet-100 dark:bg-violet-900/30",
                              )}
                              onClick={() => onSOSSelect(sos)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <MapPin
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      sos.priority === "P1"
                                        ? "text-red-500"
                                        : sos.priority === "P2"
                                          ? "text-orange-500"
                                          : "text-yellow-500",
                                    )}
                                    weight="fill"
                                  />
                                  <Badge
                                    variant={
                                      sos.priority === "P1"
                                        ? "p1"
                                        : sos.priority === "P2"
                                          ? "p2"
                                          : "p3"
                                    }
                                    className="text-[10px] h-4 px-1.5"
                                  >
                                    {sos.priority}
                                  </Badge>
                                  <span className="text-xs font-mono text-muted-foreground">
                                    #{sos.id}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <TimeElapsed date={sos.createdAt} />
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {sos.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Standalone pending requests (not in any cluster) — each can be individually clustered + AI analyzed */}
              {standaloneRequests.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-1">
                    Chờ xử lý ({standaloneRequests.length})
                  </div>
                  {standaloneRequests.map((sos) => (
                    <div
                      key={sos.id}
                      className={cn(
                        "rounded-xl border overflow-hidden",
                        sos.priority === "P1"
                          ? "border-red-400 bg-red-50/50 dark:border-red-800/40 dark:bg-red-900/10"
                          : sos.priority === "P2"
                            ? "border-orange-400 bg-orange-50/50 dark:border-orange-800/40 dark:bg-orange-900/10"
                            : "border-yellow-400 bg-yellow-50/50 dark:border-yellow-800/40 dark:bg-yellow-900/10",
                      )}
                    >
                      <div
                        className={cn(
                          "px-3 py-2 cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5",
                          selectedSOS?.id === sos.id &&
                            "bg-black/10 dark:bg-white/10",
                        )}
                        onClick={() => onSOSSelect(sos)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin
                              className={cn(
                                "h-3.5 w-3.5",
                                sos.priority === "P1"
                                  ? "text-red-500"
                                  : sos.priority === "P2"
                                    ? "text-orange-500"
                                    : "text-yellow-500",
                              )}
                              weight="fill"
                            />
                            <Badge
                              variant={
                                sos.priority === "P1"
                                  ? "p1"
                                  : sos.priority === "P2"
                                    ? "p2"
                                    : "p3"
                              }
                              className="text-[10px] h-4 px-1.5"
                            >
                              {sos.priority}
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground">
                              #{sos.id}
                            </span>
                            <Badge
                              variant="warning"
                              className="text-[9px] h-3.5 px-1"
                            >
                              Chờ
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <TimeElapsed date={sos.createdAt} />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {sos.message}
                        </p>
                      </div>
                      <div className="px-3 py-2 border-t border-inherit space-y-1.5">
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full h-7 text-[11px] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateCluster([sos.id]);
                          }}
                          disabled={
                            processingSosId === sos.id ||
                            isCreatingCluster ||
                            isAnalyzingCluster
                          }
                        >
                          {processingSosId === sos.id ? (
                            <>
                              <Spinner className="h-3 w-3 mr-1 animate-spin" />
                              Đang xử lý...
                            </>
                          ) : (
                            <>
                              <Lightning
                                className="h-3 w-3 mr-1"
                                weight="fill"
                              />
                              Gom & AI Phân tích
                            </>
                          )}
                        </Button>
                        {onManualMission && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[11px] border-orange-300/60 dark:border-orange-700/60 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            disabled
                          >
                            <PencilSimpleLine
                              className="h-3 w-3 mr-1"
                              weight="fill"
                            />
                            Tạo nhiệm vụ thủ công
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Assigned / In-progress SOS Requests */}
              {assignedRequests.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">
                    Đang cứu hộ ({assignedRequests.length})
                  </div>
                  {assignedRequests.map((sos) => (
                    <SOSCard
                      key={sos.id}
                      sos={sos}
                      isSelected={selectedSOS?.id === sos.id}
                      onClick={() => onSOSSelect(sos)}
                    />
                  ))}
                </>
              )}

              {/* Empty state when no requests at all */}
              {pendingRequests.length === 0 &&
                assignedRequests.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Pulse className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Không có yêu cầu SOS nào</p>
                  </div>
                )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Active Missions Tab */}
        <TabsContent
          value="missions"
          className="flex-1 overflow-hidden m-0 mt-3"
        >
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {backendClusters.length > 0 ? (
                backendClusters.map((cluster) => (
                  <ClusterMissionsGroup key={cluster.id} cluster={cluster} />
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Pulse className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chưa có cụm SOS nào</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Rescuers Tab */}
        <TabsContent
          value="rescuers"
          className="flex-1 overflow-hidden m-0 mt-3"
        >
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Sẵn sàng ({availableRescuers.length})
              </div>
              {availableRescuers.map((rescuer) => (
                <RescuerCard
                  key={rescuer.id}
                  rescuer={rescuer}
                  onClick={() => onRescuerSelect(rescuer)}
                />
              ))}

              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">
                Đang bận ({busyRescuers.length})
              </div>
              {busyRescuers.map((rescuer) => (
                <RescuerCard
                  key={rescuer.id}
                  rescuer={rescuer}
                  onClick={() => onRescuerSelect(rescuer)}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SOSSidebar;

// Individual SOS Card Component
function SOSCard({
  sos,
  isSelected,
  onClick,
}: {
  sos: SOSRequest;
  isSelected: boolean;
  onClick: () => void;
}) {
  const priorityVariant = {
    P1: "p1" as const,
    P2: "p2" as const,
    P3: "p3" as const,
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md py-3",
        isSelected && "ring-2 ring-primary",
        sos.priority === "P1" && "border-l-4 border-l-red-500",
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant={priorityVariant[sos.priority]}>
              {sos.priority}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              #{sos.id}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <TimeElapsed date={sos.createdAt} />
          </div>
        </div>

        <p className="text-sm line-clamp-2 mb-2">{sos.message}</p>

        {/* Needs Icons */}
        <div className="flex items-center gap-2 mb-2">
          {sos.needs.medical && (
            <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
              <Stethoscope className="h-3 w-3" weight="fill" />
              <span>Y tế</span>
            </div>
          )}
          {sos.needs.food && (
            <div className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
              <ForkKnife className="h-3 w-3" weight="fill" />
              <span>Thực phẩm</span>
            </div>
          )}
          {sos.needs.boat && (
            <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              <Anchor className="h-3 w-3" weight="fill" />
              <span>Thuyền</span>
            </div>
          )}
        </div>

        {/* AI Analysis Tags */}
        {sos.aiAnalysis && (
          <div className="flex flex-wrap gap-1">
            {sos.aiAnalysis.riskFactors.map((factor, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {factor}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mission Card Component
function MissionCard({
  mission,
  rescuers,
}: {
  mission: Mission;
  rescuers: Rescuer[];
}) {
  const rescuer = rescuers.find((r) => r.id === mission.rescuerId);

  return (
    <Card className="py-3">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="info">Đang thực hiện</Badge>
            <span className="text-xs font-mono">
              #{mission.id.split("-")[1]}
            </span>
          </div>
        </div>

        {rescuer && (
          <div className="flex items-center gap-2 text-sm mb-2">
            <span>{getRescuerTypeIcon(rescuer.type)}</span>
            <span className="font-medium">{rescuer.name}</span>
          </div>
        )}

        <div className="space-y-1">
          {mission.steps.map((step, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-2 text-xs",
                idx === 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                  idx === 0 ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {step.stepNumber}
              </div>
              <span className="flex-1 truncate">{step.details}</span>
              <span className="text-muted-foreground">
                {step.estimatedTime}&apos;
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Rescuer Card Component
function RescuerCard({
  rescuer,
  onClick,
}: {
  rescuer: Rescuer;
  onClick: () => void;
}) {
  const typeLabels = {
    TRUCK: "Xe tải",
    MOTORBOAT: "Thuyền máy",
    SMALL_BOAT: "Thuyền nhỏ",
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md py-3",
        rescuer.status === "AVAILABLE" && "border-l-4 border-l-green-500",
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getRescuerTypeIcon(rescuer.type)}</div>
          <div className="flex-1">
            <div className="font-medium text-sm">{rescuer.name}</div>
            <div className="text-xs text-muted-foreground">
              {typeLabels[rescuer.type]}
            </div>
          </div>
          <Badge
            variant={rescuer.status === "AVAILABLE" ? "success" : "secondary"}
          >
            {rescuer.status === "AVAILABLE" ? "Sẵn sàng" : "Bận"}
          </Badge>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="text-muted-foreground">
            Tải: {rescuer.currentLoad}/{rescuer.capacity}
          </div>
          <div className="flex gap-1">
            {rescuer.capabilities.map((cap, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px]">
                {cap}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Mission status helpers ──

const missionStatusConfig: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  Pending: {
    label: "Chờ duyệt",
    color:
      "text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30",
    icon: Clock,
  },
  InProgress: {
    label: "Đang thực hiện",
    color: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30",
    icon: Play,
  },
  Completed: {
    label: "Hoàn thành",
    color:
      "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30",
    icon: CheckCircle,
  },
  Cancelled: {
    label: "Đã hủy",
    color: "text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-900/30",
    icon: Circle,
  },
};

// ── ClusterActionButtons: action buttons + missions, hides create buttons if missions exist ──

function ClusterActionButtons({
  clusterId,
  isAnalyzing,
  isAnalyzingCluster,
  onAnalyzeCluster,
  onViewClusterPlan,
  onManualMission,
  onViewMission,
}: {
  clusterId: number;
  isAnalyzing: boolean;
  isAnalyzingCluster: boolean;
  onAnalyzeCluster: (clusterId: number) => void;
  onViewClusterPlan?: (clusterId: number) => void;
  onViewMission?: (clusterId: number, missionId: number) => void;
  onManualMission?: (clusterId: number) => void;
}) {
  const { data: missionsData, isLoading: isMissionsLoading } =
    useMissions(clusterId);
  const [expandedMissionId, setExpandedMissionId] = useState<number | null>(
    null,
  );

  const missions = missionsData?.missions ?? [];
  const hasMissions = missions.length > 0;

  return (
    <>
      {/* Action buttons */}
      <div className="px-3 py-2 border-t border-inherit space-y-1.5">
        {hasMissions ? (
          // Missions already created — show success state
          <div className="flex flex-col gap-2 py-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" weight="fill" />
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                Đã tạo {missions.length} nhiệm vụ
              </span>
            </div>
          </div>
        ) : (
          // No missions yet — show action buttons
          <>
            <Button
              variant="default"
              size="sm"
              className="w-full h-7 text-[11px] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onAnalyzeCluster(clusterId);
              }}
              disabled={isAnalyzingCluster}
            >
              {isAnalyzing ? (
                <>
                  <Spinner className="h-3 w-3 mr-1 animate-spin" />
                  AI đang phân tích...
                </>
              ) : (
                <>
                  <Lightning className="h-3 w-3 mr-1" weight="fill" />
                  AI Phân tích Rescue Plan
                </>
              )}
            </Button>
            {onManualMission && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[11px] border-orange-300/60 dark:border-orange-700/60 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onManualMission(clusterId);
                }}
              >
                <PencilSimpleLine className="h-3 w-3 mr-1" weight="fill" />
                Tạo nhiệm vụ thủ công
              </Button>
            )}
          </>
        )}
      </div>

      {/* Mission list */}
      {isMissionsLoading && (
        <div className="px-3 py-2 border-t border-inherit">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Spinner className="h-3 w-3 animate-spin" />
            Đang tải nhiệm vụ...
          </div>
        </div>
      )}
      {hasMissions && (
        <div className="border-t border-inherit">
          <div className="px-3 pt-2 pb-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Rocket className="h-3 w-3" weight="fill" />
              Nhiệm vụ đã tạo ({missions.length})
            </div>
          </div>
          <div className="px-3 pb-2 space-y-1.5">
            {missions.map((mission) => (
              <MissionEntityCard
                key={mission.id}
                mission={mission}
                clusterId={clusterId}
                isExpanded={expandedMissionId === mission.id}
                onToggle={() =>
                  setExpandedMissionId(
                    expandedMissionId === mission.id ? null : mission.id,
                  )
                }
                onViewMission={onViewMission}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── ClusterMissions: compact mission list shown inside expanded cluster cards ──

function ClusterMissions({
  clusterId,
  onViewMission,
}: {
  clusterId: number;
  onViewMission?: (missionId: number) => void;
}) {
  const { data: missionsData, isLoading } = useMissions(clusterId);
  const [expandedMissionId, setExpandedMissionId] = useState<number | null>(
    null,
  );

  const missions = missionsData?.missions ?? [];

  if (isLoading) {
    return (
      <div className="px-3 py-2 border-t border-inherit">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Spinner className="h-3 w-3 animate-spin" />
          Đang tải nhiệm vụ...
        </div>
      </div>
    );
  }

  if (missions.length === 0) return null;

  return (
    <div className="border-t border-inherit">
      <div className="px-3 pt-2 pb-1">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Rocket className="h-3 w-3" weight="fill" />
          Nhiệm vụ đã tạo ({missions.length})
        </div>
      </div>
      <div className="px-3 pb-2 space-y-1.5">
        {missions.map((mission) => (
          <MissionEntityCard
            key={mission.id}
            mission={mission}
            isExpanded={expandedMissionId === mission.id}
            onToggle={() =>
              setExpandedMissionId(
                expandedMissionId === mission.id ? null : mission.id,
              )
            }
            onViewMission={onViewMission}
          />
        ))}
      </div>
    </div>
  );
}

// ── MissionEntityCard: a single real mission from backend ──

function MissionEntityCard({
  mission,
  clusterId,
  isExpanded,
  onToggle,
  onViewMission,
}: {
  mission: MissionEntity;
  clusterId?: number;
  isExpanded: boolean;
  onToggle: () => void;
  onViewMission?: (clusterId: number, missionId: number) => void;
}) {
  const status =
    missionStatusConfig[mission.status] ?? missionStatusConfig.Pending;

  return (
    <div className="rounded-lg border bg-background/60 overflow-hidden">
      <div
        className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1.5">
          <Rocket className="h-3 w-3 text-orange-500" weight="fill" />
          <span className="text-[11px] font-semibold">NV #{mission.id}</span>
          <span
            className={cn(
              "text-[9px] font-semibold px-1.5 py-0.5 rounded",
              status.color,
            )}
          >
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">
            {mission.activityCount} bước
          </span>
          {isExpanded ? (
            <CaretUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <CaretDown className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-2.5 pb-2 border-t border-border/50">
          {/* Priority & timing */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground py-1.5">
            <span>Ưu tiên: {mission.priorityScore}</span>
            <span>
              {new Date(mission.startTime).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              →{" "}
              {new Date(mission.expectedEndTime).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Activities timeline */}
          {mission.activities && mission.activities.length > 0 && (
            <div className="space-y-1">
              {[...mission.activities]
                .sort((a, b) => a.step - b.step)
                .map((activity, idx) => {
                  const config = activityTypeConfig[activity.activityType];
                  return (
                    <div key={activity.id} className="flex items-start gap-2">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5",
                          config?.bgColor || "bg-muted",
                          config?.color || "text-muted-foreground",
                        )}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-[10px] font-semibold",
                              config?.color || "text-foreground",
                            )}
                          >
                            {config?.label || activity.activityType}
                          </span>
                          {activity.status === "Completed" ? (
                            <CheckCircle
                              className="h-3 w-3 text-green-500"
                              weight="fill"
                            />
                          ) : activity.status === "InProgress" ? (
                            <Play
                              className="h-3 w-3 text-blue-500"
                              weight="fill"
                            />
                          ) : null}
                        </div>
                        {activity.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        {activity.target && (
                          <p className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" weight="fill" />
                            {activity.target}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {onViewMission && clusterId && (
            <div className="mt-3 pt-2 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[10px] bg-orange-50/50 hover:bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/10 dark:hover:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMission(clusterId, mission.id);
                }}
              >
                <PencilSimpleLine className="h-3 w-3 mr-1.5" weight="fill" />
                Xem / Sửa nhiệm vụ
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ClusterMissionsGroup: used in the Missions tab to show all missions per cluster ──

function ClusterMissionsGroup({
  cluster,
}: {
  cluster: import("@/services/sos_cluster/type").SOSClusterEntity;
}) {
  const { data: missionsData, isLoading } = useMissions(cluster.id);
  const [expandedMissionId, setExpandedMissionId] = useState<number | null>(
    null,
  );

  const missions = missionsData?.missions ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground py-2">
        <Spinner className="h-3 w-3 animate-spin" />
        Cụm #{cluster.id}...
      </div>
    );
  }

  if (missions.length === 0) return null;

  const severityLabels: Record<string, string> = {
    Critical: "Nghiêm trọng",
    High: "Cao",
    Medium: "Trung bình",
    Low: "Thấp",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <TreeStructure
          className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400"
          weight="fill"
        />
        <span className="text-xs font-semibold">Cụm #{cluster.id}</span>
        <span className="text-[10px] text-muted-foreground">
          {severityLabels[cluster.severityLevel] || cluster.severityLevel}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {missions.length} nhiệm vụ
        </span>
      </div>
      <div className="space-y-1.5 pl-1">
        {missions.map((mission) => (
          <MissionEntityCard
            key={mission.id}
            mission={mission}
            isExpanded={expandedMissionId === mission.id}
            onToggle={() =>
              setExpandedMissionId(
                expandedMissionId === mission.id ? null : mission.id,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
