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
import { useSOSRequests } from "@/services/sos_request/hooks";
import type { SOSRequestEntity } from "@/services/sos_request/type";
import {
  useCreateSOSCluster,
  useClusterRescueSuggestion,
  useSOSClusters,
  useAiMissionStream,
} from "@/services/sos_cluster/hooks";
import { useTeamIncidents } from "@/services/team_incidents/hooks";
import type {
  ClusterRescueSuggestionResponse,
  SOSClusterEntity,
} from "@/services/sos_cluster/type";
import { useDepots } from "@/services/depot/hooks";
import { useAssemblyPoints } from "@/services/assembly_points/hooks";
import { useRescueTeams } from "@/services/rescue_teams/hooks";
import type { DepotEntity } from "@/services/depot/type";
import type { AssemblyPointEntity } from "@/services/assembly_points/type";
import type {
  RescueTeamEntity,
  RescueTeamTypeKey,
} from "@/services/rescue_teams/type";
import type { TeamIncidentEntity } from "@/services/team_incidents/type";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Bell,
  Gear,
  User,
  WifiHigh,
  WifiSlash,
  Sun,
  Moon,
  CloudSun,
  MapTrifold,
  SignOut,
  Phone,
  UsersThree,
  ChatCircleDots,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useMapUrlSync } from "@/hooks/useMapUrlSync";
import { deriveSOSNeeds } from "@/lib/sos";

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

/** Map backend priority to frontend priority code */
function toPriority(level: string): "P1" | "P2" | "P3" | "P4" {
  if (level === "Critical") return "P1";
  if (level === "High") return "P2";
  if (level === "Medium") return "P3";
  return "P4";
}

/** Map backend status to frontend status */
function toStatus(status: string): "PENDING" | "ASSIGNED" | "RESCUED" {
  if (status === "Pending") return "PENDING";
  if (status === "InProgress" || status === "Assigned") return "ASSIGNED";
  return "RESCUED";
}

/** Convert SOSRequestEntity from API to SOSRequest used by UI */
function mapEntityToSOS(entity: SOSRequestEntity): SOSRequest {
  const sd = entity.structuredData;
  const victimInfo = entity.victimInfo ?? entity.senderInfo ?? null;
  const reporterInfo = entity.reporterInfo ?? null;
  const nm = entity.networkMetadata;
  const supplies = sd?.supplies ?? [];
  const supplyDetails = sd?.supply_details;
  const createdAt = new Date(entity.createdAt);
  const computedWaitTimeMinutes = Math.max(
    0,
    Math.floor((Date.now() - createdAt.getTime()) / 60000),
  );
  const needs = deriveSOSNeeds(sd, entity.sosType);

  return {
    id: String(entity.id),
    groupId: entity.clusterId ? String(entity.clusterId) : String(entity.id),
    location: { lat: entity.latitude, lng: entity.longitude },
    priority: toPriority(entity.priorityLevel),
    needs,
    status: toStatus(entity.status),
    message: entity.msg,
    createdAt,
    receivedAt: entity.receivedAt ? new Date(entity.receivedAt) : null,
    peopleCount: sd?.people_count,
    injuredPersons: sd?.injured_persons?.map((person) => ({
      index: person.index,
      name: person.name,
      customName: person.custom_name,
      personType: person.person_type,
      medicalIssues: person.medical_issues,
      severity: person.severity,
    })),
    waitTimeMinutes: computedWaitTimeMinutes,
    sosType: entity.sosType ?? undefined,
    situation: sd?.situation,
    medicalIssues: sd?.medical_issues,
    supplies: supplies.length > 0 ? supplies : undefined,
    canMove: sd?.can_move,
    hasInjured: sd?.has_injured,
    othersAreStable: sd?.others_are_stable,
    additionalDescription: sd?.additional_description ?? undefined,
    otherSupplyDescription: sd?.other_supply_description ?? undefined,
    structuredData: sd,
    supplyDetails,
    specialDietPersons: supplyDetails?.special_diet_persons ?? undefined,
    clothingPersons: supplyDetails?.clothing_persons ?? undefined,
    medicalSupportNeeds: supplyDetails?.medical_needs ?? undefined,
    medicalDescription: supplyDetails?.medical_description ?? undefined,
    waterDuration: supplyDetails?.water_duration ?? undefined,
    waterRemaining: supplyDetails?.water_remaining ?? undefined,
    foodDuration: supplyDetails?.food_duration ?? undefined,
    areBlanketsEnough: supplyDetails?.are_blankets_enough,
    blanketRequestCount: supplyDetails?.blanket_request_count,
    address: sd?.address ?? undefined,
    victimPhone: victimInfo?.user_phone ?? undefined,
    victimName: victimInfo?.user_name ?? undefined,
    reporterPhone: reporterInfo?.user_phone ?? undefined,
    reporterName:
      reporterInfo?.user_name ?? entity.createdByCoordinatorName ?? undefined,
    createdByCoordinatorId: entity.createdByCoordinatorId ?? null,
    createdByCoordinatorName:
      entity.createdByCoordinatorName ??
      (entity as { createdByCoordinator?: { fullName?: string | null } })
        .createdByCoordinator?.fullName ??
      null,
    isSentOnBehalf:
      entity.isSentOnBehalf ?? Boolean(entity.createdByCoordinatorId),
    reporterIsOnline:
      reporterInfo?.is_online ?? entity.senderInfo?.is_online ?? undefined,
    hopCount: nm?.hop_count,
    locationAccuracy: entity.locationAccuracy,
  };
}

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

/** Group nearby PENDING SOS requests within 10km using Union-Find */
function buildAutoClusters(sosRequests: SOSRequest[]): SOSRequest[][] {
  const pending = sosRequests.filter(
    (s) => s.status === "PENDING" && s.groupId === s.id,
  );
  const n = pending.length;
  if (n < 2) return [];

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number =>
    parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversine(
        pending[i].location.lat,
        pending[i].location.lng,
        pending[j].location.lat,
        pending[j].location.lng,
      );
      if (d <= 10) union(i, j);
    }
  }

  const groups = new Map<number, SOSRequest[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(pending[i]);
  }

  const priorityOrder = { P1: 0, P2: 1, P3: 2, P4: 3 };
  return Array.from(groups.values())
    .filter((g) => g.length >= 2)
    .sort(
      (a, b) =>
        Math.min(...a.map((s) => priorityOrder[s.priority])) -
        Math.min(...b.map((s) => priorityOrder[s.priority])),
    );
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

// ── Main Dashboard Content ──

const CoordinatorDashboardContent = () => {
  // ─── URL Sync ───
  const {
    urlState,
    hasInitialView,
    initialCenter,
    initialZoom,
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
  const [isConnected] = useState(true);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
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
  const [rescueSuggestion, setRescueSuggestion] =
    useState<ClusterRescueSuggestionResponse | null>(null);
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

  // ─── Refs ───
  const sidebarBeforeRescuePlanRef = useRef(true);
  const initialSelectionAppliedRef = useRef(false);
  const [notificationCount] = useState(3);

  // ─── Data Fetching ───
  const { data: sosData } = useSOSRequests({
    params: { pageSize: 200 },
  });
  const { data: depotsData } = useDepots({ params: { pageSize: 100 } });
  const { data: assemblyPointsData } = useAssemblyPoints({
    params: { pageSize: 100 },
  });
  const { data: teamIncidentsData } = useTeamIncidents();
  const { data: rescueTeamsData } = useRescueTeams({
    params: { pageSize: 200 },
  });
  const { data: clustersData } = useSOSClusters();

  const sosRequests = useMemo(
    () => sosData?.items?.map(mapEntityToSOS) ?? [],
    [sosData],
  );
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

  const autoClusters = useMemo(
    () => buildAutoClusters(sosRequests),
    [sosRequests],
  );

  // ─── Auth ───
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((state) => state.user);
  const userInitials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  // ─── Mutations ───
  const { mutate: createCluster, isPending: isCreatingCluster } =
    useCreateSOSCluster();
  const {
    mutate: fetchClusterRescueSuggestion,
    isPending: isFetchingSuggestion,
  } = useClusterRescueSuggestion();
  const isProcessingSOS = isCreatingCluster || isFetchingSuggestion;

  // ─── AI Stream ───
  const aiStream = useAiMissionStream();
  const [aiStreamOpen, setAiStreamOpen] = useState(false);
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
    if (!selectedRescuer) return;

    const nextSelected = rescuers.find(
      (rescuer) => rescuer.id === selectedRescuer.id,
    );
    if (nextSelected) {
      setSelectedRescuer(nextSelected);
      return;
    }

    setSelectedRescuer(null);
  }, [rescuers, selectedRescuer]);

  useEffect(() => {
    if (!selectedTeamIncident) return;

    const nextSelected = teamIncidents.find(
      (incident) => incident.incidentId === selectedTeamIncident.incidentId,
    );
    if (nextSelected) {
      setSelectedTeamIncident(nextSelected);
      return;
    }

    setSelectedTeamIncident(null);
    setTeamIncidentDetailOpen(false);
  }, [teamIncidents, selectedTeamIncident]);

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
    if (initialSelectionAppliedRef.current) return;
    if (!urlState.selected) return;

    const sel = urlState.selected;

    if (sel.type === "sos" && sosRequests.length > 0) {
      const sos = sosRequests.find((s) => s.id === sel.id);
      if (sos) {
        setSelectedSOS(sos);
        setSOSDetailOpen(true);
        if (!hasInitialView) {
          setFlyToLocation(sos.location);
        }
        initialSelectionAppliedRef.current = true;
      }
    } else if (sel.type === "cluster" && clusters.length > 0) {
      const cluster = clusters.find((c) => c.id === sel.id);
      if (cluster) {
        setFlyToZoom(13);
        setFlyToLocation({
          lat: cluster.centerLatitude,
          lng: cluster.centerLongitude,
        });
        initialSelectionAppliedRef.current = true;
      }
    } else if (sel.type === "depot" && depots.length > 0) {
      const depot = depots.find((d) => d.id === sel.id);
      if (depot) {
        setLocationPanelData({ type: "depot", data: depot });
        setLocationPanelOpen(true);
        if (!hasInitialView) {
          setFlyToLocation({ lat: depot.latitude, lng: depot.longitude });
        }
        initialSelectionAppliedRef.current = true;
      }
    } else if (sel.type === "assemblyPoint" && assemblyPoints.length > 0) {
      const point = assemblyPoints.find((p) => p.id === sel.id);
      if (point) {
        setLocationPanelData({ type: "assemblyPoint", data: point });
        setLocationPanelOpen(true);
        if (!hasInitialView) {
          setFlyToLocation({ lat: point.latitude, lng: point.longitude });
        }
        initialSelectionAppliedRef.current = true;
      }
    }
  }, [
    urlState.selected,
    sosRequests,
    clusters,
    depots,
    assemblyPoints,
    hasInitialView,
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
      setSelectedTeamIncident(incident);
      setTeamIncidentDetailOpen(true);
      setFlyToZoom(16);
      setFlyToLocation({ lat: incident.latitude, lng: incident.longitude });
    },
    [],
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
      setRescuePlanOpen(true);
      setSOSDetailOpen(false);
      setLocationPanelOpen(false);
    },
    [clusters],
  );

  const handleClusterOnly = useCallback(
    (clusterGroups: SOSRequest[][]) => {
      let created = 0;
      let failed = 0;
      const total = clusterGroups.length;

      clusterGroups.forEach((group) => {
        const ids = group
          .filter((s) => s.status === "PENDING")
          .map((s) => Number(s.id))
          .filter(Boolean);
        if (ids.length < 2) return;

        createCluster(
          { sosRequestIds: ids },
          {
            onSuccess: (data) => {
              created++;
              setActiveClusterId(data.clusterId);
              if (created + failed === total) {
                toast.success(`Đã gom thành công ${created} cụm SOS`);
              }
            },
            onError: (error) => {
              failed++;
              console.error("Failed to create cluster:", error);
              if (created + failed === total) {
                if (created > 0) {
                  toast.warning(
                    `Gom được ${created}/${total} cụm. ${failed} cụm thất bại.`,
                  );
                } else {
                  toast.error("Không thể gom cụm SOS. Vui lòng thử lại.");
                }
              }
            },
          },
        );
      });
    },
    [createCluster],
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
            setActiveClusterId(clusterData.clusterId);
            setAnalyzingClusterId(clusterData.clusterId);
            setAiStreamClusterId(clusterData.clusterId);
            setAiStreamOpen(true);
            aiStream.startStream(clusterData.clusterId);
            setProcessingClusterIndex(null);
            setProcessingSosId(null);
          },
          onError: (error) => {
            console.error("Failed to create cluster:", error);
            toast.error("Không thể gom cụm SOS. Vui lòng thử lại.");
            setProcessingClusterIndex(null);
            setProcessingSosId(null);
          },
        },
      );
    },
    [sosRequests, autoClusters, createCluster, fetchClusterRescueSuggestion],
  );

  const handleAnalyzeCluster = useCallback(
    (clusterId: number) => {
      setAnalyzingClusterId(clusterId);
      setActiveClusterId(clusterId);
      setAiStreamClusterId(clusterId);
      setAiStreamOpen(true);
      aiStream.startStream(clusterId);
    },
    [aiStream],
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
    toast.success("Đã gửi nhiệm vụ thành công");
    setRescuePlanOpen(false);
    setSOSDetailOpen(false);
    setSelectedSOS(null);
    setRescueSuggestion(null);
    setActiveClusterId(null);
    clearSelection();
  }, [clearSelection]);

  const handleOpenManualMission = useCallback((clusterId: number) => {
    setManualMissionClusterId(clusterId);
    setExistingMissionId(null);
    setManualMissionOpen(true);
    setSOSDetailOpen(false);
    setRescuePlanOpen(false);
    setLocationPanelOpen(false);
  }, []);

  const handleViewMission = useCallback(
    (clusterId: number | null, missionId: number) => {
      setManualMissionClusterId(clusterId);
      setExistingMissionId(missionId);
      setManualMissionOpen(true);
      setSOSDetailOpen(false);
      setRescuePlanOpen(false);
      setLocationPanelOpen(false);
    },
    [],
  );

  const handleManualMissionCreated = useCallback(() => {
    setManualMissionOpen(false);
    setManualMissionClusterId(null);
    setExistingMissionId(null);
  }, []);

  const handleReAnalyze = useCallback(() => {
    if (!activeClusterId) return;
    setAiStreamClusterId(activeClusterId);
    setAiStreamOpen(true);
    setRescuePlanOpen(false);
    aiStream.startStream(activeClusterId);
  }, [activeClusterId, aiStream]);

  // ─── Derived data for panels ───

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

  // ── Render ──

  return (
    <div
      className={cn(
        "h-screen flex flex-col overflow-hidden",
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
              Miền Trung
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Coordinator Chat Navigation */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/coordinator/chat")}
            className="flex items-center gap-2"
          >
            <ChatCircleDots className="h-4 w-4" />
            <span>Chat với Victim</span>
          </Button>

          {/* Rescue Teams Navigation */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/coordinator/rescue-teams")}
            className="flex items-center gap-2"
          >
            <UsersThree className="h-4 w-4" />
            <span>Quản lý Đội cứu hộ</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/coordinator/rescuers")}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            <span>Quản lý Rescuer</span>
          </Button>

          {/* Connection Status */}
          <div
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-full border",
              isConnected
                ? "border-green-200 bg-green-100 text-green-700 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-400"
                : "border-red-200 bg-red-100 text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-400",
            )}
            title={isConnected ? "Đang kết nối" : "Mất kết nối"}
            aria-label={isConnected ? "Đang kết nối" : "Mất kết nối"}
          >
            {isConnected ? (
              <>
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-green-500 opacity-75 animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full border border-white/70 bg-green-500 dark:border-zinc-900/70" />
              </>
            ) : (
              <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full border border-white/70 bg-red-500 dark:border-zinc-900/70" />
            )}
            {isConnected ? (
              <WifiHigh className="h-4 w-4" weight="bold" />
            ) : (
              <WifiSlash className="h-4 w-4" weight="bold" />
            )}
            <span className="sr-only">
              {isConnected ? "Đang kết nối" : "Mất kết nối"}
            </span>
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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="icon">
            <Gear className="h-5 w-5" />
          </Button>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                  {userInitials}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-[1200]">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {user?.fullName || "Người dùng"}
                  </span>
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
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
            sidebarOpen ? "w-88" : "w-0",
          )}
        >
          {sidebarOpen && (
            <SOSSidebar
              sosRequests={sosRequests}
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
              onAnalyzeCluster={handleAnalyzeCluster}
              isAnalyzingCluster={aiStream.loading || isFetchingSuggestion}
              analyzingClusterId={analyzingClusterId}
              analyzingStatus={aiStream.status}
              onManualMission={handleOpenManualMission}
              onViewClusterPlan={handleViewClusterPlan}
              onViewMission={handleViewMission}
            />
          )}
        </aside>

        {/* Map Container */}
        <main className="flex-1 relative overflow-hidden">
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
                onViewChange={handleMapViewChange}
                routeOverlay={routeOverlay}
              />

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

              {/* Floating Stats Panel */}
              {!sosDetailOpen && (
                <div className="absolute top-4 right-4 z-[40]">
                  <div className="bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Thống kê thời gian thực
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-red-500">
                          {
                            sosRequests.filter(
                              (s) =>
                                s.priority === "P1" && s.status === "PENDING",
                            ).length
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          P1 Rất nghiêm trọng
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-500">
                          {
                            rescuers.filter((r) => r.status === "AVAILABLE")
                              .length
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Đội sẵn sàng
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SOS Details Panel */}
              <SOSDetailsPanel
                open={sosDetailOpen}
                onOpenChange={setSOSDetailOpen}
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
                onOpenChange={setRescuePlanOpen}
                clusterSOSRequests={rescuePlanSOSRequests}
                clusterId={activeClusterId}
                rescueSuggestion={rescueSuggestion}
                onApprove={handleApproveDecision}
                onReAnalyze={handleReAnalyze}
                isReAnalyzing={isFetchingSuggestion || aiStream.loading}
                onShowRoute={setRouteOverlay}
                defaultTab={rescuePlanDefaultTab}
              />

              {/* AI Stream Panel */}
              <AiStreamPanel
                open={aiStreamOpen}
                onClose={() => {
                  setAiStreamOpen(false);
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
                onStop={() => aiStream.stopStream()}
                onRetry={() => {
                  if (aiStreamClusterId) {
                    aiStream.startStream(aiStreamClusterId);
                  }
                }}
                onViewPlan={() => {
                  setAiStreamOpen(false);
                  setRescuePlanDefaultTab("plan");
                  setRescuePlanOpen(true);
                }}
              />

              {/* Location Details Panel */}
              <LocationDetailsPanel
                open={locationPanelOpen}
                onOpenChange={setLocationPanelOpen}
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
        <div className="h-screen flex flex-col overflow-hidden animate-in fade-in duration-300">
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
          <div className="flex-1 flex overflow-hidden">
            <aside className="w-88 shrink-0 border-r bg-background p-4 space-y-4">
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
            <main className="flex-1 relative">
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
