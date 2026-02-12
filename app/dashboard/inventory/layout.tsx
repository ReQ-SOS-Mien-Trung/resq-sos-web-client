import { RoleGuard } from "@/components/auth";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RoleGuard now auto-detects permissions from route-config
  // No need to pass allowedRoles manually
  return <RoleGuard>{children}</RoleGuard>;
}
