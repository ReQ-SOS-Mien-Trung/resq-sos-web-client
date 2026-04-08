import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions,
  updateUserPermissions,
} from "./api";
import {
  UpdateRolePermissionsPayload,
  UpdateUserPermissionsPayload,
} from "./type";

// ── Query Keys ───────────────────────────────────────────
export const permissionKeys = {
  all: ["permissions", "all"] as const,
  rolePermissions: (roleId: number) => ["permissions", "role", roleId] as const,
  userPermissions: (userId: string) => ["permissions", "user", userId] as const,
};

// ── GET /identity/permissions (all system permissions) ───
export function useAllPermissions() {
  return useQuery({
    queryKey: permissionKeys.all,
    queryFn: getAllPermissions,
  });
}

// ── GET /identity/roles/{roleId}/permissions ─────────────
export function useRolePermissions(roleId: number) {
  return useQuery({
    queryKey: permissionKeys.rolePermissions(roleId),
    queryFn: () => getRolePermissions(roleId),
    enabled: !!roleId,
  });
}

// ── PUT /identity/roles/{roleId}/permissions ─────────────
export function useUpdateRolePermissions(roleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateRolePermissionsPayload) =>
      updateRolePermissions(roleId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: permissionKeys.rolePermissions(roleId),
      });
    },
  });
}

// ── GET /identity/admin/users/{userId}/permissions ───────
export function useUserPermissions(userId: string) {
  return useQuery({
    queryKey: permissionKeys.userPermissions(userId),
    queryFn: () => getUserPermissions(userId),
    enabled: !!userId,
  });
}

// ── PUT /identity/admin/users/{userId}/permissions ───────
export function useUpdateUserPermissions(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserPermissionsPayload) =>
      updateUserPermissions(userId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: permissionKeys.userPermissions(userId),
      });
    },
  });
}
