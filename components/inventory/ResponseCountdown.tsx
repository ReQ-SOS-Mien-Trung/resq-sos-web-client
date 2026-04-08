"use client";

import { useState, useEffect, useCallback } from "react";
import { Timer, Warning, Hourglass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCountdown(deadline: string | null | undefined): {
  seconds: number;
  expired: boolean;
  label: string;
} {
  const calcSeconds = useCallback(() => {
    if (!deadline) return 0;
    return Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
  }, [deadline]);

  const [seconds, setSeconds] = useState(calcSeconds);

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => {
      const s = calcSeconds();
      setSeconds(s);
      if (s === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, calcSeconds]);

  const expired = seconds === 0 && !!deadline;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const label =
    h > 0
      ? `${h}g ${String(m).padStart(2, "0")}p ${String(s).padStart(2, "0")}s`
      : m > 0
        ? `${m}p ${String(s).padStart(2, "0")}s`
        : `${s}s`;

  return { seconds, expired, label };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ResponseCountdown({
  deadline,
}: {
  deadline: string | null | undefined;
}) {
  const { expired, label, seconds } = useCountdown(deadline);

  if (!deadline) return null;

  const isUrgent = !expired && seconds < 300;   // < 5 min
  const isWarning = !expired && seconds < 900;  // < 15 min

  if (expired) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-red-400 bg-red-500 px-2.5 py-1 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
        <Warning size={13} weight="fill" className="text-white shrink-0" />
        <span className="text-xs font-bold tracking-tighter text-white">
          Hết thời gian
        </span>
      </div>
    );
  }

  if (isUrgent) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1",
        "shadow-[0_0_0_2px_rgba(239,68,68,0.15)] animate-pulse",
      )}>
        <Hourglass size={13} weight="fill" className="text-red-600 shrink-0" />
        <span className="text-xs font-bold tracking-tighter tabular-nums text-red-700">
          {label}
        </span>
      </div>
    );
  }

  if (isWarning) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 shadow-[0_0_0_2px_rgba(251,191,36,0.15)]">
        <Timer size={13} weight="fill" className="text-amber-600 shrink-0" />
        <span className="text-xs font-bold tracking-tighter tabular-nums text-amber-700">
          {label}
        </span>
      </div>
    );
  }

  // Normal – còn nhiều thời gian
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1">
      <Timer size={13} weight="fill" className="text-sky-500 shrink-0" />
      <span className="text-xs font-semibold tracking-tighter tabular-nums text-sky-700">
        {label}
      </span>
    </div>
  );
}
