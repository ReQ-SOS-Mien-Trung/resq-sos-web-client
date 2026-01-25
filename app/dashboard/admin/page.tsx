"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import type { DashboardData } from "@/types/admin-dashboard";
import { Check } from "lucide-react";
import {
  CalendarWidget,
  DashboardLayout,
  LeadsManagement,
  RetentionRate,
  RevenueChart,
  SummaryCards,
  TopCountries,
} from "@/components/admin/dashboard";

export default function AdminDashboardPage() {
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
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 mx-auto mb-6 animate-pulse shadow-xl shadow-red-500/30" />
            <div className="absolute inset-0 h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 mx-auto animate-ping opacity-20" />
          </div>
          <p className="text-muted-foreground font-medium">
            Đang tải dữ liệu...
          </p>
        </div>
      </div>
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="relative">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div className="absolute inset-0 h-4 w-4 animate-ping opacity-30">
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
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
}
