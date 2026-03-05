"use client";

import { useState, useEffect } from "react";
import { SOSRequest, Rescuer, Mission, SOSSidebarProps } from "@/type";
import { getRescuerTypeIcon } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
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
  isCreatingCluster = false,
  processingClusterIndex = null,
}: SOSSidebarProps) => {
  const [activeTab, setActiveTab] = useState("incoming");

  const pendingRequests = sosRequests.filter((s) => s.status === "PENDING");
  const assignedRequests = sosRequests.filter((s) => s.status === "ASSIGNED");
  const availableRescuers = rescuers.filter((r) => r.status === "AVAILABLE");
  const busyRescuers = rescuers.filter((r) => r.status === "BUSY");

  // IDs that belong to any auto-cluster (to identify standalone requests)
  const clusteredIds = new Set(autoClusters.flat().map((s) => s.id));
  const standaloneRequests = pendingRequests.filter(
    (s) => !clusteredIds.has(s.id),
  );

  return (
    <div className="h-full flex flex-col bg-background border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Warning className="h-5 w-5 text-red-500" weight="fill" />
          Trung Tâm Điều Phối
        </h2>
        <p className="text-sm text-muted-foreground mt-1">ReQ-SOS Miền Trung</p>
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
                      isCreatingCluster && processingClusterIndex === clusterIdx;

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
                            <Badge
                              variant={
                                highestPriority === "P1"
                                  ? "p1"
                                  : highestPriority === "P2"
                                    ? "p2"
                                    : "p3"
                              }
                              className="text-[10px] h-4 px-1.5"
                            >
                              {highestPriority}
                            </Badge>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-[11px] px-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-sm"
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

              {/* Standalone pending requests (not in any cluster) */}
              {standaloneRequests.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-1">
                    Đơn lẻ ({standaloneRequests.length})
                  </div>
                  {standaloneRequests.map((sos) => (
                    <SOSCard
                      key={sos.id}
                      sos={sos}
                      isSelected={selectedSOS?.id === sos.id}
                      onClick={() => onSOSSelect(sos)}
                    />
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
              {missions.length > 0 ? (
                missions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    rescuers={rescuers}
                  />
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Pulse className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Không có nhiệm vụ đang thực hiện</p>
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
