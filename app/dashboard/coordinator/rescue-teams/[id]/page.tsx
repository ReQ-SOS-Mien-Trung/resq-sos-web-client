"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRescueTeamById } from "@/services/rescue_teams/hooks";
import type {
  RescueTeamStatusKey,
  RescueTeamTypeKey,
  RescueTeamMemberDetail,
} from "@/services/rescue_teams/type";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Users,
  Shield,
  UserCheck,
  UserX,
  UserRoundPlus,
  Phone,
  CalendarClock,
  Building2,
  Crown,
  UserRound,
  Activity,
} from "lucide-react";

const DEFAULT_RESCUER_AVATAR =
  "https://res.cloudinary.com/dezgwdrfs/image/upload/v1773504004/611251674_1432765175119052_6622750233977483141_n_sgxqxd.png";

const teamTypeMap: Record<
  RescueTeamTypeKey,
  { label: string; className: string }
> = {
  Rescue: {
    label: "Cứu hộ",
    className: "text-orange-700 bg-orange-100 border-orange-200",
  },
  Medical: {
    label: "Y tế",
    className: "text-red-700 bg-red-100 border-red-200",
  },
  Transportation: {
    label: "Vận chuyển",
    className: "text-blue-700 bg-blue-100 border-blue-200",
  },
  Mixed: {
    label: "Hỗn hợp",
    className: "text-violet-700 bg-violet-100 border-violet-200",
  },
};

const statusMap: Record<
  RescueTeamStatusKey,
  {
    label: string;
    className: string;
    tone: "good" | "warn" | "danger" | "neutral";
  }
> = {
  AwaitingAcceptance: {
    label: "Chờ xác nhận",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    tone: "neutral",
  },
  Ready: {
    label: "Sẵn sàng",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    tone: "good",
  },
  Gathering: {
    label: "Đang tập hợp",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    tone: "warn",
  },
  Available: {
    label: "Trống",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    tone: "good",
  },
  Assigned: {
    label: "Đã phân công",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    tone: "warn",
  },
  OnMission: {
    label: "Đang làm nhiệm vụ",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    tone: "warn",
  },
  Stuck: {
    label: "Mắc kẹt",
    className: "bg-red-100 text-red-700 border-red-200",
    tone: "danger",
  },
  Unavailable: {
    label: "Không khả dụng",
    className: "bg-red-100 text-red-700 border-red-200",
    tone: "danger",
  },
  Disbanded: {
    label: "Đã giải tán",
    className: "bg-zinc-100 text-zinc-700 border-zinc-200",
    tone: "neutral",
  },
};

const memberStatusMap: Record<string, { label: string; className: string }> = {
  Accepted: {
    label: "Đã xác nhận",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  Pending: {
    label: "Đang chờ",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  Rejected: {
    label: "Từ chối",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

function formatDate(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MemberCard({ member }: { member: RescueTeamMemberDetail }) {
  const initials =
    `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.toUpperCase() ||
    "?";
  const status = memberStatusMap[member.status] || {
    label: member.status,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border border-background shadow-sm">
            <AvatarImage src={member.avatarUrl || DEFAULT_RESCUER_AVATAR} />
            <AvatarFallback className="bg-gradient-to-br from-slate-500 to-slate-700 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold truncate">
                {member.firstName} {member.lastName}
              </p>
              {member.isLeader && (
                <Badge className="h-5 px-1.5 text-[10px] bg-amber-500 hover:bg-amber-600 text-white">
                  <Crown className="mr-1 h-3 w-3" />
                  Đội trưởng
                </Badge>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {member.rescuerType === "Core" ? "Cốt cán" : "Tình nguyện"}
              </Badge>
              <Badge
                variant="outline"
                className={`h-5 px-1.5 text-[10px] ${status.className}`}
              >
                {status.label}
              </Badge>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                {member.checkedIn ? "Đã check-in" : "Chưa check-in"}
              </Badge>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{member.phone || "Không có số điện thoại"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RescueTeamDetailPage() {
  const params = useParams();
  const teamId = Number(params?.id);

  const { data, isLoading, isError } = useRescueTeamById(teamId, {
    enabled: Number.isFinite(teamId) && teamId > 0,
  });

  const memberStats = useMemo(() => {
    const members = data?.members ?? [];
    return {
      total: members.length,
      accepted: members.filter((m) => m.status === "Accepted").length,
      pending: members.filter((m) => m.status === "Pending").length,
      rejected: members.filter((m) => m.status === "Rejected").length,
      leaders: members.filter((m) => m.isLeader).length,
    };
  }, [data?.members]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1320px] p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-6 w-40" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-[920px] p-6">
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="p-8 text-center">
            <p className="text-base font-semibold text-rose-700">
              Không tải được chi tiết đội cứu hộ.
            </p>
            <p className="mt-2 text-sm text-rose-600/80">
              Vui lòng thử lại hoặc quay về danh sách đội.
            </p>
            <div className="mt-5">
              <Link href="/dashboard/coordinator/rescue-teams">
                <Button variant="outline" className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại danh sách
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teamType = teamTypeMap[data.teamType] || {
    label: data.teamType,
    className: "text-slate-700 bg-slate-100 border-slate-200",
  };
  const teamStatus = statusMap[data.status] || {
    label: data.status,
    className: "bg-slate-100 text-slate-700 border-slate-200",
    tone: "neutral" as const,
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link href="/dashboard/coordinator/rescue-teams">
            <Button variant="ghost" className="h-8 px-2 text-xs gap-1.5 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Danh sách đội cứu hộ
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Chi tiết đội cứu hộ
          </h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi thông tin đội, thành viên và mức độ sẵn sàng theo thời gian
            thực.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`h-7 px-2.5 border ${teamType.className}`}
          >
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            {teamType.label}
          </Badge>
          <Badge
            variant="outline"
            className={`h-7 px-2.5 border ${teamStatus.className}`}
          >
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            {teamStatus.label}
          </Badge>
        </div>
      </div>

      <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-emerald-50 via-white to-sky-50">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {data.code}
              </p>
              <h2 className="text-xl md:text-2xl font-bold mt-1">
                {data.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {data.assemblyPointName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-4 w-4" />
                  Quản lý bởi: {data.managedBy}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 min-w-[240px]">
              <div className="rounded-xl border bg-white/90 p-3">
                <p className="text-[11px] text-muted-foreground">Quân số</p>
                <p className="mt-1 text-lg font-bold">
                  {memberStats.total}/{data.maxMembers}
                </p>
              </div>
              <div className="rounded-xl border bg-white/90 p-3">
                <p className="text-[11px] text-muted-foreground">Đội trưởng</p>
                <p className="mt-1 text-lg font-bold">{memberStats.leaders}</p>
              </div>
              <div className="rounded-xl border bg-white/90 p-3">
                <p className="text-[11px] text-muted-foreground">Ngày lập</p>
                <p className="mt-1 text-xs font-semibold leading-tight">
                  {formatDate(data.createdAt)}
                </p>
              </div>
              <div className="rounded-xl border bg-white/90 p-3">
                <p className="text-[11px] text-muted-foreground">
                  Ngày tập kết
                </p>
                <p className="mt-1 text-xs font-semibold leading-tight">
                  {formatDate(data.assemblyDate)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base md:text-lg font-semibold">
            Thống kê thành viên
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-4">
              <p className="text-xs text-emerald-700/80">Đã xác nhận</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {memberStats.accepted}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="p-4">
              <p className="text-xs text-amber-700/80">Đang chờ</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {memberStats.pending}
              </p>
            </CardContent>
          </Card>
          <Card className="border-rose-200 bg-rose-50/40">
            <CardContent className="p-4">
              <p className="text-xs text-rose-700/80">Từ chối</p>
              <p className="mt-1 text-2xl font-bold text-rose-700">
                {memberStats.rejected}
              </p>
            </CardContent>
          </Card>
          <Card className="border-sky-200 bg-sky-50/40">
            <CardContent className="p-4">
              <p className="text-xs text-sky-700/80">Còn trống</p>
              <p className="mt-1 text-2xl font-bold text-sky-700">
                {Math.max(0, data.maxMembers - memberStats.total)}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base md:text-lg font-semibold">
            Danh sách thành viên ({memberStats.total})
          </h3>
        </div>

        {data.members.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <UserRoundPlus className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                Đội này chưa có thành viên.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.members.map((member) => (
              <MemberCard key={member.userId} member={member} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
