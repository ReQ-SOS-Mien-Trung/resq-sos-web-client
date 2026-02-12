"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { RoleId, getDashboardPathByRole } from "@/lib/roles";
import { getAllowedRolesForPath, isPublicRoute } from "@/lib/route-config";
import { PageLoading } from "@/components/admin";

interface RoleGuardProps {
  children: React.ReactNode;
  /**
   * Override allowed roles (optional)
   * If not provided, will auto-detect from route-config based on current path
   */
  allowedRoles?: RoleId[];
  /**
   * Where to redirect if not authenticated
   * @default "/sign-in"
   */
  redirectTo?: string;
  /**
   * Where to redirect if authenticated but role not allowed
   * @default "/unauthorized"
   */
  unauthorizedRedirect?: string;
}

export function RoleGuard({
  children,
  allowedRoles,
  redirectTo = "/sign-in",
  unauthorizedRedirect = "/unauthorized",
}: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const checkAuth = () => {
      const state = useAuthStore.getState();

      // Skip check for public routes
      if (isPublicRoute(pathname)) {
        setIsChecking(false);
        return;
      }

      // Get allowed roles from props or auto-detect from route config
      const roles = allowedRoles ?? getAllowedRolesForPath(pathname);

      // If no roles configured for this path, just check authentication
      if (!roles) {
        if (!state.isAuthenticated) {
          router.replace(redirectTo);
          return;
        }
        setIsChecking(false);
        return;
      }

      // Check authentication
      if (!state.isAuthenticated || !state.user) {
        router.replace(redirectTo);
        return;
      }

      const userRoleId = state.user.roleId;

      // Check role permission
      if (!roles.includes(userRoleId as RoleId)) {
        // Authenticated but role not allowed
        // Try to redirect to their allowed dashboard
        const allowedPath = getDashboardPathByRole(userRoleId);
        if (allowedPath) {
          router.replace(allowedPath);
        } else {
          router.replace(unauthorizedRedirect);
        }
        return;
      }

      // All checks passed
      setIsChecking(false);
    };

    // Small delay to allow hydration from localStorage
    const timer = setTimeout(checkAuth, 50);
    return () => clearTimeout(timer);
  }, [allowedRoles, pathname, redirectTo, unauthorizedRedirect, router]);

  // Show loading while checking
  if (isChecking) {
    return <PageLoading />;
  }

  return <>{children}</>;
}

export default RoleGuard;
