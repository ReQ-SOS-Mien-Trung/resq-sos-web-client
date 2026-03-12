"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { DashboardSkeleton } from "@/components/admin";
import { DashboardLayout } from "@/components/admin/dashboard";
import { ServiceZonePanel } from "@/components/admin/map-zone";
import {
  useAllServiceZones,
  useCreateServiceZone,
  useUpdateServiceZone,
} from "@/services/map/hooks";
import type { Coordinate, ServiceZoneEntity } from "@/services/map/type";
import { toast } from "sonner";
import {
  MapPin,
  SidebarSimple,
  ArrowLeft,
  Plus,
  PencilSimple,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageMode = "list" | "create" | "edit";
type FilterMode = "all" | "active" | "inactive";

// Load map dynamically (SSR disabled — Leaflet needs `window`)
const MapZoneEditor = dynamic(
  () => import("@/components/admin/map-zone/MapZoneEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted/30 animate-pulse flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Đang tải bản đồ...</span>
      </div>
    ),
  },
);

const MapZonePage = () => {
  // ── Dashboard shell data ──
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardData()
      .then(setDashboardData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Service zone state ──
  const {
    data: allZonesData,
    isLoading: isZonesLoading,
    refetch: refetchZones,
  } = useAllServiceZones();

  const createMutation = useCreateServiceZone();
  const updateMutation = useUpdateServiceZone();

  const [mode, setMode] = useState<PageMode>("list");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedZone, setSelectedZone] = useState<ServiceZoneEntity | null>(null);
  const [drawnCoordinates, setDrawnCoordinates] = useState<Coordinate[] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleCoordinatesChange = useCallback((coords: Coordinate[] | null) => {
    setDrawnCoordinates(coords);
  }, []);

  const goBackToList = useCallback(() => {
    setMode("list");
    setSelectedZone(null);
    setDrawnCoordinates(null);
  }, []);

  const handleStartCreate = useCallback(() => {
    setSelectedZone(null);
    setMode("create");
    // keep drawnCoordinates so user can draw first then click create
  }, []);

  const handleStartEdit = useCallback((zone: ServiceZoneEntity) => {
    setSelectedZone(zone);
    setDrawnCoordinates(null); // force redraw for edit
    setMode("edit");
  }, []);

  const handleCreate = useCallback(
    (name: string, coords: Coordinate[], isActive: boolean) => {
      const toastId = toast.loading("Đang tạo vùng dịch vụ...");
      createMutation.mutate(
        { name, coordinates: coords, isActive },
        {
          onSuccess: () => {
            toast.dismiss(toastId);
            toast.success("Đã tạo vùng dịch vụ thành công");
            refetchZones();
            goBackToList();
          },
          onError: () => {
            toast.dismiss(toastId);
            toast.error("Có lỗi xảy ra khi tạo vùng dịch vụ");
          },
        },
      );
    },
    [createMutation, refetchZones, goBackToList],
  );

  const handleUpdate = useCallback(
    (name: string, coords: Coordinate[], isActive: boolean) => {
      if (!selectedZone) return;
      const toastId = toast.loading("Đang cập nhật vùng dịch vụ...");
      updateMutation.mutate(
        { id: selectedZone.id, body: { name, coordinates: coords, isActive } },
        {
          onSuccess: () => {
            toast.dismiss(toastId);
            toast.success("Đã cập nhật vùng dịch vụ thành công");
            refetchZones();
            goBackToList();
          },
          onError: () => {
            toast.dismiss(toastId);
            toast.error("Có lỗi xảy ra khi cập nhật vùng dịch vụ");
          },
        },
      );
    },
    [selectedZone, updateMutation, refetchZones, goBackToList],
  );

  // ── Loading shell ──
  if (loading || !dashboardData) {
    return (
      <DashboardLayout
        favorites={[]}
        projects={[]}
        cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
      >
        <DashboardSkeleton variant="table" />
      </DashboardLayout>
    );
  }

  const allZones: ServiceZoneEntity[] = Array.isArray(allZonesData) ? allZonesData : [];
  const filteredZones = allZones.filter((z) =>
    filterMode === "all" ? true : filterMode === "active" ? z.isActive : !z.isActive,
  );
  // When editing, remove selected zone from background (shown separately as reference)
  const backgroundZones = mode === "edit" && selectedZone
    ? allZones.filter((z) => z.id !== selectedZone.id)
    : allZones;

  return (
    <DashboardLayout
      favorites={dashboardData.favorites}
      projects={dashboardData.projects}
      cloudStorage={dashboardData.cloudStorage}
    >
      {/* Full-bleed container: negate the parent p-6 */}
      <div className="-m-6 flex h-[calc(100vh-64px)]">
        {/* ── LEFT SIDEBAR ── */}
        <aside
          className={cn(
            "shrink-0 border-r border-border/40 bg-background transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
            sidebarOpen ? "w-95" : "w-0",
          )}
        >
          {/* Sidebar header */}
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3 shrink-0">
            {mode !== "list" && (
              <button
                onClick={goBackToList}
                className="p-1.5 hover:bg-muted rounded-md transition-colors shrink-0"
                title="Về danh sách"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-5 w-5 text-[#FF5722] shrink-0" weight="fill" />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tighter truncate">
                  {mode === "list" && "Khoanh vùng dịch vụ SOS"}
                  {mode === "create" && "Tạo vùng mới"}
                  {mode === "edit" && "Chỉnh sửa vùng"}
                </h1>
                <p className="text-[14px] text-muted-foreground tracking-tighter truncate">
                  {mode === "list" && "Xác định phạm vi nhận SOS"}
                  {mode === "create" && "Vẽ vùng trên bản đồ rồi điền thông tin"}
                  {mode === "edit" && `Vùng số ${selectedZone?.id} · ${selectedZone?.name}`}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-hidden">
            {mode === "list" ? (
              /* ── LIST MODE ── */
              <div className="h-full flex flex-col">
                {/* Create button */}
                <div className="px-4 pt-4 pb-3 shrink-0">
                  <Button
                    onClick={handleStartCreate}
                    className="w-full rounded-lg bg-[#FF5722] hover:bg-[#FF5722]/90 text-white font-semibold text-sm h-10 gap-2 shadow-sm"
                  >
                    <Plus className="h-4 w-4" weight="bold" />
                    Tạo vùng mới
                  </Button>
                </div>

                {/* Filter pills */}
                <div className="px-4 pb-3 shrink-0">
                  <div className="flex gap-2 bg-muted/50 p-1 rounded-lg">
                    {(["all", "active", "inactive"] as const).map((f) => {
                      const count =
                        f === "all"
                          ? allZones.length
                          : f === "active"
                            ? allZones.filter((z) => z.isActive).length
                            : allZones.filter((z) => !z.isActive).length;
                      const label =
                        f === "all" ? "Tất cả" : f === "active" ? "Hoạt động" : "Tạm tắt";
                      return (
                        <button
                          key={f}
                          onClick={() => setFilterMode(f)}
                          className={cn(
                            "flex-1 py-1 px-2 rounded-md text-sm font-semibold tracking-tighter transition-all",
                            filterMode === f
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {label}
                          <span
                            className={cn(
                              "ml-2 tracking-tighter text-[12px]",
                              filterMode === f ? "text-[#FF5722]" : "opacity-60",
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Zone list */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                  {isZonesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-18 bg-muted/60 animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : filteredZones.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
                      <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
                        <MapPin className="h-6 w-6 opacity-40" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {allZones.length === 0 ? "Chưa có vùng nào" : "Không khớp bộ lọc"}
                        </p>
                        {allZones.length === 0 && (
                          <p className="text-xs mt-0.5 opacity-60">
                            Nhấn &quot;Tạo vùng mới&quot; để bắt đầu
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    filteredZones.map((zone) => (
                      <div
                        key={zone.id}
                        className="group relative flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-[#FF5722]/30 hover:bg-[#FF5722]/3 transition-all duration-150 cursor-default"
                      >
                        {/* Status dot */}
                        <div
                          className={cn(
                            "shrink-0 w-2 h-2 rounded-full mt-0.5",
                            zone.isActive ? "bg-[#FF5722]" : "bg-gray-300 dark:bg-gray-600",
                          )}
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold tracking-tighter truncate leading-snug">
                            {zone.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[12px] tracking-tighter text-muted-foreground">
                              {zone.coordinates?.length ?? 0} điểm
                            </span>
                            <span className="text-[11px] text-muted-foreground/40">·</span>
                            <span
                              className={cn(
                                "text-[12px] tracking-tighter font-medium",
                                zone.isActive ? "text-[#FF5722]" : "text-muted-foreground",
                              )}
                            >
                              {zone.isActive ? "Hoạt động" : "Tạm tắt"}
                            </span>
                          </div>
                        </div>

                        {/* Edit button */}
                        <button
                          onClick={() => handleStartEdit(zone)}
                          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                          title="Chỉnh sửa"
                        >
                          <PencilSimple className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* ── CREATE / EDIT MODE ── */
              <ServiceZonePanel
                zone={mode === "edit" ? selectedZone : null}
                isLoading={false}
                drawnCoordinates={drawnCoordinates}
                isSaving={mode === "create" ? createMutation.isPending : updateMutation.isPending}
                isOnlyActiveZone={allZones.filter((z) => z.isActive).length === 1 && selectedZone?.isActive === true}
                onSave={mode === "create" ? handleCreate : handleUpdate}
              />
            )}
          </div>
        </aside>

        {/* ── RIGHT: MAP (full remaining space) ── */}
        <div className="flex-1 relative">
          {/* Toggle sidebar button — floating on top-left of map */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-4 left-14 z-1000 h-10 w-10 bg-background/90 backdrop-blur-sm shadow-lg border-border/60 hover:bg-background"
            title={sidebarOpen ? "Thu gọn panel" : "Mở panel"}
          >
            <SidebarSimple
              className={cn("h-5 w-5 transition-transform", !sidebarOpen && "rotate-180")}
              weight={sidebarOpen ? "fill" : "regular"}
            />
          </Button>

          <MapZoneEditor
            existingCoordinates={mode === "edit" ? selectedZone?.coordinates : undefined}
            onCoordinatesChange={handleCoordinatesChange}
            sidebarOpen={sidebarOpen}
            allZones={backgroundZones}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MapZonePage;

