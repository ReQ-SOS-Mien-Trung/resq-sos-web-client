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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  UsersThree,
  MapPin,
  Eye,
  ListChecks,
  ChartPie,
  CaretDown,
  CaretRight,
  CheckCircle,
  XCircle,
  Clock,
  Spinner,
  Crown,
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

  const [isMissionSheetOpen, setIsMissionSheetOpen] = useState(false);

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
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ChartPie size={16} className="text-blue-500" />
                      Tỉ lệ hoàn thành
                    </CardTitle>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 shrink-0" onClick={() => setIsMissionSheetOpen(true)}>
                      Xem chi tiết
                      <CaretRight size={12} className="ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {data.completionRate.totalMissions === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Chưa có nhiệm vụ
                      </p>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-32 shrink-0 tracking-normal -m-4 relative z-10">
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
                                  bodyFont: { size: 13 },
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
                    {[...data.members].sort((a, b) => (b.isLeader ? 1 : 0) - (a.isLeader ? 1 : 0)).map((m: TeamMember) => (
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
                              <Crown
                                size={14}
                                weight="fill"
                                className="text-amber-500 shrink-0"
                              />
                            )}
                            <Badge variant="outline" className="text-xs">
                              {m.rescuerType}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {m.phone} • {m.email}
                          </div>
                        </div>
                        <Eye
                          size={18}
                          className="text-muted-foreground shrink-0"
                        />
                      </button>
                    ))}
                  </div>
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

      <Sheet open={isMissionSheetOpen} onOpenChange={setIsMissionSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] sm:max-h-[85vh] flex flex-col pt-6 z-[60]">
          <SheetHeader className="shrink-0 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <ListChecks size={20} className="text-emerald-500" />
              Chi tiết nhiệm vụ ({data?.missions?.length || 0})
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-auto mt-4 px-1">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Mã NV</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Báo cáo</TableHead>
                  <TableHead>Ngày giao</TableHead>
                  <TableHead>Ngày hoàn thành</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.missions?.map((mission: TeamMission) => (
                  <TableRow key={mission.missionTeamId}>
                    <TableCell className="font-medium whitespace-nowrap">#{mission.missionId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal whitespace-nowrap">{mission.missionType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs whitespace-nowrap ${
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
                    <TableCell className="whitespace-nowrap">{mission.reportStatus}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(mission.assignedAt).toLocaleString("vi-VN")}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {mission.missionCompletedAt
                        ? new Date(mission.missionCompletedAt).toLocaleString("vi-VN")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.missions || data.missions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Chưa có nhiệm vụ nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TeamDetailSheet;
