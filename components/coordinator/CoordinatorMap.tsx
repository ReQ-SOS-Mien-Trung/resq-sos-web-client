"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  SOSCluster,
  Rescuer,
  Depot,
  Location,
  AIDispatchDecision,
} from "@/types/coordinator";

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

interface CoordinatorMapProps {
  clusters: SOSCluster[];
  rescuers: Rescuer[];
  depots: Depot[];
  selectedCluster?: SOSCluster | null;
  selectedRescuer?: Rescuer | null;
  aiDecision?: AIDispatchDecision | null;
  onClusterSelect: (cluster: SOSCluster) => void;
  onRescuerSelect: (rescuer: Rescuer) => void;
  flyToLocation?: Location | null;
}

export default function CoordinatorMap({
  clusters,
  rescuers,
  depots,
  selectedCluster,
  selectedRescuer,
  aiDecision,
  onClusterSelect,
  onRescuerSelect,
  flyToLocation,
}: CoordinatorMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Use setTimeout to avoid React 19 strict mode warning
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
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

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="text-muted-foreground">Đang tải bản đồ...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Import Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      <MapContainer
        center={
          flyToLocation ? [flyToLocation.lat, flyToLocation.lng] : defaultCenter
        }
        zoom={defaultZoom}
        className="w-full h-full z-0"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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
          <DepotMarker key={depot.id} depot={depot} />
        ))}

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

      {/* Map Legend */}
      <MapLegend />
    </div>
  );
}

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
          <div className="font-bold text-sm mb-2">
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
          <div className="font-bold text-sm mb-2">{rescuer.name}</div>
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
function DepotMarker({ depot }: { depot: Depot }) {
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
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }, []);

  if (!iconEl) return null;

  return (
    <Marker position={[depot.location.lat, depot.location.lng]} icon={iconEl}>
      <Popup>
        <div className="p-2 min-w-45">
          <div className="font-bold text-sm mb-2">{depot.name}</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>🦺 Áo phao:</span>
              <span className="font-semibold">
                {depot.inventory.lifeJackets}
              </span>
            </div>
            <div className="flex justify-between">
              <span>🍱 Thực phẩm:</span>
              <span className="font-semibold">{depot.inventory.foodPacks}</span>
            </div>
            <div className="flex justify-between">
              <span>🏥 Kit y tế:</span>
              <span className="font-semibold">{depot.inventory.medKits}</span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Map Legend Component
function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-1000 bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-3">
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
      </div>
    </div>
  );
}
