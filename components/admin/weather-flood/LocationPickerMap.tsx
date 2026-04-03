"use client";

import { useEffect, useRef } from "react";

const DEFAULT_CENTER: [number, number] = [16.047079, 108.20623];
const DEFAULT_ZOOM = 8;

interface LocationPickerMapProps {
  lat?: number;
  lon?: number;
  onPick: (lat: number, lon: number) => void;
  heightClassName?: string;
}

async function ensureLeafletCss() {
  if (document.querySelector('link[href*="leaflet"]')) return;
  await new Promise<void>((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.onload = () => resolve();
    link.onerror = () => resolve(); // continue even if CDN fails
    document.head.appendChild(link);
  });
}

export default function LocationPickerMap({
  lat,
  lon,
  onPick,
  heightClassName = "h-64",
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // ── Init map (once) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function init() {
      await ensureLeafletCss();
      if (cancelled || !containerRef.current) return;

      const L = (await import("leaflet")).default;

      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const hasMarker =
        lat !== undefined && lon !== undefined &&
        Number.isFinite(lat) && Number.isFinite(lon);

      const center: [number, number] = hasMarker ? [lat!, lon!] : DEFAULT_CENTER;
      const zoom = hasMarker ? 13 : DEFAULT_ZOOM;

      const map = L.map(containerRef.current!, { zoomControl: true }).setView(center, zoom);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      map.getContainer().style.cursor = "crosshair";

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        onPickRef.current(e.latlng.lat, e.latlng.lng);
      });

      if (hasMarker) {
        markerRef.current = L.marker([lat!, lon!]).addTo(map);
      }
    }

    void init().catch(() => null);

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync marker when lat/lon prop changes ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const hasMarker =
      lat !== undefined && lon !== undefined &&
      Number.isFinite(lat) && Number.isFinite(lon);

    if (!hasMarker) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([lat!, lon!]);
    } else {
      import("leaflet").then(({ default: L }) => {
        if (!mapRef.current) return;
        markerRef.current = L.marker([lat!, lon!]).addTo(mapRef.current);
      });
    }

    map.flyTo([lat!, lon!], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [lat, lon]);

  return (
    <div
      ref={containerRef}
      className={`z-0 w-full overflow-hidden rounded-xl border border-border/60 ${heightClassName}`}
    />
  );
}
