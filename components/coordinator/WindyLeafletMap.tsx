"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeatherLayer, WindyLeafletMapProps } from "@/type";
import { WINDY_LAYERS } from "@/lib/constants";

// Default coordinates for Central Vietnam (Huế)
const DEFAULT_LAT = 16.4637;
const DEFAULT_LON = 107.5909;
const DEFAULT_ZOOM = 10;

const WindyLeafletMap = ({ flyToLocation }: WindyLeafletMapProps) => {
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("wind");

  // Use flyToLocation if available, otherwise default
  const centerLat = flyToLocation?.lat || DEFAULT_LAT;
  const centerLon = flyToLocation?.lng || DEFAULT_LON;

  // Generate Windy embed URL
  const getWindyUrl = () => {
    return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=${DEFAULT_ZOOM}&overlay=${activeLayer}&product=ecmwf&level=surface&lat=${centerLat}&lon=${centerLon}&marker=false&message=false`;
  };

  return (
    <div className="w-full h-full relative">
      {/* Windy Weather Map iframe */}
      <iframe
        src={getWindyUrl()}
        className="w-full h-full border-0"
        title="Windy Weather Map"
        loading="lazy"
        allow="geolocation"
      />

      {/* Layer Selector - Top Left */}
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
    </div>
  );
};

export default WindyLeafletMap;
