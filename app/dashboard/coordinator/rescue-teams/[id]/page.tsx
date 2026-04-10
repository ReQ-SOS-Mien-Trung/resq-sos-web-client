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
    className: "border-orange-300 bg-orange-50 text-orange-800",
  },
  Medical: {
    label: "Y tế",
    className: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  Transportation: {
    label: "Vận chuyển",
    className: "border-sky-300 bg-sky-50 text-sky-800",
  },
  Mixed: {
    label: "Hỗn hợp",
    className: "border-slate-300 bg-slate-100 text-slate-700",
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
    className: "border-amber-300 bg-amber-50 text-amber-800",
    tone: "neutral",
  },
  Ready: {
    label: "Sẵn sàng",
    className: "border-emerald-300 bg-emerald-50 text-emerald-800",
    tone: "good",
  },
  Gathering: {
    label: "Đang tập hợp",
    className: "border-sky-300 bg-sky-50 text-sky-800",
    tone: "warn",
  },
  Available: {
    label: "Sẵn sàng",
    className: "border-teal-300 bg-teal-50 text-teal-800",
    tone: "good",
  },
  Assigned: {
    label: "Đã phân công",
    className: "border-indigo-300 bg-indigo-50 text-indigo-800",
    tone: "warn",
  },
  OnMission: {
    label: "Đang làm nhiệm vụ",
    className: "border-violet-300 bg-violet-50 text-violet-800",
    tone: "warn",
  },
  Stuck: {
    label: "Mắc kẹt",
    className: "border-rose-300 bg-rose-50 text-rose-800",
    tone: "danger",
  },
  Unavailable: {
    label: "Không khả dụng",
    className: "border-zinc-300 bg-zinc-100 text-zinc-700",
    tone: "danger",
  },
  Disbanded: {
    label: "Đã giải tán",
    className: "border-slate-300 bg-slate-100 text-slate-700",
    tone: "neutral",
  },
};

const memberStatusMap: Record<string, { label: string; className: string }> = {
  Accepted: {
    label: "Đã xác nhận",
    className: "border-black bg-white text-black",
  },
  Pending: {
    label: "Đang chờ",
    className: "border-black bg-white text-black",
  },
  Rejected: {
    label: "Từ chối",
    className: "border-black bg-white text-black",
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
    `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.toUpperCase() ||
    "?";
  const status = memberStatusMap[member.status] || {
    label: member.status,
    className: "border-black bg-white text-black",
  };
  const rescuerTypeBadge =
    member.rescuerType === "Core"
      ? {
          label: "Nhân viên cố định",
          className: "border-sky-500 bg-sky-100 text-sky-900",
        }
      : {
          label: "Tình nguyện",
          className: "border-[#FF5722] bg-[#FFF2EB] text-[#C2410C]",
        };

  return (
    <Card className="border-black bg-white transition hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border border-black/20 shadow-sm">
            <AvatarImage src={member.avatarUrl || DEFAULT_RESCUER_AVATAR} />
            <AvatarFallback className="bg-black text-xs font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold truncate">
                  {member.firstName} {member.lastName}
                </p>
                {member.isLeader && (
                  <Badge className="h-5 rounded-none bg-[#FF5722] px-1.5 text-[10px] text-white hover:bg-[#e64a19]">
                    <Crown className="mr-1 h-3 w-3" />
                    Đội trưởng
                  </Badge>
                )}
              </div>
              {canRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-none border border-black/30 px-2 text-black hover:bg-black/5 hover:text-black"
                  onClick={() => onRemove(member)}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1 text-[11px]">Xóa</span>
                </Button>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-black/70">
              <Badge
                variant="outline"
                className={`h-5 rounded-none px-1.5 text-[10px] ${rescuerTypeBadge.className}`}
              >
                {rescuerTypeBadge.label}
              </Badge>
              <Badge
                variant="outline"
                className={`h-5 rounded-none px-1.5 text-[10px] ${status.className}`}
              >
                {status.label}
              </Badge>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-black/70">
              <Phone className="h-3.5 w-3.5" />
              <span>{member.phone || "Không có số điện thoại"}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-black/70">
              <Mail className="h-3.5 w-3.5" />
              <span className="min-w-0 truncate">
                {member.email || "Không có email"}
              </span>
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
    const memberName = `${member.firstName} ${member.lastName}`.trim();
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
      <div className="mx-auto w-full max-w-330 space-y-6 p-4 tracking-tighter md:p-6">
        <Skeleton className="h-10 w-64" />
        <Card className="border-black shadow-none">
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
      <div className="mx-auto w-full max-w-230 p-6 tracking-tighter">
        <Card className="border-black bg-white">
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
                  className="gap-1.5 rounded-none border-black"
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
    <div className="mx-auto w-full max-w-330 space-y-5 bg-[linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-size-[30px_30px] bg-white p-4 tracking-tighter md:p-6">
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

      <Card className="border-black bg-white shadow-none">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase text-black/60">{data.code}</p>
              <h2 className="text-xl md:text-2xl font-bold mt-1">
                {data.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black/70 md:text-base">
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

            <div className="grid min-w-55 grid-cols-2 gap-1.5">
              <div className="border border-black p-2.5">
                <p className="text-xs text-black/60">Quân số</p>
                <p className="mt-1 text-lg font-bold">
                  {memberStats.total}/{data.maxMembers}
                </p>
              </div>
              <div className="border border-black p-2.5">
                <p className="text-xs text-black/60">Còn trống</p>
                <p className="mt-1 text-lg font-bold">{remainingSlots}</p>
              </div>
              <div className="col-span-2 border border-black p-2.5">
                <p className="text-xs text-black/60">Ngày lập</p>
                <p className="mt-1 text-xs font-semibold leading-tight">
                  {formatDate(data.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section>
        <Card className="border-black bg-white shadow-none overflow-hidden">
          <CardHeader className="border-b border-black/10 bg-[linear-gradient(90deg,rgba(255,87,34,0.08),rgba(255,87,34,0.02))] px-4 py-3 md:px-5 md:py-3.5">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#FF5722]" />
              Bổ sung thành viên
            </CardTitle>
            <p className="text-sm text-black/65">
              Theo dõi chỗ trống và thêm người cứu hộ ngay trong một luồng thao
              tác.
            </p>
          </CardHeader>

          <CardContent className="p-3.5 md:p-4">
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="border border-black/20 bg-white px-3 py-2">
                  <p className="text-xs text-black/60">Quân số hiện tại</p>
                  <p className="mt-1 text-xl font-bold text-black">
                    {memberStats.total}/{data.maxMembers}
                  </p>
                </div>
                <div className="border border-black/20 bg-white px-3 py-2">
                  <p className="text-xs text-black/60">Chỗ trống còn lại</p>
                  <p className="mt-1 text-xl font-bold text-black">
                    {remainingSlots}
                  </p>
                </div>
                <div className="border border-black/20 bg-white px-3 py-2">
                  <p className="text-xs text-black/60">Ứng viên khả dụng</p>
                  <p className="mt-1 text-xl font-bold text-black">
                    {availableRescuers.length}
                  </p>
                </div>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full bg-[#FF5722] transition-all"
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>

              {isTeamFull ? (
                <div className="border border-[#FF5722] bg-[#FF5722]/10 px-3 py-2 text-sm text-[#c2410c]">
                  Đội đã đủ quân số tối đa. Hãy xóa bớt thành viên trước khi bổ
                  sung người mới.
                </div>
              ) : (
                <>
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_240px] lg:items-start">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/50" />
                      <Input
                        value={rescuerSearch}
                        onChange={(e) => setRescuerSearch(e.target.value)}
                        placeholder="Tìm theo tên, email, số điện thoại"
                        className="h-9 border-black/50 pl-8"
                      />
                    </div>

                    <Select
                      value={selectedRescuerId}
                      onValueChange={setSelectedRescuerId}
                    >
                      <SelectTrigger className="h-9 rounded-none border-black/50">
                        <SelectValue
                          placeholder={
                            isLoadingFreeRescuers
                              ? "Đang tải danh sách người cứu hộ..."
                              : "Chọn người cứu hộ để thêm"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRescuers.length === 0 ? (
                          <div className="px-2 py-2 text-xs text-muted-foreground">
                            Không có người cứu hộ phù hợp để thêm.
                          </div>
                        ) : (
                          availableRescuers.map((rescuer) => (
                            <SelectItem key={rescuer.id} value={rescuer.id}>
                              {rescuer.firstName} {rescuer.lastName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>

                    <div className="grid gap-2">
                      <Button
                        type="button"
                        variant={addAsLeader ? "default" : "outline"}
                        className={`h-9 rounded-none border-black ${addAsLeader ? "bg-[#FF5722] text-white hover:bg-[#e64a19]" : ""}`}
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
                        className="h-9 rounded-none bg-[#FF5722] text-white hover:bg-[#e64a19]"
                      >
                        {isAddingMember ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            Đang thêm...
                          </>
                        ) : (
                          "Thêm vào đội"
                        )}
                      </Button>
                    </div>
                  </div>

                  {selectedCandidate ? (
                    <div className="border border-[#FF5722]/30 bg-[#FFF8F4] px-3 py-2 text-sm text-black/80">
                      <span className="font-semibold text-black">
                        Đã chọn: {selectedCandidate.firstName}{" "}
                        {selectedCandidate.lastName}
                      </span>
                      {selectedCandidate.phone
                        ? ` - ${selectedCandidate.phone}`
                        : ""}
                    </div>
                  ) : (
                    <p className="text-sm text-black/65">
                      Chọn người cứu hộ từ danh sách để thêm vào đội.
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base md:text-lg font-semibold">
            Thống kê thành viên
          </h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-emerald-300 bg-emerald-50/50 shadow-none">
            <CardContent className="p-3">
              <p className="text-[11px] text-emerald-800/80">Đã xác nhận</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-900">
                {memberStats.accepted}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-300 bg-amber-50/50 shadow-none">
            <CardContent className="p-3">
              <p className="text-[11px] text-amber-800/80">Đang chờ</p>
              <p className="mt-0.5 text-xl font-bold text-amber-900">
                {memberStats.pending}
              </p>
            </CardContent>
          </Card>
          <Card className="border-rose-300 bg-rose-50/50 shadow-none">
            <CardContent className="p-3">
              <p className="text-[11px] text-rose-800/80">Từ chối</p>
              <p className="mt-0.5 text-xl font-bold text-rose-900">
                {memberStats.rejected}
              </p>
            </CardContent>
          </Card>
          <Card className="border-sky-300 bg-sky-50/50 shadow-none">
            <CardContent className="p-3">
              <p className="text-[11px] text-sky-800/80">Còn trống</p>
              <p className="mt-0.5 text-xl font-bold text-sky-900">
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

        {!canRemoveMembers && (
          <p className="mb-3 border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Nút xóa chỉ hiển thị khi đội ở trạng thái Gathering hoặc
            Unavailable.
          </p>
        )}

        {data.members.length === 0 ? (
          <Card className="border-dashed border-black bg-white">
            <CardContent className="p-10 text-center">
              <UserRoundPlus className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-black/70">
                Đội này chưa có thành viên.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            onClick={() => setMemberPendingRemove(null)}
            aria-label="Đóng hộp thoại xác nhận"
          />
          <div className="relative w-full max-w-md border border-black bg-white shadow-2xl">
            <div className="p-5">
              <h4 className="text-base font-semibold text-black">
                Xác nhận xóa thành viên
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-black/70">
                Bạn có chắc muốn xóa
                <span className="font-semibold text-black">
                  {` ${memberPendingRemove.firstName} ${memberPendingRemove.lastName} `}
                </span>
                khỏi đội cứu hộ này không?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-black/20 bg-white px-5 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMemberPendingRemove(null)}
                disabled={isRemovingMember}
                className="rounded-none border-black"
              >
                Hủy
              </Button>
              <Button
                type="button"
                className="rounded-none bg-[#FF5722] text-white hover:bg-[#e64a19]"
                onClick={confirmRemoveMember}
                disabled={isRemovingMember}
              >
                {isRemovingMember ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
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
