"use client";

import { useCallback, useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

// This component provides zoom/recenter functions to the parent via a ref-like callback
// and reports map view changes (zoom + pan) for URL synchronization.
export function MapZoomHandler({
  onMapReady,
  onZoomChange,
  onViewChange,
}: {
  onMapReady: (controls: {
    zoomIn: () => void;
    zoomOut: () => void;
    recenter: () => void;
  }) => void;
  onZoomChange?: (zoom: number) => void;
  /** Called on moveend/zoomend with the current center + zoom */
  onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void;
}) {
  const map = useMap();

  const zoomIn = useCallback(() => map.zoomIn(), [map]);
  const zoomOut = useCallback(() => map.zoomOut(), [map]);
  const recenter = useCallback(
    () => map.setView([16.4637, 107.5909], 13),
    [map],
  );

  const reportView = useCallback(() => {
    const center = map.getCenter();
    const zoom = map.getZoom();
    onZoomChange?.(zoom);
    onViewChange?.({ lat: center.lat, lng: center.lng, zoom });
  }, [map, onZoomChange, onViewChange]);

  useMapEvents({
    zoomend: reportView,
    moveend: reportView,
  });

  useEffect(() => {
    if (map) {
      onMapReady({ zoomIn, zoomOut, recenter });
      // Report initial view state
      reportView();
    }
  }, [map, onMapReady, zoomIn, zoomOut, recenter, reportView]);

  return null;
}
