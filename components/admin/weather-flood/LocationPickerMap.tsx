"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

// Fix default marker icon for Next.js + Leaflet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [16.047079, 108.20623];
const DEFAULT_ZOOM = 8;

interface LocationPickerMapProps {
  lat?: number;
  lon?: number;
  onPick: (lat: number, lon: number) => void;
  heightClassName?: string;
}

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lon: number) => void;
}) {
  const map = useMapEvents({
    click: (event) => {
      onPick(event.latlng.lat, event.latlng.lng);
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

function FlyToMarker({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  const prevRef = useRef<string>("");

  useEffect(() => {
    const key = `${lat},${lon}`;
    if (key === prevRef.current) return;
    prevRef.current = key;
    map.flyTo([lat, lon], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [lat, lon, map]);

  return null;
}

export default function LocationPickerMap({
  lat,
  lon,
  onPick,
  heightClassName = "h-64",
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
    lat !== undefined &&
    lon !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lon);

  const center: [number, number] = hasMarker ? [lat, lon] : DEFAULT_CENTER;
  const zoom = hasMarker ? 13 : DEFAULT_ZOOM;

  if (!cssReady) {
    return (
      <div
        className={`w-full animate-pulse rounded-xl border border-border/60 bg-muted/30 ${heightClassName}`}
      />
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={`z-0 w-full overflow-hidden rounded-xl border border-border/60 ${heightClassName}`}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {hasMarker && (
        <>
          <Marker position={[lat, lon]} />
          <FlyToMarker lat={lat} lon={lon} />
        </>
      )}
    </MapContainer>
  );
}
