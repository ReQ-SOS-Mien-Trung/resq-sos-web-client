"use client";

import { useEffect, useRef } from "react";
import {
  useBroadcastAlertStore,
} from "@/stores/broadcast-alert.store";

const ALERT_TYPE_CONFIG: Record<
  string,
  { icon: string; bgClass: string; borderClass: string; label: string }
> = {
  FLOOD_WARNING: {
    icon: "🌊",
    bgClass: "bg-orange-50 dark:bg-orange-950/60",
    borderClass: "border-orange-500",
    label: "Cảnh báo lũ lụt",
  },
  FLOOD_EMERGENCY: {
    icon: "🚨",
    bgClass: "bg-red-50 dark:bg-red-950/60",
    borderClass: "border-red-600",
    label: "Khẩn cấp lũ lụt",
  },
  EVACUATION: {
    icon: "🏃",
    bgClass: "bg-red-50 dark:bg-red-950/60",
    borderClass: "border-red-600",
    label: "Lệnh sơ tán",
  },
};

const DEFAULT_CONFIG = {
  icon: "⚠️",
  bgClass: "bg-yellow-50 dark:bg-yellow-950/60",
  borderClass: "border-yellow-500",
  label: "Cảnh báo",
};

const AUTO_DISMISS_MS = 30_000; // auto-close after 30s

export function BroadcastAlertOverlay() {
  const activeAlert = useBroadcastAlertStore((s) => s.activeAlert);
  const dismissAlert = useBroadcastAlertStore((s) => s.dismissAlert);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss
  useEffect(() => {
    if (!activeAlert) return;

    timerRef.current = setTimeout(() => {
      dismissAlert();
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeAlert, dismissAlert]);

  if (!activeAlert) return null;

  const config =
    ALERT_TYPE_CONFIG[activeAlert.type] ?? DEFAULT_CONFIG;

  const sentDate = new Date(activeAlert.sentAt);
  const timeStr = sentDate.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = sentDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className={`
          relative mx-4 w-full max-w-lg rounded-2xl border-2 shadow-2xl
          ${config.bgClass} ${config.borderClass}
          animate-in zoom-in-95 slide-in-from-bottom-4 duration-300
        `}
      >
        {/* Pulse ring */}
        <div className="absolute -top-3 -right-3">
          <span className="relative flex h-6 w-6">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              !
            </span>
          </span>
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-4xl">{config.icon}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {config.label}
              </p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {activeAlert.title}
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="mb-5 rounded-lg bg-white/60 p-4 dark:bg-black/30">
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-200">
              {activeAlert.body}
            </p>
          </div>

          {/* Timestamp */}
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            🕐 {timeStr} — {dateStr}
          </p>

          {/* Dismiss button */}
          <button
            onClick={dismissAlert}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
