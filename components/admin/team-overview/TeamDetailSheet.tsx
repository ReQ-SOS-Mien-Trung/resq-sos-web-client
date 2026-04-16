"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  UsersThree,
  MapPin,
  UserCircle,
  ListChecks,
  ChartPie,
  CaretDown,
  CaretRight,
  CheckCircle,
  XCircle,
  Clock,
  Spinner,
} from "@phosphor-icons/react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, ChartTooltip, Legend);
import { useRescueTeamDetail } from "@/services/admin_dashboard/team-overview.hooks";
import {
  TeamMember,
  TeamMission,
  MissionActivity,
} from "@/services/admin_dashboard/team-overview.type";
import RescuerScoreSheet from "./RescuerScoreSheet";

interface TeamDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
}

// ─── Status helpers ─────────────────────────────────────────────────────────

const getStatusBadge = (status: string) => {
  const map: Record<string, { className: string }> = {
    Available: {
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    OnMission: { className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
    Standby: {
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    Disbanded: { className: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
  };
  return map[status] || { className: "bg-gray-500/10 text-gray-700" };
};

const getMissionStatusIcon = (status: string) => {
  if (status === "Completed")
    return <CheckCircle size={14} className="text-emerald-500" weight="fill" />;
  if (status === "Incompleted" || status === "Failed")
    return <XCircle size={14} className="text-rose-500" weight="fill" />;
  if (status === "InProgress")
    return <Spinner size={14} className="text-blue-500 animate-spin" />;
  return <Clock size={14} className="text-muted-foreground" />;
};

// ─── Main Component ─────────────────────────────────────────────────────────

const TeamDetailSheet = ({
  open,
  onOpenChange,
  teamId,
}: TeamDetailSheetProps) => {
  const { data, isLoading } = useRescueTeamDetail(teamId, {
    enabled: open && teamId > 0,
  });
  const [expandedMission, setExpandedMission] = useState<number | null>(null);
  const [rescuerSheet, setRescuerSheet] = useState<{
    open: boolean;
    rescuerId: string;
    name: string;
  }>({ open: false, rescuerId: "", name: "" });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft size={18} />
              </Button>
              <div className="flex-1">
                <SheetTitle className="text-base">
                  {data?.name || "Chi tiết đội"}
                </SheetTitle>
                {data && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {data.code}
                    </Badge>
                    <Badge
                      className={`text-xs ${getStatusBadge(data.status).className}`}
                    >
                      {data.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {data.teamType}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="space-y-4 mt-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : data ? (
            <div className="space-y-6 mt-6 pb-6">
              {/* ── Info + Pie Chart row ─────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                {/* Basic info */}
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <MapPin size={16} className="text-red-500" />
                      Thông tin cơ bản
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Điểm tập kết
                      </span>
                      <span className="font-medium">
                        {data.assemblyPointName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quản lý</span>
                      <span className="font-medium">{data.managedByName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Thành viên</span>
                      <span className="font-medium">
                        {data.members.length} / {data.maxMembers}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tạo lúc</span>
                      <span className="font-medium text-xs">
                        {new Date(data.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Pie chart */}
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ChartPie size={16} className="text-blue-500" />
                      Tỉ lệ hoàn thành
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.completionRate.totalMissions === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Chưa có nhiệm vụ
                      </p>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 shrink-0">
                          <Doughnut
                            data={{
                              labels: ["Hoàn thành", "Chưa hoàn thành"],
                              datasets: [
                                {
                                  data: [
                                    data.completionRate.completedCount,
                                    data.completionRate.incompletedCount,
                                  ],
                                  backgroundColor: ["#22c55e", "#ef4444"],
                                  borderWidth: 2,
                                  borderColor: "transparent",
                                  hoverOffset: 4,
                                },
                              ],
                            }}
                            options={{
                              cutout: "62%",
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  callbacks: {
                                    label: (ctx) =>
                                      ` ${ctx.label}: ${ctx.parsed} (${ctx.dataset.data.reduce((a: number, b: number) => a + b, 0) > 0 ? ((ctx.parsed / (ctx.dataset.data.reduce((a: number, b: number) => a + b, 0) as number)) * 100).toFixed(0) : 0}%)`,
                                  },
                                },
                              },
                            }}
                          />
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span>
                              Hoàn thành: {data.completionRate.completedCount} (
                              {data.completionRate.completedPercent.toFixed(0)}
                              %)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            <span>
                              Chưa HT: {data.completionRate.incompletedCount} (
                              {data.completionRate.incompletedPercent.toFixed(
                                0,
                              )}
                              %)
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            Tổng: {data.completionRate.totalMissions} nhiệm vụ
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ── Members ──────────────────────────────────────────────── */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <UsersThree size={16} className="text-violet-500" />
                    Thành viên ({data.members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.members.map((m: TeamMember) => (
                      <button
                        key={m.userId}
                        onClick={() =>
                          setRescuerSheet({
                            open: true,
                            rescuerId: m.userId,
                            name: `${m.lastName} ${m.firstName}`,
                          })
                        }
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors text-left"
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          {m.avatarUrl ? (
                            <AvatarImage src={m.avatarUrl} />
                          ) : null}
                          <AvatarFallback className="text-xs bg-linear-to-br from-red-400 to-orange-500 text-white">
                            {m.lastName?.charAt(0)}
                            {m.firstName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {m.lastName} {m.firstName}
                            </span>
                            {m.isLeader && (
                              <Badge className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                Leader
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {m.rescuerType}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {m.phone} • {m.email}
                          </div>
                        </div>
                        <UserCircle
                          size={18}
                          className="text-muted-foreground shrink-0"
                        />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ── Missions ─────────────────────────────────────────────── */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ListChecks size={16} className="text-emerald-500" />
                    Nhiệm vụ ({data.missions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.missions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Chưa có nhiệm vụ nào
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.missions.map((mission: TeamMission) => (
                        <div
                          key={mission.missionTeamId}
                          className="border border-border/40 rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() =>
                              setExpandedMission(
                                expandedMission === mission.missionTeamId
                                  ? null
                                  : mission.missionTeamId,
                              )
                            }
                            className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              {getMissionStatusIcon(mission.missionStatus)}
                              <span className="text-sm font-medium">
                                Mission #{mission.missionId}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {mission.missionType}
                              </Badge>
                              <Badge
                                className={`text-xs ${
                                  mission.missionStatus === "Completed"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : mission.missionStatus === "InProgress"
                                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                }`}
                              >
                                {mission.missionStatus}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(
                                  mission.assignedAt,
                                ).toLocaleDateString("vi-VN")}
                              </span>
                              {expandedMission === mission.missionTeamId ? (
                                <CaretDown size={14} />
                              ) : (
                                <CaretRight size={14} />
                              )}
                            </div>
                          </button>

                          {expandedMission === mission.missionTeamId && (
                            <div className="px-3 pb-3 border-t border-border/30">
                              <div className="flex items-center gap-4 mt-2 mb-3 text-xs text-muted-foreground">
                                <span>
                                  Giao:{" "}
                                  {new Date(mission.assignedAt).toLocaleString(
                                    "vi-VN",
                                  )}
                                </span>
                                {mission.missionCompletedAt && (
                                  <span>
                                    Xong:{" "}
                                    {new Date(
                                      mission.missionCompletedAt,
                                    ).toLocaleString("vi-VN")}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  Báo cáo: {mission.reportStatus}
                                </Badge>
                              </div>

                              {mission.activities.length > 0 ? (
                                <div className="space-y-1.5">
                                  {mission.activities.map(
                                    (act: MissionActivity) => (
                                      <div
                                        key={act.id}
                                        className="flex items-start gap-2 p-2 rounded-md bg-muted/20 text-sm"
                                      >
                                        <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                          {act.step}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-xs">
                                              {act.activityType}
                                            </span>
                                            <Badge
                                              className={`text-xs ${
                                                act.status === "Completed"
                                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                              }`}
                                            >
                                              {act.status}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {act.description}
                                          </p>
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Không có hoạt động
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Rescuer Score Sheet */}
      <RescuerScoreSheet
        open={rescuerSheet.open}
        onOpenChange={(v) => setRescuerSheet((prev) => ({ ...prev, open: v }))}
        rescuerId={rescuerSheet.rescuerId}
        rescuerName={rescuerSheet.name}
      />
    </>
  );
};

export default TeamDetailSheet;
