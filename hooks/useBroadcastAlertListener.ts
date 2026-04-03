"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useBroadcastAlertStore } from "@/stores/broadcast-alert.store";
import { notificationRealtimeClient } from "@/services/noti_alert/realtime";
import type { BroadcastAlertRealtimePayload } from "@/services/noti_alert/type";

/**
 * Global hook: listens to SignalR `ReceiveBroadcastAlert` and:
 * 1. Plays alert sound
 * 2. Triggers the in-app overlay alert via zustand store
 *
 * NOTE: OS-level notifications are handled exclusively by FCM (firebase-messaging-sw.js).
 * Do NOT call showNotification here to avoid duplicates when backend sends both FCM + SignalR.
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

      // Play alert sound (SignalR fires reliably when web is open)
      try {
        const audio = new Audio("/sounds/alert.mp3");
        audio.volume = 0.85;
        void audio.play().catch(() => null);
      } catch {
        // ignore
      }

      // Show in-app overlay
      useBroadcastAlertStore.getState().showAlert({
        id: Date.now(),
        title,
        type: payload.type || "broadcast_alert",
        body,
        sentAt: payload.sentAt ?? new Date().toISOString(),
      });
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
