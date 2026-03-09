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
import { SOSRequest, Rescuer, Location, LocationPanelData } from "@/type";
import { mockRescuers, mockActiveMissions } from "@/lib/mock-data";
import { useSOSRequests } from "@/services/sos_request/hooks";
import type { SOSRequestEntity } from "@/services/sos_request/type";
import {
  useCreateSOSCluster,
  useClusterRescueSuggestion,
  useSOSClusters,
} from "@/services/sos_cluster/hooks";
import type {
  ClusterRescueSuggestionResponse,
  SOSClusterEntity,
} from "@/services/sos_cluster/type";
import { useDepots } from "@/services/depot/hooks";
import { useAssemblyPoints } from "@/services/assembly_points/hooks";
import type { DepotEntity } from "@/services/depot/type";
import type { AssemblyPointEntity } from "@/services/assembly_points/type";
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
} from "@phosphor-icons/react";
import {
  SOSDetailsPanel,
  RescuePlanPanel,
  SOSSidebar,
  LocationDetailsPanel,
  ManualMissionBuilder,
} from "@/components/coordinator";
import { useLogout } from "@/services/auth/hooks";
import { useAuthStore } from "@/stores/auth.store";
import { Skeleton } from "@/components/ui/skeleton";
import { useMapUrlSync } from "@/hooks/useMapUrlSync";

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
function toPriority(level: string): "P1" | "P2" | "P3" {
  if (level === "Critical" || level === "High") return "P1";
  if (level === "Medium") return "P2";
  return "P3";
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
  const si = entity.senderInfo;
  const nm = entity.networkMetadata;
  const supplies = sd?.supplies ?? [];

  return {
    id: String(entity.id),
    groupId: entity.clusterId ? String(entity.clusterId) : String(entity.id),
    location: { lat: entity.latitude, lng: entity.longitude },
    priority: toPriority(entity.priorityLevel),
    needs: {
      medical: sd?.need_medical ?? supplies.includes("MEDICINE"),
      food: supplies.includes("FOOD") || supplies.includes("WATER"),
      boat:
        supplies.includes("RESCUE_EQUIPMENT") ||
        supplies.includes("TRANSPORTATION"),
    },
    status: toStatus(entity.status),
    message: entity.msg,
    createdAt: new Date(entity.createdAt),
    peopleCount: sd?.people_count,
    waitTimeMinutes: entity.waitTimeMinutes,
    situation: sd?.situation,
    medicalIssues: sd?.medical_issues,
    supplies: sd?.supplies,
    canMove: sd?.can_move,
    hasInjured: sd?.has_injured,
    othersAreStable: sd?.others_are_stable,
    additionalDescription: sd?.additional_description,
    senderPhone: si?.user_phone,
    senderName: si?.user_name,
    isOnline: si?.is_online,
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

  const priorityOrder = { P1: 0, P2: 1, P3: 2 };
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
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);
  const [flyToZoom, setFlyToZoom] = useState<number | undefined>(undefined);
  const [isConnected] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  // ─── Panel State ───
  const [sosDetailOpen, setSOSDetailOpen] = useState(false);
  const [rescuePlanOpen, setRescuePlanOpen] = useState(false);
  const [rescueSuggestion, setRescueSuggestion] =
    useState<ClusterRescueSuggestionResponse | null>(null);
  const [activeClusterId, setActiveClusterId] = useState<number | null>(null);
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
  const { data: sosData } = useSOSRequests();
  const { data: depotsData } = useDepots({ params: { pageSize: 100 } });
  const { data: assemblyPointsData } = useAssemblyPoints({
    params: { pageSize: 100 },
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
      setSelectedSOS(sos);
      setFlyToZoom(undefined);
      setFlyToLocation(sos.location);
      setSOSDetailOpen(true);
      handleEntitySelect({ type: "sos", id: sos.id });
    },
    [handleEntitySelect],
  );

  const handleRescuerSelect = useCallback((rescuer: Rescuer) => {
    setSelectedRescuer(rescuer);
    setFlyToZoom(undefined);
    setFlyToLocation(rescuer.location);
  }, []);

  const handleDepotSelect = useCallback(
    (depot: DepotEntity) => {
      setLocationPanelData({ type: "depot", data: depot });
      setLocationPanelOpen(true);
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
      setFlyToZoom(undefined);
      setFlyToLocation({ lat: point.latitude, lng: point.longitude });
      setSOSDetailOpen(false);
      handleEntitySelect({ type: "assemblyPoint", id: point.id });
    },
    [handleEntitySelect],
  );

  const handleClusterSelect = useCallback(
    (cluster: SOSClusterEntity) => {
      setFlyToZoom(13);
      setFlyToLocation({
        lat: cluster.centerLatitude,
        lng: cluster.centerLongitude,
      });
      handleEntitySelect({ type: "cluster", id: cluster.id });
    },
    [handleEntitySelect],
  );

  const handleViewClusterPlan = useCallback(
    (clusterId: number) => {
      setActiveClusterId(clusterId);
      setRescueSuggestion(null);
      const cluster = clusters.find((c) => c.id === clusterId);
      if (cluster) {
        setFlyToZoom(undefined);
        setFlyToLocation({
          lat: cluster.centerLatitude,
          lng: cluster.centerLongitude,
        });
      }
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
            fetchClusterRescueSuggestion(clusterData.clusterId, {
              onSuccess: (suggestion) => {
                if (!suggestion.isSuccess) {
                  toast.error(
                    suggestion.errorMessage ||
                      "Đề xuất AI không thành công. Vui lòng thử lại.",
                  );
                  setProcessingClusterIndex(null);
                  setProcessingSosId(null);
                  return;
                }
                setRescueSuggestion(suggestion);
                setRescuePlanOpen(true);
                setProcessingClusterIndex(null);
                setProcessingSosId(null);
              },
              onError: (error) => {
                console.error("Failed to get rescue suggestion:", error);
                toast.error(
                  "Đã gom cụm thành công nhưng không thể lấy đề xuất AI. Vui lòng thử lại.",
                );
                setProcessingClusterIndex(null);
                setProcessingSosId(null);
              },
            });
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
      fetchClusterRescueSuggestion(clusterId, {
        onSuccess: (suggestion) => {
          setAnalyzingClusterId(null);
          if (!suggestion.isSuccess) {
            toast.error(
              suggestion.errorMessage ||
                "Đề xuất AI không thành công. Vui lòng thử lại.",
            );
            return;
          }
          setRescueSuggestion(suggestion);
          setRescuePlanOpen(true);
        },
        onError: (error) => {
          console.error("Failed to get rescue suggestion:", error);
          toast.error("Không thể lấy đề xuất AI. Vui lòng thử lại.");
          setAnalyzingClusterId(null);
        },
      });
    },
    [fetchClusterRescueSuggestion],
  );

  const handleApproveDecision = useCallback(() => {
    toast.success("Nhiệm vụ đã được phê duyệt và gửi đến đội cứu hộ!");
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
    (clusterId: number, missionId: number) => {
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
    fetchClusterRescueSuggestion(activeClusterId, {
      onSuccess: (suggestion) => {
        if (!suggestion.isSuccess) {
          toast.error(
            suggestion.errorMessage ||
              "Phân tích lại không thành công. Vui lòng thử lại.",
          );
          return;
        }
        setRescueSuggestion(suggestion);
        toast.success("Đã phân tích lại thành công!");
      },
      onError: () => {
        toast.error("Không thể phân tích lại. Vui lòng thử lại.");
      },
    });
  }, [activeClusterId, fetchClusterRescueSuggestion]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      document.documentElement.classList.toggle("dark");
      return !prev;
    });
  }, []);

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
              className="dark:invert h-8 w-auto object-contain"
            />
            <Badge variant="secondary" className="text-xs">
              Miền Trung
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
              isConnected
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            )}
          >
            {isConnected ? (
              <>
                <WifiHigh className="h-3 w-3" weight="bold" />
                <span>Đang kết nối</span>
              </>
            ) : (
              <>
                <WifiSlash className="h-3 w-3" weight="bold" />
                <span>Mất kết nối</span>
              </>
            )}
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
            sidebarOpen ? "w-80" : "w-0",
          )}
        >
          {sidebarOpen && (
            <SOSSidebar
              sosRequests={sosRequests}
              rescuers={mockRescuers}
              missions={mockActiveMissions}
              onSOSSelect={handleSOSSelect}
              onRescuerSelect={handleRescuerSelect}
              selectedSOS={selectedSOS}
              autoClusters={autoClusters}
              onCreateCluster={handleProcessSOS}
              onClusterOnly={handleClusterOnly}
              isCreatingCluster={isProcessingSOS}
              processingClusterIndex={processingClusterIndex}
              processingSosId={processingSosId}
              backendClusters={clusters}
              onAnalyzeCluster={handleAnalyzeCluster}
              isAnalyzingCluster={isFetchingSuggestion}
              analyzingClusterId={analyzingClusterId}
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
              rescuers={mockRescuers}
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
                rescuers={mockRescuers}
                depots={depots}
                assemblyPoints={assemblyPoints}
                clusters={clusters}
                selectedSOS={selectedSOS}
                selectedRescuer={selectedRescuer}
                aiDecision={null}
                onSOSSelect={handleSOSSelect}
                onRescuerSelect={handleRescuerSelect}
                onDepotSelect={handleDepotSelect}
                onAssemblyPointSelect={handleAssemblyPointSelect}
                onClusterSelect={handleClusterSelect}
                flyToLocation={flyToLocation}
                flyToZoom={flyToZoom}
                userLocation={userLocation}
                onViewChange={handleMapViewChange}
              />

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
                          P1 Khẩn cấp
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-500">
                          {
                            mockRescuers.filter((r) => r.status === "AVAILABLE")
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

              {/* Rescue Plan Panel */}
              <RescuePlanPanel
                open={rescuePlanOpen}
                onOpenChange={setRescuePlanOpen}
                clusterSOSRequests={rescuePlanSOSRequests}
                clusterId={activeClusterId}
                rescueSuggestion={rescueSuggestion}
                onApprove={handleApproveDecision}
                onReAnalyze={handleReAnalyze}
                isReAnalyzing={isFetchingSuggestion}
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
            <aside className="w-80 shrink-0 border-r bg-background p-4 space-y-4">
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
