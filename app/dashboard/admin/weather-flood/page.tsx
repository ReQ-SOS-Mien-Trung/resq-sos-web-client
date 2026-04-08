"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { CaretDown, CaretUp, MapTrifold } from "@phosphor-icons/react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { mockFloodAlerts } from "@/lib/mock-data/admin-weather-flood";
import { DashboardSkeleton } from "@/components/admin";
import { FloodAlert, WeatherApiCurrentPoint } from "@/type";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Icon } from "@iconify/react";

const WeatherMap = dynamic(
  () =>
    import("@/components/admin/weather-flood").then((mod) => ({
      default: mod.WeatherMap,
    })),
  { ssr: false },
);

const FloodAlertComposer = dynamic(
  () =>
    import("@/components/admin/weather-flood").then((mod) => ({
      default: mod.FloodAlertComposer,
    })),
  { ssr: false },
);

const WeatherFloodPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [floodAlerts] = useState<FloodAlert[]>(mockFloodAlerts);
  const [liveWeather, setLiveWeather] = useState<WeatherApiCurrentPoint[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(false);

  const loadWeather = useCallback(async () => {
    try {
      setWeatherLoading(true);
      setWeatherError(null);
      const weatherRes = await fetch("/api/weather/current", {
        cache: "no-store",
      });
      const json = await weatherRes.json().catch(() => null);

      if (!weatherRes.ok) {
        throw new Error(
          json?.error ||
            `Không lấy được dữ liệu thời tiết (HTTP ${weatherRes.status})`,
        );
      }

      setLiveWeather((json?.locations as WeatherApiCurrentPoint[]) || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown weather error";
      setWeatherError(message);
      setLiveWeather([]);
      console.error("Failed to fetch weather current:", error);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardRes = await getDashboardData();
        setDashboardData(dashboardRes);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    loadWeather();
  }, [loadWeather]);

  if (loading || !dashboardData) {
    return (
      <DashboardLayout
        favorites={[]}
        projects={[]}
        cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
      >
        <DashboardSkeleton variant="dashboard" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      favorites={dashboardData.favorites}
      projects={dashboardData.projects}
      cloudStorage={dashboardData.cloudStorage}
    >
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Compact header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Icon
                icon="wi:forecast-io-hail"
                width="30"
                height="30"
                className="text-foreground"
              />
              <p className="text-sm font-semibold uppercase tracking-tighter text-muted-foreground">
                Cảnh báo tai ương
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Thời tiết & Cảnh báo lũ
            </h1>
            <p className="text-base tracking-tighter text-muted-foreground mt-1.5">
              Phát cảnh báo lũ lụt đến người dùng
            </p>
          </div>
        </div>

        {/* Full-width Composer — primary action */}
        <FloodAlertComposer
          liveWeather={liveWeather}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          onRefreshWeather={loadWeather}
        />

        {/* Collapsible Weather Map — secondary context */}
        <div className="rounded-xl border border-border/50 bg-background">
          <button
            type="button"
            onClick={() => setMapExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 tracking-tighter text-sm font-semibold text-foreground">
              <MapTrifold size={18} weight="duotone" className="text-sky-600" />
              Bản đồ thời tiết miền Trung
            </span>
            <span className="flex items-center gap-1.5 text-xs tracking-tighter text-muted-foreground">
              {mapExpanded ? "Thu gọn" : "Mở rộng"}
              {mapExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
            </span>
          </button>
          {mapExpanded && (
            <div className="border-t border-border/40 px-4 pb-4">
              <WeatherMap
                floodAlerts={floodAlerts}
                liveWeather={liveWeather}
                weatherLoading={weatherLoading}
                weatherError={weatherError}
                onRefreshWeather={loadWeather}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WeatherFloodPage;
