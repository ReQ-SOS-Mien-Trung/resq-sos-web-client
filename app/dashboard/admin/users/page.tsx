"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { mockUsers, mockUserStats } from "@/lib/mock-data/admin-users";
import type { UserFilters as UserFiltersType } from "@/types/admin-pages";
import {
  DashboardLayout,
  PageLoading,
  UserFilters,
  UserStats,
  UserTable,
} from "@/components/admin";

const UsersPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [filters, setFilters] = useState<UserFiltersType>({});
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
        title="Đang tải người dùng"
        subtitle="Đang đồng bộ danh sách tài khoản…"
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
            Quản lý người dùng
          </h1>
          <p className="text-muted-foreground">
            Quản lý tất cả người dùng trong hệ thống
          </p>
        </div>

        <UserStats stats={mockUserStats} />

        <UserFilters filters={filters} onFiltersChange={setFilters} />

        <UserTable users={mockUsers} filters={filters} />
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;
