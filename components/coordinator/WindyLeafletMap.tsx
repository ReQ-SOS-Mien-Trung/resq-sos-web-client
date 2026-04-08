"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeatherLayer, WindyLeafletMapProps } from "@/type";
import { WINDY_LAYERS } from "@/lib/constants";
import { NavigationArrow } from "@phosphor-icons/react";

// Default coordinates for Central Vietnam (Huế)
const DEFAULT_LAT = 16.4637;
const DEFAULT_LON = 107.5909;
const DEFAULT_ZOOM = 10;

/* ─── global type declarations for Windy API ─── */
declare global {
  interface Window {
    windyInit: (
      options: Record<string, unknown>,
      callback: (api: WindyAPI) => void,
    ) => void;
  }
}

interface WindyAPI {
  map: L.Map;
  store: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    on: (key: string, cb: (...args: unknown[]) => void) => void;
  };
  overlays: Record<string, unknown>;
  picker: Record<string, unknown>;
}

/* ─── helpers: inject external scripts / stylesheets once ─── */
function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ═══════════════════════════════════════════════
   WindyLeafletMap  –  uses Windy Map Forecast API
   ═══════════════════════════════════════════════ */
const WindyLeafletMap = ({
  flyToLocation,
  userLocation,
}: WindyLeafletMapProps) => {
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("wind");
  const [isReady, setIsReady] = useState(false);

  // Refs survive re-renders; keep mutable handles here
  const mapRef = useRef<L.Map | null>(null);
  const storeRef = useRef<WindyAPI["store"] | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const activeLayerRef = useRef<WeatherLayer>(activeLayer);

  // Keep activeLayerRef in sync (so the init callback uses the latest value)
  activeLayerRef.current = activeLayer;

  /* ── 1. Bootstrap Windy API (runs once) ── */
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_WINDY_API_KEY;
    if (!apiKey) {
      console.error("NEXT_PUBLIC_WINDY_API_KEY is not set");
      return;
    }

    let cancelled = false;

    async function boot() {
      // Windy API requires Leaflet 1.4.0 + its own boot script
      loadCss("https://unpkg.com/leaflet@1.4.0/dist/leaflet.css");
      await loadScript("https://unpkg.com/leaflet@1.4.0/dist/leaflet.js");
      await loadScript("https://api.windy.com/assets/map-forecast/libBoot.js");

      if (cancelled) return;

      window.windyInit(
        {
          key: apiKey,
          lat: DEFAULT_LAT,
          lon: DEFAULT_LON,
          zoom: DEFAULT_ZOOM,
          verbose: false,
        },
        (windyAPI) => {
          if (cancelled) return;
          const { map, store } = windyAPI;
          mapRef.current = map;
          storeRef.current = store;

          // Set the initial overlay
          store.set("overlay", activeLayerRef.current);
          setIsReady(true);
        },
      );
    }

    boot().catch((err) => console.error("Windy boot failed", err));

    return () => {
      cancelled = true;
      // Remove user marker on unmount
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 2. Switch weather layer ── */
  useEffect(() => {
    if (isReady && storeRef.current) {
      storeRef.current.set("overlay", activeLayer);
    }
  }, [activeLayer, isReady]);

  /* ── 3. Fly to location (from sidebar search etc.) ── */
  useEffect(() => {
    if (isReady && mapRef.current && flyToLocation) {
      mapRef.current.flyTo(
        [flyToLocation.lat, flyToLocation.lng],
        DEFAULT_ZOOM,
      );
    }
  }, [flyToLocation, isReady]);

  /* ── 4. User Location Marker (pulsing blue dot, same as CoordinatorMap) ── */
  useEffect(() => {
    if (!isReady || !mapRef.current) return;

    const L = (window as unknown as { L: typeof import("leaflet") }).L;
    if (!L) return;

    if (userLocation) {
      if (userMarkerRef.current) {
        // Update existing marker position
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      } else {
        // Create marker with pulsing blue dot icon
        const icon = L.divIcon({
          className: "custom-user-location-marker",
          html: `
            <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.25);animation:windyUserPulse 2s ease-out infinite;"></div>
              <div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 6px rgba(59,130,246,0.6);position:relative;z-index:1;"></div>
            </div>
            <style>
              @keyframes windyUserPulse {
                0%   { transform:scale(0.8); opacity:1; }
                100% { transform:scale(2.2); opacity:0; }
              }
            </style>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon,
          zIndexOffset: 1000,
        })
          .addTo(mapRef.current)
          .bindPopup(
            `<div style="padding:8px;min-width:160px;">
              <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">📍 Vị trí của tôi</div>
              <div style="font-size:12px;color:#666;">
                ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}
              </div>
            </div>`,
          );
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userLocation, isReady]);

  /* ── 5. Fly to my location ── */
  const handleGoToMyLocation = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 14);
    }
  }, [userLocation]);

  /* ═══════ RENDER ═══════ */
  return (
    <div className="w-full h-full relative">
      {/* Windy API mounts into #windy */}
      <div id="windy" className="w-full h-full" />

      {/* Loading overlay while Windy boots */}
      {!isReady && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">
              Đang tải bản đồ thời tiết…
            </span>
          </div>
        </div>
      )}

      {/* Layer Selector – Top Left */}
      <div className="absolute top-4 left-4 z-[1000]">
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-2">
          <Tabs
            value={activeLayer}
            onValueChange={(v) => setActiveLayer(v as WeatherLayer)}
          >
            <TabsList className="grid grid-cols-4 gap-1">
              {WINDY_LAYERS.map((layer) => (
                <TabsTrigger
                  key={layer.id}
                  value={layer.id}
                  className="flex items-center gap-1.5 text-xs px-3"
                >
                  {layer.icon}
                  <span className="hidden sm:inline">{layer.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* My Location Button – Bottom Right */}
      {userLocation && (
        <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={handleGoToMyLocation}
            className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 border border-blue-400/60 shadow-lg flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all duration-150"
            title="Vị trí của tôi"
          >
            <NavigationArrow size={18} weight="fill" />
          </button>
        </div>
      )}
    </div>
  );
};

export default WindyLeafletMap;
