import api from "@/config/axios";
import { LoginPayload, LoginResponse, LogoutResponse } from "./type";

export async function login(body: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post("/api/auth/login", body);
  return data;
}

export async function logout(): Promise<LogoutResponse> {
  const { data } = await api.post("/api/auth/logout");
  return data;
}
