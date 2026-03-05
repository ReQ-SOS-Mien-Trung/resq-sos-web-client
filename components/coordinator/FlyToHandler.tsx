"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface FlyToHandlerProps {
  location: { lat: number; lng: number } | null;
  zoom?: number;
}

export function FlyToHandler({ location, zoom = 16 }: FlyToHandlerProps) {
  const map = useMap();

  useEffect(() => {
    if (location && map) {
      map.flyTo([location.lat, location.lng], zoom, {
        duration: 1.5,
      });
    }
  }, [location, map, zoom]);

  return null;
}
