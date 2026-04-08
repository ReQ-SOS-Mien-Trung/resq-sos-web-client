"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
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

type Handle = "critical" | "medium" | "low";

const HANDLE_META: {
  key: Handle;
  label: string;
  sub: string;
  description: string;
  Icon: typeof Warning;
  iconWeight: "fill" | "bold";
  color: string;
  border: string;
  badge: string;
  ring: string;
}[] = [
  {
    key: "critical",
    label: "CRITICAL",
    sub: "Nguy cấp",
    description: "Kho dưới mức này → cảnh báo khẩn",
    Icon: ShieldWarning,
    iconWeight: "fill",
    color: "text-red-600",
    border: "border-red-500",
    badge: "bg-red-100 text-red-800 border-red-200",
    ring: "rgba(239,68,68,0.35)",
  },
  {
    key: "medium",
    label: "MEDIUM",
    sub: "Trung bình",
    description: "Kho ở mức cần chú ý theo dõi",
    Icon: Warning,
    iconWeight: "fill",
    color: "text-amber-600",
    border: "border-amber-400",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    ring: "rgba(251,191,36,0.35)",
  },
  {
    key: "low",
    label: "LOW",
    sub: "Thấp",
    description: "Kho dưới mức an toàn nhưng chưa khẩn",
    Icon: CheckCircle,
    iconWeight: "bold",
    color: "text-emerald-600",
    border: "border-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ring: "rgba(16,185,129,0.35)",
  },
];

const MIN_GAP = 2; // minimum % gap between handles

// ─── Component ────────────────────────────────────────────────────────────────

export function WarningBandConfigCard() {
  const { data: serverData, isLoading, refetch } = useWarningBandConfig();
  const mutation = useUpdateWarningBandConfig();

  const server = useMemo(() => ({
    critical: serverData?.critical ?? 40,
    medium: serverData?.medium ?? 70,
    low: serverData?.low ?? 100,
  }), [serverData]);

  const [vals, setVals] = useState<{ critical: number; medium: number; low: number } | null>(null);
  const effective = vals ?? server;

  const isDirty = vals !== null;

  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<Handle | null>(null);

  const getPct = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.round(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const raw = getPct(e.clientX);
    const handle = dragging.current;

    setVals((prev) => {
      const cur = prev ?? server;
      const c = cur.critical;
      const m = cur.medium;
      const l = cur.low;

      if (handle === "critical") {
        return { ...cur, critical: Math.min(Math.max(1, raw), m - MIN_GAP) };
      }
      if (handle === "medium") {
        return { ...cur, medium: Math.min(Math.max(c + MIN_GAP, raw), l - MIN_GAP) };
      }
      // low
      return { ...cur, low: Math.min(Math.max(m + MIN_GAP, raw), 100) };
    });
  }, [getPct, server]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const startDrag = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = handle;
  };

  const handleSave = () => {
    const toastId = toast.loading("Đang lưu cấu hình dải cảnh báo...");
    mutation.mutate(effective, {
      onSuccess: async () => {
        toast.dismiss(toastId);
        toast.success("Cập nhật dải cảnh báo thành công");
        setVals(null);
        await refetch();
      },
      onError: (err: any) => {
        toast.dismiss(toastId);
        toast.error(`Lỗi: ${err?.response?.data?.message ?? "Không xác định"}`);
      },
    });
  };

  const c = effective.critical;
  const m = effective.medium;
  const l = effective.low;

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
              Kéo các điểm mốc trực tiếp trên thanh để điều chỉnh ngưỡng (%).
              Thứ tự: CRITICAL &lt; MEDIUM &lt; LOW.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline" size="sm"
              onClick={() => setVals(null)}
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
              {mutation.isPending
                ? <SpinnerGap size={13} className="mr-1.5 animate-spin" />
                : <FloppyDisk size={13} className="mr-1.5" />}
              Lưu
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── Legend rows ── */}
        <div className="space-y-2.5">
          {HANDLE_META.map((hd) => {
            const { Icon } = hd;
            const val = hd.key === "critical" ? c : hd.key === "medium" ? m : l;
            return (
              <div key={hd.key} className="flex items-baseline gap-2">
                <Icon size={15} weight={hd.iconWeight} className={hd.color} />
                <span className={`text-sm font-bold tracking-tighter ${hd.color}`}>{hd.label}</span>
                <span className="text-xs text-muted-foreground tracking-tighter">— {hd.sub}</span>
                <span className="text-xs text-muted-foreground/60 tracking-tighter">({hd.description})</span>
                <span className={`ml-auto text-sm font-bold tabular-nums tracking-tighter px-2.5 py-0.5 rounded-full border ${hd.badge}`}>
                  {val}%
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Unified interactive bar ── */}
        <div className="select-none">
          <div
            ref={trackRef}
            className="relative mx-3 cursor-crosshair"
            style={{ height: 56 }}
          >
            {/* Zone bar */}
            {isLoading ? (
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-8 rounded-full bg-muted animate-pulse" />
            ) : (
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-8 rounded-full overflow-hidden border border-border/30 shadow-inner flex">
                {/* Critical zone: 0 → c */}
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 flex items-center justify-center transition-all duration-75 shrink-0"
                  style={{ width: `${c}%` }}
                >
                  {c > 8 && (
                    <span className="text-[11px] font-bold text-white/90 tracking-tight tabular-nums">{c}%</span>
                  )}
                </div>
                {/* Medium zone: c → m */}
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 flex items-center justify-center transition-all duration-75 shrink-0"
                  style={{ width: `${Math.max(m - c, 0)}%` }}
                >
                  {m - c > 8 && (
                    <span className="text-[11px] font-bold text-amber-900/70 tracking-tight tabular-nums">{m - c}%</span>
                  )}
                </div>
                {/* Low zone: m → l */}
                <div
                  className="h-full bg-gradient-to-r from-yellow-300 to-lime-300 flex items-center justify-center transition-all duration-75 shrink-0"
                  style={{ width: `${Math.max(l - m, 0)}%` }}
                >
                  {l - m > 8 && (
                    <span className="text-[11px] font-bold text-yellow-900/70 tracking-tight tabular-nums">{l - m}%</span>
                  )}
                </div>
                {/* Safe zone: l → 100 */}
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center flex-1 transition-all duration-75">
                  {100 - l > 8 && (
                    <span className="text-[11px] font-bold text-white/90 tracking-tight">OK</span>
                  )}
                </div>
              </div>
            )}

            {/* ── Handles ── */}
            {[...HANDLE_META].reverse().map((hd, idx) => {
              const val = hd.key === "critical" ? c : hd.key === "medium" ? m : l;
              const { Icon } = hd;
              const zIndex = HANDLE_META.length - idx;
              return (
                <div
                  key={hd.key}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${val}%`, zIndex, touchAction: "none" }}
                  onPointerDown={startDrag(hd.key)}
                >
                  {/* Value tooltip above */}
                  <div
                    className={`absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums tracking-tighter whitespace-nowrap border ${hd.badge}`}
                  >
                    {val}%
                  </div>

                  {/* Thumb */}
                  <div
                    className={`w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md transition-shadow duration-150 hover:shadow-lg ${hd.border}`}
                    style={{ boxShadow: `0 0 0 3px ${hd.ring}, 0 2px 6px rgba(0,0,0,0.15)` }}
                  >
                    <Icon size={13} weight={hd.iconWeight} className={hd.color} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Axis ticks */}
          <div className="flex justify-between mt-2 mx-3 text-[10px] tabular-nums tracking-tighter text-muted-foreground/55">
            {[0, 25, 50, 75, 100].map((t) => (
              <span key={t}>{t}%</span>
            ))}
          </div>

          {/* Legend chips */}
          <div className="flex items-center gap-3 justify-center mt-3">
            {[
              { label: "Nguy cấp", color: "bg-red-500" },
              { label: "Trung bình", color: "bg-amber-400" },
              { label: "Thấp", color: "bg-yellow-300" },
              { label: "An toàn", color: "bg-emerald-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground tracking-tighter">
                <div className={`h-2 w-2 rounded-full ${item.color} ring-1 ring-black/5`} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Meta info */}
        {serverData?.updatedAt && (
          <p className="text-sm tracking-tighter pt-1">
            Cập nhật lần cuối:{" "}
            <strong>{new Date(serverData.updatedAt).toLocaleString("vi-VN")}</strong>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
