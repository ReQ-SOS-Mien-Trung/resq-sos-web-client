"use client";

import { useState, useCallback, useMemo } from "react";
import {
  mockInventoryItems,
  mockSupplyRequests,
  mockShipments,
  mockDepotInfo,
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
  InventoryItem,
  IInventoryStats,
  ItemCategory,
  Shipment,
  SupplyRequest,
} from "@/type";
import { useLogout } from "@/services/auth/hooks";
import { useAuthStore } from "@/stores/auth.store";

const InventoryDashboardPage = () => {
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequest | null>(
    null,
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(
    null,
  );
  const [isConnected] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [itemSheetOpen, setItemSheetOpen] = useState(false);

  // Notification count (mock)
  const [notificationCount] = useState(5);

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

  // Calculate stats using useMemo
  const stats: IInventoryStats = useMemo(() => {
    const now = new Date("2026-01-15T10:00:00Z"); // Use fixed date for SSR
    return {
      totalItems: mockInventoryItems.length,
      totalCategories: 6,
      criticalStock: mockInventoryItems.filter(
        (item) => item.stockLevel === "CRITICAL",
      ).length,
      lowStock: mockInventoryItems.filter((item) => item.stockLevel === "LOW")
        .length,
      normalStock: mockInventoryItems.filter(
        (item) =>
          item.stockLevel === "NORMAL" || item.stockLevel === "OVERSTOCKED",
      ).length,
      pendingInbound: mockSupplyRequests.filter(
        (req) => req.type === "INBOUND" && req.status === "PENDING",
      ).length,
      pendingOutbound: mockSupplyRequests.filter(
        (req) => req.type === "OUTBOUND" && req.status === "PENDING",
      ).length,
      activeShipments: mockShipments.filter(
        (ship) => ship.status === "PREPARING" || ship.status === "IN_TRANSIT",
      ).length,
      itemsExpiringSoon: mockInventoryItems.filter((item) => {
        if (!item.expiryDate) return false;
        const daysUntilExpiry = Math.ceil(
          (new Date(item.expiryDate).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      }).length,
    };
  }, []);

  // Handlers
  const handleItemSelect = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setItemSheetOpen(true);
  }, []);

  const handleRequestSelect = useCallback((request: SupplyRequest) => {
    setSelectedRequest(request);
    // Could open a request details sheet
  }, []);

  const handleShipmentSelect = useCallback((shipment: Shipment) => {
    setSelectedShipment(shipment);
    // Could open a shipment tracking sheet
  }, []);

  const handleCategorySelect = useCallback((category: ItemCategory | null) => {
    setSelectedCategory(category);
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
            <Warehouse className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg hidden sm:inline">
              ReQ-SOS | Quản Lý Kho
            </span>
          </div>
          <Badge
            variant={isConnected ? "success" : "destructive"}
            className="hidden sm:flex items-center gap-1"
          >
            {isConnected ? (
              <WifiHigh className="h-3 w-3" weight="bold" />
            ) : (
              <WifiSlash className="h-3 w-3" weight="bold" />
            )}
            {isConnected ? "Đang kết nối" : "Mất kết nối"}
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
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notificationCount}
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
          <DepotSidebar
            depotInfo={mockDepotInfo}
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="p-6 space-y-6">
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Dashboard Kho Hàng</h1>
                <p className="text-muted-foreground">
                  {mockDepotInfo.name} • Quản lý bởi {mockDepotInfo.manager}
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
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
          // Handle inbound request
          console.log("Request inbound for:", selectedItem?.name);
        }}
        onRequestOutbound={() => {
          // Handle outbound request
          console.log("Request outbound for:", selectedItem?.name);
        }}
        onEdit={() => {
          // Handle edit
          console.log("Edit item:", selectedItem?.name);
        }}
      />
    </div>
  );
};

export default InventoryDashboardPage;
