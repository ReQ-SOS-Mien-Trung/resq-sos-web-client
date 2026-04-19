"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { isBackendConnectivityError } from "@/lib/backend-circuit";
import { refreshSessionTokens } from "@/services/auth/refresh-session";

// Buffer trước khi hết hạn: 5 phút (giây)
const REFRESH_BUFFER_SECONDS = 300;
// Kiểm tra mỗi 30 giây
const CHECK_INTERVAL_MS = 30_000;

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
      expiresIn,
      tokenObtainedAt,
    } = useAuthStore.getState();

    if (!isAuthenticated || !accessToken || !refreshToken) return;
    if (isRefreshingRef.current) return;

    const expirySeconds = expiresIn ?? 3600;
    const obtainedAt = tokenObtainedAt ?? Date.now();
    const elapsedSeconds = (Date.now() - obtainedAt) / 1000;
    const remainingSeconds = expirySeconds - elapsedSeconds;

    if (remainingSeconds > REFRESH_BUFFER_SECONDS) return;

    isRefreshingRef.current = true;

    try {
      await refreshSessionTokens();
    } catch (error) {
      if (isBackendConnectivityError(error)) {
        return;
      }

      const currentState = useAuthStore.getState();
      if (!currentState.isAuthenticated) {
        return;
      }

      logoutAndRedirect();
    } finally {
      isRefreshingRef.current = false;
    }
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      await refreshIfNeeded();
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Refresh ngay khi tab được focus lại (phòng trường hợp bị ẩn lâu)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;

      void refreshIfNeeded();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);
}
