"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { RescuePlanPanelProps } from "@/type";
import polylineDecode from "@mapbox/polyline";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import { tileLayer } from "leaflet";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateMission,
  useMissions,
  useActivityRoute,
  useMissionTeamRoute,
} from "@/services/mission/hooks";
import { useRescueTeamsByCluster } from "@/services/rescue_teams/hooks";
import { useDepotInventoryRealtime } from "@/hooks/useDepotInventoryRealtime";
import { getActivityRoute } from "@/services/mission/api";
import type {
  MissionActivity,
  MissionEntity,
  MissionType,
  MissionTeam,
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
import { useDepotInventory } from "@/services/inventory/hooks";
import { useSOSRequestAnalysis } from "@/services/sos_request/hooks";
import type { RescueTeamByClusterEntity } from "@/services/rescue_teams/type";
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
  CaretLeft,
  CaretRight,
  Storefront,
  Info,
  PencilSimpleLine,
  Trash,
  Plus,
  FloppyDisk,
  DotsSixVertical,
  Path,
  NavigationArrow,
} from "@phosphor-icons/react";

// Extract lat/lng from activity description text
// Matches patterns like "17.214, 106.785" or "17.2195,106.792"
const COORD_REGEX = /(\d{1,2}\.\d{2,6})[,\s]\s*(\d{2,3}\.\d{2,6})/;
const CLEAR_ACTIVITY_TEAM_VALUE = "__clear_activity_team__";
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

const TEAM_TYPE_LABELS: Record<string, string> = {
  RESCUE: "Cứu hộ",
  MEDICAL: "Y tế",
  LOGISTICS: "Hậu cần",
  BOAT: "Đội thuyền",
  EVACUATION: "Sơ tán",
  FIREFIGHTER: "Cứu hỏa",
  SEARCH_AND_RESCUE: "Tìm kiếm cứu nạn",
};

const MISSION_TYPE_LABELS: Record<string, string> = {
  RESCUE: "Cứu hộ",
  EVACUATE: "Sơ tán",
  MEDICAL: "Y tế",
  SUPPLY: "Cứu trợ",
  MIXED: "Tổng hợp",
};

const formatTeamTypeLabel = (teamType?: string | null) => {
  if (!teamType) return "Chưa rõ";
  const normalized = teamType.trim().toUpperCase();
  return TEAM_TYPE_LABELS[normalized] ?? teamType;
};

const formatMissionTypeLabel = (missionType?: string | null) => {
  if (!missionType) return "Chưa rõ";
  const normalized = missionType.trim().toUpperCase();
  return MISSION_TYPE_LABELS[normalized] ?? missionType;
};

const normalizeEditMissionType = (value?: string | null): MissionType => {
  const normalized = (value ?? "").trim().toUpperCase();

  if (normalized === "MIXED") return "MIXED";
  if (
    normalized === "SUPPLY" ||
    normalized === "MEDICAL" ||
    normalized === "EVACUATE" ||
    normalized === "RELIEF"
  ) {
    return "RELIEF";
  }
  if (normalized === "RESCUER") return "RESCUER";
  return "RESCUE";
};

const formatCoordinateLabel = (
  lat?: number | null,
  lng?: number | null,
): string | null => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat!.toFixed(4)}, ${lng!.toFixed(4)}`;
};

const formatDistanceKmLabel = (distanceKm?: number | null) => {
  if (!Number.isFinite(distanceKm)) return "--";
  return `${distanceKm!.toFixed(1)} km`;
};

function getRescueTeamOperationalRank(status?: string | null): number {
  const normalizedStatus = (status ?? "").trim().toLowerCase();

  if (normalizedStatus === "ready" || normalizedStatus === "available") {
    return 0;
  }

  if (normalizedStatus === "gathering") {
    return 1;
  }

  if (normalizedStatus === "awaitingacceptance") {
    return 2;
  }

  if (normalizedStatus === "assigned" || normalizedStatus === "onmission") {
    return 3;
  }

  return 4;
}

const buildLeafletMapKey = (points: [number, number][]) =>
  points.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join("|");

const RoutePreviewFitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;

      try {
        const container = map.getContainer();
        if (!container) return;

        map.invalidateSize(false);

        if (points.length < 2) {
          map.setView(points[0], 15, { animate: false });
          return;
        }

        map.fitBounds(points, {
          padding: [30, 30],
          maxZoom: 15,
          animate: false,
        });
      } catch {
        // Ignore transient Leaflet teardown/re-init races during HMR or remount.
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [map, points]);

  return null;
};

const SafeTileLayer = ({ url }: { url: string }) => {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane("tilePane")) {
      return;
    }

    const layer = tileLayer(url);

    try {
      layer.addTo(map);
    } catch {
      return;
    }

    return () => {
      try {
        if (map.hasLayer(layer)) {
          layer.remove();
        }
      } catch {
        // Ignore teardown races when parent map unmounts first.
      }
    };
  }, [map, url]);

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
  const mapKey = buildLeafletMapKey(points);

  return (
    <div className="h-72 overflow-hidden rounded-lg border bg-background">
      <MapContainer
        key={mapKey}
        center={points[0]}
        zoom={10}
        scrollWheelZoom={true}
        dragging={true}
        zoomControl={true}
        attributionControl={false}
        className="h-full w-full"
      >
        <SafeTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
        <span className="text-xs font-bold truncate">SOS {sos.id}</span>

        {isLoading && (
          <Badge
            variant="outline"
            className="text-xs px-1 h-3.5 ml-1 animate-pulse border-blue-200 bg-blue-50 text-blue-600"
          >
            Đang tải điểm...
          </Badge>
        )}

        {isError && (
          <Badge
            variant="outline"
            className="text-xs px-1 h-3.5 ml-1 border-red-200 bg-red-50 text-red-600"
            title={error?.message}
          >
            Lỗi tải
          </Badge>
        )}

        {ruleScore !== undefined && !isLoading && !isError && (
          <Badge
            variant="outline"
            className="text-xs px-1 h-3.5 ml-1 border-primary/20 bg-primary/5 text-primary"
          >
            Điểm: {ruleScore.toFixed(1)}
          </Badge>
        )}
        <Badge
          variant={PRIORITY_BADGE_VARIANT[sos.priority]}
          className="text-xs px-1 h-3.5 ml-auto shrink-0"
        >
          {PRIORITY_LABELS[sos.priority]}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
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
          <p className="text-sm font-bold truncate">SOS {matchedSOS.id}</p>
          {isLoading && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 h-4 animate-pulse"
            >
              ...
            </Badge>
          )}
          {ruleScore !== undefined && !isLoading && !isError && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 h-4 border-primary/20 bg-primary/5 text-primary"
            >
              Điểm: {ruleScore.toFixed(1)}
            </Badge>
          )}
          <Badge
            variant={PRIORITY_BADGE_VARIANT[matchedSOS.priority]}
            className="text-xs px-1.5 h-4"
          >
            {PRIORITY_LABELS[matchedSOS.priority]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {matchedSOS.message}
        </p>
      </div>
      <Badge variant="outline" className="text-xs h-5 px-1.5 shrink-0">
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
  const [page, setPage] = useState(1);
  const { data, isLoading } = useDepotInventory({
    depotId,
    pageNumber: page,
    pageSize: 6,
  });

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-2 bg-amber-50/50 dark:bg-amber-900/10 border-b">
        <Storefront className="h-3.5 w-3.5 text-amber-600" weight="fill" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate">{depotName}</p>
          {depotAddress && (
            <p className="text-xs text-muted-foreground truncate">
              {depotAddress}
            </p>
          )}
        </div>
        {data ? (
          <Badge
            variant="secondary"
            className="h-5 shrink-0 rounded-full px-2 text-xs font-semibold"
          >
            {data.totalCount} vật tư
          </Badge>
        ) : null}
      </div>
      <div className="p-2 space-y-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))
        ) : data?.items && data.items.length > 0 ? (
          data.items
            .filter((item) =>
              item.itemType === "Reusable"
                ? item.availableUnit > 0
                : item.availableQuantity > 0,
            )
            .map((item, index) =>
              // Inventory API returns a union shape. Normalize fields for rendering and DnD.
              (() => {
                const availableQuantity =
                  item.itemType === "Reusable"
                    ? item.availableUnit
                    : item.availableQuantity;
                const itemId = item.itemModelId;
                const itemName = item.itemModelName;

                return (
                  <div
                    key={`${depotId}-${itemId}-${item.itemType}-${index}`}
                    draggable={isDraggable}
                    onDragStart={
                      isDraggable
                        ? (e) => {
                            const itemWithUnit = item as typeof item & {
                              unit?: string;
                              unitName?: string;
                            };
                            const rawUnit =
                              (typeof itemWithUnit.unit === "string"
                                ? itemWithUnit.unit.trim()
                                : "") ||
                              (typeof itemWithUnit.unitName === "string"
                                ? itemWithUnit.unitName.trim()
                                : "");

                            e.dataTransfer.setData(
                              "application/inventory-item",
                              JSON.stringify({
                                itemId,
                                itemName,
                                availableQuantity,
                                categoryName: item.categoryName,
                                unit: rawUnit || null,
                                sourceDepotId: depotId,
                                sourceDepotName: depotName,
                                sourceDepotAddress: depotAddress,
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
                      <p className="text-xs font-medium truncate">
                        {itemName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.categoryName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs h-4 px-1 shrink-0 font-bold"
                    >
                      {availableQuantity}
                    </Badge>
                  </div>
                );
              })(),
            )
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            Kho trống
          </p>
        )}

        {data && data.totalPages > 1 ? (
          <div className="mt-2 flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs font-semibold"
              disabled={!data.hasPreviousPage}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <CaretLeft className="h-3 w-3" />
              Trước
            </Button>

            <div className="text-center leading-none">
              <p className="text-xs font-semibold text-foreground">
                Trang {data.pageNumber}/{data.totalPages}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                6 vật tư mỗi trang
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs font-semibold"
              disabled={!data.hasNextPage}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Sau
              <CaretRight className="h-3 w-3" />
            </Button>
          </div>
        ) : null}
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

  const routeStatusMeta = useMemo(
    () => getActivityRouteStatusMeta(data?.status),
    [data?.status],
  );
  const routeErrorMessage =
    typeof data?.errorMessage === "string" &&
    data.errorMessage.trim().length > 0
      ? data.errorMessage.trim()
      : null;
  const routeSteps = data?.route?.steps ?? [];

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
        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
      >
        <Path className="h-3 w-3" weight="bold" />
        Xem lộ trình
      </button>
    );
  }

  return (
    <div className="mt-1.5 rounded-lg border bg-muted/30 p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <NavigationArrow className="h-3 w-3" weight="fill" />
            Lộ trình
          </span>
          {data ? (
            <Badge
              variant="outline"
              className={cn("h-5 px-1.5 text-xs", routeStatusMeta.className)}
            >
              {routeStatusMeta.label}
            </Badge>
          ) : null}
        </div>
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
                  "px-1.5 py-0.5 text-xs font-medium transition-colors",
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
        <p className="text-xs text-muted-foreground flex items-center gap-1 animate-pulse">
          <CircleNotch className="h-3 w-3 animate-spin" />
          Đang lấy vị trí hiện tại...
        </p>
      )}
      {/* Dùng vị trí mặc định nếu GPS bị từ chối */}
      {geoError && (
        <p className="text-xs text-orange-500 flex items-center gap-1">
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
        <p className="text-xs text-red-500">Không thể tải lộ trình</p>
      )}
      {routeErrorMessage ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {routeErrorMessage}
        </p>
      ) : null}
      {data?.route && (
        <>
          <div className="flex items-center gap-3 text-xs">
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

          {routeSteps.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Chỉ dẫn đường đi ({routeSteps.length} chặng)
              </p>
              <ScrollArea className="max-h-36 rounded-md border bg-background/80">
                <div className="space-y-1 p-2">
                  {routeSteps.map((step, index) => (
                    <div
                      key={`${step.startLat}-${step.startLng}-${index}`}
                      className="flex items-start gap-1.5 text-xs"
                    >
                      <span className="mt-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="leading-snug text-foreground/90">
                          {step.instruction}
                        </p>
                        <p className="text-muted-foreground">
                          {step.distanceText} · {step.durationText}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </>
      )}
      {data && !data.route && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Không tìm được tuyến đường bằng{" "}
            <strong>
              {vehicle === "bike"
                ? "xe máy"
                : vehicle === "car"
                  ? "ô tô"
                  : "xe tải"}
            </strong>
          </p>
          <p className="text-xs text-muted-foreground/70">
            Điểm đến có thể nằm trong khu vực không có đường. Hãy thử đổi loại
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
  steps: Array<{
    instruction: string;
    distanceText: string;
    durationText: string;
  }>;
  distance: string;
  duration: string;
  distanceMeters: number;
  durationSeconds: number;
}

const COORD_EPSILON = 0.0005; // ~55m tolerance for "same location"
const HUE_DEFAULT_ORIGIN = { lat: 16.4637, lng: 107.5909 };
const SOS_COORD_MATCH_EPSILON = 0.003; // ~330m tolerance for SOS coordinate matching
const VEHICLE_PRIORITY: RouteVehicle[] = ["bike", "car", "hd"];
const VEHICLE_LABELS: Record<RouteVehicle, string> = {
  bike: "Xe máy",
  car: "Ô tô",
  taxi: "Taxi",
  hd: "Xe tải",
};

function getActivityRouteStatusMeta(status?: string | null): {
  label: string;
  className: string;
} {
  const normalized = (status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");

  if (normalized === "ok") {
    return {
      label: "Tuyến hợp lệ",
      className:
        "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    };
  }

  if (normalized === "noroute") {
    return {
      label: "Chưa có tuyến",
      className:
        "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
    };
  }

  if (normalized === "error") {
    return {
      label: "Lỗi định tuyến",
      className:
        "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
    };
  }

  return {
    label: status?.trim() ? `Trạng thái: ${status}` : "Đang kiểm tra",
    className:
      "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-200",
  };
}

function buildVehicleTryOrder(preferred: RouteVehicle): RouteVehicle[] {
  const next = [preferred, ...VEHICLE_PRIORITY.filter((v) => v !== preferred)];
  return Array.from(new Set(next));
}

function estimateDurationSeconds(
  distanceMeters: number,
  vehicle: RouteVehicle,
) {
  const speedByVehicleKmh: Record<RouteVehicle, number> = {
    bike: 28,
    car: 42,
    taxi: 40,
    hd: 32,
  };
  const speedMps = (speedByVehicleKmh[vehicle] * 1000) / 3600;
  if (!Number.isFinite(speedMps) || speedMps <= 0) {
    return Math.round(distanceMeters / 8);
  }
  return Math.max(60, Math.round(distanceMeters / speedMps));
}

function haversineDistanceMeters(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
) {
  const R = 6371e3;
  const phi1 = (origin.lat * Math.PI) / 180;
  const phi2 = (destination.lat * Math.PI) / 180;
  const deltaPhi = ((destination.lat - origin.lat) * Math.PI) / 180;
  const deltaLambda = ((destination.lng - origin.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
const RESCUE_ROUTE_ACTIVITY_TYPES = new Set([
  "COLLECT_SUPPLIES",
  "DELIVER_SUPPLIES",
  "RESCUE",
  "MEDICAL_AID",
  "EVACUATE",
]);
const SOS_TARGET_REGEX = /SOS\s*#?\s*(\d+)/i;

interface WaypointMeta {
  labels: string[];
  hasSOS: boolean;
  hasDepot: boolean;
  stepNumbers: number[];
  stepRangeLabel: string;
}

type SupplyDisplayItem = {
  name: string;
  quantityLabel: string;
};

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
  // Only pickup steps should be labeled as depot points on the consolidated route.
  if (activity.activityType !== "COLLECT_SUPPLIES") {
    return null;
  }

  const depotName =
    typeof activity.depotName === "string" ? activity.depotName.trim() : "";
  if (depotName) return depotName;

  const target =
    typeof activity.target === "string" ? activity.target.trim() : "";
  const hasDepotKeyword = /\b(kho|depot)\b/i.test(target);
  if (!hasDepotKeyword) return null;
  if (target && !SOS_TARGET_REGEX.test(target)) return target;
  return "Kho tiếp tế";
}

function inferSOSRequestIdFromActivity(
  activity: MissionActivity,
  sosRequests: SOSRequest[],
): string | null {
  if (typeof activity.sosRequestId === "number") {
    return String(activity.sosRequestId);
  }

  const explicitLabel = extractSOSLabel(activity);
  if (explicitLabel) return explicitLabel.replace("SOS #", "").trim();

  const hasValidCoords =
    activity.targetLatitude !== 0 && activity.targetLongitude !== 0;
  if (hasValidCoords) {
    const withCoords = sosRequests.filter(
      (s) =>
        typeof s.location?.lat === "number" &&
        typeof s.location?.lng === "number",
    );
    if (withCoords.length > 0) {
      const nearest = withCoords.reduce((best, current) => {
        const bestDist =
          Math.pow(best.location!.lat - activity.targetLatitude, 2) +
          Math.pow(best.location!.lng - activity.targetLongitude, 2);
        const currentDist =
          Math.pow(current.location!.lat - activity.targetLatitude, 2) +
          Math.pow(current.location!.lng - activity.targetLongitude, 2);
        return currentDist < bestDist ? current : best;
      });
      return String(nearest.id);
    }
  }

  if (sosRequests.length > 0) return String(sosRequests[0].id);
  return null;
}

function isSupplyStep(activityType: string): boolean {
  return (
    activityType === "COLLECT_SUPPLIES" || activityType === "DELIVER_SUPPLIES"
  );
}

function parseSupplyItemsFromDescription(
  description: string,
): SupplyDisplayItem[] {
  const markerMatch = description.match(
    /(?:Lấy|Lay|Giao vật tư|Tiếp tế|Tiep te|Cấp phát|Cap phat|Collect(?: supplies)?|Deliver(?: supplies)?)[^:]*:\s*(.+)$/i,
  );
  if (!markerMatch?.[1]) return [];

  const listText = markerMatch[1].replace(/\.+\s*$/, "").trim();
  if (!listText) return [];

  return listText
    .split(/\s*,\s*/)
    .map((chunk) => {
      const value = chunk.trim();
      if (!value) return null;

      const qtyMatch = value.match(/^(.*?)[xX×]\s*(\d+(?:[.,]\d+)?)\s*(.*)$/);
      if (!qtyMatch) {
        return {
          name: value,
          quantityLabel: "",
        };
      }

      const name = qtyMatch[1].trim();
      const quantity = qtyMatch[2].trim();
      const unit = qtyMatch[3].trim();

      return {
        name: name || value,
        quantityLabel: `${quantity} ${unit}`.trim(),
      };
    })
    .filter((item): item is SupplyDisplayItem => !!item && !!item.name);
}

function getSupplyDisplayItems(activity: {
  activityType: string;
  description: string;
  suppliesToCollect?:
    | ClusterSupplyCollection[]
    | Array<{
        itemId: number | null;
        itemName: string | null;
        quantity: number;
        unit: string;
      }>
    | null;
}): SupplyDisplayItem[] {
  if (activity.suppliesToCollect && activity.suppliesToCollect.length > 0) {
    return activity.suppliesToCollect.map((supply) => ({
      name: getSupplyDisplayName(supply),
      quantityLabel: `${supply.quantity} ${supply.unit}`.trim(),
    }));
  }

  if (!isSupplyStep(activity.activityType)) return [];
  return parseSupplyItemsFromDescription(activity.description);
}

function stripSupplyDetailsFromDescription(description: string): string {
  return description
    .replace(
      /\s*(?:Lấy|Lay|Giao vật tư|Tiếp tế|Tiep te|Cấp phát|Cap phat|Collect(?: supplies)?|Deliver(?: supplies)?)[^:]*:\s*.*$/i,
      "",
    )
    .replace(/[\s,;:.]+$/, "")
    .trim();
}

function getActivityStatusMeta(status: string | null | undefined): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  const normalizedStatus = (status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");

  if (normalizedStatus === "succeed" || normalizedStatus === "completed") {
    return {
      label: "Hoàn thành",
      className:
        "bg-[#16a34a]/12 text-[#16a34a] border-[#16a34a]/40 dark:bg-[#117b38]/20 dark:text-[#117b38] dark:border-[#117b38]/45",
      icon: <CheckCircle className="h-3.5 w-3.5" weight="fill" />,
    };
  }

  if (normalizedStatus === "ongoing" || normalizedStatus === "inprogress") {
    return {
      label: "Đang thực hiện",
      className:
        "bg-[#f59e0b]/12 text-[#f59e0b] border-[#f59e0b]/40 dark:bg-[#c07e09]/20 dark:text-[#c07e09] dark:border-[#c07e09]/45",
      icon: <CircleNotch className="h-3.5 w-3.5 animate-spin" weight="bold" />,
    };
  }

  if (
    normalizedStatus === "pendingconfirmation" ||
    normalizedStatus === "pending"
  ) {
    return {
      label: "Chờ xác nhận",
      className:
        "bg-[#f59e0b]/12 text-[#f59e0b] border-[#f59e0b]/40 dark:bg-[#c07e09]/20 dark:text-[#c07e09] dark:border-[#c07e09]/45",
      icon: <Clock className="h-3.5 w-3.5" />,
    };
  }

  if (normalizedStatus === "planned") {
    return {
      label: "Đã lập kế hoạch",
      className:
        "bg-[#0ea5e9]/12 text-[#0ea5e9] border-[#0ea5e9]/40 dark:bg-[#0b7eaf]/18 dark:text-[#0b7eaf] dark:border-[#0b7eaf]/45",
      icon: <Clock className="h-3.5 w-3.5" />,
    };
  }

  if (normalizedStatus === "failed") {
    return {
      label: "Thất bại",
      className:
        "bg-[#ff5722]/12 text-[#ff5722] border-[#ff5722]/40 dark:bg-[#bf4119]/20 dark:text-[#bf4119] dark:border-[#bf4119]/45",
      icon: <Warning className="h-3.5 w-3.5" weight="fill" />,
    };
  }

  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return {
      label: "Đã hủy",
      className:
        "bg-[#6e6e73]/10 text-[#6e6e73] border-[#6e6e73]/35 dark:bg-[#aaaaaa]/18 dark:text-[#aaaaaa] dark:border-[#aaaaaa]/45",
      icon: <X className="h-3.5 w-3.5" weight="bold" />,
    };
  }

  return {
    label: status || "Chưa rõ",
    className:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600",
    icon: <Clock className="h-3.5 w-3.5" />,
  };
}

function getTeamAssignmentStatusMeta(status: string | null | undefined): {
  label: string;
  className: string;
} {
  const normalizedStatus = (status ?? "").trim().toLowerCase();

  if (normalizedStatus === "assigned") {
    return {
      label: "Đã phân công",
      className:
        "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
    };
  }

  if (
    normalizedStatus === "inprogress" ||
    normalizedStatus === "in_progress" ||
    normalizedStatus === "in progress"
  ) {
    return {
      label: "Đang thực hiện",
      className:
        "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    };
  }

  if (
    normalizedStatus === "unassigned" ||
    normalizedStatus === "removed" ||
    normalizedStatus === "inactive"
  ) {
    return {
      label: "Ngừng phụ trách",
      className:
        "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700",
    };
  }

  return {
    label: status || "Chưa rõ",
    className:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600",
  };
}

function isMissionTeamActive(team: MissionTeam): boolean {
  const normalizedStatus = (team.status ?? "").trim().toLowerCase();
  return (
    (!team.unassignedAt || team.unassignedAt.trim() === "") &&
    (normalizedStatus === "assigned" ||
      normalizedStatus === "inprogress" ||
      normalizedStatus === "in_progress" ||
      normalizedStatus === "in progress")
  );
}

function getRescueTeamStatusMeta(status: string | null | undefined): {
  label: string;
  className: string;
} {
  const normalizedStatus = (status ?? "").trim().toLowerCase();

  if (normalizedStatus === "ready") {
    return {
      label: "Sẵn sàng",
      className:
        "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
    };
  }

  if (normalizedStatus === "gathering") {
    return {
      label: "Đang tập hợp",
      className:
        "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
    };
  }

  if (normalizedStatus === "awaitingacceptance") {
    return {
      label: "Chờ xác nhận",
      className:
        "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600",
    };
  }

  return {
    label: status || "Chưa rõ",
    className:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600",
  };
}

function getActiveMissionTeams(mission: MissionEntity): MissionTeam[] {
  return (mission.teams ?? []).filter(isMissionTeamActive);
}

function inferSOSLabelFromCoords(
  lat: number,
  lng: number,
  sosRequests: SOSRequest[],
): string | null {
  const sosWithCoords = sosRequests.filter(
    (sos) =>
      typeof sos.location?.lat === "number" &&
      typeof sos.location?.lng === "number",
  );

  if (sosWithCoords.length === 0) return null;

  const nearest = sosWithCoords.reduce((best, current) => {
    const bestDistSq =
      Math.pow(best.location!.lat - lat, 2) +
      Math.pow(best.location!.lng - lng, 2);
    const currentDistSq =
      Math.pow(current.location!.lat - lat, 2) +
      Math.pow(current.location!.lng - lng, 2);
    return currentDistSq < bestDistSq ? current : best;
  });

  const nearestDistSq =
    Math.pow(nearest.location!.lat - lat, 2) +
    Math.pow(nearest.location!.lng - lng, 2);

  if (nearestDistSq > Math.pow(SOS_COORD_MATCH_EPSILON, 2)) return null;
  return `SOS #${nearest.id}`;
}

function getWaypointMeta(
  waypoint: UniqueWaypoint,
  sosRequests: SOSRequest[],
): WaypointMeta {
  const sosIds = new Set<string>();
  let hasSOS = false;
  let hasDepot = false;

  const pushSosId = (value: string | null | undefined) => {
    if (!value) return;
    const match = value.match(/(\d+)/);
    if (!match?.[1]) return;
    sosIds.add(match[1]);
    hasSOS = true;
  };

  for (const activity of waypoint.activities) {
    const depotLabel = extractDepotLabel(activity);
    if (depotLabel) {
      hasDepot = true;
    }

    if (typeof activity.sosRequestId === "number") {
      pushSosId(String(activity.sosRequestId));
      continue;
    }

    const sosLabel = extractSOSLabel(activity);
    if (sosLabel) {
      pushSosId(sosLabel);
    } else if (!depotLabel) {
      const inferredFromCoords = inferSOSLabelFromCoords(
        activity.targetLatitude,
        activity.targetLongitude,
        sosRequests,
      );
      if (inferredFromCoords) {
        pushSosId(inferredFromCoords);
      }
    }
  }

  const orderedLabels = Array.from(sosIds)
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => `SOS ${id}`);

  const stepNumbers = waypoint.activities
    .map((activity) => activity.step)
    .filter((step) => Number.isFinite(step))
    .sort((a, b) => a - b);

  const uniqueStepNumbers = Array.from(new Set(stepNumbers));
  const firstStep = uniqueStepNumbers[0];
  const lastStep = uniqueStepNumbers[uniqueStepNumbers.length - 1];
  const stepRangeLabel =
    uniqueStepNumbers.length === 0
      ? ""
      : firstStep === lastStep
        ? `Bước ${firstStep}`
        : `Bước ${firstStep}-${lastStep}`;

  return {
    labels: orderedLabels,
    hasSOS,
    hasDepot,
    stepNumbers: uniqueStepNumbers,
    stepRangeLabel,
  };
}

const MissionRoutePreview = ({
  mission,
  sosRequests,
}: {
  mission: MissionEntity;
  sosRequests: SOSRequest[];
}) => {
  const [open, setOpen] = useState(false);
  const [vehicle, setVehicle] = useState<RouteVehicle>("bike");
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [fallbackSegments, setFallbackSegments] = useState(0);
  const [alternativeVehicleSegments, setAlternativeVehicleSegments] =
    useState(0);
  const abortRef = useRef(false);

  const routeOrigin = useMemo(() => {
    const teams = mission.teams ?? [];
    const hasActiveStatus = (status: string | null | undefined) => {
      const normalized = (status ?? "").trim().toLowerCase();
      return (
        normalized === "assigned" ||
        normalized === "inprogress" ||
        normalized === "in_progress" ||
        normalized === "in progress"
      );
    };

    const activeTeams = teams.filter(
      (team) => team.unassignedAt == null && hasActiveStatus(team.status),
    );

    const teamCandidates = activeTeams.length > 0 ? activeTeams : teams;

    for (const team of teamCandidates) {
      const lat =
        typeof team.latitude === "number" ? team.latitude : Number.NaN;
      const lng =
        typeof team.longitude === "number" ? team.longitude : Number.NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const baseName = team.teamName || `Đội #${team.rescueTeamId}`;
      const sourceSuffix = team.locationSource
        ? ` (${team.locationSource})`
        : "";

      return {
        lat,
        lng,
        label: `${baseName}${sourceSuffix}`,
        isFallback: false,
      };
    }

    const activeTeamIds = new Set(activeTeams.map((team) => team.rescueTeamId));
    const suggested = mission.suggestedActivities ?? [];
    const suggestedCandidates =
      activeTeamIds.size > 0
        ? suggested.filter((activity) =>
            activity.suggestedTeam?.teamId
              ? activeTeamIds.has(activity.suggestedTeam.teamId)
              : false,
          )
        : suggested;

    for (const activity of suggestedCandidates) {
      const rawLat = activity.suggestedTeam?.latitude;
      const rawLng = activity.suggestedTeam?.longitude;
      const lat =
        typeof rawLat === "number"
          ? rawLat
          : typeof rawLat === "string"
            ? Number(rawLat)
            : Number.NaN;
      const lng =
        typeof rawLng === "number"
          ? rawLng
          : typeof rawLng === "string"
            ? Number(rawLng)
            : Number.NaN;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const teamLabel =
        activity.suggestedTeam?.teamName ||
        (activity.suggestedTeam?.teamId
          ? `Đội #${activity.suggestedTeam.teamId}`
          : "Đội cứu hộ đề xuất");

      return {
        lat,
        lng,
        label: `${teamLabel} (AI đề xuất)`,
        isFallback: false,
      };
    }

    return {
      lat: HUE_DEFAULT_ORIGIN.lat,
      lng: HUE_DEFAULT_ORIGIN.lng,
      label: "Mặc định Huế",
      isFallback: true,
    };
  }, [mission.teams, mission.suggestedActivities]);

  const originCoords = useMemo(
    () => ({ lat: routeOrigin.lat, lng: routeOrigin.lng }),
    [routeOrigin.lat, routeOrigin.lng],
  );

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
    setFallbackSegments(0);
    setAlternativeVehicleSegments(0);

    let currentOrigin = { lat: originCoords.lat, lng: originCoords.lng };

    (async () => {
      const allSegments: RouteSegment[] = [];
      let distanceSum = 0;
      let durationSum = 0;
      let fallbackCount = 0;
      let altVehicleCount = 0;

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
          let segmentAdded = false;
          const tryVehicles = buildVehicleTryOrder(vehicle);

          for (const tryVehicle of tryVehicles) {
            try {
              const resp = await getActivityRoute({
                missionId: mission.id,
                activityId: representativeAct.id,
                originLat: currentOrigin.lat,
                originLng: currentOrigin.lng,
                vehicle: tryVehicle,
              });
              if (!resp.route?.overviewPolyline) {
                continue;
              }

              const decoded = polylineDecode.decode(
                resp.route.overviewPolyline,
              ) as [number, number][];
              if (decoded.length < 2) {
                continue;
              }

              allSegments.push({
                index: i,
                waypoint: wp,
                points: decoded,
                steps: resp.route.steps ?? [],
                distance: resp.route.totalDistanceText,
                duration: resp.route.totalDurationText,
                distanceMeters: resp.route.totalDistanceMeters,
                durationSeconds: resp.route.totalDurationSeconds,
              });
              distanceSum += resp.route.totalDistanceMeters;
              durationSum += resp.route.totalDurationSeconds;
              if (tryVehicle !== vehicle) {
                altVehicleCount += 1;
              }
              segmentAdded = true;
              break;
            } catch {
              // Try next vehicle profile for the same segment.
            }
          }

          if (!segmentAdded) {
            // Final fallback: draw a direct line so the mission route still renders.
            const distanceMeters = Math.round(
              haversineDistanceMeters(currentOrigin, {
                lat: wp.lat,
                lng: wp.lng,
              }),
            );
            const durationSeconds = estimateDurationSeconds(
              distanceMeters,
              vehicle,
            );
            allSegments.push({
              index: i,
              waypoint: wp,
              points: [
                [currentOrigin.lat, currentOrigin.lng],
                [wp.lat, wp.lng],
              ],
              steps: [],
              distance:
                distanceMeters < 1000
                  ? `${distanceMeters}m`
                  : `${(distanceMeters / 1000).toFixed(1)} km`,
              duration:
                durationSeconds < 3600
                  ? `${Math.round(durationSeconds / 60)} phút`
                  : `${Math.floor(durationSeconds / 3600)}h ${Math.round((durationSeconds % 3600) / 60)}p`,
              distanceMeters,
              durationSeconds,
            });
            distanceSum += distanceMeters;
            durationSum += durationSeconds;
            fallbackCount += 1;
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
        setFallbackSegments(fallbackCount);
        setAlternativeVehicleSegments(altVehicleCount);
        setLoading(false);
      }
    })();

    return () => {
      abortRef.current = true;
    };
  }, [open, originCoords, uniqueWaypoints, vehicle, mission.id]);

  const waypointMetaList = useMemo(
    () =>
      uniqueWaypoints.map((waypoint) => getWaypointMeta(waypoint, sosRequests)),
    [uniqueWaypoints, sosRequests],
  );

  if (routeActivities.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
      >
        <Path className="h-3 w-3" weight="bold" />
        Xem lộ trình tổng hợp ({uniqueWaypoints.length} điểm ·{" "}
        {routeActivities.length} bước)
      </button>
    );
  }

  const allPoints = segments.flatMap((s) => s.points);
  const missionRouteMapKey = buildLeafletMapKey(allPoints);

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
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
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
                  "px-1.5 py-0.5 text-xs font-medium transition-colors",
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

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" weight="fill" />
        {routeOrigin.isFallback
          ? `Xuất phát mặc định: Huế (${originCoords.lat.toFixed(4)}, ${originCoords.lng.toFixed(4)})`
          : `Xuất phát từ ${routeOrigin.label} (${originCoords.lat.toFixed(4)}, ${originCoords.lng.toFixed(4)})`}
      </p>
      {loading && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1 animate-pulse">
            <CircleNotch className="h-3 w-3 animate-spin" />
            Đang tải lộ trình ({fetchProgress}/{uniqueWaypoints.length} điểm)...
          </p>
          <Skeleton className="h-48 w-full rounded" />
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {!loading && segments.length > 0 && (
        <>
          <div className="flex items-center gap-3 text-xs">
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

          {(fallbackSegments > 0 || alternativeVehicleSegments > 0) && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {alternativeVehicleSegments > 0
                ? `${alternativeVehicleSegments} đoạn đã tự đổi phương tiện để tìm đường. `
                : ""}
              {fallbackSegments > 0
                ? `${fallbackSegments} đoạn dùng lộ trình ước lượng đường thẳng do API chưa trả tuyến.`
                : ""}
            </p>
          )}

          {originCoords && allPoints.length > 1 && (
            <div className="h-112 overflow-hidden rounded-lg border bg-background">
              <MapContainer
                key={missionRouteMapKey}
                center={allPoints[0]}
                zoom={10}
                scrollWheelZoom={true}
                dragging={true}
                zoomControl={true}
                attributionControl={false}
                className="h-full w-full"
              >
                <SafeTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
                    : meta?.hasSOS
                      ? "#2563eb"
                      : meta?.hasDepot
                        ? "#a16207"
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
                          <div className="text-xs font-semibold whitespace-nowrap">
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
                    <div className="flex items-center gap-2 text-xs">
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
                  {seg?.steps?.[0]?.instruction ? (
                    <p className="pl-6 text-xs text-muted-foreground">
                      {seg.steps[0].instruction}
                      {seg.steps.length > 1
                        ? ` (+${seg.steps.length - 1} chặng)`
                        : ""}
                    </p>
                  ) : null}
                  {meta?.labels.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pl-6">
                      {meta.labels.map((label) => (
                        <Badge
                          key={`${wpIdx}-${label}`}
                          variant="outline"
                          className="h-4 px-1.5 text-xs"
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
                        className="flex items-center gap-2 text-xs pl-6"
                      >
                        <span className="font-bold text-muted-foreground">
                          {act.step}.
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs h-3.5 px-1",
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
        <p className="text-xs text-muted-foreground">
          Không tìm được tuyến đường. Hãy thử đổi loại phương tiện.
        </p>
      )}
    </div>
  );
};

const MissionTeamRoutePreview = ({
  mission,
  sosRequests,
}: {
  mission: MissionEntity;
  sosRequests: SOSRequest[];
}) => {
  const [open, setOpen] = useState(false);
  const [vehicle, setVehicle] = useState<RouteVehicle>("car");

  const missionRouteTeams = useMemo(() => {
    const teams = mission.teams ?? [];
    const activeTeams = teams.filter(isMissionTeamActive);
    const sourceTeams = activeTeams.length > 0 ? activeTeams : teams;

    return sourceTeams.filter(
      (team) => Number.isFinite(team.missionTeamId) && team.missionTeamId > 0,
    );
  }, [mission.teams]);

  const [selectedMissionTeamId, setSelectedMissionTeamId] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (missionRouteTeams.length === 0) {
      setSelectedMissionTeamId(null);
      return;
    }

    setSelectedMissionTeamId((prev) => {
      if (
        prev != null &&
        missionRouteTeams.some((team) => team.missionTeamId === prev)
      ) {
        return prev;
      }
      return missionRouteTeams[0]?.missionTeamId ?? null;
    });
  }, [missionRouteTeams]);

  const selectedMissionTeam = useMemo(
    () =>
      missionRouteTeams.find(
        (team) => team.missionTeamId === selectedMissionTeamId,
      ) ??
      missionRouteTeams[0] ??
      null,
    [missionRouteTeams, selectedMissionTeamId],
  );

  const originCoords = useMemo(() => {
    const lat = selectedMissionTeam?.latitude;
    const lng = selectedMissionTeam?.longitude;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return {
        lat: HUE_DEFAULT_ORIGIN.lat,
        lng: HUE_DEFAULT_ORIGIN.lng,
      };
    }

    return { lat: lat as number, lng: lng as number };
  }, [selectedMissionTeam?.latitude, selectedMissionTeam?.longitude]);

  const isFallbackOrigin = useMemo(() => {
    const lat = selectedMissionTeam?.latitude;
    const lng = selectedMissionTeam?.longitude;
    return !Number.isFinite(lat) || !Number.isFinite(lng);
  }, [selectedMissionTeam?.latitude, selectedMissionTeam?.longitude]);

  const {
    data: teamRouteData,
    isLoading: isTeamRouteLoading,
    isFetching: isTeamRouteFetching,
    isError: isTeamRouteError,
  } = useMissionTeamRoute(
    open && selectedMissionTeam
      ? {
          missionId: mission.id,
          missionTeamId: selectedMissionTeam.missionTeamId,
          originLat: originCoords.lat,
          originLng: originCoords.lng,
          vehicle,
        }
      : null,
    { enabled: open && !!selectedMissionTeam },
  );

  const routeStatusMeta = useMemo(
    () => getActivityRouteStatusMeta(teamRouteData?.status),
    [teamRouteData?.status],
  );

  const routeErrorMessage =
    typeof teamRouteData?.errorMessage === "string" &&
    teamRouteData.errorMessage.trim().length > 0
      ? teamRouteData.errorMessage.trim()
      : null;

  const routeWaypoints = teamRouteData?.waypoints ?? [];
  const routeLegs = teamRouteData?.legs ?? [];

  const waypointGroups = useMemo(() => {
    if (routeWaypoints.length === 0) return [] as UniqueWaypoint[];

    return routeWaypoints.map((waypoint) => {
      const byId = mission.activities.find(
        (activity) => activity.id === waypoint.activityId,
      );

      if (byId) {
        return {
          lat: waypoint.latitude,
          lng: waypoint.longitude,
          activities: [byId],
        };
      }

      const byStep = mission.activities.filter(
        (activity) => activity.step === waypoint.step,
      );

      if (byStep.length > 0) {
        return {
          lat: waypoint.latitude,
          lng: waypoint.longitude,
          activities: byStep,
        };
      }

      const byCoords = mission.activities.filter(
        (activity) =>
          Math.abs(activity.targetLatitude - waypoint.latitude) <
            COORD_EPSILON &&
          Math.abs(activity.targetLongitude - waypoint.longitude) <
            COORD_EPSILON,
      );

      return {
        lat: waypoint.latitude,
        lng: waypoint.longitude,
        activities: byCoords,
      };
    });
  }, [routeWaypoints, mission.activities]);

  const waypointMetaList = useMemo(
    () =>
      waypointGroups.map((waypoint) => getWaypointMeta(waypoint, sosRequests)),
    [waypointGroups, sosRequests],
  );

  const decodedRoutePoints = useMemo(() => {
    if (!teamRouteData?.overviewPolyline) return [] as [number, number][];

    try {
      return polylineDecode.decode(teamRouteData.overviewPolyline) as [
        number,
        number,
      ][];
    } catch {
      return [] as [number, number][];
    }
  }, [teamRouteData?.overviewPolyline]);

  const displayPoints = useMemo(() => {
    if (decodedRoutePoints.length > 1) return decodedRoutePoints;
    return waypointGroups.map((waypoint) => [waypoint.lat, waypoint.lng]) as [
      number,
      number,
    ][];
  }, [decodedRoutePoints, waypointGroups]);

  const missionRouteMapKey = useMemo(() => {
    if (displayPoints.length > 0) {
      return buildLeafletMapKey(displayPoints);
    }

    return "mission-team-route-empty";
  }, [displayPoints]);

  const totalDistanceMeters = useMemo(() => {
    if (
      teamRouteData &&
      Number.isFinite(teamRouteData.totalDistanceMeters) &&
      teamRouteData.totalDistanceMeters > 0
    ) {
      return teamRouteData.totalDistanceMeters;
    }

    return routeLegs.reduce(
      (sum, leg) =>
        sum + (Number.isFinite(leg.distanceMeters) ? leg.distanceMeters : 0),
      0,
    );
  }, [teamRouteData, routeLegs]);

  const totalDurationSeconds = useMemo(() => {
    if (
      teamRouteData &&
      Number.isFinite(teamRouteData.totalDurationSeconds) &&
      teamRouteData.totalDurationSeconds > 0
    ) {
      return teamRouteData.totalDurationSeconds;
    }

    return routeLegs.reduce(
      (sum, leg) =>
        sum + (Number.isFinite(leg.durationSeconds) ? leg.durationSeconds : 0),
      0,
    );
  }, [teamRouteData, routeLegs]);

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

  const isLoadingRoute = isTeamRouteLoading || isTeamRouteFetching;

  if (missionRouteTeams.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
      >
        <Path className="h-3 w-3" weight="bold" />
        Xem lộ trình tổng hợp ({missionRouteTeams.length} đội)
      </button>
    );
  }

  const selectedTeamLabel =
    selectedMissionTeam?.teamName ||
    (selectedMissionTeam ? `Đội #${selectedMissionTeam.rescueTeamId}` : "-");

  return (
    <div className="mt-2 space-y-1.5 rounded-lg border bg-muted/30 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <NavigationArrow className="h-3 w-3" weight="fill" />
            Lộ trình tổng hợp
          </span>
          {teamRouteData ? (
            <Badge
              variant="outline"
              className={cn("h-5 px-1.5 text-xs", routeStatusMeta.className)}
            >
              {routeStatusMeta.label}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <Select
            value={
              selectedMissionTeamId != null ? String(selectedMissionTeamId) : ""
            }
            onValueChange={(value) => setSelectedMissionTeamId(Number(value))}
          >
            <SelectTrigger className="h-7 w-45 text-xs">
              <SelectValue placeholder="Chọn đội" />
            </SelectTrigger>
            <SelectContent>
              {missionRouteTeams.map((team) => {
                const label = team.teamName || `Đội #${team.rescueTeamId}`;
                return (
                  <SelectItem
                    key={team.missionTeamId}
                    value={String(team.missionTeamId)}
                    className="text-xs"
                  >
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-0.5 overflow-hidden rounded border bg-background">
            {(
              [
                { key: "bike", label: VEHICLE_LABELS.bike },
                { key: "car", label: VEHICLE_LABELS.car },
                { key: "hd", label: VEHICLE_LABELS.hd },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setVehicle(option.key)}
                className={cn(
                  "px-1.5 py-0.5 text-xs font-medium transition-colors",
                  vehicle === option.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {option.label}
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

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <ShieldCheck className="h-3 w-3" weight="fill" />
        Đội: {selectedTeamLabel}
      </p>

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" weight="fill" />
        {isFallbackOrigin
          ? `Vị trí xuất phát mặc định (Huế): ${originCoords.lat.toFixed(4)}, ${originCoords.lng.toFixed(4)}`
          : `Vị trí đội: ${originCoords.lat.toFixed(4)}, ${originCoords.lng.toFixed(4)}`}
      </p>

      {isLoadingRoute && (
        <div className="space-y-1">
          <p className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
            <CircleNotch className="h-3 w-3 animate-spin" />
            Đang tải lộ trình đội...
          </p>
          <Skeleton className="h-48 w-full rounded" />
        </div>
      )}

      {isTeamRouteError && !isLoadingRoute && (
        <p className="text-xs text-red-500">
          Không thể tải lộ trình tổng hợp.
        </p>
      )}

      {routeErrorMessage ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {routeErrorMessage}
        </p>
      ) : null}

      {!isLoadingRoute && teamRouteData && (
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-primary">
            {formatDistance(totalDistanceMeters)}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(totalDurationSeconds)}
          </span>
          <span className="text-muted-foreground">
            {routeWaypoints.length} điểm · {routeLegs.length} chặng
          </span>
        </div>
      )}

      {!isLoadingRoute && displayPoints.length > 1 && (
        <div className="h-112 overflow-hidden rounded-lg border bg-background">
          <MapContainer
            key={missionRouteMapKey}
            center={displayPoints[0]}
            zoom={10}
            scrollWheelZoom={true}
            dragging={true}
            zoomControl={true}
            attributionControl={false}
            className="h-full w-full"
          >
            <SafeTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <RoutePreviewFitBounds points={displayPoints} />

            <Polyline
              positions={displayPoints}
              pathOptions={{
                color: "#FF6B35",
                weight: 5,
                opacity: 0.85,
                lineJoin: "round",
                lineCap: "round",
              }}
            />

            {originCoords ? (
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
            ) : null}

            {waypointGroups.map((waypoint, index) => {
              const isLast = index === waypointGroups.length - 1;
              const meta = waypointMetaList[index];
              const apiWaypoint = routeWaypoints[index];
              const tooltipLabel =
                meta?.labels.length > 0
                  ? meta.labels.join(" • ")
                  : apiWaypoint
                    ? `Bước ${apiWaypoint.step}`
                    : `Điểm ${index + 1}`;

              const markerColor = isLast
                ? "#dc2626"
                : meta?.hasSOS
                  ? "#2563eb"
                  : meta?.hasDepot
                    ? "#a16207"
                    : "#FF6B35";

              return (
                <CircleMarker
                  key={`mission-team-waypoint-${index}`}
                  center={[waypoint.lat, waypoint.lng]}
                  radius={isLast ? 9 : 7}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: markerColor,
                    fillOpacity: 1,
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -10]}
                    opacity={1}
                    permanent
                  >
                    <div className="whitespace-nowrap text-xs font-semibold">
                      {tooltipLabel}
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      )}

      {!isLoadingRoute && waypointGroups.length > 0 && (
        <div className="mt-1 space-y-1.5">
          {waypointGroups.map((waypoint, index) => {
            const leg = index > 0 ? routeLegs[index - 1] : null;
            const meta = waypointMetaList[index];
            const apiWaypoint = routeWaypoints[index];

            return (
              <div
                key={`mission-team-waypoint-legend-${index}`}
                className="space-y-0.5"
              >
                {leg ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-1 w-4 shrink-0 rounded-full bg-[#FF6B35]" />
                    <NavigationArrow
                      className="h-2.5 w-2.5 text-muted-foreground"
                      weight="bold"
                    />
                    <span className="text-muted-foreground">
                      {leg.distanceText || formatDistance(leg.distanceMeters)} ·{" "}
                      {leg.durationText || formatDuration(leg.durationSeconds)}
                    </span>
                  </div>
                ) : null}

                {meta?.labels.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1 pl-6">
                    {meta.labels.map((label) => (
                      <Badge
                        key={`${index}-${label}`}
                        variant="outline"
                        className="h-4 px-1.5 text-xs"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {waypoint.activities.length > 0 ? (
                  waypoint.activities.map((activity) => {
                    const config =
                      activityTypeConfig[activity.activityType] ||
                      activityTypeConfig["ASSESS"];

                    return (
                      <div
                        key={`mission-team-activity-${activity.id}`}
                        className="flex items-center gap-2 pl-6 text-xs"
                      >
                        <span className="font-bold text-muted-foreground">
                          {activity.step}.
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-3.5 px-1 text-xs",
                            config.color,
                            config.bgColor,
                            "border-transparent",
                          )}
                        >
                          {config.label}
                        </Badge>
                      </div>
                    );
                  })
                ) : apiWaypoint ? (
                  <p className="pl-6 text-xs text-muted-foreground">
                    Bước {apiWaypoint.step}: {apiWaypoint.description}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {!isLoadingRoute && displayPoints.length <= 1 && !routeErrorMessage && (
        <p className="text-xs text-muted-foreground">
          Không đủ dữ liệu waypoint để hiển thị bản đồ lộ trình.
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
              className="h-6 text-xs gap-1 px-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
              onClick={onEdit}
            >
              <PencilSimpleLine className="h-3 w-3" />
              Dùng gợi ý này
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
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
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
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
                      "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
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
                          "text-xs font-semibold px-1.5 py-0 h-4",
                          config.color,
                          config.bgColor,
                          "border-transparent",
                        )}
                      >
                        {config.label}
                      </Badge>
                      {act.estimatedTime && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {act.estimatedTime}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                      {act.description}
                    </p>
                    {act.suggestedTeam && (
                      <div className="mt-1.5 rounded-md border border-emerald-200/70 dark:border-emerald-700/50 bg-emerald-50/60 dark:bg-emerald-900/15 px-2 py-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" weight="fill" />
                          Đội đề xuất
                        </p>
                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mt-0.5">
                          {act.suggestedTeam.teamName ||
                            (act.suggestedTeam.teamId
                              ? `Đội #${act.suggestedTeam.teamId}`
                              : "Đội chưa đặt tên")}
                        </p>
                        <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                          {`Loại: ${formatTeamTypeLabel(act.suggestedTeam.teamType)}`}
                          {act.suggestedTeam.contactPhone
                            ? ` • SĐT: ${act.suggestedTeam.contactPhone}`
                            : ""}
                          {act.suggestedTeam.estimatedEtaMinutes != null
                            ? ` • ETA: ${act.suggestedTeam.estimatedEtaMinutes} phút`
                            : ""}
                        </p>
                        {act.suggestedTeam.reason && (
                          <p className="text-xs text-emerald-700/75 dark:text-emerald-300/75 mt-1 leading-relaxed">
                            Lý do: {act.suggestedTeam.reason}
                          </p>
                        )}
                        {act.suggestedTeam.assemblyPointName && (
                          <p className="text-xs text-emerald-700/75 dark:text-emerald-300/75 mt-0.5 leading-relaxed">
                            Điểm tập kết đội:{" "}
                            {act.suggestedTeam.assemblyPointName}
                          </p>
                        )}
                      </div>
                    )}
                    {(act.assemblyPointName ||
                      (act.assemblyPointLatitude != null &&
                        act.assemblyPointLongitude != null)) && (
                      <div className="mt-1 rounded-md border border-blue-200/70 dark:border-blue-700/50 bg-blue-50/60 dark:bg-blue-900/15 px-2 py-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <MapPin className="h-3 w-3" weight="fill" />
                          Điểm tập kết hoạt động
                        </p>
                        {act.assemblyPointName && (
                          <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mt-0.5">
                            {act.assemblyPointName}
                          </p>
                        )}
                        {formatCoordinateLabel(
                          act.assemblyPointLatitude,
                          act.assemblyPointLongitude,
                        ) && (
                          <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                            Tọa độ:{" "}
                            {formatCoordinateLabel(
                              act.assemblyPointLatitude,
                              act.assemblyPointLongitude,
                            )}
                          </p>
                        )}
                      </div>
                    )}
                    {act.suppliesToCollect &&
                      act.suppliesToCollect.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {act.suppliesToCollect.map((supply, sIdx) => (
                            <div
                              key={sIdx}
                              className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400"
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
  type PendingRemoval =
    | {
        type: "activity";
        activityId: string;
        displayStep: number;
        hasSupplyItems: boolean;
      }
    | {
        type: "supply";
        activityId: string;
        supplyIndex: number;
        supplyName: string;
      };

  const [editActivities, setEditActivities] = useState<EditableActivity[]>([]);
  const [editMissionType, setEditMissionType] = useState<MissionType>("RESCUE");
  const [editPriorityScore, setEditPriorityScore] = useState(5);
  const [editStartTime, setEditStartTime] = useState("");
  const [editExpectedEndTime, setEditExpectedEndTime] = useState("");
  const [editingMissionId, setEditingMissionId] = useState<number | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(
    null,
  );
  const supplyUnitByItemIdRef = useRef<Record<number, string>>({});

  const { mutate: createMission, isPending: isCreatingMission } =
    useCreateMission();

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setEditActivities([]);
    setEditingMissionId(null);
  }, []);

  const updateEditActivity = useCallback(
    (id: string, field: string, value: string | number | null) => {
      setEditActivities((prev) =>
        prev.map((a) => {
          if (a._id !== id) return a;

          // Only supply-related activities should keep the supply list.
          if (field === "activityType") {
            const nextType = value as ClusterActivityType;
            if (!isSupplyStep(nextType)) {
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

  useEffect(() => {
    const next = { ...supplyUnitByItemIdRef.current };

    for (const activity of editActivities) {
      for (const supply of activity.suppliesToCollect ?? []) {
        if (typeof supply.itemId !== "number") continue;
        const unit = typeof supply.unit === "string" ? supply.unit.trim() : "";
        if (unit) {
          next[supply.itemId] = unit;
        }
      }
    }

    supplyUnitByItemIdRef.current = next;
  }, [editActivities]);

  // ── Supply management for edit mode ──
  const handleAddSupply = useCallback(
    (
      activityId: string,
      item: {
        itemId: number;
        itemName: string;
        availableQuantity: number;
        unit?: string | null;
        sourceDepotId?: number | null;
        sourceDepotName?: string | null;
        sourceDepotAddress?: string | null;
      },
    ) => {
      setEditActivities((prev) =>
        prev.map((a) => {
          if (a._id !== activityId) return a;

          const dragUnit =
            typeof item.unit === "string" ? item.unit.trim() : "";
          const cachedUnit =
            supplyUnitByItemIdRef.current[item.itemId]?.trim() ?? "";
          const resolvedUnit = dragUnit || cachedUnit || "đơn vị";
          if (resolvedUnit) {
            supplyUnitByItemIdRef.current[item.itemId] = resolvedUnit;
          }

          const nextDepotId =
            a.activityType === "COLLECT_SUPPLIES" &&
            typeof item.sourceDepotId === "number" &&
            item.sourceDepotId > 0
              ? item.sourceDepotId
              : a.depotId;
          const nextDepotName =
            a.activityType === "COLLECT_SUPPLIES" &&
            typeof item.sourceDepotName === "string" &&
            item.sourceDepotName.trim()
              ? item.sourceDepotName.trim()
              : a.depotName;
          const nextDepotAddress =
            a.activityType === "COLLECT_SUPPLIES" &&
            typeof item.sourceDepotAddress === "string" &&
            item.sourceDepotAddress.trim()
              ? item.sourceDepotAddress.trim()
              : a.depotAddress;

          const existing = a.suppliesToCollect ?? [];
          const foundIdx = existing.findIndex((s) => s.itemId === item.itemId);
          if (foundIdx >= 0) {
            const next = [...existing];
            const currentUnit =
              typeof next[foundIdx].unit === "string"
                ? next[foundIdx].unit.trim()
                : "";
            const shouldUpgradeUnit =
              (!currentUnit || currentUnit === "đơn vị") &&
              resolvedUnit !== "đơn vị";
            next[foundIdx] = {
              ...next[foundIdx],
              quantity: next[foundIdx].quantity + 1,
              unit: shouldUpgradeUnit ? resolvedUnit : next[foundIdx].unit,
            };
            return {
              ...a,
              depotId: nextDepotId,
              depotName: nextDepotName,
              depotAddress: nextDepotAddress,
              suppliesToCollect: next,
            };
          }
          return {
            ...a,
            depotId: nextDepotId,
            depotName: nextDepotName,
            depotAddress: nextDepotAddress,
            suppliesToCollect: [
              ...existing,
              {
                itemId: item.itemId,
                itemName: item.itemName,
                quantity: 1,
                unit: resolvedUnit,
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

  const handleRemoveActivityWithConfirm = useCallback(
    (activity: EditableActivity, displayStep: number) => {
      setPendingRemoval({
        type: "activity",
        activityId: activity._id,
        displayStep,
        hasSupplyItems: (activity.suppliesToCollect?.length ?? 0) > 0,
      });
      setRemoveConfirmOpen(true);
    },
    [],
  );

  const handleRemoveSupplyWithConfirm = useCallback(
    (activityId: string, supplyIndex: number, supplyName: string) => {
      setPendingRemoval({
        type: "supply",
        activityId,
        supplyIndex,
        supplyName,
      });
      setRemoveConfirmOpen(true);
    },
    [],
  );

  const handleRemoveConfirmOpenChange = useCallback((open: boolean) => {
    setRemoveConfirmOpen(open);
    if (!open) {
      setPendingRemoval(null);
    }
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (!pendingRemoval) return;

    if (pendingRemoval.type === "activity") {
      removeEditActivity(pendingRemoval.activityId);
    } else {
      handleRemoveSupply(pendingRemoval.activityId, pendingRemoval.supplyIndex);
    }

    setRemoveConfirmOpen(false);
    setPendingRemoval(null);
  }, [pendingRemoval, removeEditActivity, handleRemoveSupply]);

  const validateEditMission = useCallback(() => {
    if (!clusterId) return false;
    if (editActivities.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 hoạt động");
      return false;
    }
    for (let i = 0; i < editActivities.length; i++) {
      if (!editActivities[i].description.trim()) {
        toast.error(`Bước ${i + 1}: Vui lòng nhập mô tả`);
        return false;
      }
    }
    if (!editStartTime || !editExpectedEndTime) {
      toast.error("Vui lòng chọn thời gian bắt đầu và kết thúc");
      return false;
    }

    return true;
  }, [clusterId, editActivities, editStartTime, editExpectedEndTime]);

  const handleOpenSubmitConfirm = useCallback(() => {
    if (!validateEditMission()) return;
    setConfirmSubmitOpen(true);
  }, [validateEditMission]);

  const handleSubmitEdit = useCallback(() => {
    if (!validateEditMission() || !clusterId) return;

    setConfirmSubmitOpen(false);

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

          const rawSosRequestId =
            a.sosRequestId != null ? Number(a.sosRequestId) : Number(sos?.id);
          const sosRequestId =
            Number.isFinite(rawSosRequestId) && rawSosRequestId > 0
              ? rawSosRequestId
              : null;

          const rawDepotId = a.depotId != null ? Number(a.depotId) : Number.NaN;
          const depotId =
            Number.isFinite(rawDepotId) && rawDepotId > 0 ? rawDepotId : null;

          const depotName =
            typeof a.depotName === "string" && a.depotName.trim()
              ? a.depotName.trim()
              : null;

          const depotAddress =
            typeof a.depotAddress === "string" && a.depotAddress.trim()
              ? a.depotAddress.trim()
              : null;

          const rawAssemblyPointId =
            a.assemblyPointId != null ? Number(a.assemblyPointId) : Number.NaN;
          const assemblyPointId =
            Number.isFinite(rawAssemblyPointId) && rawAssemblyPointId > 0
              ? rawAssemblyPointId
              : null;
          const assemblyPointName =
            typeof a.assemblyPointName === "string" &&
            a.assemblyPointName.trim()
              ? a.assemblyPointName.trim()
              : null;
          const rawAssemblyPointLat =
            a.assemblyPointLatitude != null
              ? Number(a.assemblyPointLatitude)
              : Number.NaN;
          const assemblyPointLatitude = Number.isFinite(rawAssemblyPointLat)
            ? rawAssemblyPointLat
            : null;
          const rawAssemblyPointLng =
            a.assemblyPointLongitude != null
              ? Number(a.assemblyPointLongitude)
              : Number.NaN;
          const assemblyPointLongitude = Number.isFinite(rawAssemblyPointLng)
            ? rawAssemblyPointLng
            : null;

          const selectedSos =
            sosRequestId != null
              ? clusterSOSRequests.find(
                  (s) => String(s.id) === String(sosRequestId),
                )
              : null;

          const rawRescueTeamId = Number(a.suggestedTeam?.teamId);
          const rescueTeamId =
            Number.isFinite(rawRescueTeamId) && rawRescueTeamId > 0
              ? rawRescueTeamId
              : null;

          return {
            step: i + 1,
            activityCode: `${a.activityType}_${i + 1}`,
            activityType: a.activityType,
            description: syncedDescription,
            priority: a.priority || "Medium",
            estimatedTime: Number.parseInt(String(a.estimatedTime), 10) || 30,
            sosRequestId,
            depotId,
            depotName,
            depotAddress,
            assemblyPointId,
            assemblyPointName,
            assemblyPointLatitude,
            assemblyPointLongitude,
            suppliesToCollect: (a.suppliesToCollect ?? []).map((s) => ({
              id: typeof s.itemId === "number" ? s.itemId : null,
              name:
                typeof s.itemName === "string" && s.itemName.trim()
                  ? s.itemName.trim()
                  : null,
              quantity: s.quantity,
              unit: s.unit,
            })),
            target: depotName || `SOS ${sosRequestId || sos?.id || "unknown"}`,
            targetLatitude:
              extractCoordsFromDescription(syncedDescription)?.lat ??
              (sosRequestId
                ? (selectedSos?.location?.lat ?? sos?.location?.lat ?? 0)
                : (sos?.location?.lat ?? 0)),
            targetLongitude:
              extractCoordsFromDescription(syncedDescription)?.lng ??
              (sosRequestId
                ? (selectedSos?.location?.lng ?? sos?.location?.lng ?? 0)
                : (sos?.location?.lng ?? 0)),
            rescueTeamId,
          };
        }),
      },
      {
        onSuccess: () => {
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
    validateEditMission,
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

  const {
    data: nearbyTeamsByClusterData,
    isLoading: isNearbyTeamsByClusterLoading,
  } = useRescueTeamsByCluster(clusterId ?? 0, {
    enabled: open && isEditMode && !!clusterId && clusterId > 0,
  });

  const nearbyRescueTeams = useMemo(() => {
    const sourceTeams = nearbyTeamsByClusterData ?? [];

    return [...sourceTeams].sort((a, b) => {
      const statusRankDiff =
        getRescueTeamOperationalRank(a.status) -
        getRescueTeamOperationalRank(b.status);
      if (statusRankDiff !== 0) {
        return statusRankDiff;
      }

      const distanceA = Number.isFinite(a.distanceKm)
        ? a.distanceKm
        : Number.POSITIVE_INFINITY;
      const distanceB = Number.isFinite(b.distanceKm)
        ? b.distanceKm
        : Number.POSITIVE_INFINITY;
      if (distanceA !== distanceB) {
        return distanceA - distanceB;
      }

      return a.name.localeCompare(b.name, "vi");
    });
  }, [nearbyTeamsByClusterData]);

  const nearbyRescueTeamById = useMemo(
    () => new Map(nearbyRescueTeams.map((team) => [team.id, team])),
    [nearbyRescueTeams],
  );

  const updateEditActivitySuggestedTeam = useCallback(
    (activityId: string, team: RescueTeamByClusterEntity | null) => {
      setEditActivities((previous) =>
        previous.map((activity) => {
          if (activity._id !== activityId) {
            return activity;
          }

          if (!team) {
            return {
              ...activity,
              suggestedTeam: null,
            };
          }

          return {
            ...activity,
            suggestedTeam: {
              teamId: team.id,
              teamName: team.name,
              teamType: team.teamType,
              assemblyPointName: team.assemblyPointName,
              reason: `Điều phối viên cập nhật từ danh sách đội gần cụm SOS (${formatDistanceKmLabel(team.distanceKm)}).`,
            },
          };
        }),
      );
    },
    [],
  );

  const handleSelectNearbyTeamForActivity = useCallback(
    (activityId: string, value: string) => {
      if (value === CLEAR_ACTIVITY_TEAM_VALUE) {
        updateEditActivitySuggestedTeam(activityId, null);
        return;
      }

      const teamId = Number(value);
      if (!Number.isFinite(teamId)) {
        return;
      }

      const team = nearbyRescueTeamById.get(teamId);
      if (!team) {
        return;
      }

      updateEditActivitySuggestedTeam(activityId, team);
    },
    [nearbyRescueTeamById, updateEditActivitySuggestedTeam],
  );

  const getNearbyTeamsForActivity = useCallback(
    (activity: EditableActivity) => {
      const normalizedAssemblyPointName =
        typeof activity.assemblyPointName === "string"
          ? activity.assemblyPointName.trim().toLowerCase()
          : "";

      if (!normalizedAssemblyPointName) {
        return nearbyRescueTeams.slice(0, 8);
      }

      const sameAssemblyPointTeams: RescueTeamByClusterEntity[] = [];
      const otherTeams: RescueTeamByClusterEntity[] = [];

      for (const team of nearbyRescueTeams) {
        const normalizedTeamAssemblyPointName =
          typeof team.assemblyPointName === "string"
            ? team.assemblyPointName.trim().toLowerCase()
            : "";

        if (
          normalizedTeamAssemblyPointName &&
          normalizedTeamAssemblyPointName === normalizedAssemblyPointName
        ) {
          sameAssemblyPointTeams.push(team);
        } else {
          otherTeams.push(team);
        }
      }

      return [...sameAssemblyPointTeams, ...otherTeams].slice(0, 8);
    },
    [nearbyRescueTeams],
  );

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
    setEditMissionType(
      normalizeEditMissionType(activeSuggestion?.suggestedMissionType),
    );
    const now = new Date();
    setEditStartTime(now.toISOString().slice(0, 16));
    const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    setEditExpectedEndTime(end.toISOString().slice(0, 16));
    setEditingMissionId(null);
    setIsEditMode(true);
  }, [activeSuggestion]);

  // Enter edit from an existing mission (missions tab -> edit)
  const enterEditFromMission = useCallback(
    (mission: MissionEntity) => {
      const sortedActivities = [...mission.activities].sort((a, b) => {
        if (a.step !== b.step) {
          return a.step - b.step;
        }
        return a.id - b.id;
      });

      const missionTeamsByMissionTeamId = new Map(
        (mission.teams ?? []).map((team) => [team.missionTeamId, team]),
      );

      setEditActivities(
        sortedActivities.map((a, i) => {
          const inferredSosRequestId = inferSOSRequestIdFromActivity(
            a,
            clusterSOSRequests,
          );
          const isDepot = a.activityType === "COLLECT_SUPPLIES";
          const linkedMissionTeam =
            typeof a.missionTeamId === "number"
              ? missionTeamsByMissionTeamId.get(a.missionTeamId)
              : null;

          return {
            _id: `edit-m-${i}-${Date.now()}`,
            step: a.step,
            activityType: a.activityType as ClusterActivityType,
            description: a.description,
            priority: "Medium",
            estimatedTime: "",
            sosRequestId: isDepot
              ? null
              : inferredSosRequestId
                ? Number(inferredSosRequestId)
                : null,
            depotId: isDepot ? (a.depotId ?? null) : null,
            depotName: isDepot ? (a.depotName ?? a.target ?? null) : null,
            depotAddress: isDepot ? (a.depotAddress ?? null) : null,
            assemblyPointId: a.assemblyPointId ?? null,
            assemblyPointName: a.assemblyPointName ?? null,
            assemblyPointLatitude: a.assemblyPointLatitude ?? null,
            assemblyPointLongitude: a.assemblyPointLongitude ?? null,
            suppliesToCollect: a.suppliesToCollect,
            suggestedTeam: linkedMissionTeam
              ? {
                  teamId: linkedMissionTeam.rescueTeamId,
                  teamName: linkedMissionTeam.teamName,
                  teamType: linkedMissionTeam.teamType,
                  assemblyPointName: linkedMissionTeam.assemblyPointName,
                  latitude: linkedMissionTeam.latitude,
                  longitude: linkedMissionTeam.longitude,
                  reason: "Đồng bộ từ nhiệm vụ hiện tại.",
                }
              : null,
          };
        }),
      );
      setEditMissionType(normalizeEditMissionType(mission.missionType));
      setEditPriorityScore(mission.priorityScore);
      setEditStartTime(new Date(mission.startTime).toISOString().slice(0, 16));
      setEditExpectedEndTime(
        new Date(mission.expectedEndTime).toISOString().slice(0, 16),
      );
      setEditingMissionId(mission.id);
      setActiveTab("plan");
      setIsEditMode(true);
    },
    [clusterSOSRequests],
  );

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

  useDepotInventoryRealtime({
    depotIds: sidebarDepots.map((depot) => depot.depotId),
    missionId: editingMissionId,
    enabled: open && sidebarDepots.length > 0,
  });

  const sortedMissions = useMemo(() => {
    const source = (missionsData?.missions ?? []).slice();
    return source.sort((a, b) => {
      const aAssigned = getActiveMissionTeams(a).length > 0 ? 1 : 0;
      const bAssigned = getActiveMissionTeams(b).length > 0 ? 1 : 0;
      if (aAssigned !== bAssigned) return bAssigned - aAssigned;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [missionsData?.missions]);

  const assignedMissionCount = useMemo(
    () =>
      sortedMissions.filter(
        (mission) => getActiveMissionTeams(mission).length > 0,
      ).length,
    [sortedMissions],
  );

  const severity = activeSuggestion
    ? severityConfig[activeSuggestion.suggestedSeverityLevel] ||
      severityConfig["Medium"]
    : null;

  // Group activities by SOS request or depot
  type ActivityGroup = {
    type: "sos" | "depot";
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

    const fallbackSosRequestId =
      clusterSOSRequests.length > 0 ? Number(clusterSOSRequests[0].id) : null;

    const groups: ActivityGroup[] = [];
    for (const act of sourceActivities) {
      const isDepot = act.activityType === "COLLECT_SUPPLIES" && act.depotId;
      const resolvedSosRequestId = isDepot
        ? null
        : (act.sosRequestId ?? fallbackSosRequestId);
      const key = isDepot
        ? `depot-${act.depotId}`
        : `sos-${resolvedSosRequestId ?? "unknown"}`;
      const last = groups[groups.length - 1];
      const lastKey = last
        ? last.type === "depot"
          ? `depot-${last.depotId}`
          : `sos-${last.sosRequestId ?? "unknown"}`
        : null;
      if (lastKey === key) {
        last.activities.push(act);
      } else {
        groups.push({
          type: isDepot ? "depot" : "sos",
          sosRequestId: resolvedSosRequestId,
          depotId: act.depotId,
          depotName: act.depotName,
          depotAddress: act.depotAddress,
          activities: [act],
        });
      }
    }
    return groups;
  }, [activeSuggestion, clusterSOSRequests]);

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

  const removeDialogTitle =
    pendingRemoval?.type === "activity"
      ? "Xác nhận xóa bước trong kế hoạch"
      : "Xác nhận xóa vật tư khỏi gợi ý AI";

  const removeDialogDescription =
    pendingRemoval?.type === "activity"
      ? pendingRemoval.hasSupplyItems
        ? `Bạn sắp xóa Bước ${pendingRemoval.displayStep} trong kế hoạch AI. Toàn bộ vật tư và nội dung thuộc bước này sẽ bị loại khỏi kế hoạch khi xác nhận nhiệm vụ.`
        : `Bạn sắp xóa Bước ${pendingRemoval.displayStep} trong kế hoạch AI. Bước này sẽ không còn trong nhiệm vụ khi bạn xác nhận.`
      : pendingRemoval?.type === "supply"
        ? `Bạn có chắc chắn muốn xóa vật tư \"${pendingRemoval.supplyName}\" khỏi gợi ý AI này không? Vật tư này sẽ bị loại khỏi kế hoạch khi bạn xác nhận nhiệm vụ.`
        : "";

  return (
    <div
      className={cn(
        "absolute inset-0 z-1100 transition-all duration-500 ease-out",
        open
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-full pointer-events-none",
      )}
    >
      <div className="h-full bg-background backdrop-blur-sm shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 p-3 pb-2 border-b shrink-0 bg-linear-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-sm">
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
                        className="text-xs px-1.5 py-0 h-5 gap-1"
                      >
                        <TreeStructure className="h-3 w-3" weight="fill" />
                        {clusterSOSRequests.length} SOS
                      </Badge>
                      <Badge
                        variant={severity!.variant}
                        className="text-xs px-1.5 py-0 h-5"
                      >
                        {severity!.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs px-1.5 py-0 h-5"
                      >
                        {formatMissionTypeLabel(
                          activeSuggestion.suggestedMissionType,
                        )}
                      </Badge>
                      {activeSuggestion.multiDepotRecommended && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0 h-5 border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                        >
                          Nhiều kho
                        </Badge>
                      )}
                      {activeSuggestion.needsManualReview && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0 h-5 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
                        >
                          Cần duyệt tay
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs px-1.5 py-0 h-5 gap-1"
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
                className="text-xs gap-1 px-1.5 py-0 h-5"
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
                    <div className="text-xs text-muted-foreground truncate">
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
                className="text-xs h-4 px-1.5 ml-1.5"
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <ListChecks className="h-3.5 w-3.5" weight="bold" />
                          Nhiệm vụ đã tạo cho cụm này
                        </h3>
                        {sortedMissions.length > 0 && (
                          <>
                            <Badge
                              variant="outline"
                              className="text-xs h-5 px-1.5 border-emerald-300/70 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
                            >
                              Đã phân công: {assignedMissionCount}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs h-5 px-1.5 border-amber-300/70 text-amber-700 dark:border-amber-700 dark:text-amber-300"
                            >
                              Chờ phân công:{" "}
                              {sortedMissions.length - assignedMissionCount}
                            </Badge>
                          </>
                        )}
                      </div>
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
                    ) : sortedMissions.length > 0 ? (
                      <div className="space-y-3">
                        {sortedMissions.map((mission) => {
                          const activeMissionTeams =
                            getActiveMissionTeams(mission);
                          const hasAssignedTeams =
                            activeMissionTeams.length > 0;

                          return (
                            <Card
                              key={mission.id}
                              className={cn(
                                "overflow-hidden border-2",
                                hasAssignedTeams
                                  ? "border-emerald-300/70 dark:border-emerald-700/60"
                                  : "border-amber-300/70 dark:border-amber-700/60",
                              )}
                            >
                              <CardContent className="p-3 space-y-2">
                                {(() => {
                                  const normalizedStatus = mission.status
                                    .trim()
                                    .toLowerCase();
                                  const statusText =
                                    normalizedStatus === "completed"
                                      ? "Hoàn thành"
                                      : normalizedStatus === "inprogress" ||
                                          normalizedStatus === "in_progress" ||
                                          normalizedStatus === "in progress"
                                        ? "Đang thực hiện"
                                        : normalizedStatus === "cancelled" ||
                                            normalizedStatus === "canceled"
                                          ? "Đã hủy"
                                          : normalizedStatus === "pending"
                                            ? "Chờ xử lý"
                                            : normalizedStatus === "planned"
                                              ? "Đã lập kế hoạch"
                                              : mission.status;
                                  const statusClass =
                                    normalizedStatus === "completed"
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700"
                                      : normalizedStatus === "inprogress" ||
                                          normalizedStatus === "in_progress" ||
                                          normalizedStatus === "in progress"
                                        ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                                        : normalizedStatus === "cancelled" ||
                                            normalizedStatus === "canceled"
                                          ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700"
                                          : normalizedStatus === "pending" ||
                                              normalizedStatus === "planned"
                                            ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                                            : "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-600";

                                  return (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Rocket
                                          className="h-4 w-4 text-emerald-500 shrink-0"
                                          weight="fill"
                                        />
                                        <span className="text-base font-bold truncate">
                                          {mission.suggestedMissionTitle ||
                                            `Nhiệm vụ #${mission.id}`}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-xs h-5 px-2 shrink-0 font-semibold"
                                        >
                                          {formatMissionTypeLabel(
                                            mission.missionType,
                                          )}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-xs gap-1 px-2.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                                          onClick={() =>
                                            enterEditFromMission(mission)
                                          }
                                        >
                                          <PencilSimpleLine className="h-3.5 w-3.5" />
                                          Chỉnh sửa
                                        </Button>
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-xs h-7 px-3 font-extrabold uppercase tracking-wide border-2",
                                            statusClass,
                                          )}
                                        >
                                          {statusText}
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div
                                  className={cn(
                                    "rounded-lg border px-2.5 py-2",
                                    hasAssignedTeams
                                      ? "border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-700/50 dark:bg-emerald-900/15"
                                      : "border-amber-200/80 bg-amber-50/60 dark:border-amber-700/50 dark:bg-amber-900/15",
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <p
                                      className={cn(
                                        "text-xs font-bold uppercase tracking-wider flex items-center gap-1",
                                        hasAssignedTeams
                                          ? "text-emerald-700 dark:text-emerald-300"
                                          : "text-amber-700 dark:text-amber-300",
                                      )}
                                    >
                                      <ShieldCheck
                                        className="h-3.5 w-3.5"
                                        weight="fill"
                                      />
                                      {hasAssignedTeams
                                        ? `Đã phân công ${activeMissionTeams.length} đội cứu hộ`
                                        : "Chưa phân công đội cứu hộ"}
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs h-5 px-1.5",
                                        hasAssignedTeams
                                          ? "border-emerald-300/80 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
                                          : "border-amber-300/80 text-amber-700 dark:border-amber-700 dark:text-amber-300",
                                      )}
                                    >
                                      {hasAssignedTeams
                                        ? "Giám sát đang hoạt động"
                                        : "Cần phân công"}
                                    </Badge>
                                  </div>
                                  {hasAssignedTeams && (
                                    <p className="text-xs text-foreground/75 mt-1 line-clamp-2">
                                      {activeMissionTeams
                                        .map(
                                          (team) =>
                                            team.teamName ||
                                            `Đội #${team.rescueTeamId}`,
                                        )
                                        .join(" • ")}
                                    </p>
                                  )}
                                </div>

                                {/* AI assessment */}
                                {mission.overallAssessment && (
                                  <div className="bg-muted/40 rounded-lg p-2.5 border border-border/50">
                                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
                                      {mission.overallAssessment}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
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
                                  {mission.suggestedSeverityLevel && (
                                    <span>
                                      Mức độ: {mission.suggestedSeverityLevel}
                                    </span>
                                  )}
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
                                      {(
                                        mission.aiConfidenceScore * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  )}
                                </div>

                                {/* Suggested Resources */}
                                {mission.suggestedResources &&
                                  mission.suggestedResources.length > 0 && (
                                    <div className="mt-1">
                                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                                        <Cube
                                          className="h-3 w-3"
                                          weight="bold"
                                        />
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
                                                <span className="text-xs font-medium truncate flex-1 min-w-0">
                                                  {resource.description}
                                                </span>
                                                <span className="text-xs font-bold text-primary shrink-0">
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
                                    <p className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-0.5 flex items-center gap-1">
                                      <Warning
                                        className="h-3 w-3"
                                        weight="fill"
                                      />
                                      Lưu ý
                                    </p>
                                    <p className="text-xs text-foreground/75 leading-relaxed">
                                      {mission.specialNotes}
                                    </p>
                                  </div>
                                )}

                                {/* Activities Grouped */}
                                {mission.activities.length > 0 && (
                                  <div className="space-y-4 mt-4">
                                    {(() => {
                                      const groups = [];
                                      const sortedActivities = [
                                        ...mission.activities,
                                      ].sort((a, b) => {
                                        if (a.step !== b.step) {
                                          return a.step - b.step;
                                        }
                                        return a.id - b.id;
                                      });

                                      for (const act of sortedActivities) {
                                        // Only pickup steps belong to depot groups.
                                        // Delivery steps should stay in SOS groups even if they contain depot info.
                                        const isDepot =
                                          act.activityType ===
                                          "COLLECT_SUPPLIES";
                                        let targetType = "sos";
                                        let sosRequestId = undefined;
                                        let depotName = undefined;
                                        const targetStr =
                                          act.depotName || act.target || "";

                                        if (isDepot) {
                                          depotName = targetStr;
                                          targetType = "depot";
                                        } else {
                                          sosRequestId =
                                            inferSOSRequestIdFromActivity(
                                              act,
                                              clusterSOSRequests,
                                            ) ?? "unknown";
                                        }

                                        const key =
                                          targetType === "depot"
                                            ? `depot-${depotName}`
                                            : `sos-${sosRequestId}`;

                                        const last = groups[groups.length - 1];
                                        if (last && last.key === key) {
                                          last.activities.push(act);
                                        } else {
                                          groups.push({
                                            key,
                                            type: targetType,
                                            sosRequestId,
                                            depotName,
                                            activities: [act],
                                          });
                                        }
                                      }

                                      return groups.map((group, gIdx) => {
                                        const matchedSOS =
                                          group.type === "sos" &&
                                          group.sosRequestId
                                            ? clusterSOSRequests.find(
                                                (s) =>
                                                  s.id ===
                                                  String(group.sosRequestId),
                                              )
                                            : null;

                                        return (
                                          <div
                                            key={gIdx}
                                            className={cn(
                                              "rounded-xl border overflow-hidden shadow-sm",
                                              group.type === "depot"
                                                ? "border-amber-300/50 dark:border-amber-700/40"
                                                : group.type === "sos" &&
                                                    matchedSOS?.priority ===
                                                      "P1"
                                                  ? "border-red-300/50 dark:border-red-700/40"
                                                  : group.type === "sos" &&
                                                      matchedSOS?.priority ===
                                                        "P2"
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
                                                      matchedSOS?.priority ===
                                                        "P1"
                                                    ? "bg-red-50 dark:bg-red-900/15"
                                                    : group.type === "sos" &&
                                                        matchedSOS?.priority ===
                                                          "P2"
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
                                                      Kho:{" "}
                                                      <span className="underline decoration-amber-400 decoration-2 underline-offset-2">
                                                        {group.depotName}
                                                      </span>
                                                    </p>
                                                  </div>
                                                  <Badge
                                                    variant="outline"
                                                    className="text-xs h-5 px-1.5 shrink-0 border-amber-400/60 text-amber-700 dark:text-amber-300 font-semibold"
                                                  >
                                                    {group.activities.length}{" "}
                                                    bước
                                                  </Badge>
                                                </>
                                              ) : group.type === "sos" &&
                                                matchedSOS ? (
                                                <SOSGroupHeader
                                                  matchedSOS={matchedSOS}
                                                  groupActivitiesLength={
                                                    group.activities.length
                                                  }
                                                />
                                              ) : (
                                                <>
                                                  <div className="p-1.5 rounded-lg bg-blue-100/80 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                                                    <ListChecks
                                                      className="h-4 w-4"
                                                      weight="fill"
                                                    />
                                                  </div>
                                                  <p className="text-sm font-bold text-blue-800 dark:text-blue-300 flex-1">
                                                    {group.type === "sos"
                                                      ? `SOS ${group.sosRequestId ?? "unknown"}`
                                                      : "Cụm nhiệm vụ"}
                                                  </p>
                                                  <Badge
                                                    variant="outline"
                                                    className="text-xs h-5 px-1.5 shrink-0"
                                                  >
                                                    {group.activities.length}{" "}
                                                    bước
                                                  </Badge>
                                                </>
                                              )}
                                            </div>

                                            <div className="p-3 space-y-2.5 bg-card">
                                              {group.activities.map(
                                                (activity) => {
                                                  const assignedMissionTeams = (
                                                    mission.teams ?? []
                                                  ).filter((team) => {
                                                    const normalizedStatus = (
                                                      team.status ?? ""
                                                    )
                                                      .trim()
                                                      .toLowerCase();
                                                    return (
                                                      team.unassignedAt ==
                                                        null &&
                                                      (normalizedStatus ===
                                                        "assigned" ||
                                                        normalizedStatus ===
                                                          "inprogress" ||
                                                        normalizedStatus ===
                                                          "in_progress" ||
                                                        normalizedStatus ===
                                                          "in progress")
                                                    );
                                                  });
                                                  const teamsForStep =
                                                    typeof activity.missionTeamId ===
                                                    "number"
                                                      ? (
                                                          mission.teams ?? []
                                                        ).filter(
                                                          (team) =>
                                                            team.missionTeamId ===
                                                            activity.missionTeamId,
                                                        )
                                                      : assignedMissionTeams.length >
                                                          0
                                                        ? assignedMissionTeams
                                                        : (mission.teams ?? []);
                                                  const config =
                                                    activityTypeConfig[
                                                      activity.activityType
                                                    ] ||
                                                    activityTypeConfig[
                                                      "ASSESS"
                                                    ];
                                                  const cleanDescription =
                                                    activity.description
                                                      .replace(
                                                        /\b\d{1,2}\.\d+,\s*\d{1,2}\.\d+\b\s*(\([^\)]*\))?/g,
                                                        "",
                                                      )
                                                      .replace(/\s+/g, " ")
                                                      .replace(/\(\s*\)/g, "")
                                                      .replace(/: \./g, ":")
                                                      .trim();
                                                  const supplyItems =
                                                    getSupplyDisplayItems(
                                                      activity,
                                                    );
                                                  const displayDescription =
                                                    supplyItems.length > 0
                                                      ? stripSupplyDetailsFromDescription(
                                                          cleanDescription,
                                                        )
                                                      : cleanDescription;
                                                  const stepStatus =
                                                    getActivityStatusMeta(
                                                      activity.status,
                                                    );

                                                  return (
                                                    <div
                                                      key={activity.id}
                                                      className="rounded-lg border bg-background p-3 hover:bg-accent/20 transition-colors shadow-sm"
                                                    >
                                                      <div className="flex items-start gap-3">
                                                        <div
                                                          className={cn(
                                                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
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
                                                                "text-xs font-semibold px-2 py-0 h-5",
                                                                config.color,
                                                                config.bgColor,
                                                                "border-transparent",
                                                              )}
                                                            >
                                                              {config.label}
                                                            </Badge>
                                                            <Badge
                                                              variant="outline"
                                                              className={cn(
                                                                "text-xs h-6 px-2 font-bold border flex items-center gap-1",
                                                                stepStatus.className,
                                                              )}
                                                            >
                                                              {stepStatus.icon}
                                                              {stepStatus.label}
                                                            </Badge>
                                                            {activity.priority ? (
                                                              <Badge
                                                                variant="outline"
                                                                className="text-xs h-6 px-2 font-semibold"
                                                              >
                                                                Ưu tiên:{" "}
                                                                {
                                                                  activity.priority
                                                                }
                                                              </Badge>
                                                            ) : null}
                                                            {typeof activity.estimatedTime ===
                                                            "number" ? (
                                                              <Badge
                                                                variant="outline"
                                                                className="text-xs h-6 px-2 font-semibold"
                                                              >
                                                                ETA:{" "}
                                                                {
                                                                  activity.estimatedTime
                                                                }{" "}
                                                                phút
                                                              </Badge>
                                                            ) : null}
                                                          </div>
                                                          <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                                                            {displayDescription}
                                                          </p>

                                                          {(activity.assemblyPointName ||
                                                            (activity.assemblyPointLatitude !=
                                                              null &&
                                                              activity.assemblyPointLongitude !=
                                                                null)) && (
                                                            <div className="mt-2 p-2 rounded-md border border-blue-200/70 dark:border-blue-700/50 bg-blue-50/60 dark:bg-blue-900/15">
                                                              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                                                                <MapPin
                                                                  className="h-3 w-3"
                                                                  weight="fill"
                                                                />
                                                                Điểm tập kết
                                                                hoạt động
                                                              </p>
                                                              {activity.assemblyPointName && (
                                                                <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                                                                  {
                                                                    activity.assemblyPointName
                                                                  }
                                                                </p>
                                                              )}
                                                              {formatCoordinateLabel(
                                                                activity.assemblyPointLatitude,
                                                                activity.assemblyPointLongitude,
                                                              ) && (
                                                                <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                                                                  Tọa độ:{" "}
                                                                  {formatCoordinateLabel(
                                                                    activity.assemblyPointLatitude,
                                                                    activity.assemblyPointLongitude,
                                                                  )}
                                                                </p>
                                                              )}
                                                            </div>
                                                          )}

                                                          {(activity.completedBy ||
                                                            activity.completedAt) && (
                                                            <div className="mt-2 p-2 rounded-md border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/20">
                                                              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                                                                <CheckCircle
                                                                  className="h-3 w-3"
                                                                  weight="fill"
                                                                />
                                                                Thông tin hoàn
                                                                tất bước
                                                              </p>
                                                              {activity.completedBy && (
                                                                <p className="text-xs text-slate-700/85 dark:text-slate-300/85">
                                                                  Người hoàn
                                                                  tất:{" "}
                                                                  {
                                                                    activity.completedBy
                                                                  }
                                                                </p>
                                                              )}
                                                              {activity.completedAt && (
                                                                <p className="text-xs text-slate-700/85 dark:text-slate-300/85">
                                                                  Thời điểm:{" "}
                                                                  {new Date(
                                                                    activity.completedAt,
                                                                  ).toLocaleString(
                                                                    "vi-VN",
                                                                  )}
                                                                </p>
                                                              )}
                                                            </div>
                                                          )}

                                                          {teamsForStep.length >
                                                            0 && (
                                                            <div className="mt-2 p-2 rounded-md border border-emerald-200/70 dark:border-emerald-700/50 bg-emerald-50/60 dark:bg-emerald-900/15">
                                                              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1">
                                                                <ShieldCheck
                                                                  className="h-3 w-3"
                                                                  weight="fill"
                                                                />
                                                                Đội phụ trách
                                                              </p>
                                                              <div className="space-y-1.5">
                                                                {teamsForStep.map(
                                                                  (team) => {
                                                                    const teamStatusMeta =
                                                                      getTeamAssignmentStatusMeta(
                                                                        team.status,
                                                                      );
                                                                    const rescueTeamStatusMeta =
                                                                      getRescueTeamStatusMeta(
                                                                        team.teamStatus,
                                                                      );

                                                                    return (
                                                                      <div
                                                                        key={
                                                                          team.missionTeamId
                                                                        }
                                                                        className="rounded-md border border-emerald-200/70 dark:border-emerald-700/50 bg-background/80 px-2 py-1.5"
                                                                      >
                                                                        <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                                                                          {team.teamName ||
                                                                            `Đội #${team.rescueTeamId}`}
                                                                        </p>
                                                                        {team.assemblyPointName && (
                                                                          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                                                                            Điểm
                                                                            tập
                                                                            kết:{" "}
                                                                            {
                                                                              team.assemblyPointName
                                                                            }
                                                                          </p>
                                                                        )}
                                                                        {formatCoordinateLabel(
                                                                          team.latitude,
                                                                          team.longitude,
                                                                        ) && (
                                                                          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                                                                            Vị
                                                                            trí
                                                                            đội:{" "}
                                                                            {formatCoordinateLabel(
                                                                              team.latitude,
                                                                              team.longitude,
                                                                            )}
                                                                            {team.locationSource
                                                                              ? ` (${team.locationSource})`
                                                                              : ""}
                                                                          </p>
                                                                        )}
                                                                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                                          {team.teamCode && (
                                                                            <Badge
                                                                              variant="outline"
                                                                              className="h-5 px-1.5 text-xs border-emerald-300/70 text-emerald-800 dark:border-emerald-700 dark:text-emerald-200"
                                                                            >
                                                                              {
                                                                                team.teamCode
                                                                              }
                                                                            </Badge>
                                                                          )}
                                                                          {team.teamType && (
                                                                            <span className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                                                                              Loại:{" "}
                                                                              {formatTeamTypeLabel(
                                                                                team.teamType,
                                                                              )}
                                                                            </span>
                                                                          )}
                                                                          <Badge
                                                                            variant="outline"
                                                                            className={cn(
                                                                              "h-5 px-1.5 text-xs font-semibold",
                                                                              teamStatusMeta.className,
                                                                            )}
                                                                          >
                                                                            {
                                                                              teamStatusMeta.label
                                                                            }
                                                                          </Badge>
                                                                          {team.teamStatus && (
                                                                            <Badge
                                                                              variant="outline"
                                                                              className={cn(
                                                                                "h-5 px-1.5 text-xs font-semibold",
                                                                                rescueTeamStatusMeta.className,
                                                                              )}
                                                                            >
                                                                              Đội:{" "}
                                                                              {
                                                                                rescueTeamStatusMeta.label
                                                                              }
                                                                            </Badge>
                                                                          )}
                                                                          {typeof team.memberCount ===
                                                                            "number" && (
                                                                            <Badge
                                                                              variant="outline"
                                                                              className="h-5 px-1.5 text-xs"
                                                                            >
                                                                              {
                                                                                team.memberCount
                                                                              }{" "}
                                                                              thành
                                                                              viên
                                                                            </Badge>
                                                                          )}
                                                                        </div>
                                                                      </div>
                                                                    );
                                                                  },
                                                                )}
                                                              </div>
                                                            </div>
                                                          )}
                                                          {supplyItems.length >
                                                            0 && (
                                                            <div className="mt-2.5 p-2.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                                              <p className="text-xs font-bold uppercase tracking-wider text-blue-600/80 dark:text-blue-400 mb-1.5 flex items-center gap-1.5">
                                                                <Package
                                                                  className="h-3 w-3"
                                                                  weight="fill"
                                                                />
                                                                {activity.activityType ===
                                                                "DELIVER_SUPPLIES"
                                                                  ? "Danh sách giao hàng"
                                                                  : "Yêu cầu lấy vật tư"}
                                                              </p>
                                                              <div className="space-y-1">
                                                                {supplyItems.map(
                                                                  (
                                                                    supply,
                                                                    sIdx,
                                                                  ) => (
                                                                    <div
                                                                      key={sIdx}
                                                                      className="flex items-center justify-between gap-2 text-xs py-1 px-2 bg-background rounded border shadow-sm"
                                                                    >
                                                                      <div className="flex items-center gap-1.5 min-w-0">
                                                                        <Package className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                                        <span className="font-medium truncate">
                                                                          {
                                                                            supply.name
                                                                          }
                                                                        </span>
                                                                      </div>
                                                                      <div className="shrink-0 text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                                                        {supply.quantityLabel ||
                                                                          "-"}
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
                                                },
                                              )}
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                )}
                                {/* Consolidated route for entire mission */}
                                <MissionTeamRoutePreview
                                  mission={mission}
                                  sosRequests={clusterSOSRequests}
                                />
                              </CardContent>
                            </Card>
                          );
                        })}
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
                          <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
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
                          {activeSuggestion && (
                            <div className="mt-2 rounded-md border border-orange-300/80 bg-orange-100/70 dark:border-orange-700/60 dark:bg-orange-900/20 px-2 py-1.5">
                              <p className="text-xs text-orange-800 dark:text-orange-300 flex items-start gap-1.5 leading-relaxed">
                                <Warning
                                  className="h-3.5 w-3.5 mt-0.5 shrink-0"
                                  weight="fill"
                                />
                                Khi xóa vật tư hoặc xóa bước trong phần chỉnh
                                sửa, dữ liệu đó sẽ bị loại khỏi nhiệm vụ lúc xác
                                nhận.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Mission config */}
                        <section className="rounded-xl border bg-card p-4 space-y-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Rocket className="h-3.5 w-3.5" weight="fill" />
                            Cấu hình nhiệm vụ
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                Loại nhiệm vụ
                              </Label>
                              <Select
                                value={editMissionType}
                                onValueChange={(v) =>
                                  setEditMissionType(v as MissionType)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-1200">
                                  <SelectItem value="RESCUE">Cứu hộ</SelectItem>
                                  <SelectItem value="RELIEF">
                                    Cứu trợ
                                  </SelectItem>
                                  <SelectItem value="MIXED">
                                    Tổng hợp
                                  </SelectItem>
                                  <SelectItem value="RESCUER">
                                    Cứu hộ viên
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
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
                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
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
                              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
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
                                className="text-xs h-5 px-2"
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
                              const activityNearbyTeams =
                                getNearbyTeamsForActivity(activity);
                              const parsedSuggestedTeamId = Number(
                                activity.suggestedTeam?.teamId,
                              );
                              const hasValidSuggestedTeamId =
                                Number.isFinite(parsedSuggestedTeamId) &&
                                parsedSuggestedTeamId > 0;
                              const selectedNearbyTeam = hasValidSuggestedTeamId
                                ? nearbyRescueTeamById.get(
                                    parsedSuggestedTeamId,
                                  )
                                : undefined;
                              const selectedNearbyTeamStatusMeta =
                                selectedNearbyTeam
                                  ? getRescueTeamStatusMeta(
                                      selectedNearbyTeam.status,
                                    )
                                  : null;
                              const selectedTeamValue = hasValidSuggestedTeamId
                                ? String(parsedSuggestedTeamId)
                                : "";
                              const selectedTeamInNearbyOptions =
                                hasValidSuggestedTeamId &&
                                activityNearbyTeams.some(
                                  (team) => team.id === parsedSuggestedTeamId,
                                );
                              const selectedTeamDisplayName =
                                activity.suggestedTeam?.teamName ||
                                (hasValidSuggestedTeamId
                                  ? `Đội #${parsedSuggestedTeamId}`
                                  : "Chưa chọn đội");
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
                                        <SelectTrigger className="h-7 w-35 text-xs font-semibold">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="z-1200">
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
                                          "text-xs font-semibold px-2 py-0 h-6",
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
                                          handleRemoveActivityWithConfirm(
                                            activity,
                                            idx + 1,
                                          )
                                        }
                                      >
                                        <Trash className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
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
                                    <div className="space-y-1">
                                      <Label className="block h-4 text-xs leading-none text-muted-foreground uppercase tracking-wider">
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
                                        className="h-10 w-full text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="block h-4 text-xs leading-none text-muted-foreground uppercase tracking-wider">
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
                                        <SelectTrigger className="h-10 w-full text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="z-1200">
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

                                  {/* Team assignment override (nearby assembly points) */}
                                  <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-2.5 dark:border-emerald-700/50 dark:bg-emerald-900/15">
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                          Điều phối đội cứu hộ
                                        </p>
                                        <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                                          {selectedTeamDisplayName}
                                        </p>
                                      </div>

                                      {selectedNearbyTeam ? (
                                        <Badge
                                          variant="outline"
                                          className="h-5 border-emerald-300/70 bg-white px-1.5 text-xs text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                        >
                                          {formatDistanceKmLabel(
                                            selectedNearbyTeam.distanceKm,
                                          )}
                                        </Badge>
                                      ) : null}
                                    </div>

                                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                                      <Select
                                        value={selectedTeamValue || undefined}
                                        onValueChange={(value) =>
                                          handleSelectNearbyTeamForActivity(
                                            activity._id,
                                            value,
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-9 text-xs bg-white/90 dark:bg-emerald-950/25">
                                          <SelectValue
                                            placeholder={
                                              isNearbyTeamsByClusterLoading
                                                ? "Đang tải đội gần cụm SOS..."
                                                : "Chọn đội gần điểm tập kết để thay thế"
                                            }
                                          />
                                        </SelectTrigger>
                                        <SelectContent className="z-1200">
                                          {hasValidSuggestedTeamId &&
                                          !selectedTeamInNearbyOptions ? (
                                            <SelectItem
                                              value={selectedTeamValue}
                                              className="text-xs"
                                            >
                                              {selectedTeamDisplayName} (đang
                                              chọn)
                                            </SelectItem>
                                          ) : null}

                                          {activityNearbyTeams.map((team) => (
                                            <SelectItem
                                              key={team.id}
                                              value={String(team.id)}
                                              className="text-xs"
                                            >
                                              {team.name} •{" "}
                                              {formatDistanceKmLabel(
                                                team.distanceKm,
                                              )}
                                            </SelectItem>
                                          ))}

                                          <SelectItem
                                            value={CLEAR_ACTIVITY_TEAM_VALUE}
                                            className="text-xs text-rose-700"
                                          >
                                            Bỏ gán đội cho bước này
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>

                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-9 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800/50 dark:text-rose-300 dark:hover:bg-rose-900/20"
                                        onClick={() =>
                                          updateEditActivitySuggestedTeam(
                                            activity._id,
                                            null,
                                          )
                                        }
                                        disabled={!activity.suggestedTeam}
                                      >
                                        Bỏ đội
                                      </Button>
                                    </div>

                                    {activityNearbyTeams.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {activityNearbyTeams
                                          .slice(0, 4)
                                          .map((team) => {
                                            const isSelectedTeam =
                                              hasValidSuggestedTeamId &&
                                              parsedSuggestedTeamId === team.id;

                                            return (
                                              <Button
                                                key={team.id}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                  "h-7 gap-1 rounded-full px-2 text-xs",
                                                  isSelectedTeam
                                                    ? "border-emerald-500 bg-emerald-100 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-200"
                                                    : "border-emerald-200/80 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-300",
                                                )}
                                                onClick={() =>
                                                  updateEditActivitySuggestedTeam(
                                                    activity._id,
                                                    team,
                                                  )
                                                }
                                              >
                                                <span className="max-w-30 truncate">
                                                  {team.name}
                                                </span>
                                                <span className="font-semibold">
                                                  {formatDistanceKmLabel(
                                                    team.distanceKm,
                                                  )}
                                                </span>
                                              </Button>
                                            );
                                          })}
                                      </div>
                                    )}

                                    {selectedNearbyTeam ? (
                                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "h-5 border px-1.5 text-xs",
                                            selectedNearbyTeamStatusMeta?.className,
                                          )}
                                        >
                                          {selectedNearbyTeamStatusMeta?.label}
                                        </Badge>
                                        {selectedNearbyTeam.assemblyPointName ? (
                                          <span>
                                            Điểm tập kết:{" "}
                                            {
                                              selectedNearbyTeam.assemblyPointName
                                            }
                                          </span>
                                        ) : null}
                                      </div>
                                    ) : activity.suggestedTeam?.reason ? (
                                      <p className="mt-2 text-xs leading-relaxed text-emerald-700/75 dark:text-emerald-300/75">
                                        Lý do AI:{" "}
                                        {activity.suggestedTeam.reason}
                                      </p>
                                    ) : null}
                                  </div>

                                  {/* Supply drop zone (for supply activities) */}
                                  {isSupplyStep(activity.activityType) && (
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
                                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
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
                                                className="grid min-w-0 grid-cols-[minmax(0,1fr)_64px_44px_24px] items-center gap-2 text-xs py-1 px-2 bg-background rounded border shadow-sm"
                                              >
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                  <Package className="h-3 w-3 text-blue-500 shrink-0" />
                                                  <span
                                                    className="truncate font-medium text-foreground"
                                                    title={
                                                      getSupplyDisplayName(
                                                        supply,
                                                      ) || "Vật tư chưa rõ tên"
                                                    }
                                                  >
                                                    {getSupplyDisplayName(
                                                      supply,
                                                    ) || "Vật tư chưa rõ tên"}
                                                  </span>
                                                </div>
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
                                                  className="h-6 w-full text-xs text-center px-1"
                                                />
                                                <span className="text-right text-xs text-muted-foreground">
                                                  {supply.unit}
                                                </span>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-5 w-5 text-muted-foreground hover:text-red-500"
                                                  onClick={() =>
                                                    handleRemoveSupplyWithConfirm(
                                                      activity._id,
                                                      sIdx,
                                                      getSupplyDisplayName(
                                                        supply,
                                                      ),
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
                                        <p className="text-xs text-muted-foreground/60 text-center py-1">
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
                              className="text-xs h-5 px-2"
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
                                          <p className="text-xs text-amber-700/70 dark:text-amber-400/60 truncate mt-0.5">
                                            {group.depotAddress}
                                          </p>
                                        )}
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-xs h-5 px-1.5 shrink-0 border-amber-400/60 text-amber-700 dark:text-amber-300 font-semibold"
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
                                        SOS {group.sosRequestId ?? "unknown"}
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className="text-xs h-5 px-1.5 shrink-0"
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
                                    const supplyItems =
                                      getSupplyDisplayItems(activity);
                                    const displayDescription =
                                      supplyItems.length > 0
                                        ? stripSupplyDetailsFromDescription(
                                            cleanDescription,
                                          )
                                        : cleanDescription;
                                    const stepStatus = getActivityStatusMeta(
                                      "PendingConfirmation",
                                    );

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
                                                  "text-xs font-semibold px-2 py-0 h-5",
                                                  config.color,
                                                  config.bgColor,
                                                  "border-transparent",
                                                )}
                                              >
                                                {config.label}
                                              </Badge>
                                              <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/60 px-1.5 py-0.5 rounded-md">
                                                <Clock className="h-3 w-3" />
                                                {activity.estimatedTime}
                                              </span>
                                              {activity.priority && (
                                                <span className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                                                  {activity.priority}
                                                </span>
                                              )}
                                              <Badge
                                                variant="outline"
                                                className={cn(
                                                  "text-xs h-6 px-2 font-bold border flex items-center gap-1",
                                                  stepStatus.className,
                                                )}
                                              >
                                                {stepStatus.icon}
                                                {stepStatus.label}
                                              </Badge>
                                            </div>
                                            <p className="text-sm leading-relaxed text-foreground/80">
                                              {displayDescription}
                                            </p>

                                            {activity.suggestedTeam && (
                                              <div className="mt-2 p-2.5 rounded-md border border-emerald-200/70 dark:border-emerald-700/50 bg-emerald-50/60 dark:bg-emerald-900/15">
                                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1">
                                                  <ShieldCheck
                                                    className="h-3 w-3"
                                                    weight="fill"
                                                  />
                                                  Đội đề xuất
                                                </p>
                                                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                                                  {activity.suggestedTeam
                                                    .teamName ||
                                                    (activity.suggestedTeam
                                                      .teamId
                                                      ? `Đội #${activity.suggestedTeam.teamId}`
                                                      : "Đội chưa đặt tên")}
                                                </p>
                                                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                                                  {`Loại: ${formatTeamTypeLabel(activity.suggestedTeam.teamType)}`}
                                                  {activity.suggestedTeam
                                                    .contactPhone
                                                    ? ` • SĐT: ${activity.suggestedTeam.contactPhone}`
                                                    : ""}
                                                  {activity.suggestedTeam
                                                    .estimatedEtaMinutes != null
                                                    ? ` • ETA: ${activity.suggestedTeam.estimatedEtaMinutes} phút`
                                                    : ""}
                                                </p>
                                                {activity.suggestedTeam
                                                  .reason && (
                                                  <p className="text-xs text-emerald-700/75 dark:text-emerald-300/75 mt-1 leading-relaxed">
                                                    Lý do:{" "}
                                                    {
                                                      activity.suggestedTeam
                                                        .reason
                                                    }
                                                  </p>
                                                )}
                                                {activity.suggestedTeam
                                                  .assemblyPointName && (
                                                  <p className="text-xs text-emerald-700/75 dark:text-emerald-300/75 mt-0.5 leading-relaxed">
                                                    Điểm tập kết đội:{" "}
                                                    {
                                                      activity.suggestedTeam
                                                        .assemblyPointName
                                                    }
                                                  </p>
                                                )}
                                              </div>
                                            )}

                                            {(activity.assemblyPointName ||
                                              (activity.assemblyPointLatitude !=
                                                null &&
                                                activity.assemblyPointLongitude !=
                                                  null)) && (
                                              <div className="mt-2 p-2 rounded-md border border-blue-200/70 dark:border-blue-700/50 bg-blue-50/60 dark:bg-blue-900/15">
                                                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                                                  <MapPin
                                                    className="h-3 w-3"
                                                    weight="fill"
                                                  />
                                                  Điểm tập kết hoạt động
                                                </p>
                                                {activity.assemblyPointName && (
                                                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                                                    {activity.assemblyPointName}
                                                  </p>
                                                )}
                                                {formatCoordinateLabel(
                                                  activity.assemblyPointLatitude,
                                                  activity.assemblyPointLongitude,
                                                ) && (
                                                  <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                                                    Tọa độ:{" "}
                                                    {formatCoordinateLabel(
                                                      activity.assemblyPointLatitude,
                                                      activity.assemblyPointLongitude,
                                                    )}
                                                  </p>
                                                )}
                                              </div>
                                            )}

                                            {supplyItems.length > 0 && (
                                              <div className="mt-2 p-2 rounded-md bg-muted/50 border border-dashed">
                                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                                                  {activity.activityType ===
                                                  "DELIVER_SUPPLIES"
                                                    ? "Danh sách giao hàng"
                                                    : "Yêu cầu lấy vật tư"}
                                                </p>
                                                <div className="space-y-1">
                                                  {supplyItems.map(
                                                    (supply, sIdx) => (
                                                      <div
                                                        key={sIdx}
                                                        className="flex items-center justify-between gap-2 text-xs py-1 px-2 bg-background rounded border shadow-sm"
                                                      >
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                          <Package className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                          <span className="font-medium truncate">
                                                            {supply.name}
                                                          </span>
                                                        </div>
                                                        <div className="shrink-0 text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                                          {supply.quantityLabel ||
                                                            "-"}
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
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
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
                                  <Badge
                                    variant="outline"
                                    className="text-xs h-5 px-1.5 shrink-0"
                                  >
                                    {resource.priority}
                                  </Badge>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </section>

                      {(activeSuggestion.needsManualReview ||
                        activeSuggestion.lowConfidenceWarning ||
                        activeSuggestion.multiDepotRecommended) && (
                        <>
                          <Separator />
                          <section className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Info className="h-3.5 w-3.5" weight="fill" />
                              Cảnh báo hệ thống
                            </h4>
                            {activeSuggestion.needsManualReview && (
                              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-2.5">
                                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                                  {activeSuggestion.lowConfidenceWarning ||
                                    "Kế hoạch cần kiểm tra thủ công trước khi phê duyệt."}
                                </p>
                              </div>
                            )}
                            {!activeSuggestion.needsManualReview &&
                              activeSuggestion.lowConfidenceWarning && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-2.5">
                                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                                    {activeSuggestion.lowConfidenceWarning}
                                  </p>
                                </div>
                              )}
                            {activeSuggestion.multiDepotRecommended && (
                              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-2.5">
                                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                                  Kế hoạch đề xuất phối hợp nhiều kho để đáp ứng
                                  đủ vật tư.
                                </p>
                              </div>
                            )}
                          </section>
                        </>
                      )}

                      {/* Special Notes */}
                      {activeSuggestion.specialNotes && (
                        <>
                          <Separator />
                          <section>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                              <Warning
                                className="h-3.5 w-3.5 text-orange-500"
                                weight="fill"
                              />
                              Lưu ý đặc biệt
                            </h4>
                            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-lg p-2.5">
                              <p className="text-xs text-foreground/75 leading-relaxed">
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
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                      <ShieldCheck
                        className="h-3.5 w-3.5 text-emerald-500"
                        weight="fill"
                      />
                      Độ tin cậy AI
                    </h4>
                    <Card className="bg-card border">
                      <CardContent className="p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">
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
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
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
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                          <Storefront
                            className="h-3.5 w-3.5 text-amber-500"
                            weight="fill"
                          />
                          Kho vật tư
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
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
                className="flex-1 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/20"
                onClick={handleOpenSubmitConfirm}
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
                className="flex-1 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
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

        <Dialog
          open={removeConfirmOpen}
          onOpenChange={handleRemoveConfirmOpenChange}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{removeDialogTitle}</DialogTitle>
              <DialogDescription>{removeDialogDescription}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleRemoveConfirmOpenChange(false)}
              >
                Giữ lại
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmRemove}
              >
                Xóa khỏi kế hoạch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Xác nhận tạo nhiệm vụ</DialogTitle>
              <DialogDescription>
                Bạn có chắc muốn hoàn tất chỉnh sửa không? Sau khi tạo, nhiệm vụ
                sẽ được lưu vào danh sách nhiệm vụ đã tạo và gửi đến đội cứu hộ
                được chỉ định.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmSubmitOpen(false)}
                disabled={isCreatingMission}
              >
                Quay lại chỉnh sửa
              </Button>
              <Button
                className="bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={handleSubmitEdit}
                disabled={isCreatingMission}
              >
                {isCreatingMission ? "Đang tạo..." : "Đồng ý tạo nhiệm vụ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default RescuePlanPanel;
