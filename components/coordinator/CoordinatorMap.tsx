"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { SOSRequest, Rescuer, CoordinatorMapProps } from "@/type";
import type { DepotEntity } from "@/services/depot/type";
import type { AssemblyPointEntity } from "@/services/assembly_points/type";
import type { SOSClusterEntity } from "@/services/sos_cluster/type";
import type { TeamIncidentEntity } from "@/services/team_incidents/type";
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
import { PRIORITY_ORDER } from "@/lib/priority";

// Direct imports — SSR safety is handled by the parent's dynamic(() => import(...), { ssr: false })
// and the isMounted guard inside this component.
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { FlyToHandler } from "./FlyToHandler";
import { MapZoomHandler } from "./MapZoomHandler";

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
  clusters = [],
  autoClusters = [],
  selectedSOS,
  selectedRescuer,
  aiDecision,
  onSOSSelect,
  onRescuerSelect,
  onTeamIncidentSelect,
  onDepotSelect,
  onAssemblyPointSelect,
  onClusterSelect,
  flyToLocation,
  flyToZoom,
  userLocation,
  onViewChange,
  isPickingLocation,
  onMapClick,
  routeOverlay,
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

  // Zoom threshold: >= 12 = zoomed in (show individual SOS), < 12 = zoomed out (show clusters)
  const CLUSTER_ZOOM_THRESHOLD = 12;
  const isZoomedIn = currentZoom >= CLUSTER_ZOOM_THRESHOLD;

  // Build a set of SOS IDs that belong to a backend cluster
  const clusteredSOSIds = useMemo(() => {
    const ids = new Set<string>();
    clusters.forEach((c) =>
      c.sosRequestIds.forEach((id) => ids.add(String(id))),
    );
    return ids;
  }, [clusters]);

  // Build a set of SOS IDs that belong to an auto-cluster
  const autoClusteredSOSIds = useMemo(() => {
    const ids = new Set<string>();
    autoClusters.forEach((group) => group.forEach((s) => ids.add(s.id)));
    return ids;
  }, [autoClusters]);

  // When zoomed in: show all SOS. When zoomed out: hide SOS that belong to a backend or auto cluster.
  const visibleSOSRequests = useMemo(() => {
    if (isZoomedIn) return sosRequests;
    return sosRequests.filter(
      (s) => !clusteredSOSIds.has(s.id) && !autoClusteredSOSIds.has(s.id),
    );
  }, [sosRequests, isZoomedIn, clusteredSOSIds, autoClusteredSOSIds]);

  const validTeamIncidents = useMemo(
    () =>
      teamIncidents.filter(
        (incident) =>
          Number.isFinite(incident.latitude) &&
          Number.isFinite(incident.longitude),
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

  // When zoomed in: hide clusters. When zoomed out: merge nearby clusters based on zoom.
  type ClusterWithMergeFlag = SOSClusterEntity & { _isMerged: boolean };
  const visibleClusters = useMemo((): ClusterWithMergeFlag[] => {
    if (isZoomedIn) return [];
    if (clusters.length <= 1)
      return clusters.map((c) => ({ ...c, _isMerged: false }));

    // Merge radius grows as zoom decreases (further out = bigger merge radius)
    // zoom 11 → ~15km, zoom 10 → ~30km, zoom 9 → ~60km, zoom 8 → ~120km ...
    const mergeRadiusKm =
      10 * Math.pow(2, CLUSTER_ZOOM_THRESHOLD - 1 - currentZoom);

    const haversine = (
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number,
    ) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const n = clusters.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (x: number): number =>
      parent[x] === x ? x : (parent[x] = find(parent[x]));
    const union = (a: number, b: number) => {
      parent[find(a)] = find(b);
    };

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = haversine(
          clusters[i].centerLatitude,
          clusters[i].centerLongitude,
          clusters[j].centerLatitude,
          clusters[j].centerLongitude,
        );
        if (d <= mergeRadiusKm) union(i, j);
      }
    }

    const groups = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(i);
    }

    // Merge groups into virtual clusters
    return Array.from(groups.values()).map((indices) => {
      if (indices.length === 1)
        return { ...clusters[indices[0]], _isMerged: false as const };
      // Weighted center by SOS count
      let totalSOS = 0;
      let latSum = 0;
      let lngSum = 0;
      let allIds: number[] = [];
      let highestSeverity = "Low";
      const severityOrder: Record<string, number> = {
        Low: 0,
        Medium: 1,
        High: 2,
        Critical: 3,
      };
      let totalVictims = 0;

      for (const idx of indices) {
        const c = clusters[idx];
        const count = c.sosRequestCount || c.sosRequestIds.length;
        totalSOS += count;
        latSum += c.centerLatitude * count;
        lngSum += c.centerLongitude * count;
        allIds = allIds.concat(c.sosRequestIds);
        totalVictims += c.victimEstimated ?? 0;
        if (
          (severityOrder[c.severityLevel] ?? 0) >
          (severityOrder[highestSeverity] ?? 0)
        ) {
          highestSeverity = c.severityLevel;
        }
      }

      // Return a merged virtual cluster (uses first cluster's id as base)
      return {
        ...clusters[indices[0]],
        centerLatitude:
          totalSOS > 0
            ? latSum / totalSOS
            : clusters[indices[0]].centerLatitude,
        centerLongitude:
          totalSOS > 0
            ? lngSum / totalSOS
            : clusters[indices[0]].centerLongitude,
        sosRequestCount: totalSOS,
        sosRequestIds: allIds,
        severityLevel: highestSeverity as (typeof clusters)[0]["severityLevel"],
        victimEstimated: totalVictims || null,
        _isMerged: true as const,
      };
    });
  }, [clusters, isZoomedIn, currentZoom, CLUSTER_ZOOM_THRESHOLD]);

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
                className="pl-10 pr-20 h-11 w-full text-left text-sm truncate text-foreground"
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
                className="pl-10 pr-20 h-11 bg-transparent border-0 shadow-none focus-visible:ring-0 rounded-2xl text-sm"
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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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

        {/* SOS Request Markers */}
        {visibleSOSRequests.map((sos) => (
          <SOSRequestMarker
            key={sos.id}
            sos={sos}
            isSelected={selectedSOS?.id === sos.id}
            onClick={() => onSOSSelect(sos)}
          />
        ))}

        {/* Rescuer Markers */}
        {visibleRescuers.map((rescuer) => (
          <RescuerMarker
            key={rescuer.id}
            rescuer={rescuer}
            isSelected={selectedRescuer?.id === rescuer.id}
            onClick={() => onRescuerSelect(rescuer)}
          />
        ))}

        {/* Team Incident Markers */}
        {validTeamIncidents.map((incident) => (
          <TeamIncidentMarker
            key={incident.incidentId}
            incident={incident}
            isSelected={
              selectedTeamIncident?.incidentId === incident.incidentId
            }
            onClick={() => onTeamIncidentSelect?.(incident)}
          />
        ))}

        {/* Depot Markers */}
        {depots.map((depot) => (
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
        {assemblyPoints.map((point) => (
          <AssemblyPointMarker
            key={point.id}
            assemblyPoint={point}
            position={
              markerDisplayPositions.assemblyPointPositions.get(point.id) ?? [
                point.latitude,
                point.longitude,
              ]
            }
            onClick={() => onAssemblyPointSelect?.(point)}
          />
        ))}

        {/* Auto-Cluster Markers (client-side suggested clusters) */}
        {!isZoomedIn &&
          autoClusters.map((group, idx) => (
            <AutoClusterMarker
              key={`auto-cluster-${idx}`}
              group={group}
              index={idx}
              onClick={() => {
                // Fly to the auto-cluster center on click
                const lat =
                  group.reduce((sum, s) => sum + s.location.lat, 0) /
                  group.length;
                const lng =
                  group.reduce((sum, s) => sum + s.location.lng, 0) /
                  group.length;
                setSearchFlyToLocation({ lat, lng });
                setSearchFlyToZoom(
                  Math.max(currentZoom + 2, CLUSTER_ZOOM_THRESHOLD),
                );
              }}
            />
          ))}

        {/* Cluster Markers */}
        {visibleClusters.map((cluster) => (
          <ClusterMarker
            key={`cluster-${cluster.id}-${cluster._isMerged}`}
            cluster={cluster}
            isMerged={cluster._isMerged}
            onClick={() => {
              if (cluster._isMerged) {
                // For virtual merged clusters, just fly/zoom in to break them apart
                const targetZoom = Math.max(
                  currentZoom + 2,
                  CLUSTER_ZOOM_THRESHOLD,
                );
                setSearchFlyToLocation({
                  lat: Number(cluster.centerLatitude),
                  lng: Number(cluster.centerLongitude),
                });
                setSearchFlyToZoom(targetZoom);
              } else {
                onClusterSelect?.(cluster);
              }
            }}
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

      {/* Map Legend */}
      <MapLegend />
    </div>
  );
};

export default CoordinatorMap;

// SOS Request Marker Component
function SOSRequestMarker({
  sos,
  isSelected,
  onClick,
}: {
  sos: SOSRequest;
  isSelected: boolean;
  onClick: () => void;
}) {
  const priorityColors = {
    P1: "#ef4444", // red-500
    P2: "#f97316", // orange-500
    P3: "#eab308", // yellow-500
    P4: "#14b8a6", // teal-500
  };

  const color = priorityColors[sos.priority];
  const size = isSelected ? 38 : 28;

  // Create custom icon using divIcon with useMemo
  const icon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    return L.divIcon({
      className: "custom-sos-marker",
      html: `
        <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
          ${sos.status === "PENDING" ? `<div class="absolute inset-0 rounded-full animate-ping opacity-75" style="background-color: ${color};"></div>` : ""}
          <div class="relative rounded-full flex items-center justify-center text-white font-bold text-[10px]" 
               style="width: ${size - 6}px; height: ${
                 size - 6
               }px; background-color: ${color}; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            SOS
          </div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sos.priority, sos.status, isSelected]);

  if (!icon) return null;

  return (
    <Marker
      position={[sos.location.lat, sos.location.lng]}
      icon={icon}
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
  assemblyPoint,
  position,
  onClick,
}: {
  assemblyPoint: AssemblyPointEntity;
  position: [number, number];
  onClick?: () => void;
}) {
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
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }, []);

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
  }, [isSelected, markerColor, markerSize]);

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

// Auto-Cluster Marker – shows client-side suggested clusters (dashed border, muted)
function AutoClusterMarker({
  group,
  index,
  onClick,
}: {
  group: SOSRequest[];
  index: number;
  onClick?: () => void;
}) {
  const count = group.length;
  const lat = group.reduce((sum, s) => sum + s.location.lat, 0) / count;
  const lng = group.reduce((sum, s) => sum + s.location.lng, 0) / count;

  // Use highest priority in group for color
  const priorityOrder = PRIORITY_ORDER;
  const highestPriority = group.reduce(
    (best, s) =>
      priorityOrder[s.priority] < priorityOrder[best] ? s.priority : best,
    group[0].priority,
  );
  const colors: Record<string, string> = {
    P1: "#ef4444",
    P2: "#f97316",
    P3: "#eab308",
    P4: "#14b8a6",
  };
  const color = colors[highestPriority] || "#f97316";

  const size = Math.min(52 + count * 4, 72);
  const ringSize = size + 20;

  const iconEl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    return L.divIcon({
      className: "custom-auto-cluster-marker",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${ringSize}px;height:${ringSize}px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.12;animation:clusterPulse 2.5s ease-out infinite;"></div>
          <div style="position:absolute;inset:${(ringSize - size) / 2}px;border-radius:50%;background:${color}11;border:2px dashed ${color}66;"></div>
          <div style="position:relative;width:${size - 4}px;height:${size - 4}px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                      background:linear-gradient(145deg, ${color}dd, ${color}99);border:2px dashed white;
                      box-shadow:0 2px 10px rgba(0,0,0,0.25), 0 0 0 2px ${color}33;">
            <span style="font-size:15px;font-weight:800;color:white;line-height:1;">#${index + 1}</span>
            <span style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.9);line-height:1;margin-top:1px;">${count} SOS</span>
          </div>
        </div>
      `,
      iconSize: [ringSize, ringSize],
      iconAnchor: [ringSize / 2, ringSize / 2],
    });
  }, [count, index, color, size, ringSize]);

  if (!iconEl) return null;

  return (
    <Marker
      position={[lat, lng]}
      icon={iconEl}
      zIndexOffset={900}
      eventHandlers={{ click: () => onClick?.() }}
    />
  );
}

// Cluster Marker Component – shows grouped SOS clusters on the map
function ClusterMarker({
  cluster,
  isMerged = false,
  onClick,
}: {
  cluster: SOSClusterEntity;
  isMerged?: boolean;
  onClick?: () => void;
}) {
  const severityColors: Record<string, string> = {
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#eab308",
    Low: "#14b8a6",
  };

  const severityLabels: Record<string, string> = {
    Critical: "Nghiêm trọng",
    High: "Cao",
    Medium: "Trung bình",
    Low: "Thấp",
  };

  const color = severityColors[cluster.severityLevel] || "#14b8a6";
  const label = severityLabels[cluster.severityLevel] || cluster.severityLevel;
  // Scale size based on SOS count for visual weight
  const baseSize = 56;
  const size = Math.min(baseSize + cluster.sosRequestCount * 4, 80);

  const iconEl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    // Outer ring width for the pulsing effect
    const ringSize = size + 20;

    return L.divIcon({
      className: "custom-cluster-marker",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${ringSize}px;height:${ringSize}px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.18;animation:clusterPulse 2s ease-out infinite;"></div>
          <div style="position:absolute;inset:${(ringSize - size) / 2}px;border-radius:50%;background:${color}22;border:2px solid ${color}55;"></div>
          <div style="position:relative;width:${size - 4}px;height:${size - 4}px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;
                      background:linear-gradient(145deg, ${color}, ${color}cc);border:3px solid white;
                      box-shadow:0 3px 14px rgba(0,0,0,0.35), 0 0 0 2px ${color}44;">
            <span style="font-size:${isMerged ? 18 : 15}px;font-weight:800;color:white;line-height:1;">${isMerged ? cluster.sosRequestCount : `#${cluster.id}`}</span>
            <span style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.9);line-height:1;margin-top:1px;">${isMerged ? "SOS" : `${cluster.sosRequestCount} SOS`}</span>
          </div>
        </div>
        <style>
          @keyframes clusterPulse {
            0% { transform:scale(0.85); opacity:0.25; }
            70% { transform:scale(1.15); opacity:0; }
            100% { transform:scale(1.15); opacity:0; }
          }
        </style>
      `,
      iconSize: [ringSize, ringSize],
      iconAnchor: [ringSize / 2, ringSize / 2],
    });
  }, [
    cluster.severityLevel,
    cluster.sosRequestCount,
    cluster.id,
    isMerged,
    color,
    size,
  ]);

  if (!iconEl) return null;

  return (
    <Marker
      position={[cluster.centerLatitude, cluster.centerLongitude]}
      icon={iconEl}
      zIndexOffset={1000}
      eventHandlers={{ click: () => onClick?.() }}
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

// Map Legend Component
function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[400] bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-3">
      <div className="text-xs font-semibold mb-2">Chú thích</div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>P1 - Rất nghiêm trọng</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>P2 - Nghiêm trọng</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>P3 - Trung bình</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-teal-500"></div>
          <span>P4 - Thấp</span>
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
            <span>📦</span>
            <span>Kho vật tư (Depot)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span>Điểm tập kết</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Sự cố đội cứu hộ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500 ring-2 ring-teal-300"></div>
            <span>Cụm SOS đã gom</span>
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
