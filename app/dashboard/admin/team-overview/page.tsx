"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { DashboardLayout } from "@/components/admin/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowLeft,
  CaretDown,
  CaretRight,
} from "@phosphor-icons/react";
import { useRescueTeamsOverview } from "@/services/admin_dashboard/team-overview.hooks";
import { RescueTeamOverviewItem } from "@/services/admin_dashboard/team-overview.type";
import {
  useRescueTeamStatuses,
  useRescueTeamTypes,
} from "@/services/rescue_teams/hooks";
import {
  TeamDetailPanel,
  getStatusBadge,
} from "@/components/admin/team-overview/TeamDetailPanel";

type SortColumn =
  | "name"
  | "status"
  | "teamType"
  | "currentMemberCount"
  | "updatedAt";
type SortDir = "asc" | "desc";
type SortState = { column: SortColumn; dir: SortDir } | null;

const TEAM_TYPE_BADGE_CLASS: Record<string, string> = {
  Rescue: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  Medical: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Transportation: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Mixed: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
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
      className="flex items-center gap-1 text-sm font-semibold tracking-tighter text-foreground hover:text-foreground/70 transition-colors"
    >
      {label}
      <SortIcon column={column} sort={sort} />
    </button>
  </th>
);

const TeamOverviewPage = () => {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<SortState>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

  useEffect(() => {
    getDashboardData().then(setDashboardData).catch(console.error);
  }, []);

  const { data, isLoading } = useRescueTeamsOverview({
    pageNumber: page,
    pageSize,
  });
  const { data: rescueTeamStatuses = [] } = useRescueTeamStatuses();
  const { data: rescueTeamTypes = [] } = useRescueTeamTypes();

  const teams = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rescueTeamStatusMap = Object.fromEntries(
    rescueTeamStatuses.map((status) => [status.key, status.value]),
  );
  const rescueTeamTypeMap = Object.fromEntries(
    rescueTeamTypes.map((type) => [type.key, type.value]),
  );

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

  const handleRowClick = (teamId: number) => {
    setExpandedTeamId((prev) => (prev === teamId ? null : teamId));
  };

  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <DashboardLayout
      favorites={dashboardData?.favorites ?? []}
      projects={dashboardData?.projects ?? []}
      cloudStorage={
        dashboardData?.cloudStorage ?? {
          used: 0,
          total: 0,
          percentage: 0,
          unit: "GB",
        }
      }
    >
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Page Header */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-2"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
        >
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center mb-2 gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              <span className="tracking-tighter text-sm font-medium">
                Quay lại
              </span>
            </button>
            <div className="flex items-center gap-2.5 mb-1">
              <UsersThree size={24} weight="fill" className="text-red-500" />
              <p className="text-sm font-semibold uppercase tracking-tighter text-muted-foreground">
                Nhân sự
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Tổng quan đội cứu hộ
            </h1>
            <p className="text-base tracking-tighter text-muted-foreground mt-1.5">
              Danh sách tất cả đội, ưu tiên biến động mới nhất
            </p>
          </div>
        </motion.div>

        {/* Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
        >
          <Card className="border border-border/50 py-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="w-8 p-3" />
                      <th className="text-left p-3 text-sm tracking-tighter font-semibold text-foreground">
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
                      <th className="text-left p-3 text-sm tracking-tighter font-semibold text-foreground">
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
                          {Array.from({ length: 8 }).map((__, j) => (
                            <td key={j} className="p-3">
                              <Skeleton className="h-4 w-full rounded" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : sortedTeams.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-10 text-center tracking-tighter text-muted-foreground text-sm"
                        >
                          Không có đội cứu hộ nào
                        </td>
                      </tr>
                    ) : (
                      sortedTeams.map(
                        (team: RescueTeamOverviewItem, rowIdx: number) => {
                          const isExpanded = expandedTeamId === team.id;
                          const statusBadge = getStatusBadge(team.status);
                          const statusLabel =
                            rescueTeamStatusMap[team.status] ?? team.status;
                          const teamTypeLabel =
                            rescueTeamTypeMap[team.teamType] ?? team.teamType;
                          const teamTypeBadgeClass =
                            TEAM_TYPE_BADGE_CLASS[team.teamType] ??
                            "border-border/60 bg-background text-foreground";
                          return (
                            <React.Fragment key={team.id}>
                              <tr
                                onClick={() => handleRowClick(team.id)}
                                className={`transition-colors cursor-pointer ${isExpanded ? "bg-muted/40" : ""}`}
                                style={{
                                  animationDelay: `${rowIdx * 40}ms`,
                                  animation: "fadeSlideIn 0.35s ease-out both",
                                }}
                              >
                                <td className="p-3 w-8">
                                  {isExpanded ? (
                                    <CaretDown
                                      size={14}
                                      className="text-muted-foreground"
                                    />
                                  ) : (
                                    <CaretRight
                                      size={14}
                                      className="text-muted-foreground"
                                    />
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className="text-sm font-medium text-foreground tracking-tighter">
                                    {team.code}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="text-sm font-medium text-foreground tracking-tighter">
                                    {team.name}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <Badge
                                    className={`text-sm tracking-tighter ${teamTypeBadgeClass}`}
                                  >
                                    {teamTypeLabel}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  <Badge
                                    className={`text-sm ${statusBadge.className}`}
                                  >
                                    {statusLabel}
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm tracking-tighter text-foreground/80">
                                  {team.assemblyPointName}
                                </td>
                                <td className="p-3 text-sm tracking-tighter">
                                  <span
                                    className={
                                      team.currentMemberCount >= team.maxMembers
                                        ? "text-rose-500 tracking-tighter font-semibold"
                                        : "tracking-tighter font-semibold"
                                    }
                                  >
                                    {team.currentMemberCount}
                                  </span>
                                  <span className="text-muted-foreground font-mono tracking-tighter">
                                    /{team.maxMembers}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground tracking-tighter">
                                    {new Date(team.updatedAt).toLocaleString(
                                      "vi-VN",
                                      {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </div>
                                </td>
                              </tr>

                              <AnimatePresence>
                                {isExpanded && (
                                  <tr
                                    key={`detail-${team.id}`}
                                    className="border-b border-border/40 bg-muted/10"
                                  >
                                    <td
                                      colSpan={8}
                                      className="p-0 overflow-hidden"
                                    >
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{
                                          duration: 0.3,
                                          ease: "easeInOut",
                                        }}
                                      >
                                        <TeamDetailPanel teamId={team.id} />
                                      </motion.div>
                                    </td>
                                  </tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        },
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    Hiển thị {startItem}–{endItem} trong {totalCount} đội
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v));
                        setPage(1);
                        setExpandedTeamId(null);
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
                    <span className="text-sm text-muted-foreground">
                      / trang
                    </span>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPage((p) => Math.max(1, p - 1));
                        setExpandedTeamId(null);
                      }}
                      disabled={page === 1 || isLoading}
                    >
                      Trước
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (p) =>
                            p === 1 ||
                            p === totalPages ||
                            Math.abs(p - page) <= 1,
                        )
                        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                          if (
                            idx > 0 &&
                            typeof arr[idx - 1] === "number" &&
                            (p as number) - (arr[idx - 1] as number) > 1
                          )
                            acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === "..." ? (
                            <span
                              key={`ellipsis-${i}`}
                              className="px-1 text-muted-foreground text-sm"
                            >
                              …
                            </span>
                          ) : (
                            <Button
                              key={p}
                              variant={p === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setPage(p as number);
                                setExpandedTeamId(null);
                              }}
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
                      onClick={() => {
                        setPage((p) => Math.min(totalPages, p + 1));
                        setExpandedTeamId(null);
                      }}
                      disabled={page === totalPages || isLoading}
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default TeamOverviewPage;
