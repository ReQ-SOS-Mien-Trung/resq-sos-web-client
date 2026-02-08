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
import {
  SOSRequest,
  SOSCluster,
  Rescuer,
  AIDispatchDecision,
  Location,
} from "@/type";
import {
  mockSOSRequests,
  mockRescuers,
  mockSOSClusters,
  mockAIDecision,
  mockActiveMissions,
} from "@/lib/mock-data";
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
  ArrowsClockwise,
  WifiHigh,
  WifiSlash,
  Sun,
  Moon,
  CloudSun,
  MapTrifold,
  SignOut,
} from "@phosphor-icons/react";
import {
  ClusterDetailsPanel,
  RescuePlanPanel,
  SOSSidebar,
} from "@/components/coordinator";
import { useLogout } from "@/services/auth/hooks";
import { useAuthStore } from "@/stores/auth.store";

const CoordinatorMap = dynamic(
  () => import("@/components/coordinator/CoordinatorMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <lord-icon
            src="https://cdn.lordicon.com/slkvcfos.json"
            trigger="loop"
            delay="0"
            colors="primary:#e83a30,secondary:#f28621"
            style={{ width: "80px", height: "80px" }}
          />
          <span className="text-sm text-muted-foreground font-medium">
            Đang tải bản đồ...
          </span>
        </div>
      </div>
    ),
  },
);

const WindyLeafletMap = dynamic(
  () => import("@/components/coordinator/WindyLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <lord-icon
            src="https://cdn.lordicon.com/fkaukecx.json"
            trigger="loop"
            delay="0"
            colors="primary:#3b82f6,secondary:#22c55e"
            style={{ width: "80px", height: "80px" }}
          />
          <span className="text-sm text-muted-foreground font-medium">
            Đang tải bản đồ thời tiết...
          </span>
        </div>
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
  const [selectedCluster, setSelectedCluster] = useState<SOSCluster | null>(
    null,
  );
  const [selectedRescuer, setSelectedRescuer] = useState<Rescuer | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);
  const [isConnected] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Panel states
  const [clusterSheetOpen, setClusterSheetOpen] = useState(false);
  const [rescuePlanOpen, setRescuePlanOpen] = useState(false);
  const [currentAIDecision, setCurrentAIDecision] =
    useState<AIDispatchDecision | null>(null);

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

  // Notification count (mock)
  const [notificationCount] = useState(3);

  // Fetch depots from backend for map display
  const { data: depotsData } = useDepots({
    params: { pageSize: 100 }, // Get all depots for map display
  });

  // Use depot data directly from backend (no mapping needed)
  const depots: DepotEntity[] = useMemo(() => {
    if (!depotsData?.items) return [];
    return depotsData.items;
  }, [depotsData]);

  // Fetch assembly points from backend for map display
  const { data: assemblyPointsData } = useAssemblyPoints({
    params: { pageSize: 100 }, // Get all assembly points for map display
  });

  // Use assembly points data directly from backend (no mapping needed)
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

  // Handlers
  const handleSOSSelect = useCallback((sos: SOSRequest) => {
    setSelectedSOS(sos);
    setFlyToLocation(sos.location);
  }, []);

  const handleClusterSelect = useCallback((cluster: SOSCluster) => {
    setSelectedCluster(cluster);
    setSelectedSOS(null);
    setFlyToLocation(cluster.center);
    setClusterSheetOpen(true);
  }, []);

  const handleRescuerSelect = useCallback((rescuer: Rescuer) => {
    setSelectedRescuer(rescuer);
    setFlyToLocation(rescuer.location);
  }, []);

  const handleProcessCluster = useCallback(() => {
    // Simulate AI decision generation
    if (selectedCluster) {
      setCurrentAIDecision({
        ...mockAIDecision,
        clusterId: selectedCluster.id,
      });
      // Keep cluster panel open and open rescue plan panel
      setRescuePlanOpen(true);
    }
  }, [selectedCluster]);

  const handleApproveDecision = useCallback(() => {
    // Simulate mission approval
    alert("Nhiệm vụ đã được phê duyệt và gửi đến đội cứu hộ!");
    setRescuePlanOpen(false);
    setClusterSheetOpen(false);
    setSelectedCluster(null);
    setCurrentAIDecision(null);
  }, []);

  const handleOverrideDecision = useCallback(
    (rescuerId: string) => {
      const newRescuer = mockRescuers.find((r) => r.id === rescuerId);
      if (newRescuer && currentAIDecision) {
        setCurrentAIDecision({
          ...currentAIDecision,
          recommendedRescuer: newRescuer,
        });
      }
    },
    [currentAIDecision],
  );

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
            <div className="text-xl font-bold bg-linear-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              ReQ-SOS
            </div>
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
              sosRequests={mockSOSRequests}
              clusters={mockSOSClusters}
              rescuers={mockRescuers}
              missions={mockActiveMissions}
              onSOSSelect={handleSOSSelect}
              onClusterSelect={handleClusterSelect}
              onRescuerSelect={handleRescuerSelect}
              selectedSOS={selectedSOS}
              selectedCluster={selectedCluster}
            />
          )}
        </aside>

        {/* Map Container */}
        <main className="flex-1 relative overflow-hidden">
          {isWeatherMode ? (
            <WindyLeafletMap
              clusters={mockSOSClusters}
              rescuers={mockRescuers}
              depots={depots}
              selectedCluster={selectedCluster}
              selectedRescuer={selectedRescuer}
              onClusterSelect={handleClusterSelect}
              onRescuerSelect={handleRescuerSelect}
              flyToLocation={flyToLocation}
            />
          ) : (
            <>
              <CoordinatorMap
                clusters={mockSOSClusters}
                rescuers={mockRescuers}
                depots={depots}
                assemblyPoints={assemblyPoints}
                selectedCluster={selectedCluster}
                selectedRescuer={selectedRescuer}
                aiDecision={currentAIDecision}
                onClusterSelect={handleClusterSelect}
                onRescuerSelect={handleRescuerSelect}
                flyToLocation={flyToLocation}
              />

              {/* Floating Stats Panel - Only show when cluster panel is closed */}
              {!clusterSheetOpen && (
                <div className="absolute top-4 right-4 z-[40]">
                  <div className="bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Thống kê thời gian thực
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-red-500">
                          {
                            mockSOSRequests.filter(
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

              {/* Cluster Details Panel - Overlays on map from right */}
              <ClusterDetailsPanel
                open={clusterSheetOpen}
                onOpenChange={setClusterSheetOpen}
                cluster={selectedCluster}
                onProcessCluster={handleProcessCluster}
                onSOSSelect={handleSOSSelect}
              />

              {/* Rescue Plan Panel - Slides up from bottom, overlays map and sidebar */}
              <RescuePlanPanel
                open={rescuePlanOpen}
                onOpenChange={setRescuePlanOpen}
                cluster={selectedCluster}
                aiDecision={currentAIDecision}
                availableRescuers={mockRescuers.filter(
                  (r) => r.status === "AVAILABLE",
                )}
                onApprove={handleApproveDecision}
                onOverride={handleOverrideDecision}
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
        <div className="flex-1 flex items-center justify-center bg-background min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <lord-icon
              src="https://cdn.lordicon.com/mhwzfwxu.json"
              trigger="loop"
              delay="0"
              colors="primary:#e83a30,secondary:#f28621"
              style={{ width: "100px", height: "100px" }}
            />
            <span className="text-sm text-muted-foreground font-medium">
              Đang tải...
            </span>
          </div>
        </div>
      }
    >
      <CoordinatorDashboardContent />
    </Suspense>
  );
};

export default CoordinatorDashboardPage;
