import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { LoginResponse, RefreshTokenResponse } from "@/services/auth/type";

interface User {
  userId: string;
  username: string;
  fullName: string;
  roleId: number;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string | null;
  tokenObtainedAt: number | null;
  user: User | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (data: LoginResponse) => void;
  updateTokens: (data: RefreshTokenResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        accessToken: null,
        refreshToken: null,
        expiresIn: null,
        tokenType: null,
        tokenObtainedAt: null,
        user: null,
        isAuthenticated: false,

        setAuth: (data: LoginResponse) =>
          set(
            {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              expiresIn: data.expiresIn,
              tokenType: data.tokenType,
              tokenObtainedAt: Date.now(),
              user: {
                userId: data.userId,
                username: data.username,
                fullName: data.fullName,
                roleId: data.roleId,
              },
              isAuthenticated: true,
            },
            false,
            "auth/setAuth", // Action name hiển thị trong Redux DevTools
          ),

        updateTokens: (data: RefreshTokenResponse) =>
          set(
            {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              expiresIn: data.expiresIn,
              tokenType: data.tokenType,
              tokenObtainedAt: Date.now(),
            },
            false,
            "auth/updateTokens",
          ),

        logout: () =>
          set(
            {
              accessToken: null,
              refreshToken: null,
              expiresIn: null,
              tokenType: null,
              tokenObtainedAt: null,
              user: null,
              isAuthenticated: false,
            },
            false,
            "auth/logout", // Action name hiển thị trong Redux DevTools
          ),
      }),
      {
        name: "auth-storage", // key trong localStorage
      },
    ),
    { name: "AuthStore" },
  ),
);
