"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { DashboardLayout } from "@/components/admin/dashboard";
import { RescuerStats, RescuerTable } from "@/components/admin/rescuers";
import { UserDetailSheet } from "@/components/admin/users";
import {
  useAdminRescuers,
  useBanUser,
  useUnbanUser,
  ADMIN_RESCUERS_QUERY_KEY,
} from "@/services/user/hooks";
import { UserEntity } from "@/services/user/type";
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
import { UserCheck } from "@phosphor-icons/react";

const RescuersPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const queryClient = useQueryClient();

  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();

  const [banModalOpen, setBanModalOpen] = useState(false);
  const [rescuerToBan, setRescuerToBan] = useState<UserEntity | null>(null);
  const [banReason, setBanReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailSheetMode, setDetailSheetMode] = useState<"view" | "edit">("view");

  useEffect(() => {
    getDashboardData().then(setDashboardData).catch(console.error);
  }, []);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: rescuersData, isLoading } = useAdminRescuers({
    pageNumber: page,
    pageSize,
  });

  const items = rescuersData?.items ?? [];

  const stats = {
    total: rescuersData?.totalCount ?? 0,
    core: items.filter((u) => u.rescuerType === "Core").length,
    volunteer: items.filter((u) => u.rescuerType === "Volunteer").length,
    banned: items.filter((u) => u.isBanned).length,
  };

  const handleEditClick = (rescuer: UserEntity) => {
    setSelectedUserId(rescuer.id);
    setDetailSheetMode("edit");
    setDetailSheetOpen(true);
  };

  const handleBanClick = (rescuer: UserEntity) => {
    setRescuerToBan(rescuer);
    setBanReason("");
    setBanModalOpen(true);
  };

  const handleConfirmBan = () => {
    if (!rescuerToBan) return;
    toast.loading("Đang xử lý...");
    banMutation.mutate(
      { userId: rescuerToBan.id, data: { reason: banReason } },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success("Đã cấm cứu hộ viên thành công");
          setBanModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ADMIN_RESCUERS_QUERY_KEY });
        },
        onError: () => {
          toast.dismiss();
          toast.error("Có lỗi xảy ra khi cấm cứu hộ viên");
        },
      }
    );
  };

  const handleActivateClick = (rescuer: UserEntity) => {
    toast.loading("Đang xử lý...");
    unbanMutation.mutate(rescuer.id, {
      onSuccess: () => {
        toast.dismiss();
        toast.success("Khôi phục tài khoản thành công");
        queryClient.invalidateQueries({ queryKey: ADMIN_RESCUERS_QUERY_KEY });
      },
      onError: () => {
        toast.dismiss();
        toast.error("Có lỗi xảy ra khi khôi phục tài khoản");
      },
    });
  };

  const rescuerToBanName = rescuerToBan
    ? `${rescuerToBan.lastName} ${rescuerToBan.firstName}`
    : "";

  return (
    <DashboardLayout
      favorites={dashboardData?.favorites ?? []}
      projects={dashboardData?.projects ?? []}
      cloudStorage={
        dashboardData?.cloudStorage ?? { used: 0, total: 0, percentage: 0, unit: "GB" }
      }
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <UserCheck size={24} className="text-foreground" />
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Quản lý hồ sơ
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Quản lý cứu hộ viên
            </h1>
            <p className="text-[16px] tracking-tighter text-muted-foreground mt-1.5">
              Xem xét và quản lý tài khoản của cứu hộ viên trong hệ thống
            </p>
          </div>
        </div>

        <RescuerStats stats={stats} />

        <RescuerTable
          rescuers={items}
          onEdit={handleEditClick}
          onBan={handleBanClick}
          onActivate={handleActivateClick}
          onViewDetail={(userId) => {
            setSelectedUserId(userId);
            setDetailSheetMode("view");
            setDetailSheetOpen(true);
          }}
          isLoading={isLoading}
          serverPagination={{
            totalCount: rescuersData?.totalCount ?? 0,
            totalPages: rescuersData?.totalPages ?? 1,
            page,
            pageSize,
            hasPreviousPage: rescuersData?.hasPreviousPage ?? false,
            hasNextPage: rescuersData?.hasNextPage ?? false,
            onPageChange: setPage,
            onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
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
            <DialogTitle>Cấm cứu hộ viên</DialogTitle>
            <DialogDescription>
              Bạn đang thực hiện cấm cứu hộ viên{" "}
              <strong>{rescuerToBanName}</strong>. Vui lòng nhập lý do (tuỳ chọn).
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

export default RescuersPage;
