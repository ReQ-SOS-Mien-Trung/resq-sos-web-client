"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { mockRescuerVerifications } from "@/lib/mock-data/admin-rescuer-verification";
import { PageLoading } from "@/components/admin";
import { RescuerVerification } from "@/type";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  DocumentViewer,
  RescuerProfile,
  VerificationQueue,
} from "@/components/admin/rescuer-verification";

const RescuerVerificationPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedVerification, setSelectedVerification] =
    useState<RescuerVerification | null>(null);
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
        title="Đang tải xác minh"
        subtitle="Đang chuẩn bị hồ sơ cứu hộ viên…"
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
            Xác nhận cứu hộ viên
          </h1>
          <p className="text-muted-foreground">
            Xác nhận và phê duyệt cứu hộ viên
          </p>
        </div>

        {selectedVerification ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RescuerProfile verification={selectedVerification} />
            <DocumentViewer
              verification={selectedVerification}
              onVerify={(docId) => console.log("Verify doc:", docId)}
              onReject={(docId) => console.log("Reject doc:", docId)}
            />
            <div className="lg:col-span-2">
              <VerificationQueue
                verifications={mockRescuerVerifications}
                onView={(v) => setSelectedVerification(v)}
                onApprove={(v) => console.log("Approve:", v)}
                onReject={(v) => console.log("Reject:", v)}
              />
            </div>
          </div>
        ) : (
          <VerificationQueue
            verifications={mockRescuerVerifications}
            onView={(v) => setSelectedVerification(v)}
            onApprove={(v) => console.log("Approve:", v)}
            onReject={(v) => console.log("Reject:", v)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default RescuerVerificationPage;
