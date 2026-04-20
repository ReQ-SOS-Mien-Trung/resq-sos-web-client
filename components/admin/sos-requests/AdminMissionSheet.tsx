"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDots,
  CheckCircle,
  CircleNotch,
  ClipboardText,
  ListChecks,
  WarningCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMissionActivities, useMissions } from "@/services/mission/hooks";
import type { MissionActivity, MissionEntity } from "@/services/mission/type";

const MISSION_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  Planned: {
    label: "Đã lập kế hoạch",
    className: "border-slate-300 bg-slate-100 text-slate-700",
  },
  Pending: {
    label: "Chờ xử lý",
    className: "border-amber-300 bg-amber-100 text-amber-700",
  },
  InProgress: {
    label: "Đang thực hiện",
    className: "border-blue-300 bg-blue-100 text-blue-700",
  },
  Completed: {
    label: "Đã hoàn thành",
    className: "border-emerald-300 bg-emerald-100 text-emerald-700",
  },
  Cancelled: {
    label: "Đã hủy",
    className: "border-rose-300 bg-rose-100 text-rose-700",
  },
};

const ACTIVITY_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  Planned: {
    label: "Đã lập",
    className: "border-slate-300 bg-slate-100 text-slate-700",
  },
  OnGoing: {
    label: "Đang làm",
    className: "border-blue-300 bg-blue-100 text-blue-700",
  },
  PendingConfirmation: {
    label: "Chờ xác nhận",
    className: "border-amber-300 bg-amber-100 text-amber-700",
  },
  Succeed: {
    label: "Hoàn thành",
    className: "border-emerald-300 bg-emerald-100 text-emerald-700",
  },
  Completed: {
    label: "Hoàn thành",
    className: "border-emerald-300 bg-emerald-100 text-emerald-700",
  },
  Failed: {
    label: "Thất bại",
    className: "border-rose-300 bg-rose-100 text-rose-700",
  },
  Cancelled: {
    label: "Đã hủy",
    className: "border-rose-300 bg-rose-100 text-rose-700",
  },
};

const MISSION_STATUS_RANK: Record<string, number> = {
  Completed: 0,
  InProgress: 1,
  Pending: 2,
  Planned: 3,
  Cancelled: 4,
};

function formatMissionTypeLabel(value?: string | null): string {
  const normalized = (value ?? "").trim().toUpperCase();

  if (normalized === "RESCUE" || normalized === "RESCUER") {
    return "Cứu hộ";
  }

  if (normalized === "RELIEF") {
    return "Cứu trợ";
  }

  if (normalized === "MIXED") {
    return "Hỗn hợp";
  }

  return value?.trim() || "Chưa xác định";
}

function getMissionStatusMeta(status?: string | null) {
  const fallback = {
    label: status?.trim() || "Không xác định",
    className: "border-slate-300 bg-slate-100 text-slate-700",
  };

  return MISSION_STATUS_META[status ?? ""] ?? fallback;
}

function getActivityStatusMeta(status?: string | null) {
  const fallback = {
    label: status?.trim() || "Không xác định",
    className: "border-slate-300 bg-slate-100 text-slate-700",
  };

  return ACTIVITY_STATUS_META[status ?? ""] ?? fallback;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "-";
  }

  return new Date(parsed).toLocaleString("vi-VN");
}

function sortMissions(list: MissionEntity[]): MissionEntity[] {
  return [...list].sort((left, right) => {
    const rankDelta =
      (MISSION_STATUS_RANK[left.status] ?? 99) -
      (MISSION_STATUS_RANK[right.status] ?? 99);

    if (rankDelta !== 0) {
      return rankDelta;
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

export interface AdminMissionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterId: number | null;
}

const AdminMissionSheet = ({
  open,
  onOpenChange,
  clusterId,
}: AdminMissionSheetProps) => {
  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(
    null,
  );

  const {
    data: missionsData,
    isLoading: isMissionsLoading,
    isFetching: isMissionsFetching,
  } = useMissions(clusterId ?? 0, {
    enabled: open && clusterId != null,
  });

  const missions = useMemo(
    () => sortMissions(missionsData?.missions ?? []),
    [missionsData?.missions],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (missions.length === 0) {
      setSelectedMissionId(null);
      return;
    }

    setSelectedMissionId((previous) => {
      if (previous && missions.some((mission) => mission.id === previous)) {
        return previous;
      }

      return missions[0].id;
    });
  }, [missions, open]);

  const selectedMission = useMemo(
    () => missions.find((mission) => mission.id === selectedMissionId) ?? null,
    [missions, selectedMissionId],
  );

  const {
    data: missionActivities,
    isLoading: isActivitiesLoading,
    isFetching: isActivitiesFetching,
  } = useMissionActivities(selectedMissionId ?? 0, {
    enabled: open && selectedMissionId != null,
  });

  const sortedActivities = useMemo(
    () =>
      [...(missionActivities ?? [])].sort(
        (left, right) => left.step - right.step,
      ),
    [missionActivities],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-6xl overflow-hidden flex flex-col">
        <div className="shrink-0 border-b border-border/40 bg-muted/10 px-6 pb-5 pt-10">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
              <ListChecks className="text-primary" size={22} weight="fill" />
              Xem nhiệm vụ cụm SOS{clusterId != null ? ` #${clusterId}` : ""}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Chỉ hiển thị thông tin để xem và đối chiếu nhiệm vụ đã tạo trong
              cụm.
            </p>
          </SheetHeader>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="text-sm">
              Cụm: {clusterId != null ? `#${clusterId}` : "-"}
            </Badge>
            <Badge variant="outline" className="text-sm">
              Tổng nhiệm vụ: {missions.length}
            </Badge>
            {selectedMission ? (
              <Badge className="text-sm bg-primary/10 text-primary border-primary/20">
                Đang xem: Mission #{selectedMission.id}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <section className="flex min-h-0 w-full flex-col border-b border-border/40 md:w-88 md:shrink-0 md:border-b-0 md:border-r">
            <div className="shrink-0 border-b border-border/40 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Danh sách nhiệm vụ
              </p>
              <p className="text-sm text-muted-foreground">
                Chọn một mission để xem chi tiết các bước.
              </p>
            </div>

            <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
              <div className="space-y-2 pt-3">
                {isMissionsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton
                      key={`mission-skeleton-${index}`}
                      className="h-24 w-full rounded-lg"
                    />
                  ))
                ) : missions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    Chưa có nhiệm vụ nào trong cụm này.
                  </div>
                ) : (
                  missions.map((mission) => {
                    const statusMeta = getMissionStatusMeta(mission.status);
                    const isSelected = mission.id === selectedMissionId;

                    return (
                      <button
                        key={mission.id}
                        type="button"
                        onClick={() => setSelectedMissionId(mission.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                          isSelected
                            ? "border-primary/45 bg-primary/10"
                            : "border-border/60 bg-background hover:border-primary/30 hover:bg-muted/30",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            Mission #{mission.id}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", statusMeta.className)}
                          >
                            {statusMeta.label}
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs">
                            {formatMissionTypeLabel(mission.missionType)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {mission.activityCount} bước
                          </Badge>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          Tạo lúc: {formatDateTime(mission.createdAt)}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </section>

          <section className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border/40 px-5 py-3">
              <p className="text-sm font-semibold text-foreground">
                Chi tiết bước hoạt động
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedMission
                  ? `Mission #${selectedMission.id} - ${formatMissionTypeLabel(selectedMission.missionType)}`
                  : "Chọn mission bên trái để xem chi tiết."}
              </p>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 px-5 py-4">
                {selectedMission == null ? (
                  <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    Chưa chọn mission để xem chi tiết.
                  </div>
                ) : isActivitiesLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton
                      key={`activity-skeleton-${index}`}
                      className="h-32 w-full rounded-lg"
                    />
                  ))
                ) : sortedActivities.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    Mission này chưa có bước hoạt động.
                  </div>
                ) : (
                  sortedActivities.map((activity: MissionActivity) => {
                    const activityStatus = getActivityStatusMeta(
                      activity.status,
                    );

                    return (
                      <article
                        key={activity.id}
                        className="rounded-xl border border-border/60 bg-background p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 text-sm font-bold text-primary">
                              {activity.step}
                            </span>
                            <p className="text-sm font-semibold text-foreground">
                              {activity.activityType || "Hoạt động"}
                            </p>
                          </div>

                          <Badge
                            variant="outline"
                            className={cn("text-xs", activityStatus.className)}
                          >
                            {activityStatus.label}
                          </Badge>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-foreground">
                          {activity.description || "Không có mô tả."}
                        </p>

                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          <div className="flex items-center gap-1.5">
                            <ClipboardText size={15} />
                            <span>Ưu tiên: {activity.priority || "-"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CalendarDots size={15} />
                            <span>
                              Thời lượng ước tính:{" "}
                              {activity.estimatedTime ?? "-"} phút
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}

                {isActivitiesFetching && !isActivitiesLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    <CircleNotch className="animate-spin" size={16} />
                    Đang cập nhật danh sách bước hoạt động...
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </section>
        </div>

        {isMissionsFetching && !isMissionsLoading ? (
          <div className="shrink-0 border-t border-border/40 bg-muted/10 px-6 py-2 text-sm text-muted-foreground flex items-center gap-2">
            <CircleNotch className="animate-spin" size={16} />
            Đang cập nhật danh sách nhiệm vụ...
          </div>
        ) : null}

        {clusterId == null ? (
          <div className="shrink-0 border-t border-amber-300/50 bg-amber-50 px-6 py-3 text-sm text-amber-700 flex items-center gap-2">
            <WarningCircle size={16} weight="fill" />
            Chưa xác định cụm SOS để tải nhiệm vụ.
          </div>
        ) : null}

        {selectedMission != null && sortedActivities.length > 0 ? (
          <div className="shrink-0 border-t border-border/40 bg-muted/10 px-6 py-2 text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-600" weight="fill" />
            Hiển thị {sortedActivities.length} bước của mission #
            {selectedMission.id}.
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

export default AdminMissionSheet;
