"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapPin,
  PencilSimple,
  Trash,
  ArrowClockwise,
  ArrowCounterClockwise,
  Globe,
  CheckCircle,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useAssemblyPoints,
  useAllCheckInRadiusConfigs,
  useAssemblyPointCheckInRadius,
  useSetAssemblyPointCheckInRadius,
  useDeleteAssemblyPointCheckInRadius,
} from "@/services/assembly_points";
import type { AssemblyPointEntity } from "@/services/assembly_points";

// ── Fly-to helper ──────────────────────────────────────────────────────────
function statusColor(status: AssemblyPointEntity["status"]) {
  switch (status) {
    case "Available":
      return "#22c55e";
    case "Unavailable":
      return "#f59e0b";
    case "Closed":
      return "#ef4444";
    default:
      return "#6366f1";
  }
}

function statusLabel(status: AssemblyPointEntity["status"]) {
  switch (status) {
    case "Created":
      return "Mới tạo";
    case "Available":
      return "Sẵn sàng";
    case "Unavailable":
      return "Không khả dụng";
    case "Closed":
      return "Đã đóng";
    default:
      return status;
  }
}

// ── Custom Leaflet icon ────────────────────────────────────────────────────
function buildIcon(color: string, selected: boolean) {
  const size = selected ? 20 : 16;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="10" fill="${color}" stroke="white" stroke-width="3" opacity="${selected ? 1 : 0.85}"/>
      ${selected ? `<circle cx="16" cy="16" r="4" fill="white"/>` : ""}
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    popupAnchor: [0, -size],
  });
}

function buildRadiusHandleIcon(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="6" fill="white" stroke="${color}" stroke-width="3" />
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function offsetLatLng(
  lat: number,
  lng: number,
  distanceMeters: number,
  bearingDegrees: number,
) {
  const earthRadiusMeters = 6378137;
  const bearing = (bearingDegrees * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const angularDistance = distanceMeters / earthRadiusMeters;

  const nextLat = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const nextLng =
    lngRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(nextLat),
    );

  return L.latLng((nextLat * 180) / Math.PI, (nextLng * 180) / Math.PI);
}

// ── Selected point detail panel (within map sidebar) ──────────────────────
function PointDetailPanel({
  point,
  radiusConfig,
  isLoadingRadius,
  editMode,
  radiusInput,
  onStartEdit,
  onCancelEdit,
  onRadiusInputChange,
  onRevertRadius,
  onClose,
}: {
  point: AssemblyPointEntity;
  radiusConfig: ReturnType<typeof useAssemblyPointCheckInRadius>["data"];
  isLoadingRadius: boolean;
  editMode: boolean;
  radiusInput: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRadiusInputChange: (value: string) => void;
  onRevertRadius: () => void;
  onClose: () => void;
}) {
  const { mutateAsync: setRadius, isPending: isSetting } =
    useSetAssemblyPointCheckInRadius();
  const { mutateAsync: deleteRadius, isPending: isDeleting } =
    useDeleteAssemblyPointCheckInRadius();

  const handleSave = async () => {
    const val = parseFloat(radiusInput);
    if (!Number.isFinite(val) || val <= 0 || val > 5000) {
      toast.error("Bán kính phải > 0 và ≤ 5000 mét");
      return;
    }
    try {
      await setRadius({ id: point.id, maxRadiusMeters: val });
      toast.success("Đã cập nhật bán kính check-in");
      onCancelEdit();
    } catch {
      toast.error("Không thể cập nhật bán kính");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRadius(point.id);
      toast.success("Đã xoá cấu hình riêng — điểm sẽ dùng bán kính toàn cục");
      onCancelEdit();
    } catch {
      toast.error("Không thể xoá cấu hình bán kính");
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-base tracking-tighter font-semibold text-foreground">
            {point.name}
          </span>
          <span className="text-sm tracking-tighter text-muted-foreground">
            {point.code}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>

      {/* Status badge */}
      <Badge
        variant="outline"
        className="w-fit text-xs"
        style={{ color: statusColor(point.status) }}
      >
        {statusLabel(point.status)}
      </Badge>

      {/* Radius info */}
      {isLoadingRadius ? (
        <div className="text-xs tracking-tighter text-muted-foreground animate-pulse">
          Đang tải cấu hình bán kính...
        </div>
      ) : radiusConfig ? (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-tighter text-muted-foreground">
              Bán kính check-in hiện tại
            </span>
            {radiusConfig.isGlobalFallback ? (
              <Badge variant="secondary" className="text-xs gap-1">
                <Globe size={10} />
                Toàn cục
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs gap-1 border-emerald-500/40 text-emerald-600"
              >
                <CheckCircle size={10} />
                Riêng
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">
              {radiusConfig.maxRadiusMeters}
            </span>
            <span className="text-sm text-muted-foreground">mét</span>
          </div>
          {radiusConfig.updatedAt && (
            <p className="text-xs tracking-tighter text-muted-foreground">
              Cập nhật:{" "}
              {new Date(radiusConfig.updatedAt).toLocaleString("vi-VN")}
            </p>
          )}
        </div>
      ) : null}

      {/* Edit form */}
      {editMode ? (
        <div className="space-y-2">
          <label className="text-xs tracking-tighter font-medium text-muted-foreground">
            Bán kính mới (mét, 1–5000)
          </label>
          <Input
            type="number"
            min={1}
            max={5000}
            value={radiusInput}
            onChange={(e) => onRadiusInputChange(e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-full text-xs gap-1.5"
            onClick={onRevertRadius}
            disabled={isSetting || isDeleting}
          >
            <ArrowCounterClockwise size={12} />
            Khôi phục bán kính cũ
          </Button>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={handleSave}
              disabled={isSetting}
            >
              {isSetting ? "Đang lưu..." : "Lưu"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onCancelEdit}
              disabled={isSetting}
            >
              Huỷ
            </Button>
          </div>
          {radiusConfig && !radiusConfig.isGlobalFallback && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-full text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash size={12} className="mr-1" />
              {isDeleting ? "Đang xoá..." : "Xoá — dùng lại toàn cục"}
            </Button>
          )}
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-full text-xs gap-1.5"
          onClick={onStartEdit}
        >
          <PencilSimple size={12} />
          Chỉnh sửa bán kính
        </Button>
      )}
    </div>
  );
}

// ── The actual map inner component (imperative Leaflet, no react-leaflet) ─
function CheckInRadiusMapInner({
  assemblyPoints,
  customRadiusMap,
  selectedId,
  selectedRadiusMeters,
  isAwaitingSelectedRadius,
  isEditingRadius,
  onEditingRadiusChange,
  onSelect,
  flyTo,
}: {
  assemblyPoints: AssemblyPointEntity[];
  customRadiusMap: Map<number, number>;
  selectedId: number | null;
  selectedRadiusMeters: number | null;
  isAwaitingSelectedRadius: boolean;
  isEditingRadius: boolean;
  onEditingRadiusChange: (nextRadiusMeters: number) => void;
  onSelect: (id: number) => void;
  flyTo: { lat: number; lng: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const circlesRef = useRef<Map<number, L.Circle>>(new Map());
  const radiusHandleRef = useRef<L.Marker | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastViewportKeyRef = useRef<string>("");
  // Keep callback in a ref so the handle effect never re-runs just because the fn changed
  const onEditingRadiusChangeRef = useRef(onEditingRadiusChange);
  useEffect(() => {
    onEditingRadiusChangeRef.current = onEditingRadiusChange;
  }, [onEditingRadiusChange]);
  const isDraggingRadiusHandleRef = useRef(false);
  const pendingRadiusRafRef = useRef<number | null>(null);
  const pendingDraggedRadiusRef = useRef<number | null>(null);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // already initialised

    const map = L.map(containerRef.current, {
      center: [16.4637, 107.5909],
      zoom: 13,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    if (typeof ResizeObserver !== "undefined") {
      resizeObserverRef.current = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    const markers = markersRef.current;
    const circles = circlesRef.current;
    return () => {
      if (pendingRadiusRafRef.current != null) {
        cancelAnimationFrame(pendingRadiusRafRef.current);
        pendingRadiusRafRef.current = null;
      }
      pendingDraggedRadiusRef.current = null;
      radiusHandleRef.current?.remove();
      radiusHandleRef.current = null;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map.remove();
      mapRef.current = null;
      markers.clear();
      circles.clear();
    };
  }, []);

  // Sync markers & circles whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(markersRef.current.keys());

    assemblyPoints.forEach((point) => {
      existingIds.delete(point.id);
      const isSelected = point.id === selectedId;
      const color = statusColor(point.status);
      const markerColor = isSelected ? "#6366f1" : color;
      const radius =
        isSelected && selectedRadiusMeters != null
          ? selectedRadiusMeters
          : customRadiusMap.get(point.id);

      // ── Marker ──
      const icon = buildIcon(markerColor, isSelected);
      let marker = markersRef.current.get(point.id);
      if (!marker) {
        marker = L.marker([point.latitude, point.longitude], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        })
          .on("click", () => onSelect(point.id))
          .addTo(map);
        markersRef.current.set(point.id, marker);
      } else {
        marker.setIcon(icon);
        marker.setZIndexOffset(isSelected ? 1000 : 0);
      }

      // ── Circle ──
      let circle = circlesRef.current.get(point.id);
      if (radius != null) {
        const pathOptions = {
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: isSelected ? 0.08 : 0.04,
          weight: isSelected ? 3.5 : 1.5,
          opacity: isSelected ? 0.95 : 0.7,
          dashArray: isSelected ? undefined : "6 4",
        };
        if (!circle) {
          circle = L.circle([point.latitude, point.longitude], {
            radius,
            ...pathOptions,
          }).addTo(map);
          circlesRef.current.set(point.id, circle);
        } else {
          circle.setRadius(radius);
          circle.setStyle(pathOptions);
          circle.setLatLng([point.latitude, point.longitude]);
        }
      } else if (circle) {
        circle.remove();
        circlesRef.current.delete(point.id);
      }
    });

    // Remove stale markers/circles for points no longer in list
    existingIds.forEach((id) => {
      markersRef.current.get(id)?.remove();
      markersRef.current.delete(id);
      circlesRef.current.get(id)?.remove();
      circlesRef.current.delete(id);
    });
  }, [
    assemblyPoints,
    customRadiusMap,
    onSelect,
    selectedId,
    selectedRadiusMeters,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const selectedPoint =
      selectedId != null
        ? (assemblyPoints.find((point) => point.id === selectedId) ?? null)
        : null;

    if (
      !isEditingRadius ||
      !selectedPoint ||
      selectedRadiusMeters == null ||
      selectedRadiusMeters <= 0
    ) {
      if (pendingRadiusRafRef.current != null) {
        cancelAnimationFrame(pendingRadiusRafRef.current);
        pendingRadiusRafRef.current = null;
      }
      pendingDraggedRadiusRef.current = null;
      radiusHandleRef.current?.remove();
      radiusHandleRef.current = null;
      isDraggingRadiusHandleRef.current = false;
      map.dragging.enable();
      return;
    }

    const handleLatLng = offsetLatLng(
      selectedPoint.latitude,
      selectedPoint.longitude,
      selectedRadiusMeters,
      90,
    );

    const handleIcon = buildRadiusHandleIcon("#6366f1");
    let handleMarker = radiusHandleRef.current;

    if (!handleMarker) {
      handleMarker = L.marker(handleLatLng, {
        icon: handleIcon,
        draggable: true,
        zIndexOffset: 1500,
      })
        .on("dragstart", () => {
          isDraggingRadiusHandleRef.current = true;
          map.dragging.disable();
        })
        .on("drag", (event) => {
          const marker = event.target as L.Marker;
          const nextRadius = Math.max(
            1,
            Math.min(
              5000,
              Math.round(
                map.distance(
                  L.latLng(selectedPoint.latitude, selectedPoint.longitude),
                  marker.getLatLng(),
                ),
              ),
            ),
          );
          pendingDraggedRadiusRef.current = nextRadius;
          circlesRef.current.get(selectedPoint.id)?.setRadius(nextRadius);
          // Live number: throttle via RAF — does NOT trigger effect re-run on handle
          if (pendingRadiusRafRef.current == null) {
            pendingRadiusRafRef.current = requestAnimationFrame(() => {
              pendingRadiusRafRef.current = null;
              if (
                isDraggingRadiusHandleRef.current &&
                pendingDraggedRadiusRef.current != null
              ) {
                onEditingRadiusChangeRef.current(
                  pendingDraggedRadiusRef.current,
                );
              }
            });
          }
        })
        .on("dragend", (event) => {
          // On dragend: commit final value to React state
          isDraggingRadiusHandleRef.current = false;
          map.dragging.enable();
          const marker = event.target as L.Marker;
          const nextRadius = Math.max(
            1,
            Math.min(
              5000,
              Math.round(
                map.distance(
                  L.latLng(selectedPoint.latitude, selectedPoint.longitude),
                  marker.getLatLng(),
                ),
              ),
            ),
          );

          if (pendingRadiusRafRef.current != null) {
            cancelAnimationFrame(pendingRadiusRafRef.current);
            pendingRadiusRafRef.current = null;
          }
          pendingDraggedRadiusRef.current = nextRadius;
          circlesRef.current.get(selectedPoint.id)?.setRadius(nextRadius);
          onEditingRadiusChangeRef.current(nextRadius);

          marker.setLatLng(
            offsetLatLng(
              selectedPoint.latitude,
              selectedPoint.longitude,
              nextRadius,
              90,
            ),
          );
        })
        .addTo(map);
      radiusHandleRef.current = handleMarker;
    } else {
      // Never touch the handle marker while actively dragging — avoid snapping
      if (!isDraggingRadiusHandleRef.current) {
        handleMarker.setIcon(handleIcon);
        handleMarker.dragging?.enable();
        handleMarker.setLatLng(handleLatLng);
      }
    }
    // onEditingRadiusChange is accessed via ref — intentionally omitted from deps
  }, [assemblyPoints, isEditingRadius, selectedId, selectedRadiusMeters]);

  // Fly to selected point
  useEffect(() => {
    if (
      !flyTo ||
      !mapRef.current ||
      isAwaitingSelectedRadius ||
      isEditingRadius
    ) {
      return;
    }
    const map = mapRef.current;
    const viewportKey = `${flyTo.lat}:${flyTo.lng}:${selectedRadiusMeters ?? "none"}`;
    if (viewportKey === lastViewportKeyRef.current) {
      return;
    }
    lastViewportKeyRef.current = viewportKey;

    map.stop();

    if (selectedRadiusMeters != null && selectedRadiusMeters > 0) {
      const bounds = L.latLng(flyTo.lat, flyTo.lng).toBounds(
        selectedRadiusMeters * 2,
      );
      map.flyToBounds(bounds, {
        padding: [48, 48],
        maxZoom: 16,
        duration: 0.85,
      });
      return;
    }

    map.flyTo([flyTo.lat, flyTo.lng], 16, {
      duration: 0.85,
      easeLinearity: 0.2,
    });
  }, [flyTo, isAwaitingSelectedRadius, isEditingRadius, selectedRadiusMeters]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full min-w-0"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

// ── Main exported component ────────────────────────────────────────────────
export default function CheckInRadiusMapTab({
  fullHeight = false,
}: {
  fullHeight?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [isRadiusEditMode, setIsRadiusEditMode] = useState(false);
  const [radiusDraft, setRadiusDraft] = useState("");

  // Fetch all assembly points (up to 200)
  const { data: apPage1, isLoading: isLoadingAP } = useAssemblyPoints({
    params: { pageSize: 100, pageNumber: 1 },
  });
  const { data: apPage2 } = useAssemblyPoints({
    params: { pageSize: 100, pageNumber: 2 },
    enabled: (apPage1?.totalPages ?? 1) > 1,
  });

  const assemblyPoints = useMemo<AssemblyPointEntity[]>(() => {
    const items = [...(apPage1?.items ?? []), ...(apPage2?.items ?? [])];
    return items;
  }, [apPage1, apPage2]);

  // Fetch all custom radius configs
  const {
    data: allCustomConfigs,
    isLoading: isLoadingConfigs,
    refetch: refetchConfigs,
  } = useAllCheckInRadiusConfigs();

  // Map assemblyPointId → customRadius (meters)
  const customRadiusMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const cfg of allCustomConfigs?.items ?? []) {
      map.set(cfg.assemblyPointId, cfg.maxRadiusMeters);
    }
    return map;
  }, [allCustomConfigs]);

  const selectedPoint = useMemo(
    () => assemblyPoints.find((p) => p.id === selectedId) ?? null,
    [assemblyPoints, selectedId],
  );
  const immediateSelectedRadius =
    selectedId != null ? (customRadiusMap.get(selectedId) ?? null) : null;
  const {
    data: selectedRadiusConfig,
    isLoading: isLoadingSelectedRadius,
    isFetching: isFetchingSelectedRadius,
  } = useAssemblyPointCheckInRadius(selectedId ?? Number.NaN, {
    enabled: selectedId != null,
  });
  const selectedRadiusMeters =
    immediateSelectedRadius ?? selectedRadiusConfig?.maxRadiusMeters ?? null;
  const parsedRadiusDraft = Number(radiusDraft);
  const editingRadiusMeters =
    radiusDraft.trim().length > 0 && Number.isFinite(parsedRadiusDraft)
      ? Math.max(1, Math.min(5000, parsedRadiusDraft))
      : null;
  const displayedSelectedRadiusMeters =
    isRadiusEditMode && editingRadiusMeters != null
      ? editingRadiusMeters
      : selectedRadiusMeters;
  const isAwaitingSelectedRadius =
    selectedId != null &&
    immediateSelectedRadius == null &&
    selectedRadiusMeters == null &&
    (isLoadingSelectedRadius || isFetchingSelectedRadius);

  const handleSelect = (id: number) => {
    if (selectedId === id) {
      return;
    }

    const point = assemblyPoints.find((p) => p.id === id);
    setIsRadiusEditMode(false);
    setRadiusDraft("");
    setSelectedId(id);
    if (point) {
      setFlyTo({ lat: point.latitude, lng: point.longitude });
    }
  };

  const handleStartRadiusEdit = () => {
    if (selectedRadiusMeters != null) {
      setRadiusDraft(String(Math.round(selectedRadiusMeters)));
    }
    setIsRadiusEditMode(true);
  };

  const handleCancelRadiusEdit = () => {
    setIsRadiusEditMode(false);
    setRadiusDraft(
      selectedRadiusMeters != null
        ? String(Math.round(selectedRadiusMeters))
        : "",
    );
  };

  const handleRadiusDraftChange = (value: string) => {
    setRadiusDraft(value);
  };

  const handleRadiusRevert = () => {
    setRadiusDraft(
      selectedRadiusMeters != null
        ? String(Math.round(selectedRadiusMeters))
        : "",
    );
  };

  const handleEditingRadiusChange = useCallback((nextRadiusMeters: number) => {
    const clamped = Math.max(1, Math.min(5000, Math.round(nextRadiusMeters)));
    setRadiusDraft(String(clamped));
  }, []);

  const isLoading = isLoadingAP || isLoadingConfigs;

  return (
    <div
      className={cn(
        fullHeight ? "flex h-full w-full min-w-0" : "mt-5 flex gap-4",
      )}
    >
      {/* ── Left sidebar ── */}
      <div
        className={cn(
          "flex w-72 shrink-0 flex-col gap-3 bg-white xl:w-80",
          fullHeight &&
            "min-h-0 overflow-hidden border-r border-border/40 px-4 py-4",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tighter text-foreground">
              Điểm tập kết
            </h3>
            <p className="text-sm tracking-tighter text-muted-foreground">
              {assemblyPoints.length} điểm • {allCustomConfigs?.totalCount ?? 0}{" "}
              cấu hình riêng
            </p>
          </div>
          <button
            onClick={() => refetchConfigs()}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Làm mới"
          >
            <ArrowClockwise size={14} />
          </button>
        </div>

        {/* Assembly point list */}
        <ScrollArea
          className={cn(
            "rounded-lg border border-border/60",
            fullHeight ? "flex-1" : "h-125",
          )}
        >
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground tracking-tighter animate-pulse">
              Đang tải...
            </div>
          ) : assemblyPoints.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground tracking-tighter">
              Không có điểm tập kết nào.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {assemblyPoints.map((point) => {
                const isSelected = point.id === selectedId;
                const customRadius = customRadiusMap.get(point.id);
                const color = statusColor(point.status);

                return (
                  <button
                    key={point.id}
                    className={cn(
                      "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                      isSelected && "bg-muted",
                    )}
                    onClick={() => handleSelect(point.id)}
                  >
                    <MapPin
                      size={14}
                      weight="fill"
                      className="mt-0.5 shrink-0"
                      style={{ color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-sm tracking-tighter font-medium text-foreground">
                          {point.name}
                        </span>
                        {customRadius != null ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 text-xs tracking-tighter px-1 py-0 h-4 border-emerald-500/40 text-emerald-600"
                          >
                            {customRadius}m
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-xs px-1 py-0 h-4"
                          >
                            <Globe size={8} className="mr-0.5" />
                            Toàn cục
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs tracking-tighter text-muted-foreground">
                        {point.code}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Selected point detail panel */}
        {selectedPoint && (
          <PointDetailPanel
            key={selectedPoint.id}
            point={selectedPoint}
            radiusConfig={selectedRadiusConfig}
            isLoadingRadius={
              isLoadingSelectedRadius || isFetchingSelectedRadius
            }
            editMode={isRadiusEditMode}
            radiusInput={radiusDraft}
            onStartEdit={handleStartRadiusEdit}
            onCancelEdit={handleCancelRadiusEdit}
            onRadiusInputChange={handleRadiusDraftChange}
            onRevertRadius={handleRadiusRevert}
            onClose={() => {
              setIsRadiusEditMode(false);
              setRadiusDraft("");
              setSelectedId(null);
            }}
          />
        )}
      </div>

      {/* ── Map ── */}
      <div
        className={cn(
          "min-w-0 flex-1 overflow-hidden shadow-sm",
          fullHeight ? "" : "rounded-xl border border-border/60",
        )}
        style={fullHeight ? undefined : { height: 560 }}
      >
        <CheckInRadiusMapInner
          assemblyPoints={assemblyPoints}
          customRadiusMap={customRadiusMap}
          selectedId={selectedId}
          selectedRadiusMeters={displayedSelectedRadiusMeters}
          isAwaitingSelectedRadius={isAwaitingSelectedRadius}
          isEditingRadius={isRadiusEditMode}
          onEditingRadiusChange={handleEditingRadiusChange}
          onSelect={handleSelect}
          flyTo={flyTo}
        />
      </div>
    </div>
  );
}
