import { useMutation } from "@tanstack/react-query";
import { login, logout } from "./api";
import { LoginPayload, LoginResponse, LogoutResponse } from "./type";

export const LOGIN_MUTATION_KEY = ["auth", "login"] as const;
export const LOGOUT_MUTATION_KEY = ["auth", "logout"] as const;

export function useLogin() {
  return useMutation<LoginResponse, Error, LoginPayload>({
    mutationKey: LOGIN_MUTATION_KEY,
    mutationFn: login,
  });
}

export function useLogout() {
  return useMutation<LogoutResponse, Error, void>({
    mutationKey: LOGOUT_MUTATION_KEY,
    mutationFn: logout,
  });
}
