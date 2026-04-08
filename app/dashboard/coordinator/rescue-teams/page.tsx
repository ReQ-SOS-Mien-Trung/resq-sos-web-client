"use client";

import { useRescueTeams } from "@/services/rescue_teams/hooks";
import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowsCounterClockwise,
  FunnelSimple,
  MagnifyingGlass,
  UsersThree,
  MapPin,
  Pulse,
  ArrowRight,
  UserPlus,
  Plus,
  CheckCircle,
  Warning,
} from "@phosphor-icons/react";
import Link from "next/link";
import {
  RescueTeamStatusKey,
  RescueTeamTypeKey,
} from "@/services/rescue_teams/type";

type RescueTeamColumnKey = "todo" | "in-progress" | "completed";
type OccupancyFilterKey = "all" | "empty" | "low" | "medium" | "full";

export default function RescueTeamsPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilter, setColumnFilter] = useState<
    "all" | "todo" | "in-progress" | "completed"
  >("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RescueTeamStatusKey>(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<"all" | RescueTeamTypeKey>(
    "all",
  );
  const [occupancyFilter, setOccupancyFilter] =
    useState<OccupancyFilterKey>("all");
  const [columnStatusFilters, setColumnStatusFilters] = useState<
    Record<RescueTeamColumnKey, "all" | RescueTeamStatusKey>
  >({
    todo: "all",
    "in-progress": "all",
    completed: "all",
  });
  const [columnTypeFilters, setColumnTypeFilters] = useState<
    Record<RescueTeamColumnKey, "all" | RescueTeamTypeKey>
  >({
    todo: "all",
    "in-progress": "all",
    completed: "all",
  });
  const [columnOccupancyFilters, setColumnOccupancyFilters] = useState<
    Record<RescueTeamColumnKey, OccupancyFilterKey>
  >({
    todo: "all",
    "in-progress": "all",
    completed: "all",
  });
  const { data, isLoading, isError } = useRescueTeams({
    params: {
      pageNumber: page,
      pageSize: 24,
    },
  });

  const statusMap: Record<
    RescueTeamStatusKey,
    {
      label: string;
      className: string;
      dotClassName: string;
    }
  > = {
    AwaitingAcceptance: {
      label: "Chờ xác nhận",
      className: "border-amber-200 bg-amber-50 text-amber-800",
      dotClassName: "bg-amber-500",
    },
    Ready: {
      label: "Sẵn sàng",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      dotClassName: "bg-emerald-500",
    },
    Gathering: {
      label: "Đang tập hợp",
      className: "border-sky-200 bg-sky-50 text-sky-800",
      dotClassName: "bg-sky-500",
    },
    Available: {
      label: "Sẵn sàng",
      className: "border-teal-200 bg-teal-50 text-teal-800",
      dotClassName: "bg-teal-500",
    },
    Assigned: {
      label: "Đã phân công",
      className: "border-indigo-200 bg-indigo-50 text-indigo-800",
      dotClassName: "bg-indigo-500",
    },
    OnMission: {
      label: "Đang làm nhiệm vụ",
      className: "border-violet-200 bg-violet-50 text-violet-800",
      dotClassName: "bg-violet-500",
    },
    Stuck: {
      label: "Mắc kẹt",
      className: "border-rose-200 bg-rose-50 text-rose-800",
      dotClassName: "bg-rose-500",
    },
    Unavailable: {
      label: "Không khả dụng",
      className: "border-slate-300 bg-slate-100 text-slate-700",
      dotClassName: "bg-slate-500",
    },
    Disbanded: {
      label: "Đã giải tán",
      className: "border-zinc-300 bg-zinc-100 text-zinc-700",
      dotClassName: "bg-zinc-500",
    },
  };

  const getStatusMeta = (status: RescueTeamStatusKey) =>
    statusMap[status] || {
      label: status,
      className: "border-slate-300 bg-slate-100 text-slate-700",
      dotClassName: "bg-slate-500",
    };

  const getStatusBadge = (status: RescueTeamStatusKey) => {
    const config = getStatusMeta(status);
    return (
      <Badge
        variant="outline"
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold shadow-none",
          config.className,
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", config.dotClassName)} />
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
      className: "border border-orange-200 bg-orange-50 text-orange-800",
    },
    Medical: {
      label: "Y tế",
      className: "border border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    Transportation: {
      label: "Vận chuyển",
      className: "border border-sky-200 bg-sky-50 text-sky-800",
    },
    Mixed: {
      label: "Hỗn hợp",
      className: "border border-slate-200 bg-slate-100 text-slate-700",
    },
  };

  const getTypeBadge = (type: RescueTeamTypeKey) => {
    const config = typeMap[type] || { label: type, className: "" };
    return (
      <Badge
        variant="secondary"
        className={cn(
          "rounded-full px-3 py-1 text-sm font-medium",
          config.className,
        )}
      >
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

  const getOccupancyMeta = (occupancy: number) => {
    if (occupancy >= 100) {
      return {
        label: "Đủ quân số",
        hint: "100% - sẵn sàng triển khai",
        chipClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-800",
        trackClassName: "border-emerald-200 bg-emerald-50/70",
        fillClassName:
          "bg-[linear-gradient(90deg,#16a34a_0%,#22c55e_55%,#4ade80_100%)]",
        valueClassName: "text-emerald-700",
      };
    }

    if (occupancy >= 50) {
      return {
        label: "Đang bổ sung",
        hint: "50%+ - đã đạt mức tối thiểu",
        chipClassName: "border border-amber-200 bg-amber-50 text-amber-800",
        trackClassName: "border-amber-200 bg-amber-50/70",
        fillClassName:
          "bg-[linear-gradient(90deg,#d97706_0%,#f59e0b_60%,#fbbf24_100%)]",
        valueClassName: "text-amber-700",
      };
    }

    if (occupancy > 0) {
      return {
        label: "Thiếu quân số",
        hint: "Dưới 50% - cần điều người gấp",
        chipClassName: "border border-rose-200 bg-rose-50 text-rose-800",
        trackClassName: "border-rose-200 bg-rose-50/70",
        fillClassName:
          "bg-[linear-gradient(90deg,#e11d48_0%,#f43f5e_55%,#fb7185_100%)]",
        valueClassName: "text-rose-700",
      };
    }

    return {
      label: "Trống quân số",
      hint: "0% - chưa có thành viên",
      chipClassName: "border border-slate-300 bg-slate-100 text-slate-700",
      trackClassName: "border-slate-300 bg-slate-100",
      fillClassName: "bg-slate-400",
      valueClassName: "text-slate-600",
    };
  };

  const getOccupancyBarWidth = (occupancy: number) => {
    if (occupancy === 0) return "0%";
    if (occupancy < 8) return "0.75rem";
    return `${occupancy}%`;
  };

  const matchesOccupancyFilter = (
    occupancy: number,
    filter: OccupancyFilterKey,
  ) => {
    return (
      filter === "all" ||
      (filter === "empty" && occupancy === 0) ||
      (filter === "low" && occupancy > 0 && occupancy < 50) ||
      (filter === "medium" && occupancy >= 50 && occupancy < 100) ||
      (filter === "full" && occupancy >= 100)
    );
  };

  const getColumnKey = (status: RescueTeamStatusKey) => {
    if (
      status === "AwaitingAcceptance" ||
      status === "Ready" ||
      status === "Gathering" ||
      status === "Available"
    ) {
      return "todo";
    }

    if (status === "Assigned" || status === "OnMission") {
      return "in-progress";
    }

    return "completed";
  };

  const statusOrderMap: Record<RescueTeamStatusKey, number> = {
    AwaitingAcceptance: 0,
    Ready: 1,
    Gathering: 2,
    Available: 3,
    Assigned: 1,
    OnMission: 2,
    Stuck: 0,
    Unavailable: 1,
    Disbanded: 2,
  };

  const compareTeams = (
    a: {
      status: RescueTeamStatusKey;
      currentMemberCount: number;
      maxMembers: number;
      name: string;
    },
    b: {
      status: RescueTeamStatusKey;
      currentMemberCount: number;
      maxMembers: number;
      name: string;
    },
  ) => {
    const statusPriority =
      (statusOrderMap[a.status] ?? 99) - (statusOrderMap[b.status] ?? 99);
    if (statusPriority !== 0) return statusPriority;

    const occupancyPriority =
      getOccupancyPercent(a.currentMemberCount, a.maxMembers) -
      getOccupancyPercent(b.currentMemberCount, b.maxMembers);
    if (occupancyPriority !== 0) return occupancyPriority;

    return a.name.localeCompare(b.name, "vi");
  };

  const columns = [
    {
      key: "todo",
      title: "Chờ điều phối",
      description:
        "Đội đang chờ xác nhận, đang tập hợp hoặc đã sẵn sàng nhận nhiệm vụ mới.",
      dotClassName: "bg-amber-500",
      cardClassName:
        "border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white",
      countClassName: "bg-amber-100 text-amber-800",
    },
    {
      key: "in-progress",
      title: "Đang triển khai",
      description: "Đội đã được phân công hoặc đang làm nhiệm vụ.",
      dotClassName: "bg-sky-500",
      cardClassName:
        "border-sky-200/80 bg-gradient-to-b from-sky-50/80 to-white",
      countClassName: "bg-sky-100 text-sky-800",
    },
    {
      key: "completed",
      title: "Hoàn tất / Ngưng",
      description: "Đội tạm ngưng, không khả dụng, mắc kẹt hoặc đã giải tán.",
      dotClassName: "bg-slate-500",
      cardClassName:
        "border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white",
      countClassName: "bg-slate-200 text-slate-700",
    },
  ] as const;
  const columnStatusOptions: Record<
    RescueTeamColumnKey,
    Array<"all" | RescueTeamStatusKey>
  > = {
    todo: ["all", "AwaitingAcceptance", "Ready", "Gathering", "Available"],
    "in-progress": ["all", "Assigned", "OnMission"],
    completed: ["all", "Stuck", "Unavailable", "Disbanded"],
  };
  const columnFilterTheme: Record<
    RescueTeamColumnKey,
    {
      selectClassName: string;
    }
  > = {
    todo: {
      selectClassName:
        "border-amber-200/80 bg-white/90 text-amber-900 focus:ring-amber-200",
    },
    "in-progress": {
      selectClassName:
        "border-sky-200/80 bg-white/90 text-sky-900 focus:ring-sky-200",
    },
    completed: {
      selectClassName:
        "border-slate-200/80 bg-white/90 text-slate-900 focus:ring-slate-200",
    },
  };

  const teams = useMemo(() => data?.items ?? [], [data?.items]);
  const numberFormatter = new Intl.NumberFormat("vi-VN");
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const activeFilterCount = [
    normalizedSearch.length > 0,
    columnFilter !== "all",
    statusFilter !== "all",
    typeFilter !== "all",
    occupancyFilter !== "all",
    ...Object.values(columnStatusFilters).map((value) => value !== "all"),
    ...Object.values(columnTypeFilters).map((value) => value !== "all"),
    ...Object.values(columnOccupancyFilters).map((value) => value !== "all"),
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  const teamsByColumn = useMemo(
    () =>
      teams.reduce(
        (acc, team) => {
          acc[getColumnKey(team.status)].push(team);
          return acc;
        },
        {
          todo: [] as typeof teams,
          "in-progress": [] as typeof teams,
          completed: [] as typeof teams,
        },
      ),
    [teams],
  );

  const filteredTeams = useMemo(
    () =>
      teams.filter((team) => {
        const occupancy = getOccupancyPercent(
          team.currentMemberCount,
          team.maxMembers,
        );
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [team.name, team.code, team.assemblyPointName]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));

        const matchesColumn =
          columnFilter === "all" || getColumnKey(team.status) === columnFilter;
        const matchesStatus =
          statusFilter === "all" || team.status === statusFilter;
        const matchesType =
          typeFilter === "all" || team.teamType === typeFilter;
        const matchesOccupancy = matchesOccupancyFilter(
          occupancy,
          occupancyFilter,
        );

        return (
          matchesSearch &&
          matchesColumn &&
          matchesStatus &&
          matchesType &&
          matchesOccupancy
        );
      }),
    [
      teams,
      normalizedSearch,
      columnFilter,
      statusFilter,
      typeFilter,
      occupancyFilter,
    ],
  );

  const filteredTeamsByColumn = useMemo(
    () =>
      filteredTeams.reduce(
        (acc, team) => {
          acc[getColumnKey(team.status)].push(team);
          return acc;
        },
        {
          todo: [] as typeof filteredTeams,
          "in-progress": [] as typeof filteredTeams,
          completed: [] as typeof filteredTeams,
        },
      ),
    [filteredTeams],
  );

  const visibleColumns =
    columnFilter === "all"
      ? columns
      : columns.filter((column) => column.key === columnFilter);

  const visibleTeamsCount = filteredTeams.length;
  const readyTeams = filteredTeams.filter(
    (team) => team.status === "Ready" || team.status === "Available",
  ).length;
  const activeTeams = filteredTeams.filter((team) =>
    ["Assigned", "OnMission"].includes(team.status),
  ).length;
  const shortageTeams = filteredTeams.filter(
    (team) =>
      getOccupancyPercent(team.currentMemberCount, team.maxMembers) < 50,
  ).length;
  const fullyStaffedTeams = filteredTeams.filter(
    (team) =>
      getOccupancyPercent(team.currentMemberCount, team.maxMembers) >= 100,
  ).length;
  const resetFilters = () => {
    setSearchQuery("");
    setColumnFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setOccupancyFilter("all");
    setColumnStatusFilters({
      todo: "all",
      "in-progress": "all",
      completed: "all",
    });
    setColumnTypeFilters({
      todo: "all",
      "in-progress": "all",
      completed: "all",
    });
    setColumnOccupancyFilters({
      todo: "all",
      "in-progress": "all",
      completed: "all",
    });
  };
  const overviewCards = [
    {
      title: "Đang hiển thị",
      value: numberFormatter.format(visibleTeamsCount),
      description: hasActiveFilters
        ? `${numberFormatter.format(visibleTeamsCount)} / ${numberFormatter.format(teams.length)} đội phù hợp bộ lọc`
        : "Tất cả đội trong trang hiện tại đang được hiển thị",
      icon: UsersThree,
      iconClassName: "bg-slate-900 text-white",
    },
    {
      title: "Sẵn sàng điều phối",
      value: numberFormatter.format(readyTeams),
      description:
        "Đội có thể nhận nhiệm vụ ngay hoặc đang ở trạng thái sẵn sàng",
      icon: CheckCircle,
      iconClassName: "bg-emerald-500 text-white",
    },
    {
      title: "Đang triển khai",
      value: numberFormatter.format(activeTeams),
      description: "Đội đã phân công hoặc đang làm nhiệm vụ",
      icon: Pulse,
      iconClassName: "bg-sky-500 text-white",
    },
    {
      title: "Cần bổ sung quân số",
      value: numberFormatter.format(shortageTeams),
      description: `${numberFormatter.format(fullyStaffedTeams)} đội đã đủ quân số`,
      icon: Warning,
      iconClassName: "bg-rose-500 text-white",
    },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1480px] space-y-6 bg-slate-50 p-4 tracking-tighter md:p-6">
        <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-orange-50/60 to-sky-50/70 p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#FF5722]">
                Bảng điều phối đội cứu hộ
              </p>
              <h1 className="text-pretty text-2xl font-bold text-slate-900 md:text-3xl">
                Quản lý Đội Cứu Hộ
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                Theo dõi đội theo trạng thái xử lý theo dạng Kanban trực quan và
                dễ quét thông tin.
              </p>
            </div>
            <Button
              disabled
              className="h-11 gap-2 rounded-xl bg-[#FF5722] px-4 text-white shadow-sm hover:bg-[#e64a19]"
            >
              <Plus className="h-4 w-4" />
              Thêm đội cứu hộ
            </Button>
          </div>

          <div className="mt-5 grid gap-2.5 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/70 bg-white/85 p-3.5 shadow-sm"
              >
                <Skeleton className="h-9 w-9 rounded-2xl" />
                <Skeleton className="mt-3 h-4 w-28" />
                <Skeleton className="mt-2 h-7 w-14" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, columnIndex) => (
            <div
              key={columnIndex}
              className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2.5 w-2.5 rounded-full" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                  <Skeleton className="h-4 w-full max-w-[220px]" />
                </div>
                <Skeleton className="h-7 w-10 rounded-full" />
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1 pr-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card
                    key={i}
                    className="min-w-[300px] max-w-[330px] shrink-0 rounded-2xl border border-slate-200 shadow-none"
                  >
                    <CardHeader className="space-y-3 pb-3">
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </div>
                      <Skeleton className="h-6 w-4/5" />
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4 text-sm">
                      <div className="rounded-2xl border border-slate-200 p-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="mt-3 h-3 w-full rounded-full" />
                        <Skeleton className="mt-3 h-3 w-4/5" />
                      </div>
                      <Skeleton className="h-16 w-full rounded-2xl" />
                      <Skeleton className="h-16 w-full rounded-2xl" />
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1480px] bg-slate-50 p-4 tracking-tighter md:p-6">
        <div className="rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <Warning className="h-6 w-6" weight="duotone" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            Quản lý Đội Cứu Hộ
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Đã xảy ra lỗi khi tải danh sách đội cứu hộ. Vui lòng thử lại sau.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6 bg-slate-50 p-4 tracking-tighter md:p-6">
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-orange-50/60 to-sky-50/70 p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#FF5722]">
              Bảng điều phối đội cứu hộ
            </p>
            <h1 className="text-pretty text-2xl font-bold text-slate-900 md:text-3xl">
              Quản lý Đội Cứu Hộ
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Theo dõi tình trạng đội, quân số hiện có và luồng triển khai theo
              cách trực quan hơn để điều phối nhanh trong lúc vận hành.
            </p>
          </div>

          <Button
            asChild
            className="h-11 gap-2 rounded-xl bg-[#FF5722] px-4 text-white shadow-sm hover:bg-[#e64a19] focus-visible:ring-2 focus-visible:ring-[#FF5722]/30"
          >
            <Link href="/dashboard/coordinator/rescue-teams/create">
              <UserPlus className="h-4 w-4" />
              Thêm đội cứu hộ
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-2.5 md:grid-cols-2 lg:grid-cols-4">
          {overviewCards.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="h-full rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm shadow-slate-200/60"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm",
                    item.iconClassName,
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-600">
                  {item.title}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {item.value}
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-500">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700">
            Quân số đủ: xanh lá
          </span>
          <span className="rounded-full border border-amber-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700">
            Cần bổ sung: vàng
          </span>
          <span className="rounded-full border border-rose-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700">
            Thiếu nghiêm trọng: đỏ
          </span>
          <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700">
            Trống quân số: xám
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm shadow-slate-200/60">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FunnelSimple
                  className="h-4 w-4 text-slate-500"
                  aria-hidden="true"
                  weight="duotone"
                />
                <h2 className="text-sm font-semibold text-slate-900">
                  Bộ lọc rescue team
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Lọc theo tên đội, loại đội, trạng thái và mức quân số để theo
                dõi nhanh hơn.
              </p>
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="h-9 rounded-xl border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-100"
              >
                <ArrowsCounterClockwise
                  className="h-4 w-4"
                  aria-hidden="true"
                  weight="bold"
                />
                Xóa bộ lọc
              </Button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[320px] flex-[1.8_1_420px]">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
                weight="duotone"
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm theo tên đội, mã đội hoặc điểm tập kết…"
                className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-none placeholder:text-slate-400 focus-visible:ring-[#FF5722]/30"
              />
            </div>

            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as "all" | RescueTeamTypeKey)
              }
            >
              <SelectTrigger className="h-11 w-full min-w-[190px] rounded-xl border-slate-200 bg-white text-sm shadow-none md:w-[210px]">
                <SelectValue placeholder="Loại đội" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại đội</SelectItem>
                {(
                  Object.entries(typeMap) as [
                    RescueTeamTypeKey,
                    { label: string; className: string },
                  ][]
                ).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={occupancyFilter}
              onValueChange={(value) =>
                setOccupancyFilter(
                  value as "all" | "empty" | "low" | "medium" | "full",
                )
              }
            >
              <SelectTrigger className="h-11 w-full min-w-[210px] rounded-xl border-slate-200 bg-white text-sm shadow-none md:w-[230px]">
                <SelectValue placeholder="Mức quân số" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả mức quân số</SelectItem>
                <SelectItem value="empty">0% - Trống quân số</SelectItem>
                <SelectItem value="low">1% - 49%: Thiếu nhiều</SelectItem>
                <SelectItem value="medium">50% - 99%: Đang bổ sung</SelectItem>
                <SelectItem value="full">100%: Đủ quân số</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "all" | RescueTeamStatusKey)
              }
            >
              <SelectTrigger className="h-11 w-full min-w-[230px] rounded-xl border-slate-200 bg-white text-sm shadow-none md:w-[250px]">
                <SelectValue placeholder="Trạng thái cụ thể" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái cụ thể</SelectItem>
                {(
                  Object.entries(statusMap) as [
                    RescueTeamStatusKey,
                    { label: string; className: string; dotClassName: string },
                  ][]
                ).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <p className="text-sm text-slate-600">
              Đang hiển thị{" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {numberFormatter.format(visibleTeamsCount)}
              </span>{" "}
              / {numberFormatter.format(teams.length)} đội trong trang hiện tại.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {hasActiveFilters && (
                <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-600">
                  {activeFilterCount} bộ lọc đang bật
                </span>
              )}
              <span>Thứ tự trong từng cột ưu tiên đội cần chú ý trước.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {visibleColumns.map((column) => {
          const visibleColumnTeams = filteredTeamsByColumn[column.key];
          const currentColumnFilter = columnStatusFilters[column.key];
          const currentColumnTypeFilter = columnTypeFilters[column.key];
          const currentColumnOccupancyFilter =
            columnOccupancyFilters[column.key];
          const filterTheme = columnFilterTheme[column.key];
          const columnTeams = [
            ...visibleColumnTeams.filter((team) => {
              const occupancy = getOccupancyPercent(
                team.currentMemberCount,
                team.maxMembers,
              );

              const matchesColumnStatus =
                currentColumnFilter === "all" ||
                team.status === currentColumnFilter;
              const matchesColumnType =
                currentColumnTypeFilter === "all" ||
                team.teamType === currentColumnTypeFilter;
              const matchesColumnOccupancy = matchesOccupancyFilter(
                occupancy,
                currentColumnOccupancyFilter,
              );

              return (
                matchesColumnStatus &&
                matchesColumnType &&
                matchesColumnOccupancy
              );
            }),
          ].sort(compareTeams);
          const totalColumnTeams = teamsByColumn[column.key].length;
          const hasColumnScopedFilter =
            currentColumnFilter !== "all" ||
            currentColumnTypeFilter !== "all" ||
            currentColumnOccupancyFilter !== "all";
          const columnCountLabel = hasColumnScopedFilter
            ? `${numberFormatter.format(columnTeams.length)} / ${numberFormatter.format(visibleColumnTeams.length)}`
            : hasActiveFilters
              ? `${numberFormatter.format(visibleColumnTeams.length)} / ${numberFormatter.format(totalColumnTeams)}`
              : numberFormatter.format(columnTeams.length);

          return (
            <div
              key={column.key}
              className={cn(
                "rounded-[28px] border p-4 shadow-sm shadow-slate-200/70",
                column.cardClassName,
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        column.dotClassName,
                      )}
                    />
                    <h2 className="text-lg font-semibold text-slate-900">
                      {column.title}
                    </h2>
                  </div>
                  <p className="mt-2 max-w-sm text-sm leading-5 text-slate-600">
                    {column.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Select
                      value={currentColumnFilter}
                      onValueChange={(value) =>
                        setColumnStatusFilters((previous) => ({
                          ...previous,
                          [column.key]: value as "all" | RescueTeamStatusKey,
                        }))
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-8 min-w-[180px] rounded-full px-3 text-sm font-medium shadow-none",
                          filterTheme.selectClassName,
                        )}
                      >
                        <SelectValue placeholder="Trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnStatusOptions[column.key].map((statusKey) => {
                          const count =
                            statusKey === "all"
                              ? visibleColumnTeams.length
                              : visibleColumnTeams.filter(
                                  (team) => team.status === statusKey,
                                ).length;
                          const label =
                            statusKey === "all"
                              ? "Tất cả trạng thái"
                              : getStatusMeta(statusKey).label;

                          return (
                            <SelectItem key={statusKey} value={statusKey}>
                              {label} ({numberFormatter.format(count)})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <Select
                      value={currentColumnTypeFilter}
                      onValueChange={(value) =>
                        setColumnTypeFilters((previous) => ({
                          ...previous,
                          [column.key]: value as "all" | RescueTeamTypeKey,
                        }))
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-8 min-w-[150px] rounded-full px-3 text-sm font-medium shadow-none",
                          filterTheme.selectClassName,
                        )}
                      >
                        <SelectValue placeholder="Loại đội" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả loại đội</SelectItem>
                        {(
                          Object.entries(typeMap) as [
                            RescueTeamTypeKey,
                            { label: string; className: string },
                          ][]
                        ).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={currentColumnOccupancyFilter}
                      onValueChange={(value) =>
                        setColumnOccupancyFilters((previous) => ({
                          ...previous,
                          [column.key]: value as OccupancyFilterKey,
                        }))
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-8 min-w-[170px] rounded-full px-3 text-sm font-medium shadow-none",
                          filterTheme.selectClassName,
                        )}
                      >
                        <SelectValue placeholder="Quân số" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả quân số</SelectItem>
                        <SelectItem value="empty">
                          0% - Trống quân số
                        </SelectItem>
                        <SelectItem value="low">
                          1% - 49%: Thiếu nhiều
                        </SelectItem>
                        <SelectItem value="medium">
                          50% - 99%: Đang bổ sung
                        </SelectItem>
                        <SelectItem value="full">100%: Đủ quân số</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-semibold tabular-nums",
                    column.countClassName,
                  )}
                >
                  {columnCountLabel}
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 pr-1">
                {columnTeams.map((team) => {
                  const occupancy = getOccupancyPercent(
                    team.currentMemberCount,
                    team.maxMembers,
                  );
                  const occupancyMeta = getOccupancyMeta(occupancy);

                  return (
                    <Card
                      key={team.id}
                      className="min-w-[300px] max-w-[330px] shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                    >
                      <CardHeader className="space-y-2 pb-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">
                            {team.code}
                          </span>
                          {getTypeBadge(team.teamType)}
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle
                              className="line-clamp-2 text-pretty text-base leading-tight text-slate-900"
                              title={team.name}
                            >
                              {team.name}
                            </CardTitle>
                          </div>
                          <div className="shrink-0">
                            {getStatusBadge(team.status)}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-2 pb-2.5 text-sm">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/85 p-2">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                              <UsersThree
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                                weight="duotone"
                              />
                              Quân số hiện tại
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-sm font-semibold",
                                  occupancyMeta.chipClassName,
                                )}
                              >
                                {occupancyMeta.label}
                              </span>
                              <span
                                className={cn(
                                  "text-sm font-semibold tabular-nums",
                                  occupancyMeta.valueClassName,
                                )}
                              >
                                {occupancy}%
                              </span>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "relative h-3 overflow-hidden rounded-full border",
                              occupancyMeta.trackClassName,
                            )}
                          >
                            <span className="absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-black/10" />
                            <span className="absolute inset-y-0 right-0 z-10 w-px bg-black/10" />

                            {occupancy === 0 && (
                              <span className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0,transparent_38%,rgba(71,85,105,0.18)_38%,rgba(71,85,105,0.18)_50%,transparent_50%,transparent_100%)] bg-[length:18px_18px]" />
                            )}

                            <div
                              className="relative z-20 h-full transition-[width] duration-300 ease-out"
                              style={{
                                width: getOccupancyBarWidth(occupancy),
                              }}
                            >
                              <div
                                className={cn(
                                  "h-full w-full rounded-full",
                                  occupancyMeta.fillClassName,
                                )}
                              />
                            </div>
                          </div>

                          <div className="mt-2 flex items-end justify-between gap-2">
                            <p className="text-sm text-slate-500">
                              <span className="font-semibold text-slate-900 tabular-nums">
                                {team.currentMemberCount}
                              </span>{" "}
                              / {team.maxMembers} thành viên
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white p-2">
                          <div className="flex items-start gap-2 text-slate-600">
                            <MapPin
                              className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                              aria-hidden="true"
                              weight="duotone"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">
                                Điểm tập kết
                              </p>
                              <p
                                className="mt-0.5 line-clamp-2 break-words text-sm leading-5 text-slate-700"
                                title={team.assemblyPointName}
                              >
                                {team.assemblyPointName ||
                                  "Chưa có điểm tập kết"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="pt-0">
                        <Button
                          asChild
                          variant="outline"
                          className="h-9 w-full gap-1.5 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#FF5722]/30"
                        >
                          <Link
                            href={`/dashboard/coordinator/rescue-teams/${team.id}`}
                            className="w-full"
                          >
                            Xem chi tiết
                            <ArrowRight
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}

                {columnTeams.length === 0 && (
                  <div className="min-w-[300px] rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      {hasActiveFilters
                        ? "Không có đội phù hợp trong nhóm này"
                        : "Chưa có đội trong cột này"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {hasActiveFilters
                        ? "Hãy đổi hoặc xóa bớt bộ lọc để xem thêm rescue team."
                        : "Khi có thay đổi trạng thái, đội sẽ hiển thị tại đây."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Button
            variant="outline"
            disabled={!data.hasPreviousPage}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          >
            Trước
          </Button>

          <span className="text-sm text-slate-600">
            Trang{" "}
            <span className="font-semibold text-slate-900 tabular-nums">
              {data.pageNumber}
            </span>{" "}
            / {data.totalPages}
          </span>

          <Button
            variant="outline"
            disabled={!data.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
