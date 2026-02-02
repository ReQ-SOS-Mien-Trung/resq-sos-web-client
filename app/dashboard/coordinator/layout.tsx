"use client";

import { RoleGuard } from "@/components/auth";
import { ROLES } from "@/lib/roles";

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={[ROLES.COORDINATOR]}>{children}</RoleGuard>;
}
