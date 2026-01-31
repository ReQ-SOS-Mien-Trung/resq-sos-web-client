"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import {
  mockRescueReports,
  mockReportStats,
} from "@/lib/mock-data/admin-reports";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  ReportStats,
  ReportFilters,
  ReportTable,
} from "@/components/admin/reports";
import { PageLoading } from "@/components/admin";

export default function ReportsPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [filters, setFilters] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !dashboardData) {
    return (
      <PageLoading
        title="Đang tải báo cáo"
        subtitle="Đang tổng hợp dữ liệu cứu hộ…"
      />
    );
  }

  return (
    <DashboardLayout
      favorites={dashboardData.favorites}
      projects={dashboardData.projects}
      cloudStorage={dashboardData.cloudStorage}
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Báo cáo cứu hộ
          </h1>
          <p className="text-muted-foreground">
            Xem và quản lý các báo cáo cứu hộ
          </p>
        </div>

        <ReportStats stats={mockReportStats} />

        <ReportFilters
          filters={filters}
          onFiltersChange={setFilters}
          onExport={() => console.log("Export reports")}
        />

        <ReportTable reports={mockRescueReports} />
      </div>
    </DashboardLayout>
  );
}
