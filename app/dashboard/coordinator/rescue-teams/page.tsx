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
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MapPin, Activity, ArrowRight, UserPlus } from "lucide-react";
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Quản lý Đội Cứu Hộ
            </h1>
            <p className="text-muted-foreground mt-1">
              Xem và quản lý các đội cứu hộ hiện có trên hệ thống
            </p>
          </div>
          <Button disabled className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Tạo Đội Mới
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full ml-2" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="space-y-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-start gap-2">
                    <Skeleton className="h-4 w-4 rounded-full shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 border-t mt-4 border-slate-100">
                <div className="w-full mt-4 flex justify-center">
                  <Skeleton className="h-9 w-32" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-red-500 text-center">
        Đã xảy ra lỗi khi tải danh sách đội cứu hộ.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Quản lý Đội Cứu Hộ
          </h1>
          <p className="text-muted-foreground mt-1">
            Xem và quản lý các đội cứu hộ hiện có trên hệ thống
          </p>
        </div>
        <Link href="/dashboard/coordinator/rescue-teams/create">
          <Button className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Tạo Đội Mới
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data?.items.map((team) => (
          <Card
            key={team.id}
            className="h-full flex flex-col hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">
                    {team.code}
                  </div>
                  <CardTitle className="text-lg line-clamp-1" title={team.name}>
                    {team.name}
                  </CardTitle>
                </div>
                <div className="ml-2">{getStatusBadge(team.status)}</div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {getTypeBadge(team.teamType)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-medium text-foreground">
                      {team.currentMemberCount}
                    </span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-muted-foreground">
                      {team.maxMembers}
                    </span>{" "}
                    thành viên
                  </span>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="line-clamp-2" title={team.assemblyPointName}>
                    {team.assemblyPointName}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0 border-t mt-4 border-slate-100">
              <Link
                href={`/dashboard/coordinator/rescue-teams/${team.id}`}
                className="w-full mt-4"
              >
                <Button
                  variant="ghost"
                  className="w-full text-primary hover:text-primary/80"
                >
                  Xem chi tiết <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}

        {data?.items.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            Chưa có đội cứu hộ nào. Hãy tạo mới.
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <Button
            variant="outline"
            disabled={!data.hasPreviousPage}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
