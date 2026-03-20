"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { mockFloodAlerts } from "@/lib/mock-data/admin-weather-flood";
import { DashboardSkeleton } from "@/components/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FloodAlert, WeatherApiCurrentPoint } from "@/type";
import { DashboardLayout } from "@/components/admin/dashboard";

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
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Thời tiết & Lũ lụt
          </h1>
          <p className="text-muted-foreground">
            Theo dõi thời tiết và cảnh báo lũ lụt
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.95fr)]">
          <WeatherMap
            floodAlerts={floodAlerts}
            liveWeather={liveWeather}
            weatherLoading={weatherLoading}
            weatherError={weatherError}
            onRefreshWeather={loadWeather}
          />

          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle>Phát cảnh báo lũ</CardTitle>
            </CardHeader>
            <CardContent>
              <FloodAlertComposer
                liveWeather={liveWeather}
                weatherLoading={weatherLoading}
                weatherError={weatherError}
                onRefreshWeather={loadWeather}
              />
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default WeatherFloodPage;
