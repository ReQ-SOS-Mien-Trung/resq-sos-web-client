"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  FloppyDisk,
  ArrowCounterClockwise,
  SpinnerGap,
  Clock,
  Lightning,
  Warning,
  Timer,
} from "@phosphor-icons/react";
import {
  useSupplyRequestPriorityConfig,
  useUpdateSupplyRequestPriorityConfig,
} from "@/services/inventory/hooks";

// ─── Constants ────────────────────────────────────────────────────────────────

type PriorityField = "urgentMinutes" | "highMinutes" | "mediumMinutes";

const SLIDER_MAX = 240; // 4 hours max

const PRIORITY_FIELDS: {
  key: PriorityField;
  label: string;
  description: string;
  icon: typeof Lightning;
  iconWeight: "fill" | "bold";
  color: string;
  textColor: string;
  bg: string;
  sliderTrack: string;
  sliderThumb: string;
}[] = [
    {
      key: "urgentMinutes",
      label: "Urgent",
      description: "Khẩn cấp",
      icon: Lightning,
      iconWeight: "fill",
      color: "text-red-600 dark:text-red-400",
      textColor: "text-red-700 dark:text-red-300",
      bg: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
      sliderTrack: "bg-red-500",
      sliderThumb:
        "border-red-500 bg-white shadow-[0_0_0_3px_rgba(239,68,68,0.2)] hover:shadow-[0_0_0_5px_rgba(239,68,68,0.25)]",
    },
    {
      key: "highMinutes",
      label: "High",
      description: "Cao",
      icon: Warning,
      iconWeight: "fill",
      color: "text-amber-600 dark:text-amber-400",
      textColor: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
      sliderTrack: "bg-amber-400",
      sliderThumb:
        "border-amber-400 bg-white shadow-[0_0_0_3px_rgba(251,191,36,0.2)] hover:shadow-[0_0_0_5px_rgba(251,191,36,0.25)]",
    },
    {
      key: "mediumMinutes",
      label: "Medium",
      description: "Bình thường",
      icon: Timer,
      iconWeight: "bold",
      color: "text-sky-600 dark:text-sky-400",
      textColor: "text-sky-700 dark:text-sky-300",
      bg: "bg-sky-50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800",
      sliderTrack: "bg-sky-400",
      sliderThumb:
        "border-sky-400 bg-white shadow-[0_0_0_3px_rgba(56,189,248,0.2)] hover:shadow-[0_0_0_5px_rgba(56,189,248,0.25)]",
    },
  ];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SupplyRequestPriorityConfigCard() {
  const {
    data: serverData,
    isLoading,
    refetch,
  } = useSupplyRequestPriorityConfig();
  const mutation = useUpdateSupplyRequestPriorityConfig();

  const [overrides, setOverrides] = useState<
    Partial<Record<PriorityField, number>>
  >({});

  const effectiveValues = useMemo(
    () => ({
      urgentMinutes: serverData?.urgentMinutes ?? 10,
      highMinutes: serverData?.highMinutes ?? 30,
      mediumMinutes: serverData?.mediumMinutes ?? 120,
    }),
    [serverData],
  );

  const getValue = (key: PriorityField): number =>
    overrides[key] ?? effectiveValues[key];

  const handleSliderChange = (key: PriorityField, value: number) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    const urgent = getValue("urgentMinutes");
    const high = getValue("highMinutes");
    const medium = getValue("mediumMinutes");
    if (urgent <= 0) return "Urgent phải lớn hơn 0";
    if (high <= urgent) return "High phải lớn hơn Urgent";
    if (medium <= high) return "Medium phải lớn hơn High";
    return null;
  };

  const handleSave = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const payload = {
      urgentMinutes: getValue("urgentMinutes"),
      highMinutes: getValue("highMinutes"),
      mediumMinutes: getValue("mediumMinutes"),
    };

    const toastId = toast.loading("Đang lưu cấu hình thời gian tiếp tế...");
    mutation.mutate(payload, {
      onSuccess: async () => {
        toast.dismiss(toastId);
        toast.success("Cập nhật cấu hình thời gian tiếp tế thành công");
        setOverrides({});
        await refetch();
      },
      onError: (err: any) => {
        toast.dismiss(toastId);
        toast.error(
          `Lỗi: ${err?.response?.data?.message ?? err?.message ?? "Không xác định"}`,
        );
      },
    });
  };

  const handleReset = () => {
    setOverrides({});
  };

  const isDirty = Object.keys(overrides).length > 0;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base tracking-tighter flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              Thời gian tiếp tế theo mức độ ưu tiên
            </CardTitle>
            <CardDescription className="tracking-tighter text-sm mt-0.5">
              Kéo thanh trượt để điều chỉnh thời gian phản hồi (phút) cho từng mức.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isLoading || mutation.isPending || !isDirty}
            >
              <ArrowCounterClockwise size={13} className="mr-1.5" />
              Hoàn tác
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading || mutation.isPending || !isDirty}
            >
              {mutation.isPending ? (
                <SpinnerGap size={13} className="mr-1.5 animate-spin" />
              ) : (
                <FloppyDisk size={13} className="mr-1.5" />
              )}
              Lưu
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {PRIORITY_FIELDS.map((field) => {
          const Icon = field.icon;
          const value = getValue(field.key);
          const pct = Math.min((value / SLIDER_MAX) * 100, 100);

          return (
            <div
              key={field.key}
              className={`rounded-xl border px-5 py-4 transition-all ${field.bg}`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={20}
                    weight={field.iconWeight}
                    className={field.color}
                  />
                  <div>
                    <span
                      className={`text-sm font-bold tracking-tighter ${field.textColor}`}
                    >
                      {field.label} -
                    </span>
                    <span className={`text-sm font-bold tracking-tighter ml-1 ${field.textColor}`}>
                      {field.description}
                    </span>
                  </div>
                </div>

                {/* Time badge */}
                <div
                  className={`rounded-full px-3 py-1 text-sm font-bold tracking-tighter tabular-nums ${field.textColor} bg-white/80 dark:bg-black/20 border border-current/10`}
                >
                  {formatMinutes(value)}
                </div>
              </div>

              {/* Slider */}
              <div className="relative group">
                {/* Track background */}
                <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                  {/* Filled track */}
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${field.sliderTrack}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Native range input — invisible but handles all interaction */}
                <input
                  type="range"
                  min={1}
                  max={SLIDER_MAX}
                  step={1}
                  value={value}
                  disabled={isLoading}
                  onChange={(e) =>
                    handleSliderChange(field.key, parseInt(e.target.value, 10))
                  }
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  style={{ margin: 0, padding: 0 }}
                />

                {/* Custom thumb */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-[2.5px] transition-shadow duration-150 pointer-events-none ${field.sliderThumb}`}
                  style={{ left: `calc(${pct}% - 10px)` }}
                />
              </div>

              {/* Scale labels */}
              <div className="flex justify-between mt-2 font-medium text-xs tabular-nums tracking-tighter">
                <span>1p</span>
                <span>1h</span>
                <span>2h</span>
                <span>3h</span>
                <span>4h</span>
              </div>
            </div>
          );
        })}

        {/* Meta info */}
        {serverData?.updatedAt && (
          <p className="text-sm tracking-tighter pt-1">
            Cập nhật lần cuối:{" "}
            <strong>
              {new Date(serverData.updatedAt).toLocaleString("vi-VN")}
            </strong>
            {serverData.updatedBy && (
              <span>
                {" "}
                bởi <strong>{serverData.updatedBy}</strong>
              </span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
