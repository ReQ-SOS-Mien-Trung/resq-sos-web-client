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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  BROADCAST_NOTIFICATION_TYPES,
  BroadcastNotificationPayload,
  BroadcastNotificationType,
  useBroadcastNotification,
} from "@/services/noti_alert";
import { WeatherApiCurrentPoint } from "@/type";
import { geocodeCity } from "./geocode";

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
    icon: <WaveSine size={14} />,
    activeClassName: "border-amber-500 bg-amber-50 text-amber-700",
    inactiveClassName:
      "border-border/60 bg-muted/30 text-muted-foreground hover:border-amber-300",
  },
  FLOOD_EMERGENCY: {
    label: "Khẩn cấp lũ",
    icon: <Lightning size={14} />,
    activeClassName: "border-red-500 bg-red-50 text-red-700",
    inactiveClassName:
      "border-border/60 bg-muted/30 text-muted-foreground hover:border-red-300",
  },
  EVACUATION: {
    label: "Sơ tán",
    icon: <BellRinging size={14} />,
    activeClassName: "border-orange-500 bg-orange-50 text-orange-700",
    inactiveClassName:
      "border-border/60 bg-muted/30 text-muted-foreground hover:border-orange-300",
  },
};

const MANUAL_PRESETS: Array<{
  title: string;
  body: string;
  type: BroadcastNotificationType;
}> = [
  {
    title: "🌊 CẢNH BÁO LŨ LỤT",
    body: "Mực nước sông đang tăng cao. Người dân vùng ven sông cần di chuyển đến nơi an toàn ngay lập tức.",
    type: "FLOOD_WARNING",
  },
  {
    title: "🚨 KHẨN CẤP: LŨ LỚN",
    body: "Lũ lớn bất thường đang xảy ra. Toàn bộ cư dân khu vực thấp trũng cần sơ tán khẩn cấp. Liên hệ 114 nếu cần hỗ trợ.",
    type: "FLOOD_EMERGENCY",
  },
  {
    title: "⚠️ LỆNH SƠ TÁN",
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
      title: `🚨 ĐỀ NGHỊ SƠ TÁN KHẨN TẠI ${point.name.toUpperCase()}`,
      body: `WeatherAPI ghi nhận tại ${point.name} lúc ${formatDateTime(point.last_updated)}: ${point.condition_text}, mưa ${point.precip_mm}mm, độ ẩm ${point.humidity}%, gió ${point.wind_kph} km/h (${point.wind_dir}). Nguy cơ ngập sâu tăng nhanh, đề nghị sơ tán người dân khỏi khu vực trũng thấp và chuẩn bị lực lượng ứng cứu.`,
      advisory:
        "Ưu tiên sơ tán khu vực thấp trũng và cảnh báo người dân rời khỏi vùng nguy cơ cao.",
    };
  }

  if (point.precip_mm >= 25 || point.wind_kph >= 40 || isStormLike) {
    return {
      type: "FLOOD_EMERGENCY",
      severityLabel: "Cao",
      title: `🚨 KHẨN CẤP NGẬP LỤT TẠI ${point.name.toUpperCase()}`,
      body: `WeatherAPI ghi nhận tại ${point.name} lúc ${formatDateTime(point.last_updated)}: ${point.condition_text}, mưa ${point.precip_mm}mm, độ ẩm ${point.humidity}%, gió ${point.wind_kph} km/h (${point.wind_dir}). Nguy cơ lũ và ngập đô thị đang ở mức cao, đề nghị lực lượng tại chỗ trực chiến và người dân hạn chế di chuyển qua khu vực ven sông, ngầm tràn.`,
      advisory:
        "Tăng cường theo dõi mực nước, chuẩn bị lực lượng ứng cứu và hạn chế di chuyển qua điểm ngập.",
    };
  }

  return {
    type: "FLOOD_WARNING",
    severityLabel: "Theo dõi",
    title: `🌧️ THEO DÕI MƯA LŨ TẠI ${point.name.toUpperCase()}`,
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
    <div className="space-y-5">
      <Tabs
        value={effectiveMode}
        onValueChange={(value) => setMode(value as ComposerMode)}
        className="gap-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-muted/50 p-1">
          <TabsTrigger
            value="weather_api"
            className="rounded-lg py-2 text-sm font-semibold"
          >
            Gợi ý từ WeatherAPI
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="rounded-lg py-2 text-sm font-semibold"
          >
            Nhập tay
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weather_api" className="space-y-4">
          <div className="rounded-xl border border-sky-200/70 bg-linear-to-br from-sky-50 to-cyan-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-sky-900">
                  Tạo gợi ý cảnh báo từ dữ liệu thời tiết
                </p>
                <p className="mt-1 text-xs leading-relaxed text-sky-800/80">
                  Hệ thống lấy dữ liệu WeatherAPI hiện tại của các tỉnh miền
                  Trung để gợi ý mức cảnh báo, tiêu đề và nội dung. Admin vẫn có
                  thể chỉnh sửa trước khi phát đi.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-sky-300 bg-white/80"
                onClick={onRefreshWeather}
                disabled={weatherLoading}
              >
                <ArrowsCounterClockwise
                  className={cn("h-4 w-4", weatherLoading && "animate-spin")}
                />
                Làm mới
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-sky-900">
                  Chọn khu vực cần lấy dữ liệu
                </Label>
                <Select
                  value={selectedRegionValue}
                  onValueChange={setSelectedRegion}
                  disabled={weatherOptions.length === 0}
                >
                  <SelectTrigger className="w-full border-sky-200 bg-white">
                    <SelectValue placeholder="Chọn tỉnh/thành miền Trung" />
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

              {selectedWeatherPoint ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin size={16} className="text-sky-600" />
                      {selectedWeatherPoint.name}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Thermometer size={14} />
                          Nhiệt độ
                        </div>
                        <p className="mt-1 font-semibold text-foreground">
                          {selectedWeatherPoint.temp_c}°C
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Droplets className="h-4 w-4" />
                          Độ ẩm
                        </div>
                        <p className="mt-1 font-semibold text-foreground">
                          {selectedWeatherPoint.humidity}%
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CloudRain size={14} />
                          Lượng mưa
                        </div>
                        <p className="mt-1 font-semibold text-foreground">
                          {selectedWeatherPoint.precip_mm} mm
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Wind size={14} />
                          Gió
                        </div>
                        <p className="mt-1 font-semibold text-foreground">
                          {selectedWeatherPoint.wind_kph} km/h
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Cập nhật:{" "}
                      {formatDateTime(selectedWeatherPoint.last_updated)}
                    </p>
                  </div>

                  {suggestedDraft && (
                    <div className="rounded-xl border border-amber-200 bg-white/90 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Gợi ý nội dung cảnh báo
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Mức cảnh báo suy luận:{" "}
                            {suggestedDraft.severityLabel}
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          {ALERT_TYPE_META[suggestedDraft.type].label}
                        </span>
                      </div>

                      <div className="mt-3 rounded-lg bg-amber-50/70 p-3 text-sm text-foreground">
                        {suggestedDraft.advisory}
                      </div>

                      <Button
                        type="button"
                        className="mt-4 w-full gap-2 bg-sky-600 text-white hover:bg-sky-700"
                        onClick={applyWeatherDraft}
                      >
                        <CloudRain size={16} weight="fill" />
                        Dùng dữ liệu này để điền biểu mẫu
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-sky-300 bg-white/70 p-4 text-sm text-muted-foreground">
                  {weatherLoading
                    ? "Đang lấy dữ liệu WeatherAPI..."
                    : "Chưa có dữ liệu WeatherAPI để import. Bạn vẫn có thể chuyển sang nhập tay."}
                </div>
              )}

              {weatherError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-700">
                  Không lấy được dữ liệu WeatherAPI: {weatherError}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">
              Nhập tay thông báo lũ lụt
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Dùng khi admin muốn chủ động soạn nội dung riêng, không phụ thuộc
              vào dữ liệu WeatherAPI.
            </p>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {MANUAL_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => applyManualPreset(preset)}
                  className={cn(
                    "rounded-xl border p-3 text-left text-xs leading-relaxed transition-all hover:-translate-y-0.5 hover:shadow-sm",
                    title === preset.title && type === preset.type
                      ? "border-orange-400 bg-orange-50 text-orange-700"
                      : "border-border/60 bg-background text-muted-foreground hover:border-orange-300 hover:bg-orange-50/50",
                  )}
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-4 rounded-xl border border-border/60 bg-background p-4">
        <div>
          <Label className="mb-2 block text-sm font-medium">
            Loại cảnh báo
          </Label>
          <div className="grid gap-2 md:grid-cols-3">
            {BROADCAST_NOTIFICATION_TYPES.map((item) => {
              const meta = ALERT_TYPE_META[item];
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setType(item)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                    type === item
                      ? meta.activeClassName
                      : meta.inactiveClassName,
                  )}
                >
                  {meta.icon}
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label
            htmlFor="flood-alert-title"
            className="mb-1.5 block text-sm font-medium"
          >
            Tiêu đề <span className="text-red-500">*</span>
          </Label>
          <Input
            id="flood-alert-title"
            placeholder="Nhập tiêu đề cảnh báo..."
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
          />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {title.length}/120
          </p>
        </div>

        <div>
          <Label
            htmlFor="flood-alert-body"
            className="mb-1.5 block text-sm font-medium"
          >
            Nội dung <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="flood-alert-body"
            placeholder="Nhập nội dung cảnh báo chi tiết..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="min-h-28 resize-none"
            maxLength={500}
          />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {body.length}/500
          </p>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium">
            Vị trí cảnh báo <span className="text-red-500">*</span>
          </Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nhập thành phố (VD: Da Nang, Quang Nam...)"
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
                onClick={() => void handleSearchCity()}
                disabled={isPending || isGeocoding}
                className="shrink-0"
              >
                {isGeocoding ? "Đang tìm..." : "Tìm"}
              </Button>
            </div>
            <LocationPickerMap
              lat={manualLocation?.lat}
              lon={manualLocation?.lon}
              onPick={(lat, lon) => setManualLocation({ lat, lon })}
            />
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {manualLocation
                ? "Đã chọn vị trí trên bản đồ"
                : "Nhập thành phố để tìm nhanh hoặc nhấn trực tiếp vào bản đồ"}
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-red-600"
          />
          <span className="text-xs leading-relaxed text-amber-900">
            Tôi xác nhận phát thông báo này đến toàn bộ người dùng. Hành động
            này sẽ gửi push notification ngay và không thể hoàn tác.
          </span>
        </label>

        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
          <p>
            Khi dùng chế độ import, nội dung chỉ là gợi ý dựa trên dữ liệu thời
            tiết hiện tại của WeatherAPI, chưa phải cảnh báo lũ chính thức từ cơ
            quan chuyên trách.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={isPending}
            onClick={resetComposer}
          >
            Xóa nội dung
          </Button>
          <Button
            className={cn(
              "flex-1 gap-2 font-semibold",
              canSend
                ? "bg-linear-to-r from-red-600 to-orange-500 text-white hover:from-red-700 hover:to-orange-600"
                : "bg-muted text-muted-foreground",
            )}
            disabled={!canSend || isPending}
            onClick={handleSend}
          >
            {isPending ? (
              <Spinner size={16} className="animate-spin" />
            ) : (
              <BellRinging size={16} weight="fill" />
            )}
            {isPending ? "Đang gửi..." : "Phát cảnh báo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
