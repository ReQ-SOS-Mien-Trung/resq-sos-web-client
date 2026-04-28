"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  Suspense,
  useMemo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { toast } from "sonner";
import {
  SOSRequest,
  Rescuer,
  Location,
  LocationPanelData,
  Mission,
} from "@/type";
import type { MapViewState } from "@/hooks/useMapUrlSync";
import {
  useSOSRequests,
  useSOSRequestsInBounds,
} from "@/services/sos_request/hooks";
import type {
  SOSPriorityLevel,
  SOSRequestStatus,
  SOSRequestTypeFilter,
} from "@/services/sos_request/type";
import {
  useCreateSOSCluster,
  useClusterRescueSuggestion,
  useSOSClusters,
  useAiMissionStream,
} from "@/services/sos_cluster/hooks";
import { useTeamIncidents } from "@/services/team_incidents/hooks";
import type {
  ClusterLifecycleStatus,
  ClusterPriorityLevel,
  ClusterRescueSuggestionResponse,
  ClusterSOSType,
  SOSClusterEntity,
} from "@/services/sos_cluster/type";
import { useDepots } from "@/services/depot/hooks";
import { useAssemblyPoints } from "@/services/assembly_points/hooks";
import { useRescueTeams } from "@/services/rescue_teams/hooks";
import { useAllServiceZones } from "@/services/map/hooks";
import type { DepotEntity } from "@/services/depot/type";
import type { AssemblyPointEntity } from "@/services/assembly_points/type";
import type { ServiceZoneEntity } from "@/services/map/type";
import type {
  RescueTeamEntity,
  RescueTeamTypeKey,
} from "@/services/rescue_teams/type";
import type { TeamIncidentEntity } from "@/services/team_incidents/type";
import { cn } from "@/lib/utils";
import { SOS_CLUSTER_MAX_SIZE_BY_PRIORITY } from "@/lib/sos-cluster-capacity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificationBell } from "@/components/ui/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarSimple,
  Gear,
  User,
  ArrowsClockwise,
  Broadcast,
  Sun,
  Moon,
  CloudSun,
  MapTrifold,
  SignOut,
  Phone,
  UsersThree,
  ChatCircleDots,
  Warning,
  Info,
  X,
} from "@phosphor-icons/react";
import {
  SOSDetailsPanel,
  SOSSidebar,
  LocationDetailsPanel,
  TeamIncidentDetailsPanel,
} from "@/components/coordinator";
import RescuePlanPanel from "@/components/coordinator/RescuePlanPanel";
import ManualMissionBuilder from "@/components/coordinator/ManualMissionBuilder";
import AiStreamPanel from "@/components/coordinator/AiStreamPanel";

import { useLogout } from "@/services/auth/hooks";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useUserMe } from "@/services/user/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useMapUrlSync } from "@/hooks/useMapUrlSync";
import { useOperationalRealtime } from "@/hooks/useOperationalRealtime";
import { useSosRequestRealtime } from "@/hooks/useSosRequestRealtime";
import { getMapBoundsCacheKey } from "@/lib/coordinator-map-utils";
import { mapSOSRequestEntitiesToSOS } from "@/lib/sos-request-mapper";
import { getUserAvatarInitials, getUserDisplayName } from "@/lib/user-avatar";
import { useSosClusterGroupingConfig } from "@/services/config/hooks";

// ── Lazy-loaded map components ──

const CoordinatorMap = dynamic(
  () => import("@/components/coordinator/CoordinatorMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted/30 animate-in fade-in duration-300">
        <Skeleton className="w-full h-full rounded-none" />
      </div>
    ),
  },
);

const WindyLeafletMap = dynamic(
  () => import("@/components/coordinator/WindyLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted/30 animate-in fade-in duration-300">
        <Skeleton className="w-full h-full rounded-none" />
      </div>
    ),
  },
);

// ── Helpers ──

/** Haversine distance in km between two lat/lng points */
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeSOSRequestTypeFilterValue(
  value?: string | null,
): SOSRequestTypeFilter | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (normalized === "rescue") return "Rescue";
  if (normalized === "relief") return "Relief";
  if (normalized === "both") return "Both";

  return null;
}

const AUTO_CLUSTER_RADIUS_STEP_KM = 1;
const DEFAULT_COORDINATOR_SOS_STATUSES: SOSRequestStatus[] = [
  "Pending",
  "Assigned",
  "InProgress",
  "Incident",
];
const SOS_PRIORITY_ORDER: Record<SOSRequest["priority"], number> = {
  P1: 0,
  P2: 1,
  P3: 2,
  P4: 3,
};

function getSortTime(value: Date): number {
  const timestamp = value.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareSOSIds(leftId: string, rightId: string): number {
  const leftNumber = Number(leftId);
  const rightNumber = Number(rightId);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return leftId.localeCompare(rightId);
}

function compareSOSSeeds(left: SOSRequest, right: SOSRequest): number {
  const priorityDelta =
    SOS_PRIORITY_ORDER[left.priority] - SOS_PRIORITY_ORDER[right.priority];

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const createdAtDelta =
    getSortTime(left.createdAt) - getSortTime(right.createdAt);
  if (createdAtDelta !== 0) {
    return createdAtDelta;
  }

  return compareSOSIds(left.id, right.id);
}

function buildRadiusScanSteps(maximumDistanceKm: number): number[] {
  if (!Number.isFinite(maximumDistanceKm) || maximumDistanceKm <= 0) {
    return [];
  }

  const normalizedMaximumDistanceKm = Math.max(maximumDistanceKm, 0);
  const steps: number[] = [];
  const wholeKilometers = Math.floor(normalizedMaximumDistanceKm);

  for (
    let kilometer = AUTO_CLUSTER_RADIUS_STEP_KM;
    kilometer <= wholeKilometers;
    kilometer += AUTO_CLUSTER_RADIUS_STEP_KM
  ) {
    steps.push(kilometer);
  }

  if (
    steps.length === 0 ||
    steps[steps.length - 1] < normalizedMaximumDistanceKm
  ) {
    steps.push(normalizedMaximumDistanceKm);
  }

  return steps;
}

type AutoClusterCandidate = {
  request: SOSRequest;
  distanceKm: number;
};

function compareAutoClusterCandidates(
  left: AutoClusterCandidate,
  right: AutoClusterCandidate,
): number {
  const distanceDelta = left.distanceKm - right.distanceKm;
  if (distanceDelta !== 0) {
    return distanceDelta;
  }

  const priorityDelta =
    SOS_PRIORITY_ORDER[left.request.priority] -
    SOS_PRIORITY_ORDER[right.request.priority];
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const createdAtDelta =
    getSortTime(left.request.createdAt) - getSortTime(right.request.createdAt);
  if (createdAtDelta !== 0) {
    return createdAtDelta;
  }

  return compareSOSIds(left.request.id, right.request.id);
}

/** Build client-side auto-clusters using config-driven incremental radius scans. */
function buildAutoClusters(
  sosRequests: SOSRequest[],
  backendClusters: SOSClusterEntity[],
  maximumDistanceKm: number,
): SOSRequest[][] {
  if (!Number.isFinite(maximumDistanceKm) || maximumDistanceKm <= 0) {
    return [];
  }

  const backendClusteredIds = new Set(
    backendClusters.flatMap((cluster) =>
      cluster.sosRequestIds.map((id) => String(id)),
    ),
  );

  const pending = sosRequests
    .filter(
      (s) =>
        s.status === "PENDING" &&
        s.groupId === s.id &&
        !backendClusteredIds.has(String(s.id)) &&
        Number.isFinite(s.location.lat) &&
        Number.isFinite(s.location.lng),
    )
    .sort(compareSOSSeeds);

  const radiusSteps = buildRadiusScanSteps(maximumDistanceKm);
  if (radiusSteps.length === 0) return [];

  const clusteredIds = new Set<string>();
  const clusters: SOSRequest[][] = [];

  for (const seed of pending) {
    if (clusteredIds.has(seed.id)) {
      continue;
    }

    const maxClusterSize =
      SOS_CLUSTER_MAX_SIZE_BY_PRIORITY[seed.priority] ?? 3;

    // P1: không gom thêm, chỉ tạo cụm 1 mình
    if (maxClusterSize <= 1) {
      clusteredIds.add(seed.id);
      clusters.push([seed]);
      continue;
    }

    let selectedNeighbors: AutoClusterCandidate[] = [];
    let hasFoundNeighbor = false;

    for (const radiusKm of radiusSteps) {
      const neighborsWithinRadius = pending
        .filter(
          (candidate) =>
            candidate.id !== seed.id && !clusteredIds.has(candidate.id),
        )
        .map((candidate) => ({
          request: candidate,
          distanceKm: haversine(
            seed.location.lat,
            seed.location.lng,
            candidate.location.lat,
            candidate.location.lng,
          ),
        }))
        .filter((candidate) => candidate.distanceKm <= radiusKm)
        .sort(compareAutoClusterCandidates)
        .slice(0, maxClusterSize - 1);

      if (neighborsWithinRadius.length > 0) {
        hasFoundNeighbor = true;
        selectedNeighbors = neighborsWithinRadius;
      }

      if (
        hasFoundNeighbor &&
        selectedNeighbors.length >= maxClusterSize - 1
      ) {
        break;
      }
    }

    const cluster = hasFoundNeighbor
      ? [seed, ...selectedNeighbors.map((candidate) => candidate.request)]
      : [seed];

    cluster.forEach((request) => {
      clusteredIds.add(request.id);
    });
    clusters.push(cluster);
  }

  return clusters;
}

/** Get SOS requests belonging to a specific cluster */
function getClusterSOSRequests(
  clusterId: number | null,
  sosRequests: SOSRequest[],
  clusters: SOSClusterEntity[],
): SOSRequest[] {
  if (!clusterId) return [];
  const cluster = clusters.find((c) => c.id === clusterId);
  if (!cluster) return [];
  const idSet = new Set(cluster.sosRequestIds.map(String));
  return sosRequests.filter((s) => idSet.has(s.id));
}

function isClusterMissionLocked(cluster?: SOSClusterEntity | null): boolean {
  const status = String(cluster?.status ?? "").toLowerCase();
  return status === "inprogress" || status === "completed";
}

function mapTeamTypeToRescuerType(
  teamType: RescueTeamTypeKey,
): Rescuer["type"] {
  if (teamType === "Transportation") return "MOTORBOAT";
  if (teamType === "Medical") return "SMALL_BOAT";
  if (teamType === "Mixed") return "TRUCK";
  return "TRUCK";
}

function mapTeamStatusToRescuerStatus(
  status: RescueTeamEntity["status"],
): Rescuer["status"] {
  if (
    status === "Assigned" ||
    status === "OnMission" ||
    status === "Stuck" ||
    status === "Unavailable" ||
    status === "Disbanded"
  ) {
    return "BUSY";
  }

  return "AVAILABLE";
}

function getTeamCapabilities(teamType: RescueTeamTypeKey): string[] {
  if (teamType === "Medical") return ["Y tế", "Sơ cứu"];
  if (teamType === "Transportation") return ["Vận chuyển", "Cơ động"];
  if (teamType === "Mixed") return ["Đa nhiệm", "Hậu cần"];
  return ["Cứu hộ", "Hiện trường"];
}

function mapRescueTeamToRescuer(
  team: RescueTeamEntity,
  assemblyPointById: Map<number, AssemblyPointEntity>,
): Rescuer {
  const assemblyPoint = assemblyPointById.get(team.assemblyPointId);
  const fallbackLocation = { lat: 16.4637, lng: 107.5909 };

  return {
    id: String(team.id),
    name: team.name,
    type: mapTeamTypeToRescuerType(team.teamType),
    status: mapTeamStatusToRescuerStatus(team.status),
    location: assemblyPoint
      ? { lat: assemblyPoint.latitude, lng: assemblyPoint.longitude }
      : fallbackLocation,
    currentLoad: team.currentMemberCount,
    capacity: team.maxMembers,
    capabilities: getTeamCapabilities(team.teamType),
  };
}

const SIDEBAR_SOS_PAGE_SIZE = 8;

// ── Legend Component ──

const MapLegend = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-6 left-6 z-[40] pointer-events-auto select-none flex flex-col items-start gap-3">
      {/* Legend Panel */}
      {isOpen && (
        <div className="bg-background/90 backdrop-blur-md border border-border/60 shadow-2xl rounded-2xl p-3.5 flex flex-col gap-3.5 min-w-[180px] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
              Chú thích
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            >
              <X size={12} weight="bold" />
            </button>
          </div>

          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1">
              Mức độ SOS
            </p>
            <div className="grid grid-cols-1 gap-1">
              {[
                { label: "P1: Rất nghiêm trọng", color: "bg-[#ef4444]" },
                { label: "P2: Nghiêm trọng", color: "bg-[#f97316]" },
                { label: "P3: Trung bình", color: "bg-[#eab308]" },
                { label: "P4: Thấp", color: "bg-[#14b8a6]" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 px-1.5 py-1 rounded-lg hover:bg-accent/40 transition-colors"
                >
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shadow-sm shrink-0",
                      item.color,
                    )}
                  />
                  <span className="text-[11px] font-medium text-foreground/90">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-border/30" />

          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1">
              Loại SOS
            </p>
            <div className="grid grid-cols-1 gap-1">
              {[
                {
                  label: "Tam giác: Cứu hộ",
                  icon: (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 100 100"
                      className="shrink-0"
                    >
                      <polygon
                        points="50,5 95,90 5,90"
                        fill="#94a3b8"
                        stroke="white"
                        strokeWidth="8"
                      />
                    </svg>
                  ),
                },
                {
                  label: "Hình tròn: Cứu trợ",
                  icon: (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 100 100"
                      className="shrink-0"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="#94a3b8"
                        stroke="white"
                        strokeWidth="8"
                      />
                    </svg>
                  ),
                },
                {
                  label: "Lục giác: Cả hai",
                  icon: (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 100 100"
                      className="shrink-0"
                    >
                      <polygon
                        points="25,5 75,5 100,50 75,95 25,95 0,50"
                        fill="#94a3b8"
                        stroke="white"
                        strokeWidth="8"
                      />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 px-1.5 py-1 rounded-lg hover:bg-accent/40 transition-colors"
                >
                  {item.icon}
                  <span className="text-[11px] font-medium text-foreground/90">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-border/30" />

          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1">
              Địa điểm
            </p>
            <div className="grid grid-cols-1 gap-1">
              <div className="flex items-center gap-2.5 px-1.5 py-1 rounded-lg hover:bg-accent/40 transition-colors">
                <div className="w-5 h-5 rounded-md bg-purple-100 border border-purple-300 flex items-center justify-center shrink-0 shadow-sm text-[10px]">
                  📍
                </div>
                <span className="text-[11px] font-medium text-foreground/90">
                  Điểm tập kết
                </span>
              </div>
              <div className="flex items-center gap-2.5 px-1.5 py-1 rounded-lg hover:bg-accent/40 transition-colors">
                <div className="w-5 h-5 rounded-md bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0 shadow-sm text-[10px]">
                  📦
                </div>
                <span className="text-[11px] font-medium text-foreground/90">
                  Kho vật phẩm
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shadow-xl border transition-all duration-300 hover:scale-105 active:scale-95 group",
          isOpen
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background/95 backdrop-blur-md text-foreground border-border/60",
        )}
        title={isOpen ? "Đóng chú thích" : "Xem chú thích bản đồ"}
      >
        <Info
          size={20}
          weight={isOpen ? "fill" : "bold"}
          className={cn(
            "transition-transform duration-300",
            isOpen ? "rotate-0" : "group-hover:rotate-12",
          )}
        />
      </button>
    </div>
  );
};

// ── Main Dashboard Content ──

const CoordinatorDashboardContent = () => {
  // ─── URL Sync ───
  const {
    urlState,
    hasInitialView,
    handleMapViewChange,
    handleEntitySelect,
    clearSelection,
  } = useMapUrlSync();

  const searchParams = useSearchParams();
  const router = useRouter();
  const isWeatherMode = urlState.mode === "weather";

  // ─── UI State ───
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedSOS, setSelectedSOS] = useState<SOSRequest | null>(null);
  const [selectedRescuer, setSelectedRescuer] = useState<Rescuer | null>(null);
  const [selectedTeamIncident, setSelectedTeamIncident] =
    useState<TeamIncidentEntity | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);
  const [flyToZoom, setFlyToZoom] = useState<number | undefined>(undefined);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [mapViewState, setMapViewState] = useState<MapViewState | null>(null);
  const [mapFetchBounds, setMapFetchBounds] = useState<
    MapViewState["bounds"] | null
  >(null);
  const [risingSOSMarkerIds, setRisingSOSMarkerIds] = useState<string[]>([]);
  const [selectedSOSStatuses, setSelectedSOSStatuses] = useState<
    SOSRequestStatus[]
  >([]);
  const [selectedSOSPriorities, setSelectedSOSPriorities] = useState<
    SOSPriorityLevel[]
  >([]);
  const [selectedSosTypes, setSelectedSosTypes] = useState<
    SOSRequestTypeFilter[]
  >([]);
  const [selectedClusterStatuses, setSelectedClusterStatuses] = useState<
    ClusterLifecycleStatus[]
  >([]);
  const [selectedClusterPriorities, setSelectedClusterPriorities] = useState<
    ClusterPriorityLevel[]
  >([]);
  const [selectedClusterSosTypes, setSelectedClusterSosTypes] = useState<
    ClusterSOSType[]
  >([]);
  const [sosSort, setSosSort] = useState<string>("time:desc");
  const [clusterSort, setClusterSort] = useState<string>("time:desc");
  const [sosRequestIdSearch, setSosRequestIdSearch] = useState<string>("");
  const [sidebarSOSPage, setSidebarSOSPage] = useState(1);
  /** Decoded route coords [lat,lng][] drawn on map from ActivityRoutePreview */
  const [routeOverlay, setRouteOverlay] = useState<[number, number][]>([]);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);

  // ─── Panel State ───
  const [sosDetailOpen, setSOSDetailOpen] = useState(false);
  const [teamIncidentDetailOpen, setTeamIncidentDetailOpen] = useState(false);
  const [rescuePlanOpen, setRescuePlanOpen] = useState(false);
  const [rescuePlanDefaultTab, setRescuePlanDefaultTab] = useState<
    "plan" | "missions" | undefined
  >(undefined);
  const [rescuePlanPreferSplitSuggestion, setRescuePlanPreferSplitSuggestion] =
    useState(false);
  const [rescueSuggestion, setRescueSuggestion] =
    useState<ClusterRescueSuggestionResponse | null>(null);
  const [mixedWarningDialogOpen, setMixedWarningDialogOpen] = useState(false);
  const [activeClusterId, setActiveClusterId] = useState<number | null>(null);
  // Cache of rescue suggestions per cluster ID
  const suggestionCacheRef = useRef<
    Map<number, ClusterRescueSuggestionResponse>
  >(new Map());
  const [locationPanelOpen, setLocationPanelOpen] = useState(false);
  const [locationPanelData, setLocationPanelData] =
    useState<LocationPanelData | null>(null);

  // ─── Manual Mission Builder ───
  const [manualMissionOpen, setManualMissionOpen] = useState(false);
  const [manualMissionClusterId, setManualMissionClusterId] = useState<
    number | null
  >(null);
  const [existingMissionId, setExistingMissionId] = useState<number | null>(
    null,
  );

  // ─── Processing State ───
  const [processingClusterIndex, setProcessingClusterIndex] = useState<
    number | null
  >(null);
  const [processingSosId, setProcessingSosId] = useState<string | null>(null);
  const [analyzingClusterId, setAnalyzingClusterId] = useState<number | null>(
    null,
  );
  const [recentlyClusteredSOSIds, setRecentlyClusteredSOSIds] = useState<
    Set<string>
  >(() => new Set());

  // ─── Refs ───
  const sidebarBeforeRescuePlanRef = useRef(true);
  const lastAppliedSelectionSignatureRef = useRef<string | null>(null);
  const previousMapSosIdsRef = useRef<Set<string> | null>(null);
  const risingMarkerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const markSOSRequestsAsClustered = useCallback(
    (sosRequestIds: Array<number | string>) => {
      if (sosRequestIds.length === 0) {
        return;
      }

      setRecentlyClusteredSOSIds((current) => {
        const next = new Set(current);
        sosRequestIds.forEach((id) => {
          next.add(String(id));
        });
        return next;
      });
    },
    [],
  );

  const statusQueryFilter = useMemo(
    () =>
      selectedSOSStatuses.length > 0
        ? selectedSOSStatuses
        : DEFAULT_COORDINATOR_SOS_STATUSES,
    [selectedSOSStatuses],
  );
  const priorityQueryFilter = useMemo(
    () =>
      selectedSOSPriorities.length > 0 ? selectedSOSPriorities : undefined,
    [selectedSOSPriorities],
  );
  const sosTypeQueryFilter = useMemo(
    () => (selectedSosTypes.length > 0 ? selectedSosTypes : undefined),
    [selectedSosTypes],
  );
  const hasSidebarClusterBackendFilters = useMemo(
    () =>
      selectedClusterStatuses.length > 0 ||
      selectedClusterPriorities.length > 0 ||
      selectedClusterSosTypes.length > 0,
    [
      selectedClusterPriorities.length,
      selectedClusterSosTypes.length,
      selectedClusterStatuses.length,
    ],
  );
  const sidebarClusterQueryParams = useMemo(
    () =>
      hasSidebarClusterBackendFilters
        ? {
            statuses:
              selectedClusterStatuses.length > 0
                ? selectedClusterStatuses
                : undefined,
            priorities:
              selectedClusterPriorities.length > 0
                ? selectedClusterPriorities
                : undefined,
            sosTypes:
              selectedClusterSosTypes.length > 0
                ? selectedClusterSosTypes
                : undefined,
            Sort: clusterSort,
          }
        : { Sort: clusterSort },
    [
      hasSidebarClusterBackendFilters,
      selectedClusterPriorities,
      selectedClusterSosTypes,
      selectedClusterStatuses,
      clusterSort,
    ],
  );

  // ─── Data Fetching ───
  const { data: sidebarSosData, isLoading: isSidebarSosLoading } =
    useSOSRequests({
      params: {
        pageNumber: sidebarSOSPage,
        pageSize: SIDEBAR_SOS_PAGE_SIZE,
        Statuses: statusQueryFilter,
        Priorities: priorityQueryFilter,
        SosTypes: sosTypeQueryFilter,
        SosRequestId: sosRequestIdSearch.trim() || undefined,
        Sort: sosSort,
      },
    });
  const { data: mapSosData } = useSOSRequestsInBounds({
    params: mapFetchBounds
      ? {
          MinLat: mapFetchBounds.south,
          MaxLat: mapFetchBounds.north,
          MinLng: mapFetchBounds.west,
          MaxLng: mapFetchBounds.east,
          Statuses: statusQueryFilter,
          Priorities: priorityQueryFilter,
          SosTypes: sosTypeQueryFilter,
          SosRequestId: sosRequestIdSearch.trim() || undefined,
        }
      : undefined,
    enabled: !isWeatherMode && !!mapFetchBounds,
  });
  const { data: depotsData } = useDepots({ params: { pageSize: 100 } });
  const { data: assemblyPointsData } = useAssemblyPoints({
    params: { pageSize: 100 },
  });
  const { data: teamIncidentsData } = useTeamIncidents();
  const { data: rescueTeamsData } = useRescueTeams({
    params: { pageSize: 200 },
  });
  const { data: clustersData } = useSOSClusters({
    params: { Sort: clusterSort },
  });
  const { data: sidebarFilteredClustersData } = useSOSClusters({
    params: sidebarClusterQueryParams,
    enabled: hasSidebarClusterBackendFilters,
  });
  const sosClusterGroupingConfigQuery = useSosClusterGroupingConfig();
  const { data: serviceZonesData } = useAllServiceZones({
    enabled: !isWeatherMode,
    staleTime: 5 * 60_000,
  });

  const sosRequests = useMemo(
    () => mapSOSRequestEntitiesToSOS(mapSosData ?? []),
    [mapSosData],
  );

  useEffect(() => {
    const nextIds = new Set(sosRequests.map((sos) => sos.id));

    if (!previousMapSosIdsRef.current) {
      previousMapSosIdsRef.current = nextIds;
      return;
    }

    const previousIds = previousMapSosIdsRef.current;
    previousMapSosIdsRef.current = nextIds;

    if (nextIds.size === 0) {
      setRisingSOSMarkerIds([]);
      return;
    }

    const enteringIds: string[] = [];
    nextIds.forEach((id) => {
      if (!previousIds.has(id)) {
        enteringIds.push(id);
      }
    });

    if (enteringIds.length === 0) {
      return;
    }

    setRisingSOSMarkerIds(enteringIds);

    if (risingMarkerTimeoutRef.current) {
      clearTimeout(risingMarkerTimeoutRef.current);
    }

    risingMarkerTimeoutRef.current = setTimeout(() => {
      setRisingSOSMarkerIds([]);
      risingMarkerTimeoutRef.current = null;
    }, 380);
  }, [sosRequests]);

  useEffect(
    () => () => {
      if (risingMarkerTimeoutRef.current) {
        clearTimeout(risingMarkerTimeoutRef.current);
      }
    },
    [],
  );

  const sidebarSOSRequests = useMemo(
    () => mapSOSRequestEntitiesToSOS(sidebarSosData?.items ?? []),
    [sidebarSosData],
  );

  useEffect(() => {
    if (!selectedSOS) {
      return;
    }

    if (
      selectedSOSStatuses.length === 0 &&
      selectedSOSPriorities.length === 0 &&
      selectedSosTypes.length === 0
    ) {
      return;
    }

    const matchesStatus =
      selectedSOSStatuses.length === 0 ||
      (selectedSOS.rawStatus != null &&
        selectedSOSStatuses.includes(selectedSOS.rawStatus));
    const matchesPriority =
      selectedSOSPriorities.length === 0 ||
      (selectedSOS.rawPriorityLevel != null &&
        selectedSOSPriorities.includes(selectedSOS.rawPriorityLevel));
    const selectedSosType = normalizeSOSRequestTypeFilterValue(
      selectedSOS.sosType,
    );
    const matchesSosType =
      selectedSosTypes.length === 0 ||
      (selectedSosType != null && selectedSosTypes.includes(selectedSosType));

    if (!matchesStatus || !matchesPriority || !matchesSosType) {
      setSelectedSOS(null);
      setSOSDetailOpen(false);
    }
  }, [
    selectedSOS,
    selectedSOSPriorities,
    selectedSOSStatuses,
    selectedSosTypes,
  ]);

  useEffect(() => {
    setSidebarSOSPage(1);
  }, [
    selectedSOSPriorities,
    selectedSOSStatuses,
    selectedSosTypes,
    sosRequestIdSearch,
  ]);
  const depots = useMemo<DepotEntity[]>(
    () => depotsData?.items ?? [],
    [depotsData],
  );
  const assemblyPoints = useMemo<AssemblyPointEntity[]>(
    () => assemblyPointsData?.items ?? [],
    [assemblyPointsData],
  );
  const teamIncidents = useMemo(
    () => teamIncidentsData?.incidents ?? [],
    [teamIncidentsData],
  );
  const rescuers = useMemo<Rescuer[]>(() => {
    const teams = rescueTeamsData?.items ?? [];
    if (teams.length === 0) return [];

    const assemblyPointById = new Map(
      assemblyPoints.map((point) => [point.id, point]),
    );

    return teams.map((team) => mapRescueTeamToRescuer(team, assemblyPointById));
  }, [rescueTeamsData, assemblyPoints]);

  const sidebarMissions = useMemo<Mission[]>(() => [], []);
  const clusters = useMemo<SOSClusterEntity[]>(
    () => clustersData?.clusters ?? [],
    [clustersData],
  );
  const filteredSidebarClusters = useMemo<SOSClusterEntity[] | undefined>(
    () =>
      hasSidebarClusterBackendFilters
        ? (sidebarFilteredClustersData?.clusters ?? clusters)
        : undefined,
    [clusters, hasSidebarClusterBackendFilters, sidebarFilteredClustersData],
  );
  useEffect(() => {
    if (recentlyClusteredSOSIds.size === 0) {
      return;
    }

    const backendClusteredIds = new Set(
      clusters.flatMap((cluster) =>
        cluster.sosRequestIds.map((id) => String(id)),
      ),
    );

    if (backendClusteredIds.size === 0) {
      return;
    }

    setRecentlyClusteredSOSIds((current) => {
      let changed = false;
      const next = new Set(current);

      current.forEach((id) => {
        if (backendClusteredIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [clusters, recentlyClusteredSOSIds.size]);
  const serviceZones = useMemo<ServiceZoneEntity[]>(
    () => serviceZonesData ?? [],
    [serviceZonesData],
  );
  const activeRealtimeDepotId = useMemo(() => {
    if (!locationPanelOpen || locationPanelData?.type !== "depot") {
      return null;
    }

    return locationPanelData.data.id;
  }, [locationPanelData, locationPanelOpen]);
  const activeRealtimeAssemblyPointId = useMemo(() => {
    if (!locationPanelOpen || locationPanelData?.type !== "assemblyPoint") {
      return null;
    }

    return locationPanelData.data.id;
  }, [locationPanelData, locationPanelOpen]);
  const activeRealtimeClusterIds = useMemo(
    () =>
      [
        rescuePlanOpen ? activeClusterId : null,
        manualMissionOpen ? manualMissionClusterId : null,
      ].filter((clusterId): clusterId is number => Number.isFinite(clusterId)),
    [
      activeClusterId,
      manualMissionClusterId,
      manualMissionOpen,
      rescuePlanOpen,
    ],
  );
  const operationalConnectionState = useOperationalRealtime({
    depotId: activeRealtimeDepotId,
    assemblyPointId: activeRealtimeAssemblyPointId,
    clusterIds: activeRealtimeClusterIds,
  });
  useSosRequestRealtime({
    subscribeUnclustered: true,
    clusterIds: activeRealtimeClusterIds,
  });
  const isConnected = operationalConnectionState === "connected";
  const isConnecting = operationalConnectionState === "connecting";
  const isReconnecting = operationalConnectionState === "reconnecting";
  const isConnectingLike = isConnecting || isReconnecting;
  const connectionLabel = isConnected
    ? "Realtime đang hoạt động"
    : isConnecting
      ? "Đang kết nối realtime"
      : isReconnecting
        ? "Đang kết nối lại realtime"
        : "Realtime tạm ngắt";
  const clusterGroupingStatus = sosClusterGroupingConfigQuery.status;
  const maximumAutoClusterDistanceKm =
    sosClusterGroupingConfigQuery.data?.maximumDistanceKm ?? 0;

  const autoClusters = useMemo(() => {
    if (clusterGroupingStatus !== "success") {
      return [];
    }

    const clusterableSOSRequests =
      recentlyClusteredSOSIds.size === 0
        ? sosRequests
        : sosRequests.filter((sos) => !recentlyClusteredSOSIds.has(sos.id));

    return buildAutoClusters(
      clusterableSOSRequests,
      clusters,
      maximumAutoClusterDistanceKm,
    );
  }, [
    clusterGroupingStatus,
    clusters,
    maximumAutoClusterDistanceKm,
    recentlyClusteredSOSIds,
    sosRequests,
  ]);

  useEffect(() => {
    if (isWeatherMode) {
      return;
    }

    const visibleBounds = mapViewState?.bounds;
    if (!visibleBounds) {
      return;
    }

    setMapFetchBounds((currentBounds) => {
      if (
        currentBounds &&
        getMapBoundsCacheKey(currentBounds) ===
          getMapBoundsCacheKey(visibleBounds)
      ) {
        return currentBounds;
      }

      return visibleBounds;
    });
  }, [isWeatherMode, mapViewState]);

  // ─── Auth ───
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((state) => state.user);
  const { data: userMe } = useUserMe();
  const userDisplayName = userMe
    ? getUserDisplayName(
        {
          firstName: userMe.firstName,
          lastName: userMe.lastName,
          username: userMe.username,
        },
        getUserDisplayName(user),
      )
    : getUserDisplayName(user);
  const userInitials = userMe
    ? getUserAvatarInitials(
        {
          firstName: userMe.firstName,
          lastName: userMe.lastName,
          username: userMe.username,
        },
        getUserAvatarInitials(user),
      )
    : getUserAvatarInitials(user);

  // ─── Mutations ───
  const { mutate: createCluster, isPending: isCreatingCluster } =
    useCreateSOSCluster();
  const { isPending: isFetchingSuggestion } = useClusterRescueSuggestion();
  const isProcessingSOS = isCreatingCluster || isFetchingSuggestion;

  // ─── AI Stream ───
  const aiStream = useAiMissionStream();
  const [aiStreamOpen, setAiStreamOpen] = useState(false);
  const [aiStreamMinimized, setAiStreamMinimized] = useState(false);
  const [aiStreamClusterId, setAiStreamClusterId] = useState<number | null>(
    null,
  );

  // ─── Geolocation ───
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => console.warn("Geolocation error:", err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => console.warn("Geolocation watch error:", err.message),
      { enableHighAccuracy: true },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    setSelectedRescuer((prev) => {
      if (!prev) return prev;
      const nextSelected = rescuers.find((rescuer) => rescuer.id === prev.id);
      return nextSelected ?? null;
    });
  }, [rescuers]);

  useEffect(() => {
    setSelectedTeamIncident((prev) => {
      if (!prev) return prev;
      const nextSelected = teamIncidents.find(
        (incident) => incident.incidentId === prev.incidentId,
      );
      if (nextSelected) return nextSelected;
      setTeamIncidentDetailOpen(false);
      return null;
    });
  }, [teamIncidents]);

  // ─── Sidebar auto-collapse when RescuePlanPanel opens ───
  useEffect(() => {
    if (rescuePlanOpen) {
      sidebarBeforeRescuePlanRef.current = sidebarOpen;
      setSidebarOpen(false);
    } else {
      setSidebarOpen(sidebarBeforeRescuePlanRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescuePlanOpen]);

  // ─── URL → State: Restore selection from URL on initial load ───
  useEffect(() => {
    if (!urlState.selected) return;

    const sel = urlState.selected;
    const shouldOpenClusterPlan = searchParams.get("openPlan") === "1";
    const focusSosId = searchParams.get("focusSosId") ?? "";
    const openAt = searchParams.get("openAt") ?? "";
    const planTabParam = searchParams.get("planTab");
    const planTab =
      planTabParam === "plan" || planTabParam === "missions"
        ? planTabParam
        : "missions";
    const selectionSignature = JSON.stringify({
      selected: sel,
      shouldOpenClusterPlan,
      focusSosId,
      openAt,
      planTab,
    });

    if (sel.type === "sos" && sosRequests.length > 0) {
      const sos = sosRequests.find((s) => s.id === sel.id);
      if (sos) {
        if (lastAppliedSelectionSignatureRef.current === selectionSignature) {
          return;
        }
        setSelectedSOS(sos);
        setSOSDetailOpen(true);
        setRescuePlanOpen(false);
        setLocationPanelOpen(false);
        setTeamIncidentDetailOpen(false);
        setSelectedTeamIncident(null);
        if (!hasInitialView) {
          setFlyToLocation(sos.location);
        }
        lastAppliedSelectionSignatureRef.current = selectionSignature;
      }
    } else if (sel.type === "cluster" && clusters.length > 0) {
      const cluster = clusters.find((c) => c.id === sel.id);
      if (cluster) {
        if (lastAppliedSelectionSignatureRef.current === selectionSignature) {
          return;
        }
        setFlyToZoom(13);
        setFlyToLocation({
          lat: cluster.centerLatitude,
          lng: cluster.centerLongitude,
        });

        if (shouldOpenClusterPlan) {
          setActiveClusterId(cluster.id);
          const cachedSuggestion = suggestionCacheRef.current.get(cluster.id);
          setRescueSuggestion(cachedSuggestion ?? null);
          setRescuePlanDefaultTab(planTab);
          setRescuePlanPreferSplitSuggestion(false);
          setRescuePlanOpen(true);
          setSOSDetailOpen(false);
          setLocationPanelOpen(false);
          setTeamIncidentDetailOpen(false);
          setSelectedTeamIncident(null);
        }

        lastAppliedSelectionSignatureRef.current = selectionSignature;
      }
    } else if (sel.type === "depot" && depots.length > 0) {
      const depot = depots.find((d) => d.id === sel.id);
      if (depot) {
        if (lastAppliedSelectionSignatureRef.current === selectionSignature) {
          return;
        }
        setLocationPanelData({ type: "depot", data: depot });
        setLocationPanelOpen(true);
        if (!hasInitialView) {
          setFlyToLocation({ lat: depot.latitude, lng: depot.longitude });
        }
        lastAppliedSelectionSignatureRef.current = selectionSignature;
      }
    } else if (sel.type === "assemblyPoint" && assemblyPoints.length > 0) {
      const point = assemblyPoints.find((p) => p.id === sel.id);
      if (point) {
        if (lastAppliedSelectionSignatureRef.current === selectionSignature) {
          return;
        }
        setLocationPanelData({ type: "assemblyPoint", data: point });
        setLocationPanelOpen(true);
        if (!hasInitialView) {
          setFlyToLocation({ lat: point.latitude, lng: point.longitude });
        }
        lastAppliedSelectionSignatureRef.current = selectionSignature;
      }
    }
  }, [
    urlState.selected,
    sosRequests,
    clusters,
    depots,
    assemblyPoints,
    hasInitialView,
    searchParams,
  ]);

  // ─── URL → State: Set initial map view from URL ───
  const initialFlyAppliedRef = useRef(false);
  useEffect(() => {
    if (initialFlyAppliedRef.current || !hasInitialView || !urlState.view)
      return;
    setFlyToZoom(urlState.view.zoom);
    setFlyToLocation({ lat: urlState.view.lat, lng: urlState.view.lng });
    initialFlyAppliedRef.current = true;
  }, [hasInitialView, urlState.view]);

  // ─── Handlers ───

  const handleWeatherMapToggle = useCallback(() => {
    if (isWeatherMode) {
      router.push("/dashboard/coordinator");
    } else {
      window.location.href = "/dashboard/coordinator?mode=weather";
    }
  }, [isWeatherMode, router]);

  const syncRescuePlanUrlState = useCallback(
    (
      nextOpen: boolean,
      clusterId: number | null,
      tab?: "plan" | "missions",
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextOpen && clusterId != null) {
        params.set("sel", "cluster");
        params.set("id", String(clusterId));
        params.set("openPlan", "1");
        params.set("openAt", String(Date.now()));
        if (tab) {
          params.set("planTab", tab);
        } else {
          params.delete("planTab");
        }
      } else {
        params.delete("openPlan");
        params.delete("openAt");
        params.delete("focusSosId");
        params.delete("planTab");
      }

      const nextQuery = params.toString();
      router.replace(
        nextQuery
          ? `/dashboard/coordinator?${nextQuery}`
          : "/dashboard/coordinator",
        { scroll: false },
      );
    },
    [router, searchParams],
  );

  const handleRescuePlanOpenChange = useCallback(
    (nextOpen: boolean) => {
      setRescuePlanOpen(nextOpen);
      if (!nextOpen) {
        setRescuePlanPreferSplitSuggestion(false);
      }
      syncRescuePlanUrlState(nextOpen, activeClusterId, rescuePlanDefaultTab);
    },
    [activeClusterId, rescuePlanDefaultTab, syncRescuePlanUrlState],
  );

  const openRescuePlanFromAiResult = useCallback(
    (preferSplit: boolean) => {
      const targetClusterId = activeClusterId ?? aiStreamClusterId;
      if (!targetClusterId) {
        return;
      }
      const latestSuggestion = aiStream.result ?? rescueSuggestion;

      setMixedWarningDialogOpen(false);
      setAiStreamOpen(false);
      setAiStreamMinimized(false);
      if (latestSuggestion) {
        setRescueSuggestion(latestSuggestion);
        suggestionCacheRef.current.set(targetClusterId, latestSuggestion);
      }
      setRescuePlanDefaultTab("plan");
      setRescuePlanPreferSplitSuggestion(preferSplit);
      setRescuePlanOpen(true);
      syncRescuePlanUrlState(true, targetClusterId, "plan");
    },
    [
      activeClusterId,
      aiStream.result,
      aiStreamClusterId,
      rescueSuggestion,
      syncRescuePlanUrlState,
    ],
  );

  const handleAiStreamPrimaryAction = useCallback(() => {
    const mixedWarningMessage =
      aiStream.result?.mixedRescueReliefWarning?.trim() ?? "";

    if (mixedWarningMessage) {
      setMixedWarningDialogOpen(true);
      return;
    }

    openRescuePlanFromAiResult(false);
  }, [aiStream.result?.mixedRescueReliefWarning, openRescuePlanFromAiResult]);

  const handleSOSSelect = useCallback(
    (sos: SOSRequest) => {
      setTeamIncidentDetailOpen(false);
      setSelectedTeamIncident(null);
      setSelectedSOS(sos);
      setFlyToZoom(undefined);
      setFlyToLocation(sos.location);
      setSOSDetailOpen(true);
      handleEntitySelect({ type: "sos", id: sos.id });
    },
    [handleEntitySelect],
  );

  const handleRescuerSelect = useCallback((rescuer: Rescuer) => {
    setTeamIncidentDetailOpen(false);
    setSelectedTeamIncident(null);
    setSelectedRescuer(rescuer);
    setFlyToZoom(undefined);
    setFlyToLocation(rescuer.location);
  }, []);

  const handleTeamIncidentSelect = useCallback(
    (incident: TeamIncidentEntity) => {
      setSelectedSOS(null);
      setSelectedRescuer(null);
      setSOSDetailOpen(false);
      setRescuePlanOpen(false);
      syncRescuePlanUrlState(false, activeClusterId);
      setSelectedTeamIncident(incident);
      setTeamIncidentDetailOpen(true);
      setFlyToZoom(16);
      setFlyToLocation({ lat: incident.latitude, lng: incident.longitude });
    },
    [activeClusterId, syncRescuePlanUrlState],
  );

  const handleDepotSelect = useCallback(
    (depot: DepotEntity) => {
      setLocationPanelData({ type: "depot", data: depot });
      setLocationPanelOpen(true);
      setTeamIncidentDetailOpen(false);
      setSelectedTeamIncident(null);
      setFlyToZoom(undefined);
      setFlyToLocation({ lat: depot.latitude, lng: depot.longitude });
      setSOSDetailOpen(false);
      handleEntitySelect({ type: "depot", id: depot.id });
    },
    [handleEntitySelect],
  );

  const handleAssemblyPointSelect = useCallback(
    (point: AssemblyPointEntity) => {
      setLocationPanelData({ type: "assemblyPoint", data: point });
      setLocationPanelOpen(true);
      setTeamIncidentDetailOpen(false);
      setSelectedTeamIncident(null);
      setFlyToZoom(undefined);
      setFlyToLocation({ lat: point.latitude, lng: point.longitude });
      setSOSDetailOpen(false);
      handleEntitySelect({ type: "assemblyPoint", id: point.id });
    },
    [handleEntitySelect],
  );

  const handleClusterSelect = useCallback(
    (cluster: SOSClusterEntity) => {
      setTeamIncidentDetailOpen(false);
      setSelectedTeamIncident(null);
      setFlyToZoom(13);
      setFlyToLocation({
        lat: Number(cluster.centerLatitude),
        lng: Number(cluster.centerLongitude),
      });
      handleEntitySelect({ type: "cluster", id: cluster.id });
    },
    [handleEntitySelect],
  );

  const handleViewClusterPlan = useCallback(
    (clusterId: number) => {
      setActiveClusterId(clusterId);
      const cluster = clusters.find((c) => c.id === clusterId);
      if (cluster) {
        setFlyToZoom(undefined);
        setFlyToLocation({
          lat: Number(cluster.centerLatitude),
          lng: Number(cluster.centerLongitude),
        });
      }
      // Use cached suggestion if available, otherwise open in history mode
      // (RescuePlanPanel will auto-display the latest from useMissionSuggestions)
      const cached = suggestionCacheRef.current.get(clusterId);
      setRescueSuggestion(cached ?? null);
      setRescuePlanDefaultTab(undefined);
      setRescuePlanPreferSplitSuggestion(false);
      setRescuePlanOpen(true);
      syncRescuePlanUrlState(true, clusterId);
      setSOSDetailOpen(false);
      setLocationPanelOpen(false);
    },
    [clusters, syncRescuePlanUrlState],
  );

  const handleClusterOnly = useCallback(
    (clusterGroups: SOSRequest[][]) => {
      const validClusterGroups = clusterGroups
        .map((group) =>
          group
            .filter((s) => s.status === "PENDING")
            .map((s) => Number(s.id))
            .filter(Boolean),
        )
        .filter((ids) => ids.length > 0);

      if (validClusterGroups.length === 0) {
        toast.error("Không còn SOS chờ xử lý để gom cụm.");
        return;
      }

      let created = 0;
      let failed = 0;
      const total = validClusterGroups.length;

      validClusterGroups.forEach((ids) => {
        createCluster(
          { sosRequestIds: ids },
          {
            onSuccess: (data) => {
              created++;
              markSOSRequestsAsClustered(data.sosRequestIds);
              setActiveClusterId(data.clusterId);
              if (created + failed === total) {
                toast.success(`Đã gom thành công ${created} cụm SOS`);
              }
            },
            onError: (error: any) => {
              failed++;
              console.error("Failed to create cluster:", error);
              if (created + failed === total) {
                if (created > 0) {
                  toast.warning(
                    `Gom được ${created}/${total} cụm. ${failed} cụm thất bại.`,
                  );
                } else {
                  const errorMessage =
                    error.response?.data?.message ||
                    "Không thể gom cụm SOS. Vui lòng thử lại.";
                  toast.error(errorMessage);
                }
              }
            },
          },
        );
      });
    },
    [createCluster, markSOSRequestsAsClustered],
  );

  const handleProcessSOS = useCallback(
    (sosIds: string[]) => {
      const pendingIds = sosIds.filter((id) => {
        const sos = sosRequests.find((s) => s.id === id);
        return sos?.status === "PENDING";
      });
      const ids = pendingIds.map(Number).filter(Boolean);
      if (ids.length === 0) return;

      const clusterIdx = autoClusters.findIndex((cluster) =>
        sosIds.every((id) => cluster.some((s) => s.id === id)),
      );
      setProcessingClusterIndex(clusterIdx >= 0 ? clusterIdx : null);

      if (sosIds.length === 1 && clusterIdx < 0) {
        setProcessingSosId(sosIds[0]);
      }

      createCluster(
        { sosRequestIds: ids },
        {
          onSuccess: (clusterData) => {
            markSOSRequestsAsClustered(clusterData.sosRequestIds);
            setActiveClusterId(clusterData.clusterId);
            setAnalyzingClusterId(clusterData.clusterId);
            setAiStreamClusterId(clusterData.clusterId);
            setRescuePlanPreferSplitSuggestion(false);
            setAiStreamOpen(true);
            setAiStreamMinimized(false);
            aiStream.startStream(clusterData.clusterId);
            setProcessingClusterIndex(null);
            setProcessingSosId(null);
          },
          onError: (error: any) => {
            console.error("Failed to create cluster:", error);
            const errorMessage =
              error.response?.data?.message ||
              "Không thể gom cụm SOS. Vui lòng thử lại.";
            toast.error(errorMessage);
            setProcessingClusterIndex(null);
            setProcessingSosId(null);
          },
        },
      );
    },
    [
      sosRequests,
      autoClusters,
      createCluster,
      aiStream,
      markSOSRequestsAsClustered,
    ],
  );

  const handleAnalyzeCluster = useCallback(
    (clusterId: number) => {
      const cluster = clusters.find((item) => item.id === clusterId);
      if (isClusterMissionLocked(cluster)) {
        toast.info("Cụm này đã có nhiệm vụ đang thực hiện hoặc đã hoàn thành.");
        return;
      }

      setAnalyzingClusterId(clusterId);
      setActiveClusterId(clusterId);
      setAiStreamClusterId(clusterId);
      setRescuePlanPreferSplitSuggestion(false);
      setAiStreamOpen(true);
      setAiStreamMinimized(false);
      aiStream.startStream(clusterId);
    },
    [aiStream, clusters],
  );

  // When stream produces a result, cache it and update sidebar state
  useEffect(() => {
    if (aiStream.result && aiStreamClusterId) {
      setRescueSuggestion(aiStream.result);
      suggestionCacheRef.current.set(aiStreamClusterId, aiStream.result);
      setAnalyzingClusterId(null);
    }
  }, [aiStream.result, aiStreamClusterId]);

  // When stream errors or stops, clear analyzing state
  useEffect(() => {
    if (aiStream.error) {
      setAnalyzingClusterId(null);
    }
  }, [aiStream.error]);

  // When stream finishes loading, clear analyzing state
  useEffect(() => {
    if (!aiStream.loading && aiStreamClusterId) {
      setAnalyzingClusterId(null);
    }
  }, [aiStream.loading, aiStreamClusterId]);

  const handleApproveDecision = useCallback(() => {
    setRescuePlanOpen(false);
    setSOSDetailOpen(false);
    setSelectedSOS(null);
    setRescueSuggestion(null);
    setRescuePlanPreferSplitSuggestion(false);
    setActiveClusterId(null);
    clearSelection();
  }, [clearSelection]);

  const handleOpenManualMission = useCallback(
    (clusterId: number) => {
      const cluster = clusters.find((item) => item.id === clusterId);
      if (isClusterMissionLocked(cluster)) {
        toast.info("Cụm này đã có nhiệm vụ đang thực hiện hoặc đã hoàn thành.");
        return;
      }

      setManualMissionClusterId(clusterId);
      setExistingMissionId(null);
      setManualMissionOpen(true);
      setSOSDetailOpen(false);
      setRescuePlanOpen(false);
      syncRescuePlanUrlState(false, activeClusterId);
      setLocationPanelOpen(false);
    },
    [activeClusterId, clusters, syncRescuePlanUrlState],
  );

  const handleViewMission = useCallback(
    (clusterId: number | null, missionId: number) => {
      setManualMissionClusterId(clusterId);
      setExistingMissionId(missionId);
      setManualMissionOpen(true);
      setSOSDetailOpen(false);
      setRescuePlanOpen(false);
      syncRescuePlanUrlState(false, activeClusterId);
      setLocationPanelOpen(false);
    },
    [activeClusterId, syncRescuePlanUrlState],
  );

  const handleManualMissionCreated = useCallback(() => {
    setManualMissionOpen(false);
    setManualMissionClusterId(null);
    setExistingMissionId(null);
  }, []);

  const handleReAnalyze = useCallback(() => {
    if (!activeClusterId) return;
    const cluster = clusters.find((item) => item.id === activeClusterId);
    if (isClusterMissionLocked(cluster)) {
      toast.info("Cụm này đã có nhiệm vụ đang thực hiện hoặc đã hoàn thành.");
      return;
    }

    setAiStreamClusterId(activeClusterId);
    setAiStreamOpen(true);
    setAiStreamMinimized(false);
    setRescuePlanOpen(false);
    setRescuePlanPreferSplitSuggestion(false);
    syncRescuePlanUrlState(false, activeClusterId);
    aiStream.startStream(activeClusterId);
  }, [activeClusterId, aiStream, clusters, syncRescuePlanUrlState]);

  // ─── Derived data for panels ───

  const activeRescuePlanCluster = useMemo(
    () =>
      activeClusterId
        ? (clusters.find((cluster) => cluster.id === activeClusterId) ?? null)
        : null,
    [activeClusterId, clusters],
  );
  const aiStreamClusterSOSRequestCount = useMemo(() => {
    if (!aiStreamClusterId) return null;

    const cluster = clusters.find((item) => item.id === aiStreamClusterId);
    if (!cluster) return null;

    const count = Number(cluster.sosRequestCount);
    if (Number.isFinite(count) && count > 0) {
      return Math.trunc(count);
    }

    return Array.isArray(cluster.sosRequestIds)
      ? cluster.sosRequestIds.length
      : null;
  }, [aiStreamClusterId, clusters]);
  const isActiveRescuePlanClusterLocked = isClusterMissionLocked(
    activeRescuePlanCluster,
  );

  const rescuePlanSOSRequests = useMemo(
    () => getClusterSOSRequests(activeClusterId, sosRequests, clusters),
    [activeClusterId, sosRequests, clusters],
  );

  const manualMissionSOSRequests = useMemo(
    () => getClusterSOSRequests(manualMissionClusterId, sosRequests, clusters),
    [manualMissionClusterId, sosRequests, clusters],
  );

  const nearbySOSForDetail = useMemo(() => {
    if (!selectedSOS) return [];
    return (
      autoClusters
        .find((c) => c.some((s) => s.id === selectedSOS.id))
        ?.filter((s) => s.id !== selectedSOS.id) ?? []
    );
  }, [selectedSOS, autoClusters]);

  const activeManualCluster = useMemo(
    () =>
      manualMissionClusterId
        ? (clusters.find((c) => c.id === manualMissionClusterId) ?? null)
        : null,
    [manualMissionClusterId, clusters],
  );

  useEffect(() => {
    document.documentElement.classList.add(
      "coordinator-dashboard-viewport-lock",
    );
    document.body.classList.add(
      "coordinator-dashboard-readable",
      "coordinator-dashboard-viewport-lock",
    );

    return () => {
      document.documentElement.classList.remove(
        "coordinator-dashboard-viewport-lock",
      );
      document.body.classList.remove(
        "coordinator-dashboard-readable",
        "coordinator-dashboard-viewport-lock",
      );
    };
  }, []);

  const handleCoordinatorMapViewChange = useCallback(
    (view: MapViewState) => {
      handleMapViewChange(view);
      setMapViewState(view);
    },
    [handleMapViewChange],
  );

  // ── Render ──

  return (
    <div
      data-coordinator-dashboard-root
      className={cn(
        "coordinator-dashboard fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-background",
        isDarkMode && "dark",
      )}
    >
      {/* ━━━ Top Header Bar ━━━ */}
      <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0 relative z-[1200]">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            <SidebarSimple
              className="h-5 w-5"
              weight={sidebarOpen ? "fill" : "regular"}
            />
          </Button>

          <div className="flex items-center gap-2">
            <Image
              src="/icons/resq_typo_logo.svg"
              alt="ReQ-SOS Logo"
              width={80}
              height={32}
              className="dark:invert h-auto w-auto object-contain"
            />
            <Badge variant="secondary" className="text-xs">
              Trung Tâm Điều Phối
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Compact coordinator navigation group */}
          <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/coordinator/chat")}
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
              title="Chat với Victim"
              aria-label="Chat với Victim"
            >
              <ChatCircleDots className="h-4 w-4" />
              <span>Chat</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/coordinator/rescue-teams")}
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
              title="Quản lý Đội cứu hộ"
              aria-label="Quản lý Đội cứu hộ"
            >
              <UsersThree className="h-4 w-4" />
              <span>Đội</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/coordinator/rescuers")}
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
              title="Quản lý Rescuer"
              aria-label="Quản lý Rescuer"
            >
              <User className="h-4 w-4" />
              <span>Rescuer</span>
            </Button>
          </div>

          {/* Connection Status */}
          <div
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-full border",
              isConnected
                ? "border-green-200 bg-green-100 text-green-700 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-400"
                : isConnectingLike
                  ? "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-400"
                  : "border-red-200 bg-red-100 text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-400",
            )}
            title={connectionLabel}
            aria-label={connectionLabel}
          >
            {isConnected ? (
              <>
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-green-500 opacity-75 animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full border border-white/70 bg-green-500 dark:border-zinc-900/70" />
              </>
            ) : isConnectingLike ? (
              <>
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 opacity-75 animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full border border-white/70 bg-amber-500 dark:border-zinc-900/70" />
              </>
            ) : (
              <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full border border-white/70 bg-red-500 dark:border-zinc-900/70" />
            )}
            {isConnected ? (
              <Broadcast className="h-4 w-4" weight="fill" />
            ) : isConnectingLike ? (
              <ArrowsClockwise className="h-4 w-4 animate-spin" weight="bold" />
            ) : (
              <Broadcast className="h-4 w-4" weight="bold" />
            )}
            <span className="sr-only">{connectionLabel}</span>
          </div>

          {/* Weather Map Toggle */}
          <Button
            variant={isWeatherMode ? "default" : "ghost"}
            size="icon"
            onClick={handleWeatherMapToggle}
            title={isWeatherMode ? "Xem bản đồ SOS" : "Xem bản đồ thời tiết"}
            className={isWeatherMode ? "bg-blue-500 hover:bg-blue-600" : ""}
          >
            {isWeatherMode ? (
              <MapTrifold className="h-5 w-5" weight="fill" />
            ) : (
              <CloudSun className="h-5 w-5" />
            )}
          </Button>

          {/* Dark Mode Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {isDarkMode ? (
              <Sun className="h-5 w-5" weight="fill" />
            ) : (
              <Moon className="h-5 w-5" weight="fill" />
            )}
          </Button>

          {/* Notifications */}
          <NotificationBell />

          {/* Settings */}
          <Button variant="ghost" size="icon">
            <Gear className="h-5 w-5" />
          </Button>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8 ring-2 ring-border">
                  {userMe?.avatarUrl ? (
                    <AvatarImage
                      src={userMe.avatarUrl}
                      alt={userDisplayName}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-red-400 to-orange-500 text-sm font-semibold text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-[1200]">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">{userDisplayName}</span>
                  <span className="text-xs text-muted-foreground">
                    Điều phối viên
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Hồ sơ
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Gear className="h-4 w-4" />
                Cài đặt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
                onClick={() => logout()}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                    Đang đăng xuất...
                  </>
                ) : (
                  <>
                    <SignOut className="h-4 w-4" />
                    Đăng xuất
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ━━━ Main Content ━━━ */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "h-full min-h-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-out will-change-[width]",
            sidebarOpen ? "w-88" : "w-0",
          )}
        >
          <div className={cn("h-full w-88", !sidebarOpen && "invisible")}>
            <SOSSidebar
              sosRequests={sosRequests}
              incomingRequests={sidebarSOSRequests}
              incomingPagination={useMemo(
                () => ({
                  page: sidebarSosData?.pageNumber ?? sidebarSOSPage,
                  pageSize: sidebarSosData?.pageSize ?? SIDEBAR_SOS_PAGE_SIZE,
                  totalCount: sidebarSosData?.totalCount ?? 0,
                  onPageChange: setSidebarSOSPage,
                }),
                [
                  sidebarSosData?.pageNumber,
                  sidebarSOSPage,
                  sidebarSosData?.pageSize,
                  sidebarSosData?.totalCount,
                  setSidebarSOSPage,
                ],
              )}
              isIncomingRequestsLoading={isSidebarSosLoading}
              rescuers={rescuers}
              teamIncidents={teamIncidents}
              missions={sidebarMissions}
              onSOSSelect={handleSOSSelect}
              onRescuerSelect={handleRescuerSelect}
              onTeamIncidentSelect={handleTeamIncidentSelect}
              selectedSOS={selectedSOS}
              selectedTeamIncident={selectedTeamIncident}
              autoClusters={autoClusters}
              onCreateCluster={handleProcessSOS}
              onClusterOnly={handleClusterOnly}
              isCreatingCluster={isProcessingSOS}
              processingClusterIndex={processingClusterIndex}
              processingSosId={processingSosId}
              backendClusters={clusters}
              filteredBackendClusters={filteredSidebarClusters}
              onAnalyzeCluster={handleAnalyzeCluster}
              isAnalyzingCluster={aiStream.loading || isFetchingSuggestion}
              analyzingClusterId={analyzingClusterId}
              analyzingStatus={aiStream.status}
              onManualMission={handleOpenManualMission}
              onViewClusterPlan={handleViewClusterPlan}
              onViewMission={handleViewMission}
              selectedStatuses={selectedSOSStatuses}
              onSelectedStatusesChange={setSelectedSOSStatuses}
              selectedPriorities={selectedSOSPriorities}
              onSelectedPrioritiesChange={setSelectedSOSPriorities}
              selectedSosTypes={selectedSosTypes}
              onSelectedSosTypesChange={setSelectedSosTypes}
              sosRequestId={sosRequestIdSearch}
              onSosRequestIdChange={setSosRequestIdSearch}
              selectedClusterStatuses={selectedClusterStatuses}
              onSelectedClusterStatusesChange={setSelectedClusterStatuses}
              selectedClusterPriorities={selectedClusterPriorities}
              onSelectedClusterPrioritiesChange={setSelectedClusterPriorities}
              selectedClusterSosTypes={selectedClusterSosTypes}
              onSelectedClusterSosTypesChange={setSelectedClusterSosTypes}
              sosSort={sosSort}
              onSosSortChange={setSosSort}
              clusterSort={clusterSort}
              onClusterSortChange={setClusterSort}
            />
          </div>
        </aside>


        {/* Map Container */}
        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          {isWeatherMode ? (
            <WindyLeafletMap
              sosRequests={sosRequests}
              rescuers={rescuers}
              depots={depots}
              selectedSOS={selectedSOS}
              selectedRescuer={selectedRescuer}
              onSOSSelect={handleSOSSelect}
              onRescuerSelect={handleRescuerSelect}
              flyToLocation={flyToLocation}
              userLocation={userLocation}
            />
          ) : (
            <>
              <CoordinatorMap
                sosRequests={sosRequests}
                rescuers={rescuers}
                teamIncidents={teamIncidents}
                selectedTeamIncident={selectedTeamIncident}
                depots={depots}
                assemblyPoints={assemblyPoints}
                serviceZones={serviceZones}
                clusters={clusters}
                autoClusters={autoClusters}
                selectedSOS={selectedSOS}
                selectedRescuer={selectedRescuer}
                aiDecision={null}
                onSOSSelect={handleSOSSelect}
                onRescuerSelect={handleRescuerSelect}
                onTeamIncidentSelect={handleTeamIncidentSelect}
                onDepotSelect={handleDepotSelect}
                onAssemblyPointSelect={handleAssemblyPointSelect}
                onClusterSelect={handleClusterSelect}
                flyToLocation={flyToLocation}
                flyToZoom={flyToZoom}
                userLocation={userLocation}
                panelOpen={aiStreamOpen && !aiStreamMinimized}
                onViewChange={handleCoordinatorMapViewChange}
                routeOverlay={routeOverlay}
                risingSOSMarkerIds={risingSOSMarkerIds}
              />

              <MapLegend />

              {/* Floating Action Buttons */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[40] flex items-center gap-3">
                {/* Create SOS Button */}
                <Button
                  size="lg"
                  className="rounded-full shadow-[0_0_30px_rgba(220,38,38,0.4)] bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold gap-2.5 px-8 h-14 border-4 border-white dark:border-zinc-900 overflow-hidden group transition-transform hover:scale-105"
                  onClick={() => {
                    router.push("/dashboard/coordinator/create-sos");
                  }}
                >
                  <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <Phone className="w-5 h-5 animate-bounce" weight="fill" />
                  <span className="tracking-wide">TẠO YÊU CẦU SOS</span>
                </Button>
              </div>

              {/* SOS Details Panel */}
              <SOSDetailsPanel
                open={sosDetailOpen}
                onOpenChange={(open) => {
                  setSOSDetailOpen(open);
                  if (!open) {
                    setSelectedSOS(null);
                  }
                }}
                sosRequest={selectedSOS}
                onProcessSOS={handleProcessSOS}
                isProcessing={isProcessingSOS}
                nearbySOSRequests={nearbySOSForDetail}
                allSOSRequests={sosRequests}
              />

              <TeamIncidentDetailsPanel
                open={teamIncidentDetailOpen}
                onOpenChange={(open) => {
                  setTeamIncidentDetailOpen(open);
                  if (!open) {
                    setSelectedTeamIncident(null);
                  }
                }}
                incident={selectedTeamIncident}
              />

              {/* Rescue Plan Panel */}
              <RescuePlanPanel
                open={rescuePlanOpen}
                onOpenChange={handleRescuePlanOpenChange}
                clusterSOSRequests={rescuePlanSOSRequests}
                clusterId={activeClusterId}
                rescueSuggestion={rescueSuggestion}
                preferSplitSuggestion={rescuePlanPreferSplitSuggestion}
                onApprove={handleApproveDecision}
                onReAnalyze={handleReAnalyze}
                isReAnalyzing={isFetchingSuggestion || aiStream.loading}
                onShowRoute={setRouteOverlay}
                defaultTab={rescuePlanDefaultTab}
                readOnly={isActiveRescuePlanClusterLocked}
              />

              {/* AI Stream Panel */}
              <AiStreamPanel
                open={aiStreamOpen}
                minimized={aiStreamMinimized}
                onMinimize={() => setAiStreamMinimized(true)}
                onRestore={() => {
                  setAiStreamOpen(true);
                  setAiStreamMinimized(false);
                }}
                onClose={() => {
                  if (aiStream.loading) {
                    setAiStreamMinimized(true);
                    return;
                  }

                  setAiStreamOpen(false);
                  setAiStreamMinimized(false);
                  aiStream.stopStream();
                }}
                clusterId={aiStreamClusterId}
                status={aiStream.status}
                statusLog={aiStream.statusLog}
                thinkingText={aiStream.thinkingText}
                result={aiStream.result}
                error={aiStream.error}
                loading={aiStream.loading}
                phase={aiStream.phase}
                clusterSOSRequestCount={aiStreamClusterSOSRequestCount}
                onStop={() => aiStream.stopStream()}
                onRetry={() => {
                  if (aiStreamClusterId) {
                    setAiStreamOpen(true);
                    setAiStreamMinimized(false);
                    aiStream.startStream(aiStreamClusterId);
                  }
                }}
                onViewPlan={() => openRescuePlanFromAiResult(false)}
                onPrimaryAction={handleAiStreamPrimaryAction}
              />

              <Dialog
                open={mixedWarningDialogOpen}
                onOpenChange={setMixedWarningDialogOpen}
              >
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Warning
                        className="h-5 w-5 text-rose-500"
                        weight="fill"
                      />
                      Cảnh báo gộp cứu hộ và cứu trợ
                    </DialogTitle>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => openRescuePlanFromAiResult(true)}
                    >
                      Tách thành nhiệm vụ riêng
                    </Button>
                    <Button onClick={() => openRescuePlanFromAiResult(false)}>
                      Tiếp tục chỉnh sửa nhiệm vụ
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Location Details Panel */}
              <LocationDetailsPanel
                open={locationPanelOpen}
                onOpenChange={(open) => {
                  setLocationPanelOpen(open);
                  if (!open) {
                    setLocationPanelData(null);
                  }
                }}
                location={locationPanelData}
              />

              {/* Manual Mission Builder */}
              <ManualMissionBuilder
                open={manualMissionOpen}
                onOpenChange={setManualMissionOpen}
                clusterId={manualMissionClusterId}
                cluster={activeManualCluster}
                clusterSOSRequests={manualMissionSOSRequests}
                onCreated={handleManualMissionCreated}
                existingMissionId={existingMissionId}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

// ── Page wrapper with Suspense ──

const CoordinatorDashboardPage = () => {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-background animate-in fade-in duration-300">
          {/* Header Skeleton */}
          <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </header>
          {/* Body Skeleton */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <aside className="w-88 h-full min-h-0 shrink-0 border-r bg-background p-4 space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            </aside>
            <main className="relative min-h-0 min-w-0 flex-1">
              <Skeleton className="w-full h-full rounded-none" />
            </main>
          </div>
        </div>
      }
    >
      <CoordinatorDashboardContent />
    </Suspense>
  );
};

export default CoordinatorDashboardPage;
