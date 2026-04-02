"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import {
  registerFcmToken,
  unregisterFcmToken,
} from "@/services/noti_alert/api";
import {
  clearStoredFcmRegistration,
  ensureNotificationServiceWorker,
  getBrowserFcmToken,
  getStoredFcmRegistration,
  isFcmRegistrationAbortError,
  resetNotificationServiceWorker,
  requestNotificationPermissionIfNeeded,
  setStoredFcmRegistration,
  shouldEnableNotificationPush,
  isWebPushSupported,
} from "@/services/noti_alert/push";

export function useNotificationPushLifecycle() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.userId ?? null);
  const roleId = useAuthStore((state) => state.user?.roleId);

  useEffect(() => {
    let cancelled = false;

    async function syncPushToken() {
      if (!isAuthenticated || !accessToken) {
        clearStoredFcmRegistration();
        return;
      }

      if (!shouldEnableNotificationPush(roleId)) {
        return;
      }

      if (!isWebPushSupported()) {
        return;
      }

      const permission = await requestNotificationPermissionIfNeeded();
      if (permission !== "granted") {
        return;
      }

      const registration = await ensureNotificationServiceWorker();
      if (!registration || cancelled) {
        return;
      }

      let latestToken: string | null;

      try {
        latestToken = await getBrowserFcmToken(registration);
      } catch (error) {
        if (!isFcmRegistrationAbortError(error)) {
          throw error;
        }

        console.warn(
          "FCM token registration aborted. Resetting notification service worker and retrying once.",
        );

        const recoveredRegistration = await resetNotificationServiceWorker();
        if (!recoveredRegistration || cancelled) {
          throw error;
        }

        latestToken = await getBrowserFcmToken(recoveredRegistration);
      }

      if (!latestToken || cancelled) {
        return;
      }

      const stored = getStoredFcmRegistration();

      const isSameUser = stored?.userId === userId;
      const isSameToken = stored?.token === latestToken;
      if (isSameUser && isSameToken) {
        return;
      }

      if (stored?.token) {
        await unregisterFcmToken(stored.token).catch(() => null);
      }

      await registerFcmToken({ token: latestToken });

      if (cancelled) {
        return;
      }

      setStoredFcmRegistration({
        token: latestToken,
        userId,
      });
    }

    void syncPushToken().catch((error) => {
      console.error("Failed to sync FCM token:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated, roleId, userId]);
}
