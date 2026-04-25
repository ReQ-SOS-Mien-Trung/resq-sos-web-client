"use client";

import "@goongmaps/goong-js/dist/goong-js.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useEffect, useRef, useState } from "react";
// @ts-ignore
import goongjs from "@goongmaps/goong-js";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Coordinate, ServiceZoneEntity } from "@/services/map/type";

// ─── Props ───
interface MapZoneEditorProps {
  existingCoordinates?: Coordinate[];
  onCoordinatesChange: (coords: Coordinate[] | null) => void;
  sidebarOpen?: boolean;
  allZones?: ServiceZoneEntity[];
  highlightedZoneId?: number | null;
}

// ─── Zone colors ───
const ACTIVE_COLOR = "#16A34A"; // dark green for active zones
const INACTIVE_COLOR = "#94a3b8"; // gray for inactive zones
const HIGHLIGHT_COLOR = "#FF5722"; // orange when hovered from sidebar

// ─── Custom Draw Styles ───
// Fix: default mapbox-gl-draw theme uses data-driven expressions for line-dasharray
// which Goong JS cannot parse (arrays starting with numbers are treated as expressions).
// We split the line layer into active/inactive with static dasharray values.
const drawBlue = "#3bb2d0";
const drawOrange = "#fbb03b";
const drawWhite = "#fff";

const customDrawStyles: object[] = [
  // Polygon fill
  {
    id: "gl-draw-polygon-fill",
    type: "fill",
    filter: ["all", ["==", "$type", "Polygon"]],
    paint: {
      "fill-color": [
        "case",
        ["==", ["get", "active"], "true"],
        drawOrange,
        drawBlue,
      ],
      "fill-opacity": 0.1,
    },
  },
  // Lines – inactive (solid) — legacy filter: ["!=", "active", "true"]
  {
    id: "gl-draw-lines-inactive",
    type: "line",
    filter: [
      "all",
      ["any", ["==", "$type", "LineString"], ["==", "$type", "Polygon"]],
      ["!=", "active", "true"],
    ],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": drawBlue,
      "line-dasharray": [2, 0],
      "line-width": 2,
    },
  },
  // Lines – active (dashed) — legacy filter: ["==", "active", "true"]
  {
    id: "gl-draw-lines-active",
    type: "line",
    filter: [
      "all",
      ["any", ["==", "$type", "LineString"], ["==", "$type", "Polygon"]],
      ["==", "active", "true"],
    ],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": drawOrange,
      "line-dasharray": [0.2, 2],
      "line-width": 2,
    },
  },
  // Points – outer circle (inactive)
  {
    id: "gl-draw-point-outer-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "meta", "feature"],
      ["!=", "active", "true"],
    ],
    paint: {
      "circle-radius": 5,
      "circle-color": drawWhite,
    },
  },
  // Points – outer circle (active)
  {
    id: "gl-draw-point-outer-active",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "meta", "feature"],
      ["==", "active", "true"],
    ],
    paint: {
      "circle-radius": 7,
      "circle-color": drawWhite,
    },
  },
  // Points – inner circle (inactive)
  {
    id: "gl-draw-point-inner-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "meta", "feature"],
      ["!=", "active", "true"],
    ],
    paint: {
      "circle-radius": 3,
      "circle-color": drawBlue,
    },
  },
  // Points – inner circle (active)
  {
    id: "gl-draw-point-inner-active",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "meta", "feature"],
      ["==", "active", "true"],
    ],
    paint: {
      "circle-radius": 5,
      "circle-color": drawOrange,
    },
  },
  // Vertex – outer (inactive)
  {
    id: "gl-draw-vertex-outer-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "meta", "vertex"],
      ["!=", "mode", "simple_select"],
      ["!=", "active", "true"],
    ],
    paint: {
      "circle-radius": 5,
      "circle-color": drawWhite,
    },
  },
  // Vertex – outer (active)
  {
    id: "gl-draw-vertex-outer-active",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "meta", "vertex"],
      ["!=", "mode", "simple_select"],
      ["==", "active", "true"],
    ],
    paint: {
      "circle-radius": 7,
      "circle-color": drawWhite,
    },
  },
  // Vertex – inner
  {
    id: "gl-draw-vertex-inner",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "meta", "vertex"],
      ["!=", "mode", "simple_select"],
    ],
    paint: {
      "circle-radius": 3,
      "circle-color": drawOrange,
    },
  },
  // Midpoint
  {
    id: "gl-draw-midpoint",
    type: "circle",
    filter: ["all", ["==", "meta", "midpoint"]],
    paint: {
      "circle-radius": 3,
      "circle-color": drawOrange,
    },
  },
];


// ─── Helpers ───
function coordinatesToPolygonGeoJSON(
  coords: Coordinate[],
  properties: any = {},
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coordinates = coords.map((c) => [c.longitude, c.latitude]);
  // Ensure polygon is closed
  if (
    coordinates.length > 0 &&
    (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
      coordinates[0][1] !== coordinates[coordinates.length - 1][1])
  ) {
    coordinates.push([...coordinates[0]]);
  }
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
}

export default function MapZoneEditor({
  existingCoordinates,
  onCoordinatesChange,
  sidebarOpen,
  allZones,
  highlightedZoneId,
}: MapZoneEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const drawRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const hoveredStateIdRef = useRef<number | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Keep latest callback in ref to avoid re-initializing map events
  const onChangeRef = useRef(onCoordinatesChange);
  useEffect(() => {
    onChangeRef.current = onCoordinatesChange;
  });

  // ── Initialize map (once on mount) ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const goongApiKey = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || "";
    goongjs.accessToken = goongApiKey;

    const map = new goongjs.Map({
      container: container,
      style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${goongApiKey}`,
      center: [108.206, 16.047],
      zoom: 5.5,
      maxZoom: 20,
      transformRequest: (url: string) => {
        if (url.includes("tiles.goong.io") && !url.includes("api_key=")) {
          const sep = url.includes("?") ? "&" : "?";
          return { url: `${url}${sep}api_key=${goongApiKey}` };
        }
        return { url };
      },
    });
    mapRef.current = map;

    // Add map controls
    map.addControl(new goongjs.NavigationControl(), "bottom-right");

    // Wait for map style to load before adding sources and MapboxDraw
    // Using style.load to ensure it fires if style changes, but we use safety checks
    map.on("load", () => {
      // ── Initialize Mapbox Draw ──
      // Add only once
      if (!drawRef.current) {
        try {
          const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
              polygon: true,
              trash: true,
            },
            styles: customDrawStyles,
          });
          map.addControl(draw as any, "top-right");
          drawRef.current = draw;

          // Handle Draw Events
          const updateCoords = (e: any) => {
            const data = draw.getAll();
            if (data.features.length > 0) {
              if (data.features.length > 1 && e.features && e.features.length > 0) {
                const latestId = e.features[0].id;
                data.features.forEach((f: any) => {
                  if (f.id !== latestId) draw.delete(f.id);
                });
              }
              
              const feature = draw.getAll().features[0];
              if (feature && feature.geometry.type === "Polygon") {
                const coords = feature.geometry.coordinates[0].map((c: any) => ({
                  longitude: c[0],
                  latitude: c[1],
                }));
                onChangeRef.current(coords);
              }
            } else {
              onChangeRef.current(null);
            }
          };

          map.on("draw.create", updateCoords);
          map.on("draw.update", updateCoords);
          map.on("draw.delete", () => onChangeRef.current(null));
        } catch (err) {
          console.error("[MapZoneEditor] MapboxDraw init failed:", err);
        }
      }

      // ── Add Background Zones Source & Layers ──
      if (!map.getSource("all-zones")) {
        map.addSource("all-zones", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });
      }

      // Fill Layer
      map.addLayer({
        id: "all-zones-fill",
        type: "fill",
        source: "all-zones",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            HIGHLIGHT_COLOR,
            ["==", ["get", "isActive"], true],
            ACTIVE_COLOR,
            INACTIVE_COLOR,
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.28,
            0.12,
          ],
        },
      });

      // Line Layer
      map.addLayer({
        id: "all-zones-line",
        type: "line",
        source: "all-zones",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            HIGHLIGHT_COLOR,
            ["==", ["get", "isActive"], true],
            ACTIVE_COLOR,
            INACTIVE_COLOR,
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            4,
            2,
          ],
        },
      });

      // ── Hover & Popup Logic ──
      const popup = new goongjs.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
        className: "zone-tooltip",
      });
      popupRef.current = popup;

      map.on("mousemove", "all-zones-fill", (e: any) => {
        if (e.features && e.features.length > 0) {
          map.getCanvas().style.cursor = "pointer";
          const feature = e.features[0];
          const props = feature.properties;
          const statusText = props.isActive ? "🟢 Hoạt động" : "⚫ Tắt";

          // Set feature state hover manually for map interactions
          if (hoveredStateIdRef.current !== null && hoveredStateIdRef.current !== feature.id) {
            map.setFeatureState(
              { source: "all-zones", id: hoveredStateIdRef.current },
              { hover: false }
            );
          }
          hoveredStateIdRef.current = feature.id;
          map.setFeatureState(
            { source: "all-zones", id: feature.id },
            { hover: true }
          );

          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-size:14px;line-height:1.5;min-width:140px;padding:4px">
                <div style="font-weight:700;font-size:15px;margin-bottom:3px">${props.name}</div>
                <div style="color:#888;font-size:12px">ID: ${props.id} · ${props.pointCount} điểm</div>
                <div style="font-size:13px;margin-top:3px">${statusText}</div>
              </div>`
            )
            .addTo(map);
        }
      });

      map.on("mouseleave", "all-zones-fill", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
        if (hoveredStateIdRef.current !== null) {
          map.setFeatureState(
            { source: "all-zones", id: hoveredStateIdRef.current },
            { hover: false }
          );
          hoveredStateIdRef.current = null;
        }
      });

      setIsMapLoaded(true);
    });

    // Cleanup
    return () => {
      popupRef.current?.remove();
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, []);

  // ── Sync Existing Coordinates into Draw ──
  useEffect(() => {
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!draw || !map || !isMapLoaded) return;

    // Check if current drawn polygon matches existingCoordinates to avoid interrupting draw
    let currentCoords: Coordinate[] = [];
    const features = draw.getAll().features;
    if (features.length > 0 && features[0].geometry.type === "Polygon") {
      const ring = features[0].geometry.coordinates[0];
      currentCoords = ring.map((c: any) => ({
        longitude: c[0],
        latitude: c[1],
      }));
    }

    // A simple heuristic to skip update if lengths match (assuming user is just dragging points)
    if (existingCoordinates && currentCoords.length === existingCoordinates.length) {
      // In a more robust implementation, we might deep compare coordinates.
      // But for drawing, keeping the internal state is preferred.
      return;
    }
    
    // Clear and re-add if truly different (like switching zones to edit)
    draw.deleteAll();

    if (existingCoordinates && existingCoordinates.length > 0) {
      const coords = existingCoordinates.map((c) => [c.longitude, c.latitude]);
      if (
        coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1]
      ) {
        coords.push([...coords[0]]);
      }
      draw.add({
        id: "active-zone",
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [coords],
        },
      });

      // Fit bounds
      const bounds = new goongjs.LngLatBounds();
      coords.forEach((c) => bounds.extend(c as [number, number]));
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
      }
    }
  }, [existingCoordinates, isMapLoaded]);

  // ── Render background (all other zones) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    let source = map.getSource("all-zones");
    if (!source) {
      // Safety: if source is somehow missing but map is loaded, try to re-add it
      // This can happen if style changes or in some race conditions
      console.warn("[MapZoneEditor] 'all-zones' source not found, attempting to add...");
      try {
        map.addSource("all-zones", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        source = map.getSource("all-zones");
      } catch (e) {
        console.error("[MapZoneEditor] Failed to add source:", e);
        return;
      }
    }

    const validZones = (allZones || []).filter((z) => z.coordinates?.length);

    const geojsonData: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: "FeatureCollection",
      features: validZones.map((zone) => {
        const feature = coordinatesToPolygonGeoJSON(zone.coordinates || [], {
          id: zone.id,
          name: zone.name,
          isActive: zone.isActive,
          pointCount: zone.coordinates?.length || 0,
        });
        feature.id = zone.id; // required for feature-state
        return feature;
      }),
    };

    if (source) {
      (source as any).setData(geojsonData);
    }

    // Update center markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    validZones.forEach((zone) => {
      const baseColor = zone.isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
      let lngSum = 0;
      let latSum = 0;
      zone.coordinates!.forEach((c) => {
        lngSum += c.longitude;
        latSum += c.latitude;
      });
      const center = [
        lngSum / zone.coordinates!.length,
        latSum / zone.coordinates!.length,
      ];

      const el = document.createElement("div");
      el.innerHTML = `<div style="
            background:${baseColor};
            color:#fff;
            font-size:11px;
            font-weight:600;
            padding:4px 10px;
            border-radius:9999px;
            white-space:nowrap;
            box-shadow:0 2px 6px rgba(0,0,0,.3);
            pointer-events:none;
            opacity:0.9;
            line-height:1.4;
            text-align:center;
          ">#${zone.id} ${zone.name}</div>`;

      const marker = new goongjs.Marker({ element: el })
        .setLngLat(center as [number, number])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [allZones, isMapLoaded]);

  // ── Highlight zone from sidebar hover ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (
      hoveredStateIdRef.current !== null &&
      hoveredStateIdRef.current !== highlightedZoneId
    ) {
      map.setFeatureState(
        { source: "all-zones", id: hoveredStateIdRef.current },
        { hover: false }
      );
    }

    if (highlightedZoneId !== null && highlightedZoneId !== undefined) {
      map.setFeatureState(
        { source: "all-zones", id: highlightedZoneId },
        { hover: true }
      );
      hoveredStateIdRef.current = highlightedZoneId;
    } else {
      hoveredStateIdRef.current = null;
    }
  }, [highlightedZoneId]);

  // ── Resize on sidebar toggle ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.resize(), 320);
    return () => clearTimeout(t);
  }, [sidebarOpen]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: "#f5f5f4" }}
    />
  );
}
