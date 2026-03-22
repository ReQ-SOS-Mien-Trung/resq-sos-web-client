"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Check,
  CaretDown,
} from "@phosphor-icons/react";
import { UserEntity } from "@/services/user/type";

const ITEMS_PER_PAGE = 15;

type SortColumn = "name" | "email" | "rescuerType" | "region" | "status" | "createdAt";
type SortDir = "asc" | "desc";
type SortState = { column: SortColumn; dir: SortDir } | null;

const RESCUER_TYPE_OPTIONS: { value: string; label: string; subLabel: string }[] = [
  { value: "Core", label: "Core", subLabel: "Core" },
  { value: "Volunteer", label: "Volunteer", subLabel: "Volunteer" },
];

const STATUS_OPTIONS: { value: "active" | "banned"; label: string }[] = [
  { value: "active", label: "Hoạt động" },
  { value: "banned", label: "Bị cấm" },
];

export interface RescuerTableProps {
  rescuers: UserEntity[];
  onEdit?: (rescuer: UserEntity) => void;
  onBan?: (rescuer: UserEntity) => void;
  onActivate?: (rescuer: UserEntity) => void;
  onViewDetail?: (userId: string) => void;
  onPrefetch?: (userId: string) => void;
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getRescuerTypeBadge = (type: string | null) => {
  if (type === "Core")
    return {
      label: "Core",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
  if (type === "Volunteer")
    return {
      label: "Volunteer",
      className: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    };
  return {
    label: type ?? "—",
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
  onEdit,
  onBan,
  onActivate,
  onViewDetail,
  onPrefetch,
  isLoading,
}: RescuerTableProps) => {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(null);
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<("active" | "banned")[]>([]);
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const handleSort = (column: SortColumn) => {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, dir: "asc" };
      if (prev.dir === "asc") return { column, dir: "desc" };
      return null;
    });
  };

  const toggleType = (type: string) => {
    setPage(1);
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleStatus = (status: "active" | "banned") => {
    setPage(1);
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const hasFilters = !!(search || selectedTypes.length > 0 || selectedStatuses.length > 0);

  const clearFilters = () => {
    setSearch("");
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setPage(1);
  };

  // ── Client-side filter + sort ─────────────────────────────────────────────
  const filteredAndSorted = useMemo(() => {
    let result = rescuers;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (u) =>
          `${u.lastName} ${u.firstName}`.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          u.phone.toLowerCase().includes(q)
      );
    }

    if (selectedTypes.length > 0) {
      result = result.filter((u) => u.rescuerType && selectedTypes.includes(u.rescuerType));
    }

    if (selectedStatuses.length > 0) {
      result = result.filter((u) => {
        const status = u.isBanned ? "banned" : "active";
        return selectedStatuses.includes(status);
      });
    }

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
  }, [rescuers, search, selectedTypes, selectedStatuses, sort]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredAndSorted.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );
  const startItem = filteredAndSorted.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(safePage * ITEMS_PER_PAGE, filteredAndSorted.length);

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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm"
              autoComplete="off"
            />
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>

          {/* Rescuer type filter */}
          <Popover open={typeOpen} onOpenChange={setTypeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal text-sm">
                Loại cứu hộ
                {selectedTypes.length > 0 ? (
                  <Badge className="h-4.5 px-1.5 text-xs tracking-tighter rounded-full bg-primary text-primary-foreground">
                    {selectedTypes.length}
                  </Badge>
                ) : (
                  <CaretDown size={13} className="text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1.5" align="start">
              {RESCUER_TYPE_OPTIONS.map(({ value, label }) => {
                const checked = selectedTypes.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleType(value)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm tracking-tighter rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <span
                      className={`flex items-center justify-center size-4 rounded border shrink-0 transition-colors ${
                        checked
                          ? "bg-primary border-primary tracking-tighter text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {checked && <Check size={11} weight="bold" />}
                    </span>
                    <span className={checked ? "font-medium tracking-tighter" : ""}>{label}</span>
                  </button>
                );
              })}
              {selectedTypes.length > 0 && (
                <button
                  onClick={() => { setSelectedTypes([]); setPage(1); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 mt-1 text-xs text-muted-foreground border-t border-border/40 hover:text-foreground transition-colors"
                >
                  <X size={11} />
                  Xóa lọc loại
                </button>
              )}
            </PopoverContent>
          </Popover>

          {/* Status filter */}
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal text-sm">
                Trạng thái
                {selectedStatuses.length > 0 ? (
                  <Badge className="h-4.5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
                    {selectedStatuses.length}
                  </Badge>
                ) : (
                  <CaretDown size={13} className="text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1.5" align="start">
              {STATUS_OPTIONS.map(({ value, label }) => {
                const checked = selectedStatuses.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleStatus(value)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm tracking-tighter rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <span
                      className={`flex items-center justify-center size-4 rounded border shrink-0 transition-colors ${
                        checked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {checked && <Check size={11} weight="bold" />}
                    </span>
                    <span className={checked ? "font-medium" : ""}>{label}</span>
                  </button>
                );
              })}
              {selectedStatuses.length > 0 && (
                <button
                  onClick={() => { setSelectedStatuses([]); setPage(1); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 mt-1 text-xs text-muted-foreground border-t border-border/40 hover:text-foreground transition-colors"
                >
                  <X size={11} />
                  Xóa lọc trạng thái
                </button>
              )}
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-muted-foreground gap-1 text-sm"
            >
              <X size={13} />
              Xóa bộ lọc
            </Button>
          )}

          <div className="ml-auto text-sm tracking-tighter text-muted-foreground whitespace-nowrap">
            {hasFilters
              ? `${filteredAndSorted.length} / ${rescuers.length.toLocaleString("vi-VN")} cứu hộ viên`
              : `${rescuers.length.toLocaleString("vi-VN")} cứu hộ viên`}
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
                  const typeBadge = getRescuerTypeBadge(rescuer.rescuerType);
                  const statusBadge = getStatusBadge(rescuer.isBanned);
                  const fullName = `${rescuer.lastName} ${rescuer.firstName}`;
                  return (
                    <tr
                      key={rescuer.id}
                      onClick={() => onViewDetail?.(rescuer.id)}
                      onMouseEnter={() => onPrefetch?.(rescuer.id)}
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <div className="text-sm tracking-tighter text-muted-foreground">
              Hiển thị {startItem}–{endItem} trong {filteredAndSorted.length} cứu hộ viên
            </div>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RescuerTable;
