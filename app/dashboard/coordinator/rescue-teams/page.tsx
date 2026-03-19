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
      className: "border-black bg-white text-black",
    },
    Ready: {
      label: "Sẵn sàng",
      variant: "default",
      className: "bg-black text-white hover:bg-black/90",
    },
    Gathering: {
      label: "Đang tập hợp",
      variant: "default",
      className: "bg-black text-white hover:bg-black/90",
    },
    Available: {
      label: "Trống",
      variant: "default",
      className: "bg-black text-white hover:bg-black/90",
    },
    Assigned: {
      label: "Đã phân công",
      variant: "default",
      className: "bg-black text-white hover:bg-black/90",
    },
    OnMission: {
      label: "Đang làm nhiệm vụ",
      variant: "default",
      className: "bg-black text-white hover:bg-black/90",
    },
    Stuck: {
      label: "Mắc kẹt",
      variant: "outline",
      className: "border-black bg-white text-black",
    },
    Unavailable: {
      label: "Không khả dụng",
      variant: "outline",
      className: "border-black bg-white text-black",
    },
    Disbanded: {
      label: "Đã giải tán",
      variant: "outline",
      className: "border-black bg-white text-black",
    },
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
      className: "border border-black bg-white text-black",
    },
    Medical: {
      label: "Y tế",
      className: "border border-black bg-white text-black",
    },
    Transportation: {
      label: "Vận chuyển",
      className: "border border-black bg-white text-black",
    },
    Mixed: {
      label: "Hỗn hợp",
      className: "border border-black bg-white text-black",
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
      status === "OnMission"
    ) {
      return "in-progress";
    }

    return "completed";
  };

  const columns = [
    {
      key: "todo",
      title: "Chờ điều phối",
      dotClassName: "bg-[#FF5722]",
      cardClassName: "bg-white border-black",
    },
    {
      key: "in-progress",
      title: "Đang triển khai",
      dotClassName: "bg-black",
      cardClassName: "bg-white border-black",
    },
    {
      key: "completed",
      title: "Hoàn tất / Ngưng",
      dotClassName: "bg-black",
      cardClassName: "bg-white border-black",
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
      <div className="mx-auto w-full max-w-[1480px] p-4 tracking-tighter md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold uppercase md:text-3xl">
              Quản lý Đội Cứu Hộ
            </h1>
            <p className="mt-1 text-black/70">
              Theo dõi đội theo trạng thái xử lý theo dạng Kanban trực quan
            </p>
          </div>
          <Button
            disabled
            className="gap-2 rounded-none bg-[#FF5722] text-white"
          >
            <Plus className="h-4 w-4" />
            Thêm đội cứu hộ
          </Button>
        </div>

        <div className="border border-black bg-white p-3 md:p-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, columnIndex) => (
              <div
                key={columnIndex}
                className="border border-black bg-white p-3"
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
                    <Card key={i} className="border-black shadow-none">
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
    <div className="mx-auto w-full max-w-[1480px] bg-white p-4 tracking-tighter md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase md:text-3xl">
            Quản lý Đội Cứu Hộ
          </h1>
          <p className="mt-1 text-black/70">
            Theo dõi, điều phối và cập nhật trạng thái đội cứu hộ theo luồng
            công việc
          </p>
        </div>

        <Link href="/dashboard/coordinator/rescue-teams/create">
          <Button className="gap-2 rounded-none bg-[#FF5722] px-4 text-white hover:bg-[#e64a19]">
            <UserPlus className="h-4 w-4" />
            Thêm đội cứu hộ
          </Button>
        </Link>
      </div>

      <div className="border border-black bg-[linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-[size:32px_32px] p-3 md:p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {columns.map((column) => {
            const columnTeams = teamsByColumn[column.key];

            return (
              <div
                key={column.key}
                className={`border p-3 ${column.cardClassName}`}
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
                        className="border-black bg-white shadow-none transition hover:-translate-y-0.5"
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
                              className="h-8 w-8 shrink-0 rounded-none border border-black"
                            >
                              <MoreVertical className="h-4 w-4 text-black/70" />
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
                              className="w-full gap-1.5 rounded-none border-black"
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
                    <div className="border border-dashed border-black bg-white px-4 py-10 text-center text-sm text-black/70">
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
            className="rounded-none border-black"
          >
            Trước
          </Button>

          <span className="text-sm text-black/70">
            Trang {data.pageNumber} / {data.totalPages}
          </span>

          <Button
            variant="outline"
            disabled={!data.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-none border-black"
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
