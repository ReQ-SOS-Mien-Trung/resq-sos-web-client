"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { DashboardLayout } from "@/components/admin/dashboard";
import { FloodAlerts, WeatherChart } from "@/components/admin/weather-flood";
import type { FloodAlert, WeatherData } from "@/types/admin-pages";
import { mockFloodAlerts } from "@/lib/mock-data/admin-weather-flood";
import { PageLoading } from "@/components/admin/PageLoading";

const WeatherMap = dynamic(
  () => import("@/components/admin/weather-flood").then((mod) => ({ default: mod.WeatherMap })),
  { ssr: false }
);

export default function WeatherFloodPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [floodAlerts] = useState<FloodAlert[]>(mockFloodAlerts);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, weatherRes] = await Promise.all([
          getDashboardData(),
          fetch("/api/weather/current"),
        ]);

        setDashboardData(dashboardRes);

        if (weatherRes.ok) {
          const json = await weatherRes.json().catch(() => null);
          type WeatherLocationOk = {
            name: string;
            temp_c: number;
            humidity: number;
            precip_mm: number;
            wind_kph: number;
            condition_text: string;
            last_updated: string;
          };
          type WeatherLocationErr = { error: string };
          type WeatherLocation = WeatherLocationOk | WeatherLocationErr;

          const locations = (json?.locations as WeatherLocation[]) || [];

          const isOk = (loc: WeatherLocation): loc is WeatherLocationOk =>
            !!loc && !("error" in loc) && typeof (loc as WeatherLocationOk).condition_text === "string";

          const mappedWeather: WeatherData[] = locations
            .filter(isOk)
            .map((loc) => {
              const conditionText = loc.condition_text.toLowerCase();
              let condition: WeatherData["condition"] = "sunny";
              if (conditionText.includes("rain") || conditionText.includes("mưa")) {
                condition = "rainy";
              } else if (
                conditionText.includes("storm") ||
                conditionText.includes("bão")
              ) {
                condition = "stormy";
              } else if (
                conditionText.includes("cloud") ||
                conditionText.includes("mây")
              ) {
                condition = "cloudy";
              }

              return {
                region: loc.name,
                temperature: loc.temp_c,
                humidity: loc.humidity,
                rainfall: loc.precip_mm,
                windSpeed: loc.wind_kph,
                condition,
                timestamp: loc.last_updated,
              };
            });

          setWeatherData(mappedWeather);
        } else {
          console.error("Failed to fetch weather current:", await weatherRes.text());
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !dashboardData) {
    return <PageLoading />;
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

        <WeatherMap floodAlerts={floodAlerts} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FloodAlerts alerts={floodAlerts} />
          <div className="space-y-6">
            <WeatherChart data={weatherData} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
