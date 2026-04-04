"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowsCounterClockwise,
  BellRinging,
  CloudRain,
  Lightning,
  MapPin,
  Spinner,
  Thermometer,
  Warning,
  WaveSine,
  Wind,
} from "@phosphor-icons/react";
import { Droplets } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  BROADCAST_NOTIFICATION_TYPES,
  BroadcastNotificationPayload,
  BroadcastNotificationType,
  useBroadcastNotification,
} from "@/services/noti_alert";
import { WeatherApiCurrentPoint } from "@/type";
import { geocodeCity, reverseGeocodeCoordinates } from "./geocode";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
});

type ComposerMode = "weather_api" | "manual";
type WeatherPointOk = Extract<WeatherApiCurrentPoint, { lat: number }>;

interface FloodAlertComposerProps {
  liveWeather: WeatherApiCurrentPoint[];
  weatherLoading: boolean;
  weatherError: string | null;
  onRefreshWeather: () => void;
  onSuccess?: () => void;
}

const ALERT_TYPE_META: Record<
  BroadcastNotificationType,
  {
    label: string;
    icon: ReactNode;
    activeClassName: string;
    inactiveClassName: string;
  }
> = {
  FLOOD_WARNING: {
    label: "Cảnh báo lũ",
    icon: <WaveSine size={16} weight="duotone" />,
    activeClassName:
      "border-amber-500 bg-amber-50 text-amber-700 shadow-sm ring-2 ring-amber-300",
    inactiveClassName:
      "border-amber-200 bg-amber-50/50 text-amber-600 hover:bg-amber-50 hover:border-amber-300",
  },
  FLOOD_EMERGENCY: {
    label: "Khẩn cấp lũ",
    icon: <Lightning size={16} weight="fill" />,
    activeClassName:
      "border-red-500 bg-red-50 text-red-700 shadow-sm ring-2 ring-red-300",
    inactiveClassName:
      "border-red-200 bg-red-50/50 text-red-600 hover:bg-red-50 hover:border-red-300",
  },
  EVACUATION: {
    label: "Sơ tán",
    icon: <BellRinging size={16} weight="fill" />,
    activeClassName:
      "border-orange-500 bg-orange-50 text-orange-700 shadow-sm ring-2 ring-orange-300",
    inactiveClassName:
      "border-orange-200 bg-orange-50/50 text-orange-600 hover:bg-orange-50 hover:border-orange-300",
  },
};

const MANUAL_PRESETS: Array<{
  title: string;
  body: string;
  type: BroadcastNotificationType;
}> = [
  {
    title: "CẢNH BÁO LŨ LỤT",
    body: "Mực nước sông đang tăng cao. Người dân vùng ven sông cần di chuyển đến nơi an toàn ngay lập tức.",
    type: "FLOOD_WARNING",
  },
  {
    title: "KHẨN CẤP: LŨ LỚN",
    body: "Lũ lớn bất thường đang xảy ra. Toàn bộ cư dân khu vực thấp trũng cần sơ tán khẩn cấp. Liên hệ 114 nếu cần hỗ trợ.",
    type: "FLOOD_EMERGENCY",
  },
  {
    title: "LỆNH SƠ TÁN",
    body: "Chính quyền địa phương ban hành lệnh sơ tán bắt buộc. Vui lòng rời khỏi khu vực ngập lụt ngay lập tức.",
    type: "EVACUATION",
  },
];

function isWeatherPointOk(
  point: WeatherApiCurrentPoint,
): point is WeatherPointOk {
  return "lat" in point && "lon" in point;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

const ALERT_SEVERITY_BY_TYPE: Record<BroadcastNotificationType, string> = {
  FLOOD_WARNING: "MEDIUM",
  FLOOD_EMERGENCY: "HIGH",
  EVACUATION: "CRITICAL",
};

const ALERT_CHECKLIST_BY_TYPE: Record<BroadcastNotificationType, string[]> = {
  FLOOD_WARNING: [
    "Theo doi muc nuoc va luu luong mua",
    "Thong bao canh bao som cho nguoi dan",
    "Ra soat cac diem co nguy co ngap",
  ],
  FLOOD_EMERGENCY: [
    "Kich hoat luc luong ung cuu dia phuong",
    "Han che di chuyen qua diem ngap sau",
    "Thong tin lien tuc den cong dong bi anh huong",
  ],
  EVACUATION: [
    "Thong bao so tan bat buoc khu vuc nguy hiem",
    "Mo diem tap ket tam thoi",
    "Uu tien ho tro nhom de bi ton thuong",
  ],
};

function buildBroadcastPayload(params: {
  title: string;
  body: string;
  type: BroadcastNotificationType;
  city: string;
  lat: number;
  lon: number;
}): BroadcastNotificationPayload {
  const now = new Date();
  const endTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const cityName = params.city.trim() || "Pinned Location";

  return {
    location: {
      city: cityName,
      lat: params.lat,
      lon: params.lon,
    },
    activeAlerts: [
      {
        id: globalThis.crypto?.randomUUID?.() ?? `alert-${Date.now()}`,
        eventType: params.type,
        title: params.title.trim(),
        severity: ALERT_SEVERITY_BY_TYPE[params.type],
        areasAffected: [cityName],
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        description: params.body.trim(),
        instructionChecklist: ALERT_CHECKLIST_BY_TYPE[params.type],
        source: "RESQ SOS Weather Flood",
      },
    ],
  };
}

function buildWeatherDraft(point: WeatherPointOk): {
  type: BroadcastNotificationType;
  title: string;
  body: string;
  severityLabel: string;
  advisory: string;
} {
  const conditionText = point.condition_text.toLowerCase();
  const isStormLike =
    conditionText.includes("storm") ||
    conditionText.includes("thunder") ||
    conditionText.includes("heavy rain") ||
    conditionText.includes("moderate rain") ||
    conditionText.includes("mưa to") ||
    conditionText.includes("dông");

  if (point.precip_mm >= 50 || point.wind_kph >= 60) {
    return {
      type: "EVACUATION",
      severityLabel: "Rất cao",
      title: `ĐỀ NGHỊ SƠ TÁN KHẨN TẠI ${point.name.toUpperCase()}`,

      body: `WeatherAPI ghi nhận tại ${point.name} lúc ${formatDateTime(point.last_updated)}: ${point.condition_text}, mưa ${point.precip_mm}mm, độ ẩm ${point.humidity}%, gió ${point.wind_kph} km/h (${point.wind_dir}). Nguy cơ ngập sâu tăng nhanh, đề nghị sơ tán người dân khỏi khu vực trũng thấp và chuẩn bị lực lượng ứng cứu.`,
      advisory:
        "Ưu tiên sơ tán khu vực thấp trũng và cảnh báo người dân rời khỏi vùng nguy cơ cao.",
    };
  }

  if (point.precip_mm >= 25 || point.wind_kph >= 40 || isStormLike) {
    return {
      type: "FLOOD_EMERGENCY",
      severityLabel: "Cao",
      title: `KHẨN CẤP NGẬP LỤT TẠI ${point.name.toUpperCase()}`,

      body: `WeatherAPI ghi nhận tại ${point.name} lúc ${formatDateTime(point.last_updated)}: ${point.condition_text}, mưa ${point.precip_mm}mm, độ ẩm ${point.humidity}%, gió ${point.wind_kph} km/h (${point.wind_dir}). Nguy cơ lũ và ngập đô thị đang ở mức cao, đề nghị lực lượng tại chỗ trực chiến và người dân hạn chế di chuyển qua khu vực ven sông, ngầm tràn.`,
      advisory:
        "Tăng cường theo dõi mực nước, chuẩn bị lực lượng ứng cứu và hạn chế di chuyển qua điểm ngập.",
    };
  }

  return {
    type: "FLOOD_WARNING",
    severityLabel: "Theo dõi",
    title: `THEO DÕI MƯA LŨ TẠI ${point.name.toUpperCase()}`,

    body: `WeatherAPI ghi nhận tại ${point.name} lúc ${formatDateTime(point.last_updated)}: ${point.condition_text}, mưa ${point.precip_mm}mm, độ ẩm ${point.humidity}%, gió ${point.wind_kph} km/h (${point.wind_dir}). Khu vực cần tiếp tục theo dõi sát diễn biến thời tiết và chủ động phương án phòng chống ngập cục bộ.`,
    advisory:
      "Tiếp tục theo dõi mưa, thông báo sớm cho người dân tại các khu vực ven sông và vùng trũng.",
  };
}

export default function FloodAlertComposer({
  liveWeather,
  weatherLoading,
  weatherError,
  onRefreshWeather,
  onSuccess,
}: FloodAlertComposerProps) {
  const [mode, setMode] = useState<ComposerMode>("weather_api");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [city, setCity] = useState("");
  const [manualLocation, setManualLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [type, setType] = useState<BroadcastNotificationType>(
    BROADCAST_NOTIFICATION_TYPES[0],
  );
  const [confirmed, setConfirmed] = useState(false);

  const { mutate: broadcast, isPending } = useBroadcastNotification();

  const weatherOptions = useMemo(
    () => liveWeather.filter(isWeatherPointOk),
    [liveWeather],
  );

  const effectiveMode: ComposerMode =
    weatherOptions.length === 0 ? "manual" : mode;

  const selectedRegionValue = useMemo(() => {
    if (weatherOptions.some((point) => point.name === selectedRegion)) {
      return selectedRegion;
    }

    return weatherOptions[0]?.name ?? "";
  }, [selectedRegion, weatherOptions]);

  const selectedWeatherPoint = useMemo(
    () =>
      weatherOptions.find((point) => point.name === selectedRegionValue) ??
      null,
    [selectedRegionValue, weatherOptions],
  );

  const suggestedDraft = useMemo(
    () =>
      selectedWeatherPoint ? buildWeatherDraft(selectedWeatherPoint) : null,
    [selectedWeatherPoint],
  );

  const applyManualPreset = (preset: (typeof MANUAL_PRESETS)[number]) => {
    setTitle(preset.title);
    setBody(preset.body);
    setType(preset.type);
  };

  const applyWeatherDraft = () => {
    if (!suggestedDraft) {
      toast.error("Hiện chưa có dữ liệu WeatherAPI để import");
      return;
    }

    setTitle(suggestedDraft.title);
    setBody(suggestedDraft.body);
    setType(suggestedDraft.type);
    toast.success("Đã nạp nội dung từ WeatherAPI vào biểu mẫu");
  };

  const resetComposer = () => {
    setTitle("");
    setBody("");
    setCity("");
    setManualLocation(null);
    setType(BROADCAST_NOTIFICATION_TYPES[0]);
    setConfirmed(false);
  };

  useEffect(() => {
    if (effectiveMode !== "weather_api" || !selectedWeatherPoint) {
      return;
    }

    setCity(selectedWeatherPoint.name);
    setManualLocation({
      lat: selectedWeatherPoint.lat,
      lon: selectedWeatherPoint.lon,
    });
  }, [effectiveMode, selectedWeatherPoint]);

  const handleSearchCity = async () => {
    const query = city.trim();
    if (!query) {
      toast.error("Vui lòng nhập thành phố cần tìm");
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await geocodeCity(query);
      if (!result) {
        toast.error("Không tìm thấy thành phố, vui lòng thử từ khóa khác");
        return;
      }

      setManualLocation({ lat: result.lat, lon: result.lon });
      toast.success(`Đã định vị: ${result.displayName}`);
    } catch {
      toast.error("Không thể tìm vị trí thành phố, vui lòng thử lại");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handlePickLocation = async (lat: number, lon: number) => {
    const picked = {
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6)),
    };

    setManualLocation(picked);

    // Keep weather mode location label aligned with the selected WeatherAPI station.
    if (effectiveMode !== "manual") {
      return;
    }

    try {
      const reverseResult = await reverseGeocodeCoordinates(
        picked.lat,
        picked.lon,
      );
      if (reverseResult?.displayName) {
        setCity(reverseResult.displayName);
      }
    } catch {
      // Keep existing city input when reverse geocoding is unavailable.
    }
  };

  const handleSend = () => {
    if (!title.trim() || !body.trim() || !city.trim()) {
      toast.error("Vui lòng điền đầy đủ tiêu đề và nội dung");
      return;
    }

    const locationCity =
      effectiveMode === "weather_api" && selectedWeatherPoint
        ? city.trim() || selectedWeatherPoint.name
        : city.trim();
    const locationLat =
      effectiveMode === "weather_api" && selectedWeatherPoint
        ? selectedWeatherPoint.lat
        : manualLocation?.lat;
    const locationLon =
      effectiveMode === "weather_api" && selectedWeatherPoint
        ? selectedWeatherPoint.lon
        : manualLocation?.lon;

    if (
      typeof locationLat !== "number" ||
      typeof locationLon !== "number" ||
      !Number.isFinite(locationLat) ||
      !Number.isFinite(locationLon)
    ) {
      toast.error("Vui lòng chọn vị trí cảnh báo trên bản đồ");
      return;
    }

    broadcast(
      buildBroadcastPayload({
        title,
        body,
        type,
        city: locationCity,
        lat: locationLat,
        lon: locationLon,
      }),
      {
        onSuccess: () => {
          toast.success("Đã phát cảnh báo đến toàn bộ người dùng");
          resetComposer();
          onSuccess?.();
        },
        onError: () => {
          toast.error("Phát cảnh báo thất bại. Vui lòng thử lại.");
        },
      },
    );
  };

  const hasValidManualLocation = !!manualLocation;

  const hasResolvedLocation =
    (effectiveMode === "weather_api" && !!selectedWeatherPoint) ||
    hasValidManualLocation;

  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    city.trim().length > 0 &&
    hasResolvedLocation &&
    confirmed;

  return (
    <div className="rounded-xl border border-border/50 bg-background">
      {/* ── Top bar: Mode toggle + Alert type ── */}
      <div className="flex flex-col gap-3 border-b border-border/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Source mode toggle */}
        <div className="inline-flex items-center rounded-lg bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={() => setMode("weather_api")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm tracking-tighter font-semibold transition-all",
              effectiveMode === "weather_api"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CloudRain size={14} className="mr-1.5 inline" />
            WeatherAPI
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm tracking-tighter font-semibold transition-all",
              effectiveMode === "manual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Nhập tay
          </button>
        </div>

        {/* Alert type selector */}
        <div className="flex gap-1.5">
          {BROADCAST_NOTIFICATION_TYPES.map((item) => {
            const meta = ALERT_TYPE_META[item];
            return (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg tracking-tighter border px-3 py-1.5 text-sm font-semibold transition-all",
                  type === item ? meta.activeClassName : meta.inactiveClassName,
                )}
              >
                {meta.icon}
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main 2-column content ── */}
      <div className="grid gap-4 px-4 py-2 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* ── Left column: Data source + Location ── */}
        <div className="space-y-3">
          {effectiveMode === "weather_api" ? (
            <>
              {/* Region selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Khu vực
                  </Label>
                  <button
                    type="button"
                    onClick={onRefreshWeather}
                    disabled={weatherLoading}
                    className="flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 disabled:opacity-50"
                  >
                    <ArrowsCounterClockwise
                      size={12}
                      className={cn(weatherLoading && "animate-spin")}
                    />
                    Làm mới
                  </button>
                </div>
                <Select
                  value={selectedRegionValue}
                  onValueChange={setSelectedRegion}
                  disabled={weatherOptions.length === 0}
                >
                  <SelectTrigger className="h-9 border-sky-200 bg-sky-50/50 text-sm">
                    <SelectValue placeholder="Chọn tỉnh/thành" />
                  </SelectTrigger>
                  <SelectContent>
                    {weatherOptions.map((point) => (
                      <SelectItem key={point.name} value={point.name}>
                        {point.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Weather stats compact */}
              {selectedWeatherPoint ? (
                <div className="rounded-lg border border-sky-200/60 bg-sky-50/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <MapPin size={14} className="text-sky-600" />
                    {selectedWeatherPoint.name}
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                      {formatDateTime(selectedWeatherPoint.last_updated)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[
                      {
                        icon: <Thermometer size={12} />,
                        val: `${selectedWeatherPoint.temp_c}°C`,
                      },
                      {
                        icon: <Droplets className="h-3 w-3" />,
                        val: `${selectedWeatherPoint.humidity}%`,
                      },
                      {
                        icon: <CloudRain size={12} />,
                        val: `${selectedWeatherPoint.precip_mm}mm`,
                      },
                      {
                        icon: <Wind size={12} />,
                        val: `${selectedWeatherPoint.wind_kph}km/h`,
                      },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="rounded-md bg-white/80 px-2 py-1.5 text-center"
                      >
                        <div className="flex justify-center text-muted-foreground">
                          {s.icon}
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-foreground">
                          {s.val}
                        </p>
                      </div>
                    ))}
                  </div>

                  {suggestedDraft && (
                    <div className="mt-2 rounded-md border border-amber-200/70 bg-amber-50/60 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          Gợi ý:{" "}
                          <strong className="text-foreground">
                            {suggestedDraft.severityLabel}
                          </strong>
                        </span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          {ALERT_TYPE_META[suggestedDraft.type].label}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                        {suggestedDraft.advisory}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2 h-7 w-full gap-1.5 bg-sky-600 text-[11px] text-white hover:bg-sky-700"
                        onClick={applyWeatherDraft}
                      >
                        <CloudRain size={12} weight="fill" />
                        Áp dụng vào form
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-sky-200 p-3 text-xs text-muted-foreground">
                  {weatherLoading
                    ? "Đang tải dữ liệu..."
                    : "Chưa có dữ liệu WeatherAPI."}
                </div>
              )}

              {weatherError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-2 text-xs text-rose-700">
                  {weatherError}
                </div>
              )}
            </>
          ) : (
            /* Manual presets */
            <div className="space-y-1.5">
              <Label className="text-sm tracking-tighter font-medium text-muted-foreground">
                Mẫu nhanh
              </Label>
              <div className="space-y-1.5">
                {MANUAL_PRESETS.map((preset) => {
                  const meta = ALERT_TYPE_META[preset.type];
                  const isActive =
                    title === preset.title && type === preset.type;
                  return (
                    <button
                      key={preset.type}
                      type="button"
                      onClick={() => applyManualPreset(preset)}
                      className={cn(
                        "flex w-full items-center gap-2 tracking-tighter mt-1 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-all hover:shadow-sm",
                        isActive
                          ? meta.activeClassName
                          : meta.inactiveClassName,
                      )}
                    >
                      {meta.icon}
                      {preset.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Location section */}
          <div className="space-y-1.5">
            <Label className="text-sm tracking-tighter font-medium text-muted-foreground">
              Vị trí cảnh báo <span className="text-red-500">*</span>
            </Label>
            <div className="flex mt-1 gap-1.5">
              <Input
                className="h-9 text-sm"
                placeholder="Thành phố (VD: Da Nang)"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSearchCity();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 px-3"
                onClick={() => void handleSearchCity()}
                disabled={isPending || isGeocoding}
              >
                {isGeocoding ? (
                  <Spinner size={14} className="animate-spin" />
                ) : (
                  <MapPin size={14} />
                )}
              </Button>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-border/60">
              <div className="pointer-events-none absolute left-2 top-2 z-450 rounded-md border border-border/70 bg-background/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Tọa độ đã chọn
                </p>
                {manualLocation ? (
                  <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                    {manualLocation.lat.toFixed(6)},{" "}
                    {manualLocation.lon.toFixed(6)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Chưa chọn điểm trên bản đồ
                  </p>
                )}
              </div>

              <LocationPickerMap
                lat={manualLocation?.lat}
                lon={manualLocation?.lon}
                heightClassName="h-[280px]"
                onPick={(pickedLat, pickedLon) => {
                  void handlePickLocation(pickedLat, pickedLon);
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Right column: Form fields ── */}
        <div className="space-y-1">
          {/* Title */}
          <div>
            <Label
              htmlFor="flood-alert-title"
              className="mb-2 block text-sm tracking-tighter font-medium text-muted-foreground"
            >
              Tiêu đề <span className="text-red-500">*</span>
            </Label>
            <Input
              id="flood-alert-title"
              className="h-9 text-sm"
              placeholder="Nhập tiêu đề cảnh báo..."
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />
            <p className="mt-0.5 tracking-tighter text-right text-xs text-muted-foreground">
              {title.length}/120
            </p>
          </div>

          {/* Body */}
          <div>
            <Label
              htmlFor="flood-alert-body"
              className="mb-2 block text-sm tracking-tighter font-medium text-muted-foreground"
            >
              Nội dung <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="flood-alert-body"
              placeholder="Nhập nội dung cảnh báo chi tiết..."
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-24 resize-none text-sm"
              maxLength={500}
            />
            <p className="mt-0.5 text-right text-xs tracking-tighter text-muted-foreground">
              {body.length}/500
            </p>
          </div>

          {/* Confirm + Warning */}
          <label className="flex items-start gap-2.5 mt-2 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border accent-red-600"
            />
            <span className="text-sm tracking-tighter leading-relaxed text-amber-900">
              Tôi xác nhận phát cảnh báo này đến{" "}
              <strong>toàn bộ người dùng</strong>. Thông báo sẽ gửi ngay và
              không thể hoàn tác.
            </span>
          </label>

          <div className="flex items-start gap-2 rounded-lg border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-700">
            <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
            <p>
              Nội dung gợi ý từ WeatherAPI chưa phải cảnh báo chính thức từ cơ
              quan chuyên trách.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={isPending}
              onClick={resetComposer}
            >
              Xóa nội dung
            </Button>
            <Button
              size="sm"
              className={cn(
                "h-9 flex-1 gap-1.5 font-semibold",
                canSend
                  ? "bg-linear-to-r from-red-600 to-orange-500 text-white hover:from-red-700 hover:to-orange-600"
                  : "bg-muted text-muted-foreground",
              )}
              disabled={!canSend || isPending}
              onClick={handleSend}
            >
              {isPending ? (
                <Spinner size={14} className="animate-spin" />
              ) : (
                <BellRinging size={14} weight="fill" />
              )}
              {isPending ? "Đang gửi..." : "Phát cảnh báo lũ"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
