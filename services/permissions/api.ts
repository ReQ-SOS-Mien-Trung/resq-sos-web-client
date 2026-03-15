import api from "@/config/axios";
import {
  RolePermissionsResponse,
  UpdateRolePermissionsPayload,
  UserPermissionsResponse,
  UpdateUserPermissionsPayload,
  PermissionEntity,
} from "./type";

// GET /identity/permissions (all system permissions)
export async function getAllPermissions(): Promise<PermissionEntity[]> {
  const { data } = await api.get("/identity/permissions");
  return data;
}

// GET /identity/roles/{roleId}/permissions
export async function getRolePermissions(
  roleId: number,
): Promise<RolePermissionsResponse> {
  const { data } = await api.get(`/identity/roles/${roleId}/permissions`);
  return data;
}

// PUT /identity/roles/{roleId}/permissions
export async function updateRolePermissions(
  roleId: number,
  body: UpdateRolePermissionsPayload,
): Promise<void> {
  await api.put(`/identity/roles/${roleId}/permissions`, body);
}

// GET /identity/admin/users/{userId}/permissions
export async function getUserPermissions(
  userId: string,
): Promise<UserPermissionsResponse> {
  const { data } = await api.get(`/identity/admin/users/${userId}/permissions`);
  return data;
}

// PUT /identity/admin/users/{userId}/permissions
export async function updateUserPermissions(
  userId: string,
  body: UpdateUserPermissionsPayload,
): Promise<void> {
  await api.put(`/identity/admin/users/${userId}/permissions`, body);
}
