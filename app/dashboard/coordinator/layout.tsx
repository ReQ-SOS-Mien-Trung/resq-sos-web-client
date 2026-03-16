import { Suspense } from "react";
import { RoleGuard } from "@/components/auth";

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RoleGuard now auto-detects permissions from route-config
  // No need to pass allowedRoles manually
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RoleGuard>{children}</RoleGuard>
    </Suspense>
  );
}
