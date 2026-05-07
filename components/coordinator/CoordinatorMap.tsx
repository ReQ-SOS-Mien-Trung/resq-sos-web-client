"use client";

import { useEffect, useState, useMemo, useRef, useCallback, memo } from "react";
import { SOSRequest, Rescuer, CoordinatorMapProps } from "@/type";
import type { DepotEntity } from "@/services/depot/type";
import type { ServiceZoneEntity } from "@/services/map/type";
import type { TeamIncidentEntity } from "@/services/team_incidents/type";
import {
  MagnifyingGlass,
  X,
  Package,
  MapPin,
  Plus,
  Minus,
  Crosshair,
  Eye,
  EyeSlash,
  FunnelSimple,
  Command,
  NavigationArrow,
  Siren,
  SquaresFour,
  UsersThree,
  WarningCircle,
  MapTrifold,
  Factory,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getServiceZoneLabelPosition,
  getServiceZoneStatBadgePositions,
} from "@/lib/coordinator-map-utils";

// Direct imports — SSR safety is handled by the parent's dynamic(() => import(...), { ssr: false })
// and the isMounted guard inside this component.
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { MapInvalidator } from "./MapInvalidator";
import { GoongLeafletLayer } from "@/components/GoongLeafletLayer";
import { FlyToHandler } from "./FlyToHandler";
import { MapZoomHandler } from "./MapZoomHandler";

type LayerFilterKey =
  | "sos"
  | "rescueTeams"
  | "teamIncidents"
  | "depots"
  | "assemblyPoints"
  | "serviceZones";

const DEFAULT_LAYER_FILTER: Record<LayerFilterKey, boolean> = {
  sos: true,
  rescueTeams: false,
  teamIncidents: false,
  depots: true,
  assemblyPoints: true,
  serviceZones: true,
};

function LayerFilterIcon({
  layerKey,
  className,
}: {
  layerKey: LayerFilterKey;
  className?: string;
}) {
  if (layerKey === "sos") {
    return <Siren size={16} weight="fill" className={className} />;
  }

  if (layerKey === "rescueTeams") {
    return <UsersThree size={16} weight="fill" className={className} />;
  }

  if (layerKey === "teamIncidents") {
    return <WarningCircle size={16} weight="fill" className={className} />;
  }

  if (layerKey === "depots") {
    return <Package size={16} weight="fill" className={className} />;
  }

  if (layerKey === "assemblyPoints") {
    return <MapPin size={16} weight="fill" className={className} />;
  }

  return <MapTrifold size={16} weight="fill" className={className} />;
}

const RouteOverlayFitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length < 2) return;
    map.fitBounds(points, {
      padding: [60, 60],
      maxZoom: 12,
    });
  }, [map, points]);

  return null;
};

const CoordinatorMap = ({
  sosRequests,
  rescuers,
  teamIncidents = [],
  selectedTeamIncident,
  depots,
  assemblyPoints = [],
  serviceZones = [],
  selectedSOS,
  selectedRescuer,
  aiDecision,
  onSOSSelect,
  onRescuerSelect,
  onTeamIncidentSelect,
  onDepotSelect,
  onAssemblyPointSelect,
  flyToLocation,
  flyToZoom,
  userLocation,
  onViewChange,
  isPickingLocation,
  onMapClick,
  panelOpen,
  routeOverlay,
  risingSOSMarkerIds = [],
}: CoordinatorMapProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFlyToLocation, setSearchFlyToLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [searchFlyToZoom, setSearchFlyToZoom] = useState<number | undefined>(
    undefined,
  );
  const [searchFilter, setSearchFilter] = useState<
    "all" | "depot" | "assemblyPoint"
  >("all");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  // Track the last selected search result name to display in input
  const [selectedSearchName, setSelectedSearchName] = useState<string | null>(
    null,
  );
  const [mapControls, setMapControls] = useState<{
    zoomIn: () => void;
    zoomOut: () => void;
    recenter: () => void;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [currentZoom, setCurrentZoom] = useState(13);
  const [layerFilter, setLayerFilter] = useState(DEFAULT_LAYER_FILTER);
  const [hideGoongPoi, setHideGoongPoi] = useState(true);
  const risingSOSMarkerIdSet = useMemo(
    () => new Set(risingSOSMarkerIds),
    [risingSOSMarkerIds],
  );

  const markerDisplayPositions = useMemo(() => {
    type MarkerSeed = {
      type: "depot" | "assemblyPoint";
      id: number;
      lat: number;
      lng: number;
    };

    const toGroupKey = (lat: number, lng: number) =>
      `${lat.toFixed(5)}:${lng.toFixed(5)}`;

    const toOffsetPosition = (
      lat: number,
      lng: number,
      index: number,
      total: number,
    ): [number, number] => {
      if (total <= 1) return [lat, lng];

      const radiusMeters = 14;
      const angle = (2 * Math.PI * index) / total;
      const dx = Math.cos(angle) * radiusMeters;
      const dy = Math.sin(angle) * radiusMeters;

      // Approximate meter-to-degree conversion; sufficient for tiny visual offsets.
      const latDelta = dy / 111_320;
      const lngDelta = dx / (111_320 * Math.cos((lat * Math.PI) / 180) || 1);

      return [lat + latDelta, lng + lngDelta];
    };

    const seeds: MarkerSeed[] = [
      ...depots.map((depot) => ({
        type: "depot" as const,
        id: depot.id,
        lat: depot.latitude,
        lng: depot.longitude,
      })),
      ...assemblyPoints.map((point) => ({
        type: "assemblyPoint" as const,
        id: point.id,
        lat: point.latitude,
        lng: point.longitude,
      })),
    ];

    const groups = new Map<string, MarkerSeed[]>();
    seeds.forEach((seed) => {
      const key = toGroupKey(seed.lat, seed.lng);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(seed);
    });

    const depotPositions = new Map<number, [number, number]>();
    const assemblyPointPositions = new Map<number, [number, number]>();

    groups.forEach((group) => {
      const sorted = [...group].sort((a, b) => {
        if (a.type === b.type) return a.id - b.id;
        return a.type === "depot" ? -1 : 1;
      });

      sorted.forEach((item, index) => {
        const position = toOffsetPosition(
          item.lat,
          item.lng,
          index,
          sorted.length,
        );
        if (item.type === "depot") {
          depotPositions.set(item.id, position);
        } else {
          assemblyPointPositions.set(item.id, position);
        }
      });
    });

    return { depotPositions, assemblyPointPositions };
  }, [depots, assemblyPoints]);

  useEffect(() => {
    // Use setTimeout to avoid React 19 strict mode warning
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => {
      clearTimeout(timer);
      // Bump key so the next mount creates a fresh MapContainer
      setMapKey((k) => k + 1);
    };
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

  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

  // Zoom threshold:
  // - < 10: service-zone overview only
  const SERVICE_ZONE_OVERVIEW_ZOOM_THRESHOLD = 10;
  const isServiceZoneOverview =
    currentZoom < SERVICE_ZONE_OVERVIEW_ZOOM_THRESHOLD;

  const visibleSOSRequests = useMemo(() => sosRequests, [sosRequests]);

  const validTeamIncidents = useMemo(
    () =>
      teamIncidents.filter(
        (incident) =>
          Number.isFinite(incident.latitude) &&
          Number.isFinite(incident.longitude) &&
          incident.hasSupportRequest === true,
      ),
    [teamIncidents],
  );

  // Hide rescue team markers that overlap/near assembly points to avoid stacked markers.
  const visibleRescuers = useMemo(() => {
    const validAssemblyPoints = assemblyPoints
      .map((point) => ({
        lat: Number(point.latitude),
        lng: Number(point.longitude),
      }))
      .filter(
        (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
      );

    if (validAssemblyPoints.length === 0) return rescuers;

    const METERS_PER_DEG_LAT = 111_320;
    const OVERLAP_DISTANCE_METERS = 30;
    const overlapDistanceSquared = OVERLAP_DISTANCE_METERS ** 2;

    const isNearAssemblyPoint = (
      rescuerLat: number,
      rescuerLng: number,
      assemblyLat: number,
      assemblyLng: number,
    ) => {
      const deltaLatMeters = (rescuerLat - assemblyLat) * METERS_PER_DEG_LAT;
      const avgLatRad = ((rescuerLat + assemblyLat) / 2) * (Math.PI / 180);
      const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos(avgLatRad);
      const safeMetersPerDegLng =
        Number.isFinite(metersPerDegLng) && Math.abs(metersPerDegLng) > 0
          ? metersPerDegLng
          : METERS_PER_DEG_LAT;
      const deltaLngMeters = (rescuerLng - assemblyLng) * safeMetersPerDegLng;

      return (
        deltaLatMeters * deltaLatMeters + deltaLngMeters * deltaLngMeters <=
        overlapDistanceSquared
      );
    };

    return rescuers.filter((rescuer) => {
      const rescuerLat = Number(rescuer.location.lat);
      const rescuerLng = Number(rescuer.location.lng);

      if (!Number.isFinite(rescuerLat) || !Number.isFinite(rescuerLng)) {
        return true;
      }

      return !validAssemblyPoints.some((point) =>
        isNearAssemblyPoint(rescuerLat, rescuerLng, point.lat, point.lng),
      );
    });
  }, [rescuers, assemblyPoints]);

  const validServiceZones = useMemo(
    () =>
      serviceZones.filter(
        (zone) =>
          (zone.coordinates ?? []).filter(
            (point) =>
              Number.isFinite(point.latitude) &&
              Number.isFinite(point.longitude),
          ).length >= 3,
      ),
    [serviceZones],
  );

  const layerOptions = useMemo(
    () => [
      {
        key: "sos" as const,
        label: "SOS",
        count: visibleSOSRequests.length,
        badgeClass:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      },
      {
        key: "depots" as const,
        label: "Kho",
        count: depots.length,
        badgeClass:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      },
      {
        key: "assemblyPoints" as const,
        label: "Điểm tập kết",
        count: assemblyPoints.length,
        badgeClass:
          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      },
      {
        key: "serviceZones" as const,
        label: "Vùng phục vụ",
        count: validServiceZones.length,
        badgeClass:
          "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
      },
    ],
    [
      assemblyPoints.length,
      depots.length,
      validServiceZones.length,
      validTeamIncidents.length,
      visibleRescuers.length,
      visibleSOSRequests.length,
    ],
  );
  const enabledLayerCount = useMemo(
    () => Object.values(layerFilter).filter(Boolean).length,
    [layerFilter],
  );
  const showServiceZones = isServiceZoneOverview && layerFilter.serviceZones;

  const toggleLayer = useCallback((layer: LayerFilterKey) => {
    setLayerFilter((current) => ({
      ...current,
      [layer]: !current[layer],
    }));
  }, []);

  const showOnlyLayer = useCallback((layer: LayerFilterKey) => {
    setLayerFilter({
      sos: false,
      depots: false,
      assemblyPoints: false,
      serviceZones: false,
      [layer]: true,
    });
  }, []);

  const setAllLayers = useCallback((value: boolean) => {
    setLayerFilter({
      sos: value,
      depots: value,
      assemblyPoints: value,
      serviceZones: value,
    });
  }, []);

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
    setSearchFlyToZoom(16); // Default search zoom
    setSelectedSearchName(result.name);
    setSearchQuery("");
    setIsSearchOpen(false);
    setIsSearchFocused(false);
    searchInputRef.current?.blur();
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
        className={cn(
          "absolute top-3 left-3 z-1000 transition-all duration-200",
          "w-[min(17rem,calc(100vw-1.5rem))] sm:w-72",
          panelOpen && "pointer-events-none opacity-0 -translate-y-1",
        )}
      >
        <div
          className={cn(
            "rounded-2xl bg-background shadow-xl border transition-all duration-200",
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

            {/* Selected search name display - shows when not actively searching */}
            {selectedSearchName && !isSearchFocused ? (
              <button
                onClick={() => {
                  setSearchQuery(selectedSearchName);
                  setIsSearchFocused(true);
                  setIsSearchOpen(true);
                  setTimeout(() => {
                    searchInputRef.current?.focus();
                    searchInputRef.current?.select();
                  }, 0);
                }}
                className="pl-10 pr-20 h-10 w-full text-left text-sm truncate text-foreground"
              >
                {selectedSearchName}
              </button>
            ) : (
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm kho, điểm tập kết..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                  if (e.target.value) {
                    setSelectedSearchName(null);
                  }
                }}
                onFocus={() => {
                  setIsSearchOpen(true);
                  setIsSearchFocused(true);
                }}
                className="pl-10 pr-20 h-10 bg-transparent border-0 shadow-none focus-visible:ring-0 rounded-2xl text-sm"
              />
            )}

            <div className="absolute right-3 flex items-center gap-1.5">
              {searchQuery || selectedSearchName ? (
                <>
                  {selectedSearchName && !isSearchFocused && (
                    <button
                      onClick={() => {
                        setSearchQuery(selectedSearchName);
                        setIsSearchFocused(true);
                        setIsSearchOpen(true);
                        setTimeout(() => {
                          searchInputRef.current?.focus();
                          searchInputRef.current?.select();
                        }, 0);
                      }}
                      className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Tìm kiếm"
                    >
                      <MagnifyingGlass size={14} weight="bold" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedSearchName(null);
                      setIsSearchOpen(false);
                      setIsSearchFocused(false);
                      searchInputRef.current?.blur();
                    }}
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X size={14} weight="bold" />
                  </button>
                </>
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
          <div className="mt-2 bg-background rounded-2xl border border-border/60 shadow-xl overflow-hidden max-h-72 overflow-y-auto">
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
          <div className="mt-2 bg-background rounded-2xl border border-border/60 shadow-xl p-6 text-center">
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

      <div
        className={cn(
          "absolute top-16 right-3 z-1000 transition-all duration-200",
          panelOpen && "pointer-events-none opacity-0 -translate-y-1",
        )}
      >
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Lớp hiển thị"
                  title="Lớp hiển thị"
                  className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background text-foreground shadow-xl transition-colors hover:bg-accent/70"
                >
                  <SquaresFour size={18} weight="fill" />
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
                    {enabledLayerCount}
                  </span>
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Mở bộ lọc lớp hiển thị
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            align="start"
            side="left"
            collisionPadding={8}
            className="w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl border border-border/60 bg-background p-3 shadow-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FunnelSimple size={14} weight="bold" />
                <span>Lớp hiển thị</span>
              </div>
              <Badge
                variant="outline"
                className="h-5 min-w-8 px-1.5 text-[10px] leading-none"
              >
                {enabledLayerCount}/{layerOptions.length}
              </Badge>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setAllLayers(true)}
                    aria-label="Hiện tất cả lớp"
                    title="Hiện tất cả lớp"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Eye size={14} weight="bold" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Hiện tất cả lớp
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setAllLayers(false)}
                    aria-label="Ẩn tất cả lớp"
                    title="Ẩn tất cả lớp"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <EyeSlash size={14} weight="bold" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Ẩn tất cả lớp
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-foreground">
                  <MapTrifold size={14} weight="fill" />
                  <span className="truncate">Nền Goong (Đã ẩn POI)</span>
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {layerOptions.map((layer) => {
                const isEnabled = layerFilter[layer.key];

                return (
                  <div
                    key={layer.key}
                    className={cn(
                      "grid w-full grid-cols-[1.75rem_minmax(2rem,1fr)_1.75rem] items-center gap-2 rounded-xl border px-2 py-1.5",
                      isEnabled
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/50 bg-muted/20",
                    )}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`${isEnabled ? "Ẩn" : "Hiện"} ${layer.label}`}
                          title={`${isEnabled ? "Ẩn" : "Hiện"} ${layer.label}`}
                          aria-pressed={isEnabled}
                          onClick={() => toggleLayer(layer.key)}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                            isEnabled
                              ? "bg-background text-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground",
                          )}
                        >
                          <LayerFilterIcon
                            layerKey={layer.key}
                            className={cn(
                              "h-4 w-4",
                              isEnabled
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          />
                          <span className="sr-only">{layer.label}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {isEnabled
                          ? `Ẩn lớp ${layer.label}`
                          : `Hiện lớp ${layer.label}`}
                      </TooltipContent>
                    </Tooltip>

                    <Badge
                      className={cn(
                        "h-6 min-w-7 justify-center px-1 py-0 text-[10px] font-semibold",
                        layer.badgeClass,
                      )}
                    >
                      {layer.count}
                    </Badge>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => showOnlyLayer(layer.key)}
                          aria-label={`Chỉ hiện ${layer.label}`}
                          title={`Chỉ hiện ${layer.label}`}
                          className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Crosshair size={12} weight="bold" />
                          <span className="sr-only">
                            Chỉ hiện {layer.label}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        Chỉ hiện lớp {layer.label}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <MapContainer
        key={mapKey}
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
        <MapInvalidator />
        <GoongLeafletLayer
          apiKey={process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || ""}
          hidePointsOfInterest={hideGoongPoi}
        />

        {/* Fly to location handler */}
        <FlyToHandler
          location={activeFlyToLocation}
          zoom={searchFlyToLocation ? searchFlyToZoom : flyToZoom}
        />

        {/* Map zoom handler - provides controls to parent */}
        <MapZoomHandler
          onMapReady={handleMapReady}
          onZoomChange={handleZoomChange}
          onViewChange={onViewChange}
        />

        {/* Map click handler for picking location */}
        <MapClickHandler
          isPickingLocation={isPickingLocation}
          onMapClick={onMapClick}
        />

        {/* Service Zone Polygons and totals */}
        {showServiceZones &&
          validServiceZones.map((zone) => (
            <ServiceZoneOverlay
              key={zone.id}
              zone={zone}
              currentZoom={currentZoom}
            />
          ))}

        {/* SOS Request Markers */}
        {!isServiceZoneOverview &&
          layerFilter.sos &&
          visibleSOSRequests.map((sos) => (
            <SOSRequestMarker
              key={sos.id}
              sos={sos}
              isSelected={selectedSOS?.id === sos.id}
              shouldRise={risingSOSMarkerIdSet.has(sos.id)}
              onClick={() => onSOSSelect(sos)}
            />
          ))}

        {/* Depot Markers */}
        {!isServiceZoneOverview &&
          layerFilter.depots &&
          depots.map((depot) => (
            <DepotMarker
              key={depot.id}
              depot={depot}
              position={
                markerDisplayPositions.depotPositions.get(depot.id) ?? [
                  depot.latitude,
                  depot.longitude,
                ]
              }
              onClick={() => onDepotSelect?.(depot)}
            />
          ))}

        {/* Assembly Point Markers */}
        {!isServiceZoneOverview &&
          layerFilter.assemblyPoints &&
          assemblyPoints.map((point) => (
            <AssemblyPointMarker
              key={point.id}
              status={point.status}
              position={
                markerDisplayPositions.assemblyPointPositions.get(point.id) ?? [
                  point.latitude,
                  point.longitude,
                ]
              }
              onClick={() => onAssemblyPointSelect?.(point)}
            />
          ))}

        {/* User Location Marker */}
        {!isServiceZoneOverview && userLocation && (
          <UserLocationMarker location={userLocation} />
        )}

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

        {/* Rescue Route Overlay (from ActivityRoutePreview) */}
        {routeOverlay && routeOverlay.length > 1 && (
          <>
            <RouteOverlayFitBounds points={routeOverlay} />
            <Polyline
              positions={routeOverlay}
              pathOptions={{
                color: "#FF6B35",
                weight: 5,
                opacity: 0.9,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Custom Zoom Controls - bottom right */}
      <div className="absolute bottom-6 right-4 z-1000 flex flex-col gap-2">
        <button
          onClick={() => mapControls?.zoomIn()}
          className="w-10 h-10 rounded-full bg-background border border-border/60 shadow-lg flex items-center justify-center text-foreground hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-150"
          title="Phóng to"
        >
          <Plus size={18} weight="bold" />
        </button>
        <button
          onClick={() => mapControls?.zoomOut()}
          className="w-10 h-10 rounded-full bg-background border border-border/60 shadow-lg flex items-center justify-center text-foreground hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-150"
          title="Thu nhỏ"
        >
          <Minus size={18} weight="bold" />
        </button>
        <div className="h-px bg-border/40 mx-2" />
        <button
          onClick={() => mapControls?.recenter()}
          className="w-10 h-10 rounded-full bg-background border border-border/60 shadow-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-150"
          title="Về trung tâm"
        >
          <Crosshair size={18} weight="bold" />
        </button>
        {userLocation && (
          <>
            <div className="h-px bg-border/40 mx-2" />
            <button
              onClick={() => {
                setSearchFlyToLocation(userLocation);
                setSearchFlyToZoom(15);
              }}
              className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 border border-blue-400/60 shadow-lg flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all duration-150"
              title="Vị trí của tôi"
            >
              <NavigationArrow size={18} weight="fill" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default memo(CoordinatorMap);

function ServiceZoneOverlay({
  zone,
  currentZoom,
}: {
  zone: ServiceZoneEntity;
  currentZoom: number;
}) {
  const positions = useMemo(
    () =>
      zone.coordinates
        .map((point) => [point.latitude, point.longitude] as [number, number])
        .filter(
          (point) => Number.isFinite(point[0]) && Number.isFinite(point[1]),
        ),
    [zone.coordinates],
  );
  const labelPosition = useMemo(
    () => getServiceZoneLabelPosition(zone),
    [zone],
  );

  // Zoom modes within service zone overview (zoom < 10):
  // - zoom < 8: show zone NAME in center
  // - zoom 8–9: show zone NAME in center + corner stat badges
  const CORNER_STATS_ZOOM = 8;
  const showCornerStats = currentZoom >= CORNER_STATS_ZOOM;
  const counts = zone.counts;

  // Compute four stat-badge anchors and clamp each one inside the polygon.
  const cornerPositions = useMemo(() => {
    return getServiceZoneStatBadgePositions(zone);
  }, [zone]);

  // Center label – always shows zone name
  const centerIcon = useMemo(() => {
    if (typeof window === "undefined" || !labelPosition) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    return L.divIcon({
      className: "custom-service-zone-marker",
      html: `
        <div style="transform:translate(-50%,-50%);display:inline-flex;align-items:center;justify-content:center;padding:5px 14px;border-radius:20px;background:rgba(14,116,144,0.92);border:2px solid rgba(255,255,255,0.95);box-shadow:0 4px 14px rgba(8,47,73,0.3);color:#fff;white-space:nowrap;font-family:system-ui,-apple-system,sans-serif;">
          <span style="font-size:14px;font-weight:700;letter-spacing:0.02em;">${zone.name}</span>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }, [labelPosition, zone.name]);

  // Corner stat badge icons
  const cornerIcons = useMemo(() => {
    if (typeof window === "undefined" || !showCornerStats || !cornerPositions)
      return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    const makeBadge = (
      emoji: string,
      label: string,
      count: number,
      bg: string,
    ) =>
      L.divIcon({
        className: "",
        html: `
          <div style="transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:16px;background:${bg};border:2px solid rgba(255,255,255,0.95);box-shadow:0 3px 12px rgba(0,0,0,0.25);color:#fff;white-space:nowrap;font-family:system-ui,-apple-system,sans-serif;">
            <span style="font-size:14px;line-height:1;">${emoji}</span>
            <span style="font-size:14px;font-weight:800;line-height:1;">${count}</span>
            <span style="font-size:14px;font-weight:800;opacity:0.92;line-height:1;">${label}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

    return {
      nw: makeBadge(
        "🚨",
        "SOS chờ",
        Number(counts.pendingSosRequestCount ?? 0),
        "rgba(239,68,68,0.88)",
      ),
      ne: makeBadge(
        "⚡",
        "Sự cố SOS",
        Number(counts.incidentSosRequestCount ?? 0),
        "rgba(249,115,22,0.88)",
      ),
      sw: makeBadge(
        "⚠️",
        "Sự cố đội",
        Number(counts.teamIncidentCount ?? 0),
        "rgba(202,138,4,0.88)",
      ),
      se: makeBadge(
        "📍",
        "TK/Kho",
        Number(counts.assemblyPointCount ?? 0) + Number(counts.depotCount ?? 0),
        "rgba(99,102,241,0.88)",
      ),
    };
  }, [showCornerStats, cornerPositions, counts]);

  if (positions.length < 3) {
    return null;
  }

  return (
    <>
      <Polygon
        positions={positions}
        pathOptions={{
          color: "#0ea5e9",
          weight: 2,
          opacity: 0.95,
          fillColor: "#38bdf8",
          fillOpacity: 0.14,
        }}
      >
        <Popup>
          <div className="space-y-2 text-sm">
            <div>
              <p className="font-semibold">{zone.name}</p>
            </div>
            <div className="space-y-1 text-muted-foreground">
              <p>SOS chờ xử lý: {counts.pendingSosRequestCount}</p>
              <p>SOS sự cố: {counts.incidentSosRequestCount}</p>
              <p>Sự cố đội: {counts.teamIncidentCount}</p>
              <p>Điểm tập kết: {counts.assemblyPointCount}</p>
              <p>Kho: {counts.depotCount}</p>
            </div>
          </div>
        </Popup>
      </Polygon>

      {/* Center label – zone name */}
      {labelPosition && centerIcon ? (
        <Marker position={labelPosition} icon={centerIcon} zIndexOffset={700} />
      ) : null}

      {/* Corner stat badges – visible when zoomed in enough */}
      {showCornerStats && cornerPositions && cornerIcons ? (
        <>
          <Marker
            position={cornerPositions.nw}
            icon={cornerIcons.nw}
            zIndexOffset={600}
          />
          <Marker
            position={cornerPositions.ne}
            icon={cornerIcons.ne}
            zIndexOffset={600}
          />
          <Marker
            position={cornerPositions.sw}
            icon={cornerIcons.sw}
            zIndexOffset={600}
          />
          <Marker
            position={cornerPositions.se}
            icon={cornerIcons.se}
            zIndexOffset={600}
          />
        </>
      ) : null}
    </>
  );
}

// SOS Request Marker Component
// SOS Request Marker Component
function SOSRequestMarker({
  sos,
  isSelected,
  shouldRise,
  onClick,
}: {
  sos: SOSRequest;
  isSelected: boolean;
  shouldRise: boolean;
  onClick: () => void;
}) {
  const priorityColors = {
    P1: "#ef4444", // red-500
    P2: "#f97316", // orange-500
    P3: "#eab308", // yellow-500
    P4: "#14b8a6", // teal-500
  };

  const color = priorityColors[sos.priority];
  const size = isSelected ? 48 : 36;
  const badgeSize = isSelected ? 38 : 28;
  const labelFontSize = isSelected ? 11 : 9.5;

  // Create custom icon using divIcon with useMemo
  const icon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    const isPending = sos.status === "PENDING";
    const sosType = (sos.sosType || "").toUpperCase();

    // Determine shape based on type
    // RELIEF (Cứu trợ) -> Circle (Tròn)
    // RESCUE (Cứu hộ) -> Triangle (Tam giác)
    // BOTH (Tổng hợp) -> Hexagon (Lục giác)
    const shape =
      sosType === "RESCUE"
        ? "triangle"
        : sosType === "BOTH"
          ? "hexagon"
          : "circle";

    const strokeWidth = isSelected ? 5 : 7;
    const textY = shape === "triangle" ? 72 : 58;

    // SVG definition for shapes
    const shapeSvg =
      shape === "triangle"
        ? `<polygon points="50,5 96,92 4,92" fill="${color}" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linejoin="round" />`
        : shape === "hexagon"
          ? `<polygon points="25,5 75,5 100,50 75,95 25,95 0,50" fill="${color}" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linejoin="round" />`
          : `<circle cx="50" cy="50" r="45" fill="${color}" stroke="#ffffff" stroke-width="${strokeWidth}" />`;

    return L.divIcon({
      className: "custom-sos-marker",
      html: `
        <div class="${shouldRise ? "map-marker-rise" : ""}" style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;z-index:${isSelected ? 1000 : 1};">
          ${
            isSelected
              ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:${color};opacity:0.2;animation:sosSelectedPulse 2s ease-out infinite;"></div>
                 <div style="position:absolute;inset:-12px;border-radius:50%;border:2px dashed ${color};opacity:0.4;animation:sosSelectedRotate 10s linear infinite;"></div>`
              : ""
          }
          ${
            isPending && !isSelected
              ? `<div class="absolute inset-0 rounded-full animate-ping opacity-75" style="background-color: ${color};"></div>`
              : ""
          }
          <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${badgeSize}px;height:${badgeSize}px;transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <svg width="${badgeSize}" height="${badgeSize}" viewBox="0 0 100 100" style="overflow:visible;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              ${shapeSvg}
              <text x="50" y="${textY}" fill="#ffffff" font-family="Arial, sans-serif" font-size="${labelFontSize * 3.5}px" font-weight="900" text-anchor="middle" letter-spacing="-0.05em">SOS</text>
            </svg>
          </div>
          ${
            isSelected
              ? `<div style="position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #ffffff;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.2));"></div>`
              : ""
          }
        </div>
        <style>
          @keyframes sosSelectedPulse {
            0% { transform:scale(0.8); opacity:0.4; }
            70% { transform:scale(1.3); opacity:0; }
            100% { transform:scale(1.3); opacity:0; }
          }
          @keyframes sosSelectedRotate {
            from { transform:rotate(0deg); }
            to { transform:rotate(360deg); }
          }
        </style>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    badgeSize,
    color,
    labelFontSize,
    size,
    sos.priority,
    sos.status,
    sos.sosType,
    isSelected,
    shouldRise,
  ]);

  if (!icon) return null;

  return (
    <Marker
      position={[sos.location.lat, sos.location.lng]}
      icon={icon}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{ click: onClick }}
    />
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
    />
  );
}

// Depot Marker Component
function DepotMarker({
  depot,
  position,
  onClick,
}: {
  depot: DepotEntity;
  position: [number, number];
  onClick?: () => void;
}) {
  const statusColors = {
    Available: "#22c55e", // green-500
    Full: "#f97316", // orange-500
    PendingAssignment: "#3b82f6", // blue-500
    Closed: "#ef4444", // red-500
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
            📦
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
      position={position}
      icon={iconEl}
      eventHandlers={{ click: () => onClick?.() }}
    />
  );
}

// Assembly Point Marker Component
function AssemblyPointMarker({
  status,
  position,
  onClick,
}: {
  status?: string | null;
  position: [number, number];
  onClick?: () => void;
}) {
  const color =
    status === "Available"
      ? "#22c55e"
      : status === "PendingUnavailable"
        ? "#f97316"
        : status === "Unavailable"
          ? "#f59e0b"
          : status === "Closed"
            ? "#ef4444"
            : "#6366f1";

  const iconEl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    return L.divIcon({
      className: "custom-assembly-point-marker",
      html: `
        <div class="relative flex items-center justify-center" style="width: 36px; height: 36px;">
          <div class="rounded-lg flex items-center justify-center text-lg bg-purple-50 border-2"
               style="width: 36px; height: 36px; border-color: ${color}; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
            📍
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
      position={position}
      icon={iconEl}
      zIndexOffset={150}
      eventHandlers={{ click: () => onClick?.() }}
    />
  );
}

function TeamIncidentMarker({
  incident,
  isSelected,
  onClick,
}: {
  incident: TeamIncidentEntity;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColors: Record<string, string> = {
    Reported: "#ef4444",
    Acknowledged: "#f97316",
    Resolved: "#22c55e",
  };

  const markerColor = statusColors[incident.status] ?? "#64748b";

  const markerSize = isSelected ? 40 : 34;
  const iconEl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    return L.divIcon({
      className: "custom-team-incident-marker",
      html: `
        <div class="relative flex items-center justify-center" style="width: ${markerSize}px; height: ${markerSize}px;">
          <div class="rounded-full flex items-center justify-center text-sm font-bold text-white" 
               style="width: ${markerSize - 2}px; height: ${markerSize - 2}px; background-color: ${markerColor}; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            !
          </div>
        </div>
      `,
      iconSize: [markerSize, markerSize],
      iconAnchor: [markerSize / 2, markerSize / 2],
    });
  }, [markerColor, markerSize]);

  if (!iconEl) return null;

  return (
    <Marker
      position={[incident.latitude, incident.longitude]}
      icon={iconEl}
      zIndexOffset={950}
      eventHandlers={{ click: onClick }}
    />
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

  return <Marker position={[location.lat, location.lng]} icon={icon} />;
}

// Map Click Handler Component for location picking
function MapClickHandler({
  isPickingLocation,
  onMapClick,
}: {
  isPickingLocation?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click: (e) => {
      if (isPickingLocation && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  useEffect(() => {
    if (isPickingLocation) {
      map.getContainer().style.cursor = "crosshair";
    } else {
      map.getContainer().style.cursor = "";
    }
  }, [isPickingLocation, map]);

  return null;
}
