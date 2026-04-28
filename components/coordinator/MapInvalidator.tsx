"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * A helper component that invalidates the map size when its container resizes.
 * Useful for handling sidebars or panels that push the map container.
 */
export const MapInvalidator = () => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;

    // Sidebar width transitions can emit many resize ticks. Keep Leaflet's
    // center stable while the container changes, then do one final settle pass.
    let rafId: number | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    const invalidate = (isSettling = false) => {
      map.invalidateSize({
        animate: false,
        pan: false,
        debounceMoveend: !isSettling,
      });
    };

    const scheduleInvalidate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        invalidate();
      });

      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        settleTimer = null;
        invalidate(true);
      }, 120);
    };

    const container = map.getContainer();
    const observer = new ResizeObserver(scheduleInvalidate);
    observer.observe(container);

    // Also trigger on window resize
    window.addEventListener("resize", scheduleInvalidate);
    scheduleInvalidate();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleInvalidate);
      if (rafId) cancelAnimationFrame(rafId);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [map]);
  return null;
};
