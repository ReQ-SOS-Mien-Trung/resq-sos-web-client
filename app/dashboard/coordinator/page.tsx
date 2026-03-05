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

// Inner component that uses searchParams
const CoordinatorDashboardContent = () => {
  // URL params for weather map mode
  const searchParams = useSearchParams();
  const router = useRouter();
  const isWeatherMode = searchParams.get("mode") === "weather";

  // State management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedSOS, setSelectedSOS] = useState<SOSRequest | null>(null);
  const [selectedRescuer, setSelectedRescuer] = useState<Rescuer | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);
  const [flyToZoom, setFlyToZoom] = useState<number | undefined>(undefined);
  const [isConnected] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Geolocation: current device position
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  // Panel states
  const [sosDetailOpen, setSOSDetailOpen] = useState(false);
  const [rescuePlanOpen, setRescuePlanOpen] = useState(false);
  const [rescueSuggestion, setRescueSuggestion] =
    useState<ClusterRescueSuggestionResponse | null>(null);
  const [activeClusterId, setActiveClusterId] = useState<number | null>(null);
  const [locationPanelOpen, setLocationPanelOpen] = useState(false);
  const [locationPanelData, setLocationPanelData] =
    useState<LocationPanelData | null>(null);

  // Manual mission builder
  const [manualMissionOpen, setManualMissionOpen] = useState(false);
  const [manualMissionClusterId, setManualMissionClusterId] = useState<number | null>(null);

  // Multi-select SOS for clustering
  const [processingClusterIndex, setProcessingClusterIndex] = useState<
    number | null
  >(null);

  // Track which backend cluster is being analyzed
  const [analyzingClusterId, setAnalyzingClusterId] = useState<number | null>(null);

  // Remember sidebar state before RescuePlanPanel opens
  const sidebarBeforeRescuePlanRef = useRef(true);

  // Track if CoordinatorMap has been loaded (which loads Leaflet 1.9.4)
  const coordinatorMapLoadedRef = useRef(false);

  // Handle weather map toggle - use URL navigation to force full page reload
  const handleWeatherMapToggle = useCallback(() => {
    if (isWeatherMode) {
      // Switch back to SOS map - remove mode param
      router.push("/dashboard/coordinator");
    } else {
      // Switch to weather map - add mode param (this will cause a navigation/reload)
      window.location.href = "/dashboard/coordinator?mode=weather";
    }
  }, [isWeatherMode, router]);

  // Track when CoordinatorMap loads
  useEffect(() => {
    if (!isWeatherMode) {
      coordinatorMapLoadedRef.current = true;
    }
  }, [isWeatherMode]);

  // Watch user's current geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );

    // Continuously watch position
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn("Geolocation watch error:", err.message);
      },
      { enableHighAccuracy: true },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Auto-collapse sidebar when RescuePlanPanel opens, restore when it closes
  useEffect(() => {
    if (rescuePlanOpen) {
      sidebarBeforeRescuePlanRef.current = sidebarOpen;
      setSidebarOpen(false);
    } else {
      setSidebarOpen(sidebarBeforeRescuePlanRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescuePlanOpen]);

  // Notification count (mock)
  const [notificationCount] = useState(3);

  // Fetch SOS requests from backend
  const { data: sosData } = useSOSRequests();

  // Map SOSRequestEntity → SOSRequest (for sidebar/panels)
  const sosRequests: SOSRequest[] = useMemo(() => {
    if (!sosData?.items) return [];
    return sosData.items.map(
      (entity: SOSRequestEntity): SOSRequest => {
        const sd = entity.structuredData;
        const si = entity.senderInfo;
        const nm = entity.networkMetadata;
        const supplies = sd?.supplies ?? [];

        return {
          id: String(entity.id),
          groupId: entity.clusterId
            ? String(entity.clusterId)
            : String(entity.id),
          location: { lat: entity.latitude, lng: entity.longitude },
          priority:
            entity.priorityLevel === "Critical"
              ? "P1"
              : entity.priorityLevel === "High"
                ? "P1"
                : entity.priorityLevel === "Medium"
                  ? "P2"
                  : "P3",
          needs: {
            medical: sd?.need_medical ?? supplies.includes("MEDICINE"),
            food: supplies.includes("FOOD") || supplies.includes("WATER"),
            boat: supplies.includes("RESCUE_EQUIPMENT") || supplies.includes("TRANSPORTATION"),
          },
          status:
            entity.status === "Pending"
              ? "PENDING"
              : entity.status === "InProgress" || entity.status === "Assigned"
                ? "ASSIGNED"
                : "RESCUED",
          message: entity.msg,
          createdAt: new Date(entity.createdAt),
          // Extended fields
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
      },
    );
  }, [sosData]);

  // Fetch depots from backend for map display
  const { data: depotsData } = useDepots({
    params: { pageSize: 100 },
  });

  const depots: DepotEntity[] = useMemo(() => {
    if (!depotsData?.items) return [];
    return depotsData.items;
  }, [depotsData]);

  // Fetch assembly points from backend for map display
  const { data: assemblyPointsData } = useAssemblyPoints({
    params: { pageSize: 100 },
  });

  const assemblyPoints: AssemblyPointEntity[] = useMemo(() => {
    if (!assemblyPointsData?.items) return [];
    return assemblyPointsData.items;
  }, [assemblyPointsData]);

  // Fetch SOS clusters for map display
  const { data: clustersData } = useSOSClusters();

  const clusters: SOSClusterEntity[] = useMemo(() => {
    if (!clustersData?.clusters) return [];
    return clustersData.clusters;
  }, [clustersData]);

  // Logout hook
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  // User info from auth store
  const user = useAuthStore((state) => state.user);

  // Get user initials for avatar
  const userInitials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  // ── Auto-cluster PENDING SOS by 10 km proximity ──
  const autoClusters: SOSRequest[][] = useMemo(() => {
    // Only include PENDING requests that are NOT already in a cluster
    const pending = sosRequests.filter(
      (s) => s.status === "PENDING" && s.groupId === s.id,
    );
    const n = pending.length;
    if (n < 2) return [];

    // Haversine distance in km
    const haversine = (
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number,
    ) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Union-Find for connected-component grouping
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
        if (d <= 10) union(i, j); // ≤ 10 km
      }
    }

    const groups = new Map<number, SOSRequest[]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(pending[i]);
    }

    // Only keep groups with ≥ 2 requests, sorted by highest priority
    const priorityOrder = { P1: 0, P2: 1, P3: 2 };
    return Array.from(groups.values())
      .filter((g) => g.length >= 2)
      .sort(
        (a, b) =>
          Math.min(...a.map((s) => priorityOrder[s.priority])) -
          Math.min(...b.map((s) => priorityOrder[s.priority])),
      );
  }, [sosRequests]);

  // Cluster creation mutation
  const { mutate: createCluster, isPending: isCreatingCluster } =
    useCreateSOSCluster();

  // Rescue suggestion mutation (cluster-based)
  const {
    mutate: fetchClusterRescueSuggestion,
    isPending: isFetchingSuggestion,
  } = useClusterRescueSuggestion();

  const isProcessingSOS = isCreatingCluster || isFetchingSuggestion;

  // Handlers
  const handleSOSSelect = useCallback((sos: SOSRequest) => {
    setSelectedSOS(sos);
    setFlyToZoom(undefined);
    setFlyToLocation(sos.location);
    setSOSDetailOpen(true);
  }, []);

  const handleRescuerSelect = useCallback((rescuer: Rescuer) => {
    setSelectedRescuer(rescuer);
    setFlyToZoom(undefined);
    setFlyToLocation(rescuer.location);
  }, []);

  const handleDepotSelect = useCallback((depot: DepotEntity) => {
    setLocationPanelData({ type: "depot", data: depot });
    setLocationPanelOpen(true);
    setFlyToZoom(undefined);
    setFlyToLocation({ lat: depot.latitude, lng: depot.longitude });
    // Close other panels
    setSOSDetailOpen(false);
  }, []);

  const handleAssemblyPointSelect = useCallback(
    (point: AssemblyPointEntity) => {
      setLocationPanelData({ type: "assemblyPoint", data: point });
      setLocationPanelOpen(true);
      setFlyToZoom(undefined);
      setFlyToLocation({ lat: point.latitude, lng: point.longitude });
      // Close other panels
      setSOSDetailOpen(false);
    },
    [],
  );

  // Click on existing cluster → zoom into cluster to reveal individual SOS markers
  const handleClusterSelect = useCallback(
    (cluster: SOSClusterEntity) => {
      // Zoom to level 13 (past CLUSTER_ZOOM_THRESHOLD=12) to show individual SOS markers
      setFlyToZoom(13);
      setFlyToLocation({
        lat: cluster.centerLatitude,
        lng: cluster.centerLongitude,
      });
    },
    [],
  );

  // View rescue plan history for a cluster (triggered from sidebar)
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

  // Create clusters only (no AI suggestion) — one API call per auto-cluster group
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
            onSuccess: (clusterData) => {
              created++;
              setActiveClusterId(clusterData.clusterId);
              if (created + failed === total) {
                toast.success(
                  `Đã gom thành công ${created} cụm SOS`,
                );
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

  // Create cluster → then trigger AI suggestion (accepts SOS IDs from auto-cluster)
  const handleProcessSOS = useCallback(
    (sosIds: string[]) => {
      // Filter to only include PENDING SOS requests
      const pendingIds = sosIds.filter((id) => {
        const sos = sosRequests.find((s) => s.id === id);
        return sos?.status === "PENDING";
      });
      const ids = pendingIds.map(Number).filter(Boolean);
      if (ids.length === 0) return;

      // Determine which auto-cluster index is being processed (for UI spinner)
      const clusterIdx = autoClusters.findIndex((cluster) =>
        sosIds.every((id) => cluster.some((s) => s.id === id)),
      );
      setProcessingClusterIndex(clusterIdx >= 0 ? clusterIdx : null);

      createCluster(
        { sosRequestIds: ids },
        {
          onSuccess: (clusterData) => {
            setActiveClusterId(clusterData.clusterId);
            // Now trigger AI rescue suggestion with the created cluster
            fetchClusterRescueSuggestion(clusterData.clusterId, {
              onSuccess: (suggestion) => {
                if (!suggestion.isSuccess) {
                  console.error(
                    "AI suggestion failed:",
                    suggestion.errorMessage,
                  );
                  toast.error(
                    suggestion.errorMessage ||
                      "Đề xuất AI không thành công. Vui lòng thử lại.",
                  );
                  setProcessingClusterIndex(null);
                  return;
                }
                setRescueSuggestion(suggestion);
                setRescuePlanOpen(true);
                setProcessingClusterIndex(null);
              },
              onError: (error) => {
                console.error("Failed to get rescue suggestion:", error);
                toast.error(
                  "Đã gom cụm thành công nhưng không thể lấy đề xuất AI. Vui lòng thử lại.",
                );
                setProcessingClusterIndex(null);
              },
            });
          },
          onError: (error) => {
            console.error("Failed to create cluster:", error);
            toast.error("Không thể gom cụm SOS. Vui lòng thử lại.");
            setProcessingClusterIndex(null);
          },
        },
      );
    },
    [
      sosRequests,
      autoClusters,
      createCluster,
      fetchClusterRescueSuggestion,
    ],
  );

  // Analyze an existing backend cluster with AI
  const handleAnalyzeCluster = useCallback(
    (clusterId: number) => {
      setAnalyzingClusterId(clusterId);
      setActiveClusterId(clusterId);
      fetchClusterRescueSuggestion(clusterId, {
        onSuccess: (suggestion) => {
          setAnalyzingClusterId(null);
          if (!suggestion.isSuccess) {
            console.error("AI suggestion failed:", suggestion.errorMessage);
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
  }, []);

  // Open manual mission builder for a cluster
  const handleOpenManualMission = useCallback(
    (clusterId: number) => {
      setManualMissionClusterId(clusterId);
      setManualMissionOpen(true);
      // Close other panels
      setSOSDetailOpen(false);
      setRescuePlanOpen(false);
      setLocationPanelOpen(false);
    },
    [],
  );

  const handleManualMissionCreated = useCallback(() => {
    setManualMissionOpen(false);
    setManualMissionClusterId(null);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div
      className={cn(
        "h-screen flex flex-col overflow-hidden",
        isDarkMode && "dark",
      )}
    >
      {/* Top Header Bar */}
      <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            {sidebarOpen ? (
              <SidebarSimple className="h-5 w-5" weight="fill" />
            ) : (
              <SidebarSimple className="h-5 w-5" />
            )}
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
            <DropdownMenuContent align="end" className="w-48">
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

      {/* Main Content */}
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
              backendClusters={clusters}
              onAnalyzeCluster={handleAnalyzeCluster}
              isAnalyzingCluster={isFetchingSuggestion}
              analyzingClusterId={analyzingClusterId}
              onManualMission={handleOpenManualMission}
              onViewClusterPlan={handleViewClusterPlan}
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
              />

              {/* Floating Stats Panel - Only show when SOS detail panel is closed */}
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

              {/* SOS Details Panel - Overlays on map from right */}
              <SOSDetailsPanel
                open={sosDetailOpen}
                onOpenChange={setSOSDetailOpen}
                sosRequest={selectedSOS}
                onProcessSOS={handleProcessSOS}
                isProcessing={isProcessingSOS}
                nearbySOSRequests={
                  selectedSOS
                    ? (autoClusters
                        .find((c) => c.some((s) => s.id === selectedSOS.id))
                        ?.filter((s) => s.id !== selectedSOS.id) ?? [])
                    : []
                }
                allSOSRequests={sosRequests}
              />

              {/* Rescue Plan Panel - Slides up from bottom, overlays map and sidebar */}
              <RescuePlanPanel
                open={rescuePlanOpen}
                onOpenChange={setRescuePlanOpen}
                clusterSOSRequests={
                  activeClusterId
                    ? sosRequests.filter((s) => {
                        const cluster = clusters.find(
                          (c) => c.id === activeClusterId,
                        );
                        return cluster?.sosRequestIds
                          .map(String)
                          .includes(s.id);
                      })
                    : []
                }
                clusterId={activeClusterId}
                rescueSuggestion={rescueSuggestion}
                onApprove={handleApproveDecision}
                onReAnalyze={() => {
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
                }}
                isReAnalyzing={isFetchingSuggestion}
              />

              {/* Location Details Panel - Depot / Assembly Point */}
              <LocationDetailsPanel
                open={locationPanelOpen}
                onOpenChange={setLocationPanelOpen}
                location={locationPanelData}
              />

              {/* Manual Mission Builder - Drag & Drop */}
              <ManualMissionBuilder
                open={manualMissionOpen}
                onOpenChange={setManualMissionOpen}
                clusterId={manualMissionClusterId}
                cluster={
                  manualMissionClusterId
                    ? clusters.find((c) => c.id === manualMissionClusterId) ?? null
                    : null
                }
                clusterSOSRequests={
                  manualMissionClusterId
                    ? sosRequests.filter((s) => {
                        const cluster = clusters.find(
                          (c) => c.id === manualMissionClusterId,
                        );
                        return cluster?.sosRequestIds
                          .map(String)
                          .includes(s.id);
                      })
                    : []
                }
                onCreated={handleManualMissionCreated}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

// Wrapper component with Suspense for useSearchParams
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
            {/* Sidebar Skeleton */}
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
            {/* Map Area Skeleton */}
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
