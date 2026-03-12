"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";

// Fix default marker icon (Leaflet + webpack/next issue)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Default center: Đà Nẵng, Vietnam
const DEFAULT_CENTER: [number, number] = [16.047079, 108.20623];
const DEFAULT_ZOOM = 12;

interface LocationPickerMapProps {
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
}

/** Handles map click → reports lat/lng to parent */
function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click: (e) => {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    map.getContainer().style.cursor = "crosshair";
    return () => {
      map.getContainer().style.cursor = "";
    };
  }, [map]);

  return null;
}

/** Fly to a new marker when lat/lng props change (from manual input) */
function FlyToMarker({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevRef = useRef<string>("");

  useEffect(() => {
    const key = `${lat},${lng}`;
    if (key === prevRef.current) return;
    prevRef.current = key;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [lat, lng, map]);

  return null;
}

export default function LocationPickerMap({
  lat,
  lng,
  onPick,
}: LocationPickerMapProps) {
  const [cssReady, setCssReady] = useState(false);

  useEffect(() => {
    const existingLink = document.querySelector('link[href*="leaflet.css"]');
    if (existingLink) {
      setCssReady(true);
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    link.onload = () => setCssReady(true);
    document.head.appendChild(link);
  }, []);

  const hasMarker =
    lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
  const center: [number, number] = hasMarker ? [lat, lng] : DEFAULT_CENTER;
  const zoom = hasMarker ? 14 : DEFAULT_ZOOM;

  if (!cssReady) {
    return (
      <div
        style={{ height: 300 }}
        className="w-full animate-pulse bg-muted rounded-lg"
      />
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full z-0"
      style={{ height: 300 }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {hasMarker && (
        <>
          <Marker position={[lat, lng]} />
          <FlyToMarker lat={lat} lng={lng} />
        </>
      )}
    </MapContainer>
  );
}
