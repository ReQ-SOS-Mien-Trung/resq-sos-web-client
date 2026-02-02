"use client";

import { RoleGuard } from "@/components/auth";
import { ROLES } from "@/lib/roles";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={[ROLES.ADMIN]}>{children}</RoleGuard>;
}
