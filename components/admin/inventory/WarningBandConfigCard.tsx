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
  Warning,
  ShieldWarning,
  ShieldCheck,
  CheckCircle,
} from "@phosphor-icons/react";
import {
  useWarningBandConfig,
  useUpdateWarningBandConfig,
} from "@/services/inventory/hooks";

// ─── Types ────────────────────────────────────────────────────────────────────

type EditableBand = "CRITICAL" | "MEDIUM" | "LOW";

const BAND_CONFIG: {
  key: EditableBand;
  label: string;
  description: string;
  icon: typeof Warning;
  iconWeight: "fill" | "bold";
  color: string;
  textColor: string;
  bg: string;
  sliderTrack: string;
  sliderThumb: string;
  badgeBg: string;
}[] = [
    {
      key: "CRITICAL",
      label: "Nguy cấp",
      description: "Kho dưới mức này → cảnh báo khẩn",
      icon: ShieldWarning,
      iconWeight: "fill",
      color: "text-red-600",
      textColor: "text-red-700 dark:text-red-300",
      bg: "bg-gradient-to-r from-red-50 to-red-100/50 border-red-200 dark:from-red-950/30 dark:to-red-900/10 dark:border-red-800/60",
      sliderTrack: "bg-red-500",
      sliderThumb:
        "border-red-500 bg-white shadow-[0_0_0_3px_rgba(239,68,68,0.2)] hover:shadow-[0_0_0_6px_rgba(239,68,68,0.25)]",
      badgeBg:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
    },
    {
      key: "MEDIUM",
      label: "Trung bình",
      description: "Kho ở mức cần chú ý theo dõi",
      icon: Warning,
      iconWeight: "fill",
      color: "text-amber-600",
      textColor: "text-amber-700 dark:text-amber-300",
      bg: "bg-gradient-to-r from-amber-50 to-yellow-50/50 border-amber-200 dark:from-amber-950/30 dark:to-amber-900/10 dark:border-amber-800/60",
      sliderTrack: "bg-amber-400",
      sliderThumb:
        "border-amber-400 bg-white shadow-[0_0_0_3px_rgba(251,191,36,0.2)] hover:shadow-[0_0_0_6px_rgba(251,191,36,0.25)]",
      badgeBg:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
    },
    {
      key: "LOW",
      label: "Thấp",
      description: "Kho dưới mức an toàn nhưng chưa khẩn",
      icon: CheckCircle,
      iconWeight: "bold",
      color: "text-emerald-600",
      textColor: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-gradient-to-r from-emerald-50 to-teal-50/50 border-emerald-200 dark:from-emerald-950/30 dark:to-emerald-900/10 dark:border-emerald-800/60",
      sliderTrack: "bg-emerald-500",
      sliderThumb:
        "border-emerald-500 bg-white shadow-[0_0_0_3px_rgba(16,185,129,0.2)] hover:shadow-[0_0_0_6px_rgba(16,185,129,0.25)]",
      badgeBg:
        "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
    },
  ];

// ─── Component ────────────────────────────────────────────────────────────────

export function WarningBandConfigCard() {
  const { data: serverData, isLoading, refetch } = useWarningBandConfig();
  const mutation = useUpdateWarningBandConfig();

  const [overrides, setOverrides] = useState<
    Partial<Record<EditableBand, number>>
  >({});

  const serverValues = useMemo(
    () => ({
      CRITICAL: serverData?.critical ?? 40,
      MEDIUM: serverData?.medium ?? 70,
      LOW: serverData?.low ?? 100,
    }),
    [serverData],
  );

  const getValue = (key: EditableBand): number =>
    overrides[key] ?? serverValues[key];

  const handleSliderChange = (key: EditableBand, value: number) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    const critical = getValue("CRITICAL");
    const medium = getValue("MEDIUM");
    const low = getValue("LOW");
    if (critical <= 0) return "CRITICAL phải > 0%";
    if (medium <= critical) return "MEDIUM phải lớn hơn CRITICAL";
    if (low <= medium) return "LOW phải lớn hơn MEDIUM";
    if (low > 100) return "LOW không được vượt quá 100%";
    return null;
  };

  const handleSave = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const payload = {
      critical: getValue("CRITICAL"),
      medium: getValue("MEDIUM"),
      low: getValue("LOW"),
    };

    const toastId = toast.loading("Đang lưu cấu hình dải cảnh báo...");
    mutation.mutate(payload, {
      onSuccess: async () => {
        toast.dismiss(toastId);
        toast.success("Cập nhật dải cảnh báo thành công");
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

  // Visual bar widths
  const criticalPct = getValue("CRITICAL");
  const mediumPct = getValue("MEDIUM");
  const lowPct = getValue("LOW");

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-[16px] tracking-tighter flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              Dải cảnh báo kho hàng
            </CardTitle>
            <CardDescription className="tracking-tighter text-[14px] mt-0.5">
              Kéo thanh trượt để điều chỉnh ngưỡng (%) từng mức cảnh báo. Các
              mức phải tăng dần: CRITICAL &lt; MEDIUM &lt; LOW.
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

      <CardContent className="space-y-5">
        {/* ── Unified zone bar ── */}
        <div className="space-y-2">
          <div className="relative">
            {/* Multi-zone bar */}
            <div className="flex h-8 w-full overflow-hidden rounded-full border border-border/40 shadow-inner">
              {isLoading ? (
                <div className="h-full w-full animate-pulse bg-muted" />
              ) : (
                <>
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300 flex items-center justify-center"
                    style={{ width: `${criticalPct}%` }}
                  >
                    {criticalPct > 8 && (
                      <span className="text-[10px] font-bold text-white/90 tracking-tight">
                        {criticalPct}%
                      </span>
                    )}
                  </div>
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all duration-300 flex items-center justify-center"
                    style={{
                      width: `${Math.max(mediumPct - criticalPct, 0)}%`,
                    }}
                  >
                    {mediumPct - criticalPct > 8 && (
                      <span className="text-[10px] font-bold text-amber-900/70 tracking-tight">
                        {mediumPct - criticalPct}%
                      </span>
                    )}
                  </div>
                  <div
                    className="h-full bg-gradient-to-r from-yellow-300 to-lime-300 transition-all duration-300 flex items-center justify-center"
                    style={{ width: `${Math.max(lowPct - mediumPct, 0)}%` }}
                  >
                    {lowPct - mediumPct > 8 && (
                      <span className="text-[10px] font-bold text-yellow-900/70 tracking-tight">
                        {lowPct - mediumPct}%
                      </span>
                    )}
                  </div>
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300 flex-1 flex items-center justify-center">
                    {100 - lowPct > 8 && (
                      <span className="text-[10px] font-bold text-white/90 tracking-tight">
                        OK
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Tick marks */}
            <div className="flex justify-between mt-1.5 px-0.5">
              <span className="text-xs text-muted-foreground/60 font-medium tabular-nums">
                0%
              </span>
              <span className="text-xs text-muted-foreground/60 font-medium tabular-nums">
                25%
              </span>
              <span className="text-xs text-muted-foreground/60 font-medium tabular-nums">
                50%
              </span>
              <span className="text-xs text-muted-foreground/60 font-medium tabular-nums">
                75%
              </span>
              <span className="text-xs text-muted-foreground/60 font-medium tabular-nums">
                100%
              </span>
            </div>
          </div>

          {/* Legend chips */}
          <div className="flex items-center gap-2 justify-center pt-1">
            {[
              { label: "Nguy cấp", color: "bg-red-500" },
              { label: "Trung bình", color: "bg-amber-400" },
              { label: "Thấp", color: "bg-yellow-300" },
              { label: "An toàn", color: "bg-emerald-500" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1.5 text-xs text-muted-foreground tracking-tighter"
              >
                <div
                  className={`h-2 w-2 rounded-full ${item.color} ring-1 ring-black/5`}
                />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Slider rows ── */}
        <div className="space-y-3">
          {BAND_CONFIG.map((field) => {
            const Icon = field.icon;
            const value = getValue(field.key);
            const pct = value;

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
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-sm font-bold tracking-tighter ${field.textColor}`}
                      >
                        {field.key} - {field.label}
                      </span>
                      <span className={`text-sm font-medium tracking-tighter ${field.textColor} opacity-60`}>
                        ({field.description})
                      </span>
                    </div>
                  </div>

                  {/* Percentage badge */}
                  <div
                    className={`rounded-full px-3 py-1 text-sm font-bold tracking-tighter tabular-nums border ${field.badgeBg}`}
                  >
                    {value}%
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
                    max={100}
                    step={1}
                    value={value}
                    disabled={isLoading}
                    onChange={(e) =>
                      handleSliderChange(
                        field.key,
                        parseInt(e.target.value, 10),
                      )
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

                {/* Scale + description */}
                <div className="flex items-end justify-between mt-2">
                  <div className="flex gap-0 w-full font-medium text-xs tabular-nums tracking-tighter text-muted-foreground/60">
                    <span>0%</span>
                    <span className="ml-auto">50%</span>
                    <span className="ml-auto">100%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Meta info */}
        {serverData?.updatedAt && (
          <p className="text-sm tracking-tighter pt-1">
            Cập nhật lần cuối:{" "}
            <strong>
              {new Date(serverData.updatedAt).toLocaleString("vi-VN")}
            </strong>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
