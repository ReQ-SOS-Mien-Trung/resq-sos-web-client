"use client";

import { useState, useEffect, useMemo } from "react";
import { SOSRequest, SOSSidebarProps } from "@/type";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useRemoveSOSRequestFromCluster } from "@/services/sos_cluster/hooks";
import { useSOSPriorityLevels } from "@/services/sos_request/hooks";
import type {
  SOSPriorityLevel,
  SOSPriorityLevelOption,
  SOSRequestStatus,
} from "@/services/sos_request/type";
import {
  PRIORITY_BADGE_VARIANT,
  PRIORITY_BORDER_COLOR,
  PRIORITY_LABELS,
} from "@/lib/priority";
import type {
  ClusterLifecycleStatus,
  ClusterSeverityLevel,
  SOSClusterEntity,
} from "@/services/sos_cluster/type";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Warning,
  Clock,
  Pulse,
  TreeStructure,
  Spinner,
  Lightning,
  Users,
  CaretDown,
  CaretUp,
  PencilSimpleLine,
  Check,
  Eye,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";

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

function WaterLevelIcon({ className }: { className?: string }) {
  return (
    <Icon
      icon="ph:waves"
      className={cn("h-3.5 w-3.5 text-sky-500", className)}
    />
  );
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

function toPositiveSOSRequestId(id: string | number): number | null {
  const normalized = Number(String(id).trim());
  if (!Number.isFinite(normalized)) {
    return null;
  }

  const integer = Math.floor(normalized);
  return integer > 0 ? integer : null;
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

function canDetachSOSFromCluster(
  clusterStatus: ClusterLifecycleStatus,
  sosStatus: SOSRequest["status"],
): boolean {
  if (clusterStatus !== "Pending" && clusterStatus !== "Suggested") {
    return false;
  }

  const normalized = normalizeSOSStatus(sosStatus);
  return normalized === "PENDING" || normalized === "SUGGESTED";
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

const STANDALONE_REQUESTS_PAGE_SIZE = 8;
const BACKEND_CLUSTERS_PAGE_SIZE = 6;
const AUTO_CLUSTERS_PAGE_SIZE = 4;

function getTotalPages(totalItems: number, pageSize: number): number {
  if (totalItems <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), totalPages);
}

type PaginatedAutoCluster = {
  cluster: SOSRequest[];
  sourceIndex: number;
};

type ClusterSOSRemoveCandidate = {
  clusterId: number;
  sosRequestId: number;
  displaySOSId: string;
};

type SidebarTabValue = "incoming" | "clusters";

const SOS_STATUS_FILTER_OPTIONS: Array<{
  key: SOSRequestStatus;
  value: string;
}> = [
  { key: "Pending", value: "Chờ xử lý" },
  { key: "Assigned", value: "Đã giao" },
  { key: "InProgress", value: "Đang thực thi" },
  { key: "Incident", value: "Có sự cố" },
  { key: "Resolved", value: "Đã xử lý" },
  { key: "Cancelled", value: "Đã hủy" },
];

const FALLBACK_PRIORITY_FILTER_OPTIONS: SOSPriorityLevelOption[] = [
  { key: "Critical", value: "Rất Nghiêm trọng" },
  { key: "High", value: "Nghiêm trọng" },
  { key: "Medium", value: "Trung bình" },
  { key: "Low", value: "Thấp" },
];

function PaginationControls({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
}) {
  const totalPages = getTotalPages(totalItems, pageSize);

  if (totalPages <= 1) {
    return null;
  }

  const safePage = clampPage(page, totalPages);
  const rangeStart = (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2">
      <p className="text-[14px] text-muted-foreground">
        {rangeStart}-{rangeEnd}/{totalItems}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[14px]"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          Trước
        </Button>
        <span className="min-w-14 text-center text-[14px] font-medium text-foreground">
          {safePage}/{totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[14px]"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}

const SOSSidebar = ({
  sosRequests,
  rescuers,
  onSOSSelect,
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
  analyzingStatus,
  onManualMission,
  onViewClusterPlan,
  selectedStatuses = [],
  onSelectedStatusesChange,
  selectedPriorityLevels = [],
  onSelectedPriorityLevelsChange,
}: SOSSidebarProps) => {
  const [activeTab, setActiveTab] = useState<SidebarTabValue>("incoming");
  const [manualTabSelectionKey, setManualTabSelectionKey] = useState<
    string | null
  >(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(
    new Set(),
  );
  const [clusterSearchTerm, setClusterSearchTerm] = useState("");
  const [standalonePage, setStandalonePage] = useState(1);
  const [clusterPage, setClusterPage] = useState(1);
  const [autoClusterPage, setAutoClusterPage] = useState(1);
  const [
    manualStandalonePageSelectionKey,
    setManualStandalonePageSelectionKey,
  ] = useState<string | null>(null);
  const [manualClusterPageSelectionKey, setManualClusterPageSelectionKey] =
    useState<string | null>(null);
  const [collapsedSelectionKey, setCollapsedSelectionKey] = useState<
    string | null
  >(null);
  const [removeCandidate, setRemoveCandidate] =
    useState<ClusterSOSRemoveCandidate | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [priorityFilterOpen, setPriorityFilterOpen] = useState(false);

  const {
    mutate: removeSOSRequestFromCluster,
    isPending: isRemovingSOSRequestFromCluster,
  } = useRemoveSOSRequestFromCluster();
  const { data: priorityLevelMetadata = [], isLoading: isPriorityLevelsLoading } =
    useSOSPriorityLevels();

  const priorityFilterOptions = useMemo(
    () =>
      priorityLevelMetadata.length > 0
        ? priorityLevelMetadata
        : FALLBACK_PRIORITY_FILTER_OPTIONS,
    [priorityLevelMetadata],
  );
  const hasSOSFiltersApplied =
    selectedStatuses.length > 0 || selectedPriorityLevels.length > 0;

  const toggleStatusFilter = (status: SOSRequestStatus) => {
    if (!onSelectedStatusesChange) {
      return;
    }

    onSelectedStatusesChange(
      selectedStatuses.includes(status)
        ? selectedStatuses.filter((item) => item !== status)
        : [...selectedStatuses, status],
    );
  };

  const togglePriorityFilter = (priorityLevel: SOSPriorityLevel) => {
    if (!onSelectedPriorityLevelsChange) {
      return;
    }

    onSelectedPriorityLevelsChange(
      selectedPriorityLevels.includes(priorityLevel)
        ? selectedPriorityLevels.filter((item) => item !== priorityLevel)
        : [...selectedPriorityLevels, priorityLevel],
    );
  };

  const clearSOSFilters = () => {
    onSelectedStatusesChange?.([]);
    onSelectedPriorityLevelsChange?.([]);
  };

  const openRemoveSOSDialog = (clusterId: number, sos: SOSRequest) => {
    const sosRequestId = toPositiveSOSRequestId(sos.id);

    if (sosRequestId == null) {
      toast.error("Không thể xác định SOS ID để tách khỏi cụm.");
      return;
    }

    setRemoveCandidate({
      clusterId,
      sosRequestId,
      displaySOSId: String(sos.id),
    });
    setRemoveDialogOpen(true);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (isRemovingSOSRequestFromCluster && !nextOpen) {
      return;
    }

    setRemoveDialogOpen(nextOpen);

    if (!nextOpen) {
      setRemoveCandidate(null);
    }
  };

  const handleConfirmRemoveSOS = () => {
    if (!removeCandidate) {
      return;
    }

    removeSOSRequestFromCluster(
      {
        clusterId: removeCandidate.clusterId,
        sosRequestId: removeCandidate.sosRequestId,
      },
      {
        onSuccess: () => {
          toast.success(
            `Đã tách SOS ${removeCandidate.displaySOSId} khỏi cụm #${removeCandidate.clusterId}.`,
          );
          setExpandedClusters((prev) => {
            const next = new Set(prev);
            next.add(removeCandidate.clusterId);
            return next;
          });
          setActiveTab("clusters");
          setManualTabSelectionKey(selectedSOSId);
          setRemoveDialogOpen(false);
          setRemoveCandidate(null);
        },
        onError: (error) => {
          toast.error(
            error?.message || "Không thể tách SOS khỏi cụm. Vui lòng thử lại.",
          );
        },
      },
    );
  };

  const pendingRequests = sosRequests.filter(
    (s) => getSOSStatusBucket(s.status) === "pending",
  );
  const assignedRequests = sosRequests.filter(
    (s) => getSOSStatusBucket(s.status) === "active",
  );
  const availableRescuers = rescuers.filter((r) => r.status === "AVAILABLE");

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
          // When sidebar filters are active, only keep clusters that still have
          // at least one loaded SOS matching the current filter set.
          return !hasSOSFiltersApplied;
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

        const createdAtDelta =
          getTimestamp(right.createdAt) - getTimestamp(left.createdAt);

        if (createdAtDelta !== 0) {
          return createdAtDelta;
        }

        return right.id - left.id;
      });
  }, [backendClusters, hasSOSFiltersApplied, sosStatusById]);

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

  const currentSelectionClusterKey =
    selectedClusterId != null && selectedSOSId != null
      ? `${selectedClusterId}:${selectedSOSId}`
      : null;

  const standaloneTotalPages = useMemo(
    () =>
      getTotalPages(standaloneRequests.length, STANDALONE_REQUESTS_PAGE_SIZE),
    [standaloneRequests.length],
  );

  const selectedStandalonePage = useMemo(() => {
    if (!selectedSOSId) {
      return null;
    }

    const selectedIndex = standaloneRequests.findIndex(
      (request) => normalizeSOSRequestId(request.id) === selectedSOSId,
    );

    if (selectedIndex < 0) {
      return null;
    }

    return Math.floor(selectedIndex / STANDALONE_REQUESTS_PAGE_SIZE) + 1;
  }, [selectedSOSId, standaloneRequests]);

  const currentStandalonePage = clampPage(
    selectedStandalonePage != null &&
      manualStandalonePageSelectionKey !== selectedSOSId
      ? selectedStandalonePage
      : standalonePage,
    standaloneTotalPages,
  );

  const paginatedStandaloneRequests = useMemo(() => {
    const startIndex =
      (currentStandalonePage - 1) * STANDALONE_REQUESTS_PAGE_SIZE;

    return standaloneRequests.slice(
      startIndex,
      startIndex + STANDALONE_REQUESTS_PAGE_SIZE,
    );
  }, [currentStandalonePage, standaloneRequests]);

  const filteredClustersTotalPages = useMemo(
    () =>
      getTotalPages(filteredActiveClusters.length, BACKEND_CLUSTERS_PAGE_SIZE),
    [filteredActiveClusters.length],
  );

  const selectedClusterPage = useMemo(() => {
    if (selectedClusterId == null) {
      return null;
    }

    const selectedIndex = filteredActiveClusters.findIndex(
      (cluster) => cluster.id === selectedClusterId,
    );

    if (selectedIndex < 0) {
      return null;
    }

    return Math.floor(selectedIndex / BACKEND_CLUSTERS_PAGE_SIZE) + 1;
  }, [filteredActiveClusters, selectedClusterId]);

  const currentClusterPage = clampPage(
    selectedClusterPage != null &&
      manualClusterPageSelectionKey !== selectedSOSId
      ? selectedClusterPage
      : clusterPage,
    filteredClustersTotalPages,
  );

  const paginatedFilteredActiveClusters = useMemo(() => {
    const startIndex = (currentClusterPage - 1) * BACKEND_CLUSTERS_PAGE_SIZE;

    return filteredActiveClusters.slice(
      startIndex,
      startIndex + BACKEND_CLUSTERS_PAGE_SIZE,
    );
  }, [currentClusterPage, filteredActiveClusters]);

  const autoClustersTotalPages = useMemo(
    () => getTotalPages(autoClusters.length, AUTO_CLUSTERS_PAGE_SIZE),
    [autoClusters.length],
  );

  const currentAutoClusterPage = clampPage(
    autoClusterPage,
    autoClustersTotalPages,
  );

  const paginatedAutoClusters = useMemo<PaginatedAutoCluster[]>(() => {
    const startIndex = (currentAutoClusterPage - 1) * AUTO_CLUSTERS_PAGE_SIZE;

    return autoClusters
      .slice(startIndex, startIndex + AUTO_CLUSTERS_PAGE_SIZE)
      .map((cluster, offset) => ({
        cluster,
        sourceIndex: startIndex + offset,
      }));
  }, [autoClusters, currentAutoClusterPage]);

  const currentTab: SidebarTabValue =
    selectedSOSId != null && manualTabSelectionKey !== selectedSOSId
      ? selectedClusterId != null
        ? "clusters"
        : "incoming"
      : activeTab;

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

      <div className="border-b bg-background/80 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-[14px] font-normal"
              >
                Trạng thái
                {selectedStatuses.length > 0 ? (
                  <Badge className="h-4.5 rounded-full px-1.5 text-[11px]">
                    {selectedStatuses.length}
                  </Badge>
                ) : (
                  <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1.5" align="start">
              {SOS_STATUS_FILTER_OPTIONS.map((option) => {
                const checked = selectedStatuses.includes(option.key);

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleStatusFilter(option.key)}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[14px] transition-colors hover:bg-muted/60"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-transparent",
                      )}
                    >
                      <Check className="h-2.5 w-2.5" weight="bold" />
                    </span>
                    <span className={checked ? "font-medium" : undefined}>
                      {option.value}
                    </span>
                  </button>
                );
              })}
              {selectedStatuses.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onSelectedStatusesChange?.([])}
                  className="mt-1 flex w-full items-center gap-2 border-t border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  Xóa lọc trạng thái
                </button>
              ) : null}
            </PopoverContent>
          </Popover>

          <Popover
            open={priorityFilterOpen}
            onOpenChange={setPriorityFilterOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-[14px] font-normal"
              >
                Mức ưu tiên
                {selectedPriorityLevels.length > 0 ? (
                  <Badge className="h-4.5 rounded-full px-1.5 text-[11px]">
                    {selectedPriorityLevels.length}
                  </Badge>
                ) : isPriorityLevelsLoading ? (
                  <Spinner className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1.5" align="start">
              {priorityFilterOptions.map((option) => {
                const checked = selectedPriorityLevels.includes(option.key);

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => togglePriorityFilter(option.key)}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[14px] transition-colors hover:bg-muted/60"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-transparent",
                      )}
                    >
                      <Check className="h-2.5 w-2.5" weight="bold" />
                    </span>
                    <span className={checked ? "font-medium" : undefined}>
                      {option.value}
                    </span>
                  </button>
                );
              })}
              {selectedPriorityLevels.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onSelectedPriorityLevelsChange?.([])}
                  className="mt-1 flex w-full items-center gap-2 border-t border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  Xóa lọc mức ưu tiên
                </button>
              ) : null}
            </PopoverContent>
          </Popover>

          {hasSOSFiltersApplied ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 px-2 text-[13px] text-muted-foreground"
              onClick={clearSOSFilters}
            >
              <X className="h-3.5 w-3.5" />
              Xóa bộ lọc
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          {sosRequests.length} SOS trong vùng bản đồ hiện tại
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onValueChange={(nextValue) => {
          const normalizedValue: SidebarTabValue =
            nextValue === "clusters" ? "clusters" : "incoming";

          setActiveTab(normalizedValue);
          setManualTabSelectionKey(selectedSOSId);
        }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mx-3 mt-3 grid h-auto w-auto grid-cols-2 rounded-2xl border border-border/60 bg-muted/40 p-1 shadow-inner dark:border-white/10 dark:bg-white/5">
          <TabsTrigger
            value="incoming"
            className="h-10 rounded-xl px-3 text-[15px] font-semibold tracking-tight data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
          >
            SOS Mới
          </TabsTrigger>
          <TabsTrigger
            value="clusters"
            className="h-10 rounded-xl px-3 text-[15px] font-semibold tracking-tight data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
          >
            Cụm SOS
          </TabsTrigger>
        </TabsList>

        {/* Incoming SOS Tab */}
        <TabsContent
          value="incoming"
          className="m-0 mt-3 flex min-h-0 flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full min-h-0">
            <div className="p-3 space-y-3">
              {standaloneRequests.length > 0 && (
                <>
                  <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    SOS chưa gom cụm ({standaloneRequests.length})
                  </div>
                  <PaginationControls
                    page={currentStandalonePage}
                    totalItems={standaloneRequests.length}
                    pageSize={STANDALONE_REQUESTS_PAGE_SIZE}
                    onPageChange={(nextPage) => {
                      setStandalonePage(nextPage);
                      setManualStandalonePageSelectionKey(selectedSOSId);
                    }}
                  />
                  {paginatedStandaloneRequests.map((sos) => (
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

              {standaloneRequests.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Pulse className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-[15px]">
                    {pendingRequests.length > 0 ||
                    activeClusters.length > 0 ||
                    autoClusters.length > 0
                      ? "Không còn SOS lẻ. Chuyển sang tab Cụm SOS để xử lý theo cụm."
                      : "Không có yêu cầu SOS nào"}
                  </p>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* SOS Clusters Tab */}
        <TabsContent
          value="clusters"
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
                    <p className="text-[13px] text-muted-foreground">
                      Icon tách chỉ hiện khi cụm/SOS đang ở trạng thái Pending
                      hoặc Suggested.
                    </p>
                    <div className="relative">
                      <Icon
                        icon="ph:magnifying-glass"
                        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        value={clusterSearchTerm}
                        onChange={(event) => {
                          setClusterSearchTerm(event.target.value);
                          setClusterPage(1);
                          setManualClusterPageSelectionKey(selectedSOSId);
                        }}
                        placeholder="Tìm theo ID cụm hoặc SOS ID"
                        className="h-9 pl-8 pr-8 text-[14px]"
                      />
                      {clusterSearchTerm.trim().length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                          onClick={() => {
                            setClusterSearchTerm("");
                            setClusterPage(1);
                            setManualClusterPageSelectionKey(selectedSOSId);
                          }}
                        >
                          <Icon icon="ph:x" className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <PaginationControls
                    page={currentClusterPage}
                    totalItems={filteredActiveClusters.length}
                    pageSize={BACKEND_CLUSTERS_PAGE_SIZE}
                    onPageChange={(nextPage) => {
                      setClusterPage(nextPage);
                      setManualClusterPageSelectionKey(selectedSOSId);
                    }}
                  />
                  {filteredActiveClusters.length > 0 ? (
                    <>
                      {paginatedFilteredActiveClusters.map((cluster) => {
                        const clusterStatus = resolveClusterStatus(cluster);
                        const isAnalyzing =
                          isAnalyzingCluster &&
                          analyzingClusterId === cluster.id;
                        const sosCount =
                          cluster.sosRequestCount ||
                          cluster.sosRequestIds.length;
                        const isExpanded =
                          expandedClusters.has(cluster.id) ||
                          (selectedClusterId === cluster.id &&
                            currentSelectionClusterKey !==
                              collapsedSelectionKey);
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
                        const displayClusterSOS = [
                          ...unresolvedClusterSOS,
                        ].sort((left, right) => {
                          const statusDelta =
                            getSOSStatusSortWeight(left.status) -
                            getSOSStatusSortWeight(right.status);

                          if (statusDelta !== 0) {
                            return statusDelta;
                          }

                          return (
                            right.createdAt.getTime() - left.createdAt.getTime()
                          );
                        });

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
                            <div
                              className="px-3 py-2.5 cursor-pointer"
                              onClick={() => {
                                setExpandedClusters((prev) => {
                                  const next = new Set(prev);
                                  if (isExpanded) {
                                    next.delete(cluster.id);
                                  } else {
                                    next.add(cluster.id);
                                  }
                                  return next;
                                });

                                setCollapsedSelectionKey((previousKey) => {
                                  if (
                                    selectedClusterId !== cluster.id ||
                                    currentSelectionClusterKey == null
                                  ) {
                                    return previousKey;
                                  }

                                  return isExpanded
                                    ? currentSelectionClusterKey
                                    : null;
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

                            {isExpanded && (
                              <>
                                <div className="border-t border-inherit divide-y divide-inherit">
                                  {displayClusterSOS.length > 0 ? (
                                    displayClusterSOS.map((sos) => {
                                      const canDetachThisSOS =
                                        canDetachSOSFromCluster(
                                          clusterStatus,
                                          sos.status,
                                        );
                                      const isRemovingThisSOS =
                                        canDetachThisSOS &&
                                        isRemovingSOSRequestFromCluster &&
                                        removeCandidate?.clusterId ===
                                          cluster.id &&
                                        removeCandidate?.displaySOSId ===
                                          String(sos.id);

                                      return (
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
                                              {canDetachThisSOS ? (
                                                <Button
                                                  type="button"
                                                  size="icon"
                                                  variant="ghost"
                                                  className="h-7 w-7 rounded-full text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    openRemoveSOSDialog(
                                                      cluster.id,
                                                      sos,
                                                    );
                                                  }}
                                                  disabled={isRemovingThisSOS}
                                                  aria-label={
                                                    isRemovingThisSOS
                                                      ? "Đang tách SOS"
                                                      : `Tách SOS ${sos.id} khỏi cụm`
                                                  }
                                                  title={
                                                    isRemovingThisSOS
                                                      ? "Đang tách SOS..."
                                                      : "Tách SOS khỏi cụm"
                                                  }
                                                >
                                                  {isRemovingThisSOS ? (
                                                    <Spinner className="h-3.5 w-3.5 animate-spin" />
                                                  ) : (
                                                    <Icon
                                                      icon="ph:link-break-bold"
                                                      className="h-3.5 w-3.5"
                                                    />
                                                  )}
                                                  <span className="sr-only">
                                                    {isRemovingThisSOS
                                                      ? "Đang tách SOS"
                                                      : "Tách SOS"}
                                                  </span>
                                                </Button>
                                              ) : null}
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <Badge
                                                  variant={
                                                    PRIORITY_BADGE_VARIANT[
                                                      sos.priority
                                                    ]
                                                  }
                                                  className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0"
                                                >
                                                  {
                                                    PRIORITY_LABELS[
                                                      sos.priority
                                                    ]
                                                  }
                                                </Badge>
                                                <Badge
                                                  variant={getSOSStatusBadgeVariant(
                                                    sos.status,
                                                  )}
                                                  className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0"
                                                >
                                                  {getSOSStatusLabel(
                                                    sos.status,
                                                  )}
                                                </Badge>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-[14px] text-muted-foreground self-end sm:self-auto whitespace-nowrap">
                                              <Clock className="h-3 w-3" />
                                              <TimeElapsed
                                                date={sos.createdAt}
                                              />
                                            </div>
                                          </div>
                                          <p className="text-[14px] text-muted-foreground line-clamp-1 mt-1">
                                            {sos.message}
                                          </p>
                                        </div>
                                      );
                                    })
                                  ) : clusterSOS.length > 0 ? (
                                    <div className="px-3 py-2 text-[14px] text-muted-foreground">
                                      Các SOS trong cụm này đã xử lý xong hoặc
                                      đã hủy, nên không còn hiển thị trong danh
                                      sách theo dõi nhanh.
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
                                          Dữ liệu SOS chưa đồng bộ trong danh
                                          sách hiện tại.
                                        </p>
                                      </div>
                                    ))
                                  )}
                                </div>

                                <ClusterActionButtons
                                  clusterId={cluster.id}
                                  clusterStatus={clusterStatus}
                                  isAnalyzing={!!isAnalyzing}
                                  isAnalyzingCluster={isAnalyzingCluster}
                                  analyzingStatus={analyzingStatus}
                                  onAnalyzeCluster={onAnalyzeCluster}
                                  onViewClusterPlan={onViewClusterPlan}
                                  onManualMission={onManualMission}
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-3 text-[14px] text-muted-foreground">
                      Không tìm thấy cụm phù hợp với từ khóa "
                      {clusterSearchTerm.trim()}".
                    </div>
                  )}
                </>
              )}

              {autoClusters.length > 0 && (
                <>
                  <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Cụm tự động phát hiện ({autoClusters.length})
                  </div>
                  <PaginationControls
                    page={currentAutoClusterPage}
                    totalItems={autoClusters.length}
                    pageSize={AUTO_CLUSTERS_PAGE_SIZE}
                    onPageChange={setAutoClusterPage}
                  />
                  {paginatedAutoClusters.map(({ cluster, sourceIndex }) => {
                    const isProcessing =
                      isCreatingCluster &&
                      processingClusterIndex === sourceIndex;

                    return (
                      <div
                        key={sourceIndex}
                        className="rounded-xl border border-violet-200 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-900/10 overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-violet-100/60 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800/30">
                          <div className="flex items-center gap-2">
                            <TreeStructure
                              className="h-4 w-4 text-violet-600 dark:text-violet-400"
                              weight="fill"
                            />
                            <span className="text-[15px] font-semibold text-violet-700 dark:text-violet-300">
                              Cụm {sourceIndex + 1} • {cluster.length} SOS
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

              {activeClusters.length === 0 && autoClusters.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Pulse className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-[15px]">Chưa có cụm SOS nào</p>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Dialog open={removeDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận tách SOS khỏi cụm</DialogTitle>
            <DialogDescription>
              {removeCandidate
                ? `Bạn có chắc muốn tách SOS ${removeCandidate.displaySOSId} ra khỏi cụm #${removeCandidate.clusterId}?`
                : "Bạn có chắc muốn tách SOS ra khỏi cụm hiện tại?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isRemovingSOSRequestFromCluster}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemoveSOS}
              disabled={isRemovingSOSRequestFromCluster || !removeCandidate}
            >
              {isRemovingSOSRequestFromCluster ? (
                <>
                  <Spinner className="h-3.5 w-3.5 animate-spin" />
                  Đang tách...
                </>
              ) : (
                "Xác nhận tách"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SOSSidebar;

// ── ClusterActionButtons: action buttons for each backend cluster ──

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
