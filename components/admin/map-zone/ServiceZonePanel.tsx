"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Polygon as PolygonIcon,
  BoundingBox,
  Crosshair,
  CheckCircle,
  Warning,
  Info,
} from "@phosphor-icons/react";
import type { Coordinate, ServiceZoneEntity } from "@/services/map/type";

interface ServiceZonePanelProps {
  zone: ServiceZoneEntity | null;
  isLoading: boolean;
  /** Currently drawn coordinates on the map (null = no drawing) */
  drawnCoordinates: Coordinate[] | null;
  /** Whether a save mutation is in progress */
  isSaving: boolean;
  /** Callback to trigger saving */
  onSave: (name: string, coords: Coordinate[], isActive: boolean) => void;
}

export default function ServiceZonePanel({
  zone,
  isLoading,
  drawnCoordinates,
  isSaving,
  onSave,
}: ServiceZonePanelProps) {
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

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
    name.trim().length > 0 &&
    (zone ? hasCoords && hasChanges : hasDrawing);

  const handleSave = () => {
    if (!canSave || !effectiveCoords) return;
    onSave(name.trim(), effectiveCoords, isActive);
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
                Vẽ mới trên bản đồ để thay đổi vùng dịch vụ
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
                Chưa có vùng dịch vụ. Sử dụng công cụ trên bản đồ để vẽ.
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
            <>
             
              {zone ? "Cập nhật vùng" : "Tạo vùng mới"}
            </>
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
