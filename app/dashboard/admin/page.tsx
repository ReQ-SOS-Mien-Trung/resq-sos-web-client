"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { Check } from "@phosphor-icons/react";
import {
  CalendarWidget,
  DashboardLayout,
  LeadsManagement,
  RetentionRate,
  RescuerOverview,
  SOSOverview,
  SummaryCards,
  TopCountries,
  VictimsBarChart,
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Victims Bar Chart */}
          <div
            className="lg:col-span-2 animate-in fade-in slide-in-from-left-4 duration-500"
            style={{ animationDelay: "200ms" }}
          >
            <VictimsBarChart />
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
