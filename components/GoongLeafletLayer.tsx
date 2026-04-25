import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import mapboxgl from "mapbox-gl";

// Important: mapbox-gl-leaflet needs mapboxgl available globally
if (typeof window !== "undefined") {
  (window as any).mapboxgl = mapboxgl;
  require("mapbox-gl-leaflet");
}

interface GoongLeafletLayerProps {
  apiKey: string;
  styleUrl?: string;
}

export function GoongLeafletLayer({
  apiKey,
  styleUrl = `https://tiles.goong.io/assets/goong_map_web.json?api_key=${process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || ""}`,
}: GoongLeafletLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // @ts-ignore - L.mapboxGL is added by mapbox-gl-leaflet
    const glLayer = L.mapboxGL({
      accessToken: apiKey,
      style: styleUrl,
      // Optional optimization: prevent Mapbox GL from handling interactions
      interactive: false,
      transformRequest: (url: string) => {
        if (url.includes("tiles.goong.io") && !url.includes("api_key=")) {
          const sep = url.includes("?") ? "&" : "?";
          return { url: `${url}${sep}api_key=${apiKey}` };
        }
        return { url };
      }
    });

    glLayer.addTo(map);

    return () => {
      if (map.hasLayer(glLayer)) {
        map.removeLayer(glLayer);
      }
    };
  }, [map, apiKey, styleUrl]);

  return null;
}
