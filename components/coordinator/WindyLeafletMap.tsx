"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Cloud, Wind, Thermometer, Drop } from "@phosphor-icons/react";
import { WeatherLayer, SOSCluster, Rescuer, Depot, Location } from "@/type";

interface WindyLeafletMapProps {
  clusters: SOSCluster[];
  rescuers: Rescuer[];
  depots: Depot[];
  selectedCluster?: SOSCluster | null;
  selectedRescuer?: Rescuer | null;
  onClusterSelect: (cluster: SOSCluster) => void;
  onRescuerSelect: (rescuer: Rescuer) => void;
  flyToLocation?: Location | null;
}

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
