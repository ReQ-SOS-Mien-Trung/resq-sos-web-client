"use client";

import { useRescueTeams } from "@/services/rescue_teams/hooks";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  MapPin,
  Activity,
  ArrowRight,
  UserPlus,
  Plus,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import {
  RescueTeamStatusKey,
  RescueTeamTypeKey,
} from "@/services/rescue_teams/type";

export default function RescueTeamsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useRescueTeams({
    params: {
      pageNumber: page,
      pageSize: 10,
    },
  });

  const statusMap: Record<
    RescueTeamStatusKey,
    { label: string; variant: string; className?: string }
  > = {
    AwaitingAcceptance: {
      label: "Chờ xác nhận",
      variant: "outline",
      className: "bg-gray-100 text-gray-700",
    },
    Ready: {
      label: "Sẵn sàng",
      variant: "default",
      className: "bg-green-500 hover:bg-green-600",
    },
    Gathering: {
      label: "Đang tập hợp",
      variant: "default",
      className: "bg-yellow-500 hover:bg-yellow-600",
    },
    Available: {
      label: "Trống",
      variant: "default",
      className: "bg-green-500 hover:bg-green-600",
    },
    Assigned: {
      label: "Đã phân công",
      variant: "default",
      className: "bg-yellow-500 hover:bg-yellow-600",
    },
    OnMission: {
      label: "Đang làm nhiệm vụ",
      variant: "default",
      className: "bg-blue-500 hover:bg-blue-600",
    },
    Stuck: { label: "Mắc kẹt", variant: "destructive" },
    Unavailable: { label: "Không khả dụng", variant: "destructive" },
    Disbanded: { label: "Đã giải tán", variant: "secondary" },
  };

  const getStatusBadge = (status: RescueTeamStatusKey) => {
    const config = statusMap[status] || { label: status, variant: "outline" };
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const typeMap: Record<
    RescueTeamTypeKey,
    { label: string; className: string }
  > = {
    Rescue: {
      label: "Cứu hộ",
      className: "text-orange-500 bg-orange-50 hover:bg-orange-100",
    },
    Medical: {
      label: "Y tế",
      className: "text-red-500 bg-red-50 hover:bg-red-100",
    },
    Transportation: {
      label: "Vận chuyển",
      className: "text-blue-500 bg-blue-50 hover:bg-blue-100",
    },
    Mixed: {
      label: "Hỗn hợp",
      className: "text-purple-500 bg-purple-50 hover:bg-purple-100",
    },
  };

  const getTypeBadge = (type: RescueTeamTypeKey) => {
    const config = typeMap[type] || { label: type, className: "" };
    return (
      <Badge variant="secondary" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getOccupancyPercent = (
    currentMemberCount: number,
    maxMembers: number,
  ) => {
    if (maxMembers <= 0) return 0;
    return Math.min(100, Math.round((currentMemberCount / maxMembers) * 100));
  };

  const getColumnKey = (status: RescueTeamStatusKey) => {
    if (
      status === "AwaitingAcceptance" ||
      status === "Ready" ||
      status === "Available"
    ) {
      return "todo";
    }

    if (
      status === "Gathering" ||
      status === "Assigned" ||
      status === "OnMission" ||
      status === "Stuck"
    ) {
      return "in-progress";
    }

    return "completed";
  };

  const columns = [
    {
      key: "todo",
      title: "Chờ điều phối",
      dotClassName: "bg-orange-500",
      cardClassName: "bg-orange-50/30 border-orange-100",
    },
    {
      key: "in-progress",
      title: "Đang triển khai",
      dotClassName: "bg-blue-500",
      cardClassName: "bg-blue-50/30 border-blue-100",
    },
    {
      key: "completed",
      title: "Hoàn tất / Ngưng",
      dotClassName: "bg-emerald-500",
      cardClassName: "bg-emerald-50/30 border-emerald-100",
    },
  ] as const;

  const teams = data?.items ?? [];
  const teamsByColumn = teams.reduce(
    (acc, team) => {
      acc[getColumnKey(team.status)].push(team);
      return acc;
    },
    {
      todo: [] as typeof teams,
      "in-progress": [] as typeof teams,
      completed: [] as typeof teams,
    },
  );

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1480px] p-4 md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Quản lý Đội Cứu Hộ
            </h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi đội theo trạng thái xử lý theo dạng Kanban trực quan
            </p>
          </div>
          <Button disabled className="gap-2">
            <Plus className="h-4 w-4" />
            Thêm đội cứu hộ
          </Button>
        </div>

        <div className="rounded-3xl border bg-slate-50/80 p-3 md:p-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, columnIndex) => (
              <div
                key={columnIndex}
                className="rounded-2xl border bg-white/70 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2.5 w-2.5 rounded-full" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>

                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border-slate-200/80 shadow-sm">
                      <CardHeader className="space-y-2 pb-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-5 w-3/4" />
                      </CardHeader>
                      <CardContent className="space-y-2 pb-3 text-sm">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-2.5 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Skeleton className="h-9 w-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500">
        Đã xảy ra lỗi khi tải danh sách đội cứu hộ.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Quản lý Đội Cứu Hộ
          </h1>
          <p className="mt-1 text-muted-foreground">
            Theo dõi, điều phối và cập nhật trạng thái đội cứu hộ theo luồng
            công việc
          </p>
        </div>

        <Link href="/dashboard/coordinator/rescue-teams/create">
          <Button className="gap-2 rounded-xl px-4">
            <UserPlus className="h-4 w-4" />
            Thêm đội cứu hộ
          </Button>
        </Link>
      </div>

      <div className="rounded-3xl border bg-slate-50/80 p-3 md:p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {columns.map((column) => {
            const columnTeams = teamsByColumn[column.key];

            return (
              <div
                key={column.key}
                className={`rounded-2xl border p-3 ${column.cardClassName}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${column.dotClassName}`}
                    />
                    <h2 className="text-lg font-semibold">{column.title}</h2>
                    <span className="text-sm text-muted-foreground">
                      ({columnTeams.length})
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {columnTeams.map((team) => {
                    const occupancy = getOccupancyPercent(
                      team.currentMemberCount,
                      team.maxMembers,
                    );

                    return (
                      <Card
                        key={team.id}
                        className="border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="mb-1 text-xs text-muted-foreground">
                                {team.code}
                              </p>
                              <CardTitle
                                className="line-clamp-1 text-lg"
                                title={team.name}
                              >
                                {team.name}
                              </CardTitle>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-md"
                            >
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3 pb-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            {getTypeBadge(team.teamType)}
                            {getStatusBadge(team.status)}
                          </div>

                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                Quân số
                              </span>
                              <span>{occupancy}%</span>
                            </div>

                            <Progress value={occupancy} className="h-2" />

                            <p className="mt-1 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {team.currentMemberCount}
                              </span>{" "}
                              / {team.maxMembers} thành viên
                            </p>
                          </div>

                          <div className="flex items-start gap-2 text-muted-foreground">
                            <Activity className="mt-0.5 h-4 w-4 shrink-0" />
                            <p className="line-clamp-1">
                              Đội {typeMap[team.teamType]?.label ?? "khác"}
                            </p>
                          </div>

                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                            <p
                              className="line-clamp-2"
                              title={team.assemblyPointName}
                            >
                              {team.assemblyPointName}
                            </p>
                          </div>
                        </CardContent>

                        <CardFooter className="border-t pt-3">
                          <Link
                            href={`/dashboard/coordinator/rescue-teams/${team.id}`}
                            className="w-full"
                          >
                            <Button
                              variant="outline"
                              className="w-full gap-1.5 rounded-lg"
                            >
                              Xem chi tiết
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </CardFooter>
                      </Card>
                    );
                  })}

                  {columnTeams.length === 0 && (
                    <div className="rounded-xl border border-dashed bg-white/70 px-4 py-10 text-center text-sm text-muted-foreground">
                      Không có đội trong cột này.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            disabled={!data.hasPreviousPage}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg"
          >
            Trước
          </Button>

          <span className="text-sm text-muted-foreground">
            Trang {data.pageNumber} / {data.totalPages}
          </span>

          <Button
            variant="outline"
            disabled={!data.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg"
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
