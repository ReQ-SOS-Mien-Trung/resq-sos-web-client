"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  mockInventoryItems,
  mockSupplyRequests,
  mockShipments,
  mockActivityLogs,
} from "@/lib/mock-data";
import { getUserAvatarInitials, getUserDisplayName } from "@/lib/user-avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
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

const requestingStatusLabels: Record<string, string> = {
  WaitingForApproval: "Chờ phê duyệt",
  Approved: "Đã duyệt",
  InTransit: "Đang được chi viện đến",
  Received: "Đã nhận",
  Rejected: "Từ chối",
};

const requestingStatusColors: Record<string, string> = {
  WaitingForApproval: "bg-amber-100 text-amber-700 border-amber-200",
  Approved: "bg-violet-100 text-violet-700 border-violet-200",
  InTransit: "bg-blue-100 text-blue-700 border-blue-200",
  Received: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

const INVENTORY_TABS = new Set([
  "inventory",
  "incoming",
  "vattu",
  "shipments",
  "requests",
]);

function resolveInventoryTab(rawTab: string | null): string {
  if (!rawTab) {
    return "inventory";
  }

  return INVENTORY_TABS.has(rawTab) ? rawTab : "inventory";
}

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
  const searchParams = useSearchParams();
  const activeTab = resolveInventoryTab(searchParams.get("tab"));
  const [vatTuSelectedItem, setVatTuSelectedItem] =
    useState<InventoryItemEntity | null>(null);
  const [vatTuSheetOpen, setVatTuSheetOpen] = useState(false);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);
  const mainRef = useRef<HTMLElement>(null);
  const panelWidthRef = useRef(480);

  const router = useRouter();

  const handleActiveTabChange = useCallback(
    (tab: string) => {
      const nextTab = resolveInventoryTab(tab);
      const currentTab = resolveInventoryTab(searchParams.get("tab"));

      if (nextTab === currentTab) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "inventory") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }

      if (nextTab === "shipments") {
        setRequestsPageNumber(1);
      }

      const query = params.toString();
      router.replace(
        query ? `/dashboard/inventory?${query}` : "/dashboard/inventory",
      );
    },
    [router, searchParams],
  );

  // ── Auth ──
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((state) => state.user);
  const { data: userMe } = useUserMe();

  const displayName = useMemo(
    () =>
      userMe
        ? getUserDisplayName(
            {
              firstName: userMe.firstName,
              lastName: userMe.lastName,
              username: userMe.username,
            },
            getUserDisplayName(user),
          )
        : getUserDisplayName(user),
    [userMe, user],
  );

  const userInitials = useMemo(
    () =>
      userMe
        ? getUserAvatarInitials(
            {
              firstName: userMe.firstName,
              lastName: userMe.lastName,
              username: userMe.username,
            },
            getUserAvatarInitials(user),
          )
        : getUserAvatarInitials(user),
    [userMe, user],
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

  const { data: quantityByCategoryData, refetch: refetchQuantityByCategory } =
    useMyDepotQuantityByCategory();

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

  const allSupplyRequestsSorted = useMemo(
    () =>
      [...(allRequestsPagedData?.items ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [allRequestsPagedData],
  );

  const categoryOverviewData = useMemo(
    () =>
      (quantityByCategoryData ?? []).map((category) => ({
        id: category.categoryId,
        code: category.categoryCode,
        name: category.categoryName,
        quantity:
          category.availableConsumableQuantity +
          category.availableReusableUnits,
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
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex gap-2"
              >
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
                onClick={() =>
                  router.push("/dashboard/inventory/import-regular")
                }
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
          <NotificationBell />

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
                  <span className="font-semibold">{displayName}</span>
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
              onActiveTabChange={handleActiveTabChange}
            />
          )}
        </aside>

        {/* Main Content */}
        <main ref={mainRef} className="flex-1 overflow-auto bg-muted/30">
          <div className="p-6 space-y-6">
            {/* Page Title — hidden on supply-management tab (it has its own header) */}
            {activeTab !== "supply-management" && (
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tighter">
                    Dashboard Kho Hàng
                  </h1>
                  <p className="text-muted-foreground tracking-tighter">
                    {user?.depotName ?? depotInfo?.name ?? "Đang tải..."} • Quản
                    lý bởi {displayName}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleRefresh}
                  disabled={isDepotsFetching || isSupplyRequestsFetching}
                >
                  <ArrowsClockwise
                    className={cn(
                      "h-4 w-4",
                      (isDepotsFetching || isSupplyRequestsFetching) &&
                        "animate-spin",
                    )}
                  />
                  Làm mới
                </Button>
              </div>
            )}

            {activeTab === "supply-management" ? (
              <SupplyRequestManagement />
            ) : activeTab === "vattu" ? (
              <VatTuSection
                onItemSelect={(item) => {
                  setVatTuSelectedItem(item);
                  setVatTuSheetOpen(true);
                }}
              />
            ) : activeTab === "shipments" ? (
              <div className="space-y-4">
                {allSupplyRequestsSorted.length === 0 ? (
                  <Card className="border-border/60">
                    <CardContent className="p-4 text-sm text-muted-foreground tracking-tighter">
                      Chưa có yêu cầu nào.
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border/60">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-230 text-sm tracking-tighter">
                          <thead className="bg-muted/40">
                            <tr className="border-b border-border/60 text-left">
                              <th className="px-4 py-3 font-semibold">
                                Mã yêu cầu
                              </th>
                              <th className="px-4 py-3 font-semibold">
                                Kho nguồn
                              </th>
                              <th className="px-4 py-3 font-semibold">
                                Trạng thái
                              </th>
                              <th className="px-4 py-3 font-semibold">
                                Vật tư
                              </th>
                              <th className="px-4 py-3 font-semibold">
                                Thời gian tạo
                              </th>
                              <th className="px-4 py-3 font-semibold w-44">
                                Ghi chú
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {allSupplyRequestsSorted.map((request) => (
                              <tr
                                key={request.id}
                                className="border-b border-border/50 align-top cursor-pointer hover:bg-muted/40 transition-colors"
                                onClick={() => {
                                  setTrackerRequestId(request.id);
                                  setTrackerOpen(true);
                                }}
                              >
                                <td className="px-4 py-3 font-semibold">
                                  Đơn yêu cầu số {request.id}
                                </td>
                                <td className="px-4 py-3">
                                  {request.sourceDepotName}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1.5">
                                    {/* <Badge variant="warning">
                                        {sourceStatusLabels[request.sourceStatus] ?? request.sourceStatus}
                                      </Badge> */}
                                    <Badge
                                      variant="outline"
                                      className={
                                        requestingStatusColors[
                                          request.requestingStatus
                                        ] ??
                                        "bg-gray-100 text-gray-700 border-gray-200"
                                      }
                                    >
                                      {requestingStatusLabels[
                                        request.requestingStatus
                                      ] ?? request.requestingStatus}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1.5">
                                    {request.items.map((item) => (
                                      <div
                                        key={`${request.id}-${item.itemModelId}`}
                                        className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2.5 py-1.5"
                                      >
                                        <span>{item.itemModelName}</span>
                                        <span className="font-semibold text-primary whitespace-nowrap">
                                          {item.quantity.toLocaleString(
                                            "vi-VN",
                                          )}{" "}
                                          {item.unit}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {new Date(request.createdAt).toLocaleString(
                                    "vi-VN",
                                  )}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground w-44 max-w-44 whitespace-normal wrap-break-word leading-snug">
                                  {request.note || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground tracking-tighter">
                    Trang {requestsPageNumber}
                    {allRequestsPagedData?.totalPages
                      ? ` / ${allRequestsPagedData.totalPages}`
                      : ""}
                    {allRequestsPagedData?.totalCount !== undefined
                      ? ` • ${allRequestsPagedData.totalCount} yêu cầu`
                      : ""}
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canPrevRequestsPage || isAllRequestsFetching}
                      onClick={() =>
                        setRequestsPageNumber((prev) => Math.max(1, prev - 1))
                      }
                    >
                      Trước
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canNextRequestsPage || isAllRequestsFetching}
                      onClick={() => setRequestsPageNumber((prev) => prev + 1)}
                    >
                      Sau
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => refetchAllRequests()}
                      disabled={isAllRequestsFetching || isAllRequestsLoading}
                    >
                      <ArrowsClockwise
                        size={15}
                        className={isAllRequestsFetching ? "animate-spin" : ""}
                      />
                    </Button>
                  </div>
                </div>
              </div>
            ) : activeTab === "requests" ? (
              <SupplyRequestSection
                onSelectionSidebarOpen={() => {
                  if (sidebarOpen) setSidebarOpen(false);
                }}
                onSelectionSidebarChange={(open) => {
                  if (mainRef.current) {
                    mainRef.current.style.marginRight = open
                      ? `${panelWidthRef.current}px`
                      : "0px";
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

      {/* Supply Request Tracker Sheet */}
      <SupplyRequestTracker
        request={trackerRequest}
        open={trackerOpen}
        onOpenChange={setTrackerOpen}
        onActionSuccess={() => {
          refetchSupplyRequests();
          refetchAllRequests();
        }}
      />
    </div>
  );
};

export default InventoryDashboardPage;
