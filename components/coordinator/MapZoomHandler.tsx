"use client";

import { useCallback, useEffect } from "react";
import { useMap } from "react-leaflet";

// This component provides zoom/recenter functions to the parent via a ref-like callback
export function MapZoomHandler({
  onMapReady,
}: {
  onMapReady: (controls: {
    zoomIn: () => void;
    zoomOut: () => void;
    recenter: () => void;
  }) => void;
}) {
  const map = useMap();

  const zoomIn = useCallback(() => map.zoomIn(), [map]);
  const zoomOut = useCallback(() => map.zoomOut(), [map]);
  const recenter = useCallback(
    () => map.setView([16.4637, 107.5909], 13),
    [map],
  );

  useEffect(() => {
    if (map) {
      onMapReady({ zoomIn, zoomOut, recenter });
    }
  }, [map, onMapReady, zoomIn, zoomOut, recenter]);

  return null;
}
