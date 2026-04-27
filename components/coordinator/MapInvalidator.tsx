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

    // Use a simple ResizeObserver to invalidate the map size when its container changes.
    // To handle smooth transitions (like the sidebar opening/closing), we can use a small
    // requestAnimationFrame loop triggered by the resize event.
    let rafId: number | null = null;
    
    const invalidate = () => {
      map.invalidateSize({ animate: false });
    };

    const observer = new ResizeObserver(() => {
      // During a CSS transition, ResizeObserver will fire multiple times.
      // We use requestAnimationFrame to ensure we only invalidate once per frame.
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(invalidate);
    });

    const container = map.getContainer();
    observer.observe(container);

    // Also trigger on window resize
    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(invalidate);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [map]);
  return null;
};
