"use client";

import { SealCheck, Warning } from "@phosphor-icons/react";
import { Icon } from "@iconify/react";
import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRescuerTypeMetadata } from "@/services/user/hooks";
import {
  useMissionActivityStatuses,
  useMissionTeamReport,
} from "@/services/mission/hooks";
import type {
  MissionTeamReportActivity,
  MissionTeamReportResponse,
} from "@/services/mission/type";
import { cn } from "@/lib/utils";
import { activityTypeConfig } from "@/lib/constants";

interface Props {
  missionId: number;
  missionTeamId: number;
}

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

const reportContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
};

const reportItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
};

const reportCardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: "easeOut" },
  },
};

function normalizeKey(status?: string | null): string {
  return (status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "")
    .replaceAll(" ", "");
}
type MetadataOption = { key: string; value: string };

function normalizeActivityStatusKey(status?: string | null): string {
  const normalized = normalizeKey(status);

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
function fmtDt(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}
function parseJson(v?: string | null): ParsedJsonField {
  const t = typeof v === "string" ? v.trim() : "";
  if (!t) return { kind: "empty" };
  try {
    return { kind: "json", value: JSON.parse(t) };
  } catch {
    return { kind: "text", text: t };
  }
}
function isRec(v: JsonValue): v is { [k: string]: JsonValue } {
  return v != null && typeof v === "object" && !Array.isArray(v);
}
function fmtScalar(v: string | number | boolean | null) {
  if (v == null) return "-";
  if (typeof v === "boolean") return v ? "Có" : "Không";
  return String(v);
}
function isJsonValueEmpty(value: JsonValue): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (typeof value === "number" || typeof value === "boolean") return false;
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isJsonValueEmpty);
  }

  const entries = Object.values(value);
  return entries.length === 0 || entries.every(isJsonValueEmpty);
}
function hasParsedJsonContent(value?: string | null): boolean {
  const parsed = parseJson(value);
  if (parsed.kind === "empty") return false;
  if (parsed.kind === "text") return parsed.text.trim().length > 0;
  return !isJsonValueEmpty(parsed.value);
}
function hasContent(r: MissionTeamReportResponse) {
  return Boolean(
    r.teamSummary?.trim() ||
    r.teamNote?.trim() ||
    hasParsedJsonContent(r.issuesJson) ||
    hasParsedJsonContent(r.resultJson) ||
    hasParsedJsonContent(r.evidenceJson) ||
    r.activities.some(
      (a) =>
        a.summary?.trim() ||
        hasParsedJsonContent(a.issuesJson) ||
        hasParsedJsonContent(a.resultJson) ||
        hasParsedJsonContent(a.evidenceJson),
    ) ||
    r.memberEvaluations.some(
      (m) =>
        m.responseTimeScore != null ||
        m.rescueEffectivenessScore != null ||
        m.decisionHandlingScore != null ||
        m.safetyMedicalSkillScore != null ||
        m.teamworkCommunicationScore != null ||
        m.overallScore != null,
    ),
  );
}
function fmtScore(v: number | null) {
  return typeof v === "number" && !Number.isNaN(v) ? v.toFixed(1) : "-";
}
function getInitials(name?: string | null, username?: string | null) {
  const source = name?.trim() || username?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
function getRescuerTypeBadge(type?: string | null, label?: string) {
  const normalizedType = normalizeKey(type);

  if (normalizedType === "core") {
    return {
      label: label ?? "Nhân sự nòng cốt",
      className:
        "bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-950/5",
    };
  }

  if (normalizedType === "volunteer") {
    return {
      label: label ?? "Tình nguyện viên",
      className: "bg-violet-50 text-violet-500 shadow-sm shadow-violet-950/5",
    };
  }

  return {
    label: label ?? type ?? "Chưa rõ",
    className: "bg-slate-100 text-slate-700 shadow-sm shadow-slate-950/10",
  };
}

/* ─── Radial Score ─── */
function RadialScore({
  score,
  color,
  label,
}: {
  score: number | null;
  color: string;
  label: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const val = typeof score === "number" && !Number.isNaN(score) ? score : 0;
  const r = 36,
    c = 2 * Math.PI * r,
    prog = (val / 10) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-24 w-24">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={r}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={c}
            initial={shouldReduceMotion ? false : { strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - prog }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-foreground tracking-tighter">
            {val.toFixed(1)}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground text-center tracking-tighter leading-tight">
        {label}
      </span>
    </div>
  );
}

/* ─── Subcomponents ─── */
function SectionTitle({
  title,
  size = "sm",
  icon,
}: {
  title: string;
  size?: "sm" | "lg";
  icon?: ReactNode;
}) {
  return (
    <h4
      className={cn(
        "flex items-center gap-2 font-medium tracking-tighter text-foreground/80",
        size === "lg" ? "text-xl" : "text-sm",
      )}
    >
      {icon}
      {title}
    </h4>
  );
}
function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2">
      <p className="text-[13px] font-medium tracking-tighter text-foreground/70">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tracking-tighter">{value}</p>
    </div>
  );
}
function JsonView({ value }: { value: JsonValue }) {
  if (Array.isArray(value)) {
    if (value.length === 0)
      return (
        <p className="text-sm tracking-tighter text-muted-foreground">
          Không có dữ liệu
        </p>
      );
    return (
      <div className="space-y-1.5">
        {value.map((it, i) => (
          <div
            key={i}
            className="rounded-md border border-border/70 bg-background px-2 py-1.5"
          >
            <JsonView value={it} />
          </div>
        ))}
      </div>
    );
  }
  if (isRec(value)) {
    const e = Object.entries(value);
    if (e.length === 0)
      return (
        <p className="text-sm tracking-tighter text-muted-foreground">
          Không có dữ liệu
        </p>
      );
    return (
      <div className="grid gap-1.5 sm:grid-cols-2">
        {e.map(([k, v]) => (
          <div
            key={k}
            className="rounded-md border border-border/70 bg-background px-2 py-1.5"
          >
            <p className="text-sm font-semibold uppercase text-muted-foreground tracking-tighter">
              {k}
            </p>
            <div className="mt-1 text-base font-medium text-foreground/85">
              <JsonView value={v} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85 tracking-tighter">
      {fmtScalar(value)}
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
  const p = parseJson(value);
  if (p.kind === "empty") return null;
  if (p.kind === "json" && isJsonValueEmpty(p.value)) return null;
  return (
    <section className="space-y-2">
      <SectionTitle title={title} />
      <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
        {p.kind === "text" ? (
          <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85 tracking-tighter">
            {p.text}
          </p>
        ) : (
          <JsonView value={p.value} />
        )}
      </div>
    </section>
  );
}
function TextSection({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  const t = value?.trim();
  if (!t) return null;
  return (
    <section className="space-y-2">
      <SectionTitle title={title} />
      <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85 tracking-tighter">
          {t}
        </p>
      </div>
    </section>
  );
}
const ACTIVITY_COLORS = [
  { bg: "bg-blue-500/10", text: "text-blue-600" },
  {
    bg: "bg-violet-500/10",
    text: "text-violet-600",
  },
  {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
  },
  { bg: "bg-rose-500/10", text: "text-rose-600" },
  {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
  },
  { bg: "bg-cyan-500/10", text: "text-cyan-600" },
  { bg: "bg-pink-500/10", text: "text-pink-600" },
];

function ActivityList({
  activities,
}: {
  activities: MissionTeamReportActivity[];
}) {
  const shouldReduceMotion = useReducedMotion();
  const { data: activityStatusOptions = [] } = useMissionActivityStatuses({
    enabled: activities.length > 0,
  });
  if (activities.length === 0) return null;
  return (
    <motion.section
      className="space-y-3"
      variants={shouldReduceMotion ? undefined : reportItemVariants}
    >
      <SectionTitle
        title="Báo cáo theo hoạt động"
        size="lg"
        icon={
          <Icon
            icon="carbon:report"
            width="24"
            height="24"
            className="text-primary"
          />
        }
      />
      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        variants={shouldReduceMotion ? undefined : reportContainerVariants}
      >
        {activities.map((a, idx) => {
          const status = a.executionStatus || a.activityStatus;
          const statusBadge = getActivityStatusBadge(
            status,
            getActivityStatusLabel(activityStatusOptions, status),
          );
          const color = ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length];
          return (
            <motion.div
              key={a.missionActivityId}
              variants={shouldReduceMotion ? undefined : reportCardVariants}
              className="rounded-xl border border-border/50 bg-background p-3"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${color.bg} text-xs font-bold ${color.text}`}
                  >
                    {idx + 1}
                  </span>
                  <p className="text-sm font-bold text-foreground tracking-tighter truncate">
                    {activityTypeConfig[a.activityType ?? ""]?.label ??
                      a.activityType ??
                      "Hoạt động"}
                  </p>
                </div>
                <Badge
                  className={cn(
                    "shrink-0 px-2 py-0.5 text-[13px] font-semibold tracking-tighter",
                    statusBadge.className,
                  )}
                >
                  {statusBadge.label}
                </Badge>
              </div>
              <div className="space-y-2">
                <TextSection title="Tóm tắt" value={a.summary} />
                <JsonSection title="Vấn đề" value={a.issuesJson} />
                <JsonSection title="Kết quả" value={a.resultJson} />
                <JsonSection title="Bằng chứng" value={a.evidenceJson} />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.section>
  );
}
function MemberEvaluations({ report }: { report: MissionTeamReportResponse }) {
  const shouldReduceMotion = useReducedMotion();
  const { data: rescuerTypeMetadata = [] } = useRescuerTypeMetadata({
    enabled: report.memberEvaluations.length > 0,
  });
  const getRescuerTypeLabel = (type?: string | null) =>
    rescuerTypeMetadata.find(
      (option) => normalizeKey(option.key) === normalizeKey(type),
    )?.value;

  if (report.memberEvaluations.length === 0) return null;
  return (
    <motion.section
      className="space-y-2"
      variants={shouldReduceMotion ? undefined : reportItemVariants}
    >
      <SectionTitle
        title="Đánh giá đội"
        size="lg"
        icon={
          <Icon
            icon="fluent-emoji-high-contrast:rescue-workers-helmet"
            width="24"
            height="24"
            className="text-primary"
          />
        }
      />
      <motion.div
        className="grid grid-cols-1 gap-3 xl:grid-cols-2"
        variants={shouldReduceMotion ? undefined : reportContainerVariants}
      >
        {report.memberEvaluations.map((m) => {
          const typeBadge = getRescuerTypeBadge(
            m.rescuerType,
            getRescuerTypeLabel(m.rescuerType),
          );

          return (
            <motion.div
              key={m.rescuerId}
              variants={shouldReduceMotion ? undefined : reportCardVariants}
              className="rounded-xl border border-border/50 bg-background p-4"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-11 w-11 shrink-0 border border-border/50">
                    {m.avatarUrl ? (
                      <AvatarImage
                        src={m.avatarUrl}
                        alt={m.fullName || m.username || "Thành viên"}
                      />
                    ) : null}
                    <AvatarFallback className="bg-linear-to-br from-red-400 to-orange-500 text-sm font-semibold text-white">
                      {getInitials(m.fullName, m.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-base font-bold tracking-tighter text-foreground">
                        {m.fullName || m.username || "Thành viên"}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs tracking-tighter text-muted-foreground">
                      {[m.roleInTeam, m.phone].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.rescuerType && (
                    <span
                      className={`shrink-0 rounded-md px-2.5 py-1 text-[13px] font-medium tracking-tighter ${typeBadge.className}`}
                    >
                      {typeBadge.label}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className="shrink-0 px-2 py-1 text-sm tracking-tighter"
                  >
                    Tổng: {fmtScore(m.overallScore)}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <RadialScore
                  score={m.responseTimeScore}
                  color="#60A5FA"
                  label="Thời gian phản hồi"
                />
                <RadialScore
                  score={m.rescueEffectivenessScore}
                  color="#4ADE80"
                  label="Hiệu quả cứu hộ"
                />
                <RadialScore
                  score={m.decisionHandlingScore}
                  color="#FBBF24"
                  label="Xử lý quyết định"
                />
                <RadialScore
                  score={m.safetyMedicalSkillScore}
                  color="#F87171"
                  label="Y tế & An toàn"
                />
                <RadialScore
                  score={m.teamworkCommunicationScore}
                  color="#A78BFA"
                  label="Phối hợp nhóm"
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.section>
  );
}

/* ─── Main ─── */
export default function MissionTeamReportInline({
  missionId,
  missionTeamId,
}: Props) {
  const shouldReduceMotion = useReducedMotion();
  const { data, isError, isLoading } = useMissionTeamReport(
    missionId,
    missionTeamId,
    { enabled: missionId > 0 && missionTeamId > 0 },
  );
  if (isLoading)
    return (
      <div className="space-y-3 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  if (isError)
    return (
      <Card className="border-rose-200 bg-rose-50/80">
        <CardContent className="flex items-start gap-3 p-4">
          <Warning className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold text-rose-900 tracking-tighter">
              Không tải được báo cáo
            </p>
            <p className="mt-1 text-sm text-rose-700 tracking-tighter">
              Vui lòng thử làm mới lại.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  if (!data) return null;
  if (!hasContent(data))
    return (
      <div className="rounded-xl border-2 border-dashed border-border/50 py-8 text-center">
        <SealCheck className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 font-semibold text-foreground tracking-tighter">
          Đội chưa gửi nội dung báo cáo
        </p>
        <p className="mt-1 text-sm text-muted-foreground tracking-tighter">
          Khi đội lưu nháp hoặc gửi, nội dung sẽ hiện tại đây.
        </p>
      </div>
    );
  return (
    <motion.div
      className="space-y-4 py-2"
      initial="hidden"
      animate="visible"
      variants={shouldReduceMotion ? undefined : reportContainerVariants}
    >
      <motion.div
        className="grid gap-2 grid-cols-3 sm:grid-cols-6"
        variants={shouldReduceMotion ? undefined : reportItemVariants}
      >
        <InfoTile
          label="Trạng thái thực hiện"
          value={data.executionStatus || "-"}
        />
        <InfoTile label="Bắt đầu" value={fmtDt(data.startedAt)} />
        <InfoTile label="Chỉnh sửa cuối" value={fmtDt(data.lastEditedAt)} />
        <InfoTile label="Gửi lúc" value={fmtDt(data.submittedAt)} />
        <InfoTile
          label="Có thể chỉnh sửa"
          value={data.canEdit ? "Có" : "Không"}
        />
        <InfoTile
          label="Có thể đánh giá"
          value={data.canEvaluateMembers ? "Có" : "Không"}
        />
      </motion.div>
      <TextSection title="Tóm tắt đội" value={data.teamSummary} />
      <TextSection title="Ghi chú" value={data.teamNote} />
      <div className="grid grid-cols-3 gap-2">
        <JsonSection title="Kết quả" value={data.resultJson} />
        <JsonSection title="Vấn đề" value={data.issuesJson} />
        <JsonSection title="Bằng chứng" value={data.evidenceJson} />
      </div>
      <div className="border-t border-border/40 my-2" />
      <ActivityList activities={data.activities} />
      <MemberEvaluations report={data} />
    </motion.div>
  );
}
