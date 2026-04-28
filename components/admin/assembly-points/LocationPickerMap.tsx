"use client";

import { useEffect, useRef } from "react";
import "@goongmaps/goong-js/dist/goong-js.css";
// @ts-ignore
import goongjs from "@goongmaps/goong-js";

const DEFAULT_CENTER: [number, number] = [108.20623, 16.047079]; // lng, lat
const DEFAULT_ZOOM = 12;

interface LocationPickerMapProps {
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
  height?: number;
  className?: string;
}

export default function LocationPickerMap({
  lat,
  lng,
  onPick,
  height = 280,
  className = "",
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    goongjs.accessToken = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || "";

    const map = new goongjs.Map({
      container: containerRef.current,
      style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || ""}`,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    mapRef.current = map;

    map.addControl(new goongjs.NavigationControl(), "bottom-right");
    map.getCanvas().style.cursor = "crosshair";

    map.on("click", (e: any) => {
      onPickRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const hasMarker =
      lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);

    if (hasMarker) {
      if (!markerRef.current) {
        markerRef.current = new goongjs.Marker({ color: "#ef4444" })
          .setLngLat([lng, lat])
          .addTo(map);
        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14) });
      } else {
        const currentLngLat = markerRef.current.getLngLat();
        if (currentLngLat.lng !== lng || currentLngLat.lat !== lat) {
          markerRef.current.setLngLat([lng, lat]);
          map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14) });
        }
      }
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className={`w-full z-0 rounded-lg ${className}`}
      style={{ height }}
    />
  );
}
