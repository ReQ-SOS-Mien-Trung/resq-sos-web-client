"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPin,
  CloudRain,
  Warning,
  Thermometer,
  Drop,
  Wind,
  WarningCircle,
  ArrowsClockwise,
  ArrowsCounterClockwise,
} from "@phosphor-icons/react";
import type { FloodAlert } from "@/types/admin-pages";
import { Button } from "@/components/ui/button";
import { WeatherMapSkeleton } from "./WeatherMapSkeleton";
import { Droplets, RefreshCw } from "lucide-react";

interface WeatherMapProps {
  floodAlerts: FloodAlert[];
}

type WeatherApiCurrentPoint =
  | {
      name: string;
      lat: number;
      lon: number;
      localtime: string;
      last_updated: string;
      temp_c: number;
      humidity: number;
      wind_degree: number;
      wind_dir: string;
      wind_kph: number;
      precip_mm: number;
      condition_text: string;
      condition_icon: string;
    }
  | {
      name: string;
      q: string;
      error: string;
    };

export function WeatherMap({ floodAlerts }: WeatherMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [liveWeather, setLiveWeather] = useState<
    WeatherApiCurrentPoint[] | null
  >(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [leaflet, setLeaflet] = useState<null | typeof import("leaflet")>(null);
  const [showWindLayer, setShowWindLayer] = useState(true);
  const [showWaterLayer, setShowWaterLayer] = useState(true);

  const loadWeather = useCallback(async () => {
    try {
      setWeatherLoading(true);
      setWeatherError(null);
      const res = await fetch("/api/weather/current", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          json?.error ||
            `Không lấy được dữ liệu thời tiết (HTTP ${res.status})`,
        );
      }
      setLiveWeather(json?.locations || []);
    } catch (e) {
      setWeatherError(e instanceof Error ? e.message : "Unknown error");
      setLiveWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Load Leaflet CSS
  useEffect(() => {
    const existingLink = document.querySelector('link[href*="leaflet.css"]');

    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      document.head.appendChild(link);

      return () => {
        const linkToRemove = document.querySelector(
          'link[href*="leaflet.css"]',
        );
        if (linkToRemove) {
          document.head.removeChild(linkToRemove);
        }
      };
    }
  }, []);

  useEffect(() => {
    // Needed for custom divIcons (wind arrows / water stations)
    import("leaflet")
      .then((mod) => setLeaflet(mod))
      .catch(() => setLeaflet(null));
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  // Central Vietnam coordinates (Hue)
  const defaultCenter = useMemo<[number, number]>(
    () => [16.4637, 107.5909],
    [],
  );
  const defaultZoom = 8;

  const mapCenter: [number, number] = useMemo(() => {
    const points =
      liveWeather?.filter(
        (p): p is Extract<WeatherApiCurrentPoint, { lat: number }> =>
          "lat" in p && "lon" in p,
      ) || [];
    if (points.length === 0) return defaultCenter;
    const avgLat =
      points.reduce((sum, p) => sum + p.lat, 0) / Math.max(points.length, 1);
    const avgLon =
      points.reduce((sum, p) => sum + p.lon, 0) / Math.max(points.length, 1);
    return [avgLat, avgLon];
  }, [liveWeather, defaultCenter]);

  const waterStations = useMemo(
    () => [
      {
        id: "wl-hue",
        name: "Trạm Huế (placeholder)",
        lat: 16.4637,
        lon: 107.5909,
      },
      {
        id: "wl-danang",
        name: "Trạm Đà Nẵng (placeholder)",
        lat: 16.0544,
        lon: 108.2022,
      },
      {
        id: "wl-quangnam",
        name: "Trạm Quảng Nam (placeholder)",
        lat: 15.5394,
        lon: 108.0191,
      },
      {
        id: "wl-quangngai",
        name: "Trạm Quảng Ngãi (placeholder)",
        lat: 15.1214,
        lon: 108.8044,
      },
      {
        id: "wl-binhdinh",
        name: "Trạm Bình Định (placeholder)",
        lat: 13.7765,
        lon: 109.2237,
      },
    ],
    [],
  );

  const makeWindIcon = useCallback(
    (deg: number) => {
      if (!leaflet) return undefined;
      const safeDeg = Number.isFinite(deg) ? deg : 0;
      return leaflet.divIcon({
        className: "custom-wind-marker",
        html: `<div style="
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          border: 2px solid rgba(255,255,255,0.95);
          box-shadow: 0 2px 10px rgba(0,0,0,0.25);
          background: rgba(59,130,246,0.95);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            transform: rotate(${safeDeg}deg);
            font-size: 18px;
            line-height: 1;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          ">➤</div>
        </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
    },
    [leaflet],
  );

  const makeWaterIcon = useCallback(() => {
    if (!leaflet) return undefined;
    return leaflet.divIcon({
      className: "custom-water-marker",
      html: `<div style="
        width: 36px;
        height: 36px;
        border-radius: 9999px;
        border: 2px solid rgba(255,255,255,0.95);
        box-shadow: 0 2px 10px rgba(0,0,0,0.25);
        background: rgba(14,165,233,0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: white;
      ">WL</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }, [leaflet]);

  if (!isMounted) {
    return <WeatherMapSkeleton />;
  }

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-500" />
            Bản đồ thời tiết & Lũ lụt
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showWindLayer ? "default" : "outline"}
              size="sm"
              onClick={() => setShowWindLayer((v) => !v)}
              className="gap-2"
              title="Bật/tắt layer gió"
            >
              <Wind className="h-4 w-4" />
              Gió
            </Button>
            <Button
              variant={showWaterLayer ? "default" : "outline"}
              size="sm"
              onClick={() => setShowWaterLayer((v) => !v)}
              className="gap-2"
              title="Bật/tắt layer mực nước (placeholder)"
            >
              <Droplets className="h-4 w-4" />
              Mực nước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadWeather}
              disabled={weatherLoading}
              className="gap-2"
              title="Tải lại dữ liệu WeatherAPI"
            >
              <ArrowsCounterClockwise
                className={weatherLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Tải lại
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {weatherLoading && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 text-sm">
            <ArrowsCounterClockwise className="h-4 w-4 mt-0.5 animate-spin text-muted-foreground" />
            <div className="text-muted-foreground">
              Đang tải dữ liệu thời tiết từ WeatherAPI...
            </div>
          </div>
        )}
        <div className="h-[400px] rounded-lg overflow-hidden">
          <MapContainer
            center={mapCenter}
            zoom={defaultZoom}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
            className="leaflet-container"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Weather Data Markers (live from WeatherAPI; fallback to mock if error) */}
            {liveWeather &&
              liveWeather
                .filter(
                  (p): p is Extract<WeatherApiCurrentPoint, { lat: number }> =>
                    "lat" in p && "lon" in p,
                )
                .map((p) => {
                  const windIcon = showWindLayer
                    ? makeWindIcon(p.wind_degree)
                    : undefined;
                  return (
                    <Marker
                      key={`weather-live-${p.name}`}
                      position={[p.lat, p.lon]}
                      icon={windIcon}
                    >
                      <Popup>
                        <div className="p-2 min-w-[220px]">
                          <h3 className="font-semibold text-foreground mb-2">
                            {p.name}
                          </h3>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <Thermometer className="h-4 w-4 text-orange-500" />
                              <span className="text-foreground">
                                Nhiệt độ: {p.temp_c}°C
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Droplets className="h-4 w-4 text-cyan-500" />
                              <span className="text-foreground">
                                Độ ẩm: {p.humidity}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CloudRain className="h-4 w-4 text-blue-500" />
                              <span className="text-foreground">
                                Lượng mưa: {p.precip_mm}mm
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Wind className="h-4 w-4 text-gray-500" />
                              <span className="text-foreground">
                                Gió: {p.wind_kph} km/h ({p.wind_dir},{" "}
                                {p.wind_degree}°)
                              </span>
                            </div>
                            <div className="text-xs text-foreground/80 mt-2">
                              {p.condition_text}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Cập nhật:{" "}
                              {new Date(p.last_updated).toLocaleString("vi-VN")}
                            </p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

            {showWaterLayer &&
              waterStations.map((s) => (
                <Marker
                  key={s.id}
                  position={[s.lat, s.lon]}
                  icon={makeWaterIcon()}
                >
                  <Popup>
                    <div className="p-2 min-w-[240px]">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="h-5 w-5 text-sky-500" />
                        <h3 className="font-semibold text-foreground">
                          {s.name}
                        </h3>
                      </div>
                      <div className="text-sm text-foreground/80">
                        Chưa có nguồn dữ liệu mực nước. Layer này đang là
                        placeholder để bạn dễ hình dung vị trí trạm.
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Flood Alert Markers */}
            {floodAlerts.map((alert) => {
              const levelLabels = {
                low: "Thấp",
                medium: "Trung bình",
                high: "Cao",
                critical: "Khẩn cấp",
              };
              const statusLabels = {
                active: "Đang hoạt động",
                monitoring: "Đang theo dõi",
                resolved: "Đã giải quyết",
              };

              return (
                <Marker
                  key={alert.id}
                  position={[alert.coordinates.lat, alert.coordinates.lng]}
                >
                  <Popup>
                    <div className="p-2 min-w-[250px]">
                      <div className="flex items-center gap-2 mb-2">
                        <Warning className="h-5 w-5 text-red-500" />
                        <h3 className="font-semibold text-foreground">
                          {alert.region}
                        </h3>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-foreground">
                            Mức độ:{" "}
                          </span>
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {levelLabels[alert.level]}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Trạng thái:{" "}
                          </span>
                          <span>{statusLabels[alert.status]}</span>
                        </div>
                        <p className="text-foreground/80">
                          {alert.description}
                        </p>
                        {alert.affectedAreas.length > 0 && (
                          <div>
                            <span className="font-medium text-foreground">
                              Khu vực ảnh hưởng:
                            </span>
                            <ul className="list-disc list-inside mt-1 text-foreground/70">
                              {alert.affectedAreas.map((area, idx) => (
                                <li key={idx}>{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Cập nhật:{" "}
                          {new Date(alert.updatedAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
        {weatherError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 p-3 text-sm">
            <WarningCircle className="h-4 w-4 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="text-rose-800 dark:text-rose-300">
              Không lấy được dữ liệu WeatherAPI: {weatherError}
              <div className="text-rose-700/80 dark:text-rose-300/80 text-xs mt-1">
                Điểm thời tiết sẽ không hiển thị cho đến khi API hoạt động. Bấm
                “Tải lại” sau khi bạn sửa cấu hình `.env.local` và restart
                server.
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
            <span>
              Gió (
              {liveWeather
                ? liveWeather.filter((p) => "lat" in p && "lon" in p).length
                : 0}
              )
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-sky-500 border-2 border-white"></div>
            <span>
              Mực nước (placeholder: {showWaterLayer ? waterStations.length : 0}
              )
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white animate-pulse"></div>
            <span>Cảnh báo lũ lụt ({floodAlerts.length})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
