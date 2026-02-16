"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { SOSCluster, Rescuer, CoordinatorMapProps } from "@/type";
import type { DepotEntity } from "@/services/depot/type";
import type { AssemblyPointEntity } from "@/services/assembly_points/type";
import {
  MagnifyingGlass,
  X,
  Factory,
  MapPin,
  Plus,
  Minus,
  Crosshair,
  FunnelSimple,
  Command,
  NavigationArrow,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false },
);

// FlyToHandler component - dynamically imported to use useMap hook
const FlyToHandler = dynamic(
  () => import("./FlyToHandler").then((mod) => mod.FlyToHandler),
  { ssr: false },
);

// MapZoomHandler - provides zoom/recenter controls from inside MapContainer
const MapZoomHandler = dynamic(
  () => import("./MapZoomHandler").then((mod) => mod.MapZoomHandler),
  { ssr: false },
);

const CoordinatorMap = ({
  clusters,
  rescuers,
  depots,
  assemblyPoints = [],
  selectedCluster,
  selectedRescuer,
  aiDecision,
  onClusterSelect,
  onRescuerSelect,
  onDepotSelect,
  onAssemblyPointSelect,
  flyToLocation,
  userLocation,
}: CoordinatorMapProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFlyToLocation, setSearchFlyToLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [searchFilter, setSearchFilter] = useState<
    "all" | "depot" | "assemblyPoint"
  >("all");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mapControls, setMapControls] = useState<{
    zoomIn: () => void;
    zoomOut: () => void;
    recenter: () => void;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Use setTimeout to avoid React 19 strict mode warning
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Load Leaflet CSS in the document head
  useEffect(() => {
    // Check if Leaflet CSS is already loaded
    const existingLink = document.querySelector('link[href*="leaflet.css"]');

    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      document.head.appendChild(link);

      // Cleanup function to remove the link when component unmounts
      return () => {
        const linkToRemove = document.querySelector(
          'link[href*="leaflet.css"]',
        );
        if (linkToRemove) {
          document.head.removeChild(linkToRemove);
        }
      };
    }
  }, []);

  // Central Vietnam coordinates (Hue)
  const defaultCenter: [number, number] = [16.4637, 107.5909];
  const defaultZoom = 13;

  // Generate route points if AI decision exists
  const routePoints: [number, number][] = useMemo(() => {
    return aiDecision?.proposedPlan
      ? aiDecision.proposedPlan.map((step) => [
          step.location.lat,
          step.location.lng,
        ])
      : [];
  }, [aiDecision]);

  // Search results - combine depots and assembly points
  type SearchResult = {
    id: string;
    type: "depot" | "assemblyPoint";
    name: string;
    latitude: number;
    longitude: number;
  };

  // Stable callback for map controls
  const handleMapReady = useCallback(
    (controls: {
      zoomIn: () => void;
      zoomOut: () => void;
      recenter: () => void;
    }) => {
      setMapControls(controls);
    },
    [],
  );

  // Total counts for search categories
  const depotCount = depots.length;
  const assemblyPointCount = assemblyPoints.length;

  const searchResults: SearchResult[] = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search depots
    if (searchFilter === "all" || searchFilter === "depot") {
      depots.forEach((depot) => {
        if (depot.name.toLowerCase().includes(query)) {
          results.push({
            id: `depot-${depot.id}`,
            type: "depot",
            name: depot.name,
            latitude: depot.latitude,
            longitude: depot.longitude,
          });
        }
      });
    }

    // Search assembly points
    if (searchFilter === "all" || searchFilter === "assemblyPoint") {
      assemblyPoints.forEach((point) => {
        if (
          point.name.toLowerCase().includes(query) ||
          point.code.toLowerCase().includes(query)
        ) {
          results.push({
            id: `ap-${point.id}`,
            type: "assemblyPoint",
            name: point.name,
            latitude: point.latitude,
            longitude: point.longitude,
          });
        }
      });
    }

    return results.slice(0, 8); // Limit to 8 results
  }, [searchQuery, depots, assemblyPoints, searchFilter]);

  // Handle selecting a search result
  const handleSelectResult = (result: SearchResult) => {
    setSearchFlyToLocation({ lat: result.latitude, lng: result.longitude });
    setSearchQuery("");
    setIsSearchOpen(false);
    setIsSearchFocused(false);
  };

  // Keyboard shortcut to focus search (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close search
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine which location to fly to (prioritize search over external flyToLocation)
  const activeFlyToLocation = searchFlyToLocation || flyToLocation;

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="text-muted-foreground">Đang tải bản đồ...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Map Search Box - positioned top-left */}
      <div
        ref={searchContainerRef}
        className="absolute top-4 left-3 z-[1000] w-80"
      >
        <div
          className={cn(
            "rounded-2xl bg-background/95 backdrop-blur-md shadow-xl border transition-all duration-200",
            isSearchFocused
              ? "ring-2 ring-primary/40 border-primary/50"
              : "border-border/60",
          )}
        >
          {/* Search Input Row */}
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-muted-foreground/70 pointer-events-none">
              <MagnifyingGlass size={18} weight="bold" />
            </div>
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm kho, điểm tập kết..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => {
                setIsSearchOpen(true);
                setIsSearchFocused(true);
              }}
              className="pl-10 pr-20 h-11 bg-transparent border-0 shadow-none focus-visible:ring-0 rounded-2xl text-sm"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchOpen(false);
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X size={14} weight="bold" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 bg-muted/50 rounded-md border border-border/40">
                  <Command size={10} /> K
                </kbd>
              )}
            </div>
          </div>

          {/* Filters Row - show when focused or has query */}
          {(isSearchFocused || searchQuery) && (
            <div className="px-3 pb-2.5 flex items-center gap-1.5 border-t border-border/30 pt-2">
              <FunnelSimple
                size={14}
                className="text-muted-foreground/60 shrink-0"
              />
              <button
                onClick={() => setSearchFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                  searchFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSearchFilter("depot")}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                  searchFilter === "depot"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
              >
                <Factory size={12} weight="fill" /> Kho ({depotCount})
              </button>
              <button
                onClick={() => setSearchFilter("assemblyPoint")}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                  searchFilter === "assemblyPoint"
                    ? "bg-purple-500 text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
              >
                <MapPin size={12} weight="fill" /> Điểm tập kết (
                {assemblyPointCount})
              </button>
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchResults.length > 0 && (
          <div className="mt-2 bg-background/95 backdrop-blur-md rounded-2xl border border-border/60 shadow-xl overflow-hidden max-h-72 overflow-y-auto">
            <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
              Kết quả ({searchResults.length})
            </div>
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSelectResult(result)}
                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent/80 text-left text-sm transition-colors group"
              >
                <div
                  className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    result.type === "depot"
                      ? "bg-blue-100 dark:bg-blue-900/30"
                      : "bg-purple-100 dark:bg-purple-900/30",
                  )}
                >
                  {result.type === "depot" ? (
                    <Factory
                      size={16}
                      className="text-blue-600 dark:text-blue-400"
                      weight="fill"
                    />
                  ) : (
                    <MapPin
                      size={16}
                      className="text-purple-600 dark:text-purple-400"
                      weight="fill"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="truncate block text-sm font-medium">
                    {result.name}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 shrink-0 opacity-60 group-hover:opacity-100"
                >
                  {result.type === "depot" ? "Kho" : "Tập kết"}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {isSearchOpen && searchQuery.trim() && searchResults.length === 0 && (
          <div className="mt-2 bg-background/95 backdrop-blur-md rounded-2xl border border-border/60 shadow-xl p-6 text-center">
            <MagnifyingGlass
              size={28}
              className="text-muted-foreground/30 mx-auto mb-2"
            />
            <p className="text-sm font-medium text-muted-foreground">
              Không tìm thấy kết quả
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Thử tìm với từ khóa khác
            </p>
          </div>
        )}
      </div>

      <MapContainer
        center={
          activeFlyToLocation
            ? [activeFlyToLocation.lat, activeFlyToLocation.lng]
            : defaultCenter
        }
        zoom={defaultZoom}
        zoomControl={false}
        className="w-full h-full z-0 coordinator-map"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fly to location handler */}
        <FlyToHandler location={activeFlyToLocation} />

        {/* Map zoom handler - provides controls to parent */}
        <MapZoomHandler onMapReady={handleMapReady} />

        {/* SOS Cluster Markers */}
        {clusters.map((cluster) => (
          <SOSClusterMarker
            key={cluster.id}
            cluster={cluster}
            isSelected={selectedCluster?.id === cluster.id}
            onClick={() => onClusterSelect(cluster)}
          />
        ))}

        {/* Rescuer Markers */}
        {rescuers.map((rescuer) => (
          <RescuerMarker
            key={rescuer.id}
            rescuer={rescuer}
            isSelected={selectedRescuer?.id === rescuer.id}
            onClick={() => onRescuerSelect(rescuer)}
          />
        ))}

        {/* Depot Markers */}
        {depots.map((depot) => (
          <DepotMarker
            key={depot.id}
            depot={depot}
            onClick={() => onDepotSelect?.(depot)}
          />
        ))}

        {/* Assembly Point Markers */}
        {assemblyPoints.map((point) => (
          <AssemblyPointMarker
            key={point.id}
            assemblyPoint={point}
            onClick={() => onAssemblyPointSelect?.(point)}
          />
        ))}

        {/* User Location Marker */}
        {userLocation && <UserLocationMarker location={userLocation} />}

        {/* Mission Route Polyline */}
        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: "#3b82f6",
              weight: 4,
              opacity: 0.8,
              dashArray: "10, 10",
            }}
          />
        )}
      </MapContainer>

      {/* Custom Zoom Controls - bottom right */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => mapControls?.zoomIn()}
          className="w-10 h-10 rounded-full bg-background/95 backdrop-blur-md border border-border/60 shadow-lg flex items-center justify-center text-foreground hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-150"
          title="Phóng to"
        >
          <Plus size={18} weight="bold" />
        </button>
        <button
          onClick={() => mapControls?.zoomOut()}
          className="w-10 h-10 rounded-full bg-background/95 backdrop-blur-md border border-border/60 shadow-lg flex items-center justify-center text-foreground hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-150"
          title="Thu nhỏ"
        >
          <Minus size={18} weight="bold" />
        </button>
        <div className="h-px bg-border/40 mx-2" />
        <button
          onClick={() => mapControls?.recenter()}
          className="w-10 h-10 rounded-full bg-background/95 backdrop-blur-md border border-border/60 shadow-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-150"
          title="Về trung tâm"
        >
          <Crosshair size={18} weight="bold" />
        </button>
        {userLocation && (
          <>
            <div className="h-px bg-border/40 mx-2" />
            <button
              onClick={() => setSearchFlyToLocation(userLocation)}
              className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 border border-blue-400/60 shadow-lg flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all duration-150"
              title="Vị trí của tôi"
            >
              <NavigationArrow size={18} weight="fill" />
            </button>
          </>
        )}
      </div>

      {/* Map Legend */}
      <MapLegend />
    </div>
  );
};

export default CoordinatorMap;

// SOS Cluster Marker Component
function SOSClusterMarker({
  cluster,
  isSelected,
  onClick,
}: {
  cluster: SOSCluster;
  isSelected: boolean;
  onClick: () => void;
}) {
  const priorityColors = {
    P1: "#ef4444", // red-500
    P2: "#f97316", // orange-500
    P3: "#eab308", // yellow-500
  };

  const color = priorityColors[cluster.highestPriority];
  const size = isSelected ? 40 : 30;

  // Create custom icon using divIcon with useMemo
  const icon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    return L.divIcon({
      className: "custom-cluster-marker",
      html: `
        <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
          <div class="absolute inset-0 rounded-full animate-ping opacity-75" style="background-color: ${color};"></div>
          <div class="relative rounded-full flex items-center justify-center text-white font-bold text-xs" 
               style="width: ${size - 8}px; height: ${
                 size - 8
               }px; background-color: ${color}; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            ${cluster.totalVictims}
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster.totalVictims, cluster.highestPriority, isSelected]);

  if (!icon) return null;

  return (
    <Marker
      position={[cluster.center.lat, cluster.center.lng]}
      icon={icon}
      eventHandlers={{ click: onClick }}
    >
      <Popup>
        <div className="p-2 min-w-50">
          <div className="font-bold text-sm mb-2 pr-5">
            Cụm SOS #{cluster.id.split("-")[1]}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-white font-semibold"
                style={{ backgroundColor: color }}
              >
                {cluster.highestPriority}
              </span>
              <span>{cluster.totalVictims} nạn nhân</span>
            </div>
            <div className="text-muted-foreground">
              {cluster.sosRequests.length} yêu cầu SOS
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Rescuer Marker Component
function RescuerMarker({
  rescuer,
  isSelected,
  onClick,
}: {
  rescuer: Rescuer;
  isSelected: boolean;
  onClick: () => void;
}) {
  const typeIcons = {
    TRUCK: "🚚",
    MOTORBOAT: "🚤",
    SMALL_BOAT: "🛶",
  };

  const statusColors = {
    AVAILABLE: "#22c55e", // green-500
    BUSY: "#6b7280", // gray-500
  };

  const typeIcon = typeIcons[rescuer.type];
  const color = statusColors[rescuer.status];
  const size = isSelected ? 44 : 36;

  const iconEl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    return L.divIcon({
      className: "custom-rescuer-marker",
      html: `
        <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
          <div class="rounded-lg flex items-center justify-center text-lg" 
               style="width: ${size}px; height: ${size}px; background-color: white; border: 3px solid ${color}; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            ${typeIcon}
          </div>
          <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
               style="background-color: ${color};"></div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescuer.type, rescuer.status, isSelected]);

  if (!iconEl) return null;

  return (
    <Marker
      position={[rescuer.location.lat, rescuer.location.lng]}
      icon={iconEl}
      eventHandlers={{ click: onClick }}
    >
      <Popup>
        <div className="p-2 min-w-45">
          <div className="font-bold text-sm mb-2 pr-5">{rescuer.name}</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-white font-semibold"
                style={{ backgroundColor: color }}
              >
                {rescuer.status === "AVAILABLE" ? "Sẵn sàng" : "Đang bận"}
              </span>
            </div>
            <div>
              Tải: {rescuer.currentLoad}/{rescuer.capacity}
            </div>
            <div className="text-muted-foreground">
              {rescuer.capabilities.join(", ")}
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Depot Marker Component
function DepotMarker({
  depot,
  onClick,
}: {
  depot: DepotEntity;
  onClick?: () => void;
}) {
  const statusColors = {
    Available: "#22c55e", // green-500
    Full: "#f97316", // orange-500
    PendingAssignment: "#3b82f6", // blue-500
    Closed: "#ef4444", // red-500
  };

  const statusLabels = {
    Available: "Có sẵn",
    Full: "Đầy",
    PendingAssignment: "Chờ phân công",
    Closed: "Đóng cửa",
  };

  const color = statusColors[depot.status];

  const iconEl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    return L.divIcon({
      className: "custom-depot-marker",
      html: `
        <div class="relative flex items-center justify-center" style="width: 36px; height: 36px;">
          <div class="rounded-lg flex items-center justify-center text-lg bg-blue-100 border-2 border-blue-500" 
               style="width: 36px; height: 36px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
            🏭
          </div>
          <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
               style="background-color: ${color};"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }, [color]);

  if (!iconEl) return null;

  return (
    <Marker
      position={[depot.latitude, depot.longitude]}
      icon={iconEl}
      eventHandlers={{ click: () => onClick?.() }}
    >
      <Popup>
        <div className="p-2 min-w-50">
          <div className="font-bold text-sm mb-1 pr-5">{depot.name}</div>
          <div className="text-xs text-muted-foreground mb-2">
            📍 {depot.address}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-0.5 rounded text-white font-semibold"
                style={{ backgroundColor: color }}
              >
                {statusLabels[depot.status]}
              </span>
            </div>
            <div className="flex justify-between">
              <span>📦 Sức chứa:</span>
              <span className="font-semibold">{depot.capacity}</span>
            </div>
            <div className="flex justify-between">
              <span>📊 Sử dụng:</span>
              <span className="font-semibold">{depot.currentUtilization}%</span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Assembly Point Marker Component
function AssemblyPointMarker({
  assemblyPoint,
  onClick,
}: {
  assemblyPoint: AssemblyPointEntity;
  onClick?: () => void;
}) {
  const statusColors = {
    Active: "#22c55e", // green-500
    Overloaded: "#f97316", // orange-500
    Unavailable: "#ef4444", // red-500
  };

  const statusLabels = {
    Active: "Hoạt động",
    Overloaded: "Quá tải",
    Unavailable: "Không khả dụng",
  };

  const color = statusColors[assemblyPoint.status];

  const iconEl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    return L.divIcon({
      className: "custom-assembly-point-marker",
      html: `
        <div class="relative flex items-center justify-center" style="width: 36px; height: 36px;">
          <div class="rounded-lg flex items-center justify-center text-lg bg-purple-100 border-2 border-purple-500" 
               style="width: 36px; height: 36px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
            📍
          </div>
          <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
               style="background-color: ${color};"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }, [assemblyPoint.status, color]);

  if (!iconEl) return null;

  return (
    <Marker
      position={[assemblyPoint.latitude, assemblyPoint.longitude]}
      icon={iconEl}
      eventHandlers={{ click: () => onClick?.() }}
    >
      <Popup>
        <div className="p-2 min-w-50">
          <div className="font-bold text-sm mb-1 pr-5">
            {assemblyPoint.name}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            Mã: {assemblyPoint.code}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-0.5 rounded text-white font-semibold"
                style={{ backgroundColor: color }}
              >
                {statusLabels[assemblyPoint.status]}
              </span>
            </div>
            <div className="flex justify-between">
              <span>👥 Sức chứa đội:</span>
              <span className="font-semibold">
                {assemblyPoint.capacityTeams} đội
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// User Location Marker Component – pulsing blue dot
function UserLocationMarker({
  location,
}: {
  location: { lat: number; lng: number };
}) {
  const icon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    return L.divIcon({
      className: "custom-user-location-marker",
      html: `
        <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.25);animation:userLocPulse 2s ease-out infinite;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 6px rgba(59,130,246,0.6);position:relative;z-index:1;"></div>
        </div>
        <style>
          @keyframes userLocPulse {
            0% { transform:scale(0.8); opacity:1; }
            100% { transform:scale(2.2); opacity:0; }
          }
        </style>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }, []);

  if (!icon) return null;

  return (
    <Marker position={[location.lat, location.lng]} icon={icon}>
      <Popup>
        <div className="p-2 min-w-40">
          <div className="font-bold text-sm mb-1 pr-5">📍 Vị trí của tôi</div>
          <div className="text-xs text-muted-foreground">
            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Map Legend Component
function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[400] bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-3">
      <div className="text-xs font-semibold mb-2">Chú thích</div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>P1 - Khẩn cấp</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>P2 - Cao</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>P3 - Trung bình</span>
        </div>
        <div className="border-t pt-1.5 mt-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Đội cứu hộ sẵn sàng</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>Đội cứu hộ đang bận</span>
          </div>
        </div>
        <div className="border-t pt-1.5 mt-1.5">
          <div className="flex items-center gap-2">
            <span>🏭</span>
            <span>Kho vật tư (Depot)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span>Điểm tập kết</span>
          </div>
        </div>
        <div className="border-t pt-1.5 mt-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-300"></div>
            <span>Vị trí của tôi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
