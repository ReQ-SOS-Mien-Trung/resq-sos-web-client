import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { RefreshTokenResponse } from "@/services/auth/type";
import {
  BACKEND_CIRCUIT_OPEN_ERROR_CODE,
  getBackendCircuitBlockedUntil,
  isBackendCircuitOpen,
  isBackendConnectivityError,
  markBackendConnectionSuccess,
  openBackendCircuit,
} from "@/lib/backend-circuit";

const API_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Khởi tạo 1 Axios instance duy nhất cho toàn app
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---- Refresh Token Logic ----
// Quản lý trạng thái refresh token để tránh gọi nhiều lần cùng lúc
let isRefreshing = false;
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}[] = [];

/**
 * Xử lý hàng đợi các request bị 401 trước đó.
 * Sau khi refresh token thành công, retry tất cả request trong hàng đợi.
 * Nếu refresh thất bại, reject tất cả.
 */
function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

// ---- Request Interceptor ----
axiosInstance.interceptors.request.use(
  (config) => {
    const requestUrl = config.url ?? "";
    const isAuthEndpoint =
      requestUrl.includes("/auth/refresh-token") ||
      requestUrl.includes("/auth/login");

    if (!isAuthEndpoint && isBackendCircuitOpen()) {
      const blockedUntil = getBackendCircuitBlockedUntil();

      return Promise.reject(
        new AxiosError(
          blockedUntil
            ? `Backend connection is temporarily unavailable until ${new Date(blockedUntil).toISOString()}.`
            : "Backend connection is temporarily unavailable.",
          BACKEND_CIRCUIT_OPEN_ERROR_CODE,
          config,
        ),
      );
    }

    // Lấy token từ Zustand store
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ---- Response Interceptor (Auto Refresh Token) ----
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    markBackendConnectionSuccess();
    return response;
  },
  async (error) => {
    if (isBackendConnectivityError(error)) {
      if (error.code !== BACKEND_CIRCUIT_OPEN_ERROR_CODE) {
        openBackendCircuit(error);
      }
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Chỉ xử lý lỗi 401 (Unauthorized) và chưa retry
    // Bỏ qua nếu request là refresh-token hoặc login (tránh vòng lặp vô tận)
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/refresh-token") ||
      originalRequest?.url?.includes("/auth/login");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      // Nếu đang refresh token, xếp request vào hàng đợi
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest._retry = true;
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { accessToken, refreshToken, logout, updateTokens } =
        useAuthStore.getState();

      // Nếu không có refresh token, logout ngay
      if (!refreshToken || !accessToken) {
        isRefreshing = false;
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
        return Promise.reject(error);
      }

      try {
        // Loại bỏ slash ở cuối nếu có để tránh // trong URL
        const secureApiUrl = API_URL?.replace(/\/+$/, "") || "";

        // Gọi API refresh token (dùng axios thường, không dùng axiosInstance để tránh lặp interceptor)
        const { data } = await axios.post<RefreshTokenResponse>(
          `${secureApiUrl}/identity/auth/refresh-token`,
          { accessToken, refreshToken },
          {
            headers: { "Content-Type": "application/json" },
          },
        );

        // Cập nhật token mới vào store
        updateTokens(data);

        // Xử lý tất cả request trong hàng đợi với token mới
        processQueue(null, data.accessToken);

        // Retry request ban đầu với token mới
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        if (isBackendConnectivityError(refreshError)) {
          openBackendCircuit(refreshError);
          return Promise.reject(refreshError);
        }

        // Refresh thất bại → logout và redirect
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
