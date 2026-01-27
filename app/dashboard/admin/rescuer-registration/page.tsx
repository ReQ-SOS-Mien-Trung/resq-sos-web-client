"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { mockRescuerRegistrations } from "@/lib/mock-data/admin-rescuer-registration";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  RegistrationForm,
  RescuerList,
} from "@/components/admin/rescuer-registration";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageLoading } from "@/components/admin/PageLoading";

export default function RescuerRegistrationPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
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
    return <PageLoading title="Đang tải đăng ký" subtitle="Đang lấy danh sách cứu hộ viên…" />;
  }

  return (
    <DashboardLayout
      favorites={dashboardData.favorites}
      projects={dashboardData.projects}
      cloudStorage={dashboardData.cloudStorage}
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Đăng ký cứu hộ viên
            </h1>
            <p className="text-muted-foreground">
              Quản lý đăng ký cứu hộ viên mới
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? "Ẩn form" : "Tạo đăng ký mới"}
          </Button>
        </div>

        {showForm && (
          <RegistrationForm
            onSubmit={(data) => {
              console.log("Submit registration:", data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        <RescuerList
          registrations={mockRescuerRegistrations}
          onApprove={(reg) => console.log("Approve:", reg)}
          onReject={(reg) => console.log("Reject:", reg)}
        />
      </div>
    </DashboardLayout>
  );
}
