"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { RescuePlanPanelProps } from "@/type";
import polylineDecode from "@mapbox/polyline";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import {
  activityTypeConfig,
  resourceTypeIcons,
  severityConfig,
} from "@/lib/constants";
import { PRIORITY_BADGE_VARIANT, PRIORITY_LABELS } from "@/lib/priority";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateMission,
  useMissions,
  useActivityRoute,
} from "@/services/mission/hooks";
import { getActivityRoute } from "@/services/mission/api";
import type {
  MissionActivity,
  MissionEntity,
  RouteVehicle,
} from "@/services/mission/type";
import {
  useAiMissionStream,
  useMissionSuggestions,
} from "@/services/sos_cluster/hooks";
import {
  ClusterSuggestedActivity,
  ClusterActivityType,
  ClusterSupplyCollection,
  MissionSuggestionEntity,
} from "@/services/sos_cluster/type";
import { useMyDepotInventory } from "@/services/inventory/hooks";
import { useSOSRequestAnalysis } from "@/services/sos_request/hooks";
import { SOSRequest } from "@/type";
import {
  X,
  Rocket,
  Clock,
  CheckCircle,
  Lightning,
  Package,
  Warning,
  ShieldCheck,
  ListChecks,
  Cube,
  MapPin,
  TreeStructure,
  ArrowsClockwise,
  ClockCounterClockwise,
  CircleNotch,
  CaretDown,
  CaretUp,
  Storefront,
  Info,
  PencilSimpleLine,
  Trash,
  Plus,
  FloppyDisk,
  DotsSixVertical,
  Path,
  NavigationArrow,
  PaperPlaneTilt,
} from "@phosphor-icons/react";

// Extract lat/lng from activity description text
// Matches patterns like "17.214, 106.785" or "17.2195,106.792"
const COORD_REGEX = /(\d{1,2}\.\d{2,6})[,\s]\s*(\d{2,3}\.\d{2,6})/;
const extractCoordsFromDescription = (
  desc: string,
): { lat: number; lng: number } | null => {
  const match = desc.match(COORD_REGEX);
  if (!match) return null;
  const a = parseFloat(match[1]);
  const b = parseFloat(match[2]);
  // Vietnam latitude ~8-24, longitude ~100-115
  if (a >= 8 && a <= 24 && b >= 100 && b <= 115) return { lat: a, lng: b };
  if (b >= 8 && b <= 24 && a >= 100 && a <= 115) return { lat: b, lng: a };
  return null;
};

const RoutePreviewFitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length < 2) return;
    map.fitBounds(points, {
      padding: [30, 30],
      maxZoom: 15,
    });
  }, [map, points]);

  return null;
};

const RoutePreviewMap = ({
  points,
  origin,
  destination,
}: {
  points: [number, number][];
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}) => {
  return (
    <div className="h-72 overflow-hidden rounded-lg border bg-background">
      <MapContainer
        center={points[0]}
        zoom={10}
        scrollWheelZoom={true}
        dragging={true}
        zoomControl={true}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RoutePreviewFitBounds points={points} />
        <Polyline
          positions={points}
          pathOptions={{
            color: "#FF6B35",
            weight: 5,
            opacity: 0.92,
            lineJoin: "round",
            lineCap: "round",
          }}
        />
        <CircleMarker
          center={[origin.lat, origin.lng]}
          radius={7}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#16a34a",
            fillOpacity: 1,
          }}
        />
        <CircleMarker
          center={[destination.lat, destination.lng]}
          radius={7}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#dc2626",
            fillOpacity: 1,
          }}
        />
      </MapContainer>
    </div>
  );
};

const SOSRequestSidebarCard = ({ sos }: { sos: SOSRequest }) => {
  const {
    data: analysisData,
    isLoading,
    isError,
    error,
  } = useSOSRequestAnalysis(Number(sos.id), {
    enabled: !!sos.id && !isNaN(Number(sos.id)),
  });

  const ruleScore = analysisData?.ruleEvaluation?.totalScore;

  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 bg-card",
        sos.priority === "P1"
          ? "border-red-200 dark:border-red-800/40"
          : sos.priority === "P2"
            ? "border-orange-200 dark:border-orange-800/40"
            : sos.priority === "P3"
              ? "border-yellow-200 dark:border-yellow-800/40"
              : "border-teal-200 dark:border-teal-800/40",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <MapPin
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            sos.priority === "P1"
              ? "text-red-500"
              : sos.priority === "P2"
                ? "text-orange-500"
                : sos.priority === "P3"
                  ? "text-yellow-500"
                  : "text-teal-500",
          )}
          weight="fill"
        />
        <span className="text-xs font-bold truncate">SOS #{sos.id}</span>

        {isLoading && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 h-3.5 ml-1 animate-pulse border-blue-200 bg-blue-50 text-blue-600"
          >
            Đang tải điểm...
          </Badge>
        )}

        {isError && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 h-3.5 ml-1 border-red-200 bg-red-50 text-red-600"
            title={error?.message}
          >
            Lỗi tải
          </Badge>
        )}

        {ruleScore !== undefined && !isLoading && !isError && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 h-3.5 ml-1 border-primary/20 bg-primary/5 text-primary"
          >
            Điểm: {ruleScore.toFixed(1)}
          </Badge>
        )}
        <Badge
          variant={PRIORITY_BADGE_VARIANT[sos.priority]}
          className="text-[9px] px-1 h-3.5 ml-auto shrink-0"
        >
          {PRIORITY_LABELS[sos.priority]}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
        {sos.message}
      </p>
    </div>
  );
};

const SOSGroupHeader = ({
  matchedSOS,
  groupActivitiesLength,
}: {
  matchedSOS: SOSRequest;
  groupActivitiesLength: number;
}) => {
  const {
    data: analysisData,
    isLoading,
    isError,
  } = useSOSRequestAnalysis(Number(matchedSOS.id), {
    enabled: !!matchedSOS.id && !isNaN(Number(matchedSOS.id)),
  });
  const ruleScore = analysisData?.ruleEvaluation?.totalScore;

  return (
    <>
      <div
        className={cn(
          "p-1.5 rounded-lg",
          matchedSOS.priority === "P1"
            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
            : matchedSOS.priority === "P2"
              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
              : matchedSOS.priority === "P3"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
        )}
      >
        <MapPin className="h-4 w-4" weight="fill" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate">SOS #{matchedSOS.id}</p>
          {isLoading && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 h-4 animate-pulse"
            >
              ...
            </Badge>
          )}
          {ruleScore !== undefined && !isLoading && !isError && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 h-4 border-primary/20 bg-primary/5 text-primary"
            >
              Điểm: {ruleScore.toFixed(1)}
            </Badge>
          )}
          <Badge
            variant={PRIORITY_BADGE_VARIANT[matchedSOS.priority]}
            className="text-[10px] px-1.5 h-4"
          >
            {PRIORITY_LABELS[matchedSOS.priority]}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
          {matchedSOS.message}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
        {groupActivitiesLength} bước
      </Badge>
    </>
  );
};

const DepotInventoryCard = ({
  depotId,
  depotName,
  depotAddress,
  isDraggable,
}: {
  depotId: number;
  depotName: string;
  depotAddress: string | null;
  isDraggable: boolean;
}) => {
  const { data, isLoading } = useMyDepotInventory({
    pageSize: 50,
  });

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-2 bg-amber-50/50 dark:bg-amber-900/10 border-b">
        <Storefront className="h-3.5 w-3.5 text-amber-600" weight="fill" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold truncate">{depotName}</p>
          {depotAddress && (
            <p className="text-[10px] text-muted-foreground truncate">
              {depotAddress}
            </p>
          )}
        </div>
      </div>
      <div className="p-2 space-y-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))
        ) : data?.items && data.items.length > 0 ? (
          data.items
            .filter((item) => item.availableQuantity > 0)
            .map((item) => (
              <div
                key={item.reliefItemId}
                draggable={isDraggable}
                onDragStart={
                  isDraggable
                    ? (e) => {
                        e.dataTransfer.setData(
                          "application/inventory-item",
                          JSON.stringify({
                            itemId: item.reliefItemId,
                            itemName: item.reliefItemName,
                            availableQuantity: item.availableQuantity,
                            categoryName: item.categoryName,
                          }),
                        );
                        e.dataTransfer.effectAllowed = "copy";
                      }
                    : undefined
                }
                className={cn(
                  "flex items-center gap-2 p-1.5 rounded border bg-background transition-colors",
                  isDraggable
                    ? "hover:bg-accent/30 cursor-grab active:cursor-grabbing"
                    : "cursor-default",
                )}
              >
                <Package className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium truncate">
                    {item.reliefItemName}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {item.categoryName}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1 shrink-0 font-bold"
                >
                  {item.availableQuantity}
                </Badge>
              </div>
            ))
        ) : (
          <p className="text-[10px] text-muted-foreground text-center py-2">
            Kho trống
          </p>
        )}
      </div>
    </div>
  );
};

// ── Route preview for an activity ──
const ActivityRoutePreview = ({
  missionId,
  activityId,
  activityLat,
  activityLng,
  onShowRoute,
}: {
  missionId: number;
  activityId: number;
  activityLat: number;
  activityLng: number;
  onShowRoute?: (coords: [number, number][]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [vehicle, setVehicle] = useState<"bike" | "car" | "hd">("bike");
  // originCoords = vị trí hiện tại của coordinator (KHÔNG phải tọa độ đích)
  const [originCoords, setOriginCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    const existingLink = document.querySelector('link[href*="leaflet.css"]');
    if (existingLink) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);

    return () => {
      const linkToRemove = document.querySelector('link[href*="leaflet.css"]');
      if (linkToRemove) {
        document.head.removeChild(linkToRemove);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || originCoords) return;
    if (!navigator.geolocation) {
      // Fallback: trung tâm Miền Trung (Huế)
      setOriginCoords({ lat: 16.4637, lng: 107.5909 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        console.log("[ActivityRoutePreview] Origin from geolocation:", loc);
        setOriginCoords(loc);
        setGeoError(false);
      },
      (err) => {
        console.warn(
          "[ActivityRoutePreview] Geolocation failed:",
          err.message,
          "— using fallback Hue",
        );
        // Fallback khi từ chối quyền hoặc timeout
        setOriginCoords({ lat: 16.4637, lng: 107.5909 });
        setGeoError(true);
      },
      { timeout: 5000, maximumAge: 30_000 },
    );
  }, [open, originCoords]);

  const { data, isLoading, isError } = useActivityRoute(
    open && originCoords
      ? {
          missionId,
          activityId,
          originLat: originCoords.lat,
          originLng: originCoords.lng,
          vehicle,
        }
      : null,
    { enabled: open && !!originCoords },
  );

  const decodedRoutePoints = useMemo(() => {
    if (!data?.route?.overviewPolyline) return [] as [number, number][];
    return polylineDecode.decode(data.route.overviewPolyline) as [
      number,
      number,
    ][];
  }, [data]);

  // When route data arrives, decode the polyline and push to map
  useEffect(() => {
    if (decodedRoutePoints.length > 1 && onShowRoute) {
      onShowRoute(decodedRoutePoints);
    }
  }, [decodedRoutePoints, onShowRoute]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline mt-1"
      >
        <Path className="h-3 w-3" weight="bold" />
        Xem lộ trình
      </button>
    );
  }

  return (
    <div className="mt-1.5 rounded-lg border bg-muted/30 p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <NavigationArrow className="h-3 w-3" weight="fill" />
          Lộ trình
        </span>
        <div className="flex items-center gap-1.5">
          {/* Vehicle selector */}
          <div className="flex items-center gap-0.5 rounded border bg-background overflow-hidden">
            {(
              [
                { key: "bike", label: "Xe máy" },
                { key: "car", label: "Ô tô" },
                { key: "hd", label: "Xe tải" },
              ] as const
            ).map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVehicle(v.key)}
                className={cn(
                  "px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                  vehicle === v.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      {/* Chưa có vị trí GPS — đang lấy */}
      {!originCoords && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1 animate-pulse">
          <CircleNotch className="h-3 w-3 animate-spin" />
          Đang lấy vị trí hiện tại...
        </p>
      )}
      {/* Dùng vị trí mặc định nếu GPS bị từ chối */}
      {geoError && (
        <p className="text-[10px] text-orange-500 flex items-center gap-1">
          <Warning className="h-3 w-3" weight="fill" />
          Dùng vị trí mặc định (Huế) — hãy cấp quyền địa điểm để chính xác hơn
        </p>
      )}
      {(isLoading || (!originCoords && open)) && (
        <div className="space-y-1">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      )}
      {isError && (
        <p className="text-[10px] text-red-500">Không thể tải lộ trình</p>
      )}
      {data?.route && (
        <>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="font-bold text-primary">
              {data.route.totalDistanceText}
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {data.route.totalDurationText}
            </span>
            {data.route.summary && (
              <span className="text-muted-foreground truncate">
                via {data.route.summary}
              </span>
            )}
          </div>
          {originCoords && decodedRoutePoints.length > 1 && (
            <RoutePreviewMap
              points={decodedRoutePoints}
              origin={originCoords}
              destination={{ lat: activityLat, lng: activityLng }}
            />
          )}
        </>
      )}
      {data && !data.route && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">
            Không tìm được tuyến đường bằng{" "}
            <strong>
              {vehicle === "bike"
                ? "xe máy"
                : vehicle === "car"
                  ? "ô tô"
                  : "xe tải"}
            </strong>
          </p>
          <p className="text-[9px] text-muted-foreground/70">
            Điễm đến có thể nằm trong khu vực không có đường. Hãy thử đổi loại
            phương tiện khác.
          </p>
        </div>
      )}
    </div>
  );
};

// ── Consolidated route preview for an entire mission ──
// A unique location derived by deduplicating consecutive activities with the same coords
interface UniqueWaypoint {
  lat: number;
  lng: number;
  activities: MissionActivity[];
}

interface RouteSegment {
  index: number;
  waypoint: UniqueWaypoint;
  points: [number, number][];
  distance: string;
  duration: string;
  distanceMeters: number;
  durationSeconds: number;
}

const COORD_EPSILON = 0.0005; // ~55m tolerance for "same location"
const HUE_DEFAULT_ORIGIN = { lat: 16.4637, lng: 107.5909 };
const RESCUE_ROUTE_ACTIVITY_TYPES = new Set([
  "COLLECT_SUPPLIES",
  "RESCUE",
  "MEDICAL_AID",
  "EVACUATE",
]);
const SOS_TARGET_REGEX = /SOS\s*#?\s*(\d+)/i;

interface WaypointMeta {
  labels: string[];
  hasSOS: boolean;
  hasDepot: boolean;
}

function getSupplyDisplayName(supply: {
  itemName?: string | null;
  itemId?: number | null;
}): string {
  const name =
    typeof supply.itemName === "string" ? supply.itemName.trim() : "";
  if (name) return name;
  if (typeof supply.itemId === "number") return `Vật tư #${supply.itemId}`;
  return "Vật tư chưa rõ tên";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function syncDescriptionWithSupplies(
  description: string,
  supplies: ClusterSupplyCollection[] | null | undefined,
): string {
  if (!supplies || supplies.length === 0) return description;

  let next = description;
  for (const supply of supplies) {
    const name = getSupplyDisplayName(supply);
    if (!name || name === "Vật tư chưa rõ tên") continue;

    // Match patterns like "Tên vật tư x20", "Tên vật tư x 20", "Tên vật tư ×20".
    const qtyPattern = new RegExp(
      `(${escapeRegExp(name)}\\s*[xX×]\\s*)\\d+`,
      "g",
    );
    next = next.replace(qtyPattern, `$1${supply.quantity}`);
  }

  return next;
}

function extractSOSLabel(activity: MissionActivity): string | null {
  const target = typeof activity.target === "string" ? activity.target : "";
  const desc =
    typeof activity.description === "string" ? activity.description : "";

  const targetMatch = target.match(SOS_TARGET_REGEX);
  if (targetMatch?.[1]) return `SOS #${targetMatch[1]}`;

  const descMatch = desc.match(SOS_TARGET_REGEX);
  if (descMatch?.[1]) return `SOS #${descMatch[1]}`;

  return null;
}

function extractDepotLabel(activity: MissionActivity): string | null {
  const target =
    typeof activity.target === "string" ? activity.target.trim() : "";
  const hasDepotKeyword = /\b(kho|depot)\b/i.test(target);
  const isDepotActivity = activity.activityType === "COLLECT_SUPPLIES";

  if (!isDepotActivity && !hasDepotKeyword) return null;
  if (target && !SOS_TARGET_REGEX.test(target)) return target;
  return "Kho tiếp tế";
}

function getWaypointMeta(waypoint: UniqueWaypoint): WaypointMeta {
  const labels = new Set<string>();
  let hasSOS = false;
  let hasDepot = false;

  for (const activity of waypoint.activities) {
    const sosLabel = extractSOSLabel(activity);
    if (sosLabel) {
      labels.add(sosLabel);
      hasSOS = true;
    }

    const depotLabel = extractDepotLabel(activity);
    if (depotLabel) {
      labels.add(depotLabel);
      hasDepot = true;
    }
  }

  return {
    labels: Array.from(labels),
    hasSOS,
    hasDepot,
  };
}

const MissionRoutePreview = ({ mission }: { mission: MissionEntity }) => {
  const [open, setOpen] = useState(false);
  const [vehicle, setVehicle] = useState<RouteVehicle>("bike");
  const [originCoords] = useState(HUE_DEFAULT_ORIGIN);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [fetchProgress, setFetchProgress] = useState(0);
  const abortRef = useRef(false);

  // Filter activities that have valid coordinates, sorted by step
  // Fallback: if targetLatitude/Longitude are 0 or all the same, try parsing from description
  const routeActivities = useMemo(() => {
    const acts = mission.activities
      .filter((a) => RESCUE_ROUTE_ACTIVITY_TYPES.has(a.activityType))
      .slice()
      .sort((a, b) => a.step - b.step);

    // Enrich activities: if coords are 0, try extracting from description
    const enriched = acts.map((a) => {
      if (a.targetLatitude !== 0 && a.targetLongitude !== 0) return a;
      const parsed = extractCoordsFromDescription(a.description);
      if (parsed) {
        return {
          ...a,
          targetLatitude: parsed.lat,
          targetLongitude: parsed.lng,
        };
      }
      return a;
    });

    // Check if all non-zero coords are identical (cluster center fallback)
    const withCoords = enriched.filter(
      (a) => a.targetLatitude !== 0 && a.targetLongitude !== 0,
    );
    if (withCoords.length > 1) {
      const allSame = withCoords.every(
        (a) =>
          a.targetLatitude === withCoords[0].targetLatitude &&
          a.targetLongitude === withCoords[0].targetLongitude,
      );
      if (allSame) {
        // All have cluster center coords — try parsing unique coords from descriptions
        return enriched
          .map((a) => {
            const parsed = extractCoordsFromDescription(a.description);
            if (parsed) {
              return {
                ...a,
                targetLatitude: parsed.lat,
                targetLongitude: parsed.lng,
              };
            }
            return a;
          })
          .filter((a) => a.targetLatitude !== 0 && a.targetLongitude !== 0);
      }
    }

    return enriched.filter(
      (a) => a.targetLatitude !== 0 && a.targetLongitude !== 0,
    );
  }, [mission.activities]);

  // Deduplicate consecutive activities sharing the same coordinates
  const uniqueWaypoints = useMemo(() => {
    const wps: UniqueWaypoint[] = [];
    for (const act of routeActivities) {
      const last = wps[wps.length - 1];
      if (
        last &&
        Math.abs(last.lat - act.targetLatitude) < COORD_EPSILON &&
        Math.abs(last.lng - act.targetLongitude) < COORD_EPSILON
      ) {
        last.activities.push(act);
      } else {
        wps.push({
          lat: act.targetLatitude,
          lng: act.targetLongitude,
          activities: [act],
        });
      }
    }
    return wps;
  }, [routeActivities]);

  // Load Leaflet CSS
  useEffect(() => {
    const existingLink = document.querySelector('link[href*="leaflet.css"]');
    if (existingLink) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);
  }, []);

  // Fetch routes only between distinct waypoints, chaining origins
  useEffect(() => {
    if (!open || uniqueWaypoints.length === 0) return;
    abortRef.current = false;
    setLoading(true);
    setError(null);
    setSegments([]);
    setFetchProgress(0);

    let currentOrigin = { lat: originCoords.lat, lng: originCoords.lng };

    (async () => {
      const allSegments: RouteSegment[] = [];
      let distanceSum = 0;
      let durationSum = 0;

      for (let i = 0; i < uniqueWaypoints.length; i++) {
        if (abortRef.current) return;
        const wp = uniqueWaypoints[i];

        // Skip if origin is already at this waypoint (e.g. user is at the first point)
        const isSameAsOrigin =
          Math.abs(currentOrigin.lat - wp.lat) < COORD_EPSILON &&
          Math.abs(currentOrigin.lng - wp.lng) < COORD_EPSILON;

        if (!isSameAsOrigin) {
          // Use the first activity in this waypoint group for the API call
          const representativeAct = wp.activities[0];
          try {
            const resp = await getActivityRoute({
              missionId: mission.id,
              activityId: representativeAct.id,
              originLat: currentOrigin.lat,
              originLng: currentOrigin.lng,
              vehicle,
            });
            if (resp.route?.overviewPolyline) {
              const decoded = polylineDecode.decode(
                resp.route.overviewPolyline,
              ) as [number, number][];
              allSegments.push({
                index: i,
                waypoint: wp,
                points: decoded,
                distance: resp.route.totalDistanceText,
                duration: resp.route.totalDurationText,
                distanceMeters: resp.route.totalDistanceMeters,
                durationSeconds: resp.route.totalDurationSeconds,
              });
              distanceSum += resp.route.totalDistanceMeters;
              durationSum += resp.route.totalDurationSeconds;
            }
          } catch {
            // Skip failed segments
          }
        }

        // Chain: next origin = this waypoint
        currentOrigin = { lat: wp.lat, lng: wp.lng };
        setFetchProgress(i + 1);
      }

      if (!abortRef.current) {
        setSegments(allSegments);
        setTotalDistance(distanceSum);
        setTotalDuration(durationSum);
        setLoading(false);
      }
    })();

    return () => {
      abortRef.current = true;
    };
  }, [open, originCoords, uniqueWaypoints, vehicle, mission.id]);

  const waypointMetaList = useMemo(
    () => uniqueWaypoints.map(getWaypointMeta),
    [uniqueWaypoints],
  );

  if (routeActivities.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline mt-1"
      >
        <Path className="h-3 w-3" weight="bold" />
        Xem lộ trình tổng hợp ({uniqueWaypoints.length} điểm ·{" "}
        {routeActivities.length} bước)
      </button>
    );
  }

  const allPoints = segments.flatMap((s) => s.points);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} phút`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hrs}h ${remainMins}p` : `${hrs}h`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Color palette for route segments
  const segmentColors = [
    "#FF6B35",
    "#2563EB",
    "#16A34A",
    "#9333EA",
    "#DC2626",
    "#D97706",
    "#0891B2",
    "#BE185D",
  ];

  return (
    <div className="mt-2 rounded-lg border bg-muted/30 p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <NavigationArrow className="h-3 w-3" weight="fill" />
          Lộ trình tổng hợp
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded border bg-background overflow-hidden">
            {(
              [
                { key: "bike", label: "Xe máy" },
                { key: "car", label: "Ô tô" },
                { key: "hd", label: "Xe tải" },
              ] as const
            ).map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVehicle(v.key)}
                className={cn(
                  "px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                  vehicle === v.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" weight="fill" />
        Xuất phát mặc định: Huế (16.4637, 107.5909)
      </p>
      {loading && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 animate-pulse">
            <CircleNotch className="h-3 w-3 animate-spin" />
            Đang tải lộ trình ({fetchProgress}/{uniqueWaypoints.length} điểm)...
          </p>
          <Skeleton className="h-48 w-full rounded" />
        </div>
      )}
      {error && <p className="text-[10px] text-red-500">{error}</p>}

      {!loading && segments.length > 0 && (
        <>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="font-bold text-primary">
              {formatDistance(totalDistance)}
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(totalDuration)}
            </span>
            <span className="text-muted-foreground">
              {uniqueWaypoints.length} điểm · {segments.length} đoạn đường
            </span>
          </div>

          {originCoords && allPoints.length > 1 && (
            <div className="h-[28rem] overflow-hidden rounded-lg border bg-background">
              <MapContainer
                center={allPoints[0]}
                zoom={10}
                scrollWheelZoom={true}
                dragging={true}
                zoomControl={true}
                attributionControl={false}
                className="h-full w-full"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <RoutePreviewFitBounds points={allPoints} />
                {/* Render each segment with different color */}
                {segments.map((seg, idx) => (
                  <Polyline
                    key={seg.index}
                    positions={seg.points}
                    pathOptions={{
                      color: segmentColors[idx % segmentColors.length],
                      weight: 5,
                      opacity: 0.85,
                      lineJoin: "round",
                      lineCap: "round",
                    }}
                  />
                ))}
                {/* Origin marker (green) */}
                <CircleMarker
                  center={[originCoords.lat, originCoords.lng]}
                  radius={8}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: "#16a34a",
                    fillOpacity: 1,
                  }}
                />
                {/* Unique waypoint markers */}
                {uniqueWaypoints.map((wp, idx) => {
                  const isLast = idx === uniqueWaypoints.length - 1;
                  const meta = waypointMetaList[idx];

                  const markerColor = isLast
                    ? "#dc2626"
                    : meta?.hasDepot
                      ? "#a16207"
                      : meta?.hasSOS
                        ? "#2563eb"
                        : segmentColors[idx % segmentColors.length];

                  return (
                    <CircleMarker
                      key={`wp-${idx}`}
                      center={[wp.lat, wp.lng]}
                      radius={isLast ? 9 : 7}
                      pathOptions={{
                        color: "#ffffff",
                        weight: 2,
                        fillColor: markerColor,
                        fillOpacity: 1,
                      }}
                    >
                      {meta?.labels.length > 0 && (
                        <Tooltip
                          direction="top"
                          offset={[0, -10]}
                          opacity={1}
                          permanent
                        >
                          <div className="text-[10px] font-semibold whitespace-nowrap">
                            {meta.labels.join(" • ")}
                          </div>
                        </Tooltip>
                      )}
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          )}

          {/* Segment legend — grouped by unique waypoint */}
          <div className="space-y-1.5 mt-1">
            {uniqueWaypoints.map((wp, wpIdx) => {
              const seg = segments.find((s) => s.index === wpIdx);
              const meta = waypointMetaList[wpIdx];
              return (
                <div key={wpIdx} className="space-y-0.5">
                  {/* Route distance to this waypoint */}
                  {seg && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <span
                        className="w-4 h-1 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            segmentColors[wpIdx % segmentColors.length],
                        }}
                      />
                      <NavigationArrow
                        className="h-2.5 w-2.5 text-muted-foreground"
                        weight="bold"
                      />
                      <span className="text-muted-foreground">
                        {seg.distance} · {seg.duration}
                      </span>
                    </div>
                  )}
                  {meta?.labels.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pl-6">
                      {meta.labels.map((label) => (
                        <Badge
                          key={`${wpIdx}-${label}`}
                          variant="outline"
                          className="h-4 px-1.5 text-[9px]"
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* Activities at this waypoint */}
                  {wp.activities.map((act) => {
                    const config =
                      activityTypeConfig[act.activityType] ||
                      activityTypeConfig["ASSESS"];
                    return (
                      <div
                        key={act.id}
                        className="flex items-center gap-2 text-[10px] pl-6"
                      >
                        <span className="font-bold text-muted-foreground">
                          {act.step}.
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] h-3.5 px-1",
                            config.color,
                            config.bgColor,
                            "border-transparent",
                          )}
                        >
                          {config.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && segments.length === 0 && originCoords && (
        <p className="text-[10px] text-muted-foreground">
          Không tìm được tuyến đường. Hãy thử đổi loại phương tiện.
        </p>
      )}
    </div>
  );
};

// ── Card hiển thị 1 AI suggestion đã lưu ──
const SuggestionCard = ({
  suggestion,
  onEdit,
}: {
  suggestion: MissionSuggestionEntity;
  onEdit: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const allActivities = suggestion.activities.flatMap(
    (ag) => ag.suggestedActivities,
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Rocket
              className="h-4 w-4 text-emerald-500 shrink-0"
              weight="fill"
            />
            <span className="text-sm font-bold truncate">
              {suggestion.suggestedMissionTitle}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] gap-1 px-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
              onClick={onEdit}
            >
              <PencilSimpleLine className="h-3 w-3" />
              Dùng gợi ý này
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(suggestion.createdAt).toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span>Ưu tiên: {suggestion.suggestedPriorityScore.toFixed(1)}</span>
          <span>{allActivities.length} bước</span>
          <span className="flex items-center gap-1">
            <Lightning className="h-3 w-3" weight="fill" />
            {suggestion.modelName}
          </span>
          <span>Tin cậy: {(suggestion.confidenceScore * 100).toFixed(0)}%</span>
        </div>

        {/* Toggle activities */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
        >
          {expanded ? (
            <CaretUp className="h-3 w-3" />
          ) : (
            <CaretDown className="h-3 w-3" />
          )}
          {expanded ? "Ẩn chi tiết" : "Xem chi tiết"}
        </button>

        {expanded && allActivities.length > 0 && (
          <div className="space-y-1.5 mt-1">
            {allActivities.map((act, aIdx) => {
              const config =
                activityTypeConfig[act.activityType] ||
                activityTypeConfig["ASSESS"];
              return (
                <div
                  key={aIdx}
                  className="flex items-start gap-2 px-2 py-1.5 rounded-md border bg-background"
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                      config.bgColor,
                      config.color,
                    )}
                  >
                    {act.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold px-1.5 py-0 h-4",
                          config.color,
                          config.bgColor,
                          "border-transparent",
                        )}
                      >
                        {config.label}
                      </Badge>
                      {act.estimatedTime && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {act.estimatedTime}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                      {act.description}
                    </p>
                    {act.suppliesToCollect &&
                      act.suppliesToCollect.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {act.suppliesToCollect.map((supply, sIdx) => (
                            <div
                              key={sIdx}
                              className="flex items-center gap-1.5 text-[10px] text-blue-700 dark:text-blue-400"
                            >
                              <Package className="h-3 w-3 shrink-0" />
                              <span className="font-medium">
                                {getSupplyDisplayName(supply)}
                              </span>
                              <span className="font-bold bg-blue-50 dark:bg-blue-900/20 px-1 rounded">
                                {supply.quantity} {supply.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RescuePlanPanel = ({
  open,
  onOpenChange,
  clusterSOSRequests,
  clusterId,
  rescueSuggestion,
  onApprove,
  onReAnalyze,
  isReAnalyzing,
  onShowRoute,
  defaultTab,
}: RescuePlanPanelProps) => {
  // ── Custom resizable split ──
  const [splitPercent, setSplitPercent] = useState(42); // left panel %
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const mainScrollAreaRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;
      // Clamp between 30% and 80%
      setSplitPercent(Math.min(80, Math.max(30, pct)));
    };
    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ── Edit mode state ──
  const [isEditMode, setIsEditMode] = useState(false);

  type EditableActivity = ClusterSuggestedActivity & { _id: string };
  const [editActivities, setEditActivities] = useState<EditableActivity[]>([]);
  const [editMissionType, setEditMissionType] = useState<"RESCUE" | "RESCUER">(
    "RESCUE",
  );
  const [editPriorityScore, setEditPriorityScore] = useState(5);
  const [editStartTime, setEditStartTime] = useState("");
  const [editExpectedEndTime, setEditExpectedEndTime] = useState("");

  const { mutate: createMission, isPending: isCreatingMission } =
    useCreateMission();

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setEditActivities([]);
  }, []);

  const updateEditActivity = useCallback(
    (id: string, field: string, value: string | number | null) => {
      setEditActivities((prev) =>
        prev.map((a) => {
          if (a._id !== id) return a;

          // Only COLLECT_SUPPLIES activities should keep supply list.
          if (field === "activityType") {
            const nextType = value as ClusterActivityType;
            if (nextType !== "COLLECT_SUPPLIES") {
              return {
                ...a,
                activityType: nextType,
                suppliesToCollect: null,
              };
            }
            return { ...a, activityType: nextType };
          }

          return { ...a, [field]: value } as EditableActivity;
        }),
      );
    },
    [],
  );

  const removeEditActivity = useCallback((id: string) => {
    setEditActivities((prev) => prev.filter((a) => a._id !== id));
  }, []);

  const addEditActivity = useCallback(() => {
    const newAct: EditableActivity = {
      _id: `edit-new-${Date.now()}`,
      step: editActivities.length + 1,
      activityType: "ASSESS" as ClusterActivityType,
      description: "",
      priority: "Medium",
      estimatedTime: "30 phút",
      sosRequestId: null,
      depotId: null,
      depotName: null,
      depotAddress: null,
      suppliesToCollect: null,
    };
    setEditActivities((prev) => [...prev, newAct]);
  }, [editActivities.length]);

  const moveEditActivity = useCallback((idx: number, dir: -1 | 1) => {
    setEditActivities((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  // ── Supply management for edit mode ──
  const handleAddSupply = useCallback(
    (
      activityId: string,
      item: { itemId: number; itemName: string; availableQuantity: number },
    ) => {
      setEditActivities((prev) =>
        prev.map((a) => {
          if (a._id !== activityId) return a;
          const existing = a.suppliesToCollect ?? [];
          const foundIdx = existing.findIndex((s) => s.itemId === item.itemId);
          if (foundIdx >= 0) {
            const next = [...existing];
            next[foundIdx] = {
              ...next[foundIdx],
              quantity: next[foundIdx].quantity + 1,
            };
            return { ...a, suppliesToCollect: next };
          }
          return {
            ...a,
            suppliesToCollect: [
              ...existing,
              {
                itemId: item.itemId,
                itemName: item.itemName,
                quantity: 1,
                unit: "đơn vị",
              },
            ],
          };
        }),
      );
    },
    [],
  );

  const handleRemoveSupply = useCallback(
    (activityId: string, supplyIndex: number) => {
      setEditActivities((prev) =>
        prev.map((a) => {
          if (a._id !== activityId) return a;
          const next = [...(a.suppliesToCollect ?? [])];
          next.splice(supplyIndex, 1);
          return { ...a, suppliesToCollect: next.length > 0 ? next : null };
        }),
      );
    },
    [],
  );

  const handleUpdateSupplyQuantity = useCallback(
    (activityId: string, supplyIndex: number, quantity: number) => {
      setEditActivities((prev) =>
        prev.map((a) => {
          if (a._id !== activityId) return a;
          const next = [...(a.suppliesToCollect ?? [])];
          if (next[supplyIndex]) {
            next[supplyIndex] = {
              ...next[supplyIndex],
              quantity: Math.max(1, quantity),
            };
          }
          return { ...a, suppliesToCollect: next };
        }),
      );
    },
    [],
  );

  const handleSubmitEdit = useCallback(() => {
    if (!clusterId) return;
    if (editActivities.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 hoạt động");
      return;
    }
    for (let i = 0; i < editActivities.length; i++) {
      if (!editActivities[i].description.trim()) {
        toast.error(`Bước ${i + 1}: Vui lòng nhập mô tả`);
        return;
      }
    }
    if (!editStartTime || !editExpectedEndTime) {
      toast.error("Vui lòng chọn thời gian bắt đầu và kết thúc");
      return;
    }

    const sos = clusterSOSRequests[0];
    createMission(
      {
        clusterId,
        missionType: editMissionType,
        priorityScore: editPriorityScore,
        startTime: new Date(editStartTime).toISOString(),
        expectedEndTime: new Date(editExpectedEndTime).toISOString(),
        activities: editActivities.map((a, i) => {
          const syncedDescription = syncDescriptionWithSupplies(
            a.description,
            a.suppliesToCollect,
          );

          return {
            step: i + 1,
            activityCode: `${a.activityType}_${i + 1}`,
            activityType: a.activityType,
            description: syncedDescription,
            target: a.depotName || `SOS #${a.sosRequestId || "general"}`,
            items: a.suppliesToCollect
              ? a.suppliesToCollect
                  .map((s) => `${getSupplyDisplayName(s)} x${s.quantity}`)
                  .join(", ")
              : "",
            targetLatitude:
              extractCoordsFromDescription(syncedDescription)?.lat ??
              (a.sosRequestId
                ? (clusterSOSRequests.find(
                    (s) => String(s.id) === String(a.sosRequestId),
                  )?.location?.lat ??
                  sos?.location?.lat ??
                  0)
                : (sos?.location?.lat ?? 0)),
            targetLongitude:
              extractCoordsFromDescription(syncedDescription)?.lng ??
              (a.sosRequestId
                ? (clusterSOSRequests.find(
                    (s) => String(s.id) === String(a.sosRequestId),
                  )?.location?.lng ??
                  sos?.location?.lng ??
                  0)
                : (sos?.location?.lng ?? 0)),
          };
        }),
      },
      {
        onSuccess: () => {
          toast.success("Đã tạo nhiệm vụ từ kế hoạch chỉnh sửa!");
          exitEditMode();
          onApprove();
        },
        onError: (error) => {
          console.error("Failed to create mission:", error);
          toast.error("Không thể tạo nhiệm vụ. Vui lòng thử lại.");
        },
      },
    );
  }, [
    clusterId,
    editActivities,
    editMissionType,
    editPriorityScore,
    editStartTime,
    editExpectedEndTime,
    clusterSOSRequests,
    createMission,
    exitEditMode,
    onApprove,
  ]);

  // ── AI Stream ──
  const aiStream = useAiMissionStream();

  // ── Fetch saved AI suggestions for this cluster ──
  const {
    data: suggestionsData,
    isLoading: isSuggestionsLoading,
    refetch: refetchSuggestions,
  } = useMissionSuggestions(clusterId ?? 0, {
    enabled: !!clusterId && open,
  });

  // ── Fetch existing missions for this cluster ──
  const {
    data: missionsData,
    isLoading: isMissionsLoading,
    refetch: refetchMissions,
  } = useMissions(clusterId ?? 0, {
    enabled: !!clusterId && open,
  });

  // ── Active tab: "plan" for AI plan view, "missions" for existing missions ──
  const [activeTab, setActiveTab] = useState<"plan" | "missions">(
    defaultTab ?? "missions",
  );

  useEffect(() => {
    if (open && defaultTab) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  // ── DnD state ──
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (dragIdx === null || dragIdx === idx) return;
      setDragOverIdx(idx);
    },
    [dragIdx],
  );

  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx === null || dragIdx === idx) {
        setDragIdx(null);
        setDragOverIdx(null);
        return;
      }
      setEditActivities((prev) => {
        const next = [...prev];
        const [removed] = next.splice(dragIdx, 1);
        next.splice(idx, 0, removed);
        return next;
      });
      setDragIdx(null);
      setDragOverIdx(null);
    },
    [dragIdx],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  // Trigger stream when panel opens or re-analyze requested
  const handleStreamAnalyze = useCallback(() => {
    if (!clusterId) return;
    aiStream.startStream(clusterId);
  }, [clusterId, aiStream]);

  // Sync stream result → rescueSuggestion equivalent
  const streamResult = aiStream.result;

  // Use either the passed prop or the stream result
  const activeSuggestion = rescueSuggestion ?? streamResult;

  const enterEditMode = useCallback(() => {
    if (activeSuggestion) {
      setEditActivities(
        activeSuggestion.suggestedActivities.map((a, i) => ({
          ...a,
          _id: `edit-${i}-${Date.now()}`,
        })),
      );
      setEditPriorityScore(activeSuggestion.suggestedPriorityScore || 5);
    } else {
      setEditActivities([]);
      setEditPriorityScore(5);
    }
    setEditMissionType("RESCUE");
    const now = new Date();
    setEditStartTime(now.toISOString().slice(0, 16));
    const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    setEditExpectedEndTime(end.toISOString().slice(0, 16));
    setIsEditMode(true);
  }, [activeSuggestion]);

  // Enter edit from an existing mission (missions tab -> edit)
  const enterEditFromMission = useCallback((mission: MissionEntity) => {
    setEditActivities(
      mission.activities.map((a, i) => ({
        _id: `edit-m-${i}-${Date.now()}`,
        step: a.step,
        activityType: a.activityType as ClusterActivityType,
        description: a.description,
        priority: "Medium",
        estimatedTime: "",
        sosRequestId: null,
        depotId: null,
        depotName: a.target || null,
        depotAddress: null,
        suppliesToCollect: a.suppliesToCollect,
      })),
    );
    setEditMissionType(
      (mission.missionType as "RESCUE" | "RESCUER") || "RESCUE",
    );
    setEditPriorityScore(mission.priorityScore);
    setEditStartTime(new Date(mission.startTime).toISOString().slice(0, 16));
    setEditExpectedEndTime(
      new Date(mission.expectedEndTime).toISOString().slice(0, 16),
    );
    setActiveTab("plan");
    setIsEditMode(true);
  }, []);

  const hasSidebar = !!activeSuggestion;

  // Extract unique depots for inventory sidebar
  // In view mode: from activeSuggestion; in edit mode: from editActivities
  const sidebarDepots = useMemo(() => {
    const source = isEditMode
      ? editActivities
      : (activeSuggestion?.suggestedActivities ?? []);
    const map = new Map<
      number,
      { depotId: number; depotName: string; depotAddress: string | null }
    >();
    for (const act of source) {
      if (act.depotId && !map.has(act.depotId)) {
        map.set(act.depotId, {
          depotId: act.depotId,
          depotName: act.depotName || `Kho #${act.depotId}`,
          depotAddress: act.depotAddress,
        });
      }
    }
    return Array.from(map.values());
  }, [isEditMode, editActivities, activeSuggestion]);

  const showSidebar = hasSidebar || sidebarDepots.length > 0;

  const severity = activeSuggestion
    ? severityConfig[activeSuggestion.suggestedSeverityLevel] ||
      severityConfig["Medium"]
    : null;

  // Group activities by SOS request or depot
  type ActivityGroup = {
    type: "sos" | "depot" | "general";
    sosRequestId?: number | null;
    depotId?: number | null;
    depotName?: string | null;
    depotAddress?: string | null;
    activities: ClusterSuggestedActivity[];
  };

  const activityGroups: ActivityGroup[] = useMemo(() => {
    const sourceActivities = activeSuggestion
      ? activeSuggestion.suggestedActivities
      : [];
    if (sourceActivities.length === 0) return [];
    const groups: ActivityGroup[] = [];
    for (const act of sourceActivities) {
      const isDepot = act.activityType === "COLLECT_SUPPLIES" && act.depotId;
      const key = isDepot
        ? `depot-${act.depotId}`
        : `sos-${act.sosRequestId ?? "general"}`;
      const last = groups[groups.length - 1];
      const lastKey = last
        ? last.type === "depot"
          ? `depot-${last.depotId}`
          : `sos-${last.sosRequestId ?? "general"}`
        : null;
      if (lastKey === key) {
        last.activities.push(act);
      } else {
        groups.push({
          type: isDepot ? "depot" : act.sosRequestId ? "sos" : "general",
          sosRequestId: act.sosRequestId,
          depotId: act.depotId,
          depotName: act.depotName,
          depotAddress: act.depotAddress,
          activities: [act],
        });
      }
    }
    return groups;
  }, [activeSuggestion]);

  // Auto-collapse Quick Stats when user scrolls deep into the main plan content.
  useEffect(() => {
    if (!activeSuggestion) {
      setIsStatsCollapsed(false);
      return;
    }

    const root = mainScrollAreaRef.current;
    const viewport = root?.firstElementChild as HTMLDivElement | null;
    if (!viewport) return;

    const onScroll = () => {
      setIsStatsCollapsed(viewport.scrollTop > 120);
    };

    onScroll();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [activeSuggestion, activeTab, isEditMode, open]);

  // Early returns AFTER all hooks
  if (!activeSuggestion && !clusterId) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1100] transition-all duration-500 ease-out",
        open
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-full pointer-events-none",
      )}
    >
      <div className="h-full bg-background backdrop-blur-sm shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 p-3 pb-2 border-b shrink-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shadow-sm">
                <Rocket
                  className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                  weight="fill"
                />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">
                  {activeSuggestion
                    ? activeSuggestion.suggestedMissionTitle
                    : `Kế hoạch cứu hộ — Cụm #${clusterId}`}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  {activeSuggestion ? (
                    <>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 gap-1"
                      >
                        <TreeStructure className="h-3 w-3" weight="fill" />
                        {clusterSOSRequests.length} SOS
                      </Badge>
                      <Badge
                        variant={severity!.variant}
                        className="text-[10px] px-1.5 py-0 h-5"
                      >
                        {severity!.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5"
                      >
                        {activeSuggestion.suggestedMissionType}
                      </Badge>
                    </>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-5 gap-1"
                    >
                      {aiStream.loading ? (
                        <CircleNotch className="h-3 w-3 animate-spin" />
                      ) : (
                        <ClockCounterClockwise
                          className="h-3 w-3"
                          weight="fill"
                        />
                      )}
                      {aiStream.loading
                        ? aiStream.status || "Đang phân tích..."
                        : "Chưa có kế hoạch"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={exitEditMode}
                >
                  <X className="h-3.5 w-3.5" />
                  Thoát chỉnh sửa
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  handleStreamAnalyze();
                }}
                disabled={isReAnalyzing || aiStream.loading || isEditMode}
              >
                {isReAnalyzing || aiStream.loading ? (
                  <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowsClockwise className="h-3.5 w-3.5" />
                )}
                {isReAnalyzing || aiStream.loading
                  ? "Đang phân tích..."
                  : "Phân tích lại"}
              </Button>
              <Badge
                variant="outline"
                className="text-[10px] gap-1 px-1.5 py-0 h-5"
              >
                <Lightning className="h-3 w-3" weight="fill" />
                {activeSuggestion?.modelName ?? "AI"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          {activeSuggestion && (
            <div
              className={cn(
                "mt-2 transition-all duration-200",
                isStatsCollapsed
                  ? "grid grid-cols-4 gap-1"
                  : "grid grid-cols-2 lg:grid-cols-4 gap-1.5",
              )}
            >
              {[
                {
                  icon: Warning,
                  value: (activeSuggestion.suggestedPriorityScore ?? 0).toFixed(
                    1,
                  ),
                  label: "Ưu tiên",
                  color: "text-red-500",
                  bg: "bg-red-500/5 border-red-500/15",
                },
                {
                  icon: TreeStructure,
                  value:
                    activeSuggestion.sosRequestCount ??
                    clusterSOSRequests.length,
                  label: "Yêu cầu SOS",
                  color: "text-blue-500",
                  bg: "bg-blue-500/5 border-blue-500/15",
                },
                {
                  icon: ShieldCheck,
                  value: `${((activeSuggestion.confidenceScore ?? 0) * 100).toFixed(0)}%`,
                  label: "Độ tin cậy",
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/5 border-emerald-500/15",
                },
                {
                  icon: Clock,
                  value: `${((activeSuggestion.responseTimeMs || 0) / 1000).toFixed(1)}s`,
                  label: "Thời gian AI",
                  color: "text-orange-500",
                  bg: "bg-orange-500/5 border-orange-500/15",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    "rounded-md border min-w-0",
                    isStatsCollapsed
                      ? "px-1.5 py-1 flex items-center justify-center gap-1.5"
                      : "px-2 py-1.5 flex items-center justify-between gap-2",
                    stat.bg,
                  )}
                  title={stat.label}
                >
                  <stat.icon
                    className={cn("h-3 w-3 shrink-0", stat.color)}
                    weight="fill"
                  />
                  <div
                    className={cn(
                      "text-sm font-bold leading-none shrink-0",
                      stat.color,
                    )}
                  >
                    {stat.value}
                  </div>
                  {!isStatsCollapsed && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      {stat.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b shrink-0 px-4 bg-background">
          <button
            type="button"
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "plan"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("plan")}
          >
            <Rocket className="h-3.5 w-3.5 inline mr-1.5" weight="fill" />
            Kế hoạch AI
            {aiStream.loading && (
              <CircleNotch className="h-3 w-3 inline ml-1.5 animate-spin" />
            )}
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "missions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("missions")}
          >
            <ListChecks className="h-3.5 w-3.5 inline mr-1.5" weight="bold" />
            Nhiệm vụ đã tạo
            {missionsData?.missions && missionsData.missions.length > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1.5 ml-1.5"
              >
                {missionsData.missions.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Two-column content */}
        <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden flex">
          {/* LEFT COLUMN — Plan steps */}
          <div
            className="h-full overflow-hidden"
            style={{ width: showSidebar ? `${splitPercent}%` : "100%" }}
          >
            <ScrollArea ref={mainScrollAreaRef} className="h-full">
              <div className="p-4 space-y-4">
                {/* ═══ TAB: Missions ═══ */}
                {activeTab === "missions" && (
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <ListChecks className="h-3.5 w-3.5" weight="bold" />
                        Nhiệm vụ đã tạo cho cụm này
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => refetchMissions()}
                        disabled={isMissionsLoading}
                      >
                        <ArrowsClockwise className="h-3 w-3" />
                        Làm mới
                      </Button>
                    </div>
                    {isMissionsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton
                            key={i}
                            className="h-20 w-full rounded-lg"
                          />
                        ))}
                      </div>
                    ) : missionsData?.missions &&
                      missionsData.missions.length > 0 ? (
                      <div className="space-y-3">
                        {missionsData.missions.map((mission) => (
                          <Card key={mission.id} className="overflow-hidden">
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Rocket
                                    className="h-4 w-4 text-emerald-500 shrink-0"
                                    weight="fill"
                                  />
                                  <span className="text-sm font-bold truncate">
                                    {mission.suggestedMissionTitle ||
                                      `Nhiệm vụ #${mission.id}`}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1.5 shrink-0"
                                  >
                                    {mission.missionType}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {(mission.status === "Planned" ||
                                    mission.status === "Pending") && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] gap-1 px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                                      onClick={() => {
                                        toast.success(
                                          "Đã gửi nhiệm vụ cho đội cứu hộ!",
                                        );
                                      }}
                                    >
                                      <PaperPlaneTilt
                                        className="h-3 w-3"
                                        weight="fill"
                                      />
                                      Gửi cho đội cứu hộ
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] gap-1 px-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                                    onClick={() =>
                                      enterEditFromMission(mission)
                                    }
                                  >
                                    <PencilSimpleLine className="h-3 w-3" />
                                    Chỉnh sửa
                                  </Button>
                                  <Badge
                                    variant={
                                      mission.status === "Completed"
                                        ? "default"
                                        : mission.status === "InProgress"
                                          ? "p2"
                                          : mission.status === "Cancelled"
                                            ? "destructive"
                                            : "outline"
                                    }
                                    className="text-[10px] h-4 px-1.5"
                                  >
                                    {mission.status}
                                  </Badge>
                                </div>
                              </div>

                              {/* AI assessment */}
                              {mission.overallAssessment && (
                                <div className="bg-muted/40 rounded-lg p-2.5 border border-border/50">
                                  <p className="text-[11px] text-foreground/75 leading-relaxed line-clamp-3">
                                    {mission.overallAssessment}
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(mission.startTime).toLocaleString(
                                    "vi-VN",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                  {" → "}
                                  {new Date(
                                    mission.expectedEndTime,
                                  ).toLocaleString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {mission.estimatedDuration && (
                                  <span className="flex items-center gap-1">
                                    <ClockCounterClockwise className="h-3 w-3" />
                                    {mission.estimatedDuration}
                                  </span>
                                )}
                                <span>
                                  Ưu tiên: {mission.priorityScore.toFixed(1)}
                                </span>
                                <span>{mission.activityCount} bước</span>
                                {mission.modelName && (
                                  <span className="flex items-center gap-1">
                                    <Lightning
                                      className="h-3 w-3"
                                      weight="fill"
                                    />
                                    {mission.modelName}
                                  </span>
                                )}
                                {mission.aiConfidenceScore != null && (
                                  <span>
                                    Tin cậy:{" "}
                                    {(mission.aiConfidenceScore * 100).toFixed(
                                      0,
                                    )}
                                    %
                                  </span>
                                )}
                              </div>

                              {/* Suggested Resources */}
                              {mission.suggestedResources &&
                                mission.suggestedResources.length > 0 && (
                                  <div className="mt-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                                      <Cube className="h-3 w-3" weight="bold" />
                                      Tài nguyên cần thiết
                                    </p>
                                    <div className="space-y-1">
                                      {mission.suggestedResources.map(
                                        (resource, rIdx) => {
                                          const icon = resourceTypeIcons[
                                            resource.resourceType
                                          ] || (
                                            <Package className="h-3.5 w-3.5" />
                                          );
                                          return (
                                            <div
                                              key={rIdx}
                                              className="flex items-center gap-2 p-1.5 rounded border bg-background"
                                            >
                                              <div className="p-1 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shrink-0">
                                                {icon}
                                              </div>
                                              <span className="text-[11px] font-medium truncate flex-1 min-w-0">
                                                {resource.description}
                                              </span>
                                              <span className="text-[11px] font-bold text-primary shrink-0">
                                                x{resource.quantity}
                                              </span>
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* Special Notes */}
                              {mission.specialNotes && (
                                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-lg p-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-0.5 flex items-center gap-1">
                                    <Warning
                                      className="h-3 w-3"
                                      weight="fill"
                                    />
                                    Lưu ý
                                  </p>
                                  <p className="text-[11px] text-foreground/75 leading-relaxed">
                                    {mission.specialNotes}
                                  </p>
                                </div>
                              )}

                              {/* Activities */}
                              {mission.activities.length > 0 && (
                                <div className="space-y-1.5 mt-1">
                                  {mission.activities.map((act) => {
                                    const config =
                                      activityTypeConfig[act.activityType] ||
                                      activityTypeConfig["ASSESS"];
                                    return (
                                      <div
                                        key={act.id}
                                        className="flex items-start gap-2 px-2 py-1.5 rounded-md border bg-background"
                                      >
                                        <div
                                          className={cn(
                                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                                            config.bgColor,
                                            config.color,
                                          )}
                                        >
                                          {act.step}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5">
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "text-[10px] font-semibold px-1.5 py-0 h-4",
                                                config.color,
                                                config.bgColor,
                                                "border-transparent",
                                              )}
                                            >
                                              {config.label}
                                            </Badge>
                                            <Badge
                                              variant={
                                                act.status === "Completed"
                                                  ? "default"
                                                  : act.status === "InProgress"
                                                    ? "p2"
                                                    : "outline"
                                              }
                                              className="text-[9px] h-3.5 px-1"
                                            >
                                              {act.status}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                                            {act.description}
                                          </p>
                                          {/* Supply list in activity */}
                                          {act.suppliesToCollect &&
                                            act.suppliesToCollect.length >
                                              0 && (
                                              <div className="mt-1.5 space-y-0.5">
                                                {act.suppliesToCollect.map(
                                                  (supply, sIdx) => (
                                                    <div
                                                      key={sIdx}
                                                      className="flex items-center gap-1.5 text-[10px] text-blue-700 dark:text-blue-400"
                                                    >
                                                      <Package className="h-3 w-3 shrink-0" />
                                                      <span className="font-medium">
                                                        {getSupplyDisplayName(
                                                          supply,
                                                        )}
                                                      </span>
                                                      <span className="font-bold bg-blue-50 dark:bg-blue-900/20 px-1 rounded">
                                                        {supply.quantity}{" "}
                                                        {supply.unit}
                                                      </span>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {/* Consolidated route for entire mission */}
                              <MissionRoutePreview mission={mission} />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 rounded-xl border-2 border-dashed border-border/50">
                        <ListChecks className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground/60">
                          Chưa có nhiệm vụ nào được tạo cho cụm này
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {/* ═══ TAB: Plan ═══ */}
                {activeTab === "plan" && (
                  <>
                    {/* === Edit mode content === */}
                    {isEditMode && (
                      <>
                        {/* Edit mode banner */}
                        <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <PencilSimpleLine
                              className="h-4 w-4 text-amber-600"
                              weight="fill"
                            />
                            <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                              {activeSuggestion
                                ? "Chế độ chỉnh sửa kế hoạch"
                                : "Tạo kế hoạch cứu hộ thủ công"}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70">
                            {activeSuggestion ? (
                              <>
                                Chỉnh sửa các bước, sau đó nhấn &quot;Xác nhận
                                nhiệm vụ&quot; để tạo kế hoạch.
                              </>
                            ) : (
                              <>
                                Thêm các bước thực hiện, sau đó nhấn &quot;Xác
                                nhận nhiệm vụ&quot; để tạo kế hoạch.
                              </>
                            )}
                          </p>
                        </div>

                        {/* Mission config */}
                        <section className="rounded-xl border bg-card p-4 space-y-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Rocket className="h-3.5 w-3.5" weight="fill" />
                            Cấu hình nhiệm vụ
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Loại nhiệm vụ
                              </Label>
                              <Select
                                value={editMissionType}
                                onValueChange={(v) =>
                                  setEditMissionType(v as "RESCUE" | "RESCUER")
                                }
                              >
                                <SelectTrigger className="h-8 text-xs mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[1200]">
                                  <SelectItem value="RESCUE">Cứu hộ</SelectItem>
                                  <SelectItem value="RESCUER">
                                    Cứu hộ viên
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Điểm ưu tiên
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                step={0.1}
                                value={editPriorityScore}
                                onChange={(e) =>
                                  setEditPriorityScore(
                                    parseFloat(e.target.value) || 5,
                                  )
                                }
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Bắt đầu
                              </Label>
                              <Input
                                type="datetime-local"
                                value={editStartTime}
                                onChange={(e) =>
                                  setEditStartTime(e.target.value)
                                }
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                Kết thúc dự kiến
                              </Label>
                              <Input
                                type="datetime-local"
                                value={editExpectedEndTime}
                                onChange={(e) =>
                                  setEditExpectedEndTime(e.target.value)
                                }
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                          </div>
                        </section>

                        <Separator />

                        {/* Editable activities */}
                        <section>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <ListChecks
                                className="h-3.5 w-3.5"
                                weight="bold"
                              />
                              Các bước thực hiện
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-5 px-2"
                              >
                                {editActivities.length} bước
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1 border-dashed"
                                onClick={addEditActivity}
                              >
                                <Plus className="h-3 w-3" weight="bold" />
                                Thêm bước
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {editActivities.map((activity, idx) => {
                              const config =
                                activityTypeConfig[activity.activityType] ||
                                activityTypeConfig["ASSESS"];
                              const isManual =
                                activity._id.startsWith("edit-new-");
                              return (
                                <div
                                  key={activity._id}
                                  draggable
                                  onDragStart={() => handleDragStart(idx)}
                                  onDragOver={(e) => handleDragOver(e, idx)}
                                  onDrop={() => handleDrop(idx)}
                                  onDragEnd={handleDragEnd}
                                  className={cn(
                                    "rounded-xl border bg-background p-3 space-y-2.5 transition-all",
                                    dragIdx === idx
                                      ? "opacity-50 scale-[0.98]"
                                      : "hover:shadow-sm",
                                    dragOverIdx === idx &&
                                      dragIdx !== idx &&
                                      "ring-2 ring-primary/40 border-primary/30",
                                  )}
                                >
                                  {/* Step header */}
                                  <div className="flex items-center gap-2">
                                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                                      <DotsSixVertical
                                        className="h-4 w-4"
                                        weight="bold"
                                      />
                                    </div>
                                    <div
                                      className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                        config.bgColor,
                                        config.color,
                                      )}
                                    >
                                      {idx + 1}
                                    </div>
                                    {isManual ? (
                                      <Select
                                        value={activity.activityType}
                                        onValueChange={(v) =>
                                          updateEditActivity(
                                            activity._id,
                                            "activityType",
                                            v,
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-7 text-[11px] w-[140px] font-semibold">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="z-[1200]">
                                          {Object.entries(
                                            activityTypeConfig,
                                          ).map(([key, cfg]) => (
                                            <SelectItem
                                              key={key}
                                              value={key}
                                              className="text-xs"
                                            >
                                              {cfg.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[11px] font-semibold px-2 py-0 h-6",
                                          config.color,
                                          config.bgColor,
                                          "border-transparent",
                                        )}
                                      >
                                        {config.label}
                                      </Badge>
                                    )}
                                    <div className="flex-1" />
                                    <div className="flex items-center gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() =>
                                          moveEditActivity(idx, -1)
                                        }
                                        disabled={idx === 0}
                                      >
                                        <CaretUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => moveEditActivity(idx, 1)}
                                        disabled={
                                          idx === editActivities.length - 1
                                        }
                                      >
                                        <CaretDown className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                        onClick={() =>
                                          removeEditActivity(activity._id)
                                        }
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  <div>
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                      Mô tả
                                    </Label>
                                    {isManual ? (
                                      <textarea
                                        value={activity.description}
                                        onChange={(e) =>
                                          updateEditActivity(
                                            activity._id,
                                            "description",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Mô tả hoạt động..."
                                        rows={2}
                                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                                      />
                                    ) : (
                                      <p className="mt-1 text-xs leading-relaxed text-foreground/80 bg-muted/40 rounded-md px-3 py-1.5 border border-transparent">
                                        {activity.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Time + Priority */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        Thời gian ước tính
                                      </Label>
                                      <Input
                                        value={activity.estimatedTime}
                                        onChange={(e) =>
                                          updateEditActivity(
                                            activity._id,
                                            "estimatedTime",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="VD: 30 phút"
                                        className="h-7 text-xs mt-1"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        Độ ưu tiên
                                      </Label>
                                      <Select
                                        value={activity.priority || "Medium"}
                                        onValueChange={(v) =>
                                          updateEditActivity(
                                            activity._id,
                                            "priority",
                                            v,
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-7 text-xs mt-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="z-[1200]">
                                          <SelectItem value="Critical">
                                            Critical
                                          </SelectItem>
                                          <SelectItem value="High">
                                            High
                                          </SelectItem>
                                          <SelectItem value="Medium">
                                            Medium
                                          </SelectItem>
                                          <SelectItem value="Low">
                                            Low
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  {/* Supply drop zone (only for COLLECT_SUPPLIES) */}
                                  {activity.activityType ===
                                    "COLLECT_SUPPLIES" && (
                                    <div
                                      className={cn(
                                        "mt-1 p-2 rounded-lg border-2 border-dashed transition-colors",
                                        "border-blue-200 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-900/10",
                                      )}
                                      onDragOver={(e) => {
                                        if (
                                          e.dataTransfer.types.includes(
                                            "application/inventory-item",
                                          )
                                        ) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          e.currentTarget.classList.add(
                                            "border-blue-400",
                                            "bg-blue-100/50",
                                          );
                                        }
                                      }}
                                      onDragLeave={(e) => {
                                        e.currentTarget.classList.remove(
                                          "border-blue-400",
                                          "bg-blue-100/50",
                                        );
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.currentTarget.classList.remove(
                                          "border-blue-400",
                                          "bg-blue-100/50",
                                        );
                                        const data = e.dataTransfer.getData(
                                          "application/inventory-item",
                                        );
                                        if (data) {
                                          try {
                                            const item = JSON.parse(data);
                                            handleAddSupply(activity._id, item);
                                          } catch {
                                            /* ignore invalid data */
                                          }
                                        }
                                      }}
                                    >
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        Vật tư
                                      </p>
                                      {activity.suppliesToCollect &&
                                      activity.suppliesToCollect.length > 0 ? (
                                        <div className="space-y-1">
                                          {activity.suppliesToCollect.map(
                                            (supply, sIdx) => (
                                              <div
                                                key={sIdx}
                                                className="flex items-center gap-2 text-xs py-1 px-2 bg-background rounded border shadow-sm"
                                              >
                                                <Package className="h-3 w-3 text-blue-500 shrink-0" />
                                                <span className="font-medium truncate flex-1 min-w-0">
                                                  {getSupplyDisplayName(supply)}
                                                </span>
                                                <Input
                                                  type="number"
                                                  min={1}
                                                  value={supply.quantity}
                                                  onChange={(e) =>
                                                    handleUpdateSupplyQuantity(
                                                      activity._id,
                                                      sIdx,
                                                      parseInt(
                                                        e.target.value,
                                                      ) || 1,
                                                    )
                                                  }
                                                  className="h-6 w-16 text-[11px] text-center px-1"
                                                />
                                                <span className="text-[10px] text-muted-foreground shrink-0">
                                                  {supply.unit}
                                                </span>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-red-500"
                                                  onClick={() =>
                                                    handleRemoveSupply(
                                                      activity._id,
                                                      sIdx,
                                                    )
                                                  }
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-muted-foreground/60 text-center py-1">
                                          Kéo vật tư từ kho bên phải vào đây
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {editActivities.length === 0 && (
                            <div className="text-center py-8 rounded-xl border-2 border-dashed border-border/50">
                              <ListChecks className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                              <p className="text-sm text-muted-foreground/60">
                                Chưa có bước nào
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 gap-1.5 text-xs"
                                onClick={addEditActivity}
                              >
                                <Plus className="h-3 w-3" weight="bold" />
                                Thêm bước đầu tiên
                              </Button>
                            </div>
                          )}
                        </section>

                        <Separator />
                      </>
                    )}

                    {/* === Live mode content === */}
                    {activeSuggestion && !isEditMode && (
                      <>
                        {/* Overall Assessment */}
                        {activeSuggestion.overallAssessment && (
                          <>
                            <section>
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                                <Lightning
                                  className="h-3.5 w-3.5 text-yellow-500"
                                  weight="fill"
                                />
                                Đánh giá tổng quan
                              </h3>
                              <div className="bg-muted/40 rounded-xl p-3.5 border border-border/50">
                                <p className="text-sm text-foreground/80 leading-relaxed">
                                  {activeSuggestion.overallAssessment}
                                </p>
                              </div>
                            </section>

                            <Separator />
                          </>
                        )}

                        {/* SOS Info — moved from right sidebar */}
                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                            <Info className="h-3.5 w-3.5" weight="fill" />
                            Thông tin SOS
                          </h3>
                          <div className="space-y-2">
                            {clusterSOSRequests.map((sos) => (
                              <SOSRequestSidebarCard key={sos.id} sos={sos} />
                            ))}
                          </div>
                        </section>

                        <Separator />
                      </>
                    )}

                    {/* AI Stream Loading State */}
                    {aiStream.loading && !activeSuggestion && !isEditMode && (
                      <section className="text-center py-8">
                        <CircleNotch className="h-10 w-10 mx-auto mb-3 text-primary animate-spin" />
                        <p className="text-sm font-medium text-foreground/70">
                          {aiStream.status || "Đang phân tích..."}
                        </p>
                        {aiStream.thinkingText && (
                          <div className="mt-3 mx-auto max-w-md bg-muted/40 rounded-lg p-3 border">
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                              {aiStream.thinkingText.slice(-300)}
                            </p>
                          </div>
                        )}
                      </section>
                    )}

                    {/* Saved AI Suggestions */}
                    {!activeSuggestion && !aiStream.loading && !isEditMode && (
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Lightning
                              className="h-3.5 w-3.5 text-yellow-500"
                              weight="fill"
                            />
                            Gợi ý từ AI
                          </h3>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => refetchSuggestions()}
                              disabled={isSuggestionsLoading}
                            >
                              <ArrowsClockwise className="h-3 w-3" />
                              Làm mới
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1.5"
                              onClick={handleStreamAnalyze}
                              disabled={!clusterId}
                            >
                              <Lightning
                                className="h-3.5 w-3.5"
                                weight="fill"
                              />
                              Phân tích bằng AI
                            </Button>
                          </div>
                        </div>

                        {isSuggestionsLoading ? (
                          <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <Skeleton
                                key={i}
                                className="h-20 w-full rounded-lg"
                              />
                            ))}
                          </div>
                        ) : suggestionsData?.missionSuggestions &&
                          suggestionsData.missionSuggestions.length > 0 ? (
                          <div className="space-y-3">
                            {suggestionsData.missionSuggestions.map(
                              (suggestion) => (
                                <SuggestionCard
                                  key={suggestion.id}
                                  suggestion={suggestion}
                                  onEdit={() => {
                                    // Flatten activities from suggestion
                                    const allActivities =
                                      suggestion.activities.flatMap(
                                        (ag) => ag.suggestedActivities,
                                      );
                                    setEditActivities(
                                      allActivities.map((a, i) => ({
                                        ...a,
                                        _id: `edit-sug-${i}-${Date.now()}`,
                                      })),
                                    );
                                    setEditPriorityScore(
                                      suggestion.suggestedPriorityScore || 5,
                                    );
                                    setEditMissionType("RESCUE");
                                    const now = new Date();
                                    setEditStartTime(
                                      now.toISOString().slice(0, 16),
                                    );
                                    const end = new Date(
                                      now.getTime() + 4 * 60 * 60 * 1000,
                                    );
                                    setEditExpectedEndTime(
                                      end.toISOString().slice(0, 16),
                                    );
                                    setIsEditMode(true);
                                  }}
                                />
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 rounded-xl border-2 border-dashed border-border/50">
                            <Rocket className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground/60">
                              Chưa có gợi ý AI nào cho cụm này
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={handleStreamAnalyze}
                                disabled={!clusterId}
                              >
                                <Lightning
                                  className="h-3.5 w-3.5"
                                  weight="fill"
                                />
                                Phân tích bằng AI
                              </Button>
                            </div>
                          </div>
                        )}
                      </section>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* DRAG HANDLE */}
          {showSidebar && (
            <div
              ref={handleRef}
              onMouseDown={handleMouseDown}
              className="h-full w-2 shrink-0 cursor-col-resize flex items-center justify-center bg-border/50 hover:bg-primary/20 active:bg-primary/30 transition-colors select-none z-20"
            >
              <DotsSixVertical
                className="h-5 w-5 text-muted-foreground"
                weight="bold"
              />
            </div>
          )}

          {/* RIGHT COLUMN — SOS Context Sidebar */}
          {showSidebar && (
            <div
              className="h-full min-w-0 overflow-hidden bg-muted/20"
              style={{ width: `${100 - splitPercent}%` }}
            >
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  {/* Activity Steps — moved from left column */}
                  {activeSuggestion && !isEditMode && (
                    <>
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <ListChecks className="h-3.5 w-3.5" weight="bold" />
                            Kế hoạch thực hiện
                          </h3>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                              onClick={enterEditMode}
                            >
                              <PencilSimpleLine className="h-3 w-3" />
                              Chỉnh sửa
                            </Button>
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-5 px-2"
                            >
                              {
                                (activeSuggestion?.suggestedActivities ?? [])
                                  .length
                              }{" "}
                              bước
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {activityGroups.map((group, gIdx) => {
                            const matchedSOS =
                              group.type === "sos" && group.sosRequestId
                                ? clusterSOSRequests.find(
                                    (s) => s.id === String(group.sosRequestId),
                                  )
                                : null;

                            return (
                              <div
                                key={gIdx}
                                className={cn(
                                  "rounded-xl border overflow-hidden",
                                  group.type === "depot"
                                    ? "border-amber-300/50 dark:border-amber-700/40"
                                    : group.type === "sos" &&
                                        matchedSOS?.priority === "P1"
                                      ? "border-red-300/50 dark:border-red-700/40"
                                      : group.type === "sos" &&
                                          matchedSOS?.priority === "P2"
                                        ? "border-orange-300/50 dark:border-orange-700/40"
                                        : "border-border",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex items-center gap-2.5 px-3.5 py-2.5",
                                    group.type === "depot"
                                      ? "bg-amber-50 dark:bg-amber-900/15"
                                      : group.type === "sos" &&
                                          matchedSOS?.priority === "P1"
                                        ? "bg-red-50 dark:bg-red-900/15"
                                        : group.type === "sos" &&
                                            matchedSOS?.priority === "P2"
                                          ? "bg-orange-50 dark:bg-orange-900/15"
                                          : "bg-muted/40",
                                  )}
                                >
                                  {group.type === "depot" ? (
                                    <>
                                      <div className="p-2 rounded-lg bg-amber-200/80 text-amber-800 dark:bg-amber-800/50 dark:text-amber-300 ring-1 ring-amber-400/40">
                                        <Storefront
                                          className="h-5 w-5"
                                          weight="fill"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-extrabold text-amber-900 dark:text-amber-200 truncate tracking-tight">
                                          📦 Kho:{" "}
                                          <span className="underline decoration-amber-400 decoration-2 underline-offset-2">
                                            {group.depotName}
                                          </span>
                                        </p>
                                        {group.depotAddress && (
                                          <p className="text-[11px] text-amber-700/70 dark:text-amber-400/60 truncate mt-0.5">
                                            {group.depotAddress}
                                          </p>
                                        )}
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5 px-1.5 shrink-0 border-amber-400/60 text-amber-700 dark:text-amber-300 font-semibold"
                                      >
                                        {group.activities.length} bước
                                      </Badge>
                                    </>
                                  ) : group.type === "sos" && matchedSOS ? (
                                    <SOSGroupHeader
                                      matchedSOS={matchedSOS}
                                      groupActivitiesLength={
                                        group.activities.length
                                      }
                                    />
                                  ) : (
                                    <>
                                      <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                                        <ListChecks
                                          className="h-4 w-4"
                                          weight="fill"
                                        />
                                      </div>
                                      <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                                        Nhiệm vụ chung
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5 px-1.5 shrink-0"
                                      >
                                        {group.activities.length} bước
                                      </Badge>
                                    </>
                                  )}
                                </div>

                                <div className="p-3 space-y-2 bg-card">
                                  {group.activities.map((activity, aIdx) => {
                                    const config =
                                      activityTypeConfig[
                                        activity.activityType
                                      ] || activityTypeConfig["ASSESS"];
                                    const cleanDescription =
                                      activity.description
                                        .replace(
                                          /\b\d{1,2}\.\d+,\s*\d{1,3}\.\d+\b\s*(\(.*?\))?/g,
                                          "",
                                        )
                                        .replace(/\s+/g, " ")
                                        .replace(/\(\s*\)/g, "")
                                        .replace(/: \./g, ":")
                                        .trim();

                                    return (
                                      <div
                                        key={aIdx}
                                        className="rounded-lg border bg-background p-3 hover:bg-accent/20 transition-colors"
                                      >
                                        <div className="flex items-start gap-2.5">
                                          <div
                                            className={cn(
                                              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                              config.bgColor,
                                              config.color,
                                            )}
                                          >
                                            {activity.step}
                                          </div>
                                          <div className="flex-1 min-w-0 space-y-1.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <Badge
                                                variant="outline"
                                                className={cn(
                                                  "text-[11px] font-semibold px-2 py-0 h-5",
                                                  config.color,
                                                  config.bgColor,
                                                  "border-transparent",
                                                )}
                                              >
                                                {config.label}
                                              </Badge>
                                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/60 px-1.5 py-0.5 rounded-md">
                                                <Clock className="h-3 w-3" />
                                                {activity.estimatedTime}
                                              </span>
                                              {activity.priority && (
                                                <span className="text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                                                  {activity.priority}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-sm leading-relaxed text-foreground/80">
                                              {cleanDescription}
                                            </p>

                                            {activity.suppliesToCollect &&
                                              activity.suppliesToCollect
                                                .length > 0 && (
                                                <div className="mt-2 p-2 rounded-md bg-muted/50 border border-dashed">
                                                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                                                    {activity.activityType ===
                                                    "DELIVER_SUPPLIES"
                                                      ? "Danh sách giao hàng"
                                                      : "Yêu cầu lấy vật tư"}
                                                  </p>
                                                  <div className="space-y-1">
                                                    {activity.suppliesToCollect.map(
                                                      (supply, sIdx) => (
                                                        <div
                                                          key={sIdx}
                                                          className="flex items-center justify-between gap-2 text-xs py-1 px-2 bg-background rounded border shadow-sm"
                                                        >
                                                          <div className="flex items-center gap-1.5 min-w-0">
                                                            <Package className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                            <span className="font-medium truncate">
                                                              {getSupplyDisplayName(
                                                                supply,
                                                              )}
                                                            </span>
                                                          </div>
                                                          <div className="shrink-0 text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                                            {supply.quantity}{" "}
                                                            {supply.unit}
                                                          </div>
                                                        </div>
                                                      ),
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      <Separator />
                    </>
                  )}

                  {/* Resources */}
                  {activeSuggestion && (
                    <>
                      <section>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                          <Cube className="h-3.5 w-3.5" weight="bold" />
                          Tài nguyên cần thiết
                        </h4>
                        <div className="space-y-1.5">
                          {activeSuggestion.suggestedResources.map(
                            (resource, index) => {
                              const icon = resourceTypeIcons[
                                resource.resourceType
                              ] || <Package className="h-4 w-4" />;
                              return (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                                >
                                  <div className="p-1.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shrink-0">
                                    {icon}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold truncate">
                                      {resource.description}
                                    </p>
                                  </div>
                                  <span className="text-xs font-bold text-primary shrink-0">
                                    x{resource.quantity}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </section>

                      {/* Special Notes */}
                      {activeSuggestion.specialNotes && (
                        <>
                          <Separator />
                          <section>
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                              <Warning
                                className="h-3.5 w-3.5 text-orange-500"
                                weight="fill"
                              />
                              Lưu ý đặc biệt
                            </h4>
                            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-lg p-2.5">
                              <p className="text-[11px] text-foreground/75 leading-relaxed">
                                {activeSuggestion.specialNotes}
                              </p>
                            </div>
                          </section>
                        </>
                      )}

                      <Separator />
                    </>
                  )}

                  {/* AI Confidence */}
                  <section>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                      <ShieldCheck
                        className="h-3.5 w-3.5 text-emerald-500"
                        weight="fill"
                      />
                      Độ tin cậy AI
                    </h4>
                    <Card className="bg-card border">
                      <CardContent className="p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-muted-foreground">
                            Confidence
                          </span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {(
                              (activeSuggestion?.confidenceScore ?? 0) * 100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                        <Progress
                          value={(activeSuggestion?.confidenceScore ?? 0) * 100}
                          className="h-1.5"
                        />
                        <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] text-muted-foreground">
                          <div>
                            <p className="text-muted-foreground/60">Model</p>
                            <p className="font-medium text-foreground/80">
                              {activeSuggestion?.modelName}
                            </p>
                          </div>
                          {activeSuggestion && (
                            <div>
                              <p className="text-muted-foreground/60">
                                Phản hồi
                              </p>
                              <p className="font-medium text-foreground/80">
                                {(
                                  (activeSuggestion.responseTimeMs || 0) / 1000
                                ).toFixed(1)}
                                s
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground/60">Ưu tiên</p>
                            <p className="font-medium text-foreground/80">
                              {(
                                activeSuggestion?.suggestedPriorityScore ?? 0
                              ).toFixed(1)}
                            </p>
                          </div>
                          {activeSuggestion && (
                            <div>
                              <p className="text-muted-foreground/60">
                                Thời lượng
                              </p>
                              <p className="font-medium text-foreground/80">
                                {activeSuggestion.estimatedDuration}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  {/* Depot Inventory — shown whenever depots are present */}
                  {sidebarDepots.length > 0 && (
                    <>
                      <Separator />
                      <section>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                          <Storefront
                            className="h-3.5 w-3.5 text-amber-500"
                            weight="fill"
                          />
                          Kho vật tư
                        </h4>
                        <p className="text-[10px] text-muted-foreground mb-2">
                          {isEditMode
                            ? "Kéo vật tư vào bước thực hiện bên trái"
                            : "Vào chế độ chỉnh sửa để kéo vật tư vào bước"}
                        </p>
                        <div className="space-y-2">
                          {sidebarDepots.map((depot) => (
                            <DepotInventoryCard
                              key={depot.depotId}
                              depotId={depot.depotId}
                              depotName={depot.depotName}
                              depotAddress={depot.depotAddress}
                              isDraggable={isEditMode}
                            />
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0 bg-background">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (isEditMode) {
                  exitEditMode();
                } else {
                  onOpenChange(false);
                }
              }}
            >
              {isEditMode
                ? "Quay lại xem"
                : !activeSuggestion
                  ? "Đóng"
                  : "Huỷ bỏ"}
            </Button>
            {isEditMode ? (
              <Button
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/20"
                onClick={handleSubmitEdit}
                disabled={isCreatingMission}
              >
                {isCreatingMission ? (
                  <CircleNotch className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <FloppyDisk className="h-5 w-5 mr-2" weight="fill" />
                )}
                {isCreatingMission ? "Đang tạo..." : "Xác nhận nhiệm vụ"}
              </Button>
            ) : activeSuggestion ? (
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
                onClick={() => {
                  enterEditMode();
                }}
              >
                <CheckCircle className="h-5 w-5 mr-2" weight="fill" />
                Chỉnh sửa
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RescuePlanPanel;
