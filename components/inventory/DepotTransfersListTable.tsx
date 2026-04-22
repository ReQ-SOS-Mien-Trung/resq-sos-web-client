"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowsClockwise,
  ArrowsDownUp,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  buildDepotClosureTransferStatusOptions,
  buildDepotClosureTransferStatusValueMap,
  getDepotClosureTransferStatusLabel,
  getDepotClosureTransferStatusToneClass,
  normalizeDepotClosureTransferStatus,
} from "@/lib/depot-closure-transfer-status";
import { useDepotClosureTransferStatuses } from "@/services/depot/hooks";
import type { DepotTransferListItem } from "@/services/depot/type";

type SortColumn =
  | "transferId"
  | "sourceDepotName"
  | "targetDepotName"
  | "status"
  | "createdAt";
type SortDir = "asc" | "desc";
type SortState = { column: SortColumn; dir: SortDir } | null;

function getTransferStatusMeta(rawStatus: string) {
  return {
    label: rawStatus,
    className: getDepotClosureTransferStatusToneClass(rawStatus),
  };
}

function getTransferRoleMeta(role: string | null | undefined) {
  if (role === "Source") {
    return {
      label: "Kho nguồn",
      className: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
    };
  }
  if (role === "Target") {
    return {
      label: "Kho nhận",
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    };
  }
  return {
    label: role?.trim() || "Liên quan",
    className: "bg-muted text-muted-foreground",
  };
}

function formatTransferDate(value: string): string {
  return new Date(value).toLocaleString("vi-VN");
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

const SortIcon = ({ column, sort }: { column: SortColumn; sort: SortState }) => {
  if (sort?.column === column) {
    return sort.dir === "asc" ? (
      <ArrowUp size={13} className="shrink-0 text-primary" />
    ) : (
      <ArrowDown size={13} className="shrink-0 text-primary" />
    );
  }
  return (
    <ArrowsDownUp size={13} className="shrink-0 text-muted-foreground/30" />
  );
};

const SortHeader = ({
  column,
  label,
  sort,
  onSort,
}: {
  column: SortColumn;
  label: string;
  sort: SortState;
  onSort: (column: SortColumn) => void;
}) => (
  <th className="p-3 text-left">
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-sm font-semibold tracking-tighter text-foreground transition-colors hover:text-foreground/70"
    >
      {label}
      <SortIcon column={column} sort={sort} />
    </button>
  </th>
);

export interface DepotTransfersListTableProps {
  transfers: DepotTransferListItem[];
  selectedTransferId?: number | null;
  onSelectTransfer?: (transferId: number) => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  title?: string;
  description?: string;
}

export function DepotTransfersListTable({
  transfers,
  selectedTransferId = null,
  onSelectTransfer,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  title = "Danh sách transfer",
  description = "Chọn một transfer để xem chi tiết và tiếp tục xử lý ở panel bên dưới.",
}: DepotTransfersListTableProps) {
  const { data: transferStatusMetadata = [] } = useDepotClosureTransferStatuses();
  const [searchValue, setSearchValue] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<SortState>({
    column: "createdAt",
    dir: "desc",
  });
  const transferStatusValueMap = useMemo(
    () => buildDepotClosureTransferStatusValueMap(transferStatusMetadata),
    [transferStatusMetadata],
  );
  const transferStatusOptions = useMemo(
    () => [
      { value: "all", label: "Tất cả trạng thái" },
      ...buildDepotClosureTransferStatusOptions(transferStatusMetadata),
    ],
    [transferStatusMetadata],
  );

  const hasFilters = !!searchValue.trim() || selectedStatus !== "all";

  const filteredAndSorted = useMemo(() => {
    const keyword = normalizeSearchValue(searchValue);

    let result = transfers.filter((item) => {
      const normalizedStatus = normalizeDepotClosureTransferStatus(item.status);
      if (selectedStatus !== "all" && normalizedStatus !== selectedStatus) {
        return false;
      }

      if (!keyword) return true;

      const haystacks = [
        String(item.transferId),
        item.sourceDepotName,
        item.targetDepotName,
        item.relatedDepotName,
        item.counterpartyDepotName,
      ];

      return haystacks.some((value) =>
        normalizeSearchValue(String(value ?? "")).includes(keyword),
      );
    });

    if (!sort) return result;

    result = [...result].sort((a, b) => {
      if (sort.column === "transferId") {
        const cmp = a.transferId - b.transferId;
        return sort.dir === "asc" ? cmp : -cmp;
      }

      if (sort.column === "createdAt") {
        const cmp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sort.dir === "asc" ? cmp : -cmp;
      }

      if (sort.column === "status") {
        const cmp = normalizeDepotClosureTransferStatus(a.status).localeCompare(
          normalizeDepotClosureTransferStatus(b.status),
          "vi",
        );
        return sort.dir === "asc" ? cmp : -cmp;
      }

      const cmp = String(a[sort.column] ?? "").localeCompare(
        String(b[sort.column] ?? ""),
        "vi",
      );
      return sort.dir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [searchValue, selectedStatus, sort, transfers]);

  const totalCount = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedTransfers = filteredAndSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const startItem = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalCount);

  function handleSort(column: SortColumn) {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.column !== column) {
        return {
          column,
          dir: column === "createdAt" || column === "transferId" ? "desc" : "asc",
        };
      }
      if (prev.dir === "asc") return { column, dir: "desc" };
      return null;
    });
  }

  function clearFilters() {
    setSearchValue("");
    setSelectedStatus("all");
    setPage(1);
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tighter">{title}</h2>
            <p className="mt-0.5 text-sm tracking-tight text-muted-foreground">
              {description}
            </p>
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 tracking-tighter"
              onClick={() => onRefresh()}
              disabled={isRefreshing}
            >
              <ArrowsClockwise
                size={14}
                className={isRefreshing ? "animate-spin" : ""}
              />
              Làm mới
            </Button>
          )}
        </div>

        <div className="mb-4 mt-4 flex flex-wrap items-center gap-2 border-b border-border/40 pb-4">
          <div className="relative min-w-52 flex-1">
            <Input
              placeholder="Tìm theo mã transfer hoặc tên kho..."
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setPage(1);
              }}
              className="h-9 pl-9 text-sm"
              autoComplete="off"
            />
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>

          <Select
            value={selectedStatus}
            onValueChange={(value) => {
              setSelectedStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[220px] text-sm">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {transferStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 gap-1 text-sm text-muted-foreground"
            >
              <X size={13} />
              Xóa bộ lọc
            </Button>
          )}

          <div className="ml-auto whitespace-nowrap text-sm text-muted-foreground">
            {transfers.length.toLocaleString("vi-VN")} transfer
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full">
            <thead>
              <tr className="border-b border-border/50">
                <SortHeader
                  column="transferId"
                  label="Mã transfer"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                  Vai trò
                </th>
                <SortHeader
                  column="sourceDepotName"
                  label="Kho nguồn"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  column="targetDepotName"
                  label="Kho nhận"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="p-3 text-left text-sm font-semibold tracking-tighter text-foreground">
                  Snapshot
                </th>
                <SortHeader
                  column="status"
                  label="Trạng thái"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  column="createdAt"
                  label="Thời gian tạo"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="p-3 text-right text-sm font-semibold tracking-tighter text-foreground">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border/30">
                    {Array.from({ length: 8 }).map((__, columnIndex) => (
                      <td key={columnIndex} className="p-3">
                        <Skeleton className="h-4 w-full rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedTransfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-10 text-center text-sm tracking-tighter text-muted-foreground"
                  >
                    Không tìm thấy transfer nào
                  </td>
                </tr>
              ) : (
                paginatedTransfers.map((item) => {
                  const statusMeta = getTransferStatusMeta(
                    getDepotClosureTransferStatusLabel(
                      item.status,
                      transferStatusValueMap,
                    ),
                  );
                  const roleMeta = getTransferRoleMeta(item.userRole);
                  const isSelected = item.transferId === selectedTransferId;

                  return (
                    <tr
                      key={item.transferId}
                      onClick={() => onSelectTransfer?.(item.transferId)}
                      className={cn(
                        "cursor-pointer border-b border-border/30 transition-colors hover:bg-muted/30",
                        isSelected && "bg-orange-50/70 dark:bg-orange-950/10",
                      )}
                    >
                      <td className="p-3">
                        <div className="text-sm font-medium tracking-tighter text-foreground">
                          #{item.transferId}
                        </div>
                        <div className="mt-0.5 text-xs tracking-tighter text-muted-foreground">
                          Closure #{item.closureId}
                        </div>
                      </td>

                      <td className="p-3">
                        <Badge className={roleMeta.className}>
                          {roleMeta.label}
                        </Badge>
                      </td>

                      <td className="p-3 text-sm tracking-tighter text-foreground/80">
                        {item.sourceDepotName}
                      </td>

                      <td className="p-3 text-sm tracking-tighter text-foreground/80">
                        {item.targetDepotName}
                      </td>

                      <td className="p-3">
                        <div className="space-y-0.5 text-xs tracking-tighter">
                          <div>
                            <span className="text-muted-foreground">
                              Tiêu thụ:{" "}
                            </span>
                            <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                              {item.snapshotConsumableUnits.toLocaleString("vi-VN")}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Tái sử dụng:{" "}
                            </span>
                            <span className="font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                              {item.snapshotReusableUnits.toLocaleString("vi-VN")}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <Badge className={statusMeta.className}>
                          {statusMeta.label}
                        </Badge>
                      </td>

                      <td className="p-3 text-sm tracking-tighter text-foreground/60">
                        {formatTransferDate(item.createdAt)}
                      </td>

                      <td className="p-3">
                        <div
                          className="flex justify-end"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className="min-w-20"
                            onClick={() => onSelectTransfer?.(item.transferId)}
                          >
                            {isSelected ? "Đang xem" : "Xem"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
          <div className="flex items-center gap-3">
            <div className="text-sm tracking-tighter text-muted-foreground">
              Hiển thị {startItem}–{endItem} trong {totalCount} transfer
            </div>

            <div className="flex items-center gap-1.5">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-16 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm tracking-tighter text-muted-foreground">
                / trang
              </span>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1 || isLoading}
              >
                Trước
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter(
                    (currentPage) =>
                      currentPage === 1 ||
                      currentPage === totalPages ||
                      Math.abs(currentPage - safePage) <= 1,
                  )
                  .reduce<(number | "...")[]>((acc, currentPage, index, arr) => {
                    if (
                      index > 0 &&
                      typeof arr[index - 1] === "number" &&
                      currentPage - (arr[index - 1] as number) > 1
                    ) {
                      acc.push("...");
                    }
                    acc.push(currentPage);
                    return acc;
                  }, [])
                  .map((currentPage, index) =>
                    currentPage === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-1 text-sm text-muted-foreground"
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        key={currentPage}
                        variant={currentPage === safePage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(currentPage as number)}
                        disabled={isLoading}
                        className="min-w-10"
                      >
                        {currentPage}
                      </Button>
                    ),
                  )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={safePage === totalPages || isLoading}
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
