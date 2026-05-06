import { Metadata } from "next";
import { Suspense } from "react";
import { RoleGuard } from "@/components/auth";

export const metadata: Metadata = {
  title: "Điều Phối | ResQ-SOS Miền Trung",
  description: "Bảng điều phối cứu hộ thiên tai - ResQ-SOS Miền Trung",
};

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
