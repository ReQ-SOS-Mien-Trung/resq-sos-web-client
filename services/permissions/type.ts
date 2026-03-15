// ── Shared ─────────────────────────────────────────────
export interface PermissionEntity {
  id: number;
  code: string;
  name: string;
  description: string;
}

// ── GET /identity/roles/{roleId}/permissions ─────────────
export interface RolePermissionsResponse {
  roleId: number;
  permissions: PermissionEntity[];
}

// ── PUT /identity/roles/{roleId}/permissions ─────────────
export interface UpdateRolePermissionsPayload {
  permissionIds: number[];
}

// ── GET /identity/admin/users/{userId}/permissions ───────
export interface UserPermissionsResponse {
  userId: string;
  permissions: PermissionEntity[];
}

// ── PUT /identity/admin/users/{userId}/permissions ───────
export interface UpdateUserPermissionsPayload {
  permissionIds: number[];
}
