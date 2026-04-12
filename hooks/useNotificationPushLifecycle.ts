"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import {
  registerFcmToken,
  unregisterFcmToken,
} from "@/services/noti_alert/api";
import { resolveNotificationRoute } from "@/services/noti_alert/navigation";
import {
  clearStoredFcmRegistration,
  ensureNotificationServiceWorker,
  getBrowserFcmToken,
  getFirebaseMessagingForForeground,
  getStoredFcmRegistration,
  isFcmRegistrationAbortError,
  resetNotificationServiceWorker,
  requestNotificationPermissionIfNeeded,
  setStoredFcmRegistration,
  shouldEnableNotificationPush,
  isWebPushSupported,
} from "@/services/noti_alert/push";

function navigateToUrl(url: string) {
  if (typeof window === "undefined" || !url) {
    return;
  }

  if (window.location.href === url) {
    return;
  }

  window.location.assign(url);
}

export function useNotificationPushLifecycle() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.userId ?? null);
  const roleId = useAuthStore((state) => state.user?.roleId);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    function handleServiceWorkerMessage(event: MessageEvent) {
      const payload =
        typeof event.data === "object" && event.data
          ? (event.data as { type?: unknown; url?: unknown })
          : null;

      if (payload?.type !== "OPEN_URL" || typeof payload.url !== "string") {
        return;
      }

      navigateToUrl(payload.url);
    }

    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage,
      );
    };
  }, []);

  // ── 1. Register FCM token with backend ──
  useEffect(() => {
    let cancelled = false;

    async function syncPushToken() {
      if (!isAuthenticated || !accessToken) {
        clearStoredFcmRegistration();
        return;
      }

      if (!shouldEnableNotificationPush(roleId)) return;
      if (!isWebPushSupported()) return;

      const permission = await requestNotificationPermissionIfNeeded();
      if (permission !== "granted") return;

      const registration = await ensureNotificationServiceWorker();
      if (!registration || cancelled) return;

      let latestToken: string | null;

      try {
        latestToken = await getBrowserFcmToken(registration);
      } catch (error) {
        if (!isFcmRegistrationAbortError(error)) throw error;

        const recovered = await resetNotificationServiceWorker();
        if (!recovered || cancelled) throw error;
        latestToken = await getBrowserFcmToken(recovered);
      }

      if (!latestToken || cancelled) return;

      const stored = getStoredFcmRegistration();
      if (stored?.userId === userId && stored?.token === latestToken) return;

      if (stored?.token) {
        await unregisterFcmToken(stored.token).catch(() => null);
      }

      await registerFcmToken({ token: latestToken });

      if (cancelled) return;

      setStoredFcmRegistration({ token: latestToken, userId });
    }

    void syncPushToken().catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated, roleId, userId]);

  // ── 2. Firebase onMessage() — show OS notification when tab is active ──
  useEffect(() => {
    if (!isAuthenticated || !shouldEnableNotificationPush(roleId)) return;

    let unsubscribe: (() => void) | null = null;

    async function setup() {
      const messaging = await getFirebaseMessagingForForeground();
      if (!messaging) return;

      const { onMessage } = await import("firebase/messaging");

      unsubscribe = onMessage(messaging, (payload) => {
        const data = payload.data as Record<string, string> | undefined;
        const isBroadcastAlert = data?.type === "broadcast_alert";

        // broadcast_alert is handled by SignalR (useBroadcastAlertListener) when
        // web is open — it plays sound + shows overlay. Skip here to avoid doubles.
        if (isBroadcastAlert) return;

        // ── Normal per-user notification ────────────────────────────────────
        if (Notification.permission !== "granted") return;

        const notification =
          payload.notification ??
          (payload.data as Record<string, string> | undefined);
        const title = notification?.title ?? "Thông báo mới từ RESQ";
        const body =
          (notification as Record<string, string> | undefined)?.body ?? "";
        const targetUrl = resolveNotificationRoute(
          data?.type ?? "",
          roleId,
          data,
        );

        navigator.serviceWorker?.ready
          .then((reg) =>
            reg.showNotification(title, {
              body: body || undefined,
              icon: "/icons/logo-192.png",
              badge: "/icons/logo-192.png",
              tag: `fcm-${Date.now()}`,
              requireInteraction: false,
              data: { url: targetUrl },
            } as NotificationOptions),
          )
          .catch(() => {
            try {
              const browserNotification = new Notification(title, {
                body: body || undefined,
                icon: "/icons/logo-192.png",
                data: { url: targetUrl },
              });
              browserNotification.onclick = () => {
                window.focus();
                navigateToUrl(targetUrl);
                browserNotification.close();
              };
            } catch {
              // ignore
            }
          });
      });
    }

    void setup().catch(() => null);

    return () => {
      unsubscribe?.();
    };
  }, [isAuthenticated, roleId]);
}
