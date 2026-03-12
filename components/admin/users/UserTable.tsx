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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, UserTableProps } from "@/type";

const ITEMS_PER_PAGE = 10;

type SortColumn = "name" | "email" | "role" | "region" | "status" | "createdAt";
type SortDir = "asc" | "desc";
type SortState = { column: SortColumn; dir: SortDir } | null;

const ROLES: { value: User["role"]; label: string }[] = [
  { value: "admin", label: "Quản trị viên" },
  { value: "coordinator", label: "Điều phối viên" },
  { value: "rescuer", label: "Cứu hộ viên" },
  { value: "victim", label: "Công dân" },
];

const STATUSES: { value: User["status"]; label: string }[] = [
  { value: "active", label: "Hoạt động" },
  { value: "banned", label: "Bị cấm" },
];

const SortIcon = ({ column, sort }: { column: SortColumn; sort: SortState }) => {
  if (sort?.column === column) {
    return sort.dir === "asc"
      ? <ArrowUp size={13} className="text-primary shrink-0" />
      : <ArrowDown size={13} className="text-primary shrink-0" />;
  }
  return (
    <ArrowsDownUp
      size={13}
      className="text-muted-foreground/30 shrink-0"
    />
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
  onSort: (col: SortColumn) => void;
}) => (
  <th className="text-left p-3">
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-foreground/70 transition-colors"
    >
      {label}
      <SortIcon column={column} sort={sort} />
    </button>
  </th>
);

const UserTable = ({
  users,
  onEdit,
  onBan,
  onActivate,
  onViewDetail,
  onPrefetch,
  isLoading,
  totalCount,
}: UserTableProps) => {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(null);
  const [search, setSearch] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<User["role"][]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<User["status"][]>([]);
  const [roleOpen, setRoleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const handleSort = (column: SortColumn) => {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, dir: "asc" };
      if (prev.dir === "asc") return { column, dir: "desc" };
      return null;
    });
  };

  const toggleRole = (role: User["role"]) => {
    setPage(1);
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleStatus = (status: User["status"]) => {
    setPage(1);
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const hasFilters = !!(search || selectedRoles.length || selectedStatuses.length);

  const clearFilters = () => {
    setSearch("");
    setSelectedRoles([]);
    setSelectedStatuses([]);
    setPage(1);
  };

  const filteredAndSorted = useMemo(() => {
    let result = users;

    // Search by name or email
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    // Role filter
    if (selectedRoles.length) {
      result = result.filter((u) => selectedRoles.includes(u.role));
    }

    // Status filter
    if (selectedStatuses.length) {
      result = result.filter((u) => selectedStatuses.includes(u.status));
    }

    // Sort
    if (sort) {
      result = [...result].sort((a, b) => {
        let aVal = "";
        let bVal = "";
        if (sort.column === "name") { aVal = a.name; bVal = b.name; }
        else if (sort.column === "email") { aVal = a.email; bVal = b.email; }
        else if (sort.column === "role") { aVal = a.role; bVal = b.role; }
        else if (sort.column === "region") { aVal = a.region; bVal = b.region; }
        else if (sort.column === "status") { aVal = a.status; bVal = b.status; }
        else if (sort.column === "createdAt") { aVal = a.createdAt; bVal = b.createdAt; }
        const cmp = aVal.localeCompare(bVal, "vi");
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [users, search, selectedRoles, selectedStatuses, sort]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginatedUsers = filteredAndSorted.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const startItem = filteredAndSorted.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(safePage * ITEMS_PER_PAGE, filteredAndSorted.length);
  const displayTotal = totalCount ?? filteredAndSorted.length;

  const getRoleBadge = (role: User["role"]) => {
    const variants: Record<User["role"], { label: string; className: string }> = {
      admin: { label: "Quản trị viên", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
      coordinator: { label: "Điều phối viên", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
      rescuer: { label: "Cứu hộ viên", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
      victim: { label: "Công dân", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
    };
    return variants[role];
  };

  const getStatusBadge = (status: User["status"]) => {
    if (status === "banned") {
      return { label: "Bị cấm", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400" };
    }
    return { label: "Hoạt động", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" };
  };

  return (
    <Card className="border border-border/50">
      <CardContent>
        {/* Toolbar: search + filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border/40">
          <div className="relative flex-1 min-w-52">
            
            <Input
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm"
              autoComplete="off"
            />
          </div>

          {/* Role multi-select */}
          <Popover open={roleOpen} onOpenChange={setRoleOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal text-sm">
                Vai trò
                {selectedRoles.length ? (
                  <Badge className="h-4.5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
                    {selectedRoles.length}
                  </Badge>
                ) : (
                  <CaretDown size={13} className="text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1.5" align="start">
              {ROLES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleRole(value)}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md hover:bg-muted/60 transition-colors"
                >
                  <span className={selectedRoles.includes(value) ? "font-medium" : ""}>{label}</span>
                  {selectedRoles.includes(value) && <Check size={14} className="text-primary shrink-0" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Status multi-select */}
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal text-sm">
                Trạng thái
                {selectedStatuses.length ? (
                  <Badge className="h-4.5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
                    {selectedStatuses.length}
                  </Badge>
                ) : (
                  <CaretDown size={13} className="text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1.5" align="start">
              {STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleStatus(value)}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md hover:bg-muted/60 transition-colors"
                >
                  <span className={selectedStatuses.includes(value) ? "font-medium" : ""}>{label}</span>
                  {selectedStatuses.includes(value) && <Check size={14} className="text-primary shrink-0" />}
                </button>
              ))}
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

          <div className="ml-auto text-sm text-muted-foreground whitespace-nowrap">
            {filteredAndSorted.length} người dùng
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <SortHeader column="name" label="Tên" sort={sort} onSort={handleSort} />
                <SortHeader column="email" label="Email" sort={sort} onSort={handleSort} />
                <th className="text-left p-3 text-sm font-semibold text-foreground">Số điện thoại</th>
                <SortHeader column="role" label="Vai trò" sort={sort} onSort={handleSort} />
                <SortHeader column="region" label="Khu vực" sort={sort} onSort={handleSort} />
                <SortHeader column="status" label="Trạng thái" sort={sort} onSort={handleSort} />
                <SortHeader column="createdAt" label="Ngày tạo" sort={sort} onSort={handleSort} />
                <th className="text-right p-3 text-sm font-semibold text-foreground">Thao tác</th>
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
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  const statusBadge = getStatusBadge(user.status);
                  return (
                    <tr
                      key={user.id}
                      onClick={() => onViewDetail?.(user.id)}
                      onMouseEnter={() => onPrefetch?.(user.id)}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3">
                        <div className="font-regular text-sm text-foreground">{user.name}</div>
                      </td>
                      <td className="p-3 text-sm text-foreground/70">{user.email}</td>
                      <td className="p-3 text-sm text-foreground/80">{user.phone}</td>
                      <td className="p-3">
                        <Badge className={roleBadge.className}>{roleBadge.label}</Badge>
                      </td>
                      <td className="p-3 text-sm text-foreground/80">{user.region}</td>
                      <td className="p-3">
                        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                      </td>
                      <td className="p-3 text-sm text-foreground/60">
                        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <DotsThreeVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit?.(user)}>
                                <PencilSimple size={16} className="mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              {user.status === "active" ? (
                                <DropdownMenuItem onClick={() => onBan?.(user)}>
                                  <Prohibit size={16} className="mr-2" />
                                  Cấm
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => onActivate?.(user)}>
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <div className="text-sm text-muted-foreground">
              Hiển thị {startItem}–{endItem} trong tổng số {displayTotal} người dùng
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
                    if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push("...");
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
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

export default UserTable;
