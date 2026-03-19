"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-draw";
import type { Coordinate, ServiceZoneEntity } from "@/services/map/type";

// ─── Props ───
interface MapZoneEditorProps {
  existingCoordinates?: Coordinate[];
  onCoordinatesChange: (coords: Coordinate[] | null) => void;
  sidebarOpen?: boolean;
  allZones?: ServiceZoneEntity[];
  highlightedZoneId?: number | null;
}

// ─── Draw style ───
const DRAW_STYLE: L.PathOptions = {
  color: "#FF5722",
  weight: 2,
  fillColor: "#FF5722",
  fillOpacity: 0.15,
};

// ─── Helpers ───
function latLngsToCoordinates(latLngs: L.LatLng[]): Coordinate[] {
  const coords = latLngs.map((ll) => ({ latitude: ll.lat, longitude: ll.lng }));
  if (
    coords.length > 0 &&
    (coords[0].latitude !== coords[coords.length - 1].latitude ||
      coords[0].longitude !== coords[coords.length - 1].longitude)
  ) {
    coords.push({ ...coords[0] });
  }
  return coords;
}

function boundsToCoordinates(bounds: L.LatLngBounds): Coordinate[] {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return [
    { latitude: ne.lat, longitude: sw.lng },
    { latitude: ne.lat, longitude: ne.lng },
    { latitude: sw.lat, longitude: ne.lng },
    { latitude: sw.lat, longitude: sw.lng },
    { latitude: ne.lat, longitude: sw.lng },
  ];
}

// ─── i18n ───
function applyI18n() {
  if (!L.drawLocal) return;
  L.drawLocal.draw.toolbar.buttons.polygon = "Vẽ đa giác";
  L.drawLocal.draw.toolbar.buttons.rectangle = "Vẽ hình chữ nhật";
  L.drawLocal.draw.toolbar.actions.title = "Hủy vẽ";
  L.drawLocal.draw.toolbar.actions.text = "Hủy";
  L.drawLocal.draw.toolbar.finish.title = "Hoàn thành";
  L.drawLocal.draw.toolbar.finish.text = "Xong";
  L.drawLocal.draw.toolbar.undo.title = "Xóa điểm cuối";
  L.drawLocal.draw.toolbar.undo.text = "Xóa điểm cuối";
  L.drawLocal.draw.handlers.polygon.tooltip.start = "Nhấp để bắt đầu vẽ";
  L.drawLocal.draw.handlers.polygon.tooltip.cont = "Nhấp để tiếp tục vẽ";
  L.drawLocal.draw.handlers.polygon.tooltip.end = "Nhấp điểm đầu để đóng";
  L.drawLocal.draw.handlers.rectangle.tooltip.start = "Nhấp và kéo để vẽ";
  L.drawLocal.edit.toolbar.buttons.edit = "Chỉnh sửa vùng";
  L.drawLocal.edit.toolbar.buttons.editDisabled = "Không có vùng để sửa";
  L.drawLocal.edit.toolbar.buttons.remove = "Xóa vùng";
  L.drawLocal.edit.toolbar.buttons.removeDisabled = "Không có vùng để xóa";
  L.drawLocal.edit.toolbar.actions.save.title = "Lưu thay đổi";
  L.drawLocal.edit.toolbar.actions.save.text = "Lưu";
  L.drawLocal.edit.toolbar.actions.cancel.title = "Hủy thay đổi";
  L.drawLocal.edit.toolbar.actions.cancel.text = "Hủy";
  L.drawLocal.edit.toolbar.actions.clearAll.title = "Xóa tất cả";
  L.drawLocal.edit.toolbar.actions.clearAll.text = "Xóa tất cả";
}

// ─── Zone colors ───
const ACTIVE_COLOR = "#16A34A";    // dark green for active zones
const INACTIVE_COLOR = "#94a3b8";  // gray for inactive zones
const HIGHLIGHT_COLOR = "#FF5722"; // orange when hovered from sidebar

// ─── Component ───
export default function MapZoneEditor({
  existingCoordinates,
  onCoordinatesChange,
  sidebarOpen,
  allZones,
  highlightedZoneId,
}: MapZoneEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const bgLayersRef = useRef<L.Layer[]>([]);
  const bgPolygonsRef = useRef<Map<number, { polygon: L.Polygon; isActive: boolean }>>(new Map());

  // Keep latest callback in ref — avoids re-initializing map when callback changes
  const onChangeRef = useRef(onCoordinatesChange);
  useEffect(() => {
    onChangeRef.current = onCoordinatesChange;
  });

  // ── Initialize map (once on mount) ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    applyI18n();

    // HMR safety: clear any stale _leaflet_id left on the DOM node
    if ((container as any)._leaflet_id != null) {
      delete (container as any)._leaflet_id;
    }

    const map = L.map(container, {
      center: [16.047, 108.206],
      zoom: 6,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const fg = new L.FeatureGroup();
    fg.addTo(map);
    featureGroupRef.current = fg;

    const drawControl = new L.Control.Draw({
      position: "topright",
      edit: { featureGroup: fg },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: DRAW_STYLE,
        },
        rectangle: { shapeOptions: DRAW_STYLE },
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
    });
    drawControl.addTo(map);

    // Draw events
    map.on(L.Draw.Event.CREATED, (e: L.DrawEvents.Created) => {
      fg.clearLayers();
      fg.addLayer(e.layer);

      let coords: Coordinate[];
      if (e.layerType === "rectangle") {
        coords = boundsToCoordinates((e.layer as L.Rectangle).getBounds());
      } else {
        coords = latLngsToCoordinates(
          (e.layer as L.Polygon).getLatLngs()[0] as L.LatLng[],
        );
      }
      onChangeRef.current(coords);
    });

    map.on(L.Draw.Event.EDITED, (e: L.DrawEvents.Edited) => {
      e.layers.eachLayer((layer) => {
        if (layer instanceof L.Rectangle) {
          onChangeRef.current(boundsToCoordinates(layer.getBounds()));
        } else if (layer instanceof L.Polygon) {
          onChangeRef.current(
            latLngsToCoordinates(layer.getLatLngs()[0] as L.LatLng[]),
          );
        }
      });
    });

    map.on(L.Draw.Event.DELETED, () => {
      onChangeRef.current(null);
    });

    // Cleanup on unmount
    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      featureGroupRef.current = null;
      bgLayersRef.current = [];
    };
  }, []);

  // ── Sync existing coordinates into the draw feature group ──
  useEffect(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;

    fg.clearLayers();
    if (existingCoordinates?.length) {
      const polygon = L.polygon(
        existingCoordinates.map(
          (c) => [c.latitude, c.longitude] as [number, number],
        ),
        DRAW_STYLE,
      );
      fg.addLayer(polygon);
    }
  }, [existingCoordinates]);

  // ── Render background (all other zones) with tooltips + hover highlight ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    bgLayersRef.current.forEach((l) => {
      try {
        map.removeLayer(l);
      } catch {
        // already removed
      }
    });
    bgLayersRef.current = [];
    bgPolygonsRef.current.clear();

    allZones?.forEach((zone) => {
      if (!zone.coordinates?.length) return;

      const baseColor = zone.isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
      const normalStyle: L.PathOptions = {
        color: baseColor,
        weight: 2,
        fillColor: baseColor,
        fillOpacity: 0.12,
        dashArray: zone.isActive ? undefined : "6 4",
      };

      const polygon = L.polygon(
        zone.coordinates.map(
          (c) => [c.latitude, c.longitude] as [number, number],
        ),
        normalStyle,
      );

      // Store polygon ref for sidebar hover highlight
      bgPolygonsRef.current.set(zone.id, { polygon, isActive: zone.isActive });

      // Sticky tooltip with zone info
      const statusText = zone.isActive ? "🟢 Hoạt động" : "⚫ Tắt";
      polygon.bindTooltip(
        `<div style="font-size:14px;line-height:1.5;min-width:140px">
          <div style="font-weight:700;font-size:15px;margin-bottom:3px">${zone.name}</div>
          <div style="color:#888;font-size:12px">ID: ${zone.id} · ${zone.coordinates.length} điểm</div>
          <div style="font-size:13px;margin-top:3px">${statusText}</div>
        </div>`,
        {
          sticky: true,
          direction: "top",
          offset: [0, -8],
          className: "zone-tooltip",
        },
      );

      // Hover highlight on map polygon itself
      polygon.on("mouseover", () => {
        polygon.setStyle({
          color: HIGHLIGHT_COLOR,
          weight: 4,
          fillColor: HIGHLIGHT_COLOR,
          fillOpacity: 0.28,
          dashArray: undefined,
        });
      });
      polygon.on("mouseout", () => {
        // Only reset if this zone is NOT the one highlighted from sidebar
        if (highlightedZoneId !== zone.id) {
          polygon.setStyle(normalStyle);
        }
      });

      polygon.addTo(map);
      bgLayersRef.current.push(polygon);

      // Center label marker (always visible — helps distinguish overlapping zones)
      const bounds = polygon.getBounds();
      const center = bounds.getCenter();
      const label = L.marker(center, {
        icon: L.divIcon({
          className: "",
          html: `<div style="
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
          ">#${zone.id} ${zone.name}</div>`,
          iconAnchor: [0, 0],
        }),
        interactive: false,
      });
      label.addTo(map);
      bgLayersRef.current.push(label);
    });
  }, [allZones, highlightedZoneId]);

  // ── Highlight zone from sidebar hover ──
  useEffect(() => {
    bgPolygonsRef.current.forEach(({ polygon, isActive }, zoneId) => {
      const baseColor = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
      if (zoneId === highlightedZoneId) {
        polygon.setStyle({
          color: HIGHLIGHT_COLOR,
          weight: 4,
          fillColor: HIGHLIGHT_COLOR,
          fillOpacity: 0.28,
          dashArray: undefined,
        });
        polygon.bringToFront();
      } else {
        polygon.setStyle({
          color: baseColor,
          weight: 2,
          fillColor: baseColor,
          fillOpacity: 0.12,
          dashArray: isActive ? undefined : "6 4",
        });
      }
    });
  }, [highlightedZoneId]);

  // ── Invalidate map size whenever the container resizes (covers ALL sidebar toggles) ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Also invalidate after local panel sidebar transition (belt & suspenders) ──
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 320);
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
