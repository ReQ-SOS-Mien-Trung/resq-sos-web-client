import { Suspense } from "react";
import { RoleGuard } from "@/components/auth";
import { ManagerDepotGuard } from "@/components/auth/ManagerDepotGuard";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RoleGuard now auto-detects permissions from route-config
  // No need to pass allowedRoles manually
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RoleGuard>
        <ManagerDepotGuard>{children}</ManagerDepotGuard>
      </RoleGuard>
    </Suspense>
  );
}
