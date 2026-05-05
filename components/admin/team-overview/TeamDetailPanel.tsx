"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
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
import { UsersThree, Eye, ListChecks, CaretRight } from "@phosphor-icons/react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { useRescueTeamDetail } from "@/services/admin_dashboard/team-overview.hooks";
import { useMissionActivityStatuses } from "@/services/mission/hooks";
import { useRescueTeamTypes } from "@/services/rescue_teams/hooks";
import {
  TeamMember,
  TeamMission,
  MissionActivity,
} from "@/services/admin_dashboard/team-overview.type";
import RescuerScoreSheet from "./RescuerScoreSheet";
import MissionTeamReportInline from "./MissionTeamReportInline";
import { Icon } from "@iconify/react";
import { activityTypeConfig } from "@/lib/constants";

ChartJS.register(ArcElement, ChartTooltip, Legend);

// ─── Helpers ────────────────────────────────────────────────────────────────

const panelContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const panelItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const missionListVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const missionRowVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

const tabPanelVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.16, ease: "easeIn" },
  },
};

const activityGridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};

const activityCardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: "easeOut" },
  },
};

type MetadataOption = { key: string; value: string };

function normalizeMetadataKey(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");
}

function getMetadataValue(
  options: MetadataOption[],
  key?: string | null,
): string | undefined {
  const normalizedKey = normalizeMetadataKey(key);
  return options.find(
    (option) => normalizeMetadataKey(option.key) === normalizedKey,
  )?.value;
}

function cleanTeamTypeLabel(label?: string | null): string {
  return (label ?? "")
    .replace(/^(team|đội)\s+/i, "")
    .replace(/\s+(team|đội)$/i, "")
    .trim();
}

function getTeamTypeBadge(type?: string | null, label?: string | null) {
  const normalizedType = normalizeMetadataKey(type);
  const cleanLabel = cleanTeamTypeLabel(label || type) || "Chưa rõ";

  if (normalizedType === "mixed") {
    return {
      label: cleanLabel,
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
  }

  if (normalizedType === "rescue") {
    return {
      label: cleanLabel,
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    };
  }

  if (normalizedType === "medical") {
    return {
      label: cleanLabel,
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
  }

  if (normalizedType === "transportation") {
    return {
      label: cleanLabel,
      className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    };
  }

  return {
    label: cleanLabel,
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  };
}

function normalizeActivityStatusKey(status?: string | null): string {
  const normalized = normalizeMetadataKey(status);

  if (
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "succeeded" ||
    normalized === "success"
  ) {
    return "succeed";
  }

  if (normalized === "inprogress" || normalized === "ongoing") {
    return "ongoing";
  }

  if (normalized === "pending") {
    return "pendingconfirmation";
  }

  return normalized;
}

function getActivityStatusLabel(
  options: MetadataOption[],
  status?: string | null,
): string | undefined {
  const normalizedStatus = normalizeActivityStatusKey(status);
  return options.find(
    (option) => normalizeActivityStatusKey(option.key) === normalizedStatus,
  )?.value;
}

function getActivityStatusBadge(status?: string | null, label?: string) {
  const normalized = normalizeActivityStatusKey(status);
  const fallbackLabel = status || "Chưa rõ";

  if (normalized === "succeed") {
    return {
      label: label ?? fallbackLabel,
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
  }

  if (normalized === "ongoing") {
    return {
      label: label ?? fallbackLabel,
      className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    };
  }

  if (normalized === "pendingconfirmation") {
    return {
      label: label ?? fallbackLabel,
      className: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    };
  }

  if (normalized === "failed" || normalized === "incompleted") {
    return {
      label: label ?? fallbackLabel,
      className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    };
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return {
      label: label ?? fallbackLabel,
      className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    };
  }

  if (normalized === "planned") {
    return {
      label: label ?? fallbackLabel,
      className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    };
  }

  return {
    label: label ?? fallbackLabel,
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  };
}

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
  const { data: rescueTeamTypeOptions = [] } = useRescueTeamTypes({
    enabled: teamId > 0,
  });
  const shouldReduceMotion = useReducedMotion();
  const [expandedMission, setExpandedMission] = useState<number | null>(null);
  const [rescuerSheet, setRescuerSheet] = useState<{
    open: boolean;
    rescuerId: string;
    name: string;
  }>({
    open: false,
    rescuerId: "",
    name: "",
  });

  const [isMissionSheetOpen, setIsMissionSheetOpen] = useState(false);
  const { data: activityStatusOptions = [] } = useMissionActivityStatuses({
    enabled: isMissionSheetOpen,
  });

  const [missionTab, setMissionTab] = useState<
    Record<number, "activities" | "report">
  >({});

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
        variants={shouldReduceMotion ? undefined : panelContainerVariants}
      >
        {/* ── Top row: info + pie chart + members ────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Pie chart */}
          <motion.div
            className="h-full"
            variants={shouldReduceMotion ? undefined : panelItemVariants}
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0 px-3"
                  onClick={() => setIsMissionSheetOpen(true)}
                >
                  Xem chi tiết
                  <CaretRight size={14} className="ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="">
                {data.completionRate.totalMissions === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Chưa có thống kê
                  </p>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <div className="h-40 w-40 shrink-0 sm:h-52 sm:w-52 xl:h-60 xl:w-60 tracking-normal -m-4 relative z-10">
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
                          layout: {
                            padding: {
                              left: 24,
                              right: 24,
                              top: 16,
                              bottom: 16,
                            },
                          },
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
                          Chưa hoàn thành:{" "}
                          {data.completionRate.incompletedCount} (
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
            variants={shouldReduceMotion ? undefined : panelItemVariants}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">
                            {m.lastName} {m.firstName}
                          </span>
                          {m.isLeader && (
                            <Icon
                              icon="iconoir:bright-crown"
                              width="20"
                              height="20"
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
          className="flex h-[85vh] flex-col gap-0 overflow-hidden rounded-t-[28px] border-x-0 border-b-0 border-t border-border/60 bg-slate-50 p-0 dark:bg-background sm:h-[85vh]"
        >
          <SheetHeader className="shrink-0 bg-white px-6 pb-4 pt-6 text-left dark:bg-card">
            <SheetTitle className="flex items-center gap-2.5 text-lg tracking-tighter">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <ListChecks size={18} className="text-emerald-600" />
              </div>
              Chi tiết nhiệm vụ
              <Badge className="ml-1 rounded-full bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 dark:bg-muted dark:text-muted-foreground">
                {data.missions.length}
              </Badge>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-auto px-6 py-5">
            {data.missions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-white py-16 text-center dark:bg-card">
                <ListChecks size={40} className="mb-3 text-slate-300" />
                <p className="text-sm font-medium tracking-tighter text-muted-foreground">
                  Chưa có nhiệm vụ nào
                </p>
              </div>
            ) : (
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={shouldReduceMotion ? undefined : missionListVariants}
              >
                {data.missions.map((mission: TeamMission, idx: number) => {
                  const isExpanded = expandedMission === mission.missionTeamId;
                  const missionTypeBadge = getTeamTypeBadge(
                    mission.missionType,
                    getMetadataValue(
                      rescueTeamTypeOptions,
                      mission.missionType,
                    ),
                  );
                  const statusConfig =
                    mission.missionStatus === "Completed"
                      ? {
                          label: "Hoàn thành",
                          className:
                            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                          dot: "bg-emerald-500",
                        }
                      : mission.missionStatus === "InProgress"
                        ? {
                            label: "Đang thực hiện",
                            className:
                              "bg-blue-500/10 text-blue-700 dark:text-blue-400",
                            dot: "bg-blue-500",
                          }
                        : {
                            label: mission.missionStatus,
                            className:
                              "bg-rose-500/10 text-rose-700 dark:text-rose-400",
                            dot: "bg-rose-500",
                          };
                  return (
                    <motion.div
                      key={mission.missionTeamId}
                      layout={!shouldReduceMotion}
                      variants={
                        shouldReduceMotion ? undefined : missionRowVariants
                      }
                      custom={idx}
                      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow dark:bg-card ${isExpanded ? "border-primary/30 shadow-md" : "border-border/50 hover:shadow-md"}`}
                    >
                      <button
                        onClick={() =>
                          setExpandedMission((prev) =>
                            prev === mission.missionTeamId
                              ? null
                              : mission.missionTeamId,
                          )
                        }
                        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/30"
                      >
                        <motion.div
                          className="text-muted-foreground"
                          animate={
                            shouldReduceMotion
                              ? undefined
                              : { rotate: isExpanded ? 90 : 0 }
                          }
                          transition={{ duration: 0.18, ease: "easeOut" }}
                        >
                          <CaretRight size={15} />
                        </motion.div>

                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2">
                          <span className="text-sm font-semibold tracking-tighter text-foreground">
                            #{mission.missionId}
                          </span>
                          <Badge
                            className={`whitespace-nowrap px-2 py-0.5 text-[13px] font-medium tracking-tighter ${missionTypeBadge.className}`}
                          >
                            {missionTypeBadge.label}
                          </Badge>
                          <Badge
                            className={`whitespace-nowrap text-xs tracking-tighter ${statusConfig.className}`}
                          >
                            <span
                              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}
                            />
                            {statusConfig.label}
                          </Badge>
                          {mission.reportStatus && (
                            <Badge
                              variant="outline"
                              className="whitespace-nowrap text-xs font-normal tracking-tighter text-muted-foreground"
                            >
                              Báo cáo: {mission.reportStatus}
                            </Badge>
                          )}
                        </div>

                        <div className="hidden shrink-0 text-right text-xs tracking-tighter text-muted-foreground sm:block">
                          <div>
                            {new Date(mission.assignedAt).toLocaleString(
                              "vi-VN",
                            )}
                          </div>
                          {mission.missionCompletedAt && (
                            <div className="mt-0.5 tracking-tighter text-emerald-600">
                              ✓{" "}
                              {new Date(
                                mission.missionCompletedAt,
                              ).toLocaleString("vi-VN")}
                            </div>
                          )}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.24, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border/40 bg-slate-50/80 dark:bg-muted/15">
                              <div className="flex border-b border-border/40">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMissionTab((prev) => ({
                                      ...prev,
                                      [mission.missionTeamId]: "activities",
                                    }));
                                  }}
                                  className={`relative flex-1 px-4 py-2.5 text-sm font-medium tracking-tighter transition-colors ${
                                    (missionTab[mission.missionTeamId] ??
                                      "activities") === "activities"
                                      ? "text-primary"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  Chi tiết hoạt động
                                  {(missionTab[mission.missionTeamId] ??
                                    "activities") === "activities" && (
                                    <motion.span
                                      layoutId={`mission-tab-underline-${mission.missionTeamId}`}
                                      className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-primary"
                                      transition={{
                                        type: "spring",
                                        stiffness: 420,
                                        damping: 34,
                                      }}
                                    />
                                  )}
                                </button>
                                {mission.reportStatus && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMissionTab((prev) => ({
                                        ...prev,
                                        [mission.missionTeamId]: "report",
                                      }));
                                    }}
                                    className={`relative flex-1 px-4 py-2.5 text-sm font-medium tracking-tighter transition-colors ${
                                      missionTab[mission.missionTeamId] ===
                                      "report"
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    Xem báo cáo
                                    {missionTab[mission.missionTeamId] ===
                                      "report" && (
                                      <motion.span
                                        layoutId={`mission-tab-underline-${mission.missionTeamId}`}
                                        className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-primary"
                                        transition={{
                                          type: "spring",
                                          stiffness: 420,
                                          damping: 34,
                                        }}
                                      />
                                    )}
                                  </button>
                                )}
                              </div>

                              <div className="px-5 py-4">
                                <AnimatePresence mode="wait" initial={false}>
                                  {(missionTab[mission.missionTeamId] ??
                                    "activities") === "activities" ? (
                                    <motion.div
                                      key="activities"
                                      variants={
                                        shouldReduceMotion
                                          ? undefined
                                          : tabPanelVariants
                                      }
                                      initial="hidden"
                                      animate="visible"
                                      exit="exit"
                                    >
                                      {mission.activities.length > 0 ? (
                                        <motion.div
                                          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                                          variants={
                                            shouldReduceMotion
                                              ? undefined
                                              : activityGridVariants
                                          }
                                          initial="hidden"
                                          animate="visible"
                                        >
                                          {mission.activities.map(
                                            (
                                              act: MissionActivity,
                                              actIdx: number,
                                            ) => {
                                              const stepColors = [
                                                {
                                                  border: "border-l-blue-500",
                                                  bg: "bg-blue-500/10",
                                                  text: "text-blue-600",
                                                },
                                                {
                                                  border: "border-l-violet-500",
                                                  bg: "bg-violet-500/10",
                                                  text: "text-violet-600",
                                                },
                                                {
                                                  border: "border-l-amber-500",
                                                  bg: "bg-amber-500/10",
                                                  text: "text-amber-600",
                                                },
                                                {
                                                  border: "border-l-rose-500",
                                                  bg: "bg-rose-500/10",
                                                  text: "text-rose-600",
                                                },
                                                {
                                                  border:
                                                    "border-l-emerald-500",
                                                  bg: "bg-emerald-500/10",
                                                  text: "text-emerald-600",
                                                },
                                                {
                                                  border: "border-l-cyan-500",
                                                  bg: "bg-cyan-500/10",
                                                  text: "text-cyan-600",
                                                },
                                                {
                                                  border: "border-l-pink-500",
                                                  bg: "bg-pink-500/10",
                                                  text: "text-pink-600",
                                                },
                                              ];
                                              const color =
                                                stepColors[
                                                  actIdx % stepColors.length
                                                ];
                                              const activityStatusBadge =
                                                getActivityStatusBadge(
                                                  act.status,
                                                  getActivityStatusLabel(
                                                    activityStatusOptions,
                                                    act.status,
                                                  ),
                                                );
                                              return (
                                                <motion.div
                                                  key={act.id}
                                                  variants={
                                                    shouldReduceMotion
                                                      ? undefined
                                                      : activityCardVariants
                                                  }
                                                  className={`rounded-xl border border-border/40 border-l-[3px] ${color.border} bg-white px-3.5 py-3 dark:bg-card`}
                                                >
                                                  <div className="flex items-center gap-2.5 mb-2">
                                                    <span
                                                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color.bg} text-xs font-bold ${color.text}`}
                                                    >
                                                      {act.step}
                                                    </span>
                                                    <span className="text-sm font-medium tracking-tighter text-foreground">
                                                      {activityTypeConfig[
                                                        act.activityType
                                                      ]?.label ??
                                                        act.activityType}
                                                    </span>
                                                    <Badge
                                                      className={`ml-auto text-[13px] font-semibold tracking-tighter ${activityStatusBadge.className}`}
                                                    >
                                                      {
                                                        activityStatusBadge.label
                                                      }
                                                    </Badge>
                                                  </div>
                                                  <p className="text-sm leading-relaxed tracking-tighter text-muted-foreground">
                                                    {act.description}
                                                  </p>
                                                </motion.div>
                                              );
                                            },
                                          )}
                                        </motion.div>
                                      ) : (
                                        <p className="py-2 text-center text-sm tracking-tighter text-muted-foreground">
                                          Chưa có hoạt động nào cho nhiệm vụ này
                                        </p>
                                      )}
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      key="report"
                                      variants={
                                        shouldReduceMotion
                                          ? undefined
                                          : tabPanelVariants
                                      }
                                      initial="hidden"
                                      animate="visible"
                                      exit="exit"
                                    >
                                      <MissionTeamReportInline
                                        missionId={mission.missionId}
                                        missionTeamId={mission.missionTeamId}
                                      />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export { TeamDetailPanel, getStatusBadge };
export type { TeamDetailPanelProps };
