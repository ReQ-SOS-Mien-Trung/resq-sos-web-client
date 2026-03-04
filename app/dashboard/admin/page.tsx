"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { Check } from "@phosphor-icons/react";
import {
  CalendarWidget,
  DashboardLayout,
  LeadsManagement,
  RetentionRate,
  RevenueChart,
  SOSOverview,
  SummaryCards,
  TopCountries,
} from "@/components/admin/dashboard";
import { DashboardData } from "@/type";
import { DashboardSkeleton } from "@/components/admin";

const AdminDashboardPage = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
        {/* Header Actions Row */}
        <div className="flex items-center justify-between">
          {/* Last Updated Indicator */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 shadow-sm">
              <div className="relative">
                <Check
                  size={16}
                  className="text-emerald-700 dark:text-emerald-400"
                />
                <div className="absolute inset-0 h-4 w-4 animate-ping opacity-30">
                  <Check
                    size={16}
                    className="text-emerald-700 dark:text-emerald-400"
                  />
                </div>
              </div>
              <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                Cập nhật lúc: vừa xong
              </span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "100ms" }}
        >
          <SummaryCards metrics={data.summaryMetrics} />
        </div>

        {/* SOS Overview - Full Width */}
        <div
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "150ms" }}
        >
          <SOSOverview />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Revenue Chart */}
          <div
            className="lg:col-span-2 animate-in fade-in slide-in-from-left-4 duration-500"
            style={{ animationDelay: "200ms" }}
          >
            <RevenueChart data={data.revenue} />
          </div>

          {/* Right Column - Calendar */}
          <div
            className="animate-in fade-in slide-in-from-right-4 duration-500"
            style={{ animationDelay: "300ms" }}
          >
            <CalendarWidget data={data.calendar} />
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leads Management */}
          <div
            className="lg:col-span-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "400ms" }}
          >
            <LeadsManagement data={data.leads} />
          </div>

          {/* Top Countries */}
          <div
            className="lg:col-span-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "500ms" }}
          >
            <TopCountries data={data.topCountries} />
          </div>

          {/* Retention Rate */}
          <div
            className="lg:col-span-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "600ms" }}
          >
            <RetentionRate data={data.retention} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboardPage;
