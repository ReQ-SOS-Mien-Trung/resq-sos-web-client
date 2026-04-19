"use client";

import { useState, useEffect, useMemo } from "react";
import { SOSRequest, Rescuer, Mission, SOSSidebarProps } from "@/type";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { activityTypeConfig } from "@/lib/constants";
import {
  PRIORITY_BADGE_VARIANT,
  PRIORITY_BORDER_COLOR,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  PRIORITY_TEXT_COLOR,
} from "@/lib/priority";
import { useMissions } from "@/services/mission/hooks";
import type { MissionEntity } from "@/services/mission/type";
import type { TeamIncidentEntity } from "@/services/team_incidents/type";
import type {
  ClusterLifecycleStatus,
  ClusterSeverityLevel,
  SOSClusterEntity,
} from "@/services/sos_cluster/type";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Warning,
  Clock,
  Pulse,
  TreeStructure,
  Spinner,
  MapPin,
  Lightning,
  Users,
  CaretDown,
  CaretUp,
  CaretRight,
  PencilSimpleLine,
  Eye,
  Rocket,
  CheckCircle,
  Play,
  Circle,
  Truck,
  User,
  Phone,
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

const rescuerTypeLabels: Record<Rescuer["type"], string> = {
  TRUCK: "Xe tải",
  MOTORBOAT: "Thuyền máy",
  SMALL_BOAT: "Thuyền nhỏ",
};

function RescuerTypeIcon({
  type,
  className,
}: {
  type: Rescuer["type"];
  className?: string;
}) {
  if (type === "TRUCK") {
    return (
      <Truck
        className={cn("h-5 w-5 text-slate-700", className)}
        weight="fill"
      />
    );
  }

  if (type === "MOTORBOAT") {
    return (
      <Icon
        icon="ph:sailboat-fill"
        className={cn("h-5 w-5 text-blue-600", className)}
      />
    );
  }

  return (
    <Icon
      icon="ph:boat-fill"
      className={cn("h-5 w-5 text-cyan-600", className)}
    />
  );
}

function WaterLevelIcon({ className }: { className?: string }) {
  return (
    <Icon
      icon="ph:waves"
      className={cn("h-3.5 w-3.5 text-sky-500", className)}
    />
  );
}

function getIncidentReporterName(
  reportedBy: TeamIncidentEntity["reportedBy"],
): string {
  if (!reportedBy) return "Chưa rõ người báo cáo";
  if (typeof reportedBy === "string") return reportedBy;

  const fullName = [reportedBy.firstName, reportedBy.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return (
    fullName || reportedBy.phone || reportedBy.email || "Chưa rõ người báo cáo"
  );
}

function getIncidentReporterPhone(
  reportedBy: TeamIncidentEntity["reportedBy"],
): string | null {
  if (!reportedBy || typeof reportedBy === "string") return null;
  return reportedBy.phone;
}

const CLUSTER_SEVERITY_SORT_ORDER: Record<ClusterSeverityLevel, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const CLUSTER_SEVERITY_LABELS: Record<ClusterSeverityLevel, string> = {
  Critical: "Rất nghiêm trọng",
  High: "Nghiêm trọng",
  Medium: "Trung bình",
  Low: "Thấp",
};

const CLUSTER_CONTAINER_CLASS_BY_SEVERITY: Record<
  ClusterSeverityLevel,
  string
> = {
  Critical:
    "border-red-400 bg-red-50/50 dark:border-red-800/40 dark:bg-red-900/10",
  High: "border-orange-400 bg-orange-50/50 dark:border-orange-800/40 dark:bg-orange-900/10",
  Medium:
    "border-yellow-400 bg-yellow-50/50 dark:border-yellow-800/40 dark:bg-yellow-900/10",
  Low: "border-teal-400 bg-teal-50/50 dark:border-teal-800/40 dark:bg-teal-900/10",
};

const CLUSTER_SEVERITY_BADGE_CLASS_BY_SEVERITY: Record<
  ClusterSeverityLevel,
  string
> = {
  Critical: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30",
  High: "text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30",
  Medium:
    "text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30",
  Low: "text-teal-700 bg-teal-100 dark:text-teal-300 dark:bg-teal-900/30",
};

const CLUSTER_STATUS_SORT_ORDER: Record<ClusterLifecycleStatus, number> = {
  InProgress: 0,
  Suggested: 1,
  Pending: 2,
  Completed: 3,
};

const CLUSTER_STATUS_LABELS: Record<ClusterLifecycleStatus, string> = {
  Pending: "Chờ AI phân tích",
  Suggested: "Đã có gợi ý AI",
  InProgress: "Đang thực hiện",
  Completed: "Đã hoàn thành",
};

const CLUSTER_STATUS_BADGE_CLASS_BY_STATUS: Record<
  ClusterLifecycleStatus,
  string
> = {
  Pending:
    "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800/50",
  Suggested:
    "text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-900/30",
  InProgress:
    "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30",
  Completed:
    "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30",
};

function resolveClusterStatus(
  cluster: SOSClusterEntity,
): ClusterLifecycleStatus {
  if (
    cluster.status === "Pending" ||
    cluster.status === "Suggested" ||
    cluster.status === "InProgress" ||
    cluster.status === "Completed"
  ) {
    return cluster.status;
  }

  return cluster.isMissionCreated ? "InProgress" : "Pending";
}

function getTimestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSOSRequestId(id: string | number): string {
  const normalized = String(id).trim();
  const asNumber = Number(normalized);
  if (Number.isFinite(asNumber)) {
    return String(asNumber);
  }
  return normalized;
}

type SOSStatusBucket = "pending" | "active" | "resolved" | "cancelled";
type SOSStatusBadgeVariant = "warning" | "info" | "success" | "outline";

function normalizeSOSStatus(status: SOSRequest["status"]): string {
  return String(status || "")
    .trim()
    .toUpperCase();
}

function getSOSStatusBucket(status: SOSRequest["status"]): SOSStatusBucket {
  const normalized = normalizeSOSStatus(status);

  if (normalized === "PENDING") {
    return "pending";
  }

  if (
    normalized === "ASSIGNED" ||
    normalized === "IN_PROGRESS" ||
    normalized === "INPROGRESS" ||
    normalized === "INCIDENT"
  ) {
    return "active";
  }

  if (normalized === "CANCELLED") {
    return "cancelled";
  }

  return "resolved";
}

function getSOSStatusSortWeight(status: SOSRequest["status"]): number {
  const bucket = getSOSStatusBucket(status);
  if (bucket === "pending") return 0;
  if (bucket === "active") return 1;
  if (bucket === "resolved") return 2;
  return 3;
}

function getSOSStatusLabel(status: SOSRequest["status"]): string {
  const normalized = normalizeSOSStatus(status);

  if (normalized === "PENDING") {
    return "Chờ";
  }

  if (normalized === "INCIDENT") {
    return "Có sự cố";
  }

  if (
    normalized === "ASSIGNED" ||
    normalized === "IN_PROGRESS" ||
    normalized === "INPROGRESS"
  ) {
    return "Đang cứu";
  }

  if (normalized === "CANCELLED") {
    return "Đã hủy";
  }

  if (normalized === "RESCUED" || normalized === "RESOLVED") {
    return "Đã xử lý";
  }

  return "Đã xử lý";
}

function getSOSStatusBadgeVariant(
  status: SOSRequest["status"],
): SOSStatusBadgeVariant {
  const bucket = getSOSStatusBucket(status);

  if (bucket === "pending") {
    return "warning";
  }

  if (bucket === "active") {
    return "info";
  }

  if (bucket === "resolved") {
    return "success";
  }

  return "outline";
}

const SOSSidebar = ({
  sosRequests,
  rescuers,
  teamIncidents = [],
  onSOSSelect,
  onRescuerSelect,
  onTeamIncidentSelect,
  selectedSOS,
  selectedTeamIncident,
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
  analyzingStatus,
  onManualMission,
  onViewClusterPlan,
  onViewMission,
}: SOSSidebarProps) => {
  const [activeTab, setActiveTab] = useState("incoming");
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(
    new Set(),
  );
  const [clusterSearchTerm, setClusterSearchTerm] = useState("");
  const currentTab = selectedTeamIncident
    ? "incidents"
    : selectedSOS
      ? "incoming"
      : activeTab;

  const pendingRequests = sosRequests.filter(
    (s) => getSOSStatusBucket(s.status) === "pending",
  );
  const assignedRequests = sosRequests.filter(
    (s) => getSOSStatusBucket(s.status) === "active",
  );
  const availableRescuers = rescuers.filter((r) => r.status === "AVAILABLE");
  const busyRescuers = rescuers.filter((r) => r.status === "BUSY");
  const reportedIncidents = teamIncidents.filter(
    (incident) => incident.status === "Reported",
  );
  const acknowledgedIncidents = teamIncidents.filter(
    (incident) => incident.status === "Acknowledged",
  );
  const resolvedIncidents = teamIncidents.filter(
    (incident) => incident.status === "Resolved",
  );
  const otherIncidents = teamIncidents.filter(
    (incident) =>
      incident.status !== "Reported" &&
      incident.status !== "Acknowledged" &&
      incident.status !== "Resolved",
  );

  // IDs that belong to any auto-cluster (to identify standalone requests)
  const clusteredIds = new Set(autoClusters.flat().map((s) => s.id));
  // Also exclude SOS that are already in a backend cluster
  const backendClusteredIds = new Set(
    backendClusters.flatMap((c) => c.sosRequestIds.map(String)),
  );
  const standaloneRequests = pendingRequests.filter(
    (s) => !clusteredIds.has(s.id) && !backendClusteredIds.has(s.id),
  );

  const sosStatusById = useMemo(() => {
    return new Map(
      sosRequests.map((sos) => [
        normalizeSOSRequestId(sos.id),
        getSOSStatusBucket(sos.status),
      ]),
    );
  }, [sosRequests]);

  // Show only clusters that are not completed, sorted by severity (Critical -> Low).
  const activeClusters = useMemo(() => {
    return [...backendClusters]
      .filter((cluster) => resolveClusterStatus(cluster) !== "Completed")
      .filter((cluster) => {
        const clusterStatus = resolveClusterStatus(cluster);
        if (clusterStatus === "InProgress") {
          // Always keep active clusters visible based on cluster lifecycle status.
          return true;
        }

        const knownBuckets = cluster.sosRequestIds
          .map(normalizeSOSRequestId)
          .map((sosId) => sosStatusById.get(sosId))
          .filter((bucket): bucket is SOSStatusBucket => !!bucket);

        if (knownBuckets.length === 0) {
          // Keep cluster visible when SOS details have not been loaded yet.
          return true;
        }

        return knownBuckets.some(
          (bucket) => bucket === "pending" || bucket === "active",
        );
      })
      .sort((left, right) => {
        const severityDelta =
          CLUSTER_SEVERITY_SORT_ORDER[left.severityLevel] -
          CLUSTER_SEVERITY_SORT_ORDER[right.severityLevel];

        if (severityDelta !== 0) {
          return severityDelta;
        }

        const statusDelta =
          CLUSTER_STATUS_SORT_ORDER[resolveClusterStatus(left)] -
          CLUSTER_STATUS_SORT_ORDER[resolveClusterStatus(right)];

        if (statusDelta !== 0) {
          return statusDelta;
        }

        return (
          getTimestamp(right.lastUpdatedAt) - getTimestamp(left.lastUpdatedAt)
        );
      });
  }, [backendClusters, sosStatusById]);

  const filteredActiveClusters = useMemo(() => {
    const rawQuery = clusterSearchTerm.trim();
    if (!rawQuery) {
      return activeClusters;
    }

    const lowerQuery = rawQuery.toLowerCase();
    const numericQuery = rawQuery.replace(/[^0-9]/g, "");
    const normalizedNumericQuery =
      numericQuery.length > 0 && Number.isFinite(Number(numericQuery))
        ? String(Number(numericQuery))
        : numericQuery;

    const searchTerms = [lowerQuery];
    if (
      normalizedNumericQuery &&
      !searchTerms.includes(normalizedNumericQuery)
    ) {
      searchTerms.push(normalizedNumericQuery);
    }

    return activeClusters.filter((cluster) => {
      const clusterIdLabel = String(cluster.id).toLowerCase();
      const normalizedSosIds = cluster.sosRequestIds
        .map(normalizeSOSRequestId)
        .map((value) => value.toLowerCase());

      return searchTerms.some(
        (term) =>
          clusterIdLabel.includes(term) ||
          normalizedSosIds.some((sosId) => sosId.includes(term)),
      );
    });
  }, [activeClusters, clusterSearchTerm]);

  const selectedSOSId = selectedSOS
    ? normalizeSOSRequestId(selectedSOS.id)
    : null;

  const selectedClusterId = useMemo(() => {
    if (!selectedSOSId) return null;

    const matchedCluster = activeClusters.find((cluster) =>
      cluster.sosRequestIds.map(normalizeSOSRequestId).includes(selectedSOSId),
    );

    return matchedCluster?.id ?? null;
  }, [activeClusters, selectedSOSId]);

  return (
    <div className="flex h-full min-h-0 flex-col border-r bg-background text-[14px]">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-bold text-[16px] flex items-center gap-2">
          <Warning className="h-5 w-5 text-red-500" weight="fill" />
          Trung Tâm Điều Phối
        </h2>
        <p className="text-[15px] text-muted-foreground mt-1">
          ResQ-SOS Miền Trung
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b bg-muted/30">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500">
            {pendingRequests.length}
          </div>
          <div className="text-[14px] text-muted-foreground">Chờ xử lý</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">
            {assignedRequests.length}
          </div>
          <div className="text-[14px] text-muted-foreground">Đang cứu</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {availableRescuers.length}
          </div>
          <div className="text-[14px] text-muted-foreground">Đội sẵn sàng</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mx-3 mt-3 grid h-auto w-auto grid-cols-3 rounded-2xl border border-border/60 bg-muted/40 p-1 shadow-inner dark:border-white/10 dark:bg-white/5">
          <TabsTrigger
            value="incoming"
            className="h-10 rounded-xl px-3 text-[15px] font-semibold tracking-tight data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
          >
            SOS Mới
          </TabsTrigger>
          <TabsTrigger
            value="rescuers"
            className="h-10 rounded-xl px-3 text-[15px] font-semibold tracking-tight data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
          >
            Đội cứu hộ
          </TabsTrigger>
          <TabsTrigger
            value="incidents"
            className="h-10 rounded-xl px-3 text-[15px] font-semibold tracking-tight data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
          >
            Sự cố đội
          </TabsTrigger>
        </TabsList>

        {/* Incoming SOS Tab */}
        <TabsContent
          value="incoming"
          className="m-0 mt-3 flex min-h-0 flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full min-h-0">
            <div className="p-3 space-y-3">
              {/* Auto-cluster all nearby groups button */}
              {autoClusters.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 text-[15px] font-semibold border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20"
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
                  <div className="space-y-2">
                    <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Cụm đã gom ({filteredActiveClusters.length}/
                      {activeClusters.length})
                    </div>
                    <div className="relative">
                      <Icon
                        icon="ph:magnifying-glass"
                        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        value={clusterSearchTerm}
                        onChange={(event) =>
                          setClusterSearchTerm(event.target.value)
                        }
                        placeholder="Tìm theo ID cụm hoặc SOS ID"
                        className="h-9 pl-8 pr-8 text-[14px]"
                      />
                      {clusterSearchTerm.trim().length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setClusterSearchTerm("")}
                        >
                          <Icon icon="ph:x" className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {filteredActiveClusters.length > 0 ? (
                    filteredActiveClusters.map((cluster) => {
                      const clusterStatus = resolveClusterStatus(cluster);
                      const isAnalyzing =
                        isAnalyzingCluster && analyzingClusterId === cluster.id;
                      const sosCount =
                        cluster.sosRequestCount || cluster.sosRequestIds.length;
                      const isExpanded =
                        expandedClusters.has(cluster.id) ||
                        selectedClusterId === cluster.id;
                      const clusterSosIdSet = new Set(
                        cluster.sosRequestIds.map(normalizeSOSRequestId),
                      );
                      const clusterSOS = sosRequests.filter((s) =>
                        clusterSosIdSet.has(normalizeSOSRequestId(s.id)),
                      );
                      const unresolvedClusterSOS = clusterSOS.filter((s) => {
                        const bucket = getSOSStatusBucket(s.status);
                        return bucket === "pending" || bucket === "active";
                      });
                      const pendingClusterSOS = unresolvedClusterSOS.filter(
                        (s) => getSOSStatusBucket(s.status) === "pending",
                      );
                      const activeClusterSOS = unresolvedClusterSOS.filter(
                        (s) => getSOSStatusBucket(s.status) === "active",
                      );
                      const rescuedClusterSOS = clusterSOS.filter(
                        (s) => getSOSStatusBucket(s.status) === "resolved",
                      );
                      const cancelledClusterSOS = clusterSOS.filter(
                        (s) => getSOSStatusBucket(s.status) === "cancelled",
                      );
                      const displayClusterSOS = [...unresolvedClusterSOS].sort(
                        (left, right) => {
                          const statusDelta =
                            getSOSStatusSortWeight(left.status) -
                            getSOSStatusSortWeight(right.status);

                          if (statusDelta !== 0) {
                            return statusDelta;
                          }

                          return (
                            right.createdAt.getTime() - left.createdAt.getTime()
                          );
                        },
                      );

                      return (
                        <div
                          key={cluster.id}
                          className={cn(
                            "rounded-xl border overflow-hidden",
                            CLUSTER_CONTAINER_CLASS_BY_SEVERITY[
                              cluster.severityLevel
                            ],
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
                            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <TreeStructure
                                  className="h-4 w-4 text-violet-600 dark:text-violet-400"
                                  weight="fill"
                                />
                                <span className="text-[15px] font-semibold">
                                  Cụm #{cluster.id}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[14px] h-6 px-2 border-0 leading-none whitespace-nowrap shrink-0",
                                    CLUSTER_SEVERITY_BADGE_CLASS_BY_SEVERITY[
                                      cluster.severityLevel
                                    ],
                                  )}
                                >
                                  {
                                    CLUSTER_SEVERITY_LABELS[
                                      cluster.severityLevel
                                    ]
                                  }
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[14px] h-6 px-2 border-0 leading-none whitespace-nowrap shrink-0",
                                    CLUSTER_STATUS_BADGE_CLASS_BY_STATUS[
                                      clusterStatus
                                    ],
                                  )}
                                >
                                  {CLUSTER_STATUS_LABELS[clusterStatus]}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                <span className="text-[14px] text-muted-foreground whitespace-nowrap">
                                  {pendingClusterSOS.length > 0
                                    ? `${pendingClusterSOS.length} chờ xử lý`
                                    : activeClusterSOS.length > 0
                                      ? `${activeClusterSOS.length} đang cứu hộ`
                                      : unresolvedClusterSOS.length > 0
                                        ? `${unresolvedClusterSOS.length} chờ/đang cứu`
                                        : rescuedClusterSOS.length > 0
                                          ? `${rescuedClusterSOS.length} đã xử lý`
                                          : cancelledClusterSOS.length > 0
                                            ? `${cancelledClusterSOS.length} đã hủy`
                                            : `${sosCount} SOS`}
                                </span>
                                {isExpanded ? (
                                  <CaretUp className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Cluster info */}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[14px] text-muted-foreground mt-1.5">
                              {cluster.victimEstimated && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" weight="fill" />~
                                  {cluster.victimEstimated} nạn nhân
                                </span>
                              )}
                              {cluster.waterLevel && (
                                <span className="flex items-center gap-1">
                                  <WaterLevelIcon />
                                  {cluster.waterLevel}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expandable SOS list */}
                          {isExpanded && (
                            <>
                              <div className="border-t border-inherit divide-y divide-inherit">
                                {displayClusterSOS.length > 0 ? (
                                  displayClusterSOS.map((sos) => (
                                    <div
                                      key={sos.id}
                                      className={cn(
                                        "px-3 py-2 cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5",
                                        selectedSOS?.id === sos.id &&
                                          "bg-black/10 dark:bg-white/10",
                                      )}
                                      onClick={() => onSOSSelect(sos)}
                                    >
                                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                          <span className="text-[14px] font-mono font-semibold text-foreground/90 whitespace-nowrap">
                                            SOS {sos.id}
                                          </span>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <Badge
                                              variant={
                                                PRIORITY_BADGE_VARIANT[
                                                  sos.priority
                                                ]
                                              }
                                              className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0"
                                            >
                                              {PRIORITY_LABELS[sos.priority]}
                                            </Badge>
                                            <Badge
                                              variant={getSOSStatusBadgeVariant(
                                                sos.status,
                                              )}
                                              className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0"
                                            >
                                              {getSOSStatusLabel(sos.status)}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-[14px] text-muted-foreground self-end sm:self-auto whitespace-nowrap">
                                          <Clock className="h-3 w-3" />
                                          <TimeElapsed date={sos.createdAt} />
                                        </div>
                                      </div>
                                      <p className="text-[14px] text-muted-foreground line-clamp-1 mt-1">
                                        {sos.message}
                                      </p>
                                    </div>
                                  ))
                                ) : clusterSOS.length > 0 ? (
                                  <div className="px-3 py-2 text-[14px] text-muted-foreground">
                                    Các SOS trong cụm này đã xử lý xong hoặc đã
                                    hủy, nên không còn hiển thị trong danh sách
                                    theo dõi nhanh.
                                  </div>
                                ) : (
                                  cluster.sosRequestIds.map((sosId) => (
                                    <div
                                      key={`cluster-${cluster.id}-fallback-${sosId}`}
                                      className="px-3 py-2"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[14px] font-mono font-semibold text-foreground/90 whitespace-nowrap">
                                          SOS {sosId}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[14px] h-6 px-2 leading-none whitespace-nowrap"
                                        >
                                          Chưa tải chi tiết
                                        </Badge>
                                      </div>
                                      <p className="text-[14px] text-muted-foreground line-clamp-1 mt-1">
                                        Dữ liệu SOS chưa đồng bộ trong danh sách
                                        hiện tại.
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Action buttons + Missions (uses hook inside) */}
                              <ClusterActionButtons
                                clusterId={cluster.id}
                                clusterStatus={clusterStatus}
                                isAnalyzing={!!isAnalyzing}
                                isAnalyzingCluster={isAnalyzingCluster}
                                analyzingStatus={analyzingStatus}
                                onAnalyzeCluster={onAnalyzeCluster}
                                onViewClusterPlan={onViewClusterPlan}
                                onManualMission={onManualMission}
                                onViewMission={onViewMission}
                              />
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-3 text-[14px] text-muted-foreground">
                      Không tìm thấy cụm phù hợp với từ khóa "
                      {clusterSearchTerm.trim()}".
                    </div>
                  )}
                </>
              )}

              {/* Auto-detected clusters */}
              {autoClusters.length > 0 && (
                <>
                  <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Cụm tự động phát hiện ({autoClusters.length})
                  </div>
                  {autoClusters.map((cluster, clusterIdx) => {
                    const highestPriority = cluster.reduce(
                      (best, s) => {
                        return PRIORITY_ORDER[s.priority] < PRIORITY_ORDER[best]
                          ? s.priority
                          : best;
                      },
                      "P4" as "P1" | "P2" | "P3" | "P4",
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
                            <span className="text-[15px] font-semibold text-violet-700 dark:text-violet-300">
                              Cụm {clusterIdx + 1} • {cluster.length} SOS
                            </span>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-9 text-[14px] px-3 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
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
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                  <Badge
                                    variant={
                                      PRIORITY_BADGE_VARIANT[sos.priority]
                                    }
                                    className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0"
                                  >
                                    {PRIORITY_LABELS[sos.priority]}
                                  </Badge>
                                  <span className="text-[14px] font-mono text-muted-foreground">
                                    SOS {sos.id}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[14px] text-muted-foreground self-end sm:self-auto whitespace-nowrap">
                                  <Clock className="h-3 w-3" />
                                  <TimeElapsed date={sos.createdAt} />
                                </div>
                              </div>
                              <p className="text-[14px] text-muted-foreground line-clamp-1 mt-1">
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
                  <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-1">
                    Chờ xử lý ({standaloneRequests.length})
                  </div>
                  {standaloneRequests.map((sos) => (
                    <div
                      key={sos.id}
                      className={cn(
                        "rounded-xl border overflow-hidden",
                        PRIORITY_BORDER_COLOR[sos.priority],
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
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="text-[14px] font-mono font-semibold text-foreground/90 whitespace-nowrap">
                              SOS {sos.id}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant={PRIORITY_BADGE_VARIANT[sos.priority]}
                                className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0"
                              >
                                {PRIORITY_LABELS[sos.priority]}
                              </Badge>
                              <Badge
                                variant="warning"
                                className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0"
                              >
                                Chờ
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[14px] text-muted-foreground self-end sm:self-auto whitespace-nowrap">
                            <Clock className="h-3 w-3" />
                            <TimeElapsed date={sos.createdAt} />
                          </div>
                        </div>
                        <p className="text-[14px] text-muted-foreground line-clamp-1 mt-1">
                          {sos.message}
                        </p>
                      </div>
                      <div className="px-3 py-2 border-t border-inherit space-y-1.5">
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full h-9 text-[14px] bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
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
                            className="w-full h-9 text-[14px] border-orange-300/60 dark:border-orange-700/60 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
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

              {/* Empty state when no requests at all */}
              {pendingRequests.length === 0 &&
                standaloneRequests.length === 0 &&
                activeClusters.length === 0 &&
                autoClusters.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Pulse className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-[15px]">Không có yêu cầu SOS nào</p>
                  </div>
                )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Rescuers Tab */}
        <TabsContent
          value="rescuers"
          className="m-0 mt-3 flex min-h-0 flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full min-h-0">
            <div className="p-3 space-y-3">
              <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Sẵn sàng ({availableRescuers.length})
              </div>
              {availableRescuers.map((rescuer) => (
                <RescuerCard
                  key={rescuer.id}
                  rescuer={rescuer}
                  onClick={() => onRescuerSelect(rescuer)}
                />
              ))}

              <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">
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

        {/* Team Incidents Tab */}
        <TabsContent
          value="incidents"
          className="m-0 mt-3 flex min-h-0 flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full min-h-0">
            <div className="p-3 space-y-3">
              <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Mới báo cáo ({reportedIncidents.length})
              </div>
              {reportedIncidents.map((incident) => (
                <TeamIncidentCard
                  key={incident.incidentId}
                  incident={incident}
                  isSelected={
                    selectedTeamIncident?.incidentId === incident.incidentId
                  }
                  onClick={() => onTeamIncidentSelect?.(incident)}
                />
              ))}

              <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">
                Đã tiếp nhận ({acknowledgedIncidents.length})
              </div>
              {acknowledgedIncidents.map((incident) => (
                <TeamIncidentCard
                  key={incident.incidentId}
                  incident={incident}
                  isSelected={
                    selectedTeamIncident?.incidentId === incident.incidentId
                  }
                  onClick={() => onTeamIncidentSelect?.(incident)}
                />
              ))}

              <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">
                Đã xử lý ({resolvedIncidents.length})
              </div>
              {resolvedIncidents.map((incident) => (
                <TeamIncidentCard
                  key={incident.incidentId}
                  incident={incident}
                  isSelected={
                    selectedTeamIncident?.incidentId === incident.incidentId
                  }
                  onClick={() => onTeamIncidentSelect?.(incident)}
                />
              ))}

              {otherIncidents.length > 0 && (
                <>
                  <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">
                    Trạng thái khác ({otherIncidents.length})
                  </div>
                  {otherIncidents.map((incident) => (
                    <TeamIncidentCard
                      key={incident.incidentId}
                      incident={incident}
                      isSelected={
                        selectedTeamIncident?.incidentId === incident.incidentId
                      }
                      onClick={() => onTeamIncidentSelect?.(incident)}
                    />
                  ))}
                </>
              )}

              {teamIncidents.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Warning className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-[15px]">Hiện chưa có sự cố đội cứu hộ</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SOSSidebar;

function TeamIncidentCard({
  incident,
  isSelected,
  onClick,
}: {
  incident: TeamIncidentEntity;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusVariant: Record<string, "destructive" | "warning" | "success"> = {
    Reported: "destructive",
    Acknowledged: "warning",
    Resolved: "success",
  };

  const statusLabel: Record<string, string> = {
    Reported: "Mới báo cáo",
    Acknowledged: "Đã tiếp nhận",
    Resolved: "Đã xử lý",
  };

  const reportedAt = Number.isNaN(Date.parse(incident.reportedAt))
    ? incident.reportedAt
    : new Date(incident.reportedAt).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
  const reporterName = getIncidentReporterName(incident.reportedBy);
  const reporterPhone = getIncidentReporterPhone(incident.reportedBy);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md py-3",
        isSelected && "ring-2 ring-primary",
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">
              Sự cố #{incident.incidentId}
            </p>
            <p className="text-[14px] text-muted-foreground">
              Đội #{incident.missionTeamId}
            </p>
          </div>
          <Badge variant={statusVariant[incident.status] ?? "warning"}>
            {statusLabel[incident.status] ?? incident.status}
          </Badge>
        </div>

        <p className="text-[14px] text-muted-foreground line-clamp-2">
          {incident.description}
        </p>

        <div className="mt-2 space-y-1 text-[14px] text-muted-foreground">
          <p className="flex items-center gap-1">
            <User className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{reporterName}</span>
          </p>
          {reporterPhone && (
            <p className="flex items-center gap-1">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{reporterPhone}</span>
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[14px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" weight="fill" />
            {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
          </span>
          <span>{reportedAt}</span>
        </div>
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
            <span className="text-[14px] font-mono">
              #{mission.id.split("-")[1]}
            </span>
          </div>
        </div>

        {rescuer && (
          <div className="flex items-center gap-2 text-[15px] mb-2">
            <RescuerTypeIcon type={rescuer.type} className="h-4 w-4" />
            <span className="font-medium">{rescuer.name}</span>
          </div>
        )}

        <div className="space-y-1">
          {mission.steps.map((step, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-2 text-[14px]",
                idx === 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[14px] font-bold",
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
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center border border-border/60">
            <RescuerTypeIcon type={rescuer.type} className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-[15px]">{rescuer.name}</div>
            <div className="text-[14px] text-muted-foreground">
              {rescuerTypeLabels[rescuer.type]}
            </div>
          </div>
          <Badge
            variant={rescuer.status === "AVAILABLE" ? "success" : "secondary"}
          >
            {rescuer.status === "AVAILABLE" ? "Sẵn sàng" : "Bận"}
          </Badge>
        </div>

        <div className="mt-2 flex items-center justify-between text-[14px]">
          <div className="text-muted-foreground">
            Tải: {rescuer.currentLoad}/{rescuer.capacity}
          </div>
          <div className="flex gap-1">
            {rescuer.capabilities.map((cap, idx) => (
              <Badge key={idx} variant="outline" className="text-[14px]">
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
  clusterStatus,
  isAnalyzing,
  isAnalyzingCluster,
  analyzingStatus,
  onAnalyzeCluster,
  onViewClusterPlan,
  onManualMission,
}: {
  clusterId: number;
  clusterStatus: ClusterLifecycleStatus;
  isAnalyzing: boolean;
  isAnalyzingCluster: boolean;
  analyzingStatus?: string;
  onAnalyzeCluster: (clusterId: number) => void;
  onViewClusterPlan?: (clusterId: number) => void;
  onViewMission?: (clusterId: number, missionId: number) => void;
  onManualMission?: (clusterId: number) => void;
}) {
  const hasMission =
    clusterStatus === "InProgress" || clusterStatus === "Completed";
  const hasSuggestion = clusterStatus === "Suggested";
  const canViewPlan = Boolean(
    onViewClusterPlan && (hasMission || hasSuggestion),
  );

  return (
    <div className="px-3 py-2 border-t border-inherit space-y-1.5">
      {hasMission ? (
        // Mission exists — show view plan + re-analyze
        <>
          {canViewPlan && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-[14px] border-emerald-300/60 dark:border-emerald-700/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              onClick={(e) => {
                e.stopPropagation();
                onViewClusterPlan?.(clusterId);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Xem kế hoạch
            </Button>
          )}
          {onManualMission && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-[14px] border-orange-300/60 dark:border-orange-700/60 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              onClick={(e) => {
                e.stopPropagation();
                onManualMission(clusterId);
              }}
            >
              <PencilSimpleLine className="h-3 w-3 mr-1" weight="fill" />
              Tạo nhiệm vụ thủ công
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-[14px] border-blue-300/60 dark:border-blue-700/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            onClick={(e) => {
              e.stopPropagation();
              onAnalyzeCluster(clusterId);
            }}
            disabled={isAnalyzingCluster}
          >
            {isAnalyzing ? (
              <div className="flex items-center w-full justify-center overflow-hidden">
                <Spinner className="h-3 w-3 mr-1 shrink-0 animate-spin" />
                <span className="truncate">
                  {analyzingStatus || "Đang phân tích..."}
                </span>
              </div>
            ) : (
              <>
                <Lightning className="h-3 w-3 mr-1" weight="fill" />
                Phân tích lại
              </>
            )}
          </Button>
        </>
      ) : (
        // No mission yet — allow either manual creation or AI analysis
        <>
          {canViewPlan && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-[14px] border-emerald-300/60 dark:border-emerald-700/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              onClick={(e) => {
                e.stopPropagation();
                onViewClusterPlan?.(clusterId);
              }}
              disabled={isAnalyzingCluster}
            >
              <Eye className="h-3 w-3 mr-1" />
              Xem kế hoạch
            </Button>
          )}
          {onManualMission && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-[14px] border-orange-300/60 dark:border-orange-700/60 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              onClick={(e) => {
                e.stopPropagation();
                onManualMission(clusterId);
              }}
              disabled={isAnalyzingCluster}
            >
              <PencilSimpleLine className="h-3 w-3 mr-1" weight="fill" />
              Tạo nhiệm vụ thủ công
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            className="w-full h-9 text-[14px] bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onAnalyzeCluster(clusterId);
            }}
            disabled={isAnalyzingCluster}
          >
            {isAnalyzing ? (
              <div className="flex items-center w-full justify-center overflow-hidden">
                <Spinner className="h-3 w-3 mr-1 shrink-0 animate-spin" />
                <span className="truncate">
                  {analyzingStatus || "AI đang phân tích..."}
                </span>
              </div>
            ) : (
              <>
                <Lightning className="h-3 w-3 mr-1" weight="fill" />
                AI Phân tích Rescue Plan
              </>
            )}
          </Button>
        </>
      )}
    </div>
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
        <div className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
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
        <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
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
  isExpanded: _isExpanded,
  onToggle: _onToggle,
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
    <div
      className={cn(
        "rounded-lg border bg-background/60 overflow-hidden transition-colors",
        onViewMission && clusterId && "cursor-pointer hover:bg-muted/40",
      )}
      onClick={() => {
        if (onViewMission && clusterId) {
          onViewMission(clusterId, mission.id);
        }
      }}
    >
      <div className="flex items-center justify-between px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <Rocket className="h-3 w-3 text-orange-500" weight="fill" />
          <span className="text-[14px] font-semibold">NV #{mission.id}</span>
          <span
            className={cn(
              "text-[14px] font-semibold px-1.5 py-0.5 rounded",
              status.color,
            )}
          >
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] text-muted-foreground">
            {mission.activityCount} bước
          </span>
          {onViewMission && clusterId && (
            <CaretRight className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Compact info row */}
      <div className="flex items-center gap-3 px-2.5 pb-2 text-[14px] text-muted-foreground">
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
    </div>
  );
}

// ── ClusterMissionsGroup: used in the Missions tab to show all missions per cluster ──

function ClusterMissionsGroup({ cluster }: { cluster: SOSClusterEntity }) {
  const { data: missionsData, isLoading } = useMissions(cluster.id);
  const [expandedMissionId, setExpandedMissionId] = useState<number | null>(
    null,
  );

  const missions = missionsData?.missions ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-[14px] text-muted-foreground py-2">
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
        <span className="text-[14px] font-semibold">Cụm #{cluster.id}</span>
        <span className="text-[14px] text-muted-foreground">
          {severityLabels[cluster.severityLevel] || cluster.severityLevel}
        </span>
        <span className="text-[14px] text-muted-foreground ml-auto">
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
