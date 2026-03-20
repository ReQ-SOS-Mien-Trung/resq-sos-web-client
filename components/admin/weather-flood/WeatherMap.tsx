"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsCounterClockwise,
  MapPin,
  WarningCircle,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WINDY_LAYERS } from "@/lib/constants";
import { WeatherLayer, WeatherMapProps } from "@/type";
import WeatherMapSkeleton from "./WeatherMapSkeleton";

declare global {
  interface Window {
    windyInit: (
      options: Record<string, unknown>,
      callback: (api: WindyAPI) => void,
    ) => void;
    L: typeof import("leaflet");
  }
}

interface WindyAPI {
  map: L.Map;
  store: {
    set: (key: string, value: unknown) => void;
  };
}

const DEFAULT_CENTER: [number, number] = [16.4637, 107.5909];
const DEFAULT_ZOOM = 8;

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

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function WeatherMap({
  liveWeather,
  weatherLoading,
  weatherError,
  onRefreshWeather,
}: WeatherMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [windyError, setWindyError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("wind");

  const mapRef = useRef<L.Map | null>(null);
  const storeRef = useRef<WindyAPI["store"] | null>(null);
  const activeLayerRef = useRef<WeatherLayer>(activeLayer);

  useEffect(() => {
    activeLayerRef.current = activeLayer;
  }, [activeLayer]);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const weatherPoints = useMemo(
    () =>
      liveWeather.filter(
        (
          point,
        ): point is Extract<(typeof liveWeather)[number], { lat: number }> =>
          "lat" in point && "lon" in point,
      ),
    [liveWeather],
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (weatherPoints.length === 0) return DEFAULT_CENTER;
    const avgLat =
      weatherPoints.reduce((sum, point) => sum + point.lat, 0) /
      weatherPoints.length;
    const avgLon =
      weatherPoints.reduce((sum, point) => sum + point.lon, 0) /
      weatherPoints.length;
    return [avgLat, avgLon];
  }, [weatherPoints]);

  const missingWindyApiKey = !process.env.NEXT_PUBLIC_WINDY_API_KEY;
  const effectiveWindyError = missingWindyApiKey
    ? "Thiếu NEXT_PUBLIC_WINDY_API_KEY. Hãy thêm key Windy giống trang coordinator để hiển thị bản đồ thời tiết thật."
    : windyError;

  useEffect(() => {
    if (!isMounted) return;

    const apiKey = process.env.NEXT_PUBLIC_WINDY_API_KEY;
    if (!apiKey) {
      return;
    }

    let cancelled = false;

    async function boot() {
      try {
        loadCss("https://unpkg.com/leaflet@1.4.0/dist/leaflet.css");
        await loadScript("https://unpkg.com/leaflet@1.4.0/dist/leaflet.js");
        await loadScript(
          "https://api.windy.com/assets/map-forecast/libBoot.js",
        );

        if (cancelled) return;

        window.windyInit(
          {
            key: apiKey,
            lat: DEFAULT_CENTER[0],
            lon: DEFAULT_CENTER[1],
            zoom: DEFAULT_ZOOM,
            verbose: false,
          },
          (windyAPI) => {
            if (cancelled) return;
            mapRef.current = windyAPI.map;
            storeRef.current = windyAPI.store;
            windyAPI.store.set("overlay", activeLayerRef.current);
            setIsMapReady(true);
            setWindyError(null);
          },
        );
      } catch (error) {
        if (cancelled) return;
        setWindyError(
          error instanceof Error
            ? error.message
            : "Không thể khởi tạo Windy Map.",
        );
      }
    }

    boot();

    return () => {
      cancelled = true;
      try {
        mapRef.current?.remove();
      } catch {
        // Ignore teardown races from external Windy map.
      }
      mapRef.current = null;
      storeRef.current = null;
      setIsMapReady(false);
    };
  }, [isMounted]);

  useEffect(() => {
    if (isMapReady && storeRef.current) {
      storeRef.current.set("overlay", activeLayer);
    }
  }, [activeLayer, isMapReady]);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || weatherPoints.length === 0) return;
    mapRef.current.flyTo(mapCenter, DEFAULT_ZOOM, {
      animate: true,
      duration: 0.75,
    });
  }, [isMapReady, mapCenter, weatherPoints.length]);

  if (!isMounted) {
    return <WeatherMapSkeleton />;
  }

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Bản đồ thời tiết miền Trung & Lũ lụt
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshWeather}
            disabled={weatherLoading}
            className="gap-2"
            title="Tải lại dữ liệu WeatherAPI"
          >
            <ArrowsCounterClockwise
              className={weatherLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
            Tải lại dữ liệu
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={activeLayer}
            onValueChange={(value) => setActiveLayer(value as WeatherLayer)}
          >
            <TabsList className="grid h-auto w-full grid-cols-4 rounded-xl bg-muted/40 p-1 lg:w-auto">
              {WINDY_LAYERS.map((layer) => (
                <TabsTrigger
                  key={layer.id}
                  value={layer.id}
                  className="gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
                >
                  {layer.icon}
                  <span className="hidden sm:inline">{layer.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="relative h-[640px] overflow-hidden rounded-xl border border-border/60 bg-slate-100">
          <div id="windy" className="h-full w-full" />

          {!isMapReady && !effectiveWindyError && (
            <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                <span className="text-sm text-muted-foreground">
                  Đang tải Windy Map...
                </span>
              </div>
            </div>
          )}

          {effectiveWindyError && (
            <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-background/90 p-6">
              <div className="max-w-md rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-700 shadow-sm">
                <div className="flex items-start gap-2">
                  <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      Không khởi tạo được Windy Map
                    </p>
                    <p className="mt-1 leading-relaxed">
                      {effectiveWindyError}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {weatherError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-sm">
            <WarningCircle className="mt-0.5 h-4 w-4 text-rose-600" />
            <div className="text-rose-800">
              Không lấy được dữ liệu WeatherAPI: {weatherError}
              <div className="mt-1 text-xs text-rose-700/80">
                Marker thời tiết sẽ không hiển thị cho đến khi WeatherAPI hoạt
                động lại. Bạn vẫn có thể xem nền bản đồ Windy nếu
                `NEXT_PUBLIC_WINDY_API_KEY` đã được cấu hình.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
