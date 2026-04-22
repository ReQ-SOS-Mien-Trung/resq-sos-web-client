"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { isBackendConnectivityError } from "@/lib/backend-circuit";
import {
  AUTH_REFRESH_BUFFER_SECONDS,
  refreshSessionTokens,
  shouldRefreshSessionTokens,
} from "@/services/auth/refresh-session";

// Kiểm tra mỗi 30 giây
const CHECK_INTERVAL_MS = 30_000;
const AUTH_STORAGE_KEY = "auth-storage";

/**
 * Proactive token refresh hook.
 *
 * Thay vì tạo một setTimeout dài 50 phút (bị browser throttle khi tab ẩn),
 * hook này chạy interval ngắn (30s) để kiểm tra xem token sắp hết hạn chưa.
 *
 * Mỗi tick đọc trực tiếp từ Zustand store (không bị stale closure)
 * → đảm bảo luôn dùng đúng token mới nhất.
 *
 * Cũng hoạt động đúng sau page refresh nhờ `tokenObtainedAt` được persist.
 */
export function useTokenRefresh() {
  const isRefreshingRef = useRef(false);

  const rehydratePersistedAuth = useEffectEvent(async () => {
    if (typeof window === "undefined") {
      return;
    }

    await useAuthStore.persist.rehydrate();
  });

  const logoutAndRedirect = useEffectEvent(() => {
    const { logout } = useAuthStore.getState();
    logout();

    if (typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
  });

  const refreshIfNeeded = useEffectEvent(async () => {
    const {
      isAuthenticated,
      accessToken,
      refreshToken,
    } = useAuthStore.getState();

    if (!isAuthenticated || !accessToken || !refreshToken) return;
    if (isRefreshingRef.current) return;

    if (!shouldRefreshSessionTokens(AUTH_REFRESH_BUFFER_SECONDS)) return;

    isRefreshingRef.current = true;

    try {
      await refreshSessionTokens();
    } catch (error) {
      if (isBackendConnectivityError(error)) {
        return;
      }

      await rehydratePersistedAuth();

      const currentState = useAuthStore.getState();
      if (!currentState.isAuthenticated) {
        return;
      }

      if (
        currentState.accessToken !== accessToken ||
        currentState.refreshToken !== refreshToken
      ) {
        return;
      }

      logoutAndRedirect();
    } finally {
      isRefreshingRef.current = false;
    }
  });

  useEffect(() => {
    void refreshIfNeeded();

    const interval = setInterval(() => {
      void refreshIfNeeded();
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Refresh ngay khi tab được focus lại (phòng trường hợp bị ẩn lâu)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;

      void (async () => {
        await rehydratePersistedAuth();
        await refreshIfNeeded();
      })();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Đồng bộ token khi tab khác refresh/login/logout cùng một user.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_STORAGE_KEY) return;

      void (async () => {
        await rehydratePersistedAuth();
        await refreshIfNeeded();
      })();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);
}
