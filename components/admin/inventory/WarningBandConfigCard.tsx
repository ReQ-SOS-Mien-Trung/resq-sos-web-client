"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FloppyDisk, ArrowCounterClockwise, SpinnerGap } from "@phosphor-icons/react";
import {
  useWarningBandConfig,
  useUpdateWarningBandConfig,
} from "@/services/inventory/hooks";
import type { WarningBandConfig } from "@/services/inventory/type";

// ─── Constants ────────────────────────────────────────────────────────────────

const BAND_NAMES = ["CRITICAL", "MEDIUM", "LOW", "OK"] as const;
type BandName = (typeof BAND_NAMES)[number];

const BAND_META: Record<
  BandName,
  { label: string; color: string; bg: string; bar: string; description: string }
> = {
  CRITICAL: {
    label: "Nguy cấp",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
    bar: "bg-red-500",
    description: "Dưới mức này hệ thống sẽ gửi cảnh báo mức nguy cấp",
  },
  MEDIUM: {
    label: "Trung bình",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
    bar: "bg-amber-400",
    description: "Dưới mức này hệ thống sẽ gửi cảnh báo mức trung bình",
  },
  LOW: {
    label: "Thấp",
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
    bar: "bg-yellow-400",
    description: "Dưới mức này hệ thống sẽ gửi cảnh báo mức thấp",
  },
  OK: {
    label: "Đủ kho",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800",
    bar: "bg-emerald-500",
    description: "Trên mức LOW — kho đạt mức an toàn",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert server ratio (0–1) to user-facing percent (0–100) */
const toPercent = (v: number) => Math.round(v * 100 * 10) / 10;
/** Convert user-facing percent back to ratio */
const toRatio = (p: number) => Math.round((p / 100) * 1000) / 1000;

/** Build the default draft from server data */
function buildDraft(bands: WarningBandConfig[] | null | undefined): Record<BandName, number | null> {
  const map: Record<string, number | null> = {};
  if (Array.isArray(bands)) {
    bands.forEach((b) => (map[b.name] = b.to));
  }
  return {
    CRITICAL: map["CRITICAL"] !== undefined ? map["CRITICAL"] : 0.4,
    MEDIUM: map["MEDIUM"] !== undefined ? map["MEDIUM"] : 0.7,
    LOW: map["LOW"] !== undefined ? map["LOW"] : 1.0,
    OK: null,
  };
}

/** Derive "from" values from "to" values */
function deriveFrom(
  draft: Record<BandName, number | null>,
): Record<BandName, number> {
  return {
    CRITICAL: 0,
    MEDIUM: draft.CRITICAL ?? 0,
    LOW: draft.MEDIUM ?? 0,
    OK: draft.LOW ?? 0,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WarningBandConfigCard() {
  const { data: serverData, isLoading, refetch } = useWarningBandConfig();
  const mutation = useUpdateWarningBandConfig();

  // User overrides: only what the user has explicitly changed.
  // If null, falls back to server values.
  const [inputOverrides, setInputOverrides] = useState<
    Partial<Record<Exclude<BandName, "OK">, string>>
  >({});
  const [ratioOverrides, setRatioOverrides] = useState<
    Partial<Record<Exclude<BandName, "OK">, number>>
  >({});

  // Server-derived "to" values (ratios)
  const serverDraft = useMemo(
    () => buildDraft(serverData),
    [serverData],
  );

  // Effective ratio for each editable band (user override wins)
  const effectiveRatios = {
    CRITICAL: ratioOverrides.CRITICAL ?? serverDraft.CRITICAL,
    MEDIUM: ratioOverrides.MEDIUM ?? serverDraft.MEDIUM,
    LOW: ratioOverrides.LOW ?? serverDraft.LOW,
    OK: null,
  } as Record<BandName, number | null>;

  // Display strings for inputs (user override wins, otherwise from server)
  const inputs: Record<Exclude<BandName, "OK">, string> = {
    CRITICAL:
      inputOverrides.CRITICAL ??
      (serverDraft.CRITICAL !== null
        ? String(toPercent(serverDraft.CRITICAL))
        : ""),
    MEDIUM:
      inputOverrides.MEDIUM ??
      (serverDraft.MEDIUM !== null
        ? String(toPercent(serverDraft.MEDIUM))
        : ""),
    LOW:
      inputOverrides.LOW ??
      (serverDraft.LOW !== null ? String(toPercent(serverDraft.LOW)) : ""),
  };

  const froms = deriveFrom(effectiveRatios);

  const handleInputChange = (band: Exclude<BandName, "OK">, raw: string) => {
    setInputOverrides((prev) => ({ ...prev, [band]: raw }));
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      setRatioOverrides((prev) => ({ ...prev, [band]: toRatio(parsed) }));
    }
  };

  const validate = (): string | null => {
    const critical = effectiveRatios.CRITICAL;
    const medium = effectiveRatios.MEDIUM;
    const low = effectiveRatios.LOW;

    if (critical === null || medium === null || low === null)
      return "Vui lòng nhập đủ các mức";
    if (critical <= 0) return "CRITICAL phải > 0%";
    if (medium <= critical) return "MEDIUM phải lớn hơn CRITICAL";
    if (low <= medium) return "LOW phải lớn hơn MEDIUM";
    if (low > 1) return "LOW không được vượt quá 100%";
    return null;
  };

  const handleSave = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const payload: WarningBandConfig[] = [
      { name: "CRITICAL", from: froms.CRITICAL, to: effectiveRatios.CRITICAL! },
      { name: "MEDIUM", from: froms.MEDIUM, to: effectiveRatios.MEDIUM! },
      { name: "LOW", from: froms.LOW, to: effectiveRatios.LOW! },
      { name: "OK", from: froms.OK, to: null },
    ];

    const toastId = toast.loading("Đang lưu cấu hình dải cảnh báo...");
    mutation.mutate(payload, {
      onSuccess: async () => {
        toast.dismiss(toastId);
        toast.success("Cập nhật dải cảnh báo thành công");
        setInputOverrides({});
        setRatioOverrides({});
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
    setInputOverrides({});
    setRatioOverrides({});
  };

  // Visual bar widths
  const criticalPct = effectiveRatios.CRITICAL !== null ? toPercent(effectiveRatios.CRITICAL) : 0;
  const mediumPct = effectiveRatios.MEDIUM !== null ? toPercent(effectiveRatios.MEDIUM) : 0;
  const lowPct = effectiveRatios.LOW !== null ? toPercent(effectiveRatios.LOW) : 0;
  const criticalWidth = criticalPct;
  const mediumWidth = Math.max(mediumPct - criticalPct, 0);
  const lowWidth = Math.max(lowPct - mediumPct, 0);
  const okWidth = Math.max(100 - lowPct, 0);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-[16px] tracking-tighter">
              Dải cảnh báo kho hàng
            </CardTitle>
            <CardDescription className="tracking-tighter text-[14px] mt-0.5">
              Điều chỉnh ngưỡng phần trăm (%) tồn kho cho 4 mức cảnh báo cố
              định. Giá trị được tính theo tỉ lệ tồn kho hiện tại / ngưỡng
              tối thiểu.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isLoading || mutation.isPending}
            >
              <ArrowCounterClockwise size={13} className="mr-1.5" />
              Hoàn tác
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading || mutation.isPending}
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
        {/* Visual bar */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground tracking-tighter font-medium uppercase">
            Biểu đồ phân bổ dải
          </p>
          <div className="flex h-5 w-full overflow-hidden rounded-full border border-border/40">
            {isLoading ? (
              <div className="h-full w-full animate-pulse bg-muted" />
            ) : (
              <>
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${Math.max(criticalWidth, 0)}%` }}
                  title={`CRITICAL: 0% – ${criticalWidth}%`}
                />
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.max(mediumWidth, 0)}%` }}
                  title={`MEDIUM: ${criticalWidth}% – ${criticalWidth + mediumWidth}%`}
                />
                <div
                  className="h-full bg-yellow-400 transition-all duration-300"
                  style={{ width: `${Math.max(lowWidth, 0)}%` }}
                  title={`LOW: ${criticalWidth + mediumWidth}% – ${criticalWidth + mediumWidth + lowWidth}%`}
                />
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 flex-1"
                  style={{ width: `${Math.max(okWidth, 0)}%` }}
                  title={`OK: ${criticalWidth + mediumWidth + lowWidth}% – 100%`}
                />
              </>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Band rows */}
        <div className="space-y-2">
          {BAND_NAMES.map((band) => {
            const meta = BAND_META[band];
            const isOK = band === "OK";
            const fromVal = froms[band];
            const fromPct = toPercent(fromVal);

            return (
              <div
                key={band}
                className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${meta.bg}`}
              >
                {/* Color dot + label */}
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <div className={`h-2.5 w-2.5 rounded-full ${meta.bar}`} />
                  <div>
                    <p className={`text-sm font-bold tracking-tighter ${meta.color}`}>
                      {band}
                    </p>
                    <p className={`text-[11px] tracking-tighter ${meta.color} opacity-75`}>
                      {meta.label}
                    </p>
                  </div>
                </div>

                {/* From (readonly, derived) */}
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                    Từ
                  </span>
                  <div className="h-8 w-16 flex items-center justify-center rounded-md border bg-background/60 text-sm font-mono text-muted-foreground select-none">
                    {isLoading ? "…" : `${fromPct}%`}
                  </div>
                </div>

                <span className="text-muted-foreground text-sm">→</span>

                {/* To (editable or fixed for OK) */}
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                    Đến
                  </span>
                  {isOK ? (
                    <div className="h-8 w-20 flex items-center justify-center rounded-md border bg-background/60 text-sm font-mono text-muted-foreground select-none">
                      ∞
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={inputs[band as Exclude<BandName, "OK">] ?? ""}
                        onChange={(e) =>
                          handleInputChange(
                            band as Exclude<BandName, "OK">,
                            e.target.value,
                          )
                        }
                        disabled={isLoading}
                        className="h-8 w-24 pr-7 text-sm font-mono"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        %
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="ml-auto text-[12px] text-muted-foreground tracking-tighter hidden sm:block max-w-xs text-right">
                  {meta.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <p className="text-[12px] text-muted-foreground tracking-tighter">
          💡 Giá trị <strong>Từ</strong> được tự động suy ra từ mức trên. Chỉ
          cần điều chỉnh cột <strong>Đến</strong> của CRITICAL, MEDIUM và LOW.
        </p>
      </CardContent>
    </Card>
  );
}
