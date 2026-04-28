"use client";

import type { ReactNode } from "react";
import {
  ClipboardText,
  FileText,
  NotePencil,
  SealCheck,
  Warning,
  Star,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMissionTeamReport } from "@/services/mission/hooks";
import type {
  MissionTeamReportActivity,
  MissionTeamReportResponse,
} from "@/services/mission/type";
import { cn } from "@/lib/utils";

interface Props { missionId: number; missionTeamId: number; }

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type ParsedJsonField = { kind: "empty" } | { kind: "json"; value: JsonValue } | { kind: "text"; text: string };

function normalizeKey(status?: string | null): string {
  return (status ?? "").trim().toLowerCase().replaceAll("_", "").replaceAll(" ", "");
}
function statusMeta(status?: string | null) {
  const n = normalizeKey(status);
  if (n === "submitted") return { label: "Đã gửi", className: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" };
  if (n === "draft") return { label: "Nháp", className: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300" };
  if (!n || n === "notstarted") return { label: "Chưa báo cáo", className: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300" };
  return { label: status || "Chưa rõ", className: "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200" };
}
function fmtDt(v?: string | null) {
  if (!v) return "-"; const d = new Date(v); return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("vi-VN", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit", year:"numeric" });
}
function parseJson(v?: string | null): ParsedJsonField {
  const t = typeof v === "string" ? v.trim() : ""; if (!t) return { kind: "empty" }; try { return { kind: "json", value: JSON.parse(t) }; } catch { return { kind: "text", text: t }; }
}
function isRec(v: JsonValue): v is { [k: string]: JsonValue } { return v != null && typeof v === "object" && !Array.isArray(v); }
function fmtScalar(v: string | number | boolean | null) { if (v == null) return "-"; if (typeof v === "boolean") return v ? "Có" : "Không"; return String(v); }
function hasContent(r: MissionTeamReportResponse) {
  return Boolean(r.teamSummary?.trim() || r.teamNote?.trim() || r.issuesJson?.trim() || r.resultJson?.trim() || r.evidenceJson?.trim() || r.activities.some(a => a.summary?.trim() || a.issuesJson?.trim() || a.resultJson?.trim() || a.evidenceJson?.trim()) || r.memberEvaluations.some(m => m.responseTimeScore != null || m.rescueEffectivenessScore != null || m.decisionHandlingScore != null || m.safetyMedicalSkillScore != null || m.teamworkCommunicationScore != null || m.overallScore != null));
}
function fmtScore(v: number | null) { return typeof v === "number" && !Number.isNaN(v) ? v.toFixed(1) : "-"; }

/* ─── Radial Score ─── */
function RadialScore({ score, color, label }: { score: number | null; color: string; label: string }) {
  const val = typeof score === "number" && !Number.isNaN(score) ? score : 0;
  const r = 36, c = 2 * Math.PI * r, prog = (val / 10) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-24 w-24">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} stroke="#e5e7eb" strokeWidth="8" fill="none" />
          <circle cx="50" cy="50" r={r} stroke={color} strokeWidth="8" fill="none" strokeDasharray={c} strokeDashoffset={c - prog} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-foreground tracking-tighter">{val.toFixed(1)}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground text-center tracking-tighter leading-tight">{label}</span>
    </div>
  );
}

/* ─── Subcomponents ─── */
function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter text-muted-foreground"><span className="text-red-500">{icon}</span>{title}</h4>;
}
function InfoTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/50 bg-background px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-tighter text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold text-foreground tracking-tighter">{value}</p></div>;
}
function JsonView({ value }: { value: JsonValue }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="text-sm text-muted-foreground">Không có dữ liệu</p>;
    return <div className="space-y-1.5">{value.map((it, i) => <div key={i} className="rounded-md border border-border/70 bg-background px-2 py-1.5"><JsonView value={it} /></div>)}</div>;
  }
  if (isRec(value)) {
    const e = Object.entries(value); if (e.length === 0) return <p className="text-sm text-muted-foreground">Không có dữ liệu</p>;
    return <div className="grid gap-1.5 sm:grid-cols-2">{e.map(([k, v]) => <div key={k} className="rounded-md border border-border/70 bg-background px-2 py-1.5"><p className="text-sm font-semibold uppercase text-muted-foreground tracking-tighter">{k}</p><div className="mt-1 text-base font-medium text-foreground/85"><JsonView value={v} /></div></div>)}</div>;
  }
  return <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85 tracking-tighter">{fmtScalar(value)}</p>;
}
function JsonSection({ title, value }: { title: string; value?: string | null }) {
  const p = parseJson(value); if (p.kind === "empty") return null;
  return <section className="space-y-2"><SectionTitle icon={<FileText className="h-4 w-4" />} title={title} /><div className="rounded-lg border border-border/50 bg-muted/20 p-3">{p.kind === "text" ? <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85 tracking-tighter">{p.text}</p> : <JsonView value={p.value} />}</div></section>;
}
function TextSection({ title, value, icon }: { title: string; value?: string | null; icon: ReactNode }) {
  const t = value?.trim(); if (!t) return null;
  return <section className="space-y-2"><SectionTitle icon={icon} title={title} /><div className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85 tracking-tighter">{t}</p></div></section>;
}
function ActivityList({ activities }: { activities: MissionTeamReportActivity[] }) {
  if (activities.length === 0) return null;
  return <section className="space-y-2"><SectionTitle icon={<ClipboardText className="h-4 w-4" />} title="Báo cáo theo hoạt động" /><div className="space-y-2">{activities.map(a => {
    const sm = statusMeta(a.executionStatus || a.activityStatus);
    return <div key={a.missionActivityId} className="rounded-lg border border-border/50 bg-background p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-base font-bold text-foreground tracking-tighter">{a.activityType || "Hoạt động"}</p></div><Badge variant="outline" className={cn("shrink-0 text-xs py-0.5 px-2 tracking-tighter", sm.className)}>{a.executionStatus || a.activityStatus || "Chưa rõ"}</Badge></div><TextSection title="Tóm tắt" value={a.summary} icon={<NotePencil className="h-4 w-4" />} /><div className="mt-2 space-y-2"><JsonSection title="Vấn đề" value={a.issuesJson} /><JsonSection title="Kết quả" value={a.resultJson} /><JsonSection title="Bằng chứng" value={a.evidenceJson} /></div></div>;
  })}</div></section>;
}
function MemberEvaluations({ report }: { report: MissionTeamReportResponse }) {
  if (report.memberEvaluations.length === 0) return null;
  return <section className="space-y-2"><SectionTitle icon={<Star className="h-4 w-4" />} title="Đánh giá đội" /><div className="space-y-3">{report.memberEvaluations.map(m => (
    <div key={m.rescuerId} className="rounded-xl border border-border/50 bg-background p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0"><p className="text-base font-bold text-foreground tracking-tighter">{m.fullName || m.username || "Thành viên"}</p><p className="text-xs text-muted-foreground tracking-tighter">{[m.roleInTeam, m.rescuerType, m.phone].filter(Boolean).join(" • ")}</p></div>
        <Badge variant="outline" className="text-sm py-1 px-2 tracking-tighter">Tổng: {fmtScore(m.overallScore)}</Badge>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        <RadialScore score={m.responseTimeScore} color="#3B82F6" label="Thời gian phản hồi" />
        <RadialScore score={m.rescueEffectivenessScore} color="#22C55E" label="Hiệu quả cứu hộ" />
        <RadialScore score={m.decisionHandlingScore} color="#F59E0B" label="Xử lý quyết định" />
        <RadialScore score={m.safetyMedicalSkillScore} color="#EF4444" label="Y tế & An toàn" />
        <RadialScore score={m.teamworkCommunicationScore} color="#8B5CF6" label="Phối hợp nhóm" />
      </div>
    </div>
  ))}</div></section>;
}

/* ─── Main ─── */
export default function MissionTeamReportInline({ missionId, missionTeamId }: Props) {
  const { data, isError, isLoading } = useMissionTeamReport(missionId, missionTeamId, { enabled: missionId > 0 && missionTeamId > 0 });
  if (isLoading) return <div className="space-y-3 py-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>;
  if (isError) return <Card className="border-rose-200 bg-rose-50/80"><CardContent className="flex items-start gap-3 p-4"><Warning className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /><div><p className="font-semibold text-rose-900 tracking-tighter">Không tải được báo cáo</p><p className="mt-1 text-sm text-rose-700 tracking-tighter">Vui lòng thử làm mới lại.</p></div></CardContent></Card>;
  if (!data) return null;
  if (!hasContent(data)) return <div className="rounded-xl border-2 border-dashed border-border/50 py-8 text-center"><SealCheck className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-2 font-semibold text-foreground tracking-tighter">Đội chưa gửi nội dung báo cáo</p><p className="mt-1 text-sm text-muted-foreground tracking-tighter">Khi đội lưu nháp hoặc gửi, nội dung sẽ hiện tại đây.</p></div>;
  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <InfoTile label="Trạng thái thực hiện" value={data.executionStatus || "-"} />
        <InfoTile label="Bắt đầu" value={fmtDt(data.startedAt)} />
        <InfoTile label="Chỉnh sửa cuối" value={fmtDt(data.lastEditedAt)} />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <InfoTile label="Gửi lúc" value={fmtDt(data.submittedAt)} />
        <InfoTile label="Có thể chỉnh sửa" value={data.canEdit ? "Có" : "Không"} />
        <InfoTile label="Có thể đánh giá" value={data.canEvaluateMembers ? "Có" : "Không"} />
      </div>
      <TextSection title="Tóm tắt đội" value={data.teamSummary} icon={<NotePencil className="h-4 w-4" />} />
      <TextSection title="Ghi chú" value={data.teamNote} icon={<ClipboardText className="h-4 w-4" />} />
      <JsonSection title="Kết quả" value={data.resultJson} />
      <JsonSection title="Vấn đề" value={data.issuesJson} />
      <JsonSection title="Bằng chứng" value={data.evidenceJson} />
      <div className="border-t border-border/40 my-2" />
      <ActivityList activities={data.activities} />
      <MemberEvaluations report={data} />
    </div>
  );
}
