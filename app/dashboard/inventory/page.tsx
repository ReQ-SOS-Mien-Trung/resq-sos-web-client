"use client";

import { useState, useCallback, useMemo } from "react";
import {
  mockInventoryItems,
  mockSupplyRequests,
  mockShipments,
  mockActivityLogs,
} from "@/lib/mock-data";
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
  Plus,
  FileArrowDown,
  Warehouse,
  SignOut,
} from "@phosphor-icons/react";
import {
  CategoryOverview,
  DepotSidebar,
  InventoryStats,
  ItemDetailsSheet,
  LowStockAlerts,
  RecentActivity,
} from "@/components/inventory";
import {
  DepotInfo,
  InventoryItem,
  IInventoryStats,
  ItemCategory,
  Shipment,
  SupplyRequest,
} from "@/type";
import { useLogout } from "@/services/auth/hooks";
import { useAuthStore } from "@/stores/auth.store";
import { useDepots } from "@/services/depot/hooks";
import { DepotEntity } from "@/services/depot/type";
import { Skeleton } from "@/components/ui/skeleton";

// --- Helpers ---

/** Map DepotEntity from API to DepotInfo used by UI components */
const mapDepotEntityToInfo = (
  depot: DepotEntity,
  managerName: string,
): DepotInfo => ({
  id: String(depot.id),
  name: depot.name,
  address: depot.address,
  phone: "—",
  manager: managerName,
  totalItems: mockInventoryItems.length,
  totalCategories: 6,
  criticalAlerts: mockInventoryItems.filter((i) => i.stockLevel === "CRITICAL")
    .length,
  lowStockAlerts: mockInventoryItems.filter((i) => i.stockLevel === "LOW")
    .length,
  pendingRequests: mockSupplyRequests.filter((r) => r.status === "PENDING")
    .length,
  activeShipments: mockShipments.filter(
    (s) => s.status === "PREPARING" || s.status === "IN_TRANSIT",
  ).length,
});

/** Compute dashboard stats from inventory & supply data */
const computeStats = (
  items: InventoryItem[],
  requests: SupplyRequest[],
  shipments: Shipment[],
): IInventoryStats => {
  const now = new Date();
  return {
    totalItems: items.length,
    totalCategories: new Set(items.map((i) => i.category)).size,
    criticalStock: items.filter((i) => i.stockLevel === "CRITICAL").length,
    lowStock: items.filter((i) => i.stockLevel === "LOW").length,
    normalStock: items.filter(
      (i) => i.stockLevel === "NORMAL" || i.stockLevel === "OVERSTOCKED",
    ).length,
    pendingInbound: requests.filter(
      (r) => r.type === "INBOUND" && r.status === "PENDING",
    ).length,
    pendingOutbound: requests.filter(
      (r) => r.type === "OUTBOUND" && r.status === "PENDING",
    ).length,
    activeShipments: shipments.filter(
      (s) => s.status === "PREPARING" || s.status === "IN_TRANSIT",
    ).length,
    itemsExpiringSoon: items.filter((i) => {
      if (!i.expiryDate) return false;
      const days = Math.ceil(
        (new Date(i.expiryDate).getTime() - now.getTime()) / 86_400_000,
      );
      return days > 0 && days <= 30;
    }).length,
  };
};

// --- Page Component ---

const InventoryDashboardPage = () => {
  // ── UI state ──
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequest | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(
    null,
  );
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [itemSheetOpen, setItemSheetOpen] = useState(false);

  // ── Auth ──
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((state) => state.user);

  const userInitials = useMemo(
    () =>
      user?.fullName
        ? user.fullName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : "U",
    [user],
  );

  // ── Fetch depot data from API ──
  const {
    data: depotsData,
    isLoading: isDepotsLoading,
    refetch: refetchDepots,
  } = useDepots({ params: { pageNumber: 1, pageSize: 50 } });

  // Use the first depot as the current managed depot
  const currentDepot = depotsData?.items?.[0] ?? null;

  // Map API depot to DepotInfo for sidebar
  const depotInfo = useMemo<DepotInfo | null>(() => {
    if (!currentDepot) return null;
    return mapDepotEntityToInfo(currentDepot, user?.fullName ?? "Quản lý kho");
  }, [currentDepot, user?.fullName]);

  // ── Compute stats (will use real item APIs when available) ──
  const stats = useMemo<IInventoryStats>(
    () => computeStats(mockInventoryItems, mockSupplyRequests, mockShipments),
    [],
  );

  // ── Handlers ──
  const handleItemSelect = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setItemSheetOpen(true);
  }, []);

  const handleRequestSelect = useCallback((request: SupplyRequest) => {
    setSelectedRequest(request);
  }, []);

  const handleShipmentSelect = useCallback(() => {
    // Will be connected to shipment detail sheet when API is ready
  }, []);

  const handleCategorySelect = useCallback((category: ItemCategory | null) => {
    setSelectedCategory(category);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchDepots();
  }, [refetchDepots]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  };

  // ── Loading state ──
  if (isDepotsLoading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header Skeleton */}
        <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>
        {/* Body Skeleton */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Skeleton */}
          <aside className="w-80 shrink-0 border-r bg-background p-4 space-y-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-8 w-full rounded-lg" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </aside>
          {/* Main Content Skeleton */}
          <main className="flex-1 overflow-auto bg-muted/30 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-56 mb-2" />
                <Skeleton className="h-4 w-80" />
              </div>
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-card p-4 space-y-2"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

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
            <Warehouse className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg hidden sm:inline">
              ReQ-SOS | Quản Lý Kho
            </span>
          </div>
          <Badge
            variant={currentDepot ? "success" : "destructive"}
            className="hidden sm:flex items-center gap-1"
          >
            {currentDepot ? (
              <WifiHigh className="h-3 w-3" weight="bold" />
            ) : (
              <WifiSlash className="h-3 w-3" weight="bold" />
            )}
            {currentDepot ? "Đang kết nối" : "Mất kết nối"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          <Button variant="outline" size="sm" className="hidden md:flex gap-2">
            <Plus className="h-4 w-4" />
            Nhập kho
          </Button>
          <Button variant="outline" size="sm" className="hidden md:flex gap-2">
            <FileArrowDown className="h-4 w-4" />
            Xuất báo cáo
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {stats.criticalStock > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {stats.criticalStock}
              </span>
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

          {/* Settings */}
          <Button variant="ghost" size="icon">
            <Gear className="h-5 w-5" />
          </Button>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="h-8 w-8 rounded-full bg-linear-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
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
                    Quản lý kho
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "w-80 shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
            sidebarOpen ? "w-80" : "w-0",
          )}
        >
          {depotInfo && (
            <DepotSidebar
              depotInfo={depotInfo}
              inventoryItems={mockInventoryItems}
              supplyRequests={mockSupplyRequests}
              shipments={mockShipments}
              onItemSelect={handleItemSelect}
              onRequestSelect={handleRequestSelect}
              onShipmentSelect={handleShipmentSelect}
              selectedItem={selectedItem}
              selectedRequest={selectedRequest}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
            />
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="p-6 space-y-6">
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Dashboard Kho Hàng</h1>
                <p className="text-muted-foreground">
                  {depotInfo?.name ?? "Đang tải..."} • Quản lý bởi{" "}
                  {user?.fullName ?? "—"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRefresh}
              >
                <ArrowsClockwise className="h-4 w-4" />
                Làm mới
              </Button>
            </div>

            {/* Stats Overview */}
            <InventoryStats stats={stats} />

            {/* Category Overview */}
            <CategoryOverview
              items={mockInventoryItems}
              onCategorySelect={handleCategorySelect}
              selectedCategory={selectedCategory}
            />

            {/* Two Column Layout: Alerts + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Alerts */}
              <LowStockAlerts
                items={mockInventoryItems}
                onItemClick={handleItemSelect}
                onViewAll={() => setSelectedCategory(null)}
              />

              {/* Recent Activity */}
              <RecentActivity activities={mockActivityLogs} maxItems={8} />
            </div>
          </div>
        </main>
      </div>

      {/* Item Details Sheet */}
      <ItemDetailsSheet
        item={selectedItem}
        open={itemSheetOpen}
        onOpenChange={setItemSheetOpen}
        onRequestInbound={() => {
          console.log("Request inbound for:", selectedItem?.name);
        }}
        onRequestOutbound={() => {
          console.log("Request outbound for:", selectedItem?.name);
        }}
        onEdit={() => {
          console.log("Edit item:", selectedItem?.name);
        }}
      />
    </div>
  );
};

export default InventoryDashboardPage;
