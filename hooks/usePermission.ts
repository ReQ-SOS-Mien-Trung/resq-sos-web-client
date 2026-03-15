import { useAuthStore } from "@/stores/auth.store";

/**
 * Check if the current user has a specific permission code.
 * Reads permissions from the zustand auth store.
 */
export function useHasPermission(requiredPermission: string): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  return permissions.includes(requiredPermission);
}

/**
 * Check if the current user has ALL of the given permission codes.
 */
export function useHasAllPermissions(requiredPermissions: string[]): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  return requiredPermissions.every((p) => permissions.includes(p));
}

/**
 * Check if the current user has ANY of the given permission codes.
 */
export function useHasAnyPermission(requiredPermissions: string[]): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  return requiredPermissions.some((p) => permissions.includes(p));
}

/**
 * Non-hook version: check permission outside of React components.
 * Reads directly from zustand store.
 */
export function checkPermission(requiredPermission: string): boolean {
  const permissions = useAuthStore.getState().user?.permissions ?? [];
  return permissions.includes(requiredPermission);
}
