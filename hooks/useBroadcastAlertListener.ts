"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { notificationRealtimeClient } from "@/services/noti_alert/realtime";
import type { BroadcastAlertRealtimePayload } from "@/services/noti_alert/type";

/**
 * Show an OS-level browser notification.
 * Works when tab is focused, hidden, or minimized (as long as browser is open).
 */
function showOSNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    // Prefer ServiceWorker showNotification (works even when tab is hidden)
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: "/icons/logo.svg",
          badge: "/icons/logo.svg",
          tag: `broadcast-alert-${Date.now()}`,
          requireInteraction: true, // Stay visible until user interacts
          data: { url: "/" },
        } as NotificationOptions);
      });
    } else {
      // Fallback: native Notification constructor
      new Notification(title, {
        body,
        icon: "/icons/logo.svg",
        tag: `broadcast-alert-${Date.now()}`,
        requireInteraction: true,
      });
    }
  } catch (err) {
    console.warn("[RESQ Broadcast] Failed to show OS notification:", err);
  }
}

/**
 * Global hook: listens to SignalR `ReceiveBroadcastAlert` and:
 * 1. Shows an OS-level browser notification (visible even if tab is minimized)
 * 2. Triggers the in-app overlay alert via zustand store
 *
 * Must be called from a global provider (e.g. providers.tsx).
 */
export function useBroadcastAlertListener() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);

  const handleBroadcast = useCallback(
    (payload: BroadcastAlertRealtimePayload) => {
      const title = payload.title || "⚠️ Cảnh báo thiên tai";
      const body = payload.body || "";

      showOSNotification(title, body);
    },
    [],
  );

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const unsubscribe =
      notificationRealtimeClient.subscribeBroadcast(handleBroadcast);

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, accessToken, handleBroadcast]);
}
