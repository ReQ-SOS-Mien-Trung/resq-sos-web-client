import api from "@/config/axios";
import { UserMeResponse } from "./type";

export async function getUserMe(): Promise<UserMeResponse> {
  const { data } = await api.get("/identity/user/me");
  return data;
}

export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<any> {
  const { data } = await api.put(`/identity/admin/users/${userId}/avatar`, { avatarUrl });
  return data;
}
