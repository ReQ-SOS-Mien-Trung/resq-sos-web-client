"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface FlyToHandlerProps {
  location: { lat: number; lng: number } | null;
}

export function FlyToHandler({ location }: FlyToHandlerProps) {
  const map = useMap();

  useEffect(() => {
    if (location && map) {
      map.flyTo([location.lat, location.lng], 16, {
        duration: 1.5,
      });
    }
  }, [location, map]);

  return null;
}
