"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// ── Types ──

export interface MapViewState {
  lat: number;
  lng: number;
  zoom: number;
}

export type SelectedEntity =
  | { type: "sos"; id: string }
  | { type: "cluster"; id: number }
  | { type: "depot"; id: number }
  | { type: "assemblyPoint"; id: number }
  | null;

export interface MapUrlState {
  view: MapViewState | null;
  selected: SelectedEntity;
  mode: "sos" | "weather";
}

// ── Defaults ──

const DEFAULT_CENTER = { lat: 16.4637, lng: 107.5909 };
const DEFAULT_ZOOM = 13;
const DEBOUNCE_MS = 400;

// ── Parse URL → State ──

function parseUrlState(searchParams: URLSearchParams): MapUrlState {
  const mode = searchParams.get("mode") === "weather" ? "weather" : "sos";

  // Parse map view
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const zoomStr = searchParams.get("zoom");

  let view: MapViewState | null = null;
  if (latStr && lngStr) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const zoom = zoomStr ? parseInt(zoomStr, 10) : DEFAULT_ZOOM;
    if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
      view = { lat, lng, zoom };
    }
  }

  // Parse selected entity
  let selected: SelectedEntity = null;
  const selType = searchParams.get("sel");
  const selId = searchParams.get("id");
  if (selType && selId) {
    switch (selType) {
      case "sos":
        selected = { type: "sos", id: selId };
        break;
      case "cluster":
        selected = { type: "cluster", id: parseInt(selId, 10) };
        break;
      case "depot":
        selected = { type: "depot", id: parseInt(selId, 10) };
        break;
      case "ap":
        selected = { type: "assemblyPoint", id: parseInt(selId, 10) };
        break;
    }
  }

  return { view, selected, mode };
}

// ── Hook ──

export function useMapUrlSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if this is the initial load (to prevent overwriting URL on first render)
  const isInitialLoadRef = useRef(true);

  // Track the last URL we wrote to avoid circular updates
  const lastWrittenUrlRef = useRef<string>("");

  // Parse the current URL state
  const urlState = useMemo(() => parseUrlState(searchParams), [searchParams]);

  // ── Build new URL search params ──
  const buildSearchParams = useCallback(
    (
      mapView?: MapViewState | null,
      selected?: SelectedEntity,
      mode?: "sos" | "weather",
    ): URLSearchParams => {
      const params = new URLSearchParams();

      // Mode
      const effectiveMode = mode ?? urlState.mode;
      if (effectiveMode === "weather") {
        params.set("mode", "weather");
      }

      // Map view (round to 4 decimal places for cleaner URLs)
      if (mapView) {
        params.set("lat", mapView.lat.toFixed(4));
        params.set("lng", mapView.lng.toFixed(4));
        params.set("zoom", String(mapView.zoom));
      }

      // Selected entity
      const effectiveSelected =
        selected !== undefined ? selected : urlState.selected;
      if (effectiveSelected) {
        const typeKey =
          effectiveSelected.type === "assemblyPoint"
            ? "ap"
            : effectiveSelected.type;
        params.set("sel", typeKey);
        params.set("id", String(effectiveSelected.id));
      }

      return params;
    },
    [urlState],
  );

  // ── Push URL (debounced for map moves) ──
  const updateUrl = useCallback(
    (params: URLSearchParams, replace = true) => {
      const paramString = params.toString();
      const newUrl = paramString ? `${pathname}?${paramString}` : pathname;

      // Skip if the URL hasn't changed
      if (lastWrittenUrlRef.current === newUrl) return;
      lastWrittenUrlRef.current = newUrl;

      if (replace) {
        router.replace(newUrl, { scroll: false });
      } else {
        router.push(newUrl, { scroll: false });
      }
    },
    [pathname, router],
  );

  // ── Map moved/zoomed (debounced) ──
  const handleMapViewChange = useCallback(
    (view: MapViewState) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const params = buildSearchParams(view);
        updateUrl(params, true); // replace (don't push history for every pan)
      }, DEBOUNCE_MS);
    },
    [buildSearchParams, updateUrl],
  );

  // ── Entity selected (immediate, push to history) ──
  const handleEntitySelect = useCallback(
    (entity: SelectedEntity, mapView?: MapViewState) => {
      // Cancel any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const params = buildSearchParams(mapView, entity);
      updateUrl(params, false); // push (new history entry for selection)
    },
    [buildSearchParams, updateUrl],
  );

  // ── Clear selection ──
  const clearSelection = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const params = buildSearchParams(undefined, null);
    updateUrl(params, true);
  }, [buildSearchParams, updateUrl]);

  // ── Mark initial load as done after first render ──
  useEffect(() => {
    // After the first render cycle, mark initial load as done
    const timer = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ── Cleanup debounce on unmount ──
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    /** Parsed state from the current URL */
    urlState,

    /** Whether the URL has map view params (for initialization) */
    hasInitialView: urlState.view !== null,

    /** Initial map center from URL (or defaults) */
    initialCenter: urlState.view
      ? { lat: urlState.view.lat, lng: urlState.view.lng }
      : DEFAULT_CENTER,

    /** Initial zoom from URL (or default) */
    initialZoom: urlState.view?.zoom ?? DEFAULT_ZOOM,

    /** Call when map pans/zooms (debounced URL update) */
    handleMapViewChange,

    /** Call when user selects an entity (immediate URL update + history push) */
    handleEntitySelect,

    /** Call to clear the current selection from URL */
    clearSelection,

    /** Whether this is the initial page load */
    isInitialLoad: isInitialLoadRef,
  };
}
