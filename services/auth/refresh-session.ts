import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { RefreshTokenResponse } from "./type";

const API_URL = process.env.NEXT_PUBLIC_BASE_URL;

let refreshPromise: Promise<RefreshTokenResponse> | null = null;

function getRefreshEndpoint(): string {
  const secureApiUrl = API_URL?.replace(/\/+$/, "") ?? "";
  return `${secureApiUrl}/identity/auth/refresh-token`;
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
