"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  SOSRequest,
  SOSCluster,
  Rescuer,
  AIDispatchDecision,
  Location,
} from "@/types/coordinator";
import {
  mockSOSRequests,
  mockRescuers,
  mockDepots,
  mockSOSClusters,
  mockAIDecision,
  mockActiveMissions,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SOSSidebar from "@/components/coordinator/SOSSidebar";
import AIDispatchPanel from "@/components/coordinator/AIDispatchPanel";
import ClusterDetailsSheet from "@/components/coordinator/ClusterDetailsSheet";
import {
  PanelLeftClose,
  PanelLeft,
  Bell,
  Settings,
  User,
  RefreshCw,
  Wifi,
  WifiOff,
  Sun,
  Moon,
} from "lucide-react";

// Dynamically import the map component to avoid SSR issues
const CoordinatorMap = dynamic(
  () => import("@/components/coordinator/CoordinatorMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Đang tải bản đồ...
          </span>
        </div>
      </div>
    ),
  }
);

export default function CoordinatorDashboardPage() {
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedSOS, setSelectedSOS] = useState<SOSRequest | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<SOSCluster | null>(
    null
  );
  const [selectedRescuer, setSelectedRescuer] = useState<Rescuer | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);
  const [isConnected] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Panel states
  const [clusterSheetOpen, setClusterSheetOpen] = useState(false);
  const [aiPanelOpen, setAIPanelOpen] = useState(false);
  const [currentAIDecision, setCurrentAIDecision] =
    useState<AIDispatchDecision | null>(null);

  // Notification count (mock)
  const [notificationCount] = useState(3);

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
      setClusterSheetOpen(false);
      setAIPanelOpen(true);
    }
  }, [selectedCluster]);

  const handleApproveDecision = useCallback(() => {
    // Simulate mission approval
    alert("Nhiệm vụ đã được phê duyệt và gửi đến đội cứu hộ!");
    setAIPanelOpen(false);
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
    [currentAIDecision]
  );

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div
      className={cn(
        "h-screen flex flex-col overflow-hidden",
        isDarkMode && "dark"
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
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
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
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>Đang kết nối</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Mất kết nối</span>
              </>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
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
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Profile */}
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
            sidebarOpen ? "w-80" : "w-0"
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
        <main className="flex-1 relative">
          <CoordinatorMap
            clusters={mockSOSClusters}
            rescuers={mockRescuers}
            depots={mockDepots}
            selectedCluster={selectedCluster}
            selectedRescuer={selectedRescuer}
            aiDecision={currentAIDecision}
            onClusterSelect={handleClusterSelect}
            onRescuerSelect={handleRescuerSelect}
            flyToLocation={flyToLocation}
          />

          {/* Floating Stats Panel */}
          <div className="absolute top-4 right-4 z-1000">
            <div className="bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Thống kê thời gian thực
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-red-500">
                    {
                      mockSOSRequests.filter(
                        (s) => s.priority === "P1" && s.status === "PENDING"
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

          {/* Quick Action Floating Button */}
          <div className="absolute bottom-4 right-4 z-1000">
            <Button
              size="lg"
              className="rounded-full h-14 w-14 shadow-lg bg-linear-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              onClick={() => {
                // Quick add SOS functionality
                alert("Thêm SOS nhanh - Chức năng đang phát triển");
              }}
            >
              <span className="text-2xl">+</span>
            </Button>
          </div>
        </main>
      </div>

      {/* Cluster Details Sheet */}
      <ClusterDetailsSheet
        open={clusterSheetOpen}
        onOpenChange={setClusterSheetOpen}
        cluster={selectedCluster}
        onProcessCluster={handleProcessCluster}
        onSOSSelect={handleSOSSelect}
      />

      {/* AI Dispatch Panel */}
      <AIDispatchPanel
        open={aiPanelOpen}
        onOpenChange={setAIPanelOpen}
        cluster={selectedCluster}
        aiDecision={currentAIDecision}
        availableRescuers={mockRescuers.filter((r) => r.status === "AVAILABLE")}
        onApprove={handleApproveDecision}
        onOverride={handleOverrideDecision}
      />
    </div>
  );
}
