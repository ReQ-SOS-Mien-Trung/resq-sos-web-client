"use client";

import { RoleGuard } from "@/components/auth";
import { ROLES } from "@/lib/roles";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allowedRoles={[ROLES.MANAGER]}>{children}</RoleGuard>;
}
