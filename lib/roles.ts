/**
 * Role constants matching database role IDs
 */
export const ROLES = {
  ADMIN: 1,
  COORDINATOR: 2,
  RESCUER: 3,
  MANAGER: 4,
  VICTIM: 5,
} as const;

export type RoleId = (typeof ROLES)[keyof typeof ROLES];

/**
 * Role names for display purposes
 */
export const ROLE_NAMES: Record<RoleId, string> = {
  [ROLES.ADMIN]: "Quản trị viên",
  [ROLES.COORDINATOR]: "Điều phối viên",
  [ROLES.RESCUER]: "Cứu hộ viên",
  [ROLES.MANAGER]: "Quản lý kho",
  [ROLES.VICTIM]: "Công dân",
};

/**
 * Roles allowed to access dashboard
 */
export const DASHBOARD_ROLES: RoleId[] = [
  ROLES.ADMIN,
  ROLES.COORDINATOR,
  ROLES.MANAGER,
];

/**
 * Get the dashboard path for a specific role
 */
export function getDashboardPathByRole(roleId: number): string | null {
  switch (roleId) {
    case ROLES.ADMIN:
      return "/dashboard/admin";
    case ROLES.COORDINATOR:
      return "/dashboard/coordinator";
    case ROLES.MANAGER:
      return "/dashboard/inventory";
    default:
      return null;
  }
}

/**
 * Check if a role is allowed to access dashboard
 */
export function canAccessDashboard(roleId: number): boolean {
  return DASHBOARD_ROLES.includes(roleId as RoleId);
}
