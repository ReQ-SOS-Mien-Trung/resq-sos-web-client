import api from "@/config/axios";
import { UserMeResponse, GetUsersParams, GetUsersResponse, BanUserRequest } from "./type";

export async function getUserMe(): Promise<UserMeResponse> {
  const { data } = await api.get("/identity/user/me");
  return data;
}

export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<any> {
  const { data } = await api.put(`/identity/admin/users/${userId}/avatar`, { avatarUrl });
  return data;
}

export async function getAdminUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
  const { data } = await api.get("/identity/admin/users", { params });
  return data;
}

export async function banUser(userId: string, data: BanUserRequest): Promise<void> {
  await api.post(`/identity/admin/users/${userId}/ban`, data);
}

export async function unbanUser(userId: string): Promise<void> {
  await api.post(`/identity/admin/users/${userId}/unban`);
}

export async function adminCreateUser(data: import("./type").AdminCreateUserRequest): Promise<any> {
  const response = await api.post("/identity/admin/users", data);
  return response.data;
}
