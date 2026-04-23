"use client";

import dynamic from "next/dynamic";
import { DashboardLayout } from "@/components/admin/dashboard";

const CheckInRadiusMapTab = dynamic(
  () => import("@/components/admin/assembly-points/CheckInRadiusMapTab"),
  { ssr: false },
);

export default function RadiusConfigPage() {
  return (
    <DashboardLayout
      favorites={[]}
      projects={[]}
      cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
    >
      {/* Full-bleed container: negate the parent p-6 */}
      <div className="-m-6 flex h-[calc(100vh-64px)]">
        <CheckInRadiusMapTab fullHeight />
      </div>
    </DashboardLayout>
  );
}
