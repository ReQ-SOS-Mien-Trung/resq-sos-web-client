"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  mockInventoryItems,
  mockSupplyRequests,
  mockShipments,
  mockActivityLogs,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
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
  SignOut,
  Buildings,
  CaretDown,
  Package,
  Wallet,
} from "@phosphor-icons/react";
import {
  CategoryOverview,
  DepotSidebar,
  InventoryStats,
  ItemDetailsSheet,
  LowStockAlerts,
  RecentActivity,
  SupplyRequestSection,
} from "@/components/inventory";
import SupplyRequestManagement from "@/components/inventory/SupplyRequestManagement";
import { VatTuSection } from "@/components/inventory/VatTuTabContent";
import { VatTuDetailsSheet } from "@/components/inventory/VatTuDetailsSheet";
import {
  InventoryItemEntity,
  SupplyRequestListItem,
} from "@/services/inventory/type";
import {
  useMyDepotQuantityByCategory,
  useSupplyRequests,
} from "@/services/inventory/hooks";
import {
  DepotInfo,
  InventoryItem,
  IInventoryStats,
  Shipment,
  SupplyRequest,
} from "@/type";
import { useLogout } from "@/services/auth/hooks";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useUserMe } from "@/services/user/hooks";
import { useDepots } from "@/services/depot/hooks";
import { DepotEntity } from "@/services/depot/type";
import { useItemCategories } from "@/services/item_categories/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { FileTextIcon } from "lucide-react";

// --- Helpers ---

/** Map DepotEntity from API to DepotInfo used by UI components */
const mapDepotEntityToInfo = (
  depot: DepotEntity,
  managerName: string,
  totalCategories: number,
  pendingRequests: number,
): DepotInfo => ({
  id: String(depot.id),
  name: depot.name,
  address: depot.address,
  phone: "—",
  manager: managerName,
  totalItems: mockInventoryItems.length,
  totalCategories,
  criticalAlerts: mockInventoryItems.filter((i) => i.stockLevel === "CRITICAL")
    .length,
  lowStockAlerts: mockInventoryItems.filter((i) => i.stockLevel === "LOW")
    .length,
  pendingRequests,
  activeShipments: mockShipments.filter(
    (s) => s.status === "PREPARING" || s.status === "IN_TRANSIT",
  ).length,
});

/** Compute dashboard stats from inventory & supply data */
const computeStats = (
  items: InventoryItem[],
  requests: SupplyRequest[],
  shipments: Shipment[],
  totalCategories: number,
): IInventoryStats => {
  const now = new Date();
  return {
    totalItems: items.length,
    totalCategories,
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

const mapApiSupplyRequestToSidebar = (
  request: SupplyRequestListItem,
): SupplyRequest => {
  let status: SupplyRequest["status"] = "PENDING";

  if (
    request.sourceStatus === "Shipping" &&
    request.requestingStatus === "InTransit"
  ) {
    status = "IN_TRANSIT";
  } else if (
    request.sourceStatus === "Pending" &&
    request.requestingStatus === "WaitingForApproval"
  ) {
    status = "PENDING";
  } else if (
    request.requestingStatus === "Received" ||
    request.sourceStatus === "Completed"
  ) {
    status = "DELIVERED";
  } else if (
    request.requestingStatus === "Rejected" ||
    request.sourceStatus === "Rejected"
  ) {
    status = "CANCELLED";
  } else if (
    request.requestingStatus === "Approved" ||
    request.sourceStatus === "Accepted" ||
    request.sourceStatus === "Preparing"
  ) {
    status = "APPROVED";
  }

  return {
    id: `req-${request.id}`,
    type: request.role === "Requester" ? "INBOUND" : "OUTBOUND",
    status,
    items: request.items.map((item) => ({
      itemId: String(item.itemModelId),
      itemName: item.itemModelName,
      quantity: item.quantity,
      unit: item.unit,
    })),
    requestedBy:
      request.role === "Requester"
        ? request.sourceDepotName
        : request.requestingDepotName,
    requestedAt: new Date(request.createdAt),
    priority: "MEDIUM",
    notes: request.note ?? undefined,
    destinationDepot:
      request.role === "Requester"
        ? request.requestingDepotName
        : request.sourceDepotName,
    sourceDepot:
      request.role === "Requester"
        ? request.sourceDepotName
        : request.requestingDepotName,
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [itemSheetOpen, setItemSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("inventory");
  const [vatTuSelectedItem, setVatTuSelectedItem] = useState<InventoryItemEntity | null>(null);
  const [vatTuSheetOpen, setVatTuSheetOpen] = useState(false);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);
  const mainRef = useRef<HTMLElement>(null);
  const panelWidthRef = useRef(480);

  const router = useRouter();

  // ── Auth ──
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((state) => state.user);
  const { data: userMe } = useUserMe();

  // Prefer fresh API data, fallback to auth store
  const displayName = userMe?.firstName
    ? `${userMe.lastName ?? ""} ${userMe.firstName}`.trim()
    : (user?.fullName ?? "—");

  const userInitials = useMemo(
    () =>
      displayName && displayName !== "—"
        ? displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : "U",
    [displayName],
  );

  // ── Fetch depot data from API ──
  const {
    data: depotsData,
    isLoading: isDepotsLoading,
    isFetching: isDepotsFetching,
    refetch: refetchDepots,
  } = useDepots({ params: { pageNumber: 1, pageSize: 50 } });

  // ── Fetch item categories from API ──
  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    refetch: refetchCategories,
  } = useItemCategories({ params: { pageNumber: 1, pageSize: 50 } });

  const {
    data: quantityByCategoryData,
    refetch: refetchQuantityByCategory,
  } = useMyDepotQuantityByCategory();

  const {
    data: supplyRequestsData,
    isLoading: isSupplyRequestsLoading,
    isFetching: isSupplyRequestsFetching,
  } = useSupplyRequests(
    { pageNumber: 1, pageSize: 10 },
    { refetchInterval: 10_000, refetchOnWindowFocus: true },
  );

  // Use the first depot as the current managed depot
  const currentDepot = depotsData?.items?.[0] ?? null;

  // Real category count from API
  const totalCategories = categoriesData?.totalCount ?? 0;

  // Map API depot to DepotInfo for sidebar
  const depotInfo = useMemo<DepotInfo | null>(() => {
    if (!currentDepot && !user?.depotName) return null;

    const pendingCount = (supplyRequestsData?.items ?? []).filter(
      (request) =>
        request.sourceStatus === "Pending" &&
        request.requestingStatus === "WaitingForApproval",
    ).length;

    // Use auth store depotName as primary, fallback to depot API
    const resolvedName = user?.depotName ?? currentDepot?.name ?? "—";

    if (currentDepot) {
      const info = mapDepotEntityToInfo(
        currentDepot,
        displayName,
        totalCategories,
        pendingCount,
      );
      return { ...info, name: resolvedName };
    }

    // Minimal depotInfo built only from auth store data (no depot API yet)
    return {
      id: String(user?.depotId ?? ""),
      name: resolvedName,
      address: "",
      phone: "—",
      manager: displayName,
      totalItems: 0,
      totalCategories,
      criticalAlerts: 0,
      lowStockAlerts: 0,
      pendingRequests: pendingCount,
      activeShipments: 0,
    };
  }, [currentDepot, user, displayName, totalCategories, supplyRequestsData]);

  const sidebarSupplyRequests = useMemo(
    () => (supplyRequestsData?.items ?? []).map(mapApiSupplyRequestToSidebar),
    [supplyRequestsData],
  );

  const categoryOverviewData = useMemo(
    () =>
      (quantityByCategoryData ?? []).map((category) => ({
        id: category.categoryId,
        code: category.categoryCode,
        name: category.categoryName,
        quantity:
          category.availableConsumableQuantity + category.availableReusableUnits,
        description: "",
      })),
    [quantityByCategoryData],
  );

  // ── Compute stats (will use real item APIs when available) ──
  const stats = useMemo<IInventoryStats>(
    () =>
      computeStats(
        mockInventoryItems,
        mockSupplyRequests,
        mockShipments,
        totalCategories,
      ),
    [totalCategories],
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

  const handleCategorySelect = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchDepots();
    refetchCategories();
    refetchQuantityByCategory();
  }, [refetchDepots, refetchCategories, refetchQuantityByCategory]);

  // ── Loading state ──
  if (isDepotsLoading || isCategoriesLoading || isSupplyRequestsLoading) {
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
          <div className="flex items-center">
            
            <span className="font-semibold tracking-tighter text-lg hidden sm:inline">
              ResQ-SOS | Quản Lý Kho
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden md:flex gap-2">
                <Plus className="h-4 w-4" />
                Nhập kho
                <CaretDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                className="gap-2 cursor-pointer tracking-tighter"
                onClick={() => router.push("/dashboard/inventory/import")}
              >
                <Buildings className="h-4 w-4" />
                Nhập kho từ thiện
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer tracking-tighter"
                onClick={() => router.push("/dashboard/inventory/import-regular")}
              >
                <Package className="h-4 w-4" />
                Nhập kho thường
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex gap-2"
            onClick={() => router.push("/dashboard/inventory/export-report")}
          >
            <FileArrowDown className="h-4 w-4" />
            Xuất báo cáo
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="hidden md:flex gap-2"
            onClick={() => router.push("/dashboard/inventory/stock-movements")}
          >
            <FileTextIcon className="h-4 w-4" />
            Truy xuất
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            onClick={() => router.push("/dashboard/inventory/funding-request")}
          >
            <Wallet className="h-4 w-4" />
            Yêu cầu cấp quỹ
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
                    {displayName !== "—" ? displayName : "Người dùng"}
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
              supplyRequests={sidebarSupplyRequests}
              shipments={mockShipments}
              onItemSelect={handleItemSelect}
              onRequestSelect={handleRequestSelect}
              onShipmentSelect={handleShipmentSelect}
              selectedItem={selectedItem}
              selectedRequest={selectedRequest}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              apiCategories={categoriesData?.items}
              activeTab={activeTab}
              onActiveTabChange={(tab) => {
                setActiveTab(tab);
              }}
            />
          )}
        </aside>

        {/* Main Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-auto bg-muted/30"
        >
          <div className="p-6 space-y-6">
            {/* Page Title — hidden on supply-management tab (it has its own header) */}
            {activeTab !== "supply-management" && (
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tighter">Dashboard Kho Hàng</h1>
                  <p className="text-muted-foreground tracking-tighter">
                    {user?.depotName ?? depotInfo?.name ?? "Đang tải..."} • Quản lý bởi {displayName}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleRefresh}
                  disabled={isDepotsFetching || isSupplyRequestsFetching}
                >
                  <ArrowsClockwise className={cn("h-4 w-4", (isDepotsFetching || isSupplyRequestsFetching) && "animate-spin")} />
                  Làm mới
                </Button>
              </div>
            )}

            {activeTab === "supply-management" ? (
              <SupplyRequestManagement />
            ) : activeTab === "vattu" ? (
              <VatTuSection onItemSelect={(item) => {
                setVatTuSelectedItem(item);
                setVatTuSheetOpen(true);
              }} />
            ) : activeTab === "requests" ? (
                <SupplyRequestSection
                  onSelectionSidebarOpen={() => {
                    if (sidebarOpen) setSidebarOpen(false);
                  }}
                  onSelectionSidebarChange={(open) => {
                    if (mainRef.current) {
                      mainRef.current.style.marginRight = open ? `${panelWidthRef.current}px` : "0px";
                    }
                  }}
                  onPanelWidthChange={(w) => {
                    panelWidthRef.current = w;
                    if (mainRef.current) {
                      mainRef.current.style.marginRight = `${w}px`;
                    }
                  }}
                />
            ) : (
              <>
                {/* Stats Overview */}
                <InventoryStats stats={stats} />

                {/* Category Overview */}
                <CategoryOverview
                  apiCategories={categoryOverviewData}
                  onCategorySelect={handleCategorySelect}
                  selectedCategory={selectedCategory}
                />

                {/* Two Column Layout: Alerts + Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Low Stock Alerts */}
                  <LowStockAlerts />

                  {/* Recent Activity */}
                  <RecentActivity activities={mockActivityLogs} maxItems={8} />
                </div>
              </>
            )}
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

      {/* Vat Tu Details Sheet - rendered at page level for full overlay */}
      <VatTuDetailsSheet
        item={vatTuSelectedItem}
        open={vatTuSheetOpen}
        onOpenChange={setVatTuSheetOpen}
      />

    </div>
  );
};

export default InventoryDashboardPage;
