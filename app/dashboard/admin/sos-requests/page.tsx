"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { DashboardLayout } from "@/components/admin/dashboard";
import { SOSRequestStats, SOSRequestTable, SOSDetailSheet } from "@/components/admin/sos-requests";
import { useSOSRequests } from "@/services/sos_request/hooks";
import type { SOSRequestEntity } from "@/services/sos_request/type";
import { Siren } from "@phosphor-icons/react";

const SOSRequestsPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    getDashboardData().then(setDashboardData).catch(console.error);
  }, []);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedSOS, setSelectedSOS] = useState<SOSRequestEntity | null>(null);

  const { data: sosData, isLoading } = useSOSRequests({
    params: { pageNumber: page, pageSize },
  });

  const items = sosData?.items ?? [];

  const stats = {
    total: sosData?.totalCount ?? 0,
    pending: items.filter((s) => s.status === "Pending").length,
    inProgress: items.filter((s) => s.status === "InProgress" || s.status === "Assigned").length,
    completed: items.filter((s) => s.status === "Completed").length,
    cancelled: items.filter((s) => s.status === "Cancelled").length,
  };

  return (
    <DashboardLayout
      favorites={dashboardData?.favorites ?? []}
      projects={dashboardData?.projects ?? []}
      cloudStorage={
        dashboardData?.cloudStorage ?? { used: 0, total: 0, percentage: 0, unit: "GB" }
      }
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Siren size={24} className="text-foreground" weight="fill" />
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Quản lý yêu cầu
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Quản lý yêu cầu SOS
            </h1>
            <p className="text-[16px] tracking-tighter text-muted-foreground mt-1.5">
              Xem xét và quản lý tất cả yêu cầu cứu hộ khẩn cấp trong hệ thống
            </p>
          </div>
        </div>

        <SOSRequestStats stats={stats} />

        <SOSRequestTable
          requests={items}
          isLoading={isLoading}
          onRowClick={setSelectedSOS}
          serverPagination={{
            totalCount: sosData?.totalCount ?? 0,
            totalPages: sosData?.totalPages ?? 1,
            page,
            pageSize,
            hasPreviousPage: sosData?.hasPreviousPage ?? false,
            hasNextPage: sosData?.hasNextPage ?? false,
            onPageChange: setPage,
            onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
          }}
        />

        <SOSDetailSheet
          open={!!selectedSOS}
          onOpenChange={(open) => {
            if (!open) setSelectedSOS(null);
          }}
          sosRequest={selectedSOS}
        />
      </div>
    </DashboardLayout>
  );
};

export default SOSRequestsPage;
