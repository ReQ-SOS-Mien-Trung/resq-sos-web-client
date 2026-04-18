"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Polygon as PolygonIcon,
  BoundingBox,
  Crosshair,
  CheckCircle,
  Warning,
  Info,
  CaretDown,
} from "@phosphor-icons/react";
import type { Coordinate, ServiceZoneEntity } from "@/services/map/type";

interface ServiceZonePanelProps {
  zone: ServiceZoneEntity | null;
  isLoading: boolean;
  /** Currently drawn coordinates on the map (null = no drawing) */
  drawnCoordinates: Coordinate[] | null;
  /** Whether a save mutation is in progress */
  isSaving: boolean;
  /** Import coordinates from JSON/GeoJSON and draw on map */
  onImportCoordinates?: (coords: Coordinate[]) => void;
  /** Callback to trigger saving */
  onSave: (name: string, coords: Coordinate[], isActive: boolean) => void;
}

type ParsedImportSource = "geojson" | "boundingbox" | "coordinate-list";

interface ParsedImportResult {
  coordinates: Coordinate[];
  source: ParsedImportSource;
}

const GEOJSON_TEMPLATE = `{
  "geojson": {
    "type": "Polygon",
    "coordinates": [[[107.2109165, 15.825709], [107.229451, 15.7839883], [107.2109165, 15.825709]]]
  }
}`;

const BOUNDINGBOX_TEMPLATE = `{
  "boundingbox": ["14.9513535", "16.3340091", "107.2109165", "109.0235567"]
}`;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isValidLatLng(latitude: number, longitude: number) {
  return (
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  );
}

function closePolygonIfNeeded(points: Coordinate[]): Coordinate[] {
  if (points.length === 0) return points;
  const first = points[0];
  const last = points[points.length - 1];
  const isClosed =
    Math.abs(first.latitude - last.latitude) < 1e-7 &&
    Math.abs(first.longitude - last.longitude) < 1e-7;

  return isClosed ? points : [...points, { ...first }];
}

function parseLngLatPairs(value: unknown): Coordinate[] | null {
  if (!Array.isArray(value) || value.length < 3) return null;

  const coords: Coordinate[] = [];
  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length < 2) return null;

    const longitude = toFiniteNumber(pair[0]);
    const latitude = toFiniteNumber(pair[1]);
    if (
      latitude === null ||
      longitude === null ||
      !isValidLatLng(latitude, longitude)
    ) {
      return null;
    }

    coords.push({ latitude, longitude });
  }

  return closePolygonIfNeeded(coords);
}

function parseCoordinateObjects(value: unknown): Coordinate[] | null {
  if (!Array.isArray(value) || value.length < 3) return null;

  const coords: Coordinate[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const latitude = toFiniteNumber(record.latitude);
    const longitude = toFiniteNumber(record.longitude);

    if (
      latitude === null ||
      longitude === null ||
      !isValidLatLng(latitude, longitude)
    ) {
      return null;
    }

    coords.push({ latitude, longitude });
  }

  return closePolygonIfNeeded(coords);
}

function parseBoundingBox(value: unknown): Coordinate[] | null {
  if (!Array.isArray(value) || value.length < 4) return null;

  const south = toFiniteNumber(value[0]);
  const north = toFiniteNumber(value[1]);
  const west = toFiniteNumber(value[2]);
  const east = toFiniteNumber(value[3]);
  if (
    south === null ||
    north === null ||
    west === null ||
    east === null ||
    north < south ||
    east < west
  ) {
    return null;
  }

  if (
    !isValidLatLng(south, west) ||
    !isValidLatLng(north, east) ||
    !isValidLatLng(south, east) ||
    !isValidLatLng(north, west)
  ) {
    return null;
  }

  return closePolygonIfNeeded([
    { latitude: north, longitude: west },
    { latitude: north, longitude: east },
    { latitude: south, longitude: east },
    { latitude: south, longitude: west },
  ]);
}

function parseGeoJson(value: unknown): Coordinate[] | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  if (record.type === "Feature") {
    return parseGeoJson(record.geometry);
  }

  if (record.type === "FeatureCollection" && Array.isArray(record.features)) {
    const firstFeature = record.features[0];
    return parseGeoJson(firstFeature);
  }

  if (record.type === "Polygon" && Array.isArray(record.coordinates)) {
    return parseLngLatPairs(record.coordinates[0]);
  }

  if (record.type === "MultiPolygon" && Array.isArray(record.coordinates)) {
    const firstPolygon = record.coordinates[0];
    if (!Array.isArray(firstPolygon)) return null;
    return parseLngLatPairs(firstPolygon[0]);
  }

  if (!record.type && Array.isArray(record.coordinates)) {
    const direct = parseLngLatPairs(record.coordinates);
    if (direct) return direct;

    if (Array.isArray(record.coordinates[0])) {
      return parseLngLatPairs(record.coordinates[0]);
    }
  }

  return null;
}

function parseLenientJson(input: string): unknown {
  const raw = input.trim();
  if (!raw) {
    throw new Error("Vui lòng dán dữ liệu trước khi import.");
  }

  const candidates = new Set<string>();
  const addCandidate = (value: string) => {
    const normalized = value.trim();
    if (normalized.length > 0) candidates.add(normalized);
  };

  addCandidate(raw);
  addCandidate(`{${raw}}`);
  addCandidate(`{${raw}`);
  addCandidate(`${raw}}`);
  addCandidate(`[${raw}]`);

  const withoutTrailingBracket = raw.replace(/[\],]+\s*$/, "");
  if (withoutTrailingBracket !== raw) {
    addCandidate(withoutTrailingBracket);
    addCandidate(`{${withoutTrailingBracket}}`);
    addCandidate(`{${withoutTrailingBracket}`);
    addCandidate(`${withoutTrailingBracket}}`);
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try next candidate
    }
  }

  throw new Error(
    "Dữ liệu JSON không hợp lệ. Vui lòng kiểm tra lại định dạng.",
  );
}

function parseImportedCoordinates(input: string): ParsedImportResult {
  const payload = parseLenientJson(input);

  const directCoordinateList =
    parseCoordinateObjects(payload) ?? parseLngLatPairs(payload);
  if (directCoordinateList) {
    return { coordinates: directCoordinateList, source: "coordinate-list" };
  }

  const objectCandidates: unknown[] = [payload];
  if (Array.isArray(payload) && payload.length > 0) {
    objectCandidates.push(payload[0]);
  }

  for (const candidate of objectCandidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;

    const geojsonCoordinates =
      parseGeoJson(record.geojson) ??
      parseGeoJson(record.geometry) ??
      parseGeoJson(candidate);
    if (geojsonCoordinates) {
      return { coordinates: geojsonCoordinates, source: "geojson" };
    }

    const bboxCoordinates =
      parseBoundingBox(record.boundingbox) ?? parseBoundingBox(record.bbox);
    if (bboxCoordinates) {
      return { coordinates: bboxCoordinates, source: "boundingbox" };
    }
  }

  throw new Error(
    "Chỉ hỗ trợ GeoJSON Polygon/MultiPolygon, boundingbox hoặc danh sách tọa độ.",
  );
}

export default function ServiceZonePanel({
  zone,
  isLoading,
  drawnCoordinates,
  isSaving,
  onImportCoordinates,
  onSave,
}: ServiceZonePanelProps) {
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isImportExpanded, setIsImportExpanded] = useState(false);
  const [importRaw, setImportRaw] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const clearImportFeedback = () => {
    setImportError(null);
    setImportSuccess(null);
  };

  // Sync form state when zone data loads (or reset for create mode)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (zone) {
        setName(zone.name);
        setIsActive(zone.isActive);
      } else {
        setName("");
        setIsActive(true);
      }

      setImportRaw("");
      setIsImportExpanded(false);
      clearImportFeedback();
    }, 0);
    return () => clearTimeout(timer);
  }, [zone]);

  const hasDrawing = drawnCoordinates !== null && drawnCoordinates.length >= 3;
  // In edit mode: use existing coords if user hasn't drawn new ones
  const effectiveCoords = drawnCoordinates ?? zone?.coordinates ?? null;
  const hasCoords = (effectiveCoords?.length ?? 0) >= 3;
  const coordCount = drawnCoordinates?.length ?? zone?.coordinates?.length ?? 0;

  // Detect actual changes vs original (edit mode only)
  const nameChanged = zone ? name.trim() !== zone.name : false;
  const activeChanged = zone ? isActive !== zone.isActive : false;
  const coordsChanged = hasDrawing; // drew new polygon on map
  const hasChanges = zone
    ? nameChanged || activeChanged || coordsChanged
    : true; // create mode: always allow

  // Create mode: must draw; Edit mode: existing coords are enough + must have changes
  const canSave =
    name.trim().length > 0 && (zone ? hasCoords && hasChanges : hasDrawing);

  const handleSave = () => {
    if (!canSave || !effectiveCoords) return;
    onSave(name.trim(), effectiveCoords, isActive);
  };

  const handleImportCoordinates = () => {
    try {
      const { coordinates, source } = parseImportedCoordinates(importRaw);
      onImportCoordinates?.(coordinates);
      clearImportFeedback();

      const sourceText =
        source === "geojson"
          ? "GeoJSON"
          : source === "boundingbox"
            ? "boundingbox"
            : "danh sách tọa độ";
      setImportSuccess(
        `Đã import ${coordinates.length} điểm từ ${sourceText}. Kiểm tra lại vùng trên bản đồ trước khi lưu.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể import dữ liệu tọa độ.";
      setImportSuccess(null);
      setImportError(message);
    }
  };

  const applyImportTemplate = (template: string) => {
    setImportRaw(template);
    clearImportFeedback();
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6 space-y-4 animate-pulse">
        <div className="h-6 w-2/3 bg-muted rounded" />
        <div className="h-4 w-1/2 bg-muted rounded" />
        <div className="h-10 w-full bg-muted rounded" />
        <div className="h-32 w-full bg-muted rounded" />
        <div className="h-10 w-full bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Zone Name */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tên vùng
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Miền Trung - Bão Yagi"
            className="rounded-none border-black/20 dark:border-white/20 focus-visible:ring-[#FF5722]"
          />
        </div>

        {/* Active Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Trạng thái
              </span>
              <p className="text-sm tracking-tighter text-muted-foreground mt-1">
                {isActive ? "Đang hoạt động" : "Tạm không hoạt động"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? "bg-[#FF5722]" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>
        </div>

        <Separator className="border-border/40" />

        {/* Coordinate Import */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Import tọa độ
              </label>
              <span className="inline-flex items-center rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 px-2 py-1 text-[12px] font-medium tracking-tighter text-[#FF5722] whitespace-nowrap">
                GeoJSON / bbox
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsImportExpanded((prev) => !prev)}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 text-sm font-medium tracking-tighter text-foreground hover:border-[#FF5722]/40 hover:text-[#FF5722] transition-colors"
              aria-expanded={isImportExpanded}
            >
              <span>{isImportExpanded ? "Thu gọn" : "Xổ ra"}</span>
              <CaretDown
                className={`h-4 w-4 transition-transform ${isImportExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {!isImportExpanded ? (
            importRaw.trim().length > 0 || importSuccess || importError ? (
              <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5">
                <p className="text-sm font-medium tracking-tighter text-[#FF5722]">
                  Đang có dữ liệu import nháp, mở lại để tiếp tục.
                </p>
              </div>
            ) : null
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-[#FF5722]/25 bg-linear-to-br from-[#FF5722]/6 via-background to-muted/40 p-3.5 space-y-3">
              <div className="pointer-events-none absolute -top-10 -right-12 h-28 w-28 rounded-full bg-[#FF5722]/12 blur-2xl" />

              <div className="relative flex items-start gap-2">
                <Info className="h-4 w-4 text-[#FF5722] mt-0.5 shrink-0" />
                <div className="space-y-0.5 tracking-tighter">
                  <p className="text-sm font-semibold text-foreground">
                    Dán dữ liệu vùng từ GIS, API hoặc JSON
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Hệ thống tự nhận dạng định dạng và vẽ lên bản đồ.
                  </p>
                </div>
              </div>

              <div className="relative grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyImportTemplate(GEOJSON_TEMPLATE)}
                  className="h-9 px-3 rounded-md border border-border/70 bg-background/80 text-sm tracking-tighter hover:border-[#FF5722]/40 hover:text-[#FF5722] transition-colors"
                >
                  Mẫu GeoJSON
                </button>
                <button
                  type="button"
                  onClick={() => applyImportTemplate(BOUNDINGBOX_TEMPLATE)}
                  className="h-9 px-3 rounded-md border border-border/70 bg-background/80 text-sm tracking-tighter hover:border-[#FF5722]/40 hover:text-[#FF5722] transition-colors"
                >
                  Mẫu bbox
                </button>
              </div>

              <Textarea
                value={importRaw}
                onChange={(e) => {
                  setImportRaw(e.target.value);
                  if (importError || importSuccess) {
                    clearImportFeedback();
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleImportCoordinates();
                  }
                }}
                placeholder='Ví dụ: {"geojson": {"type": "Polygon", "coordinates": [...]}} hoặc {"boundingbox": [south, north, west, east]}'
                className="relative min-h-28 rounded-lg text-[13px] font-mono leading-relaxed border-black/20 dark:border-white/20 bg-background/90 focus-visible:ring-[#FF5722]"
              />

              <div className="relative grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={handleImportCoordinates}
                  disabled={!importRaw.trim().length}
                  className="w-full rounded-none bg-[#FF5722] text-white hover:bg-[#FF5722]/90 text-sm h-10 px-3"
                >
                  Import bản đồ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setImportRaw("");
                    clearImportFeedback();
                  }}
                  className="w-full rounded-none h-10 text-sm px-3"
                >
                  Xóa dữ liệu
                </Button>
              </div>

              {importSuccess && (
                <div className="relative flex items-start gap-2 rounded-lg border border-[#FF5722]/30 bg-[#FF5722]/10 px-3 py-2.5 text-[#FF5722] text-sm tracking-tighter">
                  <CheckCircle
                    className="h-4 w-4 mt-0.5 shrink-0"
                    weight="fill"
                  />
                  <p className="leading-relaxed">{importSuccess}</p>
                </div>
              )}

              {importError && (
                <div className="relative flex items-start gap-2 rounded-lg border border-red-300 bg-red-50/80 px-3 py-2.5 text-red-700 text-sm tracking-tighter dark:bg-red-950/25 dark:border-red-800 dark:text-red-300">
                  <Warning className="h-4 w-4 mt-0.5 shrink-0" weight="fill" />
                  <p className="leading-relaxed">{importError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator className="border-border/40" />

        {/* Drawing Status */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tọa Độ Vùng
          </label>

          {hasDrawing ? (
            <div className="border border-[#FF5722]/30 bg-[#FF5722]/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#FF5722]" weight="fill" />
                <span className="text-sm tracking-tighter font-semibold text-[#FF5722]">
                  Đã xác định vùng
                </span>
              </div>
              <div className="flex items-center gap-4 tracking-tighter text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <PolygonIcon className="h-3.5 w-3.5" />
                  {coordCount} điểm
                </span>
                <span className="flex items-center gap-1">
                  <BoundingBox className="h-3.5 w-3.5" />
                  Đa giác khép kín
                </span>
              </div>

              {/* Coordinate list (scrollable) */}
              <div className="max-h-65 overflow-y-auto space-y-1 text-[11px] font-mono">
                {drawnCoordinates?.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2 py-1 bg-background/50 border border-border/30"
                  >
                    <span className="text-muted-foreground w-5 text-right">
                      {i + 1}.
                    </span>
                    <Crosshair className="h-3 w-3 text-muted-foreground" />
                    <span>
                      {c.latitude.toFixed(6)}, {c.longitude.toFixed(6)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : zone?.coordinates?.length ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-base font-semibold">
                  Vùng hiện tại ({zone.coordinates.length} điểm)
                </span>
              </div>
              <p className="text-sm tracking-tighter text-muted-foreground">
                Vẽ mới trên bản đồ để thay đổi vùng
              </p>
              <div className="max-h-65 overflow-y-auto space-y-1 text-xs font-mono">
                {zone.coordinates.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2 py-1 bg-muted/40 border border-border/30"
                  >
                    <span className="text-muted-foreground w-5 text-right shrink-0">
                      {i + 1}.
                    </span>
                    <span>
                      {c.latitude.toFixed(6)}, {c.longitude.toFixed(6)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border/60 bg-muted/20 p-6 text-center space-y-2">
              <Warning className="h-6 w-6 mx-auto text-muted-foreground/50" />
              <p className="text-xs tracking-tighter text-muted-foreground">
                Chưa có vùng. Sử dụng công cụ trên bản đồ để vẽ.
              </p>
              <div className="flex justify-center tracking-tighter gap-3 text-[12px] text-muted-foreground/70">
                <span className="flex items-center gap-1">
                  <BoundingBox className="h-3 w-3" /> Hình chữ nhật
                </span>
                <span className="flex items-center gap-1">
                  <PolygonIcon className="h-3 w-3" /> Đa giác
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Zone Info Badge
        {zone && (
          <>
            <Separator className="border-border/40" />
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Thông Tin
              </label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-none border-black/20 text-xs">
                  ID: {zone.id}
                </Badge>
                <Badge
                  className={`rounded-none text-xs text-white ${zone.isActive
                    ? "bg-[#FF5722] hover:bg-[#FF5722]/90 border-transparent"
                    : "bg-gray-500 hover:bg-gray-500/90 border-transparent"
                    }`}
                >
                  {zone.isActive ? "Đang hoạt động" : "Không hoạt động"}
                </Badge>
              </div>
            </div>
          </>
        )} */}
      </div>

      {/* Footer: Save Button */}
      <div className="p-5 pt-4 border-t border-border/40">
        <Button
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="w-full rounded-none bg-[#FF5722] hover:bg-[#FF5722]/90 text-white font-bold uppercase tracking-tighter text-sm h-11 gap-2"
        >
          {isSaving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Đang lưu...
            </>
          ) : (
            <>{zone ? "Cập nhật vùng" : "Tạo vùng mới"}</>
          )}
        </Button>
        {!hasCoords && (
          <p className="text-[12px] tracking-tighter text-center text-muted-foreground mt-2">
            Vẽ vùng trên bản đồ trước khi lưu
          </p>
        )}
        {zone && !hasDrawing && hasCoords && (
          <p className="text-[12px] tracking-tighter text-center text-muted-foreground mt-2">
            Vẽ mới trên bản đồ để thay đổi tọa độ
          </p>
        )}
      </div>
    </div>
  );
}
