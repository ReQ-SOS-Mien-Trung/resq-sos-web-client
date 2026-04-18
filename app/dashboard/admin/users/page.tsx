"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  UserStats,
  UserTable,
  UserDetailSheet,
} from "@/components/admin/users";
import {
  useAdminUsers,
  useBanUser,
  useUnbanUser,
  ADMIN_USERS_QUERY_KEY,
  useRoleMetadata,
} from "@/services/user/hooks";
import { RoleMetadataOption, UserEntity } from "@/services/user/type";
import { User } from "@/type";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, ArrowRight } from "@phosphor-icons/react";

function mapUserEntityToUser(entity: UserEntity): User {
  let role: User["role"] = "victim";
  if (entity.roleId === 1) role = "admin";
  else if (entity.roleId === 4) role = "manager";
  else if (entity.roleId === 2) role = "coordinator";
  else if (entity.roleId === 3) role = "rescuer";
  // roleId 5 → victim (default)

  const status: User["status"] = entity.isBanned ? "banned" : "active";

  return {
    id: entity.id,
    email: entity.email || "Không có Email",
    name: `${entity.lastName} ${entity.firstName}`,
    role,
    status,
    region: entity.province || "Chưa cập nhật",
    phone: entity.phone,
    avatar: entity.avatarUrl || undefined,
    createdAt: entity.createdAt,
    lastLogin: entity.updatedAt,
  };
}

const UsersPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);

  const queryClient = useQueryClient();
  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();

  const [banModalOpen, setBanModalOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailSheetMode, setDetailSheetMode] = useState<"view" | "edit">(
    "view",
  );

  // Load sidebar layout data
  useEffect(() => {
    getDashboardData().then(setDashboardData).catch(console.error);
  }, []);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("all");
  const [selectedBanFilter, setSelectedBanFilter] = useState<
    "all" | "active" | "banned"
  >("all");

  const { data: roleMetadata = [] } = useRoleMetadata();
  const roleOptions = roleMetadata
    .filter((role: RoleMetadataOption) => Number(role.key) !== 3)
    .map((role: RoleMetadataOption) => ({
      value: role.key,
      label: role.value,
    }));

  // Fetch users with server-side pagination
  const { data: usersData, isLoading: isLoadingUsers } = useAdminUsers({
    pageNumber: page,
    pageSize,
    roleId:
      selectedRoleId !== "all" ? Number(selectedRoleId) : undefined,
    isBanned:
      selectedBanFilter === "all"
        ? undefined
        : selectedBanFilter === "banned",
    search: search.trim() || undefined,
  });

  const dynamicStats = {
    total: usersData?.totalCount ?? 0,
    active: usersData?.items?.filter((u) => !u.isBanned).length ?? 0,
    pending: 0,
    banned: usersData?.items?.filter((u) => u.isBanned).length ?? 0,
  };

  const handleEditClick = (user: User) => {
    setSelectedUserId(user.id);
    setDetailSheetMode("edit");
    setDetailSheetOpen(true);
  };

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
      },
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
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <ShieldCheck size={24} className="text-foreground" />
              <p className="text-sm font-semibold uppercase tracking-tighter text-muted-foreground">
                Quản lý hồ sơ
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Quản lý người dùng
            </h1>
            <p className="text-[16px] tracking-tighter text-muted-foreground mt-1.5">
              Xem xét và quản lý tài khoản của người dùng
            </p>
          </div>
          <button
            onClick={() =>
              (window.location.href = "/dashboard/admin/users/create")
            }
            className="px-2 sm:px-4 py-4 bg-black text-white text-[12px] sm:text-[14px] font-bold uppercase tracking-tighter hover:bg-[#FF5722] transition-colors flex items-center justify-center gap-2 group"
          >
            Tạo tài khoản
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <UserStats stats={dynamicStats} />

        <UserTable
          users={usersData?.items?.map(mapUserEntityToUser) ?? []}
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          roleOptions={roleOptions}
          selectedRoleId={selectedRoleId}
          onRoleIdChange={(value) => {
            setSelectedRoleId(value);
            setPage(1);
          }}
          selectedBanFilter={selectedBanFilter}
          onBanFilterChange={(value) => {
            setSelectedBanFilter(value);
            setPage(1);
          }}
          onEdit={handleEditClick}
          onBan={handleBanClick}
          onActivate={handleActivateClick}
          onViewDetail={(userId) => {
            setSelectedUserId(userId);
            setDetailSheetMode("view");
            setDetailSheetOpen(true);
          }}
          isLoading={isLoadingUsers}
          totalCount={usersData?.totalCount}
          serverPagination={{
            totalCount: usersData?.totalCount ?? 0,
            totalPages: usersData?.totalPages ?? 1,
            page,
            pageSize,
            hasPreviousPage: usersData?.hasPreviousPage ?? false,
            hasNextPage: usersData?.hasNextPage ?? false,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      </div>

      <UserDetailSheet
        userId={selectedUserId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        initialMode={detailSheetMode}
      />

      <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
        <DialogContent className="sm:max-w-md border border-border/60">
          <DialogHeader>
            <DialogTitle>Cấm người dùng</DialogTitle>
            <DialogDescription>
              Bạn đang thực hiện cấm người dùng{" "}
              <strong>{userToBan?.name}</strong>. Vui lòng nhập lý do (tuỳ
              chọn).
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
            <Button variant="outline" onClick={() => setBanModalOpen(false)}>
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
