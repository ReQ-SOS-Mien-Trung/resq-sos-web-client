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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUp,
  ArrowDown,
  ArrowsDownUp,
  MagnifyingGlass,
  X,
  Check,
  CaretDown,
  HourglassHigh,
  Spinner,
  CheckCircle,
  XCircle,
  Stethoscope,
  ForkKnife,
  Anchor,
  Users,
  Clock,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  deriveSOSNeeds,
  getSituationLabel,
  getSosTypeLabel,
  getSupplyLabel,
} from "@/lib/sos";
import type {
  SOSRequestEntity,
  SOSRequestStatus,
  SOSPriorityLevel,
} from "@/services/sos_request/type";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type SortColumn = "id" | "status" | "priority" | "people" | "createdAt";
type SortDir = "asc" | "desc";
type SortState = { column: SortColumn; dir: SortDir } | null;

const STATUS_OPTIONS: { value: SOSRequestStatus; label: string }[] = [
  { value: "Pending", label: "Chờ xử lý" },
  { value: "InProgress", label: "Đang thực thi" },
  { value: "Assigned", label: "Đã giao" },
  { value: "Completed", label: "Hoàn thành" },
  { value: "Cancelled", label: "Đã huỷ" },
];

const PRIORITY_OPTIONS: { value: SOSPriorityLevel; label: string }[] = [
  { value: "Critical", label: "Nguy cấp" },
  { value: "High", label: "Cao" },
  { value: "Medium", label: "Trung bình" },
  { value: "Low", label: "Thấp" },
];

const statusConfig: Record<SOSRequestStatus, { label: string; className: string }> = {
  Pending: { label: "Chờ xử lý", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  InProgress: { label: "Đang thực thi", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  Assigned: { label: "Đã giao", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  Incident: { label: "Sự cố", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  Resolved: { label: "Đã giải quyết", className: "bg-teal-500/10 text-teal-700 dark:text-teal-400" },
  Completed: { label: "Hoàn thành", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  Cancelled: { label: "Đã huỷ", className: "bg-slate-500/10 text-slate-700 dark:text-slate-400" },
};

const priorityConfig: Record<SOSPriorityLevel, { label: string; variant: "p1" | "p2" | "p3" | "p4" }> = {
  Critical: { label: "Nguy cấp", variant: "p1" },
  High: { label: "Cao", variant: "p2" },
  Medium: { label: "Trung bình", variant: "p3" },
  Low: { label: "Thấp", variant: "p4" },
};

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

export interface SOSRequestTableProps {
  requests: SOSRequestEntity[];
  isLoading?: boolean;
  serverPagination?: ServerPaginationProps;
  onRowClick?: (sos: SOSRequestEntity) => void;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
  } catch {
    return "—";
  }
}

function getPeopleCount(sos: SOSRequestEntity) {
  const people = sos.structuredData?.people_count;
  if (!people) return 0;
  return people.adult + people.child + people.elderly;
}

// Sort helpers
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
  column, label, sort, onSort,
}: {
  column: SortColumn; label: string; sort: SortState; onSort: (col: SortColumn) => void;
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

function NeedChip({ children, className, icon }: { children: React.ReactNode; className: string; icon: React.ReactNode }) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium", className)}>
      {icon}
      <span>{children}</span>
    </div>
  );
}

const SOSRequestTable = ({ requests, isLoading, serverPagination, onRowClick }: SOSRequestTableProps) => {
  const [_page, _setPage] = useState(1);
  const [_pageSize, _setPageSize] = useState(10);
  const [sort, setSort] = useState<SortState>(null);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<SOSRequestStatus[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<SOSPriorityLevel[]>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);

  const isServerMode = !!serverPagination;
  const page = isServerMode ? serverPagination!.page : _page;
  const pageSize = isServerMode ? serverPagination!.pageSize : _pageSize;

  const setPage = (val: number | ((prev: number) => number)) => {
    if (isServerMode) {
      const resolved = typeof val === "function" ? val(serverPagination!.page) : val;
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

  const toggleStatus = (status: SOSRequestStatus) => {
    setPage(1);
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const togglePriority = (priority: SOSPriorityLevel) => {
    setPage(1);
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  };

  const hasFilters = !!(search || selectedStatuses.length > 0 || selectedPriorities.length > 0);

  const clearFilters = () => {
    setSearch("");
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setPage(1);
  };

  const filteredAndSorted = useMemo(() => {
    let result = requests;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          String(s.id).includes(q) ||
          (s.msg && s.msg.toLowerCase().includes(q)) ||
          (s.structuredData?.address && s.structuredData.address.toLowerCase().includes(q))
      );
    }

    if (selectedStatuses.length > 0) {
      result = result.filter((s) => selectedStatuses.includes(s.status));
    }

    if (selectedPriorities.length > 0) {
      result = result.filter((s) => selectedPriorities.includes(s.priorityLevel));
    }

    if (sort) {
      const priorityOrder: Record<SOSPriorityLevel, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sort.column === "id") cmp = a.id - b.id;
        else if (sort.column === "status") cmp = a.status.localeCompare(b.status);
        else if (sort.column === "priority") cmp = priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel];
        else if (sort.column === "people") cmp = getPeopleCount(a) - getPeopleCount(b);
        else if (sort.column === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [requests, search, selectedStatuses, selectedPriorities, sort]);

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
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border/40">
          <div className="relative flex-1 min-w-52">
            <Input
              placeholder="Tìm theo ID, tin nhắn, địa chỉ..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm"
              autoComplete="off"
            />
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Status filter */}
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal text-sm">
                Trạng thái
                {selectedStatuses.length > 0 ? (
                  <Badge className="h-4.5 px-1.5 text-xs tracking-tighter rounded-full bg-primary text-primary-foreground">
                    {selectedStatuses.length}
                  </Badge>
                ) : (
                  <CaretDown size={13} className="text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1.5" align="start">
              {STATUS_OPTIONS.map(({ value, label }) => {
                const checked = selectedStatuses.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleStatus(value)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm tracking-tighter rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <span className={`flex items-center justify-center size-4 rounded border shrink-0 transition-colors ${checked ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background"}`}>
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
                  <X size={11} /> Xóa lọc trạng thái
                </button>
              )}
            </PopoverContent>
          </Popover>

          {/* Priority filter */}
          <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal text-sm">
                Mức ưu tiên
                {selectedPriorities.length > 0 ? (
                  <Badge className="h-4.5 px-1.5 text-xs tracking-tighter rounded-full bg-primary text-primary-foreground">
                    {selectedPriorities.length}
                  </Badge>
                ) : (
                  <CaretDown size={13} className="text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1.5" align="start">
              {PRIORITY_OPTIONS.map(({ value, label }) => {
                const checked = selectedPriorities.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => togglePriority(value)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm tracking-tighter rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <span className={`flex items-center justify-center size-4 rounded border shrink-0 transition-colors ${checked ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background"}`}>
                      {checked && <Check size={11} weight="bold" />}
                    </span>
                    <span className={checked ? "font-medium" : ""}>{label}</span>
                  </button>
                );
              })}
              {selectedPriorities.length > 0 && (
                <button
                  onClick={() => { setSelectedPriorities([]); setPage(1); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 mt-1 text-xs text-muted-foreground border-t border-border/40 hover:text-foreground transition-colors"
                >
                  <X size={11} /> Xóa lọc ưu tiên
                </button>
              )}
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground gap-1 text-sm">
              <X size={13} /> Xóa bộ lọc
            </Button>
          )}

          <div className="ml-auto text-sm tracking-tighter text-muted-foreground whitespace-nowrap">
            {hasFilters && !isServerMode
              ? `${filteredAndSorted.length} / ${displayTotalCount.toLocaleString("vi-VN")} yêu cầu`
              : `${displayTotalCount.toLocaleString("vi-VN")} yêu cầu`}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <SortHeader column="id" label="ID" sort={sort} onSort={handleSort} />
                <th className="text-left p-3 text-sm tracking-tighter font-semibold text-foreground">Tình trạng</th>
                <SortHeader column="priority" label="Ưu tiên" sort={sort} onSort={handleSort} />
                <SortHeader column="status" label="Trạng thái" sort={sort} onSort={handleSort} />
                <SortHeader column="people" label="Số người" sort={sort} onSort={handleSort} />
                <th className="text-left p-3 text-sm tracking-tighter font-semibold text-foreground">Nhu cầu</th>
                <th className="text-left p-3 text-sm tracking-tighter font-semibold text-foreground">Địa chỉ</th>
                <SortHeader column="createdAt" label="Thời gian" sort={sort} onSort={handleSort} />
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
                  <td colSpan={8} className="p-10 text-center tracking-tighter text-muted-foreground text-sm">
                    Không tìm thấy yêu cầu SOS nào
                  </td>
                </tr>
              ) : (
                paginated.map((sos) => {
                  const status = statusConfig[sos.status] ?? { label: sos.status, className: "" };
                  const priority = priorityConfig[sos.priorityLevel];
                  const needs = deriveSOSNeeds(sos.structuredData, sos.sosType);
                  const peopleCount = getPeopleCount(sos);
                  const situation = sos.structuredData?.situation
                    ? getSituationLabel(sos.structuredData.situation)
                    : "—";
                  const typeLabel = getSosTypeLabel(sos.sosType);

                  return (
                    <tr
                      key={sos.id}
                      onClick={() => onRowClick?.(sos)}
                      className={cn(
                        "border-b border-border/30 transition-colors hover:bg-muted/30",
                        onRowClick && "cursor-pointer"
                      )}
                    >
                      <td className="p-3">
                        <div className="text-sm tracking-tighter font-medium text-foreground">
                          SOS #{sos.id}
                          {typeLabel !== "SOS" && (
                            <span className="ml-1 text-[10px] text-muted-foreground">[{typeLabel}]</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm tracking-tighter text-foreground/80 max-w-[140px] truncate">
                        {situation}
                      </td>
                      <td className="p-3">
                        <Badge variant={priority.variant} className="text-[10px]">
                          {priority.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={status.className}>{status.label}</Badge>
                      </td>
                      <td className="p-3 text-sm tracking-tighter text-foreground/80">
                        {peopleCount > 0 ? peopleCount : "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {needs.medical && (
                            <NeedChip className="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" icon={<Stethoscope className="h-3 w-3" weight="fill" />}>
                              Y tế
                            </NeedChip>
                          )}
                          {needs.food && (
                            <NeedChip className="bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300" icon={<ForkKnife className="h-3 w-3" weight="fill" />}>
                              Tiếp tế
                            </NeedChip>
                          )}
                          {needs.boat && (
                            <NeedChip className="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" icon={<Anchor className="h-3 w-3" weight="fill" />}>
                              PT
                            </NeedChip>
                          )}
                          {peopleCount > 0 && (
                            <NeedChip className="bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-200" icon={<Users className="h-3 w-3" weight="fill" />}>
                              {peopleCount}
                            </NeedChip>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm tracking-tighter text-foreground/70 max-w-[180px] truncate">
                        {sos.structuredData?.address || "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {timeAgo(sos.createdAt)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="text-sm tracking-tighter text-muted-foreground">
              Hiển thị {startItem}–{endItem} trong {displayTotalCount} yêu cầu
            </div>
            <div className="flex items-center gap-1.5">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); }}>
                <SelectTrigger className="w-16 h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground tracking-tighter">/ trang</span>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1 || isLoading}>
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
                      <Button key={p} variant={p === safePage ? "default" : "outline"} size="sm" onClick={() => setPage(p as number)} disabled={isLoading} className="min-w-10">
                        {p}
                      </Button>
                    )
                  )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages || isLoading}>
                Sau
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SOSRequestTable;
