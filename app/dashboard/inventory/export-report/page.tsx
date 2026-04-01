"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus,
  FileArrowDown,
  SignOut,
  Buildings,
  CaretDown,
  Package,
} from "@phosphor-icons/react";
import { FileTextIcon, FileSpreadsheet, CalendarRange, CalendarDays, ChevronRight } from "lucide-react";
import { DepotSidebar } from "@/components/inventory";
import { VatTuSection } from "@/components/inventory/VatTuTabContent";
import { VatTuDetailsSheet } from "@/components/inventory/VatTuDetailsSheet";
import { InventoryItemEntity } from "@/services/inventory/type";
import { Label } from "@/components/ui/label";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
  mockInventoryItems,
  mockSupplyRequests,
  mockShipments,
} from "@/lib/mock-data";
import { DepotInfo } from "@/type";
import { useLogout } from "@/services/auth/hooks";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useUserMe } from "@/services/user/hooks";
import { useDepots } from "@/services/depot/hooks";
import { DepotEntity } from "@/services/depot/type";
import { useItemCategories } from "@/services/item_categories/hooks";
import { useExportInventoryMovements } from "@/services/inventory/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────

const mapDepotEntityToInfo = (
  depot: DepotEntity,
  managerName: string,
  totalCategories: number,
): DepotInfo => ({
  id: String(depot.id),
  name: depot.name,
  address: depot.address,
  phone: "—",
  manager: managerName,
  totalItems: mockInventoryItems.length,
  totalCategories,
  criticalAlerts: mockInventoryItems.filter((i) => i.stockLevel === "CRITICAL").length,
  lowStockAlerts: mockInventoryItems.filter((i) => i.stockLevel === "LOW").length,
  pendingRequests: mockSupplyRequests.filter((r) => r.status === "PENDING").length,
  activeShipments: mockShipments.filter(
    (s) => s.status === "PREPARING" || s.status === "IN_TRANSIT",
  ).length,
});

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(currentYear - 2 + i));
const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

function toInputDate(d: Date) {
  return d.toISOString().split("T")[0];
}
const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExportReportPage() {
  const router = useRouter();

  // ── Layout state ──
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("inventory");
  const [vatTuSelectedItem, setVatTuSelectedItem] = useState<InventoryItemEntity | null>(null);
  const [vatTuSheetOpen, setVatTuSheetOpen] = useState(false);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);

  // ── Auth ──
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const user = useAuthStore((state) => state.user);
  const { data: userMe } = useUserMe();
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

  // ── API data ──
  const { data: depotsData, isLoading: isDepotsLoading } = useDepots({
    params: { pageNumber: 1, pageSize: 50 },
  });
  const { data: categoriesData, isLoading: isCategoriesLoading } = useItemCategories({
    params: { pageNumber: 1, pageSize: 50 },
  });
  const currentDepot = depotsData?.items?.[0] ?? null;
  const totalCategories = categoriesData?.totalCount ?? 0;
  const depotInfo = useMemo<DepotInfo | null>(() => {
    if (!currentDepot) return null;
    return mapDepotEntityToInfo(currentDepot, displayName, totalCategories);
  }, [currentDepot, displayName, totalCategories]);
  // ── Form state ──
  const [leftFromDate, setLeftFromDate] = useState(toInputDate(thirtyDaysAgo));
  const [leftToDate, setLeftToDate] = useState(toInputDate(today));
  const [rightMonth, setRightMonth] = useState(currentMonth);
  const [rightYear, setRightYear] = useState(String(currentYear));

  // ── Export mutation ──
  const { mutate: exportMovements, isPending: isExporting } = useExportInventoryMovements();

  const handleExport = (panel: "range" | "month") => {
    const params =
      panel === "range"
        ? { periodType: "ByDateRange" as const, fromDate: leftFromDate, toDate: leftToDate }
        : { periodType: "ByMonth" as const, month: Number(rightMonth), year: Number(rightYear) };

    exportMovements(params, {
      onSuccess: ({ blob, filename }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Xuất file thành công!");
      },
      onError: () => {
        toast.error("Xuất báo cáo thất bại. Vui lòng thử lại.");
      },
    });
  };

  // ── Loading skeleton ──
  if (isDepotsLoading || isCategoriesLoading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>
        <div className="flex-1 flex overflow-hidden">
          <aside className="w-80 shrink-0 border-r bg-background p-4 space-y-4">
            <Skeleton className="h-20 w-full rounded-xl" />
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
          <main className="flex-1 overflow-auto bg-muted/30 p-6">
            <Skeleton className="h-8 w-56 mb-2" />
            <Skeleton className="h-64 w-full rounded-xl mt-6" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-screen flex flex-col overflow-hidden", isDarkMode && "dark")}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
          <span className="font-semibold tracking-tighter text-lg hidden sm:inline">
            ResQ-SOS | Quản Lý Kho
          </span>
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
            variant="default"
            size="sm"
            className="hidden md:flex gap-2"
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

          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {isDarkMode ? (
              <Sun className="h-5 w-5" weight="fill" />
            ) : (
              <Moon className="h-5 w-5" weight="fill" />
            )}
          </Button>
          <Button variant="ghost" size="icon">
            <Gear className="h-5 w-5" />
          </Button>

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
                  <span className="text-xs text-muted-foreground">Quản lý kho</span>
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

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
            sidebarOpen ? "w-80" : "w-0",
          )}
        >
          {depotInfo && (
            <DepotSidebar
              depotInfo={depotInfo}
              inventoryItems={mockInventoryItems}
              supplyRequests={mockSupplyRequests}
              shipments={mockShipments}
              onItemSelect={() => {}}
              onRequestSelect={() => {}}
              onShipmentSelect={() => {}}
              selectedItem={null}
              selectedRequest={null}
              selectedCategory={null}
              onCategorySelect={() => {}}
              apiCategories={categoriesData?.items}
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
            />
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto bg-muted/30">
          {activeTab === "vattu" ? (
            <div className="p-6 md:p-8">
              <VatTuSection onItemSelect={(item) => {
                setVatTuSelectedItem(item);
                setVatTuSheetOpen(true);
              }} />
            </div>
          ) : null}
          <div className={activeTab === "vattu" ? "hidden" : "p-6 md:p-8 space-y-8"}>
            {/* ── Hero / Page header ── */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  className="hover:text-foreground tracking-tighter cursor-pointer transition-colors"
                  onClick={() => router.push("/dashboard/inventory")}
                >
                  Dashboard Kho Hàng
                </span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground tracking-tighter font-medium">Xuất báo cáo</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tighter">Xuất báo cáo</h1>
              <p className="text-muted-foreground tracking-tighter">
                Tạo báo cáo theo khoảng thời gian hoặc theo tháng
              </p>
            </div>

            {/* ── Grid: two cards side by side ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ── Card 1: Date Range ── */}
              <div className="group relative bg-card rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                {/* Card accent */}
                <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-blue-500 to-cyan-400" />

                <div className="p-6 pt-7 space-y-6">
                  {/* Card title row */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
                      <CalendarRange className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold tracking-tighter text-base">Báo cáo theo khoảng ngày</h2>
                      <p className="text-sm tracking-tighter text-muted-foreground mt-0.5">Chọn ngày bắt đầu & kết thúc</p>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium tracking-tighter text-muted-foreground">Từ ngày</Label>
                        <DatePickerInput
                          value={leftFromDate}
                          onChange={setLeftFromDate}
                          placeholder="Chọn ngày..."
                          className="h-10 mt-1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium tracking-tighter text-muted-foreground">Đến ngày</Label>
                        <DatePickerInput
                          value={leftToDate}
                          onChange={setLeftToDate}
                          placeholder="Chọn ngày..."
                          className="h-10 mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t" />

                  {/* Action row */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10"
                      onClick={() => handleExport("range")}
                      disabled={isExporting}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      {isExporting ? "Đang xuất..." : "Xuất Excel"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── Card 2: Monthly ── */}
              <div className="group relative bg-card rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                {/* Card accent */}
                <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-emerald-500 to-teal-400" />

                <div className="p-6 pt-7 space-y-6">
                  {/* Card title row */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                      <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-base tracking-tighter">Báo cáo theo tháng</h2>
                      <p className="text-sm tracking-tighter text-muted-foreground mt-0.5">Xem báo cáo tổng hợp hàng tháng</p>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm tracking-tighter font-medium text-muted-foreground">Tháng</Label>
                        <Select value={rightMonth} onValueChange={setRightMonth}>
                          <SelectTrigger className="h-10 mt-1 text-sm rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem key={m} value={m}>
                                Tháng {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm tracking-tighter font-medium text-muted-foreground">Năm</Label>
                        <Select value={rightYear} onValueChange={setRightYear}>
                          <SelectTrigger className="h-10 mt-1 text-sm rounded-lg border-emerald-500/50 ring-1 ring-emerald-500/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {YEARS.map((y) => (
                              <SelectItem key={y} value={y}>
                                {y}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t" />

                  {/* Action row */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-10"
                      onClick={() => handleExport("month")}
                      disabled={isExporting}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      {isExporting ? "Đang xuất..." : "Xuất Excel"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Vat Tu Details Sheet */}
      <VatTuDetailsSheet
        item={vatTuSelectedItem}
        open={vatTuSheetOpen}
        onOpenChange={setVatTuSheetOpen}
      />
    </div>
  );
}
