"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import {
  DashboardLayout,
  DepotFundMovementChart,
  MissionReportComplianceChart,
  RescuerOverview,
  SOSOverview,
  SummaryCards,
  VictimsBarChart,
} from "@/components/admin/dashboard";
import { DashboardData } from "@/type";
import { DashboardSkeleton } from "@/components/admin";
import { useAdminDashboardChartInvalidation } from "@/hooks/useChartInvalidationRealtime";

const AdminDashboardPage = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  useAdminDashboardChartInvalidation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await getDashboardData();
        setData(dashboardData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <DashboardLayout
        favorites={[]}
        projects={[]}
        cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
      >
        <DashboardSkeleton variant="dashboard" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      favorites={data.favorites}
      projects={data.projects}
      cloudStorage={data.cloudStorage}
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Summary Cards */}
        <div
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "100ms" }}
        >
          <SummaryCards />
        </div>
        {/* SOS Overview - Full Width */}
        <div
          id="sos-overview"
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "150ms" }}
        >
          <SOSOverview />
        </div>
        {/* Rescuer Overview - Full Width */}
        <div
          id="rescuer-overview"
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "175ms" }}
        >
          <RescuerOverview />
        </div>
        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left Column - Victims Bar Chart */}
          <div
            id="victims-chart"
            className="min-w-0 animate-in fade-in slide-in-from-left-4 duration-500"
            style={{ animationDelay: "200ms" }}
          >
            <VictimsBarChart />
          </div>

          {/* Right Column - Mission Report Compliance */}
          <div
            className="min-w-0 animate-in fade-in slide-in-from-right-4 duration-500"
            style={{ animationDelay: "300ms" }}
          >
            <MissionReportComplianceChart />
          </div>
        </div>
        {/* Second Row */}
        <div className="grid grid-cols-1 gap-6">
          {/* Depot Fund Movement */}
          <div
            id="depot-fund-movement"
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "400ms" }}
          >
            <DepotFundMovementChart />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboardPage;
