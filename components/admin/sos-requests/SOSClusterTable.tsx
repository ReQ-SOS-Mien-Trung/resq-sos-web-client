"use client";

import { Fragment, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ArrowsClockwise,
  CaretDown,
  CaretRight,
  Clock,
  Eye,
  ForkKnife,
  Stethoscope,
  Users,
  WarningCircle,
  Waves,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { deriveSOSNeeds, getSituationLabel, getSosTypeLabel } from "@/lib/sos";
import type { SOSRequestEntity } from "@/services/sos_request/type";
import type {
  ClusterLifecycleStatus,
  ClusterSeverityLevel,
  SOSClusterEntity,
} from "@/services/sos_cluster/type";

const CLUSTER_SEVERITY_SORT_ORDER: Record<ClusterSeverityLevel, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const CLUSTER_SEVERITY_LABELS: Record<ClusterSeverityLevel, string> = {
  Critical: "Rất nghiêm trọng",
  High: "Nghiêm trọng",
  Medium: "Trung bình",
  Low: "Thấp",
};

const CLUSTER_SEVERITY_BADGE_CLASS: Record<ClusterSeverityLevel, string> = {
  Critical: "border-red-300 bg-red-50 text-red-700",
  High: "border-orange-300 bg-orange-50 text-orange-700",
  Medium: "border-amber-300 bg-amber-50 text-amber-700",
  Low: "border-teal-300 bg-teal-50 text-teal-700",
};

const CLUSTER_STATUS_SORT_ORDER: Record<ClusterLifecycleStatus, number> = {
  InProgress: 0,
  Suggested: 1,
  Pending: 2,
  Completed: 3,
};

const CLUSTER_STATUS_LABELS: Record<ClusterLifecycleStatus, string> = {
  Pending: "Chờ AI phân tích",
  Suggested: "Đã có gợi ý AI",
  InProgress: "Đang thực hiện",
  Completed: "Đã hoàn thành",
};

const CLUSTER_STATUS_BADGE_CLASS: Record<ClusterLifecycleStatus, string> = {
  Pending: "border-slate-300 bg-slate-100 text-slate-700",
  Suggested: "border-violet-300 bg-violet-100 text-violet-700",
  InProgress: "border-blue-300 bg-blue-100 text-blue-700",
  Completed: "border-emerald-300 bg-emerald-100 text-emerald-700",
};

const SOS_PRIORITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const SOS_PRIORITY_LABELS: Record<string, string> = {
  Critical: "Nguy cấp",
  High: "Cao",
  Medium: "Trung bình",
  Low: "Thấp",
};

const SOS_PRIORITY_BADGE_CLASS: Record<string, string> = {
  Critical: "border-red-300 bg-red-50 text-red-700",
  High: "border-orange-300 bg-orange-50 text-orange-700",
  Medium: "border-amber-300 bg-amber-50 text-amber-700",
  Low: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

const SOS_STATUS_LABELS: Record<string, string> = {
  Pending: "Chờ xử lý",
  Assigned: "Đã giao",
  InProgress: "Đang thực thi",
  Incident: "Sự cố",
  Resolved: "Đã giải quyết",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
};

const SOS_STATUS_BADGE_CLASS: Record<string, string> = {
  Pending: "border-amber-300 bg-amber-50 text-amber-700",
  Assigned: "border-blue-300 bg-blue-50 text-blue-700",
  InProgress: "border-blue-300 bg-blue-50 text-blue-700",
  Incident: "border-orange-300 bg-orange-50 text-orange-700",
  Resolved: "border-teal-300 bg-teal-50 text-teal-700",
  Completed: "border-emerald-300 bg-emerald-50 text-emerald-700",
  Cancelled: "border-slate-300 bg-slate-100 text-slate-700",
};

function resolveClusterStatus(
  cluster: SOSClusterEntity,
): ClusterLifecycleStatus {
  if (
    cluster.status === "Pending" ||
    cluster.status === "Suggested" ||
    cluster.status === "InProgress" ||
    cluster.status === "Completed"
  ) {
    return cluster.status;
  }

  return cluster.isMissionCreated ? "InProgress" : "Pending";
}

function timeAgo(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "-";
  }

  return formatDistanceToNow(timestamp, {
    addSuffix: true,
    locale: vi,
  });
}

function compareSOS(left: SOSRequestEntity, right: SOSRequestEntity): number {
  const priorityDelta =
    (SOS_PRIORITY_ORDER[left.priorityLevel] ?? 99) -
    (SOS_PRIORITY_ORDER[right.priorityLevel] ?? 99);

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

export interface ServerPaginationProps {
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export interface SOSClusterTableProps {
  clusters: SOSClusterEntity[];
  isLoading?: boolean;
  isRefetching?: boolean;
  serverPagination?: ServerPaginationProps;
  expandedClusterIds: Set<number>;
  onToggleCluster: (clusterId: number) => void;
  clusterSOSMap: Map<number, SOSRequestEntity[]>;
  clusterSOSLoadingMap?: Map<number, boolean>;
  clusterSOSFailedIdsMap?: Map<number, number[]>;
  onSOSSelect?: (sos: SOSRequestEntity) => void;
  onViewCompletedClusterPlan?: (clusterId: number) => void;
}

const SOSClusterTable = ({
  clusters,
  isLoading = false,
  isRefetching = false,
  serverPagination,
  expandedClusterIds,
  onToggleCluster,
  clusterSOSMap,
  clusterSOSLoadingMap,
  clusterSOSFailedIdsMap,
  onSOSSelect,
  onViewCompletedClusterPlan,
}: SOSClusterTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const isServerMode = Boolean(serverPagination);
  const currentPage = isServerMode ? serverPagination!.page : 1;
  const currentPageSize = isServerMode ? serverPagination!.pageSize : 10;
  const totalPages = isServerMode
    ? Math.max(1, serverPagination!.totalPages)
    : 1;
  const safePage = Math.min(currentPage, totalPages);

  const visibleClusters = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return [...clusters]
      .filter((cluster) => {
        const clusterStatus = resolveClusterStatus(cluster);

        if (statusFilter !== "all" && clusterStatus !== statusFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          String(cluster.id).includes(normalizedSearch) ||
          cluster.sosRequestIds.some((sosId) =>
            String(sosId).includes(normalizedSearch),
          )
        );
      })
      .sort((left, right) => {
        const severityDelta =
          CLUSTER_SEVERITY_SORT_ORDER[left.severityLevel] -
          CLUSTER_SEVERITY_SORT_ORDER[right.severityLevel];

        if (severityDelta !== 0) {
          return severityDelta;
        }

        const statusDelta =
          CLUSTER_STATUS_SORT_ORDER[resolveClusterStatus(left)] -
          CLUSTER_STATUS_SORT_ORDER[resolveClusterStatus(right)];

        if (statusDelta !== 0) {
          return statusDelta;
        }

        return Date.parse(right.lastUpdatedAt) - Date.parse(left.lastUpdatedAt);
      });
  }, [clusters, searchQuery, statusFilter]);

  const hasFilters = searchQuery.trim().length > 0 || statusFilter !== "all";
  const displayTotalCount = isServerMode
    ? serverPagination!.totalCount
    : visibleClusters.length;
  const startItem =
    displayTotalCount === 0 ? 0 : (safePage - 1) * currentPageSize + 1;
  const endItem = Math.min(safePage * currentPageSize, displayTotalCount);

  const setPage = (page: number) => {
    if (!isServerMode) {
      return;
    }

    serverPagination!.onPageChange(page);
  };

  const setPageSize = (size: number) => {
    if (!isServerMode) {
      return;
    }

    serverPagination!.onPageSizeChange(size);
  };

  return (
    <Card className="border border-border/50 shadow-none">
      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border/40 pb-4">
          <div className="min-w-60 flex-1">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm theo mã cụm hoặc mã SOS"
              className="h-9 text-sm"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-52">
              <SelectValue placeholder="Lọc trạng thái cụm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="Pending">Chờ AI phân tích</SelectItem>
              <SelectItem value="Suggested">Đã có gợi ý AI</SelectItem>
              <SelectItem value="InProgress">Đang thực hiện</SelectItem>
              <SelectItem value="Completed">Đã hoàn thành</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            {isRefetching ? (
              <ArrowsClockwise className="h-4 w-4 animate-spin" />
            ) : null}
            <span>
              {hasFilters && isServerMode
                ? `${visibleClusters.length} / ${displayTotalCount.toLocaleString("vi-VN")} cụm`
                : `${displayTotalCount.toLocaleString("vi-VN")} cụm`}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-230">
            <thead>
              <tr className="border-b border-border/50 text-left">
                <th className="p-3 text-sm font-semibold tracking-tight">
                  Cụm SOS
                </th>
                <th className="p-3 text-sm font-semibold tracking-tight">
                  Mức độ
                </th>
                <th className="p-3 text-sm font-semibold tracking-tight">
                  Trạng thái
                </th>
                <th className="p-3 text-sm font-semibold tracking-tight">
                  Số SOS
                </th>
                <th className="p-3 text-sm font-semibold tracking-tight">
                  Ước tính nạn nhân
                </th>
                <th className="p-3 text-sm font-semibold tracking-tight">
                  Cập nhật
                </th>
                <th className="p-3 text-right text-sm font-semibold tracking-tight">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr
                    key={`loading-${index}`}
                    className="border-b border-border/30"
                  >
                    <td colSpan={7} className="p-3">
                      <Skeleton className="h-9 w-full" />
                    </td>
                  </tr>
                ))
              ) : visibleClusters.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-sm text-muted-foreground"
                  >
                    Không có cụm SOS nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                visibleClusters.map((cluster) => {
                  const clusterStatus = resolveClusterStatus(cluster);
                  const expanded = expandedClusterIds.has(cluster.id);
                  const sosItems = [
                    ...(clusterSOSMap.get(cluster.id) ?? []),
                  ].sort(compareSOS);
                  const isClusterSOSLoading =
                    clusterSOSLoadingMap?.get(cluster.id) ?? false;
                  const failedIds =
                    clusterSOSFailedIdsMap?.get(cluster.id) ?? [];

                  return (
                    <Fragment key={`cluster-group-${cluster.id}`}>
                      <tr
                        key={`cluster-${cluster.id}`}
                        className="border-b border-border/30 align-top"
                      >
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => onToggleCluster(cluster.id)}
                            className="flex items-center gap-2 text-left text-sm font-semibold tracking-tight text-foreground hover:text-[#FF5722]"
                          >
                            {expanded ? (
                              <CaretDown className="h-4 w-4" weight="bold" />
                            ) : (
                              <CaretRight className="h-4 w-4" weight="bold" />
                            )}
                            <span>Cụm #{cluster.id}</span>
                          </button>
                        </td>

                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-sm",
                              CLUSTER_SEVERITY_BADGE_CLASS[
                                cluster.severityLevel
                              ],
                            )}
                          >
                            {CLUSTER_SEVERITY_LABELS[cluster.severityLevel]}
                          </Badge>
                        </td>

                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-sm",
                              CLUSTER_STATUS_BADGE_CLASS[clusterStatus],
                            )}
                          >
                            {CLUSTER_STATUS_LABELS[clusterStatus]}
                          </Badge>
                        </td>

                        <td className="p-3 text-sm text-foreground">
                          {cluster.sosRequestCount}
                        </td>

                        <td className="p-3 text-sm text-foreground">
                          {cluster.victimEstimated ?? "-"}
                        </td>

                        <td className="p-3 text-sm text-muted-foreground">
                          {timeAgo(cluster.lastUpdatedAt)}
                        </td>

                        <td className="p-3 text-right">
                          {clusterStatus === "Completed" &&
                          onViewCompletedClusterPlan ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() =>
                                onViewCompletedClusterPlan(cluster.id)
                              }
                            >
                              <Eye className="h-4 w-4" />
                              Xem nhiệm vụ
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                      </tr>

                      {expanded ? (
                        <tr
                          key={`cluster-expand-${cluster.id}`}
                          className="border-b border-border/30"
                        >
                          <td colSpan={7} className="bg-muted/20 p-3">
                            {isClusterSOSLoading ? (
                              <div className="space-y-2">
                                {Array.from({ length: 2 }).map((_, index) => (
                                  <Skeleton
                                    key={`cluster-${cluster.id}-skeleton-${index}`}
                                    className="h-20 w-full"
                                  />
                                ))}
                              </div>
                            ) : sosItems.length === 0 ? (
                              <div className="rounded-lg border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
                                Không có dữ liệu chi tiết SOS trong cụm này.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {failedIds.length > 0 ? (
                                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                    Không thể tải {failedIds.length} SOS trong
                                    cụm này. Bạn vẫn có thể mở các SOS đã tải
                                    thành công.
                                  </div>
                                ) : null}

                                {sosItems.map((sos) => {
                                  const needs = deriveSOSNeeds(
                                    sos.structuredData,
                                    sos.sosType,
                                  );
                                  const priorityLabel =
                                    SOS_PRIORITY_LABELS[sos.priorityLevel] ??
                                    sos.priorityLevel;
                                  const priorityClass =
                                    SOS_PRIORITY_BADGE_CLASS[
                                      sos.priorityLevel
                                    ] ??
                                    "border-slate-300 bg-slate-100 text-slate-700";
                                  const statusLabel =
                                    SOS_STATUS_LABELS[sos.status] ?? sos.status;
                                  const statusClass =
                                    SOS_STATUS_BADGE_CLASS[sos.status] ??
                                    "border-slate-300 bg-slate-100 text-slate-700";
                                  const totalPeople =
                                    (sos.structuredData?.people_count?.adult ??
                                      0) +
                                    (sos.structuredData?.people_count?.child ??
                                      0) +
                                    (sos.structuredData?.people_count
                                      ?.elderly ?? 0);

                                  return (
                                    <button
                                      key={sos.id}
                                      type="button"
                                      onClick={() => onSOSSelect?.(sos)}
                                      className={cn(
                                        "w-full rounded-lg border border-border bg-background p-3 text-left transition-colors",
                                        onSOSSelect
                                          ? "hover:border-[#FF5722]/40 hover:bg-[#FFF7F2]"
                                          : "",
                                      )}
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <p className="text-sm font-semibold tracking-tight text-foreground">
                                              SOS #{sos.id}
                                            </p>

                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "text-sm",
                                                priorityClass,
                                              )}
                                            >
                                              {priorityLabel}
                                            </Badge>

                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "text-sm",
                                                statusClass,
                                              )}
                                            >
                                              {statusLabel}
                                            </Badge>

                                            {getSosTypeLabel(sos.sosType) !==
                                            "SOS" ? (
                                              <Badge
                                                variant="outline"
                                                className="text-sm"
                                              >
                                                {getSosTypeLabel(sos.sosType)}
                                              </Badge>
                                            ) : null}
                                          </div>

                                          {sos.structuredData?.situation ? (
                                            <p className="mt-1 text-sm text-muted-foreground">
                                              {getSituationLabel(
                                                sos.structuredData.situation,
                                              )}
                                            </p>
                                          ) : null}

                                          {sos.msg ? (
                                            <p className="mt-1 line-clamp-2 text-sm text-foreground/80">
                                              {sos.msg}
                                            </p>
                                          ) : null}
                                        </div>

                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                          <Clock className="h-3.5 w-3.5" />
                                          {timeAgo(sos.createdAt)}
                                        </div>
                                      </div>

                                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        {totalPeople > 0 ? (
                                          <Badge
                                            variant="outline"
                                            className="border-slate-300 bg-slate-100 text-sm text-slate-700"
                                          >
                                            <Users
                                              className="mr-1 h-3.5 w-3.5"
                                              weight="fill"
                                            />
                                            {totalPeople} người
                                          </Badge>
                                        ) : null}

                                        {needs.medical ? (
                                          <Badge
                                            variant="outline"
                                            className="border-red-300 bg-red-50 text-sm text-red-700"
                                          >
                                            <Stethoscope
                                              className="mr-1 h-3.5 w-3.5"
                                              weight="fill"
                                            />
                                            Y tế
                                          </Badge>
                                        ) : null}

                                        {needs.food ? (
                                          <Badge
                                            variant="outline"
                                            className="border-orange-300 bg-orange-50 text-sm text-orange-700"
                                          >
                                            <ForkKnife
                                              className="mr-1 h-3.5 w-3.5"
                                              weight="fill"
                                            />
                                            Nhu yếu phẩm
                                          </Badge>
                                        ) : null}

                                        {needs.boat ? (
                                          <Badge
                                            variant="outline"
                                            className="border-blue-300 bg-blue-50 text-sm text-blue-700"
                                          >
                                            <Waves
                                              className="mr-1 h-3.5 w-3.5"
                                              weight="fill"
                                            />
                                            Phương tiện
                                          </Badge>
                                        ) : null}
                                      </div>

                                      {sos.structuredData?.address ? (
                                        <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                                          {sos.structuredData.address}
                                        </p>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          <WarningCircle className="mr-1 inline h-4 w-4" />
          Bấm vào cụm để mở danh sách SOS bên trong. Với cụm đã hoàn thành, dùng
          nút Xem nhiệm vụ để mở kế hoạch ở chế độ chỉ xem.
        </p>

        {isServerMode ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                Hiển thị {startItem}–{endItem} trong{" "}
                {displayTotalCount.toLocaleString("vi-VN")} cụm
              </div>
              <div className="flex items-center gap-1.5">
                <Select
                  value={String(currentPageSize)}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-8 w-16 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">/ trang</span>
              </div>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={!serverPagination!.hasPreviousPage || isLoading}
                >
                  Trước
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - safePage) <= 1,
                    )
                    .reduce<(number | "...")[]>((acc, page, index, arr) => {
                      if (
                        index > 0 &&
                        typeof arr[index - 1] === "number" &&
                        page - arr[index - 1] > 1
                      ) {
                        acc.push("...");
                      }

                      acc.push(page);
                      return acc;
                    }, [])
                    .map((page, index) =>
                      page === "..." ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-1 text-sm text-muted-foreground"
                        >
                          ...
                        </span>
                      ) : (
                        <Button
                          key={page}
                          variant={page === safePage ? "default" : "outline"}
                          size="sm"
                          className="min-w-9"
                          onClick={() => setPage(page)}
                          disabled={isLoading}
                        >
                          {page}
                        </Button>
                      ),
                    )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={!serverPagination!.hasNextPage || isLoading}
                >
                  Sau
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default SOSClusterTable;
