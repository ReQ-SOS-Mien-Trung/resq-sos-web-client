import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/stores/auth.store";
import {
  refreshSessionTokens,
  shouldRefreshSessionTokens,
} from "@/services/auth/refresh-session";
import {
  BACKEND_CIRCUIT_OPEN_ERROR_CODE,
  getBackendCircuitBlockedUntil,
  isBackendCircuitOpen,
  isBackendConnectivityError,
  markBackendConnectionSuccess,
  openBackendCircuit,
} from "@/lib/backend-circuit";

const API_URL = process.env.NEXT_PUBLIC_BASE_URL;
const DEPOT_MANAGER_NOT_ASSIGNED_ERROR_CODE = "DEPOT_MANAGER_NOT_ASSIGNED";
const DEPOT_MANAGER_NOT_ASSIGNED_REDIRECT_PATH =
  "/depot-manager-not-assigned";

// Khởi tạo 1 Axios instance duy nhất cho toàn app
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

function getAuthorizationHeader(
  headers: InternalAxiosRequestConfig["headers"] | undefined,
): string | null {
  if (!headers) {
    return null;
  }

  const maybeHeaderGetter = headers as { get?: (name: string) => unknown };
  if (typeof maybeHeaderGetter.get === "function") {
    const value = maybeHeaderGetter.get("Authorization");
    return typeof value === "string" ? value : null;
  }

  const record = headers as Record<string, unknown>;
  const value = record.Authorization ?? record.authorization;

  return typeof value === "string" ? value : null;
}

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function setAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  token: string,
): void {
  if (!config.headers) {
    return;
  }

  const maybeHeaderSetter = config.headers as {
    set?: (name: string, value: string) => void;
  };

  if (typeof maybeHeaderSetter.set === "function") {
    maybeHeaderSetter.set("Authorization", `Bearer ${token}`);
    return;
  }

  config.headers.Authorization = `Bearer ${token}`;
}

async function rehydratePersistedAuth(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  await useAuthStore.persist.rehydrate();
}

// ---- Request Interceptor ----
axiosInstance.interceptors.request.use(
  async (config) => {
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

    if (!isAuthEndpoint && shouldRefreshSessionTokens()) {
      try {
        await refreshSessionTokens();
      } catch (refreshError) {
        if (isBackendConnectivityError(refreshError)) {
          openBackendCircuit(refreshError);
        }
      }
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
    const backendErrorCode = error.response?.data?.code;

    if (
      error.response?.status === 403 &&
      backendErrorCode === DEPOT_MANAGER_NOT_ASSIGNED_ERROR_CODE
    ) {
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;

        if (currentPath !== DEPOT_MANAGER_NOT_ASSIGNED_REDIRECT_PATH) {
          window.location.replace(DEPOT_MANAGER_NOT_ASSIGNED_REDIRECT_PATH);
        }
      }

      return Promise.reject(error);
    }

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
      originalRequest._retry = true;

      const failedAccessToken = getBearerToken(
        getAuthorizationHeader(originalRequest.headers),
      );
      let { accessToken, refreshToken, logout } = useAuthStore.getState();

      if (
        accessToken &&
        failedAccessToken &&
        failedAccessToken !== accessToken
      ) {
        setAuthorizationHeader(originalRequest, accessToken);
        return axiosInstance(originalRequest);
      }

      // Nếu không có refresh token, logout ngay
      if (!refreshToken || !accessToken) {
        await rehydratePersistedAuth();
        ({ accessToken, refreshToken, logout } = useAuthStore.getState());

        if (accessToken && refreshToken) {
          setAuthorizationHeader(originalRequest, accessToken);
          return axiosInstance(originalRequest);
        }

        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
        return Promise.reject(error);
      }

      try {
        const data = await refreshSessionTokens();

        // Retry request ban đầu với token mới
        setAuthorizationHeader(originalRequest, data.accessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        if (isBackendConnectivityError(refreshError)) {
          openBackendCircuit(refreshError);
          return Promise.reject(refreshError);
        }

        await rehydratePersistedAuth();

        const latestState = useAuthStore.getState();
        if (
          latestState.isAuthenticated &&
          latestState.accessToken &&
          latestState.refreshToken &&
          (latestState.accessToken !== accessToken ||
            latestState.refreshToken !== refreshToken)
        ) {
          setAuthorizationHeader(originalRequest, latestState.accessToken);
          return axiosInstance(originalRequest);
        }

        // Refresh thất bại → logout và redirect
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
