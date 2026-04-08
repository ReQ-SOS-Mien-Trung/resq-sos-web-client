"use client";

import { useState, useEffect } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  RolePermissionPanel,
  UserPermissionPanel,
} from "@/components/admin/permissions";
import { LockKey } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "role" as const, label: "Phân quyền vai trò" },
  { id: "user" as const, label: "Phân quyền người dùng" },
];

type TabId = (typeof TABS)[number]["id"];

const PermissionsPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>("role");

  useEffect(() => {
    getDashboardData().then(setDashboardData).catch(console.error);
  }, []);

  return (
    <DashboardLayout
      favorites={dashboardData?.favorites ?? []}
      projects={dashboardData?.projects ?? []}
      cloudStorage={
        dashboardData?.cloudStorage ?? {
          used: 0,
          total: 0,
          percentage: 0,
          unit: "GB",
        }
      }
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <LockKey size={24} className="text-foreground" />
              <p className="text-sm font-semibold uppercase tracking-tighter text-muted-foreground">
                Quản lý phân quyền
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Phân quyền người dùng
            </h1>
            <p className="text-[16px] tracking-tighter text-muted-foreground mt-1.5">
              Quản lý quyền hạn cho từng vai trò và người dùng trong hệ thống
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 border-b border-border/60">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-3 text-[16px] font-semibold tracking-tighter transition-all duration-200 border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-300">
          {activeTab === "role" ? (
            <RolePermissionPanel />
          ) : (
            <UserPermissionPanel />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PermissionsPage;
