"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  ClipboardText,
  FileText,
  NotePencil,
  SealCheck,
  Star,
  User,
  Warning,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useMissionTeamReport } from "@/services/mission/hooks";
import type {
  MissionActivity,
  MissionEntity,
  MissionTeam,
  MissionTeamReportActivity,
  MissionTeamReportResponse,
} from "@/services/mission/type";
import { cn } from "@/lib/utils";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type ParsedJsonField =
  | { kind: "empty" }
  | { kind: "json"; value: JsonValue }
  | { kind: "text"; text: string };

interface MissionTeamReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission: MissionEntity | null;
  team: MissionTeam | null;
}

export function normalizeMissionReportStatusKey(
  status?: string | null,
): string {
  return (status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");
}

export function getMissionReportStatusMeta(status?: string | null): {
  label: string;
  className: string;
} {
  const normalizedStatus = normalizeMissionReportStatusKey(status);

  if (normalizedStatus === "submitted") {
    return {
      label: "Đã gửi",
      className:
        "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    };
  }

  if (normalizedStatus === "draft") {
    return {
      label: "Nháp",
      className:
        "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    };
  }

  if (!normalizedStatus || normalizedStatus === "notstarted") {
    return {
      label: "Chưa báo cáo",
      className:
        "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
    };
  }

  return {
    label: status || "Chưa rõ",
    className:
      "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  };
}

export function getMissionReportStats(teams: MissionTeam[]): {
  total: number;
  submitted: number;
  draft: number;
  notStarted: number;
} {
  return teams.reduce(
    (stats, team) => {
      const status = normalizeMissionReportStatusKey(team.reportStatus);
      if (status === "submitted") {
        stats.submitted += 1;
      } else if (status === "draft") {
        stats.draft += 1;
      } else {
        stats.notStarted += 1;
      }
      stats.total += 1;
      return stats;
    },
    { total: 0, submitted: 0, draft: 0, notStarted: 0 },
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function parseJsonField(value?: string | null): ParsedJsonField {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return { kind: "empty" };

  try {
    return { kind: "json", value: JSON.parse(trimmed) as JsonValue };
  } catch {
    return { kind: "text", text: trimmed };
  }
}

function isJsonRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function formatJsonScalar(value: string | number | boolean | null): string {
  if (value == null) return "-";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return String(value);
}

function JsonValueView({ value }: { value: JsonValue }) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-muted-foreground">Không có dữ liệu</p>;
    }

    return (
      <div className="space-y-1.5">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-md border border-border/70 bg-background px-2 py-1.5"
          >
            <JsonValueView value={item} />
          </div>
        ))}
      </div>
    );
  }

  if (isJsonRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <p className="text-sm text-muted-foreground">Không có dữ liệu</p>;
    }

    return (
      <div className="grid gap-1.5 sm:grid-cols-2">
        {entries.map(([key, item]) => (
          <div
            key={key}
            className="rounded-md border border-border/70 bg-background px-2 py-1.5"
          >
            <p className="text-sm font-semibold uppercase text-muted-foreground">
              {key}
            </p>
            <div className="mt-1 text-base font-medium text-foreground/85">
              <JsonValueView value={item} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85">
      {formatJsonScalar(value)}
    </p>
  );
}

function JsonSection({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  const parsed = parseJsonField(value);
  if (parsed.kind === "empty") return null;

  return (
    <section className="space-y-2">
      <SectionTitle icon={<FileText className="h-4 w-4" />} title={title} />
      <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
        {parsed.kind === "text" ? (
          <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85">
            {parsed.text}
          </p>
        ) : (
          <JsonValueView value={parsed.value} />
        )}
      </div>
    </section>
  );
}

function TextSection({
  title,
  value,
  icon,
}: {
  title: string;
  value?: string | null;
  icon: ReactNode;
}) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  return (
    <section className="space-y-2">
      <SectionTitle icon={icon} title={title} />
      <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85">
          {trimmed}
        </p>
      </div>
    </section>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <h3 className="flex items-center gap-2 text-base font-bold uppercase tracking-wider text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {title}
    </h3>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
      <p className="text-sm font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function hasReportContent(report: MissionTeamReportResponse): boolean {
  return Boolean(
    report.teamSummary?.trim() ||
      report.teamNote?.trim() ||
      report.issuesJson?.trim() ||
      report.resultJson?.trim() ||
      report.evidenceJson?.trim() ||
      report.activities.some(
        (activity) =>
          activity.summary?.trim() ||
          activity.issuesJson?.trim() ||
          activity.resultJson?.trim() ||
          activity.evidenceJson?.trim(),
      ) ||
      report.memberEvaluations.some(
        (member) =>
          member.responseTimeScore != null ||
          member.rescueEffectivenessScore != null ||
          member.decisionHandlingScore != null ||
          member.safetyMedicalSkillScore != null ||
          member.teamworkCommunicationScore != null ||
          member.overallScore != null,
      ),
  );
}

function getActivityLabel(
  reportActivity: MissionTeamReportActivity,
  activity?: MissionActivity,
): string {
  const stepLabel =
    typeof activity?.step === "number" ? `Bước ${activity.step}` : "Hoạt động";
  const type = reportActivity.activityType || activity?.activityType;
  return type ? `${stepLabel} - ${type}` : stepLabel;
}

function ActivityReportList({
  activities,
  activityById,
}: {
  activities: MissionTeamReportActivity[];
  activityById: Map<number, MissionActivity>;
}) {
  if (activities.length === 0) return null;

  return (
    <section className="space-y-2">
      <SectionTitle
        icon={<ClipboardText className="h-4 w-4" />}
        title="Báo cáo theo hoạt động"
      />
      <div className="space-y-2">
        {activities.map((activity) => {
          const sourceActivity = activityById.get(activity.missionActivityId);
          const statusMeta = getMissionReportStatusMeta(
            activity.executionStatus || activity.activityStatus,
          );

          return (
            <div
              key={activity.missionActivityId}
              className="rounded-lg border border-border/70 bg-background p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground">
                    {getActivityLabel(activity, sourceActivity)}
                  </p>
                  {sourceActivity?.description ? (
                    <p className="mt-1 line-clamp-2 text-base text-muted-foreground">
                      {sourceActivity.description}
                    </p>
                  ) : null}
                </div>
                <Badge
                  variant="outline"
                  className={cn("shrink-0 text-base py-1 px-3", statusMeta.className)}
                >
                  {activity.executionStatus ||
                    activity.activityStatus ||
                    "Chưa rõ"}
                </Badge>
              </div>
              <TextSection
                title="Tóm tắt"
                value={activity.summary}
                icon={<NotePencil className="h-4 w-4" />}
              />
              <div className="mt-3 space-y-3">
                <JsonSection title="Vấn đề" value={activity.issuesJson} />
                <JsonSection title="Kết quả" value={activity.resultJson} />
                <JsonSection title="Bằng chứng" value={activity.evidenceJson} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatScore(value: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toFixed(1);
}

function MemberEvaluationList({
  report,
}: {
  report: MissionTeamReportResponse;
}) {
  if (report.memberEvaluations.length === 0) return null;

  return (
    <section className="space-y-2">
      <SectionTitle icon={<Star className="h-4 w-4" />} title="Đánh giá đội" />
      <div className="space-y-2">
        {report.memberEvaluations.map((member) => (
          <div
            key={member.rescuerId}
            className="rounded-lg border border-border/70 bg-background p-3"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.avatarUrl ?? undefined} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-foreground">
                  {member.fullName || member.username || "Thành viên"}
                </p>
                <p className="text-base text-muted-foreground">
                  {[member.roleInTeam, member.rescuerType, member.phone]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
              <Badge variant="outline" className="text-base py-1 px-3">
                Tổng: {formatScore(member.overallScore)}
              </Badge>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <InfoTile
                label="Phản hồi"
                value={formatScore(member.responseTimeScore)}
              />
              <InfoTile
                label="Hiệu quả cứu hộ"
                value={formatScore(member.rescueEffectivenessScore)}
              />
              <InfoTile
                label="Xử lý quyết định"
                value={formatScore(member.decisionHandlingScore)}
              />
              <InfoTile
                label="An toàn / y tế"
                value={formatScore(member.safetyMedicalSkillScore)}
              />
              <InfoTile
                label="Phối hợp"
                value={formatScore(member.teamworkCommunicationScore)}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function MissionTeamReportSheet({
  open,
  onOpenChange,
  mission,
  team,
}: MissionTeamReportSheetProps) {
  const missionId = mission?.id ?? null;
  const missionTeamId = team?.missionTeamId ?? null;
  const { data, isError, isLoading } = useMissionTeamReport(
    missionId,
    missionTeamId,
    { enabled: open && missionId != null && missionTeamId != null },
  );

  const activityById = useMemo(() => {
    const map = new Map<number, MissionActivity>();
    for (const activity of mission?.activities ?? []) {
      map.set(activity.id, activity);
    }
    return map;
  }, [mission?.activities]);

  const reportStatus = data?.reportStatus ?? team?.reportStatus;
  const statusMeta = getMissionReportStatusMeta(reportStatus);
  const teamName = team?.teamName || `Đội #${team?.rescueTeamId ?? "-"}`;
  const canShowContent = data ? hasReportContent(data) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-3xl">
        <SheetHeader className="border-b px-5 py-4 pr-12 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-2xl font-black tracking-tight">
                Báo cáo {teamName}
              </SheetTitle>
              <SheetDescription className="mt-1 text-base">
                Mission #{mission?.id ?? "-"}
                {team?.teamCode ? ` • ${team.teamCode}` : ""}
              </SheetDescription>
            </div>
            <Badge
              variant="outline"
              className={cn("mt-1 shrink-0 text-sm", statusMeta.className)}
            >
              {statusMeta.label}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 px-5 py-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : isError ? (
              <Card className="border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/20">
                <CardContent className="flex items-start gap-3 p-4">
                  <Warning className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-semibold text-rose-900 dark:text-rose-200">
                      Không tải được báo cáo
                    </p>
                    <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
                      Vui lòng thử làm mới lại danh sách nhiệm vụ.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : data ? (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <InfoTile label="Trạng thái đội" value={data.executionStatus || "-"} />
                  <InfoTile
                    label="Lần chỉnh sửa"
                    value={formatDateTime(data.lastEditedAt)}
                  />
                  <InfoTile
                    label="Thời gian gửi"
                    value={formatDateTime(data.submittedAt)}
                  />
                </div>

                {!canShowContent ? (
                  <div className="rounded-xl border-2 border-dashed border-border/70 py-10 text-center">
                    <SealCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 font-semibold text-foreground">
                      Team chưa gửi nội dung báo cáo
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Khi team lưu nháp hoặc gửi báo cáo, nội dung sẽ xuất hiện
                      tại đây.
                    </p>
                  </div>
                ) : (
                  <>
                    <TextSection
                      title="Tóm tắt đội"
                      value={data.teamSummary}
                      icon={<NotePencil className="h-4 w-4" />}
                    />
                    <TextSection
                      title="Ghi chú"
                      value={data.teamNote}
                      icon={<ClipboardText className="h-4 w-4" />}
                    />
                    <JsonSection title="Kết quả" value={data.resultJson} />
                    <JsonSection title="Vấn đề" value={data.issuesJson} />
                    <JsonSection title="Bằng chứng" value={data.evidenceJson} />

                    <Separator />
                    <ActivityReportList
                      activities={data.activities}
                      activityById={activityById}
                    />
                    <MemberEvaluationList report={data} />
                  </>
                )}
              </>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
