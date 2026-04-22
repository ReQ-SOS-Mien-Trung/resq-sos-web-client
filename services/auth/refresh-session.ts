import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { RefreshTokenResponse } from "./type";

const API_URL = process.env.NEXT_PUBLIC_BASE_URL;
export const AUTH_REFRESH_BUFFER_SECONDS = 300;

let refreshPromise: Promise<RefreshTokenResponse> | null = null;

function getRefreshEndpoint(): string {
  const secureApiUrl = API_URL?.replace(/\/+$/, "") ?? "";
  return `${secureApiUrl}/identity/auth/refresh-token`;
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const [, payload] = token.split(".");
  if (!payload || typeof atob !== "function") {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );

    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

export function getAccessTokenRemainingSeconds(): number | null {
  const { accessToken, expiresIn, tokenObtainedAt } = useAuthStore.getState();

  if (!accessToken) {
    return null;
  }

  const jwtExpiry = decodeJwtPayload(accessToken)?.exp;
  if (typeof jwtExpiry === "number") {
    return jwtExpiry - Date.now() / 1000;
  }

  const expirySeconds = expiresIn ?? 3600;
  const obtainedAt = tokenObtainedAt ?? Date.now();
  const elapsedSeconds = (Date.now() - obtainedAt) / 1000;

  return expirySeconds - elapsedSeconds;
}

export function shouldRefreshSessionTokens(
  bufferSeconds = AUTH_REFRESH_BUFFER_SECONDS,
): boolean {
  const { isAuthenticated, accessToken, refreshToken } =
    useAuthStore.getState();

  if (!isAuthenticated || !accessToken || !refreshToken) {
    return false;
  }

  const remainingSeconds = getAccessTokenRemainingSeconds();

  return remainingSeconds !== null && remainingSeconds <= bufferSeconds;
}

export async function refreshSessionTokens(): Promise<RefreshTokenResponse> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const { accessToken, refreshToken } = useAuthStore.getState();

  if (!accessToken || !refreshToken) {
    throw new Error("Missing auth tokens for refresh.");
  }

  refreshPromise = axios
    .post<RefreshTokenResponse>(
      getRefreshEndpoint(),
      { accessToken, refreshToken },
      {
        headers: { "Content-Type": "application/json" },
      },
    )
    .then(({ data }) => {
      const currentState = useAuthStore.getState();

      // Do not restore a session that the user already cleared manually.
      if (
        currentState.isAuthenticated &&
        currentState.accessToken === accessToken &&
        currentState.refreshToken === refreshToken
      ) {
        currentState.updateTokens(data);
      }

      return data;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}
