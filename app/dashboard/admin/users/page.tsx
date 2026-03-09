"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { DashboardSkeleton } from "@/components/admin";
import { DashboardLayout } from "@/components/admin/dashboard";
import { UserFilters, UserStats, UserTable } from "@/components/admin/users";
import { useAdminUsers, useBanUser, useUnbanUser, ADMIN_USERS_QUERY_KEY } from "@/services/user/hooks";
import { UserEntity } from "@/services/user/type";
import { User } from "@/type";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

function mapUserEntityToUser(entity: UserEntity): User {
  let role: User["role"] = "citizen";
  if (entity.roleId === 1 || entity.roleId === 4) role = "admin";
  else if (entity.roleId === 2) role = "coordinator";
  else if (entity.roleId === 3) role = "rescuer";

  let status: User["status"] = "pending";
  if (entity.isBanned) status = "banned";
  else if (entity.isOnboarded) status = "active";

  return {
    id: entity.id,
    email: entity.email || "Không có Email",
    name: `${entity.lastName} ${entity.firstName}`,
    role,
    status,
    region: "Chưa cập nhật", // Region not in UserEntity
    phone: entity.phone,
    avatar: entity.avatarUrl || undefined,
    createdAt: entity.createdAt,
    lastLogin: entity.updatedAt,
  };
}

const UsersPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);

  const queryClient = useQueryClient();
  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();

  const [banModalOpen, setBanModalOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");

  const { data: usersData, isLoading: isLoadingUsers } = useAdminUsers({
    pageNumber: 1,
    pageSize: 1000,
  });

  const dynamicStats = {
    total: usersData?.items?.length || 0,
    active: usersData?.items?.filter(u => !u.isBanned).length || 0,
    pending: 0, // no longer in UI
    banned: usersData?.items?.filter(u => u.isBanned).length || 0,
  };

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

  const handleBanClick = (user: User) => {
    setUserToBan(user);
    setBanReason("");
    setBanModalOpen(true);
  };

  const handleConfirmBan = () => {
    if (!userToBan) return;
    toast.loading("Đang xử lý...");
    banMutation.mutate(
      { userId: userToBan.id, data: { reason: banReason } },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success("Đã cấm người dùng thành công");
          setBanModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
        },
        onError: () => {
          toast.dismiss();
          toast.error("Có lỗi xảy ra khi cấm người dùng");
        },
      }
    );
  };

  const handleActivateClick = (user: User) => {
    toast.loading("Đang xử lý...");
    unbanMutation.mutate(user.id, {
      onSuccess: () => {
        toast.dismiss();
        toast.success("Khôi phục tài khoản thành công");
        queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      },
      onError: () => {
        toast.dismiss();
        toast.error("Có lỗi xảy ra khi khôi phục tài khoản");
      },
    });
  };

  if (loading || !dashboardData) {
    return (
      <DashboardLayout
        favorites={[]}
        projects={[]}
        cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
      >
        <DashboardSkeleton variant="table" />
      </DashboardLayout>
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
          <div className="flex items-center gap-2.5 mb-1">
            <ShieldCheck size={20} className="text-foreground" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quản lý hồ sơ
            </p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
            Quản lý người dùng
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Xem xét và phê duyệt hồ sơ của người dùng
          </p>
        </div>

        <UserStats stats={dynamicStats} />

        <UserFilters filters={filters} onFiltersChange={setFilters} />

        <UserTable
          users={usersData?.items ? usersData.items.map(mapUserEntityToUser) : []}
          filters={filters}
          onBan={handleBanClick}
          onActivate={handleActivateClick}
        />
      </div>

      <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
        <DialogContent className="sm:max-w-md border border-border/60">
          <DialogHeader>
            <DialogTitle>Cấm người dùng</DialogTitle>
            <DialogDescription>
              Bạn đang thực hiện cấm người dùng <strong>{userToBan?.name}</strong>. Vui lòng nhập lý do (tuỳ chọn).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Nhập lý do cấm..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="resize-none border-border/60"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBan}
              disabled={banMutation.isPending}
            >
              {banMutation.isPending ? "Đang xử lý..." : "Xác nhận cấm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UsersPage;
