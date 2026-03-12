"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  UsersThree,
  ShieldStar,
  MapTrifold,
  MagnifyingGlass,
  UserCirclePlus,
  Crown,
  CircleNotch,
  Sparkle,
  CheckCircle,
  Warning,
  Check,
} from "@phosphor-icons/react";
import {
  useRescueTeamTypes,
  useCreateRescueTeam,
} from "@/services/rescue_teams/hooks";
import type {
  RescueTeamTypeKey,
  RescueTeamMember,
} from "@/services/rescue_teams/type";
import { useAssemblyPoints } from "@/services/assembly_points/hooks";
import { useAdminUsers } from "@/services/user/hooks";
import type { UserEntity } from "@/services/user/type";
import { ROLES } from "@/lib/roles";

// ── Type Card Component ──

function TypeCard({
  label,
  value,
  selected,
  onClick,
  description,
}: {
  label: string;
  value: string;
  selected: boolean;
  onClick: () => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
          : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
      }`}
    >
      <div
        className={`font-semibold ${selected ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
      >
        {label}
      </div>
      {description && (
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      )}
    </button>
  );
}

// ── Rescuer Card Component ──

function RescuerCard({
  user,
  selected,
  isLeader,
  onToggleSelect,
  onToggleLeader,
}: {
  user: UserEntity;
  selected: boolean;
  isLeader: boolean;
  onToggleSelect: () => void;
  onToggleLeader: () => void;
}) {
  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
    "?";

  return (
    <div
      className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
        selected
          ? "border-emerald-500 bg-emerald-500/5"
          : "border-border hover:border-muted-foreground/30 hover:bg-muted/20"
      }`}
      onClick={onToggleSelect}
    >
      <div
        className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
          selected
            ? "bg-emerald-500 border-emerald-500"
            : "border-muted-foreground/30"
        }`}
      >
        {selected && <Check className="h-3.5 w-3.5 text-white" weight="bold" />}
      </div>

      <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
        <AvatarImage src={user.avatarUrl || undefined} />
        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white text-xs font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {user.firstName} {user.lastName}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>@{user.username}</span>
          {user.phone && <span>· {user.phone}</span>}
        </div>
      </div>

      {selected && (
        <Button
          type="button"
          variant={isLeader ? "default" : "outline"}
          size="sm"
          className={`shrink-0 gap-1 ${isLeader ? "bg-amber-500 hover:bg-amber-600" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLeader();
          }}
        >
          <Crown
            className="h-3.5 w-3.5"
            weight={isLeader ? "fill" : "regular"}
          />
          {isLeader ? "Đội trưởng" : "Chọn làm đội trưởng"}
        </Button>
      )}

      {isLeader && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 shadow-sm">
            <Crown className="h-3 w-3 mr-0.5" weight="fill" />
            Leader
          </Badge>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export default function CreateRescueTeamPage() {
  const router = useRouter();

  // ─── Form State ───
  const [teamName, setTeamName] = useState("");
  const [teamType, setTeamType] = useState<RescueTeamTypeKey | "">("");
  const [assemblyPointId, setAssemblyPointId] = useState<string>("");
  const [maxMembers, setMaxMembers] = useState("5");
  const [selectedMembers, setSelectedMembers] = useState<RescueTeamMember[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");

  // ─── Data Fetching ───
  const { data: teamTypes, isLoading: isLoadingTypes } = useRescueTeamTypes();
  const { data: assemblyPoints, isLoading: isLoadingPoints } =
    useAssemblyPoints({
      params: { pageSize: 100 },
    });
  const { data: usersData, isLoading: isLoadingUsers } = useAdminUsers({
    roleId: ROLES.RESCUER,
    pageSize: 100,
  });
  const { mutate: createTeam, isPending: isCreating } = useCreateRescueTeam();

  // ─── Filter eligible rescuers (verified + not banned) ───
  const eligibleRescuers = useMemo(() => {
    if (!usersData?.items) return [];
    const filtered = usersData.items.filter(
      (user) => user.isEligibleRescuer && !user.isBanned,
    );
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(
      (user) =>
        user.firstName?.toLowerCase().includes(q) ||
        user.lastName?.toLowerCase().includes(q) ||
        user.username?.toLowerCase().includes(q) ||
        user.phone?.includes(q),
    );
  }, [usersData, searchQuery]);

  // ─── Member Selection Helpers ───
  const isMemberSelected = (userId: string) =>
    selectedMembers.some((m) => m.userId === userId);

  const isLeader = (userId: string) =>
    selectedMembers.find((m) => m.userId === userId)?.isLeader || false;

  const toggleMember = (userId: string) => {
    if (isMemberSelected(userId)) {
      setSelectedMembers((prev) => prev.filter((m) => m.userId !== userId));
    } else {
      if (selectedMembers.length >= parseInt(maxMembers)) {
        toast.error(`Tối đa ${maxMembers} thành viên`);
        return;
      }
      setSelectedMembers((prev) => [...prev, { userId, isLeader: false }]);
    }
  };

  const toggleLeader = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.map((m) => ({
        ...m,
        isLeader: m.userId === userId ? !m.isLeader : false,
      })),
    );
  };

  // ─── Submit Handler ───
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamName.trim()) {
      toast.error("Vui lòng nhập tên đội cứu hộ");
      return;
    }

    if (!teamType) {
      toast.error("Vui lòng chọn loại đội");
      return;
    }

    if (!assemblyPointId) {
      toast.error("Vui lòng chọn điểm tập kết");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 thành viên");
      return;
    }

    if (!selectedMembers.some((m) => m.isLeader)) {
      toast.error("Vui lòng chọn đội trưởng");
      return;
    }

    createTeam(
      {
        name: teamName.trim(),
        type: teamType,
        assemblyPointId: parseInt(assemblyPointId),
        maxMembers: parseInt(maxMembers),
        members: selectedMembers,
      },
      {
        onSuccess: () => {
          toast.success("Tạo đội cứu hộ thành công!");
          router.push("/dashboard/coordinator");
        },
        onError: (err: any) => {
          console.error(err);
          const message =
            err?.response?.data?.message ||
            err?.response?.data?.title ||
            err?.message ||
            "Tạo đội thất bại, vui lòng thử lại.";
          toast.error(message);
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/coordinator")}
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-semibold flex items-center gap-2">
              <UsersThree className="h-5 w-5 text-emerald-500" weight="fill" />
              Tạo đội cứu hộ mới
            </h1>
            <p className="text-xs text-muted-foreground">
              Thiết lập thông tin và thành viên cho đội cứu hộ
            </p>
          </div>
        </div>
      </header>

      {/* ── Form ── */}
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl p-4 space-y-6 pb-28"
      >
        {/* ─── 1. Team Info ─── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <ShieldStar size={16} className="text-emerald-500" /> Thông tin
              đội <span className="text-red-500">*</span>
            </p>
            <div className="space-y-2">
              <Label>Tên đội cứu hộ</Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="VD: Đội cứu hộ Đà Nẵng 01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Số thành viên tối đa</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── 2. Team Type ─── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Sparkle size={16} className="text-violet-500" /> Loại đội{" "}
              <span className="text-red-500">*</span>
            </p>
            {isLoadingTypes ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {teamTypes?.map((type) => (
                  <TypeCard
                    key={type.key}
                    label={type.value}
                    value={type.key}
                    selected={teamType === type.key}
                    onClick={() => setTeamType(type.key)}
                    description={
                      type.key === "Rescue"
                        ? "Cứu hộ người bị nạn"
                        : type.key === "Medical"
                          ? "Hỗ trợ y tế khẩn cấp"
                          : type.key === "Transportation"
                            ? "Vận chuyển người/hàng"
                            : "Đa năng, linh hoạt"
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── 3. Assembly Point ─── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <MapTrifold size={16} className="text-blue-500" /> Điểm tập kết{" "}
              <span className="text-red-500">*</span>
            </p>
            {isLoadingPoints ? (
              <Skeleton className="h-10 rounded-lg" />
            ) : (
              <Select
                value={assemblyPointId}
                onValueChange={setAssemblyPointId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn điểm tập kết..." />
                </SelectTrigger>
                <SelectContent>
                  {assemblyPoints?.items?.map((point) => (
                    <SelectItem key={point.id} value={String(point.id)}>
                      <div className="flex items-center gap-2">
                        <span>{point.name}</span>
                        <Badge
                          variant={
                            point.status === "Active"
                              ? "default"
                              : point.status === "Overloaded"
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-[10px] h-5 px-1.5"
                        >
                          {point.status === "Active"
                            ? "Hoạt động"
                            : point.status === "Overloaded"
                              ? "Quá tải"
                              : "Không khả dụng"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {assemblyPointId && assemblyPoints?.items && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <CheckCircle className="h-4 w-4 text-blue-500" weight="fill" />
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  {(() => {
                    const point = assemblyPoints.items.find(
                      (p) => String(p.id) === assemblyPointId,
                    );
                    return point
                      ? `Mã: ${point.code} · Sức chứa: ${point.capacityTeams} đội`
                      : null;
                  })()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── 4. Team Members ─── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <UserCirclePlus size={16} className="text-amber-500" /> Thành
                viên <span className="text-red-500">*</span>
              </p>
              {selectedMembers.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Đã chọn: {selectedMembers.length}/{maxMembers}
                </Badge>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlass
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, username, SĐT..."
                className="pl-9"
              />
            </div>

            {/* Selected members summary */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                {selectedMembers.map((member) => {
                  const user = eligibleRescuers.find(
                    (u) => u.id === member.userId,
                  );
                  if (!user) return null;
                  return (
                    <Badge
                      key={member.userId}
                      variant={member.isLeader ? "default" : "secondary"}
                      className={`text-xs py-1 px-2 gap-1 ${
                        member.isLeader ? "bg-amber-500 hover:bg-amber-600" : ""
                      }`}
                    >
                      {member.isLeader && (
                        <Crown className="h-3 w-3" weight="fill" />
                      )}
                      {user.firstName} {user.lastName}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Leader warning */}
            {selectedMembers.length > 0 &&
              !selectedMembers.some((m) => m.isLeader) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                  <Warning className="h-4 w-4 text-amber-500" weight="fill" />
                  <span className="text-sm text-amber-700 dark:text-amber-400">
                    Chưa chọn đội trưởng. Nhấn vào nút "Chọn làm đội trưởng" bên
                    cạnh thành viên.
                  </span>
                </div>
              )}

            {/* Rescuer list */}
            {isLoadingUsers ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : eligibleRescuers.length > 0 ? (
              <ScrollArea className="h-[300px] rounded-lg border p-2">
                <div className="space-y-2">
                  {eligibleRescuers.map((user) => (
                    <RescuerCard
                      key={user.id}
                      user={user}
                      selected={isMemberSelected(user.id)}
                      isLeader={isLeader(user.id)}
                      onToggleSelect={() => toggleMember(user.id)}
                      onToggleLeader={() => toggleLeader(user.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 rounded-xl border-2 border-dashed border-border/50">
                <UserCirclePlus className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground/60">
                  {searchQuery
                    ? "Không tìm thấy người cứu hộ phù hợp"
                    : "Chưa có người cứu hộ nào đủ điều kiện"}
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkle size={12} />
              Chỉ hiển thị người cứu hộ đã được duyệt và chưa bị cấm
            </p>
          </CardContent>
        </Card>
      </form>

      {/* ── Sticky Footer ── */}
      <div className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur-sm z-50">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-4 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/coordinator")}
            disabled={isCreating}
          >
            Huỷ bỏ
          </Button>
          <Button
            type="submit"
            disabled={isCreating}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            onClick={(e) => {
              e.preventDefault();
              const form = document.querySelector("form");
              form?.requestSubmit();
            }}
          >
            {isCreating ? (
              <>
                <CircleNotch className="h-4 w-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <UsersThree size={16} weight="fill" />
                Tạo đội cứu hộ
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
