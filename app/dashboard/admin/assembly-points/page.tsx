"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MagnifyingGlass,
  Plus,
  MapPin,
  UsersThree,
  Clock,
  PencilSimple,
  Trash,
  Eye,
  FlagBanner,
  CheckCircle,
  WarningCircle,
  XCircle,
  CaretLeft,
  CaretRight,
  Spinner,
  ArrowClockwise,
  GarageIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  AssemblyPointFormDialog,
  AssemblyPointDetailSheet,
} from "@/components/admin/assembly-points";
import {
  useAssemblyPoints,
  useDeleteAssemblyPoint,
} from "@/services/assembly_points";
import { useQueryClient } from "@tanstack/react-query";
import type {
  AssemblyPointEntity,
  AssemblyPointStatus,
} from "@/services/assembly_points";

/* ── Status config ── */

const statusConfig: Record<
  AssemblyPointStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  Active: {
    label: "Hoạt động",
    color: "text-emerald-700",
    bg: "bg-emerald-500/10 border-emerald-200",
    icon: <CheckCircle size={14} weight="fill" className="text-emerald-500" />,
  },
  Overloaded: {
    label: "Quá tải",
    color: "text-amber-700",
    bg: "bg-amber-500/10 border-amber-200",
    icon: <WarningCircle size={14} weight="fill" className="text-amber-500" />,
  },
  Unavailable: {
    label: "Không khả dụng",
    color: "text-red-700",
    bg: "bg-red-500/10 border-red-200",
    icon: <XCircle size={14} weight="fill" className="text-red-500" />,
  },
};

const ITEMS_PER_PAGE = 12;

/* ── Main Page ── */

export default function AssemblyPointsPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    AssemblyPointStatus | "all"
  >("all");

  // Dialogs / sheets
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<AssemblyPointEntity | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    item: AssemblyPointEntity | null;
  }>({ open: false, item: null });

  // Ref for pushing content when panel opens
  const contentRef = useRef<HTMLDivElement>(null);
  const PANEL_WIDTH = 448; // sm:max-w-md = 28rem = 448px

  const handlePanelChange = useCallback(
    (open: boolean) => {
      if (contentRef.current) {
        contentRef.current.style.marginRight = open ? `${PANEL_WIDTH}px` : "0px";
        contentRef.current.style.transition = "margin-right 300ms cubic-bezier(0.32,0.72,0,1)";
      }
    },
    [],
  );

  // API
  const { data, isLoading } = useAssemblyPoints({
    params: { pageNumber: 1, pageSize: 200 },
  });
  const { mutate: deletePoint, isPending: isDeleting } =
    useDeleteAssemblyPoint();

  const items = useMemo(() => data?.items ?? [], [data]);

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.code.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((it) => it.status === statusFilter);
    }
    return result;
  }, [items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  // Counts
  const activeCount = items.filter((i) => i.status === "Active").length;
  const overloadedCount = items.filter(
    (i) => i.status === "Overloaded",
  ).length;
  const unavailableCount = items.filter(
    (i) => i.status === "Unavailable",
  ).length;

  const handleDelete = () => {
    if (!deleteDialog.item) return;
    deletePoint(deleteDialog.item.id, {
      onSuccess: () => {
        toast.success("Đã xóa điểm tập kết");
        setDeleteDialog({ open: false, item: null });
      },
      onError: () => toast.error("Xóa thất bại. Vui lòng thử lại."),
    });
  };

  const openEdit = (item: AssemblyPointEntity) => {
    setEditItem(item);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  const openDetail = (id: number) => {
    setDetailId(id);
    setDetailOpen(true);
    handlePanelChange(true);
  };

  return (
    <DashboardLayout favorites={[]} projects={[]} cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}>
      <div ref={contentRef} className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
             <div className="flex items-center gap-2.5 mb-1">
               <GarageIcon size={24} className="text-foreground" />
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Quản lý
            </p>
             </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Điểm tập kết
            </h1>
            <p className="text-base tracking-tighter text-muted-foreground mt-1.5">
              Quản lý các điểm tập kết cho đội cứu hộ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsRefreshing(true);
                queryClient.invalidateQueries().finally(() => setIsRefreshing(false));
              }}
              disabled={isRefreshing}
              className="gap-1.5 text-muted-foreground"
            >
              <ArrowClockwise size={15} className={isRefreshing ? "animate-spin" : ""} />
              Làm mới
            </Button>
            <Button
              onClick={openCreate}
              className="gap-2 tracking-tight bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/25"
            >
              <Plus size={16} weight="bold" />
              Tạo điểm tập kết
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Tổng điểm",
              value: items.length,
              icon: FlagBanner,
              color: "text-blue-600 dark:text-blue-400",
              bgColor: "bg-blue-50 dark:bg-blue-950/30",
            },
            {
              label: "Hoạt động",
              value: activeCount,
              icon: CheckCircle,
              color: "text-emerald-600 dark:text-emerald-400",
              bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
            },
            {
              label: "Quá tải",
              value: overloadedCount,
              icon: WarningCircle,
              color: "text-amber-600 dark:text-amber-400",
              bgColor: "bg-amber-50 dark:bg-amber-950/30",
            },
            {
              label: "Không khả dụng",
              value: unavailableCount,
              icon: XCircle,
              color: "text-rose-600 dark:text-rose-400",
              bgColor: "bg-rose-50 dark:bg-rose-950/30",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm tracking-tighter text-muted-foreground font-medium mb-1">
                        {stat.label}
                      </p>
                      <p className="text-2xl tracking-tighter font-bold text-foreground">
                        {isLoading ? "—" : stat.value}
                      </p>
                    </div>
                    <div
                      className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                    >
                      <Icon size={24} weight="fill" className={stat.color} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search & filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
           
            <Input
              placeholder="Tìm theo tên hoặc mã..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 tracking-tight"
            />
             <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { key: "all", label: "Tất cả" },
                { key: "Active", label: "Hoạt động" },
                { key: "Overloaded", label: "Quá tải" },
                { key: "Unavailable", label: "Không khả dụng" },
              ] as const
            ).map((opt) => (
              <Button
                key={opt.key}
                variant={statusFilter === opt.key ? "default" : "outline"}
                size="sm"
                className="h-9 text-sm tracking-tight"
                onClick={() => {
                  setStatusFilter(opt.key);
                  setPage(1);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Card grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-60" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : paged.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FlagBanner
                size={40}
                className="mx-auto text-muted-foreground/30 mb-3"
              />
              <p className="text-base text-muted-foreground tracking-tight">
                {search || statusFilter !== "all"
                  ? "Không tìm thấy điểm tập kết nào phù hợp"
                  : "Chưa có điểm tập kết nào. Hãy tạo mới!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map((point) => {
              const st = statusConfig[point.status];
              return (
                <Card
                  key={point.id}
                  className="group hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                  role="button"
                  onClick={() => openDetail(point.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-bold tracking-tighter truncate">
                          {point.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono tracking-tight mt-0.5">
                          {point.code}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-xs shrink-0", st.bg, st.color)}
                      >
                        {st.icon}
                        <span className="ml-1">{st.label}</span>
                      </Badge>
                    </div>

                    {/* Info rows */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground tracking-tight">
                        <MapPin size={13} className="text-red-500 shrink-0" />
                        <span className="font-mono truncate">
                          {point.latitude.toFixed(5)},{" "}
                          {point.longitude.toFixed(5)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground tracking-tight">
                        <UsersThree
                          size={13}
                          className="text-blue-500 shrink-0"
                        />
                        <span>
                          Sức chứa:{" "}
                          <span className="font-semibold text-foreground">
                            {point.maxCapacity}
                          </span>{" "}
                          người
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground tracking-tight">
                        <Clock size={13} className="shrink-0" />
                        <span>
                          {new Date(point.lastUpdatedAt).toLocaleDateString(
                            "vi-VN",
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 h-8 text-sm tracking-tight"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(point.id);
                        }}
                      >
                        <Eye size={13} />
                        Chi tiết
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8 text-sm tracking-tight"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(point);
                        }}
                      >
                        <PencilSimple size={13} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8 text-sm tracking-tight text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, item: point });
                        }}
                      >
                        <Trash size={13} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <CaretLeft size={14} />
            </Button>
            <span className="text-sm text-muted-foreground tracking-tight">
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <CaretRight size={14} />
            </Button>
          </div>
        )}
      </div>

      {/* Form Dialog (Create / Edit) */}
      <AssemblyPointFormDialog
        key={editItem?.id ?? "create"}
        open={formOpen}
        onOpenChange={(val) => {
          setFormOpen(val);
          if (!val) setEditItem(null);
        }}
        editItem={editItem}
      />

      {/* Detail Sheet */}
      <AssemblyPointDetailSheet
        open={detailOpen}
        onOpenChange={(val) => {
          setDetailOpen(val);
          handlePanelChange(val);
        }}
        pointId={detailId}
        onPanelChange={handlePanelChange}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(val) =>
          setDeleteDialog((prev) => ({ ...prev, open: val }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tighter">
              Xóa điểm tập kết
            </DialogTitle>
            <DialogDescription className="tracking-tight">
              Bạn có chắc muốn xóa{" "}
              <span className="font-semibold text-foreground">
                {deleteDialog.item?.name}
              </span>
              ? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteDialog({ open: false, item: null })
              }
              disabled={isDeleting}
              className="tracking-tight"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2 tracking-tight"
            >
              {isDeleting && <Spinner size={14} className="animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
