"use client";

import { useEffect, useState } from "react";
import { X, Download, Bell } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "resq:pwa-install-dismissed";

export function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const isStandalone =
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    // Already dismissed or running as installed PWA
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      // Re-check: user may have dismissed after the effect ran
      if (localStorage.getItem(DISMISSED_KEY)) return;
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setShowBanner(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isStandalone]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowBanner(false);
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
  }

  if (isStandalone || !showBanner) return null;

  return (
    <div className="fixed top-4 left-1/2 z-9999 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-blue-200 bg-white shadow-2xl dark:border-blue-800 dark:bg-gray-900">
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
          <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold tracking-tighter text-gray-900 dark:text-gray-100">
            Nhận thông báo khi không mở Chrome
          </p>
          <p className="mt-0.5 text-sm tracking-tighter text-dark dark:text-gray-400">
            Cài ResQ SOS như một app để nhận cảnh báo lũ ngay cả khi Chrome đang đóng.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={install}
              className="flex items-center tracking-tighter gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              <Download className="h-3.5 w-3.5" />
              Cài đặt app
            </button>
            <button
              onClick={dismiss}
              className="rounded-lg border tracking-tighter px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Để sau
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
