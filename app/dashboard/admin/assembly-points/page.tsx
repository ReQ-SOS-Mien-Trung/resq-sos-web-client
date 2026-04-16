"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MagnifyingGlass,
  Plus,
  MapPin,
  UsersThree,
  Clock,
  PencilSimple,
  Eye,
  FlagBanner,
  CheckCircle,
  WarningCircle,
  XCircle,
  CaretLeft,
  CaretRight,
  CaretDown,
  Check,
  Spinner,
  ArrowClockwise,
  GarageIcon,
} from "@phosphor-icons/react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import {
  AssemblyPointDetailSheet,
  AssemblyPointFormDialog,
} from "@/components/admin/assembly-points";
import {
  ASSEMBLY_POINT_STATUS_ORDER,
  buildAssemblyPointStatusConfig,
  getAssemblyPointStatusConfig,
} from "@/components/admin/assembly-points/status-config";
import {
  useActivateAssemblyPoint,
  useAssemblyPoints,
  useAssemblyPointStatuses,
  useCloseAssemblyPoint,
  useSetAssemblyPointAvailable,
  useSetAssemblyPointUnavailable,
} from "@/services/assembly_points";
import type {
  AssemblyPointEntity,
  AssemblyPointStatus,
} from "@/services/assembly_points";

const ITEMS_PER_PAGE = 12;

type AssemblyPointActionType =
  | "activate"
  | "setUnavailable"
  | "setAvailable"
  | "close";

function formatLastUpdated(date: string | null) {
  if (!date) return "Chưa cập nhật";
  return new Date(date).toLocaleDateString("vi-VN");
}

function getApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }

  return fallback;
}

function getAvailableAssemblyPointActions(
  status: AssemblyPointStatus,
): AssemblyPointActionType[] {
  switch (status) {
    case "Created":
      return ["activate", "close"];
    case "Available":
      return ["setUnavailable"];
    case "Unavailable":
      return ["setAvailable", "close"];
    default:
      return [];
  }
}

function getAssemblyPointActionLabel(action: AssemblyPointActionType): string {
  switch (action) {
    case "activate":
      return "Kích hoạt";
    case "setUnavailable":
      return "Đánh dấu không khả dụng";
    case "setAvailable":
      return "Đánh dấu khả dụng";
    case "close":
      return "Đóng vĩnh viễn";
  }
}

function getAssemblyPointActionDialogTitle(
  action: AssemblyPointActionType,
): string {
  switch (action) {
    case "activate":
      return "Kích hoạt điểm tập kết";
    case "setUnavailable":
      return "Đánh dấu điểm tập kết không khả dụng";
    case "setAvailable":
      return "Khôi phục điểm tập kết khả dụng";
    case "close":
      return "Đóng điểm tập kết";
  }
}

function getAssemblyPointActionDialogDescription(
  action: AssemblyPointActionType,
  pointName: string,
): string {
  switch (action) {
    case "activate":
      return `Kích hoạt "${pointName}" để chuyển từ trạng thái Mới tạo sang Khả dụng.`;
    case "setUnavailable":
      return `Chuyển "${pointName}" sang trạng thái Không khả dụng để tạm ngưng sử dụng điểm tập kết này.`;
    case "setAvailable":
      return `Đánh dấu "${pointName}" khả dụng trở lại từ trạng thái Không khả dụng.`;
    case "close":
      return `Đóng vĩnh viễn "${pointName}". Điểm tập kết đang Khả dụng phải chuyển sang Không khả dụng trước khi đóng. Nếu còn rescuer đang gán, hệ thống sẽ tự gỡ trước khi hoàn tất.`;
  }
}

function getAssemblyPointActionSuccessMessage(
  action: AssemblyPointActionType,
): string {
  switch (action) {
    case "activate":
      return "Kích hoạt điểm tập kết thành công!";
    case "setUnavailable":
      return "Đã chuyển điểm tập kết sang trạng thái không khả dụng!";
    case "setAvailable":
      return "Điểm tập kết đã khả dụng trở lại!";
    case "close":
      return "Đóng điểm tập kết thành công!";
  }
}

function getAssemblyPointActionErrorMessage(
  action: AssemblyPointActionType,
): string {
  switch (action) {
    case "activate":
      return "Không thể kích hoạt điểm tập kết.";
    case "setUnavailable":
      return "Không thể chuyển điểm tập kết sang trạng thái không khả dụng.";
    case "setAvailable":
      return "Không thể chuyển điểm tập kết sang trạng thái khả dụng.";
    case "close":
      return "Không thể đóng điểm tập kết.";
  }
}

function actionSupportsReason(action: AssemblyPointActionType): boolean {
  return action !== "activate";
}

function actionRequiresReason(action: AssemblyPointActionType): boolean {
  return action === "close";
}

export default function AssemblyPointsPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AssemblyPointStatus | null>(
    null,
  );
  const [statusOpen, setStatusOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<AssemblyPointEntity | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: AssemblyPointActionType | null;
    item: AssemblyPointEntity | null;
  }>({ open: false, action: null, item: null });

  const contentRef = useRef<HTMLDivElement>(null);
  const handlePanelChange = useCallback((state: {
    open: boolean;
    isFullscreen: boolean;
    dockedWidth: number;
  }) => {
    if (!contentRef.current) return;

    contentRef.current.style.marginRight = state.open
      ? `${state.dockedWidth}px`
      : "0px";
    contentRef.current.style.transition =
      "margin-right 380ms cubic-bezier(0.22,1,0.36,1)";
  }, []);

  const { data: summaryData } = useAssemblyPoints({
    params: { pageNumber: 1, pageSize: 200 },
  });
  const { data, isLoading } = useAssemblyPoints({
    params: {
      pageNumber: 1,
      pageSize: 200,
      status: selectedStatus ?? undefined,
    },
  });
  const { data: statusMetadata = [] } = useAssemblyPointStatuses();
  const activatePointMutation = useActivateAssemblyPoint();
  const setUnavailableMutation = useSetAssemblyPointUnavailable();
  const setAvailableMutation = useSetAssemblyPointAvailable();
  const closePointMutation = useCloseAssemblyPoint();

  const items = useMemo(() => data?.items ?? [], [data]);
  const allItems = useMemo(() => summaryData?.items ?? items, [summaryData, items]);
  const assemblyPointStatusConfig = useMemo(
    () => buildAssemblyPointStatusConfig(statusMetadata),
    [statusMetadata],
  );
  const isStatusActionPending =
    activatePointMutation.isPending ||
    setUnavailableMutation.isPending ||
    setAvailableMutation.isPending ||
    closePointMutation.isPending;

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

    return result;
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const availableCount = allItems.filter((i) => i.status === "Available").length;
  const createdCount = allItems.filter((i) => i.status === "Created").length;
  const unavailableCount = allItems.filter(
    (i) => i.status === "Unavailable",
  ).length;
  const closedCount = allItems.filter((i) => i.status === "Closed").length;

  const handleStatusAction = async () => {
    if (!actionDialog.item || !actionDialog.action) return;
    const trimmedReason = actionReason.trim();

    if (actionRequiresReason(actionDialog.action) && !trimmedReason) {
      toast.error("Vui lòng nhập lý do bắt buộc cho thao tác này.");
      return;
    }

    try {
      switch (actionDialog.action) {
        case "activate":
          await activatePointMutation.mutateAsync(actionDialog.item.id);
          break;
        case "setUnavailable":
          await setUnavailableMutation.mutateAsync({
            id: actionDialog.item.id,
            reason: trimmedReason || null,
          });
          break;
        case "setAvailable":
          await setAvailableMutation.mutateAsync({
            id: actionDialog.item.id,
            reason: trimmedReason || null,
          });
          break;
        case "close":
          await closePointMutation.mutateAsync({
            id: actionDialog.item.id,
            reason: trimmedReason,
          });
          break;
      }

      toast.success(getAssemblyPointActionSuccessMessage(actionDialog.action));
      setActionReason("");
      setActionDialog({ open: false, action: null, item: null });
    } catch (err) {
      toast.error(
        getApiError(
          err,
          getAssemblyPointActionErrorMessage(actionDialog.action),
        ),
      );
    }
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
  };

  return (
    <DashboardLayout
      favorites={[]}
      projects={[]}
      cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
    >
      <div ref={contentRef} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <GarageIcon size={24} className="text-foreground" />
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Quản lý điểm tập kết
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
                queryClient.invalidateQueries().finally(() => {
                  setIsRefreshing(false);
                });
              }}
              disabled={isRefreshing}
              className="gap-1.5 text-muted-foreground"
            >
              <ArrowClockwise
                size={15}
                className={isRefreshing ? "animate-spin" : ""}
              />
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

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {[
            {
              label: "Tổng số điểm tập kết",
              value: allItems.length,
              icon: "fa7-solid:people-roof",
              color: "text-blue-600 dark:text-blue-400",
              bgColor: "bg-blue-50 dark:bg-blue-950/30",
            },
            {
              label: assemblyPointStatusConfig.Available.label,
              value: availableCount,
              icon: CheckCircle,
              color: "text-emerald-600 dark:text-emerald-400",
              bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
            },
            {
              label: assemblyPointStatusConfig.Created.label,
              value: createdCount,
              icon: "tabler:plus",
              color: "text-sky-600 dark:text-sky-400",
              bgColor: "bg-sky-50 dark:bg-sky-950/30",
            },
            {
              label: assemblyPointStatusConfig.Unavailable.label,
              value: unavailableCount,
              icon: WarningCircle,
              color: "text-amber-600 dark:text-amber-400",
              bgColor: "bg-amber-50 dark:bg-amber-950/30",
            },
            {
              label: assemblyPointStatusConfig.Closed.label,
              value: closedCount,
              icon: XCircle,
              color: "text-violet-600 dark:text-violet-400",
              bgColor: "bg-violet-50 dark:bg-violet-950/30",
            },
          ].map((stat) => {
            const StatIcon = stat.icon;

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
                      {typeof StatIcon === "string" ? (
                        <Icon
                          icon={StatIcon}
                          width="640"
                          height="640"
                          className={cn("h-6 w-6", stat.color)}
                        />
                      ) : (
                        <StatIcon
                          size={24}
                          weight="fill"
                          className={stat.color}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Input
              placeholder="Tìm theo tên hoặc mã..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-9 h-8 tracking-tighter"
            />
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>

          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-normal h-8"
              >
                Trạng thái
                {selectedStatus ? (
                  <Badge className="h-5 max-w-32 truncate px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
                    {assemblyPointStatusConfig[selectedStatus]?.label ?? selectedStatus}
                  </Badge>
                ) : (
                  <CaretDown size={13} className="text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-52 p-1"
              align="start"
              sideOffset={4}
              avoidCollisions
              collisionPadding={16}
            >
              {ASSEMBLY_POINT_STATUS_ORDER.map((status) => {
                const checked = selectedStatus === status;

                return (
                  <button
                    key={status}
                    onClick={() => {
                      setPage(1);
                      setSelectedStatus((prev) => (prev === status ? null : status));
                      setStatusOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 text-sm rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <div
                      className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${checked ? "bg-primary border-primary" : "border-border"}`}
                    >
                      {checked && (
                        <Check
                          size={10}
                          weight="bold"
                          className="text-primary-foreground"
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-left leading-tight tracking-tighter text-black dark:text-white",
                        checked ? "font-medium" : "text-muted-foreground",
                      )}
                    >
                      {assemblyPointStatusConfig[status]?.label ?? status}
                    </span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {(search || selectedStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedStatus(null);
                setPage(1);
              }}
              className="text-muted-foreground gap-1 h-8"
            >
              <XCircle size={14} />
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}>
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
                {search || selectedStatus
                  ? "Không tìm thấy điểm tập kết nào phù hợp"
                  : "Chưa có điểm tập kết nào. Hãy tạo mới!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map((point) => {
              const statusConfig = getAssemblyPointStatusConfig(
                point.status,
                assemblyPointStatusConfig,
              );
              const availableActions = getAvailableAssemblyPointActions(
                point.status,
              );
              const canEdit =
                point.status !== "Closed" && point.status !== "Unavailable";

              return (
                <Card
                  key={point.id}
                  className="group py-0 hover:shadow-md hover:border-primary/60 transition-all cursor-pointer"
                  role="button"
                  onClick={() => openDetail(point.id)}
                >
                  <CardContent className="p-4 space-y-3">
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
                        className={cn(
                          "text-xs shrink-0",
                          statusConfig.bg,
                          statusConfig.color,
                        )}
                      >
                        {statusConfig.icon}
                        <span className="ml-1">{statusConfig.label}</span>
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-sm tracking-tighter">
                        <MapPin size={13} className="text-red-500 shrink-0" />
                        <span className="font-medium truncate">
                          {point.latitude.toFixed(5)},{" "}
                          {point.longitude.toFixed(5)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm tracking-tighter">
                        <UsersThree
                          size={13}
                          className="text-blue-500 shrink-0"
                        />
                        <span>
                          Sức chứa:{" "}
                          <span className="font-bold text-primary">
                            {point.maxCapacity}
                          </span>{" "}
                          người
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm tracking-tighter">
                        <Clock size={13} className="shrink-0" />
                        Cập nhật lần cuối:{" "}
                        <span>{formatLastUpdated(point.lastUpdatedAt)}</span>
                      </div>
                      {point.statusChangedAt && (
                        <div className="flex items-center gap-1.5 text-sm tracking-tighter text-muted-foreground">
                          <Clock size={13} className="shrink-0" />
                          Đổi trạng thái:{" "}
                          <span>{formatLastUpdated(point.statusChangedAt)}</span>
                        </div>
                      )}
                      {point.statusReason && (
                        <div className="rounded-md border border-amber-200/70 bg-amber-50/70 px-2.5 py-2 text-sm tracking-tight text-amber-900">
                          <span className="font-medium">Lý do:</span>{" "}
                          {point.statusReason}
                        </div>
                      )}
                    </div>

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
                      {canEdit && (
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
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              availableActions.length === 0 ||
                              isStatusActionPending
                            }
                            className="gap-1 h-8 px-2 text-sm tracking-tight"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ArrowClockwise
                              size={13}
                              className={
                                isStatusActionPending ? "animate-spin" : ""
                              }
                            />
                            <CaretDown size={12} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {availableActions.map((action) => (
                            <DropdownMenuItem
                              key={action}
                              variant={
                                action === "close" ? "destructive" : "default"
                              }
                              className="cursor-pointer"
                              onSelect={() => {
                                setActionDialog({
                                  open: true,
                                  action,
                                  item: point,
                                });
                                setActionReason("");
                              }}
                            >
                              {getAssemblyPointActionLabel(action)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
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
              onClick={() => setPage((currentPage) => currentPage + 1)}
            >
              <CaretRight size={14} />
            </Button>
          </div>
        )}
      </div>

      <AssemblyPointFormDialog
        key={editItem?.id ?? "create"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditItem(null);
        }}
        editItem={editItem}
      />

      <AssemblyPointDetailSheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
        }}
        pointId={detailId}
        onPanelChange={handlePanelChange}
        statusMetadata={statusMetadata}
      />

      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          if (open) return;
          setActionDialog({ open: false, action: null, item: null });
          setActionReason("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tighter">
              {actionDialog.action
                ? getAssemblyPointActionDialogTitle(actionDialog.action)
                : "Cập nhật trạng thái điểm tập kết"}
            </DialogTitle>
            <DialogDescription className="tracking-tight">
              {actionDialog.action && actionDialog.item
                ? getAssemblyPointActionDialogDescription(
                    actionDialog.action,
                    actionDialog.item.name,
                  )
                : "Xác nhận thao tác với điểm tập kết này."}
            </DialogDescription>
          </DialogHeader>
          {actionDialog.action && actionSupportsReason(actionDialog.action) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium tracking-tight text-foreground">
                  Lý do {actionRequiresReason(actionDialog.action) ? "*" : ""}
                </p>
                <span className="text-xs text-muted-foreground">
                  {actionRequiresReason(actionDialog.action)
                    ? "Bắt buộc"
                    : "Không bắt buộc"}
                </span>
              </div>
              <Textarea
                value={actionReason}
                onChange={(event) => setActionReason(event.target.value)}
                placeholder={
                  actionDialog.action === "setUnavailable"
                    ? "Ví dụ: Đang sửa chữa"
                    : actionDialog.action === "setAvailable"
                      ? "Ví dụ: Đã sửa xong"
                      : "Nhập lý do đóng điểm tập kết"
                }
                rows={4}
                disabled={isStatusActionPending}
              />
              <p className="text-xs text-muted-foreground tracking-tight">
                {actionDialog.action === "close"
                  ? "API yêu cầu lý do đóng không được để trống."
                  : "Bạn có thể để trống nếu không cần ghi chú thêm."}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, action: null, item: null });
                setActionReason("");
              }}
              disabled={isStatusActionPending}
              className="tracking-tight"
            >
              Hủy
            </Button>
            <Button
              variant={
                actionDialog.action === "close" ? "destructive" : "default"
              }
              onClick={handleStatusAction}
              disabled={
                isStatusActionPending ||
                Boolean(
                  actionDialog.action &&
                    actionRequiresReason(actionDialog.action) &&
                    !actionReason.trim(),
                )
              }
              className="gap-2 tracking-tight"
            >
              {isStatusActionPending && (
                <Spinner size={14} className="animate-spin" />
              )}
              {actionDialog.action
                ? getAssemblyPointActionLabel(actionDialog.action)
                : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
