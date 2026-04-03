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

const MAX_MINUTES = 60;
const MIN_GAP = 1; // handles must be at least this far apart

type Handle = "urgentMinutes" | "highMinutes" | "mediumMinutes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutes(m: number): string {
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}p` : `${h} giờ`;
}

function pct(value: number): number {
  return (value / MAX_MINUTES) * 100;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

const HANDLES: {
  key: Handle;
  label: string;
  sub: string;
  Icon: typeof Lightning;
  iconWeight: "fill" | "bold";
  color: string;
  fillClass: string;
  badgeClass: string;
  borderClass: string;
  ringColor: string;
}[] = [
    {
      key: "urgentMinutes",
      label: "Urgent",
      sub: "Khẩn cấp",
      Icon: Lightning,
      iconWeight: "fill",
      color: "text-red-600",
      fillClass: "bg-red-500",
      badgeClass: "bg-red-100 text-red-700 border-red-200",
      borderClass: "border-red-500",
      ringColor: "rgba(239,68,68,0.3)",
    },
    {
      key: "highMinutes",
      label: "High",
      sub: "Cao",
      Icon: Warning,
      iconWeight: "fill",
      color: "text-amber-600",
      fillClass: "bg-amber-400",
      badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
      borderClass: "border-amber-400",
      ringColor: "rgba(251,191,36,0.3)",
    },
    {
      key: "mediumMinutes",
      label: "Medium",
      sub: "Bình thường",
      Icon: Timer,
      iconWeight: "bold",
      color: "text-sky-500",
      fillClass: "bg-sky-400",
      badgeClass: "bg-sky-100 text-sky-700 border-sky-200",
      borderClass: "border-sky-400",
      ringColor: "rgba(56,189,248,0.3)",
    },
  ];

// ─── Component ────────────────────────────────────────────────────────────────

export function SupplyRequestPriorityConfigCard() {
  const { data: serverData, isLoading, refetch } = useSupplyRequestPriorityConfig();
  const mutation = useUpdateSupplyRequestPriorityConfig();

  const server = useMemo(() => ({
    urgentMinutes: Math.min(serverData?.urgentMinutes ?? 10, MAX_MINUTES - 2),
    highMinutes: Math.min(serverData?.highMinutes ?? 20, MAX_MINUTES - 1),
    mediumMinutes: Math.min(serverData?.mediumMinutes ?? 30, MAX_MINUTES),
  }), [serverData]);

  const [vals, setVals] = useState<{ urgentMinutes: number; highMinutes: number; mediumMinutes: number } | null>(null);

  // Sync from server when loaded for first time
  const effective = vals ?? server;

  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<Handle | null>(null);
  const isDirty = vals !== null;

  const getMinutes = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * MAX_MINUTES);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const raw = getMinutes(e.clientX);
    const handle = dragging.current;

    setVals((prev) => {
      const cur = prev ?? server;
      const u = cur.urgentMinutes;
      const h = cur.highMinutes;
      const m = cur.mediumMinutes;

      if (handle === "urgentMinutes") {
        return { ...cur, urgentMinutes: Math.min(Math.max(1, raw), h - MIN_GAP) };
      }
      if (handle === "highMinutes") {
        return { ...cur, highMinutes: Math.min(Math.max(u + MIN_GAP, raw), m - MIN_GAP) };
      }
      // mediumMinutes
      return { ...cur, mediumMinutes: Math.min(Math.max(h + MIN_GAP, raw), MAX_MINUTES) };
    });
  }, [getMinutes, server]);

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
    const toastId = toast.loading("Đang lưu cấu hình...");
    mutation.mutate(effective, {
      onSuccess: async () => {
        toast.dismiss(toastId);
        toast.success("Cập nhật thành công");
        setVals(null);
        await refetch();
      },
      onError: (err: any) => {
        toast.dismiss(toastId);
        toast.error(`Lỗi: ${err?.response?.data?.message ?? "Không xác định"}`);
      },
    });
  };

  const u = effective.urgentMinutes;
  const h = effective.highMinutes;
  const m = effective.mediumMinutes;

  const uPct = pct(u);
  const hPct = pct(h);
  const mPct = pct(m);

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
              Kéo từng điểm mốc trên thanh. Tối đa <strong>60 phút</strong>.
              Thứ tự luôn: Urgent &lt; High &lt; Medium.
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

        {/* ── Single unified slider track ── */}
        <div className="px-2 pt-2 pb-1 select-none">

          {/* Legend rows */}
          <div className="space-y-3 mb-8">
            {HANDLES.map((hd) => {
              const val = hd.key === "urgentMinutes" ? u : hd.key === "highMinutes" ? h : m;
              const { Icon } = hd;
              return (
                <div key={hd.key} className="flex items-center gap-3">
                  <div className="flex items-baseline gap-1.5 w-40 shrink-0">
                    <Icon size={14} weight={hd.iconWeight} className={hd.color} />
                    <span className={`text-sm font-bold tracking-tighter ${hd.color}`}>{hd.label}</span>
                    <span className="text-xs text-muted-foreground tracking-tighter">— {hd.sub}</span>
                  </div>
                  <span className={`text-sm font-bold tabular-nums tracking-tighter px-2.5 py-0.5 rounded-full border ${hd.badgeClass}`}>
                    {formatMinutes(val)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Track ── */}
          <div
            ref={trackRef}
            className="relative mx-2.5 cursor-crosshair"
            style={{ height: 48 }}
          >
            {/* Background rail */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-3 rounded-full bg-muted/60 overflow-hidden">
              {/* Zone Urgent: 0 → u */}
              <div
                className="absolute left-0 top-0 h-full bg-red-500 transition-all duration-75"
                style={{ width: `${uPct}%` }}
              />
              {/* Zone High: u → h */}
              <div
                className="absolute top-0 h-full bg-amber-400 transition-all duration-75"
                style={{ left: `${uPct}%`, width: `${hPct - uPct}%` }}
              />
              {/* Zone Medium: h → m */}
              <div
                className="absolute top-0 h-full bg-sky-400 transition-all duration-75"
                style={{ left: `${hPct}%`, width: `${mPct - hPct}%` }}
              />
            </div>

            {/* ── Handles (render in reverse so earlier ones stay on top) ── */}
            {[...HANDLES].reverse().map((hd, idx) => {
              const val = hd.key === "urgentMinutes" ? u : hd.key === "highMinutes" ? h : m;
              const p = pct(val);
              const { Icon } = hd;
              const zIndex = HANDLES.length - idx; // urgent=3, high=2, medium=1
              return (
                <div
                  key={hd.key}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${p}%`, zIndex, touchAction: "none" }}
                  onPointerDown={startDrag(hd.key)}
                >
                  {/* Thumb */}
                  <div
                    className={`w-7 h-7 rounded-full bg-white border-2 flex items-center justify-center cursor-grab active:cursor-grabbing transition-shadow duration-150 hover:shadow-lg ${hd.borderClass}`}
                    style={{ boxShadow: `0 0 0 3px ${hd.ringColor}` }}
                  >
                    <Icon size={11} weight={hd.iconWeight} className={hd.color} />
                  </div>

                  {/* Tooltip above thumb */}
                  <div
                    className={`absolute -top-8 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums tracking-tighter whitespace-nowrap border ${hd.badgeClass}`}
                  >
                    {val}p
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time axis */}
          <div className="flex justify-between mt-2 mx-2.5 text-[10px] tabular-nums tracking-tighter text-muted-foreground/55">
            {[0, 10, 20, 30, 40, 50, 60].map((t) => (
              <span key={t}>{t === 0 ? "0" : `${t}p`}</span>
            ))}
          </div>
        </div>

        {/* Meta */}
        {serverData?.updatedAt && (
          <p className="text-sm tracking-tighter text-muted-foreground/70">
            Cập nhật lần cuối:{" "}
            <strong className="text-foreground/80">
              {new Date(serverData.updatedAt).toLocaleString("vi-VN")}
            </strong>
            {/* {serverData.updatedBy && (
              <span> bởi <strong className="text-foreground/80">{serverData.updatedBy}</strong></span>
            )} */}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
