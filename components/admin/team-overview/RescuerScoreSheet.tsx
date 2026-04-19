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
import { useRescuerScores } from "@/services/admin_dashboard/team-overview.hooks";
import {
  MissionEvaluation,
  TeamHistoryItem,
} from "@/services/admin_dashboard/team-overview.type";

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
      <div className="relative w-24 h-24">
        <Doughnut
          data={{
            datasets: [
              {
                data: [value, remaining],
                backgroundColor: [hex, "rgba(128,128,128,0.12)"],
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
          <span className="text-base font-bold">{value.toFixed(1)}</span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground text-center leading-tight max-w-24">
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
  const [expandedEval, setExpandedEval] = useState<number | null>(null);

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
                <SheetTitle className="text-base">{fullName}</SheetTitle>
                <p className="text-sm text-muted-foreground">
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  Điểm tổng quan
                  <Badge variant="secondary" className="ml-auto text-sm">
                    {data.overallScore.evaluationCount} lần đánh giá
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-foreground">
                      {data.overallScore.overallAverageScore.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / 10.0
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {CRITERIA.map(({ key, label, color }) => (
                    <div
                      key={key}
                      className="relative flex flex-col items-center"
                    >
                      <CircularProgress
                        value={data.overallScore[key]}
                        label={label}
                        color={color}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Mission Evaluations ────────────────────────────────────── */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Star size={16} className="text-amber-500" />
                  Điểm theo từng nhiệm vụ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.missionEvaluations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Chưa có đánh giá nào
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.missionEvaluations.map((ev: MissionEvaluation) => (
                      <div
                        key={ev.evaluationId}
                        className="border border-border/40 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setExpandedEval(
                              expandedEval === ev.evaluationId
                                ? null
                                : ev.evaluationId,
                            )
                          }
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm">
                              {ev.missionType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Mission #{ev.missionId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {ev.averageScore.toFixed(1)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(ev.evaluatedAt).toLocaleDateString(
                                "vi-VN",
                              )}
                            </span>
                          </div>
                        </button>
                        {expandedEval === ev.evaluationId && (
                          <div className="px-3 pb-3 border-t border-border/30">
                            <div className="grid grid-cols-5 gap-2 mt-3">
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Team History ────────────────────────────────────────────── */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarBlank size={16} className="text-blue-500" />
                  Lịch sử tham gia đội
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.teamHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Chưa tham gia đội nào
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.teamHistory.map(
                      (th: TeamHistoryItem, idx: number) => (
                        <div
                          key={`${th.teamId}-${idx}`}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {th.teamName}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-sm shrink-0"
                              >
                                {th.teamCode}
                              </Badge>
                              {th.roleInTeam && (
                                <Badge
                                  className={`text-sm shrink-0 ${
                                    th.roleInTeam === "Leader"
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                      : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                  }`}
                                >
                                  {th.roleInTeam}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <SignInIcon size={12} />
                                {new Date(th.joinedAt).toLocaleDateString(
                                  "vi-VN",
                                )}
                              </span>
                              <span className="flex items-center gap-1">
                                <SignOutIcon size={12} />
                                {th.leftAt
                                  ? new Date(th.leftAt).toLocaleDateString(
                                      "vi-VN",
                                    )
                                  : "Đang hoạt động"}
                              </span>
                            </div>
                          </div>
                          <Badge
                            className={`text-sm shrink-0 ${
                              th.status === "Accepted"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : th.status === "Removed"
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                  : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {th.status}
                          </Badge>
                        </div>
                      ),
                    )}
                  </div>
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
