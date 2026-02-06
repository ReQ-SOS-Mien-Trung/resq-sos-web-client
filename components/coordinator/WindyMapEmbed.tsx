"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeatherLayer } from "@/type";
import { WINDY_LAYERS } from "@/lib/constants";

// Default coordinates for Central Vietnam (Miền Trung)
const DEFAULT_LAT = 16.0544;
const DEFAULT_LON = 108.2022;
const DEFAULT_ZOOM = 7;

const WindyMapEmbed = () => {
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("wind");

  const getWindyUrl = (layer: WeatherLayer) => {
    return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=${DEFAULT_ZOOM}&overlay=${layer}&product=ecmwf&level=surface&lat=${DEFAULT_LAT}&lon=${DEFAULT_LON}&marker=false&message=false`;
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

      {/* Windy Map iFrame */}
      <iframe
        src={getWindyUrl(activeLayer)}
        className="w-full h-full border-0"
        title="Windy Weather Map"
        loading="lazy"
        allow="geolocation"
      />
    </div>
  );
};

export default WindyMapEmbed;
