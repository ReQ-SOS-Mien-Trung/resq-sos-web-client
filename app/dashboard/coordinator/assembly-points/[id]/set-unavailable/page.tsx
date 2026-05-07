"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowsClockwise,
  CheckCircle,
  CircleNotch,
  MapPin,
  Users,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  clearAssemblyPointUnavailableDraft,
  readAssemblyPointUnavailableDraft,
} from "@/lib/assembly-point-unavailable-flow";
import {
  useAssemblyPointUnavailableImpact,
  useSetAssemblyPointUnavailableWithReassignment,
} from "@/services/assembly_points/hooks";
import type {
  AssemblyPointUnavailableAlternative,
  AssemblyPointUnavailableCheckedInRescuer,
  AssemblyPointUnavailableImpactResponse,
  AssemblyPointUnavailableMissionActivity,
  AssemblyPointUnavailableStationedTeam,
} from "@/services/assembly_points/type";

type TargetMap = Record<string, number | undefined>;

function parseRouteId(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{
    message?: string;
    title?: string;
    errors?: Record<string, string[] | undefined>;
  }>;
  const errors = axiosError.response?.data?.errors;
  if (errors) {
    const first = Object.values(errors).find(
      (messages) => Array.isArray(messages) && messages.length > 0,
    );
    if (first?.[0]) return first[0];
  }

  return (
    axiosError.response?.data?.message ||
    axiosError.response?.data?.title ||
    fallback
  );
}

function getFullName(
  rescuer: AssemblyPointUnavailableCheckedInRescuer,
): string {
  const fullName = [rescuer.lastName, rescuer.firstName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || rescuer.email || rescuer.phone || rescuer.userId;
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "?";
}

function formatTargetLabel(point: AssemblyPointUnavailableAlternative): string {
  const distance =
    typeof point.distanceKm === "number" ? ` • ${point.distanceKm} km` : "";
  return `${point.name} (${point.code})${distance}`;
}

function formatActivityType(activityType: string | null): string {
  if (activityType === "EVACUATE") return "Sơ tán";
  if (activityType === "RETURN_ASSEMBLY_POINT") return "Quay về điểm tập kết";
  return activityType?.replace(/_/g, " ") || "Hoạt động";
}

function flattenActivities(
  impact: AssemblyPointUnavailableImpactResponse | null,
): AssemblyPointUnavailableMissionActivity[] {
  if (!impact) return [];

  const byId = new Map<number, AssemblyPointUnavailableMissionActivity>();
  for (const team of impact.rescueTeams) {
    for (const activity of team.activities) {
      byId.set(activity.missionActivityId, activity);
    }
  }

  return [...byId.values()].sort((a, b) => {
    const missionA = a.missionId ?? 0;
    const missionB = b.missionId ?? 0;
    if (missionA !== missionB) return missionA - missionB;
    return (a.step ?? 0) - (b.step ?? 0);
  });
}

function retainValidTargets(
  previous: TargetMap,
  itemIds: string[],
  validTargetIds: Set<number>,
): TargetMap {
  const next: TargetMap = {};
  for (const id of itemIds) {
    const target = previous[id];
    if (target != null && validTargetIds.has(target)) {
      next[id] = target;
    }
  }
  return next;
}

function TargetSelect({
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  value?: number;
  options: AssemblyPointUnavailableAlternative[];
  placeholder: string;
  disabled?: boolean;
  onChange: (targetId: number) => void;
}) {
  return (
    <Select
      value={value != null ? String(value) : undefined}
      disabled={disabled || options.length === 0}
      onValueChange={(nextValue) => {
        const parsed = Number(nextValue);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
    >
      <SelectTrigger className="h-9 w-full min-w-0 overflow-hidden bg-white text-sm dark:bg-slate-950 [&>span]:block [&>span]:truncate [&>span]:pr-1">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((point) => (
          <SelectItem key={point.id} value={String(point.id)}>
            {formatTargetLabel(point)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={cn("rounded-xl border px-3 py-3", tone)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 whitespace-nowrap">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}

export default function AssemblyPointUnavailableReassignmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assemblyPointId = parseRouteId(params.id);

  const [draftImpact, setDraftImpact] =
    useState<AssemblyPointUnavailableImpactResponse | null>(() => {
      if (!Number.isFinite(assemblyPointId)) return null;
      return readAssemblyPointUnavailableDraft(assemblyPointId)?.impact ?? null;
    });
  const [reason, setReason] = useState(() => {
    if (!Number.isFinite(assemblyPointId)) return "";
    return readAssemblyPointUnavailableDraft(assemblyPointId)?.reason ?? "";
  });
  const [rescuerTargets, setRescuerTargets] = useState<TargetMap>({});
  const [teamTargets, setTeamTargets] = useState<TargetMap>({});
  const [activityTargets, setActivityTargets] = useState<TargetMap>({});

  const {
    data: latestImpact,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useAssemblyPointUnavailableImpact(assemblyPointId, {
    enabled: Number.isFinite(assemblyPointId),
  });
  const { mutateAsync: saveReassignment, isPending: isSaving } =
    useSetAssemblyPointUnavailableWithReassignment();

  const impact = latestImpact ?? draftImpact;
  const activities = useMemo(() => flattenActivities(impact), [impact]);
  const rescuerIds = useMemo(
    () => impact?.checkedInRescuers.map((rescuer) => rescuer.userId) ?? [],
    [impact?.checkedInRescuers],
  );
  const teamIds = useMemo(
    () => impact?.stationedTeams.map((team) => String(team.rescueTeamId)) ?? [],
    [impact?.stationedTeams],
  );
  const activityIds = useMemo(
    () => activities.map((activity) => String(activity.missionActivityId)),
    [activities],
  );
  const availableTargetIds = useMemo(
    () =>
      new Set((impact?.availableAssemblyPoints ?? []).map((point) => point.id)),
    [impact?.availableAssemblyPoints],
  );
  const validRescuerTargets = useMemo(
    () => retainValidTargets(rescuerTargets, rescuerIds, availableTargetIds),
    [availableTargetIds, rescuerIds, rescuerTargets],
  );
  const validTeamTargets = useMemo(
    () => retainValidTargets(teamTargets, teamIds, availableTargetIds),
    [availableTargetIds, teamIds, teamTargets],
  );
  const validActivityTargets = useMemo(
    () => retainValidTargets(activityTargets, activityIds, availableTargetIds),
    [activityIds, activityTargets, availableTargetIds],
  );

  const memberTeamNames = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const team of impact?.stationedTeams ?? []) {
      const teamName =
        team.rescueTeamName ||
        team.rescueTeamCode ||
        `Đội #${team.rescueTeamId}`;
      for (const memberId of team.memberUserIds) {
        result.set(memberId, [...(result.get(memberId) ?? []), teamName]);
      }
    }
    return result;
  }, [impact?.stationedTeams]);

  const getDerivedRescuerTarget = useCallback(
    (rescuerId: string): number | undefined => {
      const teams = (impact?.stationedTeams ?? []).filter((team) =>
        team.memberUserIds.includes(rescuerId),
      );
      if (teams.length === 0) return validRescuerTargets[rescuerId];

      const targets = teams
        .map((team) => validTeamTargets[String(team.rescueTeamId)])
        .filter((target): target is number => target != null);
      if (targets.length !== teams.length) return undefined;

      const [firstTarget] = targets;
      return targets.every((target) => target === firstTarget)
        ? firstTarget
        : undefined;
    },
    [impact?.stationedTeams, validRescuerTargets, validTeamTargets],
  );

  const completedCount = useMemo(() => {
    if (!impact) return 0;

    let count = 0;
    for (const rescuer of impact.checkedInRescuers) {
      if (getDerivedRescuerTarget(rescuer.userId) != null) count += 1;
    }
    for (const team of impact.stationedTeams) {
      if (validTeamTargets[String(team.rescueTeamId)] != null) count += 1;
    }
    for (const activity of activities) {
      if (validActivityTargets[String(activity.missionActivityId)] != null) {
        count += 1;
      }
    }
    return count;
  }, [
    activities,
    getDerivedRescuerTarget,
    impact,
    validActivityTargets,
    validTeamTargets,
  ]);

  const totalRequired =
    (impact?.checkedInRescuers.length ?? 0) +
    (impact?.stationedTeams.length ?? 0) +
    activities.length;

  const applyTargetToAll = (targetId: number) => {
    if (!impact) return;

    setRescuerTargets(
      Object.fromEntries(
        impact.checkedInRescuers.map((rescuer) => [rescuer.userId, targetId]),
      ),
    );
    setTeamTargets(
      Object.fromEntries(
        impact.stationedTeams.map((team) => [
          String(team.rescueTeamId),
          targetId,
        ]),
      ),
    );
    setActivityTargets(
      Object.fromEntries(
        activities.map((activity) => [
          String(activity.missionActivityId),
          targetId,
        ]),
      ),
    );
  };

  const validateAssignments = (): string | null => {
    if (!impact) return "Chưa có dữ liệu impact để lưu điều phối.";
    if (!reason.trim()) return "Vui lòng nhập lý do không khả dụng.";
    if (impact.availableAssemblyPoints.length === 0) {
      return "Không có điểm tập kết đích khả dụng để điều phối lại.";
    }

    for (const team of impact.stationedTeams) {
      const target = validTeamTargets[String(team.rescueTeamId)];
      if (target == null || !availableTargetIds.has(target)) {
        return `Chưa chọn điểm tập kết đích cho đội ${team.rescueTeamName || team.rescueTeamCode || `#${team.rescueTeamId}`}.`;
      }
    }

    for (const rescuer of impact.checkedInRescuers) {
      const target = getDerivedRescuerTarget(rescuer.userId);
      if (target == null || !availableTargetIds.has(target)) {
        return `Chưa chọn điểm tập kết đích cho ${getFullName(rescuer)}.`;
      }
    }

    for (const activity of activities) {
      const target = validActivityTargets[String(activity.missionActivityId)];
      if (target == null || !availableTargetIds.has(target)) {
        return `Chưa chọn điểm tập kết đích cho activity #${activity.missionActivityId}.`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    const validationMessage = validateAssignments();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    if (!impact) return;

    try {
      const response = await saveReassignment({
        id: assemblyPointId,
        reason: reason.trim(),
        rescuerReassignments: impact.checkedInRescuers.map((rescuer) => ({
          userId: rescuer.userId,
          targetAssemblyPointId: getDerivedRescuerTarget(rescuer.userId)!,
        })),
        teamReassignments: impact.stationedTeams.map((team) => ({
          rescueTeamId: team.rescueTeamId,
          targetAssemblyPointId: validTeamTargets[String(team.rescueTeamId)]!,
        })),
        missionActivityReassignments: activities.map((activity) => ({
          missionActivityId: activity.missionActivityId,
          targetAssemblyPointId:
            validActivityTargets[String(activity.missionActivityId)]!,
        })),
      });

      clearAssemblyPointUnavailableDraft();
      toast.success(
        `${response.message} Đã điều phối ${response.reassignedRescuerCount} nhân sự, ${response.reassignedStationedTeamCount} đội và ${response.reassignedMissionActivityCount} hoạt động.`,
      );
      router.push(`/dashboard/coordinator?sel=ap&id=${assemblyPointId}`);
    } catch (saveError) {
      const axiosError = saveError as AxiosError;
      if (axiosError.response?.status === 409) {
        const latest = await refetch();
        if (latest.data) setDraftImpact(latest.data);
        toast.warning(
          "Dữ liệu đã thay đổi. Màn hình đã tải lại impact mới, vui lòng kiểm tra lại các điểm đích.",
        );
        return;
      }

      toast.error(
        getErrorMessage(saveError, "Không thể lưu điều phối lại lúc này."),
      );
    }
  };

  if (!Number.isFinite(assemblyPointId)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <WarningCircle className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-3 text-lg font-bold">
              Assembly Point không hợp lệ
            </h1>
            <Button
              className="mt-4"
              onClick={() => router.push("/dashboard/coordinator")}
            >
              Quay về dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const alternatives = impact?.availableAssemblyPoints ?? [];
  const sourceName =
    impact?.assemblyPointName || `Điểm tập kết #${assemblyPointId}`;

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
              onClick={() =>
                router.push(
                  `/dashboard/coordinator?sel=ap&id=${assemblyPointId}`,
                )
              }
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#FF5722]">
                Điều phối điểm tập kết không khả dụng
              </p>
              <h1 className="truncate text-lg font-black tracking-tighter">
                {sourceName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 text-sm"
              onClick={() => void refetch()}
              disabled={isFetching || isSaving}
            >
              <ArrowsClockwise
                className={cn("h-4 w-4", isFetching && "animate-spin")}
              />
              Làm mới
            </Button>
            <Button
              className="gap-2 bg-[#FF5722] text-sm text-white hover:bg-[#E64A19]"
              onClick={handleSave}
              disabled={
                isSaving ||
                !impact ||
                !reason.trim() ||
                alternatives.length === 0 ||
                completedCount !== totalRequired
              }
            >
              {isSaving ? (
                <CircleNotch className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" weight="fill" />
              )}
              Lưu điều phối
            </Button>
          </div>
        </div>
      </header>

      <main className="grid gap-5 px-6 py-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4 overflow-hidden">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Nguồn &amp; lý do
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && !impact ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : isError && !impact ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {getErrorMessage(
                    error,
                    "Không thể tải impact điều phối lại.",
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-bold tracking-tight">
                      {sourceName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {impact?.assemblyPointCode || "Chưa có mã"} •{" "}
                      {impact?.currentStatus || "PendingUnavailable"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Lý do *
                    </p>
                    <Textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={4}
                      className="text-[14px]"
                      placeholder="Nhập lý do không khả dụng"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Tiến độ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <SummaryTile
                  label="Nhân sự"
                  value={impact?.checkedInRescuers.length ?? 0}
                  tone="border-blue-200 bg-blue-50 text-blue-700"
                />
                <SummaryTile
                  label="Đội"
                  value={impact?.stationedTeams.length ?? 0}
                  tone="border-emerald-200 bg-emerald-50 text-emerald-700"
                />
                <SummaryTile
                  label="Hoạt động"
                  value={activities.length}
                  tone="border-orange-200 bg-orange-50 text-orange-700"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-black tracking-tight">
                    {completedCount}/{totalRequired}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[#FF5722] transition-all"
                    style={{
                      width:
                        totalRequired > 0
                          ? `${Math.round((completedCount / totalRequired) * 100)}%`
                          : "100%",
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Áp dụng nhanh
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alternatives.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[14px] text-amber-800">
                  Không có điểm tập kết nào đang khả dụng để nhận điều phối.
                </div>
              ) : (
                <TargetSelect
                  options={alternatives}
                  placeholder="Gán điểm đích cho tất cả"
                  onChange={applyTargetToAll}
                />
              )}
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          {impact ? (
            <>
              <ImpactSection
                title="Người cứu hộ đang check-in"
                icon={<Users className="h-5 w-5" weight="fill" />}
                count={impact.checkedInRescuers.length}
              >
                {impact.checkedInRescuers.length === 0 ? (
                  <EmptyState label="Không có người cứu hộ đang check-in." />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {impact.checkedInRescuers.map((rescuer) => {
                      const name = getFullName(rescuer);
                      const teamNames =
                        memberTeamNames.get(rescuer.userId) ?? [];
                      const derivedTarget = getDerivedRescuerTarget(
                        rescuer.userId,
                      );

                      return (
                        <div
                          key={rescuer.userId}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 border">
                              <AvatarImage
                                src={rescuer.avatarUrl ?? undefined}
                              />
                              <AvatarFallback>
                                {getInitials(name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-bold tracking-tight">
                                {name}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {rescuer.phone ||
                                  rescuer.email ||
                                  rescuer.userId}
                              </p>
                              {teamNames.length > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="mt-2 border-emerald-200 bg-emerald-50 text-emerald-700"
                                >
                                  Theo đội: {teamNames.join(", ")}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3">
                            <TargetSelect
                              value={derivedTarget}
                              options={alternatives}
                              placeholder={
                                teamNames.length > 0
                                  ? "Chọn điểm đích theo đội"
                                  : "Chọn điểm đích"
                              }
                              disabled={teamNames.length > 0}
                              onChange={(targetId) =>
                                setRescuerTargets((previous) => ({
                                  ...previous,
                                  [rescuer.userId]: targetId,
                                }))
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ImpactSection>

              <ImpactSection
                title="Đội đang trực thuộc AP nguồn"
                icon={<UsersThree className="h-5 w-5" weight="fill" />}
                count={impact.stationedTeams.length}
              >
                {impact.stationedTeams.length === 0 ? (
                  <EmptyState label="Không có đội nào đang trực thuộc điểm này." />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {impact.stationedTeams.map((team) => (
                      <TeamAssignmentCard
                        key={team.rescueTeamId}
                        team={team}
                        value={validTeamTargets[String(team.rescueTeamId)]}
                        options={alternatives}
                        onChange={(targetId) =>
                          setTeamTargets((previous) => ({
                            ...previous,
                            [String(team.rescueTeamId)]: targetId,
                          }))
                        }
                      />
                    ))}
                  </div>
                )}
              </ImpactSection>

              <ImpactSection
                title="Hoạt động nhiệm vụ cần chuyển đích"
                icon={<MapPin className="h-5 w-5" weight="fill" />}
                count={activities.length}
              >
                {activities.length === 0 ? (
                  <EmptyState label="Không có hoạt động nào cần đổi điểm đích." />
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.missionActivityId}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold tracking-tight">
                              Nhiệm vụ #{activity.missionActivityId}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              M #{activity.missionId ?? "?"} • Bước{" "}
                              {activity.step ?? "?"} •{" "}
                              {formatActivityType(activity.activityType)}
                            </p>
                          </div>
                          <Badge variant="outline">{activity.status}</Badge>
                        </div>
                        {activity.description ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {activity.description}
                          </p>
                        ) : null}
                        <div className="mt-3">
                          <TargetSelect
                            value={
                              validActivityTargets[
                                String(activity.missionActivityId)
                              ]
                            }
                            options={alternatives}
                            placeholder="Chọn điểm đích cho hoạt động"
                            onChange={(targetId) =>
                              setActivityTargets((previous) => ({
                                ...previous,
                                [String(activity.missionActivityId)]: targetId,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ImpactSection>
            </>
          ) : (
            <div className="space-y-4">
              <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-36 w-full animate-pulse rounded-xl bg-slate-100" />
              <div className="h-36 w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ImpactSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
}) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <span className="text-[#FF5722]">{icon}</span>
            {title}
          </span>
          <Badge variant="secondary" className="text-xs font-bold">
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TeamAssignmentCard({
  team,
  value,
  options,
  onChange,
}: {
  team: AssemblyPointUnavailableStationedTeam;
  value?: number;
  options: AssemblyPointUnavailableAlternative[];
  onChange: (targetId: number) => void;
}) {
  const teamName =
    team.rescueTeamName || team.rescueTeamCode || `Đội #${team.rescueTeamId}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold tracking-tight">
            {teamName}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {team.memberUserIds.length} thành viên •{" "}
            {team.rescueTeamStatus || "Available"}
          </p>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700" variant="secondary">
          Team
        </Badge>
      </div>
      <div className="mt-3">
        <TargetSelect
          value={value}
          options={options}
          placeholder="Chọn điểm đích cho đội"
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
