"use client";

import { useState } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
} from "chart.js";
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
import {
  ArrowLeft,
  Star,
  Clock,
  Target,
  Lightning,
  ShieldCheck,
  UsersThree,
  Trophy,
  CalendarBlank,
  SignOut as SignOutIcon,
  SignIn as SignInIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useRescuerScores } from "@/services/admin_dashboard/team-overview.hooks";
import { useRescueTeamTypes } from "@/services/rescue_teams/hooks";
import {
  MissionEvaluation,
  TeamHistoryItem,
} from "@/services/admin_dashboard/team-overview.type";
import { useRescueTeamRealtime } from "@/hooks/useRescueTeamRealtime";

ChartJS.register(ArcElement, ChartTooltip);

interface RescuerScoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rescuerId: string;
  rescuerName?: string;
}

// ─── Circular Progress (Chart.js Doughnut) ─────────────────────────────────

const CRITERION_COLORS: Record<string, string> = {
  "text-blue-500": "#3b82f6",
  "text-emerald-500": "#22c55e",
  "text-amber-500": "#f59e0b",
  "text-red-500": "#ef4444",
  "text-violet-500": "#8b5cf6",
};

const CircularProgress = ({
  value,
  max = 10,
  label,
  color = "text-red-500",
}: {
  value: number;
  max?: number;
  label: string;
  color?: string;
}) => {
  const hex = CRITERION_COLORS[color] ?? "#ef4444";
  const remaining = Math.max(0, max - value);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[84px] h-[84px]">
        <Doughnut
          data={{
            datasets: [
              {
                data: [value, remaining],
                backgroundColor: [hex, "transparent"],
                borderWidth: 0,
                hoverOffset: 0,
              },
            ],
          }}
          options={{
            cutout: "72%",
            animation: { duration: 600 },
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false },
            },
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold tracking-tighter">{value.toFixed(1)}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-center tracking-tighter leading-tight max-w-[84px]">
        {label}
      </span>
    </div>
  );
};

// ─── Score criteria config ──────────────────────────────────────────────────

const CRITERIA = [
  {
    key: "responseTimeScore" as const,
    label: "Thời gian phản hồi",
    icon: Clock,
    color: "text-blue-500",
  },
  {
    key: "rescueEffectivenessScore" as const,
    label: "Hiệu quả cứu hộ",
    icon: Target,
    color: "text-emerald-500",
  },
  {
    key: "decisionHandlingScore" as const,
    label: "Xử lý quyết định",
    icon: Lightning,
    color: "text-amber-500",
  },
  {
    key: "safetyMedicalSkillScore" as const,
    label: "Y tế & An toàn",
    icon: ShieldCheck,
    color: "text-red-500",
  },
  {
    key: "teamworkCommunicationScore" as const,
    label: "Phối hợp nhóm",
    icon: UsersThree,
    color: "text-violet-500",
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────

const RescuerScoreSheet = ({
  open,
  onOpenChange,
  rescuerId,
  rescuerName,
}: RescuerScoreSheetProps) => {
  const { data, isLoading } = useRescuerScores(rescuerId, {
    enabled: open && !!rescuerId,
  });

  useRescueTeamRealtime({
    enabled: open && !!rescuerId,
    rescuerId: open ? rescuerId : null,
  });
  const [expandedEval, setExpandedEval] = useState<number | null>(null);
  const { data: rescueTeamTypeOptions = [] } = useRescueTeamTypes({ enabled: open });

  const fullName = data
    ? `${data.lastName} ${data.firstName}`
    : rescuerName || "Cứu hộ viên";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
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
            <div className="flex items-center gap-3 flex-1">
              {data?.avatarUrl ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={data.avatarUrl} />
                  <AvatarFallback>{fullName.charAt(0)}</AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-linear-to-br from-red-400 to-orange-500 text-white font-semibold">
                    {fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <SheetTitle className="text-lg tracking-tighter">{fullName}</SheetTitle>
                <p className="text-sm text-muted-foreground tracking-tighter">
                  Điểm đánh giá cứu hộ viên
                </p>
              </div>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-6 mt-6 pb-6">
            {/* ── Overall Score ──────────────────────────────────────────── */}
            <Card className="border-border/50">
              <CardHeader className="">
                <CardTitle className="text-base font-semibold tracking-tighter flex items-center gap-2">
                  <Trophy size={24} className="text-amber-500" />
                  Điểm tổng quan
                  <Badge variant="secondary" className="ml-auto text-sm tracking-tighter">
                    {data.overallScore?.evaluationCount || 0} lần đánh giá
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-foreground tracking-tighter">
                      {data.overallScore?.overallAverageScore?.toFixed(2) || "0.00"}
                    </span>
                    <span className="text-base font-medium tracking-tighter text-muted-foreground">
                      / 10.0
                    </span>
                  </div>
                </div>
                <div className="flex justify-between w-full">
                  {CRITERIA.map(({ key, label, color }) => (
                    <div
                      key={key}
                      className="relative flex flex-col items-center"
                    >
                      <CircularProgress
                        value={data.overallScore?.[key] || 0}
                        label={label}
                        color={color}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Mission Evaluations ────────────────────────────────────── */}
            <Card className="border-border/50 pb-0">
              <CardHeader className="">
                <CardTitle className="text-base font-semibold tracking-tighter flex items-center gap-2">
                  <Star size={24} className="text-amber-500" />
                  Điểm theo từng nhiệm vụ
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {data.missionEvaluations.length === 0 ? (
                  <p className="px-6 py-4 text-center text-sm tracking-tighter text-muted-foreground">
                    Chưa có đánh giá nào
                  </p>
                ) : (
                  <ul className="w-full divide-y divide-border/40 border-t border-border/40">
                    {data.missionEvaluations.map((ev: MissionEvaluation) => (
                      <li
                        key={ev.evaluationId}
                        className="overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setExpandedEval(
                              expandedEval === ev.evaluationId
                                ? null
                                : ev.evaluationId,
                            )
                          }
                          className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                             <span className="text-sm tracking-tighter font-medium">
                              Nhiệm vụ #{ev.missionId}
                            </span>
                            <span className="text-sm tracking-tighter text-muted-foreground">
                              ( Đội {rescueTeamTypeOptions.find((o) => o.key.toLowerCase() === ev.missionType?.toLowerCase())?.value || ev.missionType} )
                            </span> 
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold tracking-tighter">
                              Điểm trung bình: {ev.averageScore.toFixed(1)}
                            </span>
                           
                          
                          </div>
                        </button>
                        {expandedEval === ev.evaluationId && (
                          <div className="px-6 pb-4 border-t border-border/30">
                            <div className="flex justify-between w-full mt-3">
                              {CRITERIA.map(({ key, label, color }) => (
                                <div
                                  key={key}
                                  className="relative flex flex-col items-center"
                                >
                                  <CircularProgress
                                    value={ev[key]}
                                    label={label}
                                    color={color}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* ── Team History ────────────────────────────────────────────── */}
            <Card className="border-border/50 pb-0">
              <CardHeader className="">
                <CardTitle className="text-base font-semibold tracking-tighter flex items-center gap-2">
                  <CalendarBlank size={24} className="text-blue-500" />
                  Lịch sử tham gia đội
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {data.teamHistory.length === 0 ? (
                  <p className="px-6 py-4 text-center text-sm tracking-tighter text-muted-foreground">
                    Chưa tham gia đội nào
                  </p>
                ) : (
                  <ul className="w-full divide-y divide-border/40 border-t border-border/40">
                    {data.teamHistory.map(
                      (th: TeamHistoryItem, idx: number) => (
                        <li
                          key={`${th.teamId}-${idx}`}
                          className="flex w-full items-center gap-3 px-6 py-4"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-semibold tracking-tighter truncate">
                                {th.teamName}
                              </span>
                              <span className="text-sm tracking-tighter text-muted-foreground shrink-0">
                                ( Mã đội: {th.teamCode} )
                              </span>
                              {th.roleInTeam === "Leader" && (
                                <Icon icon="iconoir:bright-crown" width="20" height="20" className="text-amber-500 shrink-0" />
                              )}
                            </div>
                            <div className="flex flex-col gap-1 mt-1.5 text-sm tracking-tighter">
                              <span className="flex items-center gap-1">
                                <SignInIcon size={12} />
                                Ngày tham gia: {new Date(th.joinedAt).toLocaleDateString(
                                  "vi-VN",
                                )}
                              </span>
                              <span className="flex items-center gap-1 text-foreground/60">
                                {th.leftAt ? (
                                  <>
                                    Thời gian rời nhóm:{" "}
                                    <span className="font-medium text-black">
                                      {new Date(th.leftAt).toLocaleDateString("vi-VN")}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    Tình trạng hiện tại:{" "}
                                    <span className="font-medium text-emerald-600">Đang hoạt động</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                          {/* <Badge
                            className={`text-sm tracking-tighter shrink-0 ${th.status === "Accepted"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : th.status === "Removed"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                              }`}
                          >
                            {th.status}
                          </Badge> */}
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

export default RescuerScoreSheet;
