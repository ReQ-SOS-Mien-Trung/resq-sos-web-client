"use client";

import { Fragment, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UsersThree,
  Eye,
  ListChecks,
  CaretDown,
  CaretRight,
  Crown,
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
import { Icon } from "@iconify/react";

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
    rescuerId: number | null;
    name: string;
  }>({
    open: false,
    rescuerId: null,
    name: "",
  });

  const [isMissionSheetOpen, setIsMissionSheetOpen] = useState(false);

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
        className="p-4 space-y-4 tracking-tighter"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } },
        }}
      >
        {/* ── Top row: info + pie chart + members ────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Pie chart */}
          <motion.div
            className="h-full"
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
            }}
          >
            <Card className="h-full border-border/50">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Icon
                    icon="uim:chart-pie"
                    width="24"
                    height="24"
                    className="text-primary"
                  />
                  Tỉ lệ hoàn thành nhiệm vụ
                </CardTitle>
                <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 px-3" onClick={() => setIsMissionSheetOpen(true)}>
                  Xem chi tiết
                  <CaretRight size={14} className="ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="">
                {data.completionRate.totalMissions === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Chưa có nhiệm vụ
                  </p>
                ) : (
                  <div className="flex flex-row items-center justify-center gap-4">
                    <div className="h-52 w-52 shrink-0 xl:h-60 xl:w-60 tracking-normal -m-4 relative z-10">
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
                          layout: { padding: { left: 24, right: 24, top: 16, bottom: 16 } },
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              padding: 10,
                              bodyFont: { size: 14 },
                              boxPadding: 4,
                              yAlign: "bottom",
                              caretPadding: 6,
                              callbacks: {
                                title: () => [] as any,
                                label: (ctx) => {
                                  const total = (
                                    ctx.dataset.data as number[]
                                  ).reduce((a, b) => a + b, 0);
                                  const pct =
                                    total > 0
                                      ? ((ctx.parsed / total) * 100).toFixed(0)
                                      : 0;
                                  return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="whitespace-nowrap">
                          Hoàn thành: {data.completionRate.completedCount} (
                          {data.completionRate.completedPercent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="whitespace-nowrap">
                          Chưa hoàn thành: {data.completionRate.incompletedCount} (
                          {data.completionRate.incompletedPercent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="whitespace-nowrap">
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
            className="h-full"
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
            }}
          >
            <Card className="h-full border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <UsersThree size={20} className="text-violet-500" />
                  Thành viên ({data.members.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {[...data.members]
                  .sort((a, b) => (b.isLeader ? 1 : 0) - (a.isLeader ? 1 : 0))
                  .map((m: TeamMember) => (
                    <button
                      key={m.userId}
                      onClick={() =>
                        setRescuerSheet({
                          open: true,
                          rescuerId: m.userId,
                          name: `${m.lastName} ${m.firstName}`,
                        })
                      }
                      className="flex w-full items-center gap-2.5 rounded-lg border border-border/40 p-2 text-left transition-colors hover:bg-muted/40"
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        {m.avatarUrl ? <AvatarImage src={m.avatarUrl} /> : null}
                        <AvatarFallback className="text-sm bg-linear-to-br from-violet-400 to-purple-500 text-white">
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
                            <Crown
                              size={14}
                              weight="fill"
                              className="text-amber-500 shrink-0"
                            />
                          )}
                        </div>
                      </div>
                      <Eye
                        size={15}
                        className="text-muted-foreground shrink-0"
                      />
                    </button>
                  ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>


      </motion.div>

      <RescuerScoreSheet
        open={rescuerSheet.open}
        onOpenChange={(v) => setRescuerSheet((prev) => ({ ...prev, open: v }))}
        rescuerId={rescuerSheet.rescuerId}
        rescuerName={rescuerSheet.name}
      />

      <Sheet
        open={isMissionSheetOpen}
        onOpenChange={(open) => {
          setIsMissionSheetOpen(open);
          if (!open) setExpandedMission(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="flex h-[82vh] flex-col rounded-t-[28px] border-x-0 border-b-0 border-t border-border/60 px-0 pt-0 sm:h-[82vh]"
        >
          <SheetHeader className="shrink-0 border-b border-border/50 px-6 pb-4 pt-6 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <ListChecks size={20} className="text-emerald-500" />
              Chi tiết nhiệm vụ ({data.missions.length})
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex-1 overflow-auto px-6 pb-6">
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-background">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/50">
                <TableRow>
                    <TableHead className="w-11" />
                    <TableHead className="w-[110px]">Mã NV</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Báo cáo</TableHead>
                  <TableHead>Ngày giao</TableHead>
                  <TableHead>Ngày hoàn thành</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                  {data.missions.map((mission: TeamMission) => {
                    const isExpanded = expandedMission === mission.missionTeamId;
                    return (
                      <Fragment key={mission.missionTeamId}>
                        <TableRow
                          onClick={() =>
                            setExpandedMission((prev) =>
                              prev === mission.missionTeamId
                                ? null
                                : mission.missionTeamId,
                            )
                          }
                          className={`cursor-pointer transition-colors hover:bg-muted/30 ${
                            isExpanded ? "bg-muted/40" : ""
                          }`}
                        >
                          <TableCell className="text-muted-foreground">
                            {isExpanded ? (
                              <CaretDown size={15} />
                            ) : (
                              <CaretRight size={15} />
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium">
                            #{mission.missionId}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="whitespace-nowrap font-normal"
                            >
                              {mission.missionType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`whitespace-nowrap text-xs ${
                                mission.missionStatus === "Completed"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : mission.missionStatus === "InProgress"
                                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                              }`}
                            >
                              {mission.missionStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {mission.reportStatus ? (
                              <Badge variant="outline" className="font-normal">
                                {mission.reportStatus}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-foreground/80">
                            {new Date(mission.assignedAt).toLocaleString(
                              "vi-VN",
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-foreground/80">
                            {mission.missionCompletedAt
                              ? new Date(
                                  mission.missionCompletedAt,
                                ).toLocaleString("vi-VN")
                              : "-"}
                          </TableCell>
                        </TableRow>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={7} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{
                                    duration: 0.24,
                                    ease: "easeInOut",
                                  }}
                                  className="overflow-hidden"
                                >
                                  <div className="border-t border-border/40 bg-muted/15 px-5 py-4">
                                    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                      <Badge variant="outline" className="font-normal">
                                        Báo cáo: {mission.reportStatus || "-"}
                                      </Badge>
                                      <span>
                                        Giao lúc:{" "}
                                        {new Date(
                                          mission.assignedAt,
                                        ).toLocaleString("vi-VN")}
                                      </span>
                                      <span>
                                        Hoàn thành:{" "}
                                        {mission.missionCompletedAt
                                          ? new Date(
                                              mission.missionCompletedAt,
                                            ).toLocaleString("vi-VN")
                                          : "Chưa hoàn thành"}
                                      </span>
                                    </div>

                                    {mission.activities.length > 0 ? (
                                      <div className="space-y-2">
                                        {mission.activities.map(
                                          (act: MissionActivity) => (
                                            <div
                                              key={act.id}
                                              className="flex items-start gap-3 rounded-xl border border-border/40 bg-background px-3 py-2.5"
                                            >
                                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                                {act.step}
                                              </span>
                                              <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="text-sm font-medium text-foreground">
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
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                  {act.description}
                                                </p>
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        Chưa có hoạt động nào cho nhiệm vụ này
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })}
                  {data.missions.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Chưa có nhiệm vụ nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export { TeamDetailPanel, getStatusBadge };
export type { TeamDetailPanelProps };
