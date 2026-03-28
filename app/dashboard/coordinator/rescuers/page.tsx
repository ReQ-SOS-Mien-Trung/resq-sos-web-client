"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  MagnifyingGlass,
  MapPin,
  UsersThree,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useRescuers } from "@/services/rescuers/hooks";
import type { GetRescuersParams } from "@/services/rescuers/type";
import {
  useAssemblyPointMetadata,
  useUpdateRescuerAssemblyPointAssignment,
} from "@/services/assembly_points/hooks";

const DEFAULT_RESCUER_AVATAR =
  "https://res.cloudinary.com/dezgwdrfs/image/upload/v1773504004/611251674_1432765175119052_6622750233977483141_n_sgxqxd.png";
const ASSIGNED_SELECT_VALUE = "__assigned__";
const UNASSIGN_SELECT_VALUE = "__unassign__";

type AssignmentFilter = "all" | "assigned" | "unassigned";
type TeamFilter = "all" | "inTeam" | "notInTeam";
type RescuerTypeFilter = "all" | "Core" | "Volunteer";
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

export default function CoordinatorRescuerManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>("all");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [rescuerTypeFilter, setRescuerTypeFilter] =
    useState<RescuerTypeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [rowSelectedAssemblyPointIds, setRowSelectedAssemblyPointIds] =
    useState<Record<string, string>>({});
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [selectedRescuerIds, setSelectedRescuerIds] = useState<string[]>([]);
  const [bulkSelectedAssemblyPointId, setBulkSelectedAssemblyPointId] =
    useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const rescuerParams = useMemo<
    Omit<GetRescuersParams, "pageNumber" | "pageSize">
  >(() => {
    const params: Omit<GetRescuersParams, "pageNumber" | "pageSize"> = {};

    if (assignmentFilter !== "all") {
      params.hasAssemblyPoint = assignmentFilter === "assigned";
    }

    if (teamFilter !== "all") {
      params.hasTeam = teamFilter === "inTeam";
    }

    if (rescuerTypeFilter !== "all") {
      params.rescuerType = rescuerTypeFilter;
    }

    return params;
  }, [assignmentFilter, teamFilter, rescuerTypeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [assignmentFilter, teamFilter, rescuerTypeFilter, pageSize]);

  const {
    data: rescuersData,
    isLoading: isRescuersLoading,
    isError: isRescuersError,
    refetch,
    isRefetching,
  } = useRescuers({
    params: {
      ...rescuerParams,
      pageNumber: currentPage,
      pageSize,
    },
    enabled: true,
  });

  const { data: assemblyPointOptions, isLoading: isAssemblyPointLoading } =
    useAssemblyPointMetadata({ enabled: true });

  const { mutateAsync: updateAssignment, isPending: isUpdatingAssignment } =
    useUpdateRescuerAssemblyPointAssignment();

  const rescuers = useMemo(() => rescuersData?.items ?? [], [rescuersData]);
  const totalPages = rescuersData?.totalPages ?? 1;
  const totalCount = rescuersData?.totalCount ?? rescuers.length;

  const filteredRescuers = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) {
      return rescuers;
    }

    return rescuers.filter((rescuer) => {
      const firstName = rescuer.firstName?.toLowerCase() ?? "";
      const lastName = rescuer.lastName?.toLowerCase() ?? "";
      const email = rescuer.email?.toLowerCase() ?? "";
      const fullName = `${firstName} ${lastName}`.trim();

      return (
        firstName.includes(keyword) ||
        lastName.includes(keyword) ||
        email.includes(keyword) ||
        fullName.includes(keyword)
      );
    });
  }, [rescuers, searchQuery]);

  useEffect(() => {
    const visibleRescuerIds = new Set(
      filteredRescuers.map((rescuer) => rescuer.id),
    );

    setSelectedRescuerIds((previous) =>
      previous.filter((rescuerId) => visibleRescuerIds.has(rescuerId)),
    );
  }, [filteredRescuers]);

  const assemblyPointNameById = useMemo(() => {
    const entries = (assemblyPointOptions ?? [])
      .map((option) => {
        const pointId = Number(option.key);
        if (Number.isNaN(pointId)) {
          return null;
        }

        return [pointId, option.value] as const;
      })
      .filter((entry): entry is readonly [number, string] => entry !== null);

    return new Map<number, string>(entries);
  }, [assemblyPointOptions]);

  const assignedCount = useMemo(
    () => rescuers.filter((rescuer) => rescuer.hasAssemblyPoint).length,
    [rescuers],
  );

  const selectedRescuerIdSet = useMemo(
    () => new Set(selectedRescuerIds),
    [selectedRescuerIds],
  );

  const selectedVisibleRescuerCount = useMemo(
    () =>
      filteredRescuers.reduce(
        (count, rescuer) =>
          count + (selectedRescuerIdSet.has(rescuer.id) ? 1 : 0),
        0,
      ),
    [filteredRescuers, selectedRescuerIdSet],
  );

  const areAllVisibleRescuersSelected =
    filteredRescuers.length > 0 &&
    selectedVisibleRescuerCount === filteredRescuers.length;
  const hasPartialVisibleSelection =
    selectedVisibleRescuerCount > 0 && !areAllVisibleRescuersSelected;
  const isAssignmentBusy = isUpdatingAssignment || isBulkUpdating;

  const pageItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: Array<number | "dots-left" | "dots-right"> = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
      pages.push("dots-left");
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (end < totalPages - 1) {
      pages.push("dots-right");
    }

    pages.push(totalPages);

    return pages;
  }, [currentPage, totalPages]);

  const handleSaveAssignment = async (
    userId: string,
    selectedAssemblyPointId: string,
  ) => {
    if (!selectedAssemblyPointId) {
      toast.error("Vui lòng chọn thao tác trước khi lưu.");
      return;
    }

    try {
      setPendingUserId(userId);

      if (selectedAssemblyPointId === UNASSIGN_SELECT_VALUE) {
        await updateAssignment({ userId, assemblyPointId: null });
        toast.success("Đã bỏ phân công rescuer khỏi điểm tập kết.");
      } else {
        const pointId = Number(selectedAssemblyPointId);
        if (Number.isNaN(pointId)) {
          toast.error("Điểm tập kết không hợp lệ.");
          return;
        }

        await updateAssignment({ userId, assemblyPointId: pointId });
        toast.success("Đã lưu rescuer vào điểm tập kết.");
      }

      setRowSelectedAssemblyPointIds((previous) => ({
        ...previous,
        [userId]: "",
      }));
      setSelectedRescuerIds((previous) =>
        previous.filter((rescuerId) => rescuerId !== userId),
      );
      await refetch();
    } catch {
      toast.error("Không thể cập nhật phân công. Vui lòng thử lại.");
    } finally {
      setPendingUserId(null);
    }
  };

  const handleToggleRescuerSelection = (
    rescuerId: string,
    shouldSelect: boolean,
  ) => {
    setSelectedRescuerIds((previous) => {
      if (shouldSelect) {
        return previous.includes(rescuerId)
          ? previous
          : [...previous, rescuerId];
      }

      return previous.filter((id) => id !== rescuerId);
    });
  };

  const handleToggleSelectAllVisible = (shouldSelect: boolean) => {
    setSelectedRescuerIds(
      shouldSelect ? filteredRescuers.map((rescuer) => rescuer.id) : [],
    );
  };

  const handleBulkSaveAssignment = async () => {
    if (selectedRescuerIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một rescuer.");
      return;
    }

    if (!bulkSelectedAssemblyPointId) {
      toast.error("Vui lòng chọn thao tác trước khi áp dụng hàng loạt.");
      return;
    }

    const nextAssemblyPointId =
      bulkSelectedAssemblyPointId === UNASSIGN_SELECT_VALUE
        ? null
        : Number(bulkSelectedAssemblyPointId);

    if (
      nextAssemblyPointId !== null &&
      Number.isNaN(nextAssemblyPointId)
    ) {
      toast.error("Điểm tập kết không hợp lệ.");
      return;
    }

    const targetRescuerIds = [...selectedRescuerIds];

    try {
      setIsBulkUpdating(true);

      const results = await Promise.allSettled(
        targetRescuerIds.map((userId) =>
          updateAssignment({
            userId,
            assemblyPointId: nextAssemblyPointId,
          }),
        ),
      );

      const failedRescuerIds = results.flatMap((result, index) =>
        result.status === "rejected" ? [targetRescuerIds[index]] : [],
      );
      const successCount = results.length - failedRescuerIds.length;

      setRowSelectedAssemblyPointIds((previous) => {
        const nextSelections = { ...previous };

        for (const userId of targetRescuerIds) {
          nextSelections[userId] = "";
        }

        return nextSelections;
      });
      setSelectedRescuerIds(failedRescuerIds);
      setBulkSelectedAssemblyPointId("");

      if (successCount > 0) {
        toast.success(
          nextAssemblyPointId === null
            ? `Đã bỏ gán ${successCount} rescuer khỏi điểm tập kết.`
            : `Đã thêm ${successCount} rescuer vào điểm tập kết.`,
        );
        await refetch();
      }

      if (failedRescuerIds.length > 0) {
        toast.error(
          `Có ${failedRescuerIds.length} rescuer chưa được cập nhật. Vui lòng thử lại.`,
        );
      }
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#FF5722]">
              Coordinator Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Quản lý rescuer theo điểm tập kết
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gán hoặc bỏ gán rescuer vào assembly point bằng dữ liệu thời gian
              thực.
            </p>
          </div>

          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/coordinator">
              <ArrowLeft className="h-4 w-4" />
              Quay về bản đồ điều phối
            </Link>
          </Button>
        </div>

        <div className="grid gap-2.5 md:grid-cols-3">
          <Card className="border-black/10 shadow-none">
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tổng rescuer đã tải
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">
                  {rescuers.length}
                </p>
              </div>
              <UsersThree className="h-6 w-6 text-black/70" />
            </CardContent>
          </Card>

          <Card className="border-black/10 shadow-none">
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Đã có điểm tập kết
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">
                  {assignedCount}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </CardContent>
          </Card>

          <Card className="border-black/10 shadow-none">
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Chưa phân công
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">
                  {Math.max(0, rescuers.length - assignedCount)}
                </p>
              </div>
              <WarningCircle className="h-6 w-6 text-[#FF5722]" />
            </CardContent>
          </Card>
        </div>

        <Card className="border-black/10 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base tracking-tight">
              Tìm kiếm và bộ lọc rescuer
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#FF5722]"
                weight="bold"
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 border-[#FF5722]/30 pl-10 focus-visible:ring-[#FF5722]/25"
                placeholder="Tìm theo tên hoặc email"
              />
            </div>

            <Select
              value={assignmentFilter}
              onValueChange={(value) =>
                setAssignmentFilter(value as AssignmentFilter)
              }
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Lọc phân công" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả rescuer</SelectItem>
                <SelectItem value="assigned">Đã có điểm tập kết</SelectItem>
                <SelectItem value="unassigned">Chưa có điểm tập kết</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={teamFilter}
              onValueChange={(value) => setTeamFilter(value as TeamFilter)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Lọc theo team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="inTeam">Đã vào team</SelectItem>
                <SelectItem value="notInTeam">Chưa vào team</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={rescuerTypeFilter}
              onValueChange={(value) =>
                setRescuerTypeFilter(value as RescuerTypeFilter)
              }
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Lọc theo loại rescuer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="Core">Nhân viên cố định</SelectItem>
                <SelectItem value="Volunteer">Tình nguyện</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-black/10 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base tracking-tight">
              Danh sách rescuer ({filteredRescuers.length})
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <ArrowsClockwise
                className={cn("h-4 w-4", isRefetching && "animate-spin")}
              />
              Làm mới
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            {!isRescuersLoading && !isRescuersError && filteredRescuers.length > 0 ? (
              <div className="rounded-lg border border-[#FF5722]/15 bg-[#FF5722]/[0.04] p-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="select-all-visible-rescuers"
                      className="flex items-center gap-2 text-sm font-medium tracking-tight"
                    >
                      <Checkbox
                        id="select-all-visible-rescuers"
                        checked={
                          areAllVisibleRescuersSelected
                            ? true
                            : hasPartialVisibleSelection
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(checked) =>
                          handleToggleSelectAllVisible(checked === true)
                        }
                        disabled={isAssignmentBusy}
                        className="border-[#FF5722]/40 data-[state=checked]:border-[#FF5722] data-[state=checked]:bg-[#FF5722]"
                      />
                      <span>Chọn tất cả trên danh sách hiện tại</span>
                    </label>

                    <Badge
                      variant="outline"
                      className="border-[#FF5722]/25 bg-white text-[#C2410C]"
                    >
                      {selectedVisibleRescuerCount} rescuer đã chọn
                    </Badge>

                    {selectedVisibleRescuerCount > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRescuerIds([])}
                        disabled={isAssignmentBusy}
                        className="h-8 px-2 text-muted-foreground"
                      >
                        Bỏ chọn
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-2xl">
                    <Select
                      value={bulkSelectedAssemblyPointId}
                      onValueChange={setBulkSelectedAssemblyPointId}
                      disabled={isAssignmentBusy || selectedVisibleRescuerCount === 0}
                    >
                      <SelectTrigger className="h-9 w-full sm:flex-1">
                        <SelectValue
                          placeholder={
                            isAssemblyPointLoading
                              ? "Đang tải điểm tập kết..."
                              : "Chọn điểm tập kết cho nhóm đã chọn"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGN_SELECT_VALUE}>
                          Bỏ gán khỏi điểm tập kết
                        </SelectItem>
                        {(assemblyPointOptions ?? []).map((point) => (
                          <SelectItem key={point.key} value={point.key}>
                            {point.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      className="h-9 gap-2 bg-[#FF5722] text-white hover:bg-[#FF5722]/90"
                      onClick={handleBulkSaveAssignment}
                      disabled={
                        isAssignmentBusy ||
                        selectedVisibleRescuerCount === 0 ||
                        !bulkSelectedAssemblyPointId
                      }
                    >
                      <MapPin className="h-4 w-4" />
                      Áp dụng cho nhóm đã chọn
                    </Button>
                  </div>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Coordinator có thể tick nhiều rescuer rồi gán chung vào cùng
                  một assembly point ngay trên trang hiện tại.
                </p>
              </div>
            ) : null}

            {isRescuersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-20 w-full" />
                ))}
              </div>
            ) : isRescuersError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                Không thể tải danh sách rescuer.
              </div>
            ) : filteredRescuers.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Không tìm thấy rescuer phù hợp với điều kiện hiện tại.
              </div>
            ) : (
              <>
                {filteredRescuers.map((rescuer) => {
                  const isRowPending = pendingUserId === rescuer.id;
                  const isRowSelected = selectedRescuerIdSet.has(rescuer.id);
                  const fullName = `${rescuer.firstName} ${rescuer.lastName}`;
                  const assemblyPointName =
                    rescuer.assemblyPointId != null
                      ? (assemblyPointNameById.get(rescuer.assemblyPointId) ??
                        `Điểm tập kết #${rescuer.assemblyPointId}`)
                      : null;
                  const hasAssemblyPointOption =
                    rescuer.assemblyPointId != null &&
                    assemblyPointNameById.has(rescuer.assemblyPointId);
                  const rawRowSelectedAssemblyPointId =
                    rowSelectedAssemblyPointIds[rescuer.id] ?? "";
                  const assignedAssemblyPointValue =
                    rescuer.assemblyPointId != null
                      ? String(rescuer.assemblyPointId)
                      : ASSIGNED_SELECT_VALUE;
                  const rowSelectedAssemblyPointId =
                    rawRowSelectedAssemblyPointId ||
                    (rescuer.hasAssemblyPoint
                      ? assignedAssemblyPointValue
                      : "");

                  return (
                    <div
                      key={rescuer.id}
                      className={cn(
                        "rounded-lg border border-border bg-card p-2.5 transition-colors md:p-3",
                        isRowSelected && "border-[#FF5722]/35 bg-[#FF5722]/[0.03]",
                      )}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-9 items-center">
                            <Checkbox
                              checked={isRowSelected}
                              onCheckedChange={(checked) =>
                                handleToggleRescuerSelection(
                                  rescuer.id,
                                  checked === true,
                                )
                              }
                              disabled={isAssignmentBusy}
                              aria-label={`Chọn rescuer ${fullName}`}
                              className="border-[#FF5722]/40 data-[state=checked]:border-[#FF5722] data-[state=checked]:bg-[#FF5722]"
                            />
                          </div>

                          <Avatar className="h-9 w-9 border border-black/10">
                            <AvatarImage
                              src={rescuer.avatarUrl ?? DEFAULT_RESCUER_AVATAR}
                              alt={fullName}
                            />
                            <AvatarFallback>
                              {getInitials(rescuer.firstName, rescuer.lastName)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tracking-tight">
                              {fullName}
                            </p>

                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {rescuer.phone ? (
                                <span>{rescuer.phone}</span>
                              ) : null}
                              {rescuer.email ? (
                                <span>{rescuer.email}</span>
                              ) : null}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border px-2 py-0.5 text-[10px]",
                                  rescuer.hasAssemblyPoint
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : "border-amber-300 bg-amber-50 text-amber-700",
                                )}
                              >
                                {rescuer.hasAssemblyPoint
                                  ? "Đã có điểm tập kết"
                                  : "Chưa có điểm tập kết"}
                              </Badge>

                              <Badge
                                variant="outline"
                                className={cn(
                                  "border px-2 py-0.5 text-[10px]",
                                  rescuer.hasTeam
                                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                    : "border-slate-300 bg-slate-50 text-slate-700",
                                )}
                              >
                                {rescuer.hasTeam
                                  ? "Đã vào team"
                                  : "Chưa vào team"}
                              </Badge>

                              {rescuer.rescuerType ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "border px-2 py-0.5 text-[10px] font-semibold",
                                    rescuer.rescuerType === "Core"
                                      ? "border-sky-300 bg-sky-50 text-sky-700"
                                      : "border-[#FF5722]/40 bg-[#FF5722]/10 text-[#C2410C]",
                                  )}
                                >
                                  {rescuer.rescuerType === "Core"
                                    ? "Nhân viên cố định"
                                    : "Tình nguyện"}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          <Select
                            value={rowSelectedAssemblyPointId}
                            onValueChange={(value) =>
                              setRowSelectedAssemblyPointIds((previous) => ({
                                ...previous,
                                [rescuer.id]: value,
                              }))
                            }
                            disabled={isAssignmentBusy}
                          >
                            <SelectTrigger className="h-8 w-55">
                              <SelectValue
                                placeholder={
                                  isAssemblyPointLoading
                                    ? "Đang tải điểm tập kết..."
                                    : "Chọn điểm tập kết"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {rescuer.hasAssemblyPoint &&
                              !rawRowSelectedAssemblyPointId &&
                              !hasAssemblyPointOption ? (
                                <SelectItem
                                  value={assignedAssemblyPointValue}
                                  disabled
                                >
                                  {assemblyPointName ?? "Đã có điểm tập kết"}
                                </SelectItem>
                              ) : null}
                              <SelectItem value={UNASSIGN_SELECT_VALUE}>
                                Bỏ gán khỏi điểm tập kết
                              </SelectItem>
                              {(assemblyPointOptions ?? []).map((point) => (
                                <SelectItem key={point.key} value={point.key}>
                                  {point.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-[#FF5722]/35 text-[#FF5722] hover:bg-[#FF5722]/10"
                            onClick={() =>
                              handleSaveAssignment(
                                rescuer.id,
                                rawRowSelectedAssemblyPointId,
                              )
                            }
                            disabled={
                              isAssignmentBusy ||
                              isRowPending ||
                              !rawRowSelectedAssemblyPointId
                            }
                          >
                            <MapPin className="mr-1 h-3.5 w-3.5" />
                            Lưu thay đổi
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {totalPages > 1 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        Trang {currentPage}/{Math.max(totalPages, 1)} • Tổng{" "}
                        {totalCount} rescuer
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          Hiển thị
                        </span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(value) => setPageSize(Number(value))}
                        >
                          <SelectTrigger className="h-8 w-22">
                            <SelectValue placeholder="20" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((option) => (
                              <SelectItem key={option} value={String(option)}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">
                          / trang
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((previous) =>
                            Math.max(1, previous - 1),
                          )
                        }
                        disabled={currentPage <= 1 || isRefetching}
                      >
                        Trước
                      </Button>

                      {pageItems.map((item) => {
                        if (item === "dots-left" || item === "dots-right") {
                          return (
                            <span
                              key={item}
                              className="px-2 text-xs text-muted-foreground"
                            >
                              ...
                            </span>
                          );
                        }

                        const isActive = item === currentPage;

                        return (
                          <Button
                            key={item}
                            type="button"
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            className={cn(
                              "min-w-9 px-2",
                              isActive &&
                                "bg-[#FF5722] text-white hover:bg-[#FF5722]/90",
                            )}
                            onClick={() => setCurrentPage(item)}
                            disabled={isRefetching}
                          >
                            {item}
                          </Button>
                        );
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((previous) =>
                            Math.min(Math.max(totalPages, 1), previous + 1),
                          )
                        }
                        disabled={currentPage >= totalPages || isRefetching}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <p className="text-[11px] text-muted-foreground">
              Gợi ý: ô tìm kiếm đang lọc trực tiếp ở frontend theo
              firstName/lastName/email trên dữ liệu đã tải của trang hiện tại;
              các filter hasAssemblyPoint/hasTeam/rescuerType vẫn truy vấn
              backend.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
