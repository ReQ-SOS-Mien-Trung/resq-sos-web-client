"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Cloud, Wind, Thermometer, Drop } from "@phosphor-icons/react";

type WeatherLayer = "wind" | "temp" | "rain" | "clouds";

const WINDY_LAYERS: {
  id: WeatherLayer;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "wind", label: "Gió", icon: <Wind className="h-4 w-4" /> },
  { id: "temp", label: "Nhiệt độ", icon: <Thermometer className="h-4 w-4" /> },
  {
    id: "rain",
    label: "Mưa",
    icon: <Drop className="h-4 w-4" weight="fill" />,
  },
  { id: "clouds", label: "Mây", icon: <Cloud className="h-4 w-4" /> },
];

// Default coordinates for Central Vietnam (Miền Trung)
const DEFAULT_LAT = 16.0544;
const DEFAULT_LON = 108.2022;
const DEFAULT_ZOOM = 7;

const WindyMapEmbed = () => {
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("wind");

  const getWindyUrl = (layer: WeatherLayer) => {
    return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=${DEFAULT_ZOOM}&overlay=${layer}&product=ecmwf&level=surface&lat=${DEFAULT_LAT}&lon=${DEFAULT_LON}&detailLat=${DEFAULT_LAT}&detailLon=${DEFAULT_LON}&marker=true&message=true`;
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Layer Selector - Floating on top */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-2">
          <Tabs
            value={activeLayer}
            onValueChange={(v) => setActiveLayer(v as WeatherLayer)}
          >
            <TabsList className="grid grid-cols-4">
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

      {/* Info Badge - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Bản đồ Thời tiết</span>
            <Badge variant="outline" className="text-xs">
              ECMWF
            </Badge>
          </div>
        </div>
      </div>

      {/* Windy Map iFrame */}
      <iframe
        src={getWindyUrl(activeLayer)}
        className="w-full h-full border-0"
        title="Windy Weather Map"
        loading="lazy"
        allow="geolocation"
      />

      {/* Legend Footer */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg p-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Nhẹ
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
              Vừa
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange-500"></span>
              Mạnh
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              Bão
            </span>
          </div>
        </div>
      </div>

      {/* Windy Attribution */}
      <div className="absolute bottom-4 right-4 z-10">
        <a
          href="https://www.windy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg px-3 py-2 text-xs text-blue-500 hover:underline flex items-center gap-1"
        >
          <Wind className="h-3 w-3" />
          Powered by Windy.com
        </a>
      </div>
    </div>
  );
};

export default WindyMapEmbed;
