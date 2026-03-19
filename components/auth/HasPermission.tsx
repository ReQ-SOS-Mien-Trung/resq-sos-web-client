"use client";

import { useHasPermission, useHasAnyPermission } from "@/hooks/usePermission";

interface HasPermissionProps {
  /** Single permission code required */
  permission?: string;
  /** Multiple permission codes — user needs ANY of them */
  anyOf?: string[];
  /** Fallback UI when permission check fails (defaults to null) */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component wrapper to conditionally render children based on user permissions.
 *
 * @example
 * // Single permission
 * <HasPermission permission="inventory.depot.manage">
 *   <button>Thêm mới Vật Tư</button>
 * </HasPermission>
 *
 * @example
 * // Any of multiple permissions
 * <HasPermission anyOf={["system.user.manage", "system.user.view"]}>
 *   <UserTable />
 * </HasPermission>
 */
export function HasPermission({
  permission,
  anyOf,
  fallback = null,
  children,
}: HasPermissionProps) {
  const hasSingle = useHasPermission(permission ?? "");
  const hasAny = useHasAnyPermission(anyOf ?? []);

  // If permission prop is set, check single; if anyOf is set, check any
  const hasAccess = permission ? hasSingle : anyOf ? hasAny : true;

  if (!hasAccess) return <>{fallback}</>;
  return <>{children}</>;
}

export default HasPermission;
