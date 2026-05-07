"use client";

import { DashboardLayout } from "@/components/admin/dashboard";
import { AdminItemModels } from "@/components/admin/item-models";

export default function AdminItemModelsPage() {
  return (
    <DashboardLayout
      favorites={[]}
      projects={[]}
      cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
    >
      <AdminItemModels />
    </DashboardLayout>
  );
}
