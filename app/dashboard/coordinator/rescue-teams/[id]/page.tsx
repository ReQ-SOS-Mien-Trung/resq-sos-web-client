"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  useRescueTeamById,
  useAddRescueTeamMember,
  useRemoveRescueTeamMember,
} from "@/services/rescue_teams/hooks";
import { useRescuers } from "@/services/rescuers/hooks";
import type {
  RescueTeamStatusKey,
  RescueTeamTypeKey,
  RescueTeamMemberDetail,
} from "@/services/rescue_teams/type";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  House,
  Shield,
  UserRoundPlus,
  Phone,
  Mail,
  Building2,
  Crown,
  UserRound,
  Activity,
  Loader2,
  UserPlus,
  Trash2,
  Search,
} from "lucide-react";

const DEFAULT_RESCUER_AVATAR =
  "https://res.cloudinary.com/dezgwdrfs/image/upload/v1773504004/611251674_1432765175119052_6622750233977483141_n_sgxqxd.png";

const teamTypeMap: Record<
  RescueTeamTypeKey,
  { label: string; className: string }
> = {
  Rescue: {
    label: "Cứu hộ",
    className: "border-orange-200/50 bg-orange-100/50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
  },
  Medical: {
    label: "Y tế",
    className: "border-emerald-200/50 bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  },
  Transportation: {
    label: "Vận chuyển",
    className: "border-sky-200/50 bg-sky-100/50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
  },
  Mixed: {
    label: "Hỗn hợp",
    className: "border-slate-200/50 bg-slate-100/50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
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
    className: "border-amber-200/50 bg-amber-100/50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    tone: "neutral",
  },
  Ready: {
    label: "Sẵn sàng",
    className: "border-emerald-200/50 bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    tone: "good",
  },
  Gathering: {
    label: "Đang tập hợp",
    className: "border-sky-200/50 bg-sky-100/50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
    tone: "warn",
  },
  Available: {
    label: "Sẵn sàng",
    className: "border-teal-200/50 bg-teal-100/50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20",
    tone: "good",
  },
  Assigned: {
    label: "Đã phân công",
    className: "border-indigo-200/50 bg-indigo-100/50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
    tone: "warn",
  },
  OnMission: {
    label: "Đang làm nhiệm vụ",
    className: "border-violet-200/50 bg-violet-100/50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
    tone: "warn",
  },
  Stuck: {
    label: "Mắc kẹt",
    className: "border-rose-200/50 bg-rose-100/50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    tone: "danger",
  },
  Unavailable: {
    label: "Không khả dụng",
    className: "border-zinc-200/50 bg-zinc-100/50 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20",
    tone: "danger",
  },
  Disbanded: {
    label: "Đã giải tán",
    className: "border-slate-200/50 bg-slate-100/50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
    tone: "neutral",
  },
};

const memberStatusMap: Record<string, { label: string; className: string }> = {
  Accepted: {
    label: "Đã xác nhận",
    className: "bg-emerald-100/50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  },
  Pending: {
    label: "Đang chờ",
    className: "bg-amber-100/50 text-amber-700 border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
  Rejected: {
    label: "Từ chối",
    className: "bg-rose-100/50 text-rose-700 border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
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

function extractApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: {
      data?: {
        message?: string;
        title?: string;
        errors?: {
          _domainMsg?: string[];
          [key: string]: string[] | undefined;
        };
      };
    };
    message?: string;
  };

  const domain = err.response?.data?.errors?._domainMsg;
  if (Array.isArray(domain) && domain.length > 0) {
    return domain[0] || fallback;
  }

  return (
    err.response?.data?.message ||
    err.response?.data?.title ||
    err.message ||
    fallback
  );
}

function MemberCard({
  member,
  onRemove,
  isRemoving,
  canRemove,
}: {
  member: RescueTeamMemberDetail;
  onRemove: (member: RescueTeamMemberDetail) => void;
  isRemoving: boolean;
  canRemove: boolean;
}) {
  const initials =
    `${member.lastName?.[0] || ""}${member.firstName?.[0] || ""}`.toUpperCase() ||
    "?";
  const status = memberStatusMap[member.status] || {
    label: member.status,
    className: "border-black bg-white text-black",
  };
  const rescuerTypeBadge =
    member.rescuerType === "Core"
      ? {
          label: "Nhân viên nòng cốt",
          className: "bg-blue-100/50 text-blue-700 border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
        }
      : {
          label: "Tình nguyện",
          className: "bg-orange-100/50 text-orange-700 border-orange-200/50 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
        };

  return (
    <Card className="border-border/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-sm transition-all hover:shadow-md hover:-translate-y-1 rounded-3xl overflow-hidden group">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/10 shadow-sm transition-transform group-hover:scale-105">
            <AvatarImage src={member.avatarUrl || DEFAULT_RESCUER_AVATAR} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-900 text-sm font-bold text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-foreground truncate">
                  {member.lastName} {member.firstName}
                </p>
                {member.isLeader && (
                  <Badge className="h-6 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-2.5 text-[10px] font-bold text-white border-0 shadow-sm">
                    <Crown className="mr-1 h-3.5 w-3.5" />
                    Đội trưởng
                  </Badge>
                )}
              </div>
              {canRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full border border-border/50 bg-white/50 dark:bg-zinc-800/50 px-3 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-500/10 transition-colors"
                  onClick={() => onRemove(member)}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5 text-xs font-medium">Xóa</span>
                </Button>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              <Badge
                variant="outline"
                className={`h-6 rounded-full px-2.5 font-medium ${rescuerTypeBadge.className}`}
              >
                {rescuerTypeBadge.label}
              </Badge>
              <Badge
                variant="outline"
                className={`h-6 rounded-full px-2.5 font-medium ${status.className}`}
              >
                {status.label}
              </Badge>
            </div>

            <div className="mt-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Phone className="h-3 w-3" />
                </div>
                <span>{member.phone || "Không có số điện thoại"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Mail className="h-3 w-3" />
                </div>
                <span className="min-w-0 truncate">
                  {member.email || "Không có email"}
                </span>
              </div>
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
  const [rescuerSearch, setRescuerSearch] = useState("");
  const [debouncedRescuerSearch, setDebouncedRescuerSearch] = useState("");
  const [selectedRescuerId, setSelectedRescuerId] = useState("");
  const [addAsLeader, setAddAsLeader] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [memberPendingRemove, setMemberPendingRemove] =
    useState<RescueTeamMemberDetail | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedRescuerSearch(rescuerSearch.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [rescuerSearch]);

  const { data, isLoading, isError } = useRescueTeamById(teamId, {
    enabled: Number.isFinite(teamId) && teamId > 0,
  });
  const { data: freeRescuersData, isLoading: isLoadingFreeRescuers } =
    useRescuers({
      params: {
        pageNumber: 1,
        pageSize: 100,
        hasTeam: false,
        search: debouncedRescuerSearch || undefined,
      },
      enabled: Number.isFinite(teamId) && teamId > 0,
    });
  const { mutate: addMember, isPending: isAddingMember } =
    useAddRescueTeamMember();
  const { mutate: removeMember, isPending: isRemovingMember } =
    useRemoveRescueTeamMember();

  const memberStats = useMemo(() => {
    const members = data?.members ?? [];
    return {
      total: members.length,
      accepted: members.filter((m) => m.status === "Accepted").length,
      pending: members.filter((m) => m.status === "Pending").length,
      rejected: members.filter((m) => m.status === "Rejected").length,
    };
  }, [data?.members]);

  const availableRescuers = useMemo(() => {
    const pool = freeRescuersData?.items ?? [];
    const memberIds = new Set((data?.members ?? []).map((m) => m.userId));
    return pool.filter((rescuer) => !memberIds.has(rescuer.id));
  }, [freeRescuersData?.items, data?.members]);

  useEffect(() => {
    if (
      selectedRescuerId &&
      !availableRescuers.some((rescuer) => rescuer.id === selectedRescuerId)
    ) {
      setSelectedRescuerId("");
    }
  }, [availableRescuers, selectedRescuerId]);

  const selectedCandidate = useMemo(
    () => availableRescuers.find((rescuer) => rescuer.id === selectedRescuerId),
    [availableRescuers, selectedRescuerId],
  );

  const canRemoveMembers =
    data?.status === "Gathering" || data?.status === "Unavailable";

  const remainingSlots = Math.max(
    0,
    (data?.maxMembers ?? 0) - memberStats.total,
  );

  const handleAddMember = () => {
    if (remainingSlots <= 0) {
      toast.error("Đội đã đủ quân số tối đa.");
      return;
    }

    if (!selectedRescuerId) {
      toast.error("Vui lòng chọn thành viên cần thêm.");
      return;
    }

    addMember(
      {
        id: teamId,
        userId: selectedRescuerId,
        isLeader: addAsLeader,
      },
      {
        onSuccess: () => {
          toast.success("Đã thêm thành viên vào đội.");
          setSelectedRescuerId("");
          setAddAsLeader(false);
          setRescuerSearch("");
        },
        onError: (error) => {
          toast.error(
            extractApiErrorMessage(error, "Không thể thêm thành viên vào đội."),
          );
        },
      },
    );
  };

  const handleRemoveMember = (member: RescueTeamMemberDetail) => {
    if (!canRemoveMembers) {
      toast.error(
        "Chỉ có thể xóa thành viên khi đội đang ở trạng thái Gathering hoặc Unavailable.",
      );
      return;
    }

    setMemberPendingRemove(member);
  };

  const confirmRemoveMember = () => {
    if (!memberPendingRemove) return;

    const member = memberPendingRemove;
    const memberName = `${member.lastName} ${member.firstName}`.trim();
    setRemovingUserId(member.userId);
    removeMember(
      {
        id: teamId,
        userId: member.userId,
      },
      {
        onSuccess: () => {
          toast.success(`Đã xóa ${memberName} khỏi đội.`);
          setMemberPendingRemove(null);
        },
        onError: (error) => {
          toast.error(
            extractApiErrorMessage(error, "Không thể xóa thành viên khỏi đội."),
          );
        },
        onSettled: () => {
          setRemovingUserId(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6 p-4 md:p-6 lg:p-8 tracking-tight">
        <Skeleton className="h-10 w-64" />
        <Card className="border-border/40 bg-white/60 dark:bg-zinc-900/60 shadow-sm rounded-3xl">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-6 w-40" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
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
      <div className="w-full p-4 md:p-6 lg:p-8 tracking-tight flex justify-center items-center min-h-[60vh]">
        <Card className="border-border/40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm rounded-3xl">
          <CardContent className="p-8 text-center">
            <p className="text-base font-semibold text-black">
              Không tải được chi tiết đội cứu hộ.
            </p>
            <p className="mt-2 text-sm text-black/70">
              Vui lòng thử lại hoặc quay về danh sách đội.
            </p>
            <div className="mt-5">
              <Link href="/dashboard/coordinator/rescue-teams">
                <Button
                  variant="outline"
                  className="gap-1.5 rounded-full border-border/50"
                >
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
    className: "border-black bg-white text-black",
  };
  const teamStatus = statusMap[data.status] || {
    label: data.status,
    className: "border-black bg-white text-black",
    tone: "neutral" as const,
  };
  const occupancyPercent =
    data.maxMembers > 0
      ? Math.min(100, Math.max(0, (memberStats.total / data.maxMembers) * 100))
      : 0;
  const isTeamFull = remainingSlots <= 0;

  return (
    <div className="w-full min-h-screen bg-slate-50/30 dark:bg-zinc-950/30 p-4 md:p-6 lg:p-8 space-y-6 tracking-tight">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/coordinator/rescue-teams">
              <Button
                variant="ghost"
                className="-ml-1.5 h-8 gap-1.5 rounded-none border border-black px-2.5 text-xs"
              >
                <ArrowLeft className="h-4 w-4" />
                Danh sách đội cứu hộ
              </Button>
            </Link>
            <Link href="/dashboard/coordinator">
              <Button
                variant="outline"
                className="h-8 gap-1.5 rounded-none border-black px-2.5 text-xs"
              >
                <House className="h-4 w-4" />
                Về dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-[0.06em] md:text-[1.95rem]">
            Chi tiết đội cứu hộ
          </h1>
          <p className="text-sm text-black/70 md:text-base">
            Theo dõi thông tin đội, thành viên và mức độ sẵn sàng theo thời gian
            thực.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`h-7 rounded-none px-2.5 ${teamType.className}`}
          >
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            {teamType.label}
          </Badge>
          <Badge
            variant="outline"
            className={`h-7 rounded-none px-2.5 ${teamStatus.className}`}
          >
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            {teamStatus.label}
          </Badge>
        </div>
      </div>

      <Card className="border-border/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm rounded-[2rem] overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary shadow-sm border border-primary/20">
                {data.code}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground">
                {data.name}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground pt-1">
                <span className="inline-flex items-center gap-2 bg-slate-100 dark:bg-zinc-800/50 px-3.5 py-2 rounded-xl font-medium shadow-sm border border-border/50">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-foreground">{data.assemblyPointName}</span>
                </span>
                <span className="inline-flex items-center gap-2 bg-slate-100 dark:bg-zinc-800/50 px-3.5 py-2 rounded-xl font-medium shadow-sm border border-border/50">
                  <UserRound className="h-4 w-4 text-primary" />
                  Quản lý bởi: <span className="text-foreground ml-1">{data.managedBy}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-4">
              <div className="flex-1 sm:flex-none flex flex-col justify-center rounded-[1.5rem] bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-500/20 px-6 py-5 shadow-sm min-w-[140px]">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Quân số</p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-blue-700 dark:text-blue-300">{memberStats.total}</span>
                  <span className="text-base font-bold text-blue-600/70 dark:text-blue-400/70">/{data.maxMembers}</span>
                </p>
              </div>
              <div className="flex-1 sm:flex-none flex flex-col justify-center rounded-[1.5rem] bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 border border-emerald-500/20 px-6 py-5 shadow-sm min-w-[140px]">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Còn trống</p>
                <p className="mt-2 text-4xl font-black text-emerald-700 dark:text-emerald-300">
                  {remainingSlots}
                </p>
              </div>
              <div className="w-full sm:w-auto flex flex-col justify-center rounded-[1.5rem] bg-gradient-to-br from-slate-500/5 to-zinc-500/5 border border-border/50 px-6 py-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ngày lập</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {formatDate(data.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section>
        <Card className="border-border/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm rounded-[2rem] overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 to-rose-500"></div>
          <CardHeader className="border-b border-border/30 bg-accent/30 px-6 py-5 md:px-8 md:py-6">
            <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 shadow-sm border border-orange-200/50">
                <UserPlus className="h-5 w-5" />
              </div>
              Bổ sung thành viên
            </CardTitle>
            <p className="text-sm text-muted-foreground ml-14 mt-1">
              Theo dõi chỗ trống và thêm người cứu hộ ngay trong một luồng thao tác.
            </p>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border border-border/50 bg-slate-50/50 dark:bg-zinc-800/50 px-5 py-4 rounded-2xl shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quân số hiện tại</p>
                  <p className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-foreground">{memberStats.total}</span>
                    <span className="text-sm font-bold text-muted-foreground">/{data.maxMembers}</span>
                  </p>
                </div>
                <div className="border border-border/50 bg-slate-50/50 dark:bg-zinc-800/50 px-5 py-4 rounded-2xl shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chỗ trống còn lại</p>
                  <p className="mt-1.5 text-2xl font-black text-foreground">
                    {remainingSlots}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>Mức độ lấp đầy</span>
                  <span>{occupancyPercent.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-1000 ease-out"
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
              </div>

              {isTeamFull ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-700 dark:text-rose-400 shadow-sm flex items-center gap-3">
                  <Shield className="h-5 w-5 shrink-0" />
                  Đội đã đủ quân số tối đa. Hãy xóa bớt thành viên trước khi bổ sung người mới.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={rescuerSearch}
                        onChange={(e) => setRescuerSearch(e.target.value)}
                        placeholder="Tìm theo tên, email, số điện thoại"
                        className="h-12 border-border/50 pl-10 rounded-xl bg-white dark:bg-zinc-900 shadow-sm focus-visible:ring-primary/20"
                      />
                    </div>

                    <Select
                      value={selectedRescuerId}
                      onValueChange={setSelectedRescuerId}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-border/50 bg-white dark:bg-zinc-900 shadow-sm focus:ring-primary/20">
                        <SelectValue
                          placeholder={
                            isLoadingFreeRescuers
                              ? "Đang tải danh sách người cứu hộ..."
                              : "Chọn người cứu hộ để thêm"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        {availableRescuers.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                            Không có người cứu hộ phù hợp để thêm.
                          </div>
                        ) : (
                          availableRescuers.map((rescuer) => (
                            <SelectItem key={rescuer.id} value={rescuer.id} className="rounded-lg my-1">
                              {rescuer.lastName} {rescuer.firstName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5">
                      <Button
                        type="button"
                        variant={addAsLeader ? "default" : "outline"}
                        className={`h-12 rounded-xl border-border/50 font-semibold px-6 shadow-sm transition-all ${addAsLeader ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white border-0 hover:from-orange-600 hover:to-rose-600" : ""}`}
                        onClick={() => setAddAsLeader((prev) => !prev)}
                        disabled={!selectedRescuerId}
                      >
                        {addAsLeader
                          ? "Gán làm đội trưởng"
                          : "Giữ vai trò thành viên"}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAddMember}
                        disabled={isAddingMember || !selectedRescuerId}
                        className="h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 shadow-sm transition-all"
                      >
                        {isAddingMember ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Đang thêm...
                          </>
                        ) : (
                          "Thêm vào đội"
                        )}
                      </Button>
                    </div>
                  </div>

                  {selectedCandidate ? (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm flex items-center gap-2 text-foreground shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span className="font-medium text-foreground">
                        Đã chọn: <span className="font-bold">{selectedCandidate.lastName} {selectedCandidate.firstName}</span>
                      </span>
                      {selectedCandidate.phone && (
                        <span className="text-muted-foreground"> • {selectedCandidate.phone}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground ml-1 flex items-center gap-2">
                      <Search className="h-3.5 w-3.5" />
                      Chọn người cứu hộ từ danh sách để thêm vào đội.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">
            Thống kê thành viên
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5 shadow-sm rounded-2xl transition-transform hover:-translate-y-1">
            <CardContent className="p-5 flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Đã xác nhận</p>
              <p className="mt-2 text-3xl font-black text-emerald-800 dark:text-emerald-300">
                {memberStats.accepted}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-500/10 dark:to-amber-500/5 shadow-sm rounded-2xl transition-transform hover:-translate-y-1">
            <CardContent className="p-5 flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Đang chờ</p>
              <p className="mt-2 text-3xl font-black text-amber-800 dark:text-amber-300">
                {memberStats.pending}
              </p>
            </CardContent>
          </Card>
          <Card className="border-rose-200/50 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-500/10 dark:to-rose-500/5 shadow-sm rounded-2xl transition-transform hover:-translate-y-1">
            <CardContent className="p-5 flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Từ chối</p>
              <p className="mt-2 text-3xl font-black text-rose-800 dark:text-rose-300">
                {memberStats.rejected}
              </p>
            </CardContent>
          </Card>
          <Card className="border-sky-200/50 bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-500/10 dark:to-sky-500/5 shadow-sm rounded-2xl transition-transform hover:-translate-y-1">
            <CardContent className="p-5 flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">Còn trống</p>
              <p className="mt-2 text-3xl font-black text-sky-800 dark:text-sky-300">
                {Math.max(0, data.maxMembers - memberStats.total)}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-3">
            Danh sách thành viên
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 rounded-full px-3 text-sm">
              {memberStats.total}
            </Badge>
          </h3>
        </div>

        {!canRemoveMembers && (
          <div className="mb-6 rounded-2xl border border-amber-200/50 bg-amber-50 dark:bg-amber-500/10 px-5 py-4 text-sm font-medium text-amber-800 dark:text-amber-400 shadow-sm flex items-start gap-3">
            <Shield className="h-5 w-5 shrink-0 mt-0.5" />
            <p>Nút xóa thành viên được thiết kế để chỉ hiển thị khi đội ở trạng thái <span className="font-bold">Gathering</span> hoặc <span className="font-bold">Unavailable</span> nhằm đảm bảo an toàn dữ liệu.</p>
          </div>
        )}

        {data.members.length === 0 ? (
          <Card className="border-2 border-dashed border-border bg-white/50 dark:bg-zinc-900/50 rounded-3xl">
            <CardContent className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-6">
                <UserRoundPlus className="h-10 w-10 text-muted-foreground" />
              </div>
              <h4 className="text-xl font-bold text-foreground">Chưa có thành viên nào</h4>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Đội cứu hộ này hiện tại chưa có thành viên. Bạn có thể sử dụng bảng bên trên để tìm và thêm người cứu hộ vào đội.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.members.map((member) => (
              <MemberCard
                key={member.userId}
                member={member}
                onRemove={handleRemoveMember}
                isRemoving={
                  isRemovingMember && removingUserId === member.userId
                }
                canRemove={canRemoveMembers}
              />
            ))}
          </div>
        )}
      </section>

      {memberPendingRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMemberPendingRemove(null)}
            aria-label="Đóng hộp thoại xác nhận"
          />
          <div className="relative w-full max-w-md rounded-3xl border border-border/50 bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-5">
                <Trash2 className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-bold text-foreground">
                Xác nhận xóa thành viên
              </h4>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Bạn có chắc muốn xóa
                <span className="font-bold text-foreground">
                  {` ${memberPendingRemove.lastName} ${memberPendingRemove.firstName} `}
                </span>
                khỏi đội cứu hộ này không? Hành động này không thể hoàn tác trực tiếp.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 bg-muted/30 px-6 py-4 md:px-8 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMemberPendingRemove(null)}
                disabled={isRemovingMember}
                className="rounded-xl border-border/50 font-semibold shadow-sm px-6 h-11"
              >
                Hủy
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold shadow-sm px-6 h-11 transition-colors"
                onClick={confirmRemoveMember}
                disabled={isRemovingMember}
              >
                {isRemovingMember ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  "Xóa thành viên"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
