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
import { SOSRequest, Rescuer, Location, LocationPanelData } from "@/type";
import { mockRescuers, mockActiveMissions } from "@/lib/mock-data";
import { useSOSRequests } from "@/services/sos_request/hooks";
import type { SOSRequestEntity } from "@/services/sos_request/type";
import {
  useCreateSOSCluster,
  useClusterRescueSuggestion,
} from "@/services/sos_cluster/hooks";
import type { ClusterRescueSuggestionResponse } from "@/services/sos_cluster/type";
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
  const [isConnected] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Geolocation: current device position
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  // Panel states
  const [sosDetailOpen, setSOSDetailOpen] = useState(false);
  const [rescuePlanOpen, setRescuePlanOpen] = useState(false);
  const [rescueSuggestion, setRescueSuggestion] =
    useState<ClusterRescueSuggestionResponse | null>(null);
  const [locationPanelOpen, setLocationPanelOpen] = useState(false);
  const [locationPanelData, setLocationPanelData] =
    useState<LocationPanelData | null>(null);

  // Multi-select SOS for clustering
  const [selectedSOSIds, setSelectedSOSIds] = useState<Set<string>>(new Set());

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
      (entity: SOSRequestEntity): SOSRequest => ({
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
        needs: { medical: false, food: false, boat: false },
        status:
          entity.status === "Pending"
            ? "PENDING"
            : entity.status === "InProgress"
              ? "ASSIGNED"
              : "RESCUED",
        message: entity.msg,
        createdAt: new Date(entity.createdAt),
      }),
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
    setFlyToLocation(sos.location);
    setSOSDetailOpen(true);
    // Auto-add to selection when clicking — only for PENDING requests
    if (sos.status === "PENDING") {
      setSelectedSOSIds((prev) => {
        const next = new Set(prev);
        next.add(sos.id);
        return next;
      });
    }
  }, []);

  const handleRescuerSelect = useCallback((rescuer: Rescuer) => {
    setSelectedRescuer(rescuer);
    setFlyToLocation(rescuer.location);
  }, []);

  const handleDepotSelect = useCallback((depot: DepotEntity) => {
    setLocationPanelData({ type: "depot", data: depot });
    setLocationPanelOpen(true);
    setFlyToLocation({ lat: depot.latitude, lng: depot.longitude });
    // Close other panels
    setSOSDetailOpen(false);
  }, []);

  const handleAssemblyPointSelect = useCallback(
    (point: AssemblyPointEntity) => {
      setLocationPanelData({ type: "assemblyPoint", data: point });
      setLocationPanelOpen(true);
      setFlyToLocation({ lat: point.latitude, lng: point.longitude });
      // Close other panels
      setSOSDetailOpen(false);
    },
    [],
  );

  // Toggle individual SOS in/out of selection (only allow PENDING)
  const handleToggleSOSSelect = useCallback((sosId: string) => {
    const sos = sosRequests.find((s) => s.id === sosId);
    if (sos && sos.status !== "PENDING") return;
    setSelectedSOSIds((prev) => {
      const next = new Set(prev);
      if (next.has(sosId)) {
        next.delete(sosId);
      } else {
        next.add(sosId);
      }
      return next;
    });
  }, [sosRequests]);

  // Create cluster → then trigger AI suggestion (only PENDING requests)
  const handleProcessSOS = useCallback(() => {
    // Filter to only include PENDING SOS requests
    const pendingIds = Array.from(selectedSOSIds).filter((id) => {
      const sos = sosRequests.find((s) => s.id === id);
      return sos?.status === "PENDING";
    });
    const ids = pendingIds.map(Number).filter(Boolean);
    if (ids.length === 0) return;

    createCluster(
      { sosRequestIds: ids },
      {
        onSuccess: (clusterData) => {
          // Now trigger AI rescue suggestion with the created cluster
          fetchClusterRescueSuggestion(clusterData.clusterId, {
            onSuccess: (suggestion) => {
              setRescueSuggestion(suggestion);
              setRescuePlanOpen(true);
            },
            onError: (error) => {
              console.error("Failed to get rescue suggestion:", error);
              alert("Đã gom cụm thành công nhưng không thể lấy đề xuất AI. Vui lòng thử lại.");
            },
          });
        },
        onError: (error) => {
          console.error("Failed to create cluster:", error);
          alert("Không thể gom cụm SOS. Vui lòng thử lại.");
        },
      },
    );
  }, [selectedSOSIds, sosRequests, createCluster, fetchClusterRescueSuggestion]);

  const handleApproveDecision = useCallback(() => {
    alert("Nhiệm vụ đã được phê duyệt và gửi đến đội cứu hộ!");
    setRescuePlanOpen(false);
    setSOSDetailOpen(false);
    setSelectedSOS(null);
    setRescueSuggestion(null);
    setSelectedSOSIds(new Set());
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
              selectedSOSIds={selectedSOSIds}
              onToggleSOSSelect={handleToggleSOSSelect}
              onCreateCluster={handleProcessSOS}
              isCreatingCluster={isProcessingSOS}
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
                selectedSOS={selectedSOS}
                selectedRescuer={selectedRescuer}
                aiDecision={null}
                onSOSSelect={handleSOSSelect}
                onRescuerSelect={handleRescuerSelect}
                onDepotSelect={handleDepotSelect}
                onAssemblyPointSelect={handleAssemblyPointSelect}
                flyToLocation={flyToLocation}
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
                selectedSOSIds={selectedSOSIds}
                onToggleSOSSelect={handleToggleSOSSelect}
                allSOSRequests={sosRequests}
              />

              {/* Rescue Plan Panel - Slides up from bottom, overlays map and sidebar */}
              <RescuePlanPanel
                open={rescuePlanOpen}
                onOpenChange={setRescuePlanOpen}
                clusterSOSRequests={sosRequests.filter((s) =>
                  selectedSOSIds.has(s.id),
                )}
                rescueSuggestion={rescueSuggestion}
                onApprove={handleApproveDecision}
              />

              {/* Location Details Panel - Depot / Assembly Point */}
              <LocationDetailsPanel
                open={locationPanelOpen}
                onOpenChange={setLocationPanelOpen}
                location={locationPanelData}
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
