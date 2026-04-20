"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DotsThreeVertical,
  PencilSimple,
  Prohibit,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ArrowsDownUp,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import {
  RescuerTypeMetadataOption,
  UserEntity,
} from "@/services/user/type";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortColumn = "name" | "email" | "rescuerType" | "region" | "status" | "createdAt";
type SortDir = "asc" | "desc";
type SortState = { column: SortColumn; dir: SortDir } | null;

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

export interface RescuerTableProps {
  rescuers: UserEntity[];
  search: string;
  onSearchChange: (value: string) => void;
  rescuerTypeFilter: string;
  onRescuerTypeFilterChange: (value: string) => void;
  isBannedFilter: "all" | "true" | "false";
  onIsBannedFilterChange: (value: "all" | "true" | "false") => void;
  rescuerTypeOptions: RescuerTypeMetadataOption[];
  rescuerTypeLabelMap?: Record<string, string>;
  onEdit?: (rescuer: UserEntity) => void;
  onBan?: (rescuer: UserEntity) => void;
  onActivate?: (rescuer: UserEntity) => void;
  onViewDetail?: (userId: string) => void;
  isLoading?: boolean;
  serverPagination?: ServerPaginationProps;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getRescuerTypeBadge = (
  type: string | null,
  labelMap?: Record<string, string>,
) => {
  if (type === "Core")
    return {
      label: labelMap?.Core ?? "Core",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
  if (type === "Volunteer")
    return {
      label: labelMap?.Volunteer ?? "Volunteer",
      className: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    };
  return {
    label: (type && labelMap?.[type]) || type || "—",
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  };
};

const getStatusBadge = (isBanned: boolean) =>
  isBanned
    ? { label: "Bị cấm", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400" }
    : {
      label: "Hoạt động",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };

// ─── Sort ─────────────────────────────────────────────────────────────────────

const SortIcon = ({ column, sort }: { column: SortColumn; sort: SortState }) => {
  if (sort?.column === column)
    return sort.dir === "asc" ? (
      <ArrowUp size={13} className="text-primary shrink-0" />
    ) : (
      <ArrowDown size={13} className="text-primary shrink-0" />
    );
  return <ArrowsDownUp size={13} className="text-muted-foreground/30 shrink-0" />;
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
  onSort: (col: SortColumn) => void;
}) => (
  <th className="text-left p-3">
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-sm tracking-tighter font-semibold text-foreground hover:text-foreground/70 transition-colors"
    >
      {label}
      <SortIcon column={column} sort={sort} />
    </button>
  </th>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const RescuerTable = ({
  rescuers,
  search,
  onSearchChange,
  rescuerTypeFilter,
  onRescuerTypeFilterChange,
  isBannedFilter,
  onIsBannedFilterChange,
  rescuerTypeOptions,
  rescuerTypeLabelMap,
  onEdit,
  onBan,
  onActivate,
  onViewDetail,
  isLoading,
  serverPagination,
}: RescuerTableProps) => {
  const [_page, _setPage] = useState(1);
  const [_pageSize, _setPageSize] = useState(10);
  const [sort, setSort] = useState<SortState>(null);

  const isServerMode = !!serverPagination;
  const page = isServerMode ? serverPagination!.page : _page;
  const pageSize = isServerMode ? serverPagination!.pageSize : _pageSize;

  const setPage = (val: number | ((prev: number) => number)) => {
    if (isServerMode) {
      const resolved = typeof val === 'function' ? val(serverPagination!.page) : val;
      serverPagination!.onPageChange(resolved);
    } else {
      _setPage(val);
    }
  };

  const setPageSize = (newSize: number) => {
    if (isServerMode) {
      serverPagination!.onPageSizeChange(newSize);
    } else {
      _setPageSize(newSize);
      _setPage(1);
    }
  };

  const handleSort = (column: SortColumn) => {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, dir: "asc" };
      if (prev.dir === "asc") return { column, dir: "desc" };
      return null;
    });
  };

  const hasFilters =
    !!search.trim() || rescuerTypeFilter !== "all" || isBannedFilter !== "all";

  const clearFilters = () => {
    onSearchChange("");
    onRescuerTypeFilterChange("all");
    onIsBannedFilterChange("all");
    setPage(1);
  };

  // ── Client-side sort only (filters run on API) ───────────────────────────
  const filteredAndSorted = useMemo(() => {
    let result = rescuers;

    if (sort) {
      result = [...result].sort((a, b) => {
        let aVal = "";
        let bVal = "";
        const aName = `${a.lastName} ${a.firstName}`;
        const bName = `${b.lastName} ${b.firstName}`;
        if (sort.column === "name") { aVal = aName; bVal = bName; }
        else if (sort.column === "email") { aVal = a.email ?? ""; bVal = b.email ?? ""; }
        else if (sort.column === "rescuerType") { aVal = a.rescuerType ?? ""; bVal = b.rescuerType ?? ""; }
        else if (sort.column === "region") { aVal = a.province ?? ""; bVal = b.province ?? ""; }
        else if (sort.column === "status") {
          aVal = a.isBanned ? "banned" : "active";
          bVal = b.isBanned ? "banned" : "active";
        }
        else if (sort.column === "createdAt") { aVal = a.createdAt; bVal = b.createdAt; }
        const cmp = aVal.localeCompare(bVal, "vi");
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [rescuers, sort]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const displayTotalCount = isServerMode ? serverPagination!.totalCount : filteredAndSorted.length;
  const totalPages = isServerMode
    ? serverPagination!.totalPages
    : Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = isServerMode
    ? filteredAndSorted
    : filteredAndSorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startItem = displayTotalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, displayTotalCount);

  return (
    <Card className="border border-border/50">
      <CardContent>
        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border/40">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <Input
              placeholder="Tìm theo tên, email, số điện thoại..."
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-sm"
              autoComplete="off"
            />
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>

          <Select
            value={rescuerTypeFilter}
            onValueChange={(value) => {
              onRescuerTypeFilterChange(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 min-w-44 text-sm tracking-tighter">
              <SelectValue placeholder="Loại cứu hộ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại cứu hộ</SelectItem>
              {rescuerTypeOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={isBannedFilter}
            onValueChange={(value: "all" | "true" | "false") => {
              onIsBannedFilterChange(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 min-w-36 text-sm tracking-tighter">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="false">Hoạt động</SelectItem>
              <SelectItem value="true">Bị cấm</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-muted-foreground gap-1 text-sm"
            >
              <X size={13} />
              Đặt lại
            </Button>
          )}

          <div className="ml-auto text-sm tracking-tighter text-muted-foreground whitespace-nowrap">
            {displayTotalCount.toLocaleString("vi-VN")} cứu hộ viên
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <SortHeader column="name" label="Họ và tên" sort={sort} onSort={handleSort} />
                <SortHeader column="email" label="Email" sort={sort} onSort={handleSort} />
                <th className="text-left tracking-tighter p-3 text-sm font-semibold text-foreground">
                  Số điện thoại
                </th>
                <SortHeader
                  column="rescuerType"
                  label="Loại cứu hộ"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader column="region" label="Khu vực" sort={sort} onSort={handleSort} />
                <SortHeader column="status" label="Trạng thái" sort={sort} onSort={handleSort} />
                <SortHeader
                  column="createdAt"
                  label="Ngày tạo"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="text-right p-3 text-sm tracking-tighter font-semibold text-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="p-3">
                        <Skeleton className="h-4 w-full rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-10 text-center tracking-tighter text-muted-foreground text-sm"
                  >
                    Không tìm thấy cứu hộ viên nào
                  </td>
                </tr>
              ) : (
                paginated.map((rescuer) => {
                  const typeBadge = getRescuerTypeBadge(
                    rescuer.rescuerType,
                    rescuerTypeLabelMap,
                  );
                  const statusBadge = getStatusBadge(rescuer.isBanned);
                  const fullName = `${rescuer.lastName} ${rescuer.firstName}`;
                  return (
                    <tr
                      key={rescuer.id}
                      onClick={() => onViewDetail?.(rescuer.id)}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3">
                        <div className="text-sm tracking-tighter font-medium text-foreground">{fullName}</div>
                      </td>
                      <td className="p-3 text-sm tracking-tighter text-foreground/70">
                        {rescuer.email ?? "Không có Email"}
                      </td>
                      <td className="p-3 text-sm tracking-tighter text-foreground/80">
                        {rescuer.phone || "—"}
                      </td>
                      <td className="p-3">
                        <Badge className={typeBadge.className}>{typeBadge.label}</Badge>
                      </td>
                      <td className="p-3 text-sm tracking-tighter text-foreground/80">
                        {rescuer.province || "Chưa cập nhật"}
                      </td>
                      <td className="p-3">
                        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                      </td>
                      <td className="p-3 text-sm tracking-tighter text-foreground/60">
                        {new Date(rescuer.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="p-3">
                        <div
                          className="flex justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <DotsThreeVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit?.(rescuer)}>
                                <PencilSimple size={16} className="mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              {!rescuer.isBanned ? (
                                <DropdownMenuItem onClick={() => onBan?.(rescuer)}>
                                  <Prohibit size={16} className="mr-2" />
                                  Cấm tài khoản
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => onActivate?.(rescuer)}>
                                  <CheckCircle size={16} className="mr-2" />
                                  Kích hoạt
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="text-sm tracking-tighter text-muted-foreground">
              Hiển thị {startItem}–{endItem} trong {displayTotalCount} cứu hộ viên
            </div>
            <div className="flex items-center gap-1.5">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); }}>
                <SelectTrigger className="w-16 h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground tracking-tighter">/ trang</span>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1 || isLoading}
              >
                Trước
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (
                      idx > 0 &&
                      typeof arr[idx - 1] === "number" &&
                      (p as number) - (arr[idx - 1] as number) > 1
                    ) {
                      acc.push("...");
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === safePage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(p as number)}
                        disabled={isLoading}
                        className="min-w-10"
                      >
                        {p}
                      </Button>
                    )
                  )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages || isLoading}
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RescuerTable;
