"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { RoleId, ROLE_NAMES, getDashboardPathByRole } from "@/lib/roles";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: RoleId[];
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
  const [isChecking, setIsChecking] = useState(true);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Wait for hydration from localStorage
    const checkAuth = () => {
      const state = useAuthStore.getState();

      if (!state.isAuthenticated || !state.user) {
        // Not authenticated - redirect to login
        router.replace(redirectTo);
        return;
      }

      const userRoleId = state.user.roleId;

      if (!allowedRoles.includes(userRoleId as RoleId)) {
        // Authenticated but role not allowed
        // Try to redirect to their allowed dashboard, or unauthorized page
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

    // Small delay to allow hydration
    const timer = setTimeout(checkAuth, 50);
    return () => clearTimeout(timer);
  }, [allowedRoles, redirectTo, unauthorizedRedirect, router]);

  // Show nothing while checking to prevent flash
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default RoleGuard;
