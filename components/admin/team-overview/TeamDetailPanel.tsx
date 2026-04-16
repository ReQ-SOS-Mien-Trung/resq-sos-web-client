"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
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
import { useRescueTeamDetail } from "@/services/admin_dashboard/team-overview.hooks";
import {
  TeamMember,
  TeamMission,
  MissionActivity,
} from "@/services/admin_dashboard/team-overview.type";
import RescuerScoreSheet from "./RescuerScoreSheet";

ChartJS.register(ArcElement, ChartTooltip, Legend);

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Inline Detail Panel ─────────────────────────────────────────────────────

interface TeamDetailPanelProps {
  teamId: number;
}

const TeamDetailPanel = ({ teamId }: TeamDetailPanelProps) => {
  const { data, isLoading } = useRescueTeamDetail(teamId, {
    enabled: teamId > 0,
  });
  const [expandedMission, setExpandedMission] = useState<number | null>(null);
  const [rescuerSheet, setRescuerSheet] = useState<{
    open: boolean;
    rescuerId: string;
    name: string;
  }>({ open: false, rescuerId: "", name: "" });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <motion.div
        className="p-4 space-y-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } },
        }}
      >
        {/* ── Top row: info + pie chart + members ────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {/* Basic info */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
            }}
          >
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin size={15} className="text-red-500" />
                  Thông tin cơ bản
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">
                    Điểm tập kết
                  </span>
                  <span className="font-medium text-right">
                    {data.assemblyPointName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">
                    Quản lý
                  </span>
                  <span className="font-medium text-right">
                    {data.managedByName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">
                    Thành viên
                  </span>
                  <span className="font-medium">
                    {data.members.length} / {data.maxMembers}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Loại</span>
                  <Badge variant="outline" className="text-sm">
                    {data.teamType}
                  </Badge>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">
                    Ngày tạo
                  </span>
                  <span className="text-sm font-medium">
                    {new Date(data.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pie chart */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
            }}
          >
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ChartPie size={15} className="text-blue-500" />
                  Tỉ lệ hoàn thành nhiệm vụ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.completionRate.totalMissions === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Chưa có nhiệm vụ
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-44 h-44 shrink-0">
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
                                label: (ctx) => {
                                  const total = (
                                    ctx.dataset.data as number[]
                                  ).reduce((a, b) => a + b, 0);
                                  const pct =
                                    total > 0
                                      ? ((ctx.parsed / total) * 100).toFixed(0)
                                      : 0;
                                  return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-sm w-full">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>
                          Hoàn thành: {data.completionRate.completedCount} (
                          {data.completionRate.completedPercent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span>
                          Chưa HT: {data.completionRate.incompletedCount} (
                          {data.completionRate.incompletedPercent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="text-muted-foreground pt-1 border-t border-border/40">
                        Tổng: {data.completionRate.totalMissions} nhiệm vụ
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Members */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
            }}
          >
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UsersThree size={15} className="text-violet-500" />
                  Thành viên ({data.members.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
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
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors text-left"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      {m.avatarUrl ? <AvatarImage src={m.avatarUrl} /> : null}
                      <AvatarFallback className="text-sm bg-linear-to-br from-red-400 to-orange-500 text-white">
                        {m.lastName?.charAt(0)}
                        {m.firstName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {m.lastName} {m.firstName}
                        </span>
                        {m.isLeader && (
                          <Badge className="text-sm py-0 px-1 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            Leader
                          </Badge>
                        )}
                      </div>
                    </div>
                    <UserCircle
                      size={15}
                      className="text-muted-foreground shrink-0"
                    />
                  </button>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Missions ──────────────────────────────────────────────────────── */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
          }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ListChecks size={15} className="text-emerald-500" />
                Nhiệm vụ ({data.missions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.missions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có nhiệm vụ nào
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {getMissionStatusIcon(mission.missionStatus)}
                          <span className="text-sm font-medium">
                            Mission #{mission.missionId}
                          </span>
                          <Badge variant="outline" className="text-sm">
                            {mission.missionType}
                          </Badge>
                          <Badge
                            className={`text-sm ${
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
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm text-muted-foreground">
                            {new Date(mission.assignedAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                          {expandedMission === mission.missionTeamId ? (
                            <CaretDown size={13} />
                          ) : (
                            <CaretRight size={13} />
                          )}
                        </div>
                      </button>

                      {expandedMission === mission.missionTeamId && (
                        <div className="px-3 pb-3 border-t border-border/30">
                          <div className="flex flex-wrap items-center gap-3 mt-2 mb-3 text-sm text-muted-foreground">
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
                            <Badge variant="outline" className="text-sm">
                              Báo cáo: {mission.reportStatus}
                            </Badge>
                          </div>
                          {mission.activities.length > 0 ? (
                            <div className="space-y-1.5">
                              {mission.activities.map(
                                (act: MissionActivity) => (
                                  <div
                                    key={act.id}
                                    className="flex items-start gap-2 p-2 rounded-md bg-muted/20"
                                  >
                                    <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                                      {act.step}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">
                                          {act.activityType}
                                        </span>
                                        <Badge
                                          className={`text-sm ${
                                            act.status === "Completed"
                                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                          }`}
                                        >
                                          {act.status}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-0.5">
                                        {act.description}
                                      </p>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
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
        </motion.div>
      </motion.div>

      <RescuerScoreSheet
        open={rescuerSheet.open}
        onOpenChange={(v) => setRescuerSheet((prev) => ({ ...prev, open: v }))}
        rescuerId={rescuerSheet.rescuerId}
        rescuerName={rescuerSheet.name}
      />
    </>
  );
};

export { TeamDetailPanel, getStatusBadge };
export type { TeamDetailPanelProps };
