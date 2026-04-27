"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { SOSRequest, SOSSidebarProps } from "@/type";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import {
  useRemoveSOSRequestFromCluster,
  useAddSOSRequestToCluster,
} from "@/services/sos_cluster/hooks";
import { useSOSRequestsByIds } from "@/services/sos_request/hooks";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import type {
  SOSPriorityLevel,
  SOSRequestStatus,
  SOSRequestTypeFilter,
} from "@/services/sos_request/type";
import { mapSOSRequestEntitiesToSOS } from "@/lib/sos-request-mapper";
import {
  PRIORITY_BADGE_VARIANT,
  PRIORITY_BORDER_COLOR,
  PRIORITY_LABELS,
} from "@/lib/priority";
import {
  getSOSClusterMaxSizeBySeverity,
  getSOSClusterRemainingCapacity,
  getSOSClusterRequestCount,
} from "@/lib/sos-cluster-capacity";
import type {
  ClusterLifecycleStatus,
  ClusterPriorityLevel,
  ClusterSeverityLevel,
  ClusterSOSType,
  SOSClusterEntity,
} from "@/services/sos_cluster/type";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Brain,
  ShieldCheck,
  Tray,
  Trash,
  ArrowsDownUp,
  SortAscending,
  SortDescending,
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
  Pending: "Chờ Xử Lí",
  Suggested: "Đã có gợi ý AI",
  InProgress: "Đang thực hiện",
  Completed: "Đã hoàn thành",
};

const CLUSTER_STATUS_BADGE_CLASS_BY_STATUS: Record<
  ClusterLifecycleStatus,
  string
> = {
  Pending:
    "text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-800/50",
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
type SOSDisplayStatus =
  | SOSRequest["status"]
  | SOSRequestStatus
  | null
  | undefined;

type IncidentGeneratedSOSContext = {
  teamName?: string | null;
  incidentType?: string | null;
  incidentDescription?: string | null;
};

function normalizeSOSStatus(status: SOSDisplayStatus): string {
  return String(status || "")
    .trim()
    .toUpperCase();
}

function getSOSEffectiveStatus(sos: SOSRequest): SOSDisplayStatus {
  return sos.rawStatus ?? sos.status;
}

function getSOSStatusBucket(status: SOSDisplayStatus): SOSStatusBucket {
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
  sosStatus: SOSDisplayStatus,
): boolean {
  if (clusterStatus !== "Pending" && clusterStatus !== "Suggested") {
    return false;
  }

  const normalized = normalizeSOSStatus(sosStatus);
  return normalized === "PENDING" || normalized === "SUGGESTED";
}

function getSOSStatusSortWeight(status: SOSDisplayStatus): number {
  const bucket = getSOSStatusBucket(status);
  if (bucket === "pending") return 0;
  if (bucket === "active") return 1;
  if (bucket === "resolved") return 2;
  return 3;
}

function getSOSStatusLabel(status: SOSDisplayStatus): string {
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
  status: SOSDisplayStatus,
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

function canCreateClusterFromSOS(sos: SOSRequest): boolean {
  return (
    getSOSStatusBucket(getSOSEffectiveStatus(sos)) === "pending" &&
    !sos.clusterId
  );
}

function getIncidentGeneratedSOSContext(
  sos: SOSRequest,
): IncidentGeneratedSOSContext | null {
  const structuredData = sos.structuredData;
  const operationSupport = structuredData?.operation_support;
  const teamIncidentContext = structuredData?.team_incident_context;
  const normalizedOrigin = String(operationSupport?.origin ?? "")
    .trim()
    .toLowerCase();
  const hasIncidentStatus =
    normalizeSOSStatus(getSOSEffectiveStatus(sos)) === "INCIDENT";
  const isFromRescuerIncident =
    normalizedOrigin === "rescuer_incident" ||
    !!teamIncidentContext ||
    hasIncidentStatus ||
    !!sos.latestIncidentNote;

  if (!isFromRescuerIncident) {
    return null;
  }

  return {
    teamName: teamIncidentContext?.team_name ?? null,
    incidentType: teamIncidentContext?.incident_type ?? null,
    incidentDescription:
      teamIncidentContext?.original_incident_description ??
      sos.latestIncidentNote ??
      null,
  };
}

function isIncidentGeneratedSOS(sos: SOSRequest): boolean {
  return getIncidentGeneratedSOSContext(sos) != null;
}

function compareSOSRequests(
  left: SOSRequest,
  right: SOSRequest,
  sort: string = "time:desc",
): number {
  const [field, order] = sort.split(":");
  const isDesc = order === "desc";

  if (field === "time") {
    const leftTime = left.createdAt.getTime();
    const rightTime = right.createdAt.getTime();
    if (leftTime !== rightTime) {
      return isDesc ? rightTime - leftTime : leftTime - rightTime;
    }
  } else if (field === "severity" || field === "priority") {
    // Priority order: P1 > P2 > P3 > P4
    const priorityOrder: Record<string, number> = {
      P1: 0,
      P2: 1,
      P3: 2,
      P4: 3,
    };
    const leftP = priorityOrder[left.priority] ?? 99;
    const rightP = priorityOrder[right.priority] ?? 99;

    if (leftP !== rightP) {
      return isDesc ? leftP - rightP : rightP - leftP;
    }
  }

  // Fallback to ID if everything else is equal
  const leftId = Number(left.id);
  const rightId = Number(right.id);
  if (Number.isFinite(leftId) && Number.isFinite(rightId)) {
    return isDesc ? rightId - leftId : leftId - rightId;
  }

  return String(right.id).localeCompare(String(left.id));
}

function getNewSOSRequestIdsForCluster(
  cluster: SOSClusterEntity,
  sosIds: Array<string | number>,
): number[] {
  const existingIds = new Set(cluster.sosRequestIds.map(normalizeSOSRequestId));
  const nextIds: number[] = [];
  const seenNextIds = new Set<string>();

  for (const sosId of sosIds) {
    const numericId = toPositiveSOSRequestId(sosId);
    if (numericId == null) {
      continue;
    }

    const normalizedId = normalizeSOSRequestId(numericId);
    if (existingIds.has(normalizedId) || seenNextIds.has(normalizedId)) {
      continue;
    }

    seenNextIds.add(normalizedId);
    nextIds.push(numericId);
  }

  return nextIds;
}

function getClusterCapacityLimitMessage(
  cluster: SOSClusterEntity,
  requestCountToAdd: number,
): string | null {
  if (requestCountToAdd <= 0) {
    return null;
  }

  const maxSize = getSOSClusterMaxSizeBySeverity(cluster.severityLevel);
  const currentCount = getSOSClusterRequestCount(cluster);

  if (currentCount + requestCountToAdd <= maxSize) {
    return null;
  }

  const addingText =
    requestCountToAdd > 1 ? ` Bạn đang thêm ${requestCountToAdd} SOS.` : "";

  return `Cụm #${cluster.id} mức ${
    CLUSTER_SEVERITY_LABELS[cluster.severityLevel]
  } chỉ được tối đa ${maxSize} SOS. Hiện đã có ${currentCount}/${maxSize} SOS.${addingText}`;
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

const SOS_PRIORITY_FILTER_OPTIONS: Array<{
  key: SOSPriorityLevel;
  value: string;
}> = [
  { key: "Low", value: "Thấp" },
  { key: "Medium", value: "Trung bình" },
  { key: "High", value: "Cao" },
  { key: "Critical", value: "Khẩn cấp" },
];

const SOS_TYPE_FILTER_OPTIONS: Array<{
  key: SOSRequestTypeFilter;
  value: string;
}> = [
  { key: "Rescue", value: "Cứu hộ" },
  { key: "Relief", value: "Cứu trợ" },
  { key: "Both", value: "Cứu hộ + cứu trợ" },
];

const CLUSTER_STATUS_FILTER_OPTIONS: Array<{
  key: ClusterLifecycleStatus;
  value: string;
}> = [
  { key: "Pending", value: CLUSTER_STATUS_LABELS.Pending },
  { key: "Suggested", value: CLUSTER_STATUS_LABELS.Suggested },
  { key: "InProgress", value: CLUSTER_STATUS_LABELS.InProgress },
  { key: "Completed", value: CLUSTER_STATUS_LABELS.Completed },
];

const CLUSTER_PRIORITY_FILTER_OPTIONS: Array<{
  key: ClusterPriorityLevel;
  value: string;
}> = [
  { key: "Low", value: "Thấp" },
  { key: "Medium", value: "Trung bình" },
  { key: "High", value: "Cao" },
  { key: "Critical", value: "Khẩn cấp" },
];

const CLUSTER_SOS_TYPE_FILTER_OPTIONS: Array<{
  key: ClusterSOSType;
  value: string;
}> = [
  { key: "Rescue", value: "Cứu hộ" },
  { key: "Relief", value: "Cứu trợ" },
  { key: "Both", value: "Cứu hộ + cứu trợ" },
];
const SORT_OPTIONS: Array<{
  key: string;
  label: string;
  icon: any;
}> = [
  { key: "time:desc", label: "Mới nhất trước", icon: Clock },
  { key: "time:asc", label: "Cũ nhất trước", icon: Clock },
  { key: "severity:desc", label: "Nghiêm trọng nhất", icon: Warning },
  { key: "severity:asc", label: "Ít nghiêm trọng nhất", icon: Warning },
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
  incomingRequests,
  incomingPagination,
  isIncomingRequestsLoading = false,
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
  filteredBackendClusters,
  onAnalyzeCluster,
  isAnalyzingCluster = false,
  analyzingClusterId = null,
  analyzingStatus,
  onManualMission,
  onViewClusterPlan,
  selectedStatuses = [],
  onSelectedStatusesChange,
  selectedPriorities = [],
  onSelectedPrioritiesChange,
  selectedSosTypes = [],
  onSelectedSosTypesChange,
  selectedClusterStatuses = [],
  onSelectedClusterStatusesChange,
  selectedClusterPriorities = [],
  onSelectedClusterPrioritiesChange,
  selectedClusterSosTypes = [],
  onSelectedClusterSosTypesChange,
  sosSort = "time:desc",
  onSosSortChange,
  clusterSort = "time:desc",
  onClusterSortChange,
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
  const [sosTypeFilterOpen, setSosTypeFilterOpen] = useState(false);
  const [clusterStatusFilterOpen, setClusterStatusFilterOpen] = useState(false);
  const [clusterPriorityFilterOpen, setClusterPriorityFilterOpen] =
    useState(false);
  const [clusterSosTypeFilterOpen, setClusterSosTypeFilterOpen] =
    useState(false);
  const [sosSortOpen, setSosSortOpen] = useState(false);
  const [clusterSortOpen, setClusterSortOpen] = useState(false);

  // Cart state
  const [cartItems, setCartItems] = useState<SOSRequest[]>([]);
  const [cartExpanded, setCartExpanded] = useState(false);

  const {
    mutate: removeSOSRequestFromCluster,
    isPending: isRemovingSOSRequestFromCluster,
  } = useRemoveSOSRequestFromCluster();

  const {
    mutate: addSOSRequestToCluster,
    mutateAsync: addSOSRequestToClusterAsync,
  } = useAddSOSRequestToCluster();

  // Dnd state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragSOS, setActiveDragSOS] = useState<SOSRequest | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    if (event.active.id === "cart-bundle") {
      setActiveDragSOS(null);
      return;
    }
    const sosIdStr = String(event.active.id).replace("sos-", "");
    const sos =
      sosRequests.find((s) => String(s.id) === sosIdStr) ||
      incomingRequests?.find((s) => String(s.id) === sosIdStr);
    setActiveDragSOS(sos || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && over.id === "tab-clusters") {
      setActiveTab("clusters");
      setManualTabSelectionKey(selectedSOSId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setActiveDragSOS(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Drop SOS to Cart
    if (activeId.startsWith("sos-") && overId === "cart") {
      const sosIdStr = activeId.replace("sos-", "");
      const sosToAdd =
        sosRequests.find((s) => String(s.id) === sosIdStr) ||
        incomingRequests?.find((s) => String(s.id) === sosIdStr);

      if (sosToAdd && !cartItems.some((item) => item.id === sosToAdd.id)) {
        setCartItems((prev) => [...prev, sosToAdd]);
        toast.success(`Đã thêm SOS ${sosToAdd.id} vào giỏ hàng.`);
      } else if (sosToAdd) {
        toast.error(`SOS ${sosToAdd.id} đã có trong giỏ hàng.`);
      }
      return;
    }

    // Drop Cart to Cluster
    if (activeId === "cart-bundle" && overId.startsWith("cluster-")) {
      const clusterId = Number(overId.replace("cluster-", ""));
      if (Number.isFinite(clusterId) && cartItems.length > 0) {
        const targetCluster = backendClusters.find(
          (cluster) => cluster.id === clusterId,
        );
        if (!targetCluster) {
          toast.error("Không tìm thấy cụm SOS để thêm vào.");
          return;
        }

        const sosRequestIds = getNewSOSRequestIdsForCluster(
          targetCluster,
          cartItems.map((item) => item.id),
        );

        if (sosRequestIds.length === 0) {
          toast.error("Các SOS này đã thuộc cụm hoặc không hợp lệ.");
          return;
        }

        const capacityError = getClusterCapacityLimitMessage(
          targetCluster,
          sosRequestIds.length,
        );
        if (capacityError) {
          toast.error(capacityError);
          return;
        }

        addSOSRequestToClusterAsync({ clusterId, sosRequestIds })
          .then(() => {
            toast.success(`Đã thêm ${sosRequestIds.length} SOS vào cụm #${clusterId}.`);
            const idSet = new Set(sosRequestIds);
            setCartItems((prev) =>
              prev.filter((item) => {
                const numericId = toPositiveSOSRequestId(item.id);
                return numericId == null || !idSet.has(numericId);
              }),
            );
            setExpandedClusters((prev) => {
              const next = new Set(prev);
              next.add(clusterId);
              return next;
            });
            setActiveTab("clusters");
            setManualTabSelectionKey(selectedSOSId);
          })
          .catch((error: any) => {
            const errorMessage =
              error.response?.data?.message ||
              "Không thể thêm các SOS vào cụm. Vui lòng thử lại.";
            toast.error(errorMessage);
          });
      }
      return;
    }

    if (activeId.startsWith("sos-") && overId.startsWith("cluster-")) {
      const sosId = toPositiveSOSRequestId(activeId.replace("sos-", ""));
      const clusterId = Number(overId.replace("cluster-", ""));

      if (sosId != null && Number.isFinite(clusterId)) {
        const targetCluster = backendClusters.find(
          (cluster) => cluster.id === clusterId,
        );
        if (!targetCluster) {
          toast.error("Không tìm thấy cụm SOS để thêm vào.");
          return;
        }

        const sosRequestIds = getNewSOSRequestIdsForCluster(targetCluster, [
          sosId,
        ]);
        if (sosRequestIds.length === 0) {
          toast.error(`SOS ${sosId} đã thuộc cụm #${clusterId}.`);
          return;
        }

        const capacityError = getClusterCapacityLimitMessage(
          targetCluster,
          sosRequestIds.length,
        );
        if (capacityError) {
          toast.error(capacityError);
          return;
        }

        addSOSRequestToCluster(
          { clusterId, sosRequestIds: [sosId] },
          {
            onSuccess: () => {
              toast.success(`Đã thêm SOS ${sosId} vào cụm #${clusterId}.`);
              setExpandedClusters((prev) => {
                const next = new Set(prev);
                next.add(clusterId);
                return next;
              });
              setActiveTab("clusters");
              setManualTabSelectionKey(selectedSOSId);
            },
            onError: (error: any) => {
              const errorMessage =
                error.response?.data?.message ||
                "Không thể thêm SOS vào cụm. Vui lòng thử lại.";
              toast.error(errorMessage);
            },
          },
        );
      }
    }
  };
  const hasSOSFiltersApplied =
    selectedStatuses.length > 0 ||
    selectedPriorities.length > 0 ||
    selectedSosTypes.length > 0;
  const selectedSOSId = selectedSOS
    ? normalizeSOSRequestId(selectedSOS.id)
    : null;

  const toggleStatusFilter = (status: SOSRequestStatus) => {
    if (!onSelectedStatusesChange) {
      return;
    }

    onSelectedStatusesChange(
      selectedStatuses.includes(status)
        ? selectedStatuses.filter((existingStatus) => existingStatus !== status)
        : [...selectedStatuses, status],
    );
  };

  const togglePriorityFilter = (priority: SOSPriorityLevel) => {
    onSelectedPrioritiesChange?.(
      selectedPriorities.includes(priority)
        ? selectedPriorities.filter(
            (existingPriority) => existingPriority !== priority,
          )
        : [...selectedPriorities, priority],
    );
  };

  const toggleSosTypeFilter = (sosType: SOSRequestTypeFilter) => {
    onSelectedSosTypesChange?.(
      selectedSosTypes.includes(sosType)
        ? selectedSosTypes.filter(
            (existingSosType) => existingSosType !== sosType,
          )
        : [...selectedSosTypes, sosType],
    );
  };

  const clearSOSFilters = () => {
    onSelectedStatusesChange?.([]);
    onSelectedPrioritiesChange?.([]);
    onSelectedSosTypesChange?.([]);
  };

  const toggleClusterStatusFilter = (status: ClusterLifecycleStatus) => {
    onSelectedClusterStatusesChange?.(
      selectedClusterStatuses.includes(status)
        ? selectedClusterStatuses.filter(
            (existingStatus) => existingStatus !== status,
          )
        : [...selectedClusterStatuses, status],
    );
    setClusterPage(1);
    setManualClusterPageSelectionKey(selectedSOSId);
  };

  const toggleClusterPriorityFilter = (priority: ClusterPriorityLevel) => {
    onSelectedClusterPrioritiesChange?.(
      selectedClusterPriorities.includes(priority)
        ? selectedClusterPriorities.filter(
            (existingPriority) => existingPriority !== priority,
          )
        : [...selectedClusterPriorities, priority],
    );
    setClusterPage(1);
    setManualClusterPageSelectionKey(selectedSOSId);
  };

  const toggleClusterSosTypeFilter = (sosType: ClusterSOSType) => {
    onSelectedClusterSosTypesChange?.(
      selectedClusterSosTypes.includes(sosType)
        ? selectedClusterSosTypes.filter(
            (existingSosType) => existingSosType !== sosType,
          )
        : [...selectedClusterSosTypes, sosType],
    );
    setClusterPage(1);
    setManualClusterPageSelectionKey(selectedSOSId);
  };

  const clearClusterFilters = () => {
    onSelectedClusterStatusesChange?.([]);
    onSelectedClusterPrioritiesChange?.([]);
    onSelectedClusterSosTypesChange?.([]);
    setClusterSearchTerm("");
    setClusterPage(1);
    setManualClusterPageSelectionKey(selectedSOSId);
  };

  const hasIncomingServerPagination = !!incomingPagination;

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
        onError: (error: any) => {
          const errorMessage =
            error.response?.data?.message ||
            "Không thể tách SOS khỏi cụm. Vui lòng thử lại.";
          toast.error(errorMessage);
        },
      },
    );
  };

  const pendingRequests = sosRequests.filter(
    (s) => getSOSStatusBucket(getSOSEffectiveStatus(s)) === "pending",
  );
  const assignedRequests = sosRequests.filter(
    (s) => getSOSStatusBucket(getSOSEffectiveStatus(s)) === "active",
  );
  const availableRescuers = rescuers.filter((r) => r.status === "AVAILABLE");

  // IDs that belong to any auto-cluster (to identify standalone requests)
  const clusteredIds = useMemo(
    () => new Set(autoClusters.flat().map((s) => s.id)),
    [autoClusters],
  );
  // Also exclude SOS that are already in a backend cluster
  const backendClusteredIds = useMemo(
    () =>
      new Set(
        backendClusters.flatMap((c) =>
          c.sosRequestIds.map(normalizeSOSRequestId),
        ),
      ),
    [backendClusters],
  );
  const standaloneRequests = pendingRequests.filter(
    (s) =>
      !clusteredIds.has(s.id) &&
      !backendClusteredIds.has(normalizeSOSRequestId(s.id)),
  );

  const sosStatusById = useMemo(() => {
    return new Map(
      sosRequests.map((sos) => [
        normalizeSOSRequestId(sos.id),
        getSOSStatusBucket(getSOSEffectiveStatus(sos)),
      ]),
    );
  }, [sosRequests]);

  // Merge viewport-bounded sosRequests with sidebar incomingRequests so cluster
  // SOS IDs outside the current viewport can still be resolved.
  const baseKnownSOS = useMemo(() => {
    const byId = new Map<string, SOSRequest>();
    // Map-bound SOS (primary source – most up-to-date)
    for (const sos of sosRequests) {
      byId.set(normalizeSOSRequestId(sos.id), sos);
    }
    // Sidebar/paginated SOS (fills in IDs outside the viewport)
    if (incomingRequests) {
      for (const sos of incomingRequests) {
        const key = normalizeSOSRequestId(sos.id);
        if (!byId.has(key)) {
          byId.set(key, sos);
        }
      }
    }
    return byId;
  }, [sosRequests, incomingRequests]);

  const trimmedClusterSearchTerm = clusterSearchTerm.trim();
  const hasClusterFiltersApplied =
    selectedClusterStatuses.length > 0 ||
    selectedClusterPriorities.length > 0 ||
    selectedClusterSosTypes.length > 0 ||
    trimmedClusterSearchTerm.length > 0;
  const shouldIncludeCompletedClusters =
    selectedClusterStatuses.includes("Completed");
  const clusterDataSource = filteredBackendClusters ?? backendClusters;

  // Show operational clusters by default, sorted by severity (Critical -> Low).
  // Completed clusters are included only when the user explicitly filters them.
  const activeClusters = useMemo(() => {
    return [...clusterDataSource]
      .filter((cluster) => {
        const clusterStatus = resolveClusterStatus(cluster);
        if (clusterStatus === "Completed") {
          return shouldIncludeCompletedClusters;
        }

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
        const [field, order] = clusterSort.split(":");
        const isDesc = order === "desc";

        if (field === "severity" || field === "priority") {
          const severityDelta =
            CLUSTER_SEVERITY_SORT_ORDER[left.severityLevel] -
            CLUSTER_SEVERITY_SORT_ORDER[right.severityLevel];

          if (severityDelta !== 0) {
            return isDesc ? severityDelta : -severityDelta;
          }
        } else if (field === "time") {
          const timeDelta =
            getTimestamp(right.createdAt) - getTimestamp(left.createdAt);

          if (timeDelta !== 0) {
            return isDesc ? timeDelta : -timeDelta;
          }
        }

        // Secondary sorts if primary is equal
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
  }, [
    clusterDataSource,
    hasSOSFiltersApplied,
    shouldIncludeCompletedClusters,
    sosStatusById,
  ]);

  const filteredActiveClusters = useMemo(() => {
    const selectedClusterStatusSet = new Set(selectedClusterStatuses);
    const statusFilteredClusters =
      selectedClusterStatusSet.size > 0
        ? activeClusters.filter((cluster) =>
            selectedClusterStatusSet.has(resolveClusterStatus(cluster)),
          )
        : activeClusters;

    const rawQuery = trimmedClusterSearchTerm;
    if (!rawQuery) {
      return statusFilteredClusters;
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

    return statusFilteredClusters.filter((cluster) => {
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
  }, [activeClusters, selectedClusterStatuses, trimmedClusterSearchTerm]);

  const shouldShowBackendClusterControls =
    activeClusters.length > 0 || hasClusterFiltersApplied;

  const selectedClusterId = useMemo(() => {
    if (!selectedSOSId) return null;

    const matchedCluster = activeClusters.find((cluster) =>
      cluster.sosRequestIds.map(normalizeSOSRequestId).includes(selectedSOSId),
    );

    return matchedCluster?.id ?? null;
  }, [activeClusters, selectedSOSId]);
  const selectedAutoClusterIndex = useMemo(() => {
    if (!selectedSOSId) return null;

    const matchedIndex = autoClusters.findIndex((cluster) =>
      cluster.some(
        (request) => normalizeSOSRequestId(request.id) === selectedSOSId,
      ),
    );

    return matchedIndex >= 0 ? matchedIndex : null;
  }, [autoClusters, selectedSOSId]);

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
  const serverIncomingRequests = useMemo(() => {
    const byId = new Map<string, SOSRequest>();

    for (const sos of incomingRequests ?? []) {
      byId.set(normalizeSOSRequestId(sos.id), sos);
    }

    for (const sos of sosRequests) {
      const normalizedId = normalizeSOSRequestId(sos.id);
      if (byId.has(normalizedId)) {
        continue;
      }

      const statusBucket = getSOSStatusBucket(getSOSEffectiveStatus(sos));
      const isUnclustered =
        !sos.clusterId && !backendClusteredIds.has(normalizedId);
      const shouldLiftFromMap =
        isUnclustered &&
        (statusBucket === "pending" || isIncidentGeneratedSOS(sos));

      if (shouldLiftFromMap) {
        byId.set(normalizedId, sos);
      }
    }

    return Array.from(byId.values()).sort((left, right) =>
      compareSOSRequests(left, right, sosSort),
    );
  }, [backendClusteredIds, incomingRequests, sosRequests]);
  const visibleIncomingRequests = hasIncomingServerPagination
    ? serverIncomingRequests
    : paginatedStandaloneRequests;
  const incomingTotalCount = hasIncomingServerPagination
    ? Math.max(
        incomingPagination?.totalCount ?? 0,
        serverIncomingRequests.length,
      )
    : standaloneRequests.length;
  const incomingCurrentPage = hasIncomingServerPagination
    ? (incomingPagination?.page ?? 1)
    : currentStandalonePage;
  const incomingPageSize = hasIncomingServerPagination
    ? (incomingPagination?.pageSize ?? STANDALONE_REQUESTS_PAGE_SIZE)
    : STANDALONE_REQUESTS_PAGE_SIZE;
  const incomingSectionTitle = hasIncomingServerPagination
    ? `Danh sách SOS (${incomingTotalCount})`
    : `SOS chưa gom cụm (${standaloneRequests.length})`;

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

  const missingClusterSOSIds = useMemo(() => {
    const missingIds = new Set<number>();

    for (const cluster of paginatedFilteredActiveClusters) {
      for (const sosId of cluster.sosRequestIds) {
        const numericId = Number(sosId);
        if (
          Number.isFinite(numericId) &&
          numericId > 0 &&
          !baseKnownSOS.has(normalizeSOSRequestId(sosId))
        ) {
          missingIds.add(numericId);
        }
      }
    }

    return Array.from(missingIds).sort((left, right) => left - right);
  }, [baseKnownSOS, paginatedFilteredActiveClusters]);

  const clusterSOSDetailsQuery = useSOSRequestsByIds(missingClusterSOSIds, {
    enabled: missingClusterSOSIds.length > 0,
  });

  const fetchedClusterSOS = useMemo(
    () => mapSOSRequestEntitiesToSOS(clusterSOSDetailsQuery.items),
    [clusterSOSDetailsQuery.items],
  );

  const allKnownSOS = useMemo(() => {
    const byId = new Map(baseKnownSOS);

    for (const sos of fetchedClusterSOS) {
      byId.set(normalizeSOSRequestId(sos.id), sos);
    }

    return byId;
  }, [baseKnownSOS, fetchedClusterSOS]);

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
      ? selectedClusterId != null || selectedAutoClusterIndex != null
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

      {/* Tabs */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
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
            <DroppableTabsTrigger
              value="clusters"
              className="h-10 rounded-xl px-3 text-[15px] font-semibold tracking-tight data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
            >
              Cụm SOS
            </DroppableTabsTrigger>
          </TabsList>

          {/* Incoming SOS Tab */}
          <TabsContent
            value="incoming"
            className="m-0 mt-1 flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="border-b bg-background/80 p-3">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "grid flex-1 items-center gap-1.5",
                    hasSOSFiltersApplied ? "grid-cols-2" : "grid-cols-3",
                  )}
                >
                  <Popover
                    open={statusFilterOpen}
                    onOpenChange={setStatusFilterOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-full gap-1 px-1.5 text-[12px] font-normal"
                      >
                        <span className="truncate">Trạng thái</span>
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
                            <span
                              className={checked ? "font-medium" : undefined}
                            >
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
                        className="h-9 w-full gap-1 px-1.5 text-[12px] font-normal"
                      >
                        <span className="truncate">Ưu tiên</span>
                        {selectedPriorities.length > 0 ? (
                          <Badge className="h-4.5 rounded-full px-1.5 text-[11px]">
                            {selectedPriorities.length}
                          </Badge>
                        ) : (
                          <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1.5" align="start">
                      {SOS_PRIORITY_FILTER_OPTIONS.map((option) => {
                        const checked = selectedPriorities.includes(option.key);

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
                            <span
                              className={checked ? "font-medium" : undefined}
                            >
                              {option.value}
                            </span>
                          </button>
                        );
                      })}
                      {selectedPriorities.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => onSelectedPrioritiesChange?.([])}
                          className="mt-1 flex w-full items-center gap-2 border-t border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                          Xóa lọc mức ưu tiên
                        </button>
                      ) : null}
                    </PopoverContent>
                  </Popover>

                  <Popover
                    open={sosTypeFilterOpen}
                    onOpenChange={setSosTypeFilterOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-full gap-1 px-1.5 text-[12px] font-normal"
                      >
                        <span className="truncate">Loại SOS</span>
                        {selectedSosTypes.length > 0 ? (
                          <Badge className="h-4.5 rounded-full px-1.5 text-[11px]">
                            {selectedSosTypes.length}
                          </Badge>
                        ) : (
                          <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-1.5" align="start">
                      {SOS_TYPE_FILTER_OPTIONS.map((option) => {
                        const checked = selectedSosTypes.includes(option.key);

                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => toggleSosTypeFilter(option.key)}
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
                            <span
                              className={checked ? "font-medium" : undefined}
                            >
                              {option.value}
                            </span>
                          </button>
                        );
                      })}
                      {selectedSosTypes.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => onSelectedSosTypesChange?.([])}
                          className="mt-1 flex w-full items-center gap-2 border-t border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                          Xóa lọc loại SOS
                        </button>
                      ) : null}
                    </PopoverContent>
                  </Popover>

                  {hasSOSFiltersApplied ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-full gap-1 px-1 text-[12px] text-muted-foreground"
                      onClick={clearSOSFilters}
                    >
                      <X className="h-3 w-3" />
                      <span className="truncate">Xóa lọc</span>
                    </Button>
                  ) : null}
                </div>

                <Popover open={sosSortOpen} onOpenChange={setSosSortOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      title="Sắp xếp SOS mới"
                    >
                      <ArrowsDownUp className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1.5" align="end">
                    <div className="mb-1.5 px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Sắp xếp SOS mới
                    </div>
                    {SORT_OPTIONS.map((option) => {
                      const checked = sosSort === option.key;
                      const Icon = option.icon;

                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => {
                            onSosSortChange?.(option.key);
                            setSosSortOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[14px] transition-colors hover:bg-muted/60",
                            checked && "bg-muted/80 font-medium",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1">{option.label}</span>
                          {checked && (
                            <Check
                              className="h-3.5 w-3.5 text-primary"
                              weight="bold"
                            />
                          )}
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="h-full min-h-0 flex-1 overflow-y-auto">
              <div className="p-3 space-y-3">
                {visibleIncomingRequests.length > 0 && (
                  <>
                    <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {incomingSectionTitle}
                    </div>
                    <PaginationControls
                      page={incomingCurrentPage}
                      totalItems={incomingTotalCount}
                      pageSize={incomingPageSize}
                      onPageChange={(nextPage) => {
                        if (hasIncomingServerPagination) {
                          incomingPagination?.onPageChange(nextPage);
                          return;
                        }

                        setStandalonePage(nextPage);
                        setManualStandalonePageSelectionKey(selectedSOSId);
                      }}
                    />
                    {visibleIncomingRequests.map((sos) => {
                      const isInCart = cartItems.some(
                        (item) => item.id === sos.id,
                      );
                      const effectiveStatus = getSOSEffectiveStatus(sos);
                      const incidentContext =
                        getIncidentGeneratedSOSContext(sos);
                      return (
                        <DraggableSOSCard
                          key={sos.id}
                          sos={sos}
                          className={cn(
                            "rounded-xl border overflow-hidden transition-all",
                            PRIORITY_BORDER_COLOR[sos.priority],
                            isInCart &&
                              "opacity-50 ring-2 ring-primary bg-primary/5",
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
                                    variant={
                                      PRIORITY_BADGE_VARIANT[sos.priority]
                                    }
                                    className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0"
                                  >
                                    {PRIORITY_LABELS[sos.priority]}
                                  </Badge>
                                  <Badge
                                    variant={getSOSStatusBadgeVariant(
                                      effectiveStatus,
                                    )}
                                    className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0"
                                  >
                                    {getSOSStatusLabel(effectiveStatus)}
                                  </Badge>
                                  {incidentContext ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0 border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800/60 dark:bg-orange-900/20 dark:text-orange-300"
                                      title={
                                        incidentContext.teamName
                                          ? `Báo sự cố từ ${incidentContext.teamName}`
                                          : "SOS sinh từ báo cáo sự cố đội cứu hộ"
                                      }
                                    >
                                      Sự cố đội
                                    </Badge>
                                  ) : null}
                                  {sos.clusterId ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0"
                                    >
                                      Cụm #{sos.clusterId}
                                    </Badge>
                                  ) : null}
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

                            {/* Evaluation Scores Section */}
                            {(sos.evaluation?.ruleEvaluation ||
                              sos.evaluation?.aiAnalyses?.length) && (
                              <div className="flex items-center gap-3 mt-2 py-1 px-2 rounded-lg bg-black/5 dark:bg-white/5 border border-border/40">
                                {sos.evaluation.ruleEvaluation && (
                                  <div
                                    className="flex items-center gap-1.5 min-w-0"
                                    title="Điểm hệ thống (Rule-base)"
                                  >
                                    <ShieldCheck
                                      className="h-3.5 w-3.5 text-blue-500 shrink-0"
                                      weight="fill"
                                    />
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                                      Hệ thống:
                                    </span>
                                    <span className="text-[12px] font-mono font-bold text-foreground">
                                      {sos.evaluation.ruleEvaluation.totalScore.toFixed(
                                        1,
                                      )}
                                    </span>
                                  </div>
                                )}

                                {sos.evaluation.aiAnalyses &&
                                  sos.evaluation.aiAnalyses.length > 0 && (
                                    <>
                                      <div className="w-px h-3 bg-border/60 shrink-0" />
                                      <div
                                        className={cn(
                                          "flex items-center gap-1.5 min-w-0",
                                          sos.evaluation.aiAnalyses[0]
                                            .agreesWithRuleBase === false &&
                                            "text-amber-600 dark:text-amber-400",
                                        )}
                                        title={`AI Phân tích: ${sos.evaluation.aiAnalyses[0].explanation}`}
                                      >
                                        <Brain
                                          className="h-3.5 w-3.5 shrink-0"
                                          weight="fill"
                                        />
                                        <span className="text-[11px] font-bold uppercase tracking-tight">
                                          AI:
                                        </span>
                                        <span className="text-[12px] font-mono font-bold">
                                          {sos.evaluation.aiAnalyses[0].suggestedPriorityScore.toFixed(
                                            1,
                                          )}
                                        </span>
                                        {sos.evaluation.aiAnalyses[0]
                                          .agreesWithRuleBase === false && (
                                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                        )}
                                      </div>
                                    </>
                                  )}
                              </div>
                            )}
                          </div>
                          <div className="px-3 py-2 border-t border-inherit space-y-1.5">
                            {canCreateClusterFromSOS(sos) ? (
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
                            ) : (
                              <div className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-[13px] text-muted-foreground">
                                {sos.clusterId
                                  ? `SOS này đã thuộc cụm #${sos.clusterId}.`
                                  : `SOS đang ở trạng thái ${getSOSStatusLabel(
                                      effectiveStatus,
                                    ).toLowerCase()}.`}
                              </div>
                            )}
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
                        </DraggableSOSCard>
                      );
                    })}
                  </>
                )}

                {visibleIncomingRequests.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {isIncomingRequestsLoading ? (
                      <>
                        <Spinner className="h-8 w-8 mx-auto mb-2 animate-spin opacity-70" />
                        <p className="text-[15px]">Đang tải danh sách SOS...</p>
                      </>
                    ) : (
                      <>
                        <Pulse className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-[15px]">
                          {hasIncomingServerPagination
                            ? "Không có yêu cầu SOS phù hợp với bộ lọc hiện tại."
                            : pendingRequests.length > 0 ||
                                activeClusters.length > 0 ||
                                autoClusters.length > 0
                              ? "Không còn SOS lẻ. Chuyển sang tab Cụm SOS để xử lý theo cụm."
                              : "Không có yêu cầu SOS nào"}
                        </p>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </TabsContent>

          {/* SOS Clusters Tab */}
          <TabsContent
            value="clusters"
            className="m-0 mt-3 flex min-h-0 flex-1 overflow-hidden"
          >
            <div className="h-full min-h-0 flex-1 overflow-y-auto">
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
                        Gợi ý gom cụm ({autoClusters.length} cụm •{" "}
                        {autoClusters.reduce((sum, c) => sum + c.length, 0)}{" "}
                        SOS)
                      </>
                    )}
                  </Button>
                )}

                {/* Existing backend clusters */}
                {shouldShowBackendClusterControls && (
                  <>
                    <div className="space-y-2">
                      <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Cụm đã gom ({filteredActiveClusters.length}/
                        {activeClusters.length})
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <Icon
                              icon="ph:magnifying-glass"
                              className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
                            {trimmedClusterSearchTerm.length > 0 ? (
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
                                aria-label="Xóa tìm kiếm cụm"
                              >
                                <Icon icon="ph:x" className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>

                          <Popover
                            open={clusterSortOpen}
                            onOpenChange={setClusterSortOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                title="Sắp xếp cụm SOS"
                              >
                                <ArrowsDownUp className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-1.5" align="end">
                              <div className="mb-1.5 px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Sắp xếp Cụm SOS
                              </div>
                              {SORT_OPTIONS.map((option) => {
                                const checked = clusterSort === option.key;
                                const Icon = option.icon;

                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => {
                                      onClusterSortChange?.(option.key);
                                      setClusterSortOpen(false);
                                    }}
                                    className={cn(
                                      "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[14px] transition-colors hover:bg-muted/60",
                                      checked && "bg-muted/80 font-medium",
                                    )}
                                  >
                                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="flex-1">
                                      {option.label}
                                    </span>
                                    {checked && (
                                      <Check
                                        className="h-3.5 w-3.5 text-primary"
                                        weight="bold"
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div
                          className={cn(
                            "grid items-center gap-1.5",
                            hasClusterFiltersApplied
                              ? "grid-cols-2"
                              : "grid-cols-3",
                          )}
                        >
                          <Popover
                            open={clusterStatusFilterOpen}
                            onOpenChange={setClusterStatusFilterOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-full gap-1 px-2 text-[13px] font-normal"
                              >
                                <span className="truncate">Trạng thái</span>
                                {selectedClusterStatuses.length > 0 ? (
                                  <Badge className="h-4.5 rounded-full px-1.5 text-[11px]">
                                    {selectedClusterStatuses.length}
                                  </Badge>
                                ) : (
                                  <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-60 p-1.5"
                              align="start"
                            >
                              {CLUSTER_STATUS_FILTER_OPTIONS.map((option) => {
                                const checked =
                                  selectedClusterStatuses.includes(option.key);

                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    onClick={() =>
                                      toggleClusterStatusFilter(option.key)
                                    }
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
                                      <Check
                                        className="h-2.5 w-2.5"
                                        weight="bold"
                                      />
                                    </span>
                                    <span
                                      className={
                                        checked ? "font-medium" : undefined
                                      }
                                    >
                                      {option.value}
                                    </span>
                                  </button>
                                );
                              })}
                              {selectedClusterStatuses.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectedClusterStatusesChange?.([]);
                                    setClusterPage(1);
                                    setManualClusterPageSelectionKey(
                                      selectedSOSId,
                                    );
                                  }}
                                  className="mt-1 flex w-full items-center gap-2 border-t border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                                >
                                  <X className="h-3 w-3" />
                                  Xóa lọc trạng thái cụm
                                </button>
                              ) : null}
                            </PopoverContent>
                          </Popover>

                          <Popover
                            open={clusterPriorityFilterOpen}
                            onOpenChange={setClusterPriorityFilterOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-full gap-1 px-2 text-[13px] font-normal"
                              >
                                <span className="truncate">Ưu tiên</span>
                                {selectedClusterPriorities.length > 0 ? (
                                  <Badge className="h-4.5 rounded-full px-1.5 text-[11px]">
                                    {selectedClusterPriorities.length}
                                  </Badge>
                                ) : (
                                  <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-56 p-1.5"
                              align="start"
                            >
                              {CLUSTER_PRIORITY_FILTER_OPTIONS.map((option) => {
                                const checked =
                                  selectedClusterPriorities.includes(
                                    option.key,
                                  );

                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    onClick={() =>
                                      toggleClusterPriorityFilter(option.key)
                                    }
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
                                      <Check
                                        className="h-2.5 w-2.5"
                                        weight="bold"
                                      />
                                    </span>
                                    <span
                                      className={
                                        checked ? "font-medium" : undefined
                                      }
                                    >
                                      {option.value}
                                    </span>
                                  </button>
                                );
                              })}
                              {selectedClusterPriorities.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectedClusterPrioritiesChange?.([]);
                                    setClusterPage(1);
                                    setManualClusterPageSelectionKey(
                                      selectedSOSId,
                                    );
                                  }}
                                  className="mt-1 flex w-full items-center gap-2 border-t border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                                >
                                  <X className="h-3 w-3" />
                                  Xóa lọc mức ưu tiên
                                </button>
                              ) : null}
                            </PopoverContent>
                          </Popover>

                          <Popover
                            open={clusterSosTypeFilterOpen}
                            onOpenChange={setClusterSosTypeFilterOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-full gap-1 px-2 text-[13px] font-normal"
                              >
                                <span className="truncate">Loại SOS</span>
                                {selectedClusterSosTypes.length > 0 ? (
                                  <Badge className="h-4.5 rounded-full px-1.5 text-[11px]">
                                    {selectedClusterSosTypes.length}
                                  </Badge>
                                ) : (
                                  <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-60 p-1.5"
                              align="start"
                            >
                              {CLUSTER_SOS_TYPE_FILTER_OPTIONS.map((option) => {
                                const checked =
                                  selectedClusterSosTypes.includes(option.key);

                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    onClick={() =>
                                      toggleClusterSosTypeFilter(option.key)
                                    }
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
                                      <Check
                                        className="h-2.5 w-2.5"
                                        weight="bold"
                                      />
                                    </span>
                                    <span
                                      className={
                                        checked ? "font-medium" : undefined
                                      }
                                    >
                                      {option.value}
                                    </span>
                                  </button>
                                );
                              })}
                              {selectedClusterSosTypes.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectedClusterSosTypesChange?.([]);
                                    setClusterPage(1);
                                    setManualClusterPageSelectionKey(
                                      selectedSOSId,
                                    );
                                  }}
                                  className="mt-1 flex w-full items-center gap-2 border-t border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                                >
                                  <X className="h-3 w-3" />
                                  Xóa lọc loại SOS
                                </button>
                              ) : null}
                            </PopoverContent>
                          </Popover>

                          {hasClusterFiltersApplied ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 w-full gap-1 px-1 text-[12px] text-muted-foreground"
                              onClick={clearClusterFilters}
                            >
                              <X className="h-3 w-3" />
                              <span className="truncate">Xóa lọc</span>
                            </Button>
                          ) : null}

                        </div>
                      </div>
                    </div>

                    {filteredActiveClusters.length > 0 ? (
                      <>
                        <PaginationControls
                          page={currentClusterPage}
                          totalItems={filteredActiveClusters.length}
                          pageSize={BACKEND_CLUSTERS_PAGE_SIZE}
                          onPageChange={(nextPage) => {
                            setClusterPage(nextPage);
                            setManualClusterPageSelectionKey(selectedSOSId);
                          }}
                        />
                        {paginatedFilteredActiveClusters.map((cluster) => {
                          const clusterStatus = resolveClusterStatus(cluster);
                          const isAnalyzing =
                            isAnalyzingCluster &&
                            analyzingClusterId === cluster.id;
                          const clusterRequestCount =
                            getSOSClusterRequestCount(cluster);
                          const clusterMaxSize = getSOSClusterMaxSizeBySeverity(
                            cluster.severityLevel,
                          );
                          const clusterRemainingCapacity =
                            getSOSClusterRemainingCapacity(cluster);
                          const isClusterOverCapacity =
                            clusterRequestCount > clusterMaxSize;
                          const isClusterAtCapacity =
                            clusterRemainingCapacity === 0;
                          const sosCount = clusterRequestCount;
                          const isExpanded =
                            expandedClusters.has(cluster.id) ||
                            (selectedClusterId === cluster.id &&
                              currentSelectionClusterKey !==
                                collapsedSelectionKey);
                          const clusterSosIds = cluster.sosRequestIds.map(
                            normalizeSOSRequestId,
                          );
                          const clusterSOS = clusterSosIds
                            .map((id) => allKnownSOS.get(id))
                            .filter((s): s is SOSRequest => !!s);
                          const unresolvedClusterSOS = clusterSOS.filter(
                            (s) => {
                              const bucket = getSOSStatusBucket(
                                getSOSEffectiveStatus(s),
                              );
                              return (
                                bucket === "pending" || bucket === "active"
                              );
                            },
                          );
                          const pendingClusterSOS = unresolvedClusterSOS.filter(
                            (s) =>
                              getSOSStatusBucket(getSOSEffectiveStatus(s)) ===
                              "pending",
                          );
                          const activeClusterSOS = unresolvedClusterSOS.filter(
                            (s) =>
                              getSOSStatusBucket(getSOSEffectiveStatus(s)) ===
                              "active",
                          );
                          const rescuedClusterSOS = clusterSOS.filter(
                            (s) =>
                              getSOSStatusBucket(getSOSEffectiveStatus(s)) ===
                              "resolved",
                          );
                          const cancelledClusterSOS = clusterSOS.filter(
                            (s) =>
                              getSOSStatusBucket(getSOSEffectiveStatus(s)) ===
                              "cancelled",
                          );
                          const displayClusterSOS = [
                            ...unresolvedClusterSOS,
                          ].sort((left, right) => {
                            const statusDelta =
                              getSOSStatusSortWeight(
                                getSOSEffectiveStatus(left),
                              ) -
                              getSOSStatusSortWeight(
                                getSOSEffectiveStatus(right),
                              );

                            if (statusDelta !== 0) {
                              return statusDelta;
                            }

                            return (
                              right.createdAt.getTime() -
                              left.createdAt.getTime()
                            );
                          });

                          return (
                            <DroppableClusterCard
                              key={cluster.id}
                              clusterId={cluster.id}
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
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0",
                                        isClusterOverCapacity
                                          ? "border-red-300 bg-red-100 text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-300"
                                          : isClusterAtCapacity
                                            ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                                            : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-300",
                                      )}
                                    >
                                      {clusterRequestCount}/{clusterMaxSize} SOS
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
                                      <Users
                                        className="h-3 w-3"
                                        weight="fill"
                                      />
                                      ~{cluster.victimEstimated} nạn nhân
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
                                        const effectiveStatus =
                                          getSOSEffectiveStatus(sos);
                                        const incidentContext =
                                          getIncidentGeneratedSOSContext(sos);
                                        const canDetachThisSOS =
                                          canDetachSOSFromCluster(
                                            clusterStatus,
                                            effectiveStatus,
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
                                                      effectiveStatus,
                                                    )}
                                                    className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0"
                                                  >
                                                    {getSOSStatusLabel(
                                                      effectiveStatus,
                                                    )}
                                                  </Badge>
                                                  {incidentContext ? (
                                                    <Badge
                                                      variant="outline"
                                                      className="text-[14px] h-6 px-2 leading-none whitespace-nowrap shrink-0 border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800/60 dark:bg-orange-900/20 dark:text-orange-300"
                                                      title={
                                                        incidentContext.teamName
                                                          ? `Báo sự cố từ ${incidentContext.teamName}`
                                                          : "SOS sinh từ báo cáo sự cố đội cứu hộ"
                                                      }
                                                    >
                                                      Sự cố đội
                                                    </Badge>
                                                  ) : null}
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

                                            {/* Evaluation Scores Section */}
                                            {(sos.evaluation?.ruleEvaluation ||
                                              (sos.evaluation?.aiAnalyses &&
                                                sos.evaluation.aiAnalyses
                                                  .length > 0)) && (
                                              <div className="flex items-center gap-3 mt-2 py-1 px-2 rounded-lg bg-black/5 dark:bg-white/5 border border-border/40">
                                                {sos.evaluation
                                                  .ruleEvaluation && (
                                                  <div
                                                    className="flex items-center gap-1.5 min-w-0"
                                                    title="Điểm hệ thống (Rule-base)"
                                                  >
                                                    <ShieldCheck
                                                      className="h-3.5 w-3.5 text-blue-500 shrink-0"
                                                      weight="fill"
                                                    />
                                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                                                      Hệ thống:
                                                    </span>
                                                    <span className="text-[12px] font-mono font-bold text-foreground">
                                                      {sos.evaluation.ruleEvaluation.totalScore.toFixed(
                                                        1,
                                                      )}
                                                    </span>
                                                  </div>
                                                )}

                                                {sos.evaluation.aiAnalyses &&
                                                  sos.evaluation.aiAnalyses
                                                    .length > 0 && (
                                                    <>
                                                      <div className="w-px h-3 bg-border/60 shrink-0" />
                                                      <div
                                                        className={cn(
                                                          "flex items-center gap-1.5 min-w-0",
                                                          sos.evaluation
                                                            .aiAnalyses[0]
                                                            .agreesWithRuleBase ===
                                                            false &&
                                                            "text-amber-600 dark:text-amber-400",
                                                        )}
                                                        title={`AI Phân tích: ${sos.evaluation.aiAnalyses[0].explanation}`}
                                                      >
                                                        <Brain
                                                          className="h-3.5 w-3.5 shrink-0"
                                                          weight="fill"
                                                        />
                                                        <span className="text-[11px] font-bold uppercase tracking-tight">
                                                          AI:
                                                        </span>
                                                        <span className="text-[12px] font-mono font-bold">
                                                          {sos.evaluation.aiAnalyses[0].suggestedPriorityScore.toFixed(
                                                            1,
                                                          )}
                                                        </span>
                                                        {sos.evaluation
                                                          .aiAnalyses[0]
                                                          .agreesWithRuleBase ===
                                                          false && (
                                                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                                        )}
                                                      </div>
                                                    </>
                                                  )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    ) : clusterSOS.length > 0 ? (
                                      <div className="px-3 py-2 text-[14px] text-muted-foreground">
                                        Các SOS trong cụm này đã xử lý xong hoặc
                                        đã hủy, nên không còn hiển thị trong
                                        danh sách theo dõi nhanh.
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
                                              {clusterSOSDetailsQuery.isFetching
                                                ? "Đang tải chi tiết"
                                                : "Chưa tải chi tiết"}
                                            </Badge>
                                          </div>
                                          <p className="text-[14px] text-muted-foreground line-clamp-1 mt-1">
                                            {clusterSOSDetailsQuery.isFetching
                                              ? "Đang tải dữ liệu SOS theo ID cụm..."
                                              : "Dữ liệu SOS chưa đồng bộ trong danh sách hiện tại."}
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
                            </DroppableClusterCard>
                          );
                        })}
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-3 text-[14px] text-muted-foreground">
                        Không tìm thấy cụm phù hợp với{" "}
                        {trimmedClusterSearchTerm
                          ? `từ khóa "${trimmedClusterSearchTerm}"`
                          : "bộ lọc hiện tại"}
                        .
                      </div>
                    )}
                  </>
                )}

                {autoClusters.length > 0 && (
                  <>
                    <div className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Gợi ý gom cụm ({autoClusters.length})
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

                {!hasClusterFiltersApplied &&
                activeClusters.length === 0 &&
                autoClusters.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Pulse className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-[15px]">Chưa có cụm SOS nào</p>
                  </div>
                ) : null}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* SOS Cart Area */}
        <DroppableCartArea
          cartItems={cartItems}
          setCartItems={setCartItems}
          cartExpanded={cartExpanded}
          setCartExpanded={setCartExpanded}
          onSOSSelect={onSOSSelect}
          isDraggingSOS={
            activeDragId !== null && activeDragId.startsWith("sos-")
          }
        />

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
        <DragOverlay dropAnimation={null}>
          {activeDragId === "cart-bundle" ? (
            <DragOverlayCartBundle cartItems={cartItems} />
          ) : (
            <DragOverlaySOSCard sos={activeDragSOS} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default memo(SOSSidebar);

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
        // Mission exists — only allow viewing the existing plan.
        canViewPlan ? (
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
        ) : null
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

// ── Dnd Kit Wrapper Components ──

function DraggableSOSCard({
  sos,
  children,
  className,
}: {
  sos: SOSRequest;
  children: React.ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sos-${sos.id}`,
    data: { type: "sos", sos },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isDragging && "opacity-40", "touch-none")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function DroppableClusterCard({
  clusterId,
  children,
  className,
}: {
  clusterId: number;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cluster-${clusterId}`,
    data: { type: "cluster", clusterId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      {children}
    </div>
  );
}

const DroppableTabsTrigger = ({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: `tab-${value}` });
  return (
    <TabsTrigger
      value={value}
      ref={setNodeRef}
      className={cn(className, isOver && "ring-2 ring-primary")}
    >
      {children}
    </TabsTrigger>
  );
};

function DragOverlaySOSCard({ sos }: { sos: SOSRequest | null }) {
  if (!sos) return null;

  return (
    <div className="w-[300px] rounded-xl border border-border shadow-xl bg-background/90 backdrop-blur-sm p-3 pointer-events-none cursor-grabbing">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[14px] font-mono font-semibold text-foreground/90">
          SOS {sos.id}
        </span>
        <Badge
          variant={PRIORITY_BADGE_VARIANT[sos.priority]}
          className="text-[14px] h-6 px-2 leading-none"
        >
          {PRIORITY_LABELS[sos.priority]}
        </Badge>
      </div>
      <p className="text-[14px] text-muted-foreground line-clamp-1">
        {sos.message}
      </p>
    </div>
  );
}

function DragOverlayCartBundle({ cartItems }: { cartItems: SOSRequest[] }) {
  return (
    <div className="w-[280px] rounded-xl border border-primary/50 shadow-xl bg-primary/10 backdrop-blur-md p-3 pointer-events-none cursor-grabbing flex items-center gap-3">
      <div className="bg-primary/20 p-2 rounded-full text-primary">
        <Tray className="h-5 w-5" weight="fill" />
      </div>
      <div>
        <div className="text-[15px] font-semibold text-foreground">
          Khay chờ SOS
        </div>
        <div className="text-[13px] text-muted-foreground">
          {cartItems.length} yêu cầu đang kéo
        </div>
      </div>
    </div>
  );
}

function DroppableCartArea({
  cartItems,
  setCartItems,
  cartExpanded,
  setCartExpanded,
  onSOSSelect,
  isDraggingSOS,
}: {
  cartItems: SOSRequest[];
  setCartItems: React.Dispatch<React.SetStateAction<SOSRequest[]>>;
  cartExpanded: boolean;
  setCartExpanded: (expanded: boolean) => void;
  onSOSSelect: (sos: SOSRequest) => void;
  isDraggingSOS?: boolean;
}) {
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: "cart",
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    isDragging,
  } = useDraggable({
    id: "cart-bundle",
    data: { type: "cart-bundle" },
    disabled: cartItems.length === 0,
  });

  return (
    <div
      ref={setDroppableNodeRef}
      className={cn(
        "border-t bg-background transition-all duration-300",
        isDraggingSOS &&
          !isOver &&
          "bg-primary/5 border-primary ring-1 ring-primary/50 ring-inset shadow-[0_-4px_10px_rgba(0,0,0,0.02)] relative z-10",
        isOver && "bg-primary/10 border-primary ring-2 ring-primary ring-inset",
      )}
    >
      {/* Cart Header (Draggable when has items) */}
      <div
        className={cn(
          "px-4 py-3 flex items-center justify-between",
          cartItems.length > 0
            ? "cursor-grab active:cursor-grabbing hover:bg-muted/50"
            : "opacity-70",
          isDragging && "opacity-40",
        )}
        ref={cartItems.length > 0 ? setDraggableNodeRef : undefined}
        {...(cartItems.length > 0 ? attributes : {})}
        {...(cartItems.length > 0 ? listeners : {})}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-full",
              cartItems.length > 0
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Tray
              className="h-5 w-5"
              weight={cartItems.length > 0 ? "fill" : "regular"}
            />
          </div>
          <div className="flex flex-col">
            <span
              className={cn(
                "font-semibold text-[15px]",
                isDraggingSOS && "text-primary",
              )}
            >
              Khay chờ SOS
            </span>
            <span
              className={cn(
                "text-[13px] transition-colors",
                isDraggingSOS
                  ? "text-primary font-medium"
                  : "text-muted-foreground",
              )}
            >
              {isDraggingSOS
                ? "Kéo thả SOS vào đây để cất giữ"
                : cartItems.length > 0
                  ? `${cartItems.length} yêu cầu (kéo thả vào Cụm)`
                  : "Thả SOS vào đây để triển khai cụm"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cartItems.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={(e) => {
                e.stopPropagation();
                setCartItems([]);
              }}
              title="Xóa tất cả"
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setCartExpanded(!cartExpanded);
            }}
            disabled={cartItems.length === 0}
          >
            {cartExpanded ? (
              <CaretDown className="h-4 w-4" />
            ) : (
              <CaretUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Cart Items */}
      {cartExpanded && cartItems.length > 0 && (
        <div className="max-h-[30vh] overflow-y-auto px-4 pb-3 space-y-2 border-t pt-3 bg-muted/20">
          {cartItems.map((sos) => (
            <div
              key={sos.id}
              className="flex items-center justify-between p-2 rounded-lg border bg-background hover:border-primary/50 cursor-pointer"
              onClick={() => onSOSSelect(sos)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[14px] font-mono font-semibold text-foreground/90 whitespace-nowrap">
                  SOS {sos.id}
                </span>
                <Badge
                  variant={PRIORITY_BADGE_VARIANT[sos.priority]}
                  className="text-[12px] h-5 px-1.5 leading-none whitespace-nowrap shrink-0"
                >
                  {PRIORITY_LABELS[sos.priority]}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  setCartItems((prev) =>
                    prev.filter((item) => item.id !== sos.id),
                  );
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
