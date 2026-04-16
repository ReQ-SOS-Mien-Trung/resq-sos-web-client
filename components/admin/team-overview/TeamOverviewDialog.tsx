"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UsersThree,
  ArrowUp,
  ArrowDown,
  ArrowsDownUp,
  Clock,
} from "@phosphor-icons/react";
import { useRescueTeamsOverview } from "@/services/admin_dashboard/team-overview.hooks";
import { RescueTeamOverviewItem } from "@/services/admin_dashboard/team-overview.type";
import TeamDetailSheet from "./TeamDetailSheet";

interface TeamOverviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SortColumn =
  | "name"
  | "status"
  | "teamType"
  | "currentMemberCount"
  | "updatedAt";
type SortDir = "asc" | "desc";
type SortState = { column: SortColumn; dir: SortDir } | null;

const getStatusBadge = (status: string) => {
  const map: Record<string, { className: string }> = {
    Available: {
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    OnMission: { className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
    Standby: {
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    Disbanded: { className: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
  };
  return map[status] || { className: "bg-gray-500/10 text-gray-700" };
};

const SortIcon = ({
  column,
  sort,
}: {
  column: SortColumn;
  sort: SortState;
}) => {
  if (sort?.column === column)
    return sort.dir === "asc" ? (
      <ArrowUp size={13} className="text-primary shrink-0" />
    ) : (
      <ArrowDown size={13} className="text-primary shrink-0" />
    );
  return (
    <ArrowsDownUp size={13} className="text-muted-foreground/30 shrink-0" />
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
      className="flex items-center gap-1 text-sm font-semibold text-foreground tracking-tighter hover:text-foreground/70 transition-colors"
    >
      {label}
      <SortIcon column={column} sort={sort} />
    </button>
  </th>
);

const TeamOverviewDialog = ({
  open,
  onOpenChange,
}: TeamOverviewDialogProps) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<SortState>(null);
  const [selectedTeam, setSelectedTeam] = useState<{
    open: boolean;
    teamId: number;
  }>({ open: false, teamId: 0 });

  const { data, isLoading } = useRescueTeamsOverview(
    { pageNumber: page, pageSize },
    { enabled: open },
  );

  const teams = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Client-side sort (server already sorted by updatedAt DESC)
  const sortedTeams = sort
    ? [...teams].sort((a, b) => {
        let cmp = 0;
        if (sort.column === "name") cmp = a.name.localeCompare(b.name, "vi");
        else if (sort.column === "status")
          cmp = a.status.localeCompare(b.status);
        else if (sort.column === "teamType")
          cmp = a.teamType.localeCompare(b.teamType);
        else if (sort.column === "currentMemberCount")
          cmp = a.currentMemberCount - b.currentMemberCount;
        else if (sort.column === "updatedAt")
          cmp =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        return sort.dir === "asc" ? cmp : -cmp;
      })
    : teams;

  const handleSort = (column: SortColumn) => {
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, dir: "asc" };
      if (prev.dir === "asc") return { column, dir: "desc" };
      return null;
    });
  };

  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b border-border/50 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UsersThree size={22} className="text-red-500" weight="fill" />
              Tổng quan đội cứu hộ
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Danh sách tất cả đội cứu hộ, ưu tiên biến động mới nhất
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* ── Table ──────────────────────────────────────────────── */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 text-sm font-semibold text-foreground tracking-tighter">
                      Mã
                    </th>
                    <SortHeader
                      column="name"
                      label="Tên đội"
                      sort={sort}
                      onSort={handleSort}
                    />
                    <SortHeader
                      column="teamType"
                      label="Loại"
                      sort={sort}
                      onSort={handleSort}
                    />
                    <SortHeader
                      column="status"
                      label="Trạng thái"
                      sort={sort}
                      onSort={handleSort}
                    />
                    <th className="text-left p-3 text-sm font-semibold text-foreground tracking-tighter">
                      Điểm tập kết
                    </th>
                    <SortHeader
                      column="currentMemberCount"
                      label="Thành viên"
                      sort={sort}
                      onSort={handleSort}
                    />
                    <SortHeader
                      column="updatedAt"
                      label="Cập nhật"
                      sort={sort}
                      onSort={handleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/30">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="p-3">
                            <Skeleton className="h-4 w-full rounded" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : sortedTeams.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-10 text-center tracking-tighter text-muted-foreground text-sm"
                      >
                        Không có đội cứu hộ nào
                      </td>
                    </tr>
                  ) : (
                    sortedTeams.map((team: RescueTeamOverviewItem) => (
                      <tr
                        key={team.id}
                        onClick={() =>
                          setSelectedTeam({ open: true, teamId: team.id })
                        }
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {team.code}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-medium text-foreground">
                            {team.name}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {team.teamType}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            className={`text-xs ${getStatusBadge(team.status).className}`}
                          >
                            {team.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-foreground/80 tracking-tighter">
                          {team.assemblyPointName}
                        </td>
                        <td className="p-3 text-sm text-foreground/80">
                          {team.currentMemberCount}/{team.maxMembers}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock size={12} />
                            {new Date(team.updatedAt).toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm tracking-tighter text-muted-foreground">
                Hiển thị {startItem}–{endItem} trong {totalCount} đội
              </span>
              <div className="flex items-center gap-1.5">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-16 h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground tracking-tighter">
                  / trang
                </span>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  Trước
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 || p === totalPages || Math.abs(p - page) <= 1,
                    )
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
                        <span
                          key={`ellipsis-${i}`}
                          className="px-1 text-muted-foreground text-sm tracking-tighter"
                        >
                          …
                        </span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(p as number)}
                          disabled={isLoading}
                          className="min-w-10"
                        >
                          {p}
                        </Button>
                      ),
                    )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isLoading}
                >
                  Sau
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Detail Sheet */}
      <TeamDetailSheet
        open={selectedTeam.open}
        onOpenChange={(v) => setSelectedTeam((prev) => ({ ...prev, open: v }))}
        teamId={selectedTeam.teamId}
      />
    </>
  );
};

export default TeamOverviewDialog;
