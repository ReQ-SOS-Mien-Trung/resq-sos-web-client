import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { googleLogin, login, logout, refreshToken } from "./api";
import {
  GoogleLoginPayload,
  LoginHookOptions,
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  RefreshTokenPayload,
  RefreshTokenResponse,
} from "./type";
import { useAuthStore } from "@/stores/auth.store";

export const LOGIN_MUTATION_KEY = ["auth", "login"] as const;
export const GOOGLE_LOGIN_MUTATION_KEY = ["auth", "google-login"] as const;
export const LOGOUT_MUTATION_KEY = ["auth", "logout"] as const;
export const REFRESH_TOKEN_MUTATION_KEY = ["auth", "refresh-token"] as const;

// Helper function to handle role-based redirect
function getRedirectPathByRole(roleId: number): string | null {
  switch (roleId) {
    case 1:
      return "/dashboard/admin";
    case 2:
      return "/dashboard/coordinator";
    case 4:
      return "/dashboard/inventory";
    default:
      return null; // Role not allowed
  }
}

export function useLogin(options?: LoginHookOptions) {
  const router = useRouter();
  const { setAuth, logout: clearAuth } = useAuthStore();

  return useMutation<LoginResponse, Error, LoginPayload>({
    mutationKey: LOGIN_MUTATION_KEY,
    mutationFn: login,
    onSuccess: (data) => {
      // Save auth data to store
      setAuth(data);

      // Get redirect path based on role
      const redirectPath = getRedirectPathByRole(data.roleId);

      if (redirectPath) {
        // Custom onSuccess or default redirect
        if (options?.onSuccess) {
          options.onSuccess(data);
        } else {
          router.push(redirectPath);
        }
      } else {
        // Role not allowed - clear auth and call callback
        clearAuth();
        options?.onUnauthorizedRole?.();
      }
    },
    onError: (error) => {
      if (options?.onError) {
        options.onError(error);
      } else {
        console.error("Login error:", error);
      }
    },
  });
}

export function useGoogleLogin(options?: LoginHookOptions) {
  const router = useRouter();
  const { setAuth, logout: clearAuth } = useAuthStore();

  return useMutation<LoginResponse, Error, GoogleLoginPayload>({
    mutationKey: GOOGLE_LOGIN_MUTATION_KEY,
    mutationFn: googleLogin,
    onSuccess: (data) => {
      // Save auth data to store
      setAuth(data);

      // Get redirect path based on role
      const redirectPath = getRedirectPathByRole(data.roleId);

      if (redirectPath) {
        // Custom onSuccess or default redirect
        if (options?.onSuccess) {
          options.onSuccess(data);
        } else {
          router.push(redirectPath);
        }
      } else {
        // Role not allowed - clear auth and call callback
        clearAuth();
        options?.onUnauthorizedRole?.();
      }
    },
    onError: (error) => {
      if (options?.onError) {
        options.onError(error);
      } else {
        console.error("Google login error:", error);
      }
    },
  });
}

export function useLogout() {
  const { logout: clearAuth } = useAuthStore();
  const router = useRouter();

  return useMutation<LogoutResponse, Error, void>({
    mutationKey: LOGOUT_MUTATION_KEY,
    mutationFn: logout,
    onSuccess: () => {
      clearAuth();
      router.push("/sign-in");
    },
    onError: (error) => {
      // Even on error, clear local auth state
      clearAuth();
      console.error("Logout error:", error);
    },
  });
}

export function useRefreshToken() {
  const { updateTokens, logout: clearAuth } = useAuthStore();
  const router = useRouter();

  return useMutation<RefreshTokenResponse, Error, RefreshTokenPayload>({
    mutationKey: REFRESH_TOKEN_MUTATION_KEY,
    mutationFn: refreshToken,
    onSuccess: (data) => {
      // Cập nhật token mới vào store
      updateTokens(data);
      console.log("Token refreshed successfully");
    },
    onError: (error) => {
      // Refresh thất bại → logout và redirect về trang đăng nhập
      clearAuth();
      router.push("/sign-in");
      console.error("Refresh token error:", error);
    },
  });
}
