import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import mapboxgl from "mapbox-gl";

interface GoongLeafletLayerProps {
  apiKey: string;
  styleUrl?: string;
  hidePointsOfInterest?: boolean;
}

type GoongStyleLayer = {
  id?: string;
  layout?: Record<string, unknown>;
  [key: string]: unknown;
};

type GoongMapStyle = {
  layers?: GoongStyleLayer[];
  [key: string]: unknown;
};

type MapboxGlLeafletOptions = {
  accessToken: string;
  style: string | GoongMapStyle;
  interactive: boolean;
  transformRequest: (url: string) => { url: string };
};

type LeafletWithMapboxGl = typeof L & {
  mapboxGL?: (options: MapboxGlLeafletOptions) => L.Layer;
};

let mapboxGlLeafletPromise: Promise<unknown> | null = null;

function loadMapboxGlLeaflet() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  (window as Window & { mapboxgl?: typeof mapboxgl }).mapboxgl = mapboxgl;
  mapboxGlLeafletPromise ??= import("mapbox-gl-leaflet");
  return mapboxGlLeafletPromise;
}

function hidePoiLayers(style: GoongMapStyle): GoongMapStyle {
  return {
    ...style,
    layers: style.layers?.map((layer) => {
      if (typeof layer.id !== "string" || !layer.id.startsWith("poi-")) {
        return layer;
      }

      return {
        ...layer,
        layout: {
          ...(layer.layout ?? {}),
          visibility: "none",
        },
      };
    }),
  };
}

export function GoongLeafletLayer({
  apiKey,
  styleUrl = `https://tiles.goong.io/assets/goong_map_web.json?api_key=${process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || ""}`,
  hidePointsOfInterest = false,
}: GoongLeafletLayerProps) {
  const map = useMap();
  const [resolvedStyle, setResolvedStyle] = useState<
    string | GoongMapStyle | null
  >(hidePointsOfInterest ? null : styleUrl);

  useEffect(() => {
    let cancelled = false;

    if (!hidePointsOfInterest) {
      setResolvedStyle(styleUrl);
      return () => {
        cancelled = true;
      };
    }

    setResolvedStyle(null);

    async function loadCleanStyle() {
      try {
        const response = await fetch(styleUrl);
        if (!response.ok) {
          throw new Error(`Unable to load Goong style: ${response.status}`);
        }

        const style = (await response.json()) as GoongMapStyle;
        if (!cancelled) {
          setResolvedStyle(hidePoiLayers(style));
        }
      } catch {
        if (!cancelled) {
          setResolvedStyle(styleUrl);
        }
      }
    }

    loadCleanStyle();

    return () => {
      cancelled = true;
    };
  }, [hidePointsOfInterest, styleUrl]);

  useEffect(() => {
    if (!map || !resolvedStyle) return;

    let cancelled = false;
    let glLayer: L.Layer | null = null;

    async function addGoongLayer() {
      await loadMapboxGlLeaflet();
      if (cancelled) return;

      const mapboxGL = (L as LeafletWithMapboxGl).mapboxGL;
      if (!mapboxGL) return;

      glLayer = mapboxGL({
        accessToken: apiKey,
        style: resolvedStyle,
        // Optional optimization: prevent Mapbox GL from handling interactions
        interactive: false,
        transformRequest: (url: string) => {
          if (url.includes("tiles.goong.io") && !url.includes("api_key=")) {
            const sep = url.includes("?") ? "&" : "?";
            return { url: `${url}${sep}api_key=${apiKey}` };
          }
          return { url };
        },
      });

      glLayer.addTo(map);
    }

    addGoongLayer();

    return () => {
      cancelled = true;
      if (glLayer && map.hasLayer(glLayer)) {
        map.removeLayer(glLayer);
      }
    };
  }, [map, apiKey, resolvedStyle]);

  return null;
}
