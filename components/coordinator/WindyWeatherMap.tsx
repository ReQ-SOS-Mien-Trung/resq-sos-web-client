"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Cloud, ArrowsOut } from "@phosphor-icons/react";
import { WeatherLayer } from "@/type";
import { WINDY_LAYERS } from "@/lib/constants";

interface WindyWeatherMapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Default coordinates for Central Vietnam (Miền Trung)
const DEFAULT_LAT = 16.0544;
const DEFAULT_LON = 108.2022;
const DEFAULT_ZOOM = 7;

const WindyWeatherMap = ({ open, onOpenChange }: WindyWeatherMapProps) => {
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("wind");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getWindyUrl = (layer: WeatherLayer) => {
    // Windy.com embed URL with different overlays
    return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=${DEFAULT_ZOOM}&overlay=${layer}&product=ecmwf&level=surface&lat=${DEFAULT_LAT}&lon=${DEFAULT_LON}&marker=false&message=false`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`${isFullscreen ? "w-full sm:max-w-full" : "w-full sm:max-w-2xl"} p-0 flex flex-col`}
      >
        <SheetHeader className="p-4 pb-2 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Cập nhật mỗi 6h
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8"
              >
                <ArrowsOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Layer Tabs */}
          <Tabs
            value={activeLayer}
            onValueChange={(v) => setActiveLayer(v as WeatherLayer)}
            className="flex-1 flex flex-col"
          >
            <div className="px-4 py-2 border-b bg-muted/30">
              <TabsList className="grid grid-cols-4 w-full">
                {WINDY_LAYERS.map((layer) => (
                  <TabsTrigger
                    key={layer.id}
                    value={layer.id}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    {layer.icon}
                    <span className="hidden sm:inline">{layer.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Map Content */}
            {WINDY_LAYERS.map((layer) => (
              <TabsContent
                key={layer.id}
                value={layer.id}
                className="flex-1 m-0 data-[state=active]:flex data-[state=active]:flex-col"
              >
                <div className="flex-1 relative bg-slate-900">
                  <iframe
                    src={getWindyUrl(layer.id)}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    title={`Windy Weather Map - ${layer.label}`}
                    loading="lazy"
                    allow="geolocation"
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Info Footer */}
          <div className="p-3 border-t bg-muted/30 shrink-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Gió nhẹ
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                  Gió vừa
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                  Gió mạnh
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  Bão
                </span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WindyWeatherMap;
