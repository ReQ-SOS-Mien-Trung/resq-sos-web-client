import api from "@/config/axios";
import {
  GoogleLoginPayload,
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  RefreshTokenPayload,
  RefreshTokenResponse,
} from "./type";

export async function login(body: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post("/identity/auth/login", body);
  return data;
}

export async function googleLogin(
  body: GoogleLoginPayload,
): Promise<LoginResponse> {
  const { data } = await api.post("/identity/auth/google-login", body);
  return data;
}

export async function logout(): Promise<LogoutResponse> {
  const { data } = await api.post("/identity/auth/logout");
  return data;
}

export async function refreshToken(
  body: RefreshTokenPayload,
): Promise<RefreshTokenResponse> {
  const { data } = await api.post("/identity/auth/refresh-token", body);
  return data;
}
