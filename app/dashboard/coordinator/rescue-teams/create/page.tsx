"use client";

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  type FormEvent,
  type MouseEvent,
} from "react";
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
  X,
} from "@phosphor-icons/react";
import {
  useRescueTeamTypes,
  useCreateRescueTeam,
} from "@/services/rescue_teams/hooks";
import type {
  RescueTeamTypeKey,
  RescueTeamMember,
} from "@/services/rescue_teams/type";
import { useInfiniteAssemblyPoints } from "@/services/assembly_points/hooks";
import { useInfiniteFreeRescuers } from "@/services/rescuers/hooks";
import type { FreeRescuerEntity, RescuerType } from "@/services/rescuers/type";

const DEFAULT_RESCUER_AVATAR =
  "https://res.cloudinary.com/dezgwdrfs/image/upload/v1773504004/611251674_1432765175119052_6622750233977483141_n_sgxqxd.png";

const ABILITY_LABELS_VI: Record<string, string> = {
  BASIC_SWIMMING: "Bơi cơ bản",
  ADVANCED_SWIMMING: "Bơi nâng cao",
  DEEP_WATER_MOVEMENT: "Di chuyển trong nước sâu",
  RAPID_WATER_MOVEMENT: "Di chuyển trong dòng nước xiết",
  LIFE_JACKET_USE: "Sử dụng áo phao",
  WATER_RESCUE: "Cứu hộ dưới nước",
  DROWNING_RESPONSE: "Xử lý đuối nước",
  FLOOD_ESCAPE: "Thoát hiểm trong lũ",
  BASIC_DIVING: "Lặn cơ bản",
  ROWBOAT_DRIVING: "Lái thuyền chèo",
  DINGHY_DRIVING: "Lái xuồng cao su",
  SPEEDBOAT_DRIVING: "Lái cano tốc độ cao",
  ROPE_RESCUE: "Cứu hộ bằng dây",
  DEBRIS_RESCUE: "Cứu hộ trong đống đổ nát",
  ROOFTOP_RESCUE: "Cứu hộ trên mái nhà",
  FLOODED_HOUSE_RESCUE: "Cứu hộ nhà ngập",
  VICTIM_TRANSPORT: "Vận chuyển nạn nhân",
  SAFE_PATIENT_TRANSPORT: "Vận chuyển bệnh nhân an toàn",
  RELIEF_GOODS_TRANSPORT: "Vận chuyển hàng cứu trợ",
  HEAVY_CARGO_TRANSPORT: "Vận chuyển hàng nặng",
  MOTORCYCLE_DRIVING: "Lái xe máy",
  MOTORCYCLE_FLOOD_DRIVING: "Lái xe máy trong ngập",
  CAR_DRIVING: "Lái ô tô",
  OFFROAD_DRIVING: "Lái xe địa hình",
  RAIN_VEHICLE_OPERATION: "Vận hành xe trong mưa lớn",
  NIGHT_VEHICLE_OPERATION: "Vận hành xe ban đêm",
  CPR: "Hồi sinh tim phổi (CPR)",
  BASIC_FIRST_AID: "Sơ cứu cơ bản",
  BLEEDING_CONTROL: "Cầm máu",
  OPEN_WOUND_CARE: "Chăm sóc vết thương hở",
  WOUND_BANDAGING: "Băng bó vết thương",
  MINOR_INJURY_CARE: "Xử lý chấn thương nhẹ",
  MINOR_BURN_CARE: "Xử lý bỏng nhẹ",
  FRACTURE_IMMOBILIZATION: "Cố định xương gãy",
  SPINAL_INJURY_CARE: "Chăm sóc chấn thương cột sống",
  SHOCK_TREATMENT: "Xử lý sốc",
  HYPOTHERMIA_TREATMENT: "Xử lý hạ thân nhiệt",
  PREHOSPITAL_EMERGENCY: "Cấp cứu trước viện",
  VITAL_SIGNS_MONITORING: "Theo dõi dấu hiệu sinh tồn",
  VICTIM_ASSESSMENT: "Đánh giá nạn nhân",
  NURSE: "Điều dưỡng",
  DOCTOR: "Bác sĩ",
  MEDICAL_STAFF: "Nhân viên y tế",
  HAZARDOUS_RESCUE: "Cứu hộ môi trường nguy hiểm",
  VEHICLE_RESCUE: "Cứu hộ liên quan phương tiện",
  STORM_RESCUE: "Cứu hộ trong bão",
  NIGHT_RESCUE: "Cứu hộ ban đêm",
  DISASTER_RELIEF_EXPERIENCE: "Kinh nghiệm cứu trợ thiên tai",
  FLOOD_RESCUE_EXPERIENCE: "Kinh nghiệm cứu hộ mùa lũ",
  COMMUNITY_RESCUE_EXPERIENCE: "Kinh nghiệm cứu hộ cộng đồng",
  LOCAL_RESCUE_TEAM_MEMBER: "Thành viên đội cứu hộ địa phương",
  VOLUNTEER_ORG_MEMBER: "Thành viên tổ chức tình nguyện",
};

function getAbilityLabelVi(code: string): string {
  if (ABILITY_LABELS_VI[code]) return ABILITY_LABELS_VI[code];
  return code
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20"
          : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
      }`}
    >
      <div
        className={`text-sm font-semibold mb-0.5 ${selected ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
      >
        {label}
      </div>
      {description && (
        <div className="text-[11px] text-muted-foreground line-clamp-1">
          {description}
        </div>
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
  user: FreeRescuerEntity;
  selected: boolean;
  isLeader: boolean;
  onToggleSelect: () => void;
  onToggleLeader: () => void;
}) {
  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
    "?";
  const avatarSrc = user.avatarUrl || DEFAULT_RESCUER_AVATAR;
  const [isHovering, setIsHovering] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const offset = 14;
    const tooltipWidth = 320;
    const tooltipHeight = 260;
    const margin = 12;

    const nextX = Math.min(
      e.clientX + offset,
      window.innerWidth - tooltipWidth - margin,
    );
    const nextY = Math.min(
      e.clientY + offset,
      window.innerHeight - tooltipHeight - margin,
    );

    setTooltipPos({ x: Math.max(margin, nextX), y: Math.max(margin, nextY) });
  };

  return (
    <>
      <div
        className={`relative flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
          selected
            ? "border-emerald-500 bg-emerald-500/5 shadow-sm"
            : "border-border hover:border-muted-foreground/30 hover:bg-muted/20"
        }`}
        onClick={onToggleSelect}
        onMouseEnter={(e) => {
          setIsHovering(true);
          handleMouseMove(e);
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          className={`flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
            selected
              ? "bg-emerald-500 border-emerald-500"
              : "border-muted-foreground/30"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" weight="bold" />}
        </div>

        <Avatar className="h-8 w-8 border border-background shadow-sm">
          <AvatarImage src={avatarSrc} />
          <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white text-[10px] font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-[13px] truncate flex items-center gap-2">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
            {user.rescuerType && (
              <Badge
                variant={user.rescuerType === "Core" ? "default" : "secondary"}
                className="text-[9px] font-medium h-4 px-1"
              >
                {user.rescuerType === "Core" ? "Cốt cán" : "Tình nguyện"}
              </Badge>
            )}
            {user.phone && <span>· {user.phone}</span>}
          </div>
        </div>

        {selected && (
          <Button
            type="button"
            variant={isLeader ? "default" : "outline"}
            size="sm"
            className={`shrink-0 h-7 text-[11px] px-2.5 gap-1 shadow-none transition-colors ${isLeader ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent" : "text-muted-foreground hover:text-foreground"}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLeader();
            }}
          >
            <Crown
              className="h-3.5 w-3.5"
              weight={isLeader ? "fill" : "regular"}
            />
            {isLeader ? "Đội trưởng" : "Làm đội trưởng"}
          </Button>
        )}
      </div>

      {isHovering && (
        <div
          className="fixed pointer-events-none p-3 w-72 space-y-2 z-[200] rounded-md border bg-popover text-popover-foreground shadow-md"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-background shadow-sm">
              <AvatarImage src={avatarSrc} />
              <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-500 text-white text-[12px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-sm">
                {user.firstName} {user.lastName}
              </div>
              <Badge
                variant={user.rescuerType === "Core" ? "default" : "secondary"}
                className="text-[10px] font-medium h-5 px-1.5 mt-1"
              >
                {user.rescuerType === "Core" ? "Cốt cán" : "Tình nguyện"}
              </Badge>
            </div>
          </div>
          <div className="text-[11px] space-y-1.5 mt-2 border-t pt-2 border-border/70">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">SĐT:</span>
              <span className="font-medium text-foreground">
                {user.phone || "Không có"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium text-foreground">
                {user.email || "Không có"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">Địa chỉ:</span>
              <span className="font-medium text-foreground">
                {[user.address, user.ward, user.province]
                  .filter(Boolean)
                  .join(", ") || "Không có"}
              </span>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-muted-foreground">
                Khả năng chuyên môn:
              </span>
              {user.topAbilities && user.topAbilities.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {user.topAbilities.map((ability, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-[9px] px-1.5 py-0.5 h-auto leading-none bg-muted/50"
                    >
                      {getAbilityLabelVi(ability)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="font-medium text-foreground">
                  Chưa cập nhật
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Page ──

export default function CreateRescueTeamPage() {
  const router = useRouter();

  // ─── Form State ───
  const [teamName, setTeamName] = useState("");
  const [teamType, setTeamType] = useState<RescueTeamTypeKey | "">("");
  const [assemblyPointId, setAssemblyPointId] = useState<string>("");
  const [maxMembers, setMaxMembers] = useState("6");
  const [selectedMembers, setSelectedMembers] = useState<RescueTeamMember[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [rescuerTypeFilter, setRescuerTypeFilter] = useState<
    Exclude<RescuerType, null> | "all"
  >("all");

  // ─── Data Fetching ───
  const { data: teamTypes, isLoading: isLoadingTypes } = useRescueTeamTypes();

  const {
    data: pointsData,
    isLoading: isLoadingPoints,
    fetchNextPage: fetchNextPoints,
    hasNextPage: hasNextPoints,
    isFetchingNextPage: isFetchingNextPoints,
  } = useInfiniteAssemblyPoints({
    params: { pageSize: 10 },
  });

  const assemblyPoints = useMemo(
    () => pointsData?.pages.flatMap((page) => page.items) || [],
    [pointsData],
  );

  const rescuerFilters = useMemo(() => {
    const filters: {
      rescuerType?: Exclude<RescuerType, null>;
    } = {};

    if (rescuerTypeFilter !== "all") {
      filters.rescuerType = rescuerTypeFilter;
    }

    return filters;
  }, [rescuerTypeFilter]);

  const {
    data: usersData,
    isLoading: isLoadingUsers,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteFreeRescuers({
    pageSize: 10,
    params: rescuerFilters,
  });

  const { mutate: createTeam, isPending: isCreating } = useCreateRescueTeam();

  // ─── Infinite Scroll Observer ───
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoadingUsers || isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage();
          }
        },
        { rootMargin: "50px" },
      );

      if (node) observerRef.current.observe(node);
    },
    [isLoadingUsers, isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  const pointsObserverRef = useRef<IntersectionObserver | null>(null);
  const loadMorePointsRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoadingPoints || isFetchingNextPoints) return;
      if (pointsObserverRef.current) pointsObserverRef.current.disconnect();

      pointsObserverRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPoints) {
            fetchNextPoints();
          }
        },
        { rootMargin: "50px" },
      );

      if (node) pointsObserverRef.current.observe(node);
    },
    [isLoadingPoints, isFetchingNextPoints, hasNextPoints, fetchNextPoints],
  );

  // ─── Filter eligible rescuers (free rescuers) ───
  const eligibleRescuers = useMemo(() => {
    if (!usersData?.pages) return [];

    return usersData.pages.flatMap((page) => page.items);
  }, [usersData]);

  const displayedRescuers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return eligibleRescuers;

    return eligibleRescuers.filter((user) => {
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`
        .trim()
        .toLowerCase();
      const email = (user.email || "").toLowerCase();
      const phone = user.phone || "";

      return fullName.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [eligibleRescuers, searchQuery]);

  // ─── Member Selection Helpers ───
  const isMemberSelected = (userId: string) =>
    selectedMembers.some((m) => m.userId === userId);

  const isLeader = (userId: string) =>
    selectedMembers.find((m) => m.userId === userId)?.isLeader || false;

  const toggleMember = (userId: string) => {
    const maxMembersLimit = Math.min(
      8,
      Math.max(6, Number.parseInt(maxMembers, 10) || 6),
    );

    if (isMemberSelected(userId)) {
      setSelectedMembers((prev) => prev.filter((m) => m.userId !== userId));
    } else {
      if (selectedMembers.length >= maxMembersLimit) {
        toast.error(`Số lượng thành viên tối đa phải từ 6 đến 8.`);
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
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const parsedMaxMembers = Number.parseInt(maxMembers, 10);

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

    if (
      Number.isNaN(parsedMaxMembers) ||
      parsedMaxMembers < 6 ||
      parsedMaxMembers > 8
    ) {
      toast.error("Số lượng thành viên tối đa phải từ 6 đến 8.");
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
        maxMembers: parsedMaxMembers,
        members: selectedMembers,
      },
      {
        onSuccess: () => {
          toast.success("Tạo đội cứu hộ thành công!");
          router.push("/dashboard/coordinator");
        },
        onError: (err: any) => {
          console.error(err);

          const backendErrors = err?.response?.data?.errors;
          if (backendErrors && typeof backendErrors === "object") {
            const errorMessages = Object.values(backendErrors)
              .flatMap((value) => (Array.isArray(value) ? value : [value]))
              .filter(Boolean)
              .map((msg) => String(msg));

            if (errorMessages.length > 0) {
              errorMessages.slice(0, 3).forEach((msg) => toast.error(msg));
              return;
            }
          }

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
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] bg-muted/20 overflow-hidden">
      {/* ── Header ── */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur-sm z-10">
        <div className="flex h-12 items-center gap-4 px-6 max-w-7xl mx-auto w-full">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/dashboard/coordinator")}
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="flex-1 flex items-center gap-3">
            <h1 className="text-sm font-semibold flex items-center gap-2">
              <UsersThree className="h-4 w-4 text-emerald-500" weight="fill" />
              Tạo đội cứu hộ mới
            </h1>
            <Badge variant="secondary" className="font-normal text-[10px] h-5">
              Thiết lập nhanh
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => router.push("/dashboard/coordinator")}
              disabled={isCreating}
            >
              Huỷ bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isCreating}
              className="h-8 text-xs gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              onClick={(e) => {
                e.preventDefault();
                const form = document.querySelector("form");
                form?.requestSubmit();
              }}
            >
              {isCreating ? (
                <>
                  <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <CheckCircle size={14} weight="fill" />
                  Xác nhận tạo
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 min-h-0 p-4 lg:p-6 w-full max-w-7xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* ─── Left Column (Config) ─── */}
          <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1 pb-4 custom-scrollbar">
            {/* Info */}
            <Card className="border-border/50 shadow-sm shrink-0">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600">
                    <ShieldStar size={16} weight="fill" />
                  </div>
                  Thông tin chung
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs text-muted-foreground">
                      Tên đội cứu hộ <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="h-9 text-sm"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="VD: Đội cứu hộ Đà Nẵng 01"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs text-muted-foreground">
                      Số thành viên tối đa
                    </Label>
                    <Input
                      type="number"
                      className="h-9 text-sm"
                      min={6}
                      max={8}
                      value={maxMembers}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          setMaxMembers("");
                          return;
                        }

                        const numeric = Number.parseInt(value, 10);
                        if (Number.isNaN(numeric)) return;

                        const clamped = Math.min(8, Math.max(6, numeric));
                        setMaxMembers(String(clamped));
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Hệ thống yêu cầu từ 6 đến 8 thành viên.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assembly Point */}
            <Card className="border-border/50 shadow-sm shrink-0">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600">
                    <MapTrifold size={16} weight="fill" />
                  </div>
                  Điểm tập kết <span className="text-red-500 ml-[-4px]">*</span>
                </div>

                {isLoadingPoints ? (
                  <Skeleton className="h-9 rounded-lg" />
                ) : (
                  <Select
                    value={assemblyPointId}
                    onValueChange={setAssemblyPointId}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Chọn điểm tập kết..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assemblyPoints.map((point) => (
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
                              className="text-[9px] font-medium h-4 px-1"
                            >
                              {point.status === "Active"
                                ? "Hoạt động"
                                : point.status === "Overloaded"
                                  ? "Quá tải"
                                  : "Đóng"}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      {isFetchingNextPoints && (
                        <div className="py-2 flex justify-center w-full">
                          <CircleNotch className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <div ref={loadMorePointsRef} className="h-1 w-full" />
                    </SelectContent>
                  </Select>
                )}
                {assemblyPointId && assemblyPoints.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
                    <CheckCircle
                      className="h-3.5 w-3.5 text-blue-500"
                      weight="fill"
                    />
                    <span className="text-[12px] text-blue-700 dark:text-blue-400">
                      {(() => {
                        const point = assemblyPoints.find(
                          (p) => String(p.id) === assemblyPointId,
                        );
                        return point
                          ? `Sức chứa khả dụng: ${point.capacityTeams} đội`
                          : null;
                      })()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Type */}
            <Card className="border-border/50 shadow-sm shrink-0">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-600">
                    <Sparkle size={16} weight="fill" />
                  </div>
                  Chuyên môn <span className="text-red-500 ml-[-4px]">*</span>
                </div>
                {isLoadingTypes ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-14 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
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
          </div>

          {/* ─── Right Column (Members) ─── */}
          <div className="lg:col-span-7 flex flex-col h-full bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b shrink-0 bg-muted/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
                    <UserCirclePlus size={16} weight="fill" />
                  </div>
                  Thành viên đội{" "}
                  <span className="text-red-500 ml-[-4px]">*</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Đã chọn:</span>
                  <Badge
                    variant={
                      selectedMembers.length > 0 ? "secondary" : "outline"
                    }
                    className="px-2 h-5 font-medium"
                  >
                    {selectedMembers.length} / {maxMembers}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[170px_1fr] gap-2">
                <Select
                  value={rescuerTypeFilter}
                  onValueChange={(value) =>
                    setRescuerTypeFilter(
                      value as Exclude<RescuerType, null> | "all",
                    )
                  }
                >
                  <SelectTrigger className="h-9 text-sm bg-background border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả vai trò</SelectItem>
                    <SelectItem value="Core">Cốt cán</SelectItem>
                    <SelectItem value="Volunteer">Tình nguyện</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    className="h-9 pl-8 text-sm bg-background border-border/60"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Lọc theo họ tên, email, số điện thoại..."
                  />
                </div>
              </div>

              {/* Selected tags */}
              {selectedMembers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 max-h-[64px] overflow-y-auto custom-scrollbar">
                  {selectedMembers.map((member) => {
                    const user = eligibleRescuers.find(
                      (u) => u.id === member.userId,
                    );
                    if (!user) return null;
                    return (
                      <Badge
                        key={member.userId}
                        variant={member.isLeader ? "default" : "secondary"}
                        className={`text-[11px] py-0.5 px-2 gap-1.5 ${
                          member.isLeader
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : ""
                        }`}
                      >
                        {member.isLeader && (
                          <Crown className="h-3 w-3" weight="fill" />
                        )}
                        {user.firstName} {user.lastName}
                        <button
                          type="button"
                          className="ml-1 hover:text-red-500 focus:outline-none"
                          onClick={() => toggleMember(user.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Leader warning */}
              {selectedMembers.length > 0 &&
                !selectedMembers.some((m) => m.isLeader) && (
                  <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50">
                    <Warning
                      className="w-4 h-4 text-orange-500 shrink-0 mt-0.5"
                      weight="fill"
                    />
                    <p className="text-[12px] text-orange-700 dark:text-orange-400 leading-snug">
                      Vui lòng <strong>Chọn làm đội trưởng</strong> cho một
                      thành viên trong nhóm.
                    </p>
                  </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 bg-muted/5 relative">
              {isLoadingUsers ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-[60px] rounded-xl" />
                  ))}
                </div>
              ) : displayedRescuers.length > 0 ? (
                <ScrollArea className="h-full absolute inset-0">
                  <div className="p-3 space-y-1.5">
                    {displayedRescuers.map((user) => (
                      <RescuerCard
                        key={user.id}
                        user={user}
                        selected={isMemberSelected(user.id)}
                        isLeader={isLeader(user.id)}
                        onToggleSelect={() => toggleMember(user.id)}
                        onToggleLeader={() => toggleLeader(user.id)}
                      />
                    ))}

                    {/* Infinite Scroll Trigger */}
                    <div
                      ref={loadMoreRef}
                      className="h-6 w-full flex items-center justify-center mt-2"
                    >
                      {isFetchingNextPage && (
                        <CircleNotch className="w-5 h-5 text-muted-foreground animate-spin" />
                      )}
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 h-full text-center">
                  <div className="bg-background p-4 rounded-full border border-dashed mb-3 shadow-sm">
                    <UserCirclePlus className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-[13px] font-medium text-foreground">
                    {searchQuery
                      ? "Không tìm thấy kết quả"
                      : "Chưa có người cứu hộ phù hợp"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                    {searchQuery
                      ? "Liên hệ hoặc tìm kiếm với từ khóa khác."
                      : "Chỉ hiển thị người cứu hộ đã được duyệt và đang hoạt động."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
