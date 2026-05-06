import { Metadata } from "next";
import { Suspense } from "react";
import { RoleGuard } from "@/components/auth";

export const metadata: Metadata = {
  title: "Quản Trị | ResQ-SOS Miền Trung",
  description: "Bảng quản trị hệ thống cứu hộ thiên tai - ResQ-SOS Miền Trung",
};

export default function AdminLayout({
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
