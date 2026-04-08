"use client";

import { useEffect, useRef } from "react";
import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { RefreshTokenResponse } from "@/services/auth/type";

const API_URL = process.env.NEXT_PUBLIC_BASE_URL;

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

  useEffect(() => {
    const interval = setInterval(async () => {
      // Đọc state mới nhất mỗi tick — tránh stale closure
      const {
        isAuthenticated,
        accessToken,
        refreshToken,
        expiresIn,
        tokenObtainedAt,
        updateTokens,
        logout,
      } = useAuthStore.getState();

      if (!isAuthenticated || !accessToken || !refreshToken) return;
      if (isRefreshingRef.current) return;

      // Tính thời gian còn lại
      const expirySeconds = expiresIn ?? 3600;
      const obtainedAt = tokenObtainedAt ?? Date.now();
      const elapsedSeconds = (Date.now() - obtainedAt) / 1000;
      const remainingSeconds = expirySeconds - elapsedSeconds;

      // Chưa đến lúc refresh
      if (remainingSeconds > REFRESH_BUFFER_SECONDS) return;

      // Token đã hết hạn quá lâu (> 2x lifetime) — không cố refresh nữa
      if (remainingSeconds < -expirySeconds) {
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
        return;
      }

      isRefreshingRef.current = true;

      try {
        const secureApiUrl = API_URL?.replace(/\/+$/, "") ?? "";
        const { data } = await axios.post<RefreshTokenResponse>(
          `${secureApiUrl}/identity/auth/refresh-token`,
          { accessToken, refreshToken },
          { headers: { "Content-Type": "application/json" } },
        );

        // Chỉ cập nhật nếu token chưa bị thay bởi 401 interceptor
        const current = useAuthStore.getState();
        if (current.accessToken === accessToken) {
          updateTokens(data);
        }
      } catch {
        // Refresh thất bại → logout
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
      } finally {
        isRefreshingRef.current = false;
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Refresh ngay khi tab được focus lại (phòng trường hợp bị ẩn lâu)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;

      const {
        isAuthenticated,
        accessToken,
        refreshToken,
        expiresIn,
        tokenObtainedAt,
        updateTokens,
        logout,
      } = useAuthStore.getState();

      if (!isAuthenticated || !accessToken || !refreshToken) return;
      if (isRefreshingRef.current) return;

      const expirySeconds = expiresIn ?? 3600;
      const obtainedAt = tokenObtainedAt ?? Date.now();
      const elapsedSeconds = (Date.now() - obtainedAt) / 1000;
      const remainingSeconds = expirySeconds - elapsedSeconds;

      if (remainingSeconds > REFRESH_BUFFER_SECONDS) return;

      isRefreshingRef.current = true;

      const secureApiUrl = API_URL?.replace(/\/+$/, "") ?? "";
      axios
        .post<RefreshTokenResponse>(
          `${secureApiUrl}/identity/auth/refresh-token`,
          { accessToken, refreshToken },
          { headers: { "Content-Type": "application/json" } },
        )
        .then(({ data }) => {
          const current = useAuthStore.getState();
          if (current.accessToken === accessToken) {
            updateTokens(data);
          }
        })
        .catch(() => {
          logout();
          if (typeof window !== "undefined") {
            window.location.href = "/sign-in";
          }
        })
        .finally(() => {
          isRefreshingRef.current = false;
        });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);
}
