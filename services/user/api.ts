import api from "@/config/axios";
import {
  UserMeResponse,
  GetUsersParams,
  GetUsersResponse,
  GetRescuersParams,
  GetRescuersResponse,
  BanUserRequest,
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  UserEntity,
  GetAdminUserByIdResponse,
  GetUsersForPermissionParams,
  GetUsersForPermissionResponse,
} from "./type";

export async function getUserMe(): Promise<UserMeResponse> {
  const { data } = await api.get("/identity/user/me");
  return data;
}

export async function updateUserAvatar(
  userId: string,
  avatarUrl: string,
): Promise<any> {
  const { data } = await api.put(`/identity/admin/users/${userId}/avatar`, {
    avatarUrl,
  });
  return data;
}

export async function getAdminUsers(
  params?: GetUsersParams,
): Promise<GetUsersResponse> {
  const { data } = await api.get("/identity/admin/users", { params });
  return data;
}

export async function getAdminRescuers(
  params?: GetRescuersParams,
): Promise<GetRescuersResponse> {
  const { data } = await api.get("/identity/admin/users/rescuers", { params });
  return data;
}

export async function banUser(
  userId: string,
  data: BanUserRequest,
): Promise<void> {
  await api.post(`/identity/admin/users/${userId}/ban`, data);
}

export async function unbanUser(userId: string): Promise<void> {
  await api.post(`/identity/admin/users/${userId}/unban`);
}

export async function getAdminUserById(
  userId: string,
): Promise<GetAdminUserByIdResponse> {
  const { data } = await api.get(`/identity/admin/users/${userId}`);
  return data;
}

export async function adminCreateUser(
  data: AdminCreateUserRequest,
): Promise<any> {
  const response = await api.post("/identity/admin/users", data);
  return response.data;
}

export async function updateAdminUser(
  userId: string,
  data: AdminUpdateUserRequest,
): Promise<UserEntity> {
  const response = await api.put(`/identity/admin/users/${userId}`, data);
  return response.data;
}

export async function getUsersForPermission(
  params?: GetUsersForPermissionParams,
): Promise<GetUsersForPermissionResponse> {
  const { data } = await api.get("/identity/admin/users/for-permission", {
    params,
  });
  return data;
}
