import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { LoginResponse, RefreshTokenResponse } from "@/services/auth/type";

interface User {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roleId: number;
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string | null;
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
        user: null,
        isAuthenticated: false,

        setAuth: (data: LoginResponse) =>
          set(
            {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              expiresIn: data.expiresIn,
              tokenType: data.tokenType,
              user: {
                userId: data.userId,
                username: data.username,
                firstName: data.firstName,
                lastName: data.lastName,
                fullName: data.fullName,
                roleId: data.roleId,
                permissions: data.permissions ?? [],
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
