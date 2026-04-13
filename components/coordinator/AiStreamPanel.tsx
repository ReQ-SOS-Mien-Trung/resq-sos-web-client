"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  activityTypeConfig,
  resourceTypeIcons,
  severityConfig,
} from "@/lib/constants";
import type {
  ClusterRescueSuggestionResponse,
  ClusterSuggestedActivity,
  ClusterSuggestedResource,
} from "@/services/sos_cluster/type";
import type { StreamLogEntry } from "@/services/sos_cluster/hooks";
import {
  X,
  Lightning,
  Rocket,
  Warning,
  CheckCircle,
  Clock,
  Package,
  MapPin,
  ShieldCheck,
  Storefront,
  Brain,
  Stop,
  ArrowsClockwise,
  Cube,
  TreeStructure,
  Sparkle,
  Eye,
  Users,
  FirstAid,
  Truck,
  Anchor,
} from "@phosphor-icons/react";

/* ═══ Props ═══ */

interface AiStreamPanelProps {
  open: boolean;
  onClose: () => void;
  clusterId: number | null;
  status: string;
  statusLog: StreamLogEntry[];
  thinkingText: string;
  result: ClusterRescueSuggestionResponse | null;
  error: string | null;
  loading: boolean;
  phase: string;
  onStop: () => void;
  onRetry: () => void;
  onViewPlan: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

/* ═══ Activity icon map ═══ */

const activityIconMap: Record<
  string,
  ComponentType<{ className?: string; weight?: string }>
> = {
  COLLECT_SUPPLIES: Package,
  DELIVER_SUPPLIES: Truck,
  RESCUE: Anchor,
  MEDICAL_AID: FirstAid,
  EVACUATE: Users,
  ASSESS: Eye,
  COORDINATE: TreeStructure,
  RETURN_SUPPLIES: ArrowsClockwise,
  MIXED: Sparkle,
};

const TEAM_TYPE_LABELS: Record<string, string> = {
  RESCUE: "Cứu hộ",
  MEDICAL: "Y tế",
  LOGISTICS: "Hậu cần",
  BOAT: "Đội thuyền",
  EVACUATION: "Sơ tán",
  FIREFIGHTER: "Cứu hỏa",
  SEARCH_AND_RESCUE: "Tìm kiếm cứu nạn",
};

const formatTeamTypeLabel = (teamType?: string | null) => {
  if (!teamType) return "Chưa rõ";
  const normalized = teamType.trim().toUpperCase();
  return TEAM_TYPE_LABELS[normalized] ?? teamType;
};

function normalizeAiErrorText(error: string): string {
  const message = error.trim();
  if (!message) {
    return "AI không thể phân tích cụm này. Vui lòng thử lại.";
  }

  const lower = message.toLowerCase();
  if (lower === "lỗi" || lower === "loi" || lower === "error") {
    return "AI phân tích thất bại. Backend chưa trả chi tiết lỗi.";
  }

  const isServiceUnavailable =
    /\b503\b/.test(lower) ||
    lower.includes("service unavailable") ||
    lower.includes("temporarily unavailable") ||
    lower.includes("upstream connect error") ||
    lower.includes("backend unavailable");

  const isQuotaOrTokenIssue =
    lower.includes("insufficient_quota") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("token") ||
    lower.includes("api key") ||
    lower.includes("billing") ||
    lower.includes("credit");

  const isAuthConfigIssue =
    /\b401\b/.test(lower) ||
    /\b403\b/.test(lower) ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("invalid api key") ||
    lower.includes("permission denied");

  if (isQuotaOrTokenIssue || isAuthConfigIssue) {
    return "AI hiện không khả dụng do token/quota đã hết hoặc cấu hình API key chưa đúng. Vui lòng báo Admin kiểm tra cấu hình AI (API key, quota, billing).";
  }

  if (isServiceUnavailable) {
    return "Dịch vụ AI đang tạm quá tải hoặc gián đoạn (503). Vui lòng thử lại sau ít phút; nếu vẫn lỗi, hãy báo Admin kiểm tra cấu hình AI và hạn mức token/quota.";
  }

  return message;
}

function buildAiErrorStatusLabel(error: string): string {
  const readable = normalizeAiErrorText(error);
  const compact =
    readable.split(/[.!?]/).find((segment) => segment.trim().length > 0) ??
    readable;

  return `LỖI: ${compact.trim()}`;
}

/* ═══ Main Component ═══ */

export default function AiStreamPanel({
  open,
  onClose,
  clusterId,
  status,
  statusLog,
  thinkingText,
  result,
  error,
  loading,
  phase,
  onStop,
  onRetry,
  onViewPlan,
  primaryActionLabel,
  onPrimaryAction,
}: AiStreamPanelProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !panelRef.current || !overlayRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: "power2.out" },
      );
      gsap.fromTo(
        panelRef.current,
        { scale: 0.92, opacity: 0, y: 40 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "back.out(1.4)",
          delay: 0.1,
        },
      );
    });
    return () => ctx.revert();
  }, [open]);

  if (!open) return null;

  const showProgress = loading && !result;
  const showActionMap = result !== null;
  const showError = error !== null && !result;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="relative w-full max-w-5xl max-h-[92vh] mx-4 rounded-2xl overflow-hidden flex flex-col bg-background border text-[14px] shadow-2xl"
        style={{ opacity: 0 }}
      >
        <TopBar
          clusterId={clusterId}
          loading={loading}
          result={result}
          error={error}
          phase={phase}
          onStop={onStop}
          onClose={onClose}
        />
        <div className="relative flex-1 min-h-0 overflow-auto bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.82)_0%,_rgba(255,255,255,0.96)_24%,_rgba(255,255,255,1)_100%)]">
          {showProgress && (
            <LoadingStreamView
              status={status}
              statusLog={statusLog}
              thinkingText={thinkingText}
              phase={phase}
            />
          )}
          {showActionMap && <ActionMapView result={result} />}
          {showError && <ErrorView error={error} onRetry={onRetry} />}
        </div>
        {result && (
          <FooterBar
            onRetry={onRetry}
            onViewPlan={onViewPlan}
            primaryActionLabel={primaryActionLabel}
            onPrimaryAction={onPrimaryAction}
          />
        )}
      </div>
    </div>
  );
}

/* ═══ Top Bar ═══ */

function TopBar({
  clusterId,
  loading,
  result,
  error,
  phase,
  onStop,
  onClose,
}: {
  clusterId: number | null;
  loading: boolean;
  result: ClusterRescueSuggestionResponse | null;
  error: string | null;
  phase: string;
  onStop: () => void;
  onClose: () => void;
}) {
  const statusLabel = loading
    ? phaseLabel(phase)
    : result
      ? "HOÀN TẤT"
      : error
        ? buildAiErrorStatusLabel(error)
        : "SẴN SÀNG";

  return (
    <div className="relative flex items-center justify-between px-5 py-3 border-b bg-background shrink-0">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-md">
            <Brain className="h-4.5 w-4.5 text-white" weight="fill" />
          </div>
          {loading && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
          )}
          {result && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
              <CheckCircle className="h-2 w-2 text-white" weight="fill" />
            </span>
          )}
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            Gợi ý nhiệm vụ AI
            {clusterId && (
              <Badge variant="outline" className="text-sm font-mono px-1.5">
                Cụm #{clusterId}
              </Badge>
            )}
          </h3>
          <p
            className="max-w-xl truncate text-sm text-muted-foreground"
            title={error ? normalizeAiErrorText(error) : undefined}
          >
            {statusLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {loading && (
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-sm"
            onClick={onStop}
          >
            <Stop className="h-3 w-3 mr-1" weight="fill" />
            Dừng
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case "connecting":
      return "ĐANG KẾT NỐI...";
    case "loading-data":
      return "ĐANG TẢI DỮ LIỆU...";
    case "calling-ai":
      return "AI ĐANG SUY NGHĨ...";
    case "processing":
      return "ĐANG XỬ LÝ KẾT QUẢ...";
    case "done":
      return "HOÀN TẤT";
    default:
      return "ĐANG KHỞI TẠO...";
  }
}

function phaseDescription(phase: string): string {
  switch (phase) {
    case "connecting":
      return "Thiết lập kết nối thời gian thực với tác nhân AI.";
    case "loading-data":
      return "AI đang gom dữ liệu hiện trường, đội cứu hộ và kho gần nhất.";
    case "calling-ai":
      return "Mô hình đang cân nhắc phương án điều phối và thứ tự hành động.";
    case "processing":
      return "Chuẩn hóa kết quả và dựng luồng nhiệm vụ để hiển thị.";
    case "done":
      return "Gợi ý nhiệm vụ đã sẵn sàng để xem và duyệt.";
    default:
      return "Khởi tạo tiến trình phân tích nhiệm vụ.";
  }
}

function phaseProgressValue(phase: string): number {
  switch (phase) {
    case "connecting":
      return 16;
    case "loading-data":
      return 42;
    case "calling-ai":
      return 72;
    case "processing":
      return 90;
    case "done":
      return 100;
    default:
      return 8;
  }
}

function phaseToneClasses(phase: string) {
  switch (phase) {
    case "done":
      return {
        pill: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600",
        dot: "bg-emerald-500 shadow-emerald-500/50",
        glow: "from-emerald-500/22 via-emerald-500/8 to-transparent",
      };
    case "processing":
      return {
        pill: "border-sky-500/25 bg-sky-500/10 text-sky-600",
        dot: "bg-sky-500 shadow-sky-500/50",
        glow: "from-sky-500/20 via-sky-500/8 to-transparent",
      };
    case "calling-ai":
      return {
        pill: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-600",
        dot: "bg-fuchsia-500 shadow-fuchsia-500/50",
        glow: "from-fuchsia-500/24 via-fuchsia-500/8 to-transparent",
      };
    default:
      return {
        pill: "border-primary/25 bg-primary/10 text-primary",
        dot: "bg-primary shadow-primary/50",
        glow: "from-primary/20 via-primary/8 to-transparent",
      };
  }
}

function LoadingStreamView({
  status,
  statusLog,
  thinkingText,
  phase,
}: {
  status: string;
  statusLog: StreamLogEntry[];
  thinkingText: string;
  phase: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".loading-block",
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.08,
          ease: "power2.out",
        },
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="h-full px-4 py-6 md:px-6 md:py-8"
      style={{ contentVisibility: "auto" }}
    >
      <div className="mx-auto flex w-full flex-col items-center gap-5">
        <div className="loading-block w-full">
          <SonarRadar
            status={status}
            statusLog={statusLog}
            thinkingText={thinkingText}
            phase={phase}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══ Phase 1: Sonar Radar ═══ */

function SonarRadar({
  status,
  statusLog,
  thinkingText,
  phase,
}: {
  status: string;
  statusLog: StreamLogEntry[];
  thinkingText: string;
  phase: string;
}) {
  const ringRefs = useRef<(SVGCircleElement | null)[]>([]);
  const tickerRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const statusEntries = statusLog.filter(
    (entry) => entry.type === "status" || entry.type === "result",
  );
  const visibleStatusEntries = statusEntries.slice(-7);
  const latestEntry = visibleStatusEntries[visibleStatusEntries.length - 1];
  const phaseTone = phaseToneClasses(phase);
  const progressValue = phaseProgressValue(phase);

  useEffect(() => {
    const rings = ringRefs.current.filter(Boolean) as SVGCircleElement[];
    if (rings.length === 0) return;
    const tweens = rings.map((ring, i) =>
      gsap.fromTo(
        ring,
        { attr: { r: 20 }, opacity: 0.8 },
        {
          attr: { r: 140 + i * 15 },
          opacity: 0,
          duration: 2.5 + i * 0.4,
          repeat: -1,
          delay: i * 0.6,
          ease: "power1.out",
        },
      ),
    );
    return () => tweens.forEach((t) => t.kill());
  }, []);

  useEffect(() => {
    if (!tickerRef.current) return;

    const items = Array.from(
      tickerRef.current.querySelectorAll<HTMLElement>(".status-ticker-item"),
    );

    if (items.length === 0) {
      return;
    }

    const earlierItems = items.slice(0, -1);
    const newestItem = items.at(-1);

    if (earlierItems.length > 0) {
      gsap.killTweensOf(earlierItems);
      gsap.fromTo(
        earlierItems,
        { y: 0, opacity: 1 },
        {
          y: -10,
          opacity: 0.74,
          duration: 0.24,
          stagger: 0.028,
          ease: "power1.out",
          yoyo: true,
          repeat: 1,
          overwrite: "auto",
        },
      );
    }

    if (newestItem) {
      gsap.killTweensOf(newestItem);
      gsap.fromTo(
        newestItem,
        { y: 22, opacity: 0, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.38,
          ease: "power2.out",
          overwrite: "auto",
        },
      );
    }

    gsap.to(tickerRef.current, {
      scrollTop: tickerRef.current.scrollHeight,
      duration: 0.34,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, [latestEntry?.id]);

  useEffect(() => {
    if (thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [thinkingText]);

  return (
    <div className="w-full px-2 py-4 md:px-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="rounded-2xl border border-primary/10 bg-white/92 px-4 py-3 shadow-[0_20px_60px_-42px_rgba(249,115,22,0.45)] backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-sm font-semibold uppercase tracking-[0.18em]",
                    phaseTone.pill,
                  )}
                >
                  <span
                    className={cn(
                      "mr-2 h-2 w-2 rounded-full shadow-[0_0_14px]",
                      phaseTone.dot,
                    )}
                  />
                  {phaseLabel(phase)}
                </Badge>
                <span className="text-sm font-medium text-foreground/90">
                  {latestEntry?.message || status || phaseDescription(phase)}
                </span>
              </div>
            </div>

            <div className="flex w-full items-center gap-3 md:max-w-xs">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/8">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
                    phase === "done"
                      ? "from-emerald-500 to-emerald-400"
                      : phase === "calling-ai"
                        ? "from-fuchsia-500 via-primary to-orange-400"
                        : "from-primary to-orange-400",
                  )}
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {progressValue}%
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-5xl gap-5 md:grid-cols-[300px_minmax(0,1fr)] md:items-start">
          <div className="overflow-hidden rounded-[28px] border border-primary/10 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(255,248,244,0.96))] p-4 shadow-[0_20px_60px_-42px_rgba(249,115,22,0.55)] md:p-5">
            <div className="flex flex-col items-center">
              <div className="relative h-56 w-56 md:h-60 md:w-60">
                <div
                  className={cn(
                    "absolute inset-0 rounded-full bg-gradient-to-b opacity-80 blur-3xl",
                    phaseTone.glow,
                  )}
                />
                <svg viewBox="0 0 300 300" className="relative h-full w-full">
                  {[56, 96, 136].map((r) => (
                    <circle
                      key={r}
                      cx="150"
                      cy="150"
                      r={r}
                      fill="none"
                      className="stroke-primary/10"
                      strokeWidth="0.7"
                    />
                  ))}
                  {[40, 80, 120, 160].map((offset) => (
                    <circle
                      key={`grid-${offset}`}
                      cx="150"
                      cy="150"
                      r={offset / 4}
                      fill="none"
                      className="stroke-primary/5"
                      strokeDasharray="2 10"
                      strokeWidth="0.9"
                    />
                  ))}
                  <line
                    x1="150"
                    y1="24"
                    x2="150"
                    y2="276"
                    className="stroke-primary/10"
                    strokeWidth="0.6"
                  />
                  <line
                    x1="24"
                    y1="150"
                    x2="276"
                    y2="150"
                    className="stroke-primary/10"
                    strokeWidth="0.6"
                  />
                  {[0, 1, 2, 3].map((i) => (
                    <circle
                      key={`ring-${i}`}
                      ref={(el) => {
                        ringRefs.current[i] = el;
                      }}
                      cx="150"
                      cy="150"
                      r="20"
                      fill="none"
                      stroke="url(#sonarGrad)"
                      strokeWidth={2.5 - i * 0.4}
                      opacity="0"
                    />
                  ))}
                  <circle
                    cx="150"
                    cy="150"
                    r="28"
                    className="fill-primary/10 stroke-primary/35"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="150"
                    cy="150"
                    r="18"
                    className="fill-white stroke-primary/60"
                    strokeWidth="2"
                  />
                  <circle cx="150" cy="150" r="8" className="fill-primary/50">
                    <animate
                      attributeName="r"
                      values="6;10;6"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.8;0.4;0.8"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <defs>
                    <radialGradient id="sonarGrad">
                      <stop offset="0%" stopColor="rgba(249,115,22,0.8)" />
                      <stop offset="100%" stopColor="rgba(249,115,22,0)" />
                    </radialGradient>
                  </defs>
                </svg>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/85 shadow-lg shadow-primary/10 backdrop-blur">
                    <Brain
                      className="h-7 w-7 text-primary animate-pulse"
                      weight="fill"
                    />
                  </div>
                </div>
              </div>

              <Badge className="mt-2 border-primary/20 bg-white text-primary shadow-sm hover:bg-white">
                {phaseLabel(phase)}
              </Badge>
              <p className="mt-3 text-center text-sm font-medium tracking-tight text-foreground">
                {status || phaseDescription(phase)}
              </p>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                AI đang phân tích
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-primary/10 bg-white/92 shadow-[0_24px_72px_-42px_rgba(15,23,42,0.28)] backdrop-blur">
            <div className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(249,115,22,0.08),rgba(249,115,22,0.02)_55%,transparent)] px-4 py-4 md:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/35" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                  </span>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
                    AI Suy nghĩ
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-sm text-primary/80">
                  <ArrowsClockwise className="h-3.5 w-3.5 animate-spin" />
                  {statusEntries.length}
                </div>
              </div>
            </div>

            <div className="relative px-4 py-4 md:px-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white via-white/90 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/90 to-transparent" />
              <div
                ref={tickerRef}
                className="relative max-h-[23rem] space-y-2 overflow-y-auto pr-1"
              >
                {visibleStatusEntries.length > 0 ? (
                  visibleStatusEntries.map((entry, index) => {
                    const reverseIndex =
                      visibleStatusEntries.length - index - 1;
                    const isLatest = reverseIndex === 0;
                    const ageOpacity = Math.max(0.38, 1 - reverseIndex * 0.16);

                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "status-ticker-item relative flex items-start gap-3 rounded-2xl border px-3 py-3 transition-colors md:px-4",
                          isLatest
                            ? "border-primary/18 bg-primary/[0.07] shadow-[0_12px_40px_-28px_rgba(249,115,22,0.65)]"
                            : "border-border/50 bg-white/72",
                        )}
                        style={{ opacity: ageOpacity }}
                      >
                        <div className="relative mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full",
                              isLatest ? "bg-primary" : "bg-primary/35",
                            )}
                          />
                          {isLatest && (
                            <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-primary/20" />
                          )}
                        </div>
                        <p
                          className={cn(
                            "min-w-0 flex-1 wrap-break-word font-medium leading-6",
                            isLatest
                              ? "text-[15px] text-foreground"
                              : "text-sm text-muted-foreground",
                          )}
                        >
                          {entry.message}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="status-ticker-item rounded-2xl border border-primary/12 bg-primary/[0.06] px-4 py-3 text-sm font-medium text-primary/85">
                    {status || "Đang khởi tạo..."}
                  </div>
                )}
              </div>

              {thinkingText && (
                <div
                  ref={thinkingRef}
                  className="mt-3 rounded-2xl border border-primary/10 bg-primary/[0.04] px-3 py-2.5"
                >
                  <p className="line-clamp-2 text-sm font-mono leading-5 text-primary/70 whitespace-pre-wrap wrap-break-word">
                    {thinkingText}
                    <span className="ml-1 inline-block h-3 w-1 animate-pulse rounded-full bg-primary/60 align-middle" />
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Phase 3: Action Map ═══ */

function ActionMapView({
  result,
}: {
  result: ClusterRescueSuggestionResponse;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activities = result.suggestedActivities;
  const activitiesKey = activities
    .map((activity) => `${activity.step}-${activity.activityType}`)
    .join("|");

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5" ref={containerRef}>
        <MissionBanner result={result} />
        <StatsRow result={result} />
        <ActionFlowTimeline key={activitiesKey} activities={activities} />
        {result.overallAssessment && (
          <AssessmentBlock text={result.overallAssessment} />
        )}
        {result.suggestedResources && result.suggestedResources.length > 0 && (
          <ResourcesBlock resources={result.suggestedResources} />
        )}
        <WarningsBlock result={result} />
      </div>
    </ScrollArea>
  );
}

function ActionFlowTimeline({
  activities,
}: {
  activities: ClusterSuggestedActivity[];
}) {
  const [revealedCount, setRevealedCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    activities.forEach((_, idx) => {
      const t = setTimeout(
        () => setRevealedCount((prev) => prev + 1),
        (idx + 1) * 1200,
      );
      timerRef.current.push(t);
    });

    return () => {
      timerRef.current.forEach(clearTimeout);
      timerRef.current = [];
    };
  }, [activities]);

  return (
    <div className="relative">
      <AiOriginNode />
      <div className="ml-12 space-y-0">
        {activities.slice(0, revealedCount).map((activity) => (
          <ActivityFlowNode key={activity.step} activity={activity} />
        ))}
      </div>
      {revealedCount < activities.length && (
        <div className="ml-12 border-l-2 border-dashed border-primary/20 py-3 pl-4">
          <div className="flex items-center gap-2 text-sm font-mono text-primary/40">
            <span className="h-2 w-2 rounded-full bg-primary/30 animate-pulse" />
            Đang tải bước {revealedCount + 1}/{activities.length}...
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Mission Banner ═══ */

function MissionBanner({
  result,
}: {
  result: ClusterRescueSuggestionResponse;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
    );
  }, []);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='40' height='46' viewBox='0 0 40 46' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L40 11.5V34.5L20 46L0 34.5V11.5L20 0Z' fill='none' stroke='%23f97316' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundSize: "40px 46px",
        }}
      />
      <div className="relative flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
          <CheckCircle className="h-5 w-5 text-white" weight="fill" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate mb-1">
            {result.suggestedMissionTitle}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="text-sm bg-primary text-white border-primary hover:bg-primary/90">
              {severityConfig[result.suggestedSeverityLevel]?.label ||
                result.suggestedSeverityLevel}
            </Badge>
            <span className="text-sm font-mono text-muted-foreground">
              {result.modelName} • {result.responseTimeMs}ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Stats Row ═══ */

function StatsRow({ result }: { result: ClusterRescueSuggestionResponse }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".stat-hex",
        { opacity: 0, scale: 0.6, y: 20 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: "back.out(1.7)",
          delay: 0.3,
        },
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  const stats = [
    {
      icon: ShieldCheck,
      label: "Độ tin cậy",
      value: `${(result.confidenceScore * 100).toFixed(0)}%`,
      color: "text-emerald-400",
    },
    {
      icon: Lightning,
      label: "Ưu tiên",
      value: result.suggestedPriorityScore.toFixed(1),
      color: "text-orange-400",
    },
    {
      icon: Clock,
      label: "Thời gian",
      value: result.estimatedDuration,
      color: "text-blue-400",
    },
    {
      icon: Rocket,
      label: "Hoạt động",
      value: `${result.suggestedActivities.length}`,
      color: "text-violet-400",
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-4 gap-2">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="stat-hex flex flex-col items-center gap-1 p-3 rounded-xl bg-card border hover:border-primary/20 transition-colors"
          >
            <Icon className={cn("h-4 w-4", s.color)} weight="fill" />
            <span className={cn("text-sm font-bold font-mono", s.color)}>
              {s.value}
            </span>
            <span className="text-sm text-muted-foreground uppercase tracking-wider">
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══ AI Origin Node ═══ */

function AiOriginNode() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2)" },
    );
  }, []);

  return (
    <div ref={ref} className="flex items-center gap-3 mb-0">
      <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
        <Brain className="h-4 w-4 text-primary" weight="fill" />
      </div>
      <div>
        <span className="text-sm font-bold text-primary">AI Engine</span>
        <p className="text-sm text-muted-foreground font-mono">
          Bắt đầu thực thi kế hoạch
        </p>
      </div>
    </div>
  );
}

/* ═══ ActivityFlowNode ═══ */

function ActivityFlowNode({
  activity,
}: {
  activity: ClusterSuggestedActivity;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGSVGElement>(null);

  const config = activityTypeConfig[activity.activityType] || {
    label: activity.activityType,
    color: "text-zinc-400",
    bgColor: "bg-zinc-800",
  };
  const Icon = activityIconMap[activity.activityType] || Sparkle;
  const isDepotStep =
    activity.activityType === "COLLECT_SUPPLIES" || activity.depotName !== null;
  const isSosStep =
    activity.activityType === "RESCUE" ||
    activity.activityType === "MEDICAL_AID" ||
    activity.activityType === "EVACUATE";

  useEffect(() => {
    if (!nodeRef.current) return;
    const ctx = gsap.context(() => {
      if (lineRef.current) {
        const path = lineRef.current.querySelector(".pulse-line");
        if (path) {
          gsap.fromTo(
            path,
            { strokeDashoffset: 100 },
            { strokeDashoffset: 0, duration: 0.8, ease: "power2.out" },
          );
        }
      }
      gsap.fromTo(
        nodeRef.current,
        { opacity: 0, x: -30, scale: 0.9 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.6,
          ease: "power3.out",
          delay: 0.2,
        },
      );
      gsap.fromTo(
        nodeRef.current!.querySelectorAll(".supply-tag"),
        { opacity: 0, scale: 0.5, y: 8 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.06,
          ease: "back.out(2)",
          delay: 0.5,
        },
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative">
      <svg
        ref={lineRef}
        className="absolute -left-6 top-0 w-6 h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        <line
          className="pulse-line"
          x1="12"
          y1="0"
          x2="12"
          y2="100%"
          stroke="rgba(249,115,22,0.3)"
          strokeWidth="2"
          strokeDasharray="100"
          strokeDashoffset="100"
        />
        <circle r="3" className="fill-primary/80">
          <animateMotion path="M12,0 L12,100" dur="1.5s" repeatCount="1" />
          <animate
            attributeName="opacity"
            values="1;0"
            dur="1.5s"
            repeatCount="1"
          />
        </circle>
      </svg>

      <div
        ref={nodeRef}
        className={cn(
          "relative border rounded-xl p-3 mb-3 transition-all",
          isDepotStep &&
            "border-amber-500/25 bg-amber-50/50 dark:bg-amber-500/[0.04]",
          isSosStep && "border-red-500/20 bg-red-50/50 dark:bg-red-500/[0.03]",
          !isDepotStep && !isSosStep && "border bg-card",
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="relative w-7 h-7 shrink-0">
            <svg viewBox="0 0 28 28" className="w-full h-full">
              <polygon
                points="14,1 26,7.5 26,20.5 14,27 2,20.5 2,7.5"
                fill={
                  isDepotStep
                    ? "rgba(245,158,11,0.2)"
                    : isSosStep
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(249,115,22,0.1)"
                }
                stroke={
                  isDepotStep
                    ? "rgba(245,158,11,0.6)"
                    : isSosStep
                      ? "rgba(239,68,68,0.5)"
                      : "rgba(249,115,22,0.4)"
                }
                strokeWidth="1"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary">
              {activity.step}
            </span>
          </div>
          <Badge
            className={cn(
              "text-sm px-1.5 h-5 border",
              config.bgColor,
              config.color,
              "border-current/20",
            )}
          >
            <Icon className="h-3 w-3 mr-0.5" weight="fill" />
            {config.label}
          </Badge>
          <Badge className="text-sm px-1.5 h-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
            {severityConfig[activity.priority]?.label || activity.priority}
          </Badge>
          {activity.estimatedTime && (
            <span className="text-sm font-mono text-muted-foreground flex items-center gap-0.5 ml-auto">
              <Clock className="h-3 w-3" />
              {activity.estimatedTime}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground mb-2 pl-9">
          {activity.description}
        </p>

        {activity.suggestedTeam && (
          <div className="ml-9 mb-2 rounded-lg border border-emerald-300/40 bg-emerald-50/50 dark:bg-emerald-900/15 dark:border-emerald-700/40 p-2">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" weight="fill" />
              Đội đề xuất
            </p>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mt-0.5">
              {activity.suggestedTeam.teamName ||
                (activity.suggestedTeam.teamId
                  ? `Đội #${activity.suggestedTeam.teamId}`
                  : "Đội chưa đặt tên")}
            </p>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
              {`Loại: ${formatTeamTypeLabel(activity.suggestedTeam.teamType)}`}
              {activity.suggestedTeam.contactPhone
                ? ` • SĐT: ${activity.suggestedTeam.contactPhone}`
                : ""}
              {activity.suggestedTeam.estimatedEtaMinutes != null
                ? ` • ETA: ${activity.suggestedTeam.estimatedEtaMinutes} phút`
                : ""}
            </p>
            {activity.suggestedTeam.reason && (
              <p className="text-sm text-emerald-700/75 dark:text-emerald-300/75 mt-1 leading-relaxed">
                Lý do: {activity.suggestedTeam.reason}
              </p>
            )}
            {activity.suggestedTeam.assemblyPointName && (
              <p className="text-sm text-emerald-700/75 dark:text-emerald-300/75 mt-0.5 leading-relaxed">
                Điểm tập kết đội: {activity.suggestedTeam.assemblyPointName}
              </p>
            )}
          </div>
        )}

        {(activity.assemblyPointName ||
          (activity.assemblyPointLatitude != null &&
            activity.assemblyPointLongitude != null)) && (
          <div className="ml-9 mb-2 rounded-lg border border-blue-300/40 bg-blue-50/50 dark:bg-blue-900/15 dark:border-blue-700/40 p-2">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <MapPin className="h-3 w-3" weight="fill" />
              Điểm tập kết hoạt động
            </p>
            {activity.assemblyPointName && (
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mt-0.5">
                {activity.assemblyPointName}
              </p>
            )}
            {activity.assemblyPointLatitude != null &&
              activity.assemblyPointLongitude != null && (
                <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                  Tọa độ: {activity.assemblyPointLatitude.toFixed(4)},{" "}
                  {activity.assemblyPointLongitude.toFixed(4)}
                </p>
              )}
          </div>
        )}

        {activity.depotName && (
          <div className="ml-9 flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-500/[0.06] border border-amber-500/15 mb-2">
            <div className="relative w-6 h-6 shrink-0">
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <polygon
                  points="12,1 22,6.5 22,17.5 12,23 2,17.5 2,6.5"
                  fill="rgba(245,158,11,0.2)"
                  stroke="rgba(245,158,11,0.5)"
                  strokeWidth="1"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Storefront className="h-3 w-3 text-amber-500" weight="fill" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400 truncate">
                {activity.depotName}
              </p>
              {activity.depotAddress && (
                <p className="text-sm text-amber-600/50 dark:text-amber-500/50 truncate">
                  {activity.depotAddress}
                </p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-amber-500/40 animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {activity.sosRequestId && (
          <div className="ml-9 flex items-center gap-2 mb-2">
            <MapPin
              className="h-3.5 w-3.5 text-red-500 shrink-0"
              weight="fill"
            />
            <span className="text-sm font-mono text-red-500/70">
              SOS #{activity.sosRequestId}
            </span>
          </div>
        )}

        {activity.suppliesToCollect &&
          activity.suppliesToCollect.length > 0 && (
            <div className="ml-9 flex flex-wrap gap-1.5 mt-1">
              {activity.suppliesToCollect.map((supply) => (
                <div
                  key={supply.itemId}
                  className="supply-tag flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/15 text-sm"
                >
                  <Package className="h-2.5 w-2.5 text-primary" weight="fill" />
                  <span className="text-primary">{supply.itemName}</span>
                  <span className="text-primary font-bold">
                    ×{supply.quantity}
                  </span>
                  <span className="text-primary/40">{supply.unit}</span>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

/* ═══ Assessment Block ═══ */

function AssessmentBlock({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
    );
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-xl border border-violet-500/15 overflow-hidden"
    >
      <div className="px-3 py-2 bg-violet-50 dark:bg-violet-500/[0.06] border-b border-violet-500/10 flex items-center gap-2">
        <Brain
          className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400"
          weight="fill"
        />
        <span className="text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
          Đánh giá tổng thể
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/* ═══ Resources Block ═══ */

function ResourcesBlock({
  resources,
}: {
  resources: ClusterSuggestedResource[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".resource-card",
        { opacity: 0, y: 15, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.4,
          stagger: 0.08,
          ease: "power3.out",
        },
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-xl border border-blue-500/15 overflow-hidden"
    >
      <div className="px-3 py-2 bg-blue-50 dark:bg-blue-500/[0.06] border-b border-blue-500/10 flex items-center gap-2">
        <Cube
          className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400"
          weight="fill"
        />
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          Tài nguyên cần thiết
        </span>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {resources.map((res, idx) => (
          <div
            key={idx}
            className="resource-card flex items-center gap-2.5 p-2.5 rounded-lg border bg-card"
          >
            <div className="text-blue-500 dark:text-blue-400 shrink-0">
              {resourceTypeIcons[res.resourceType] || (
                <Package className="h-5 w-5" weight="fill" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {res.description}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-mono text-blue-500 dark:text-blue-400">
                  SL: {res.quantity}
                </span>
                <Badge variant="outline" className="h-5 px-1.5 text-sm">
                  {res.priority}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Warnings Block ═══ */

function WarningsBlock({
  result,
}: {
  result: ClusterRescueSuggestionResponse;
}) {
  if (
    !result.needsManualReview &&
    !result.multiDepotRecommended &&
    !result.specialNotes
  )
    return null;

  return (
    <div className="space-y-2">
      {result.needsManualReview && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-500/[0.06] border border-yellow-500/15">
          <Warning className="h-4 w-4 text-yellow-500 shrink-0" weight="fill" />
          <p className="text-sm text-yellow-600 dark:text-yellow-400/80">
            {result.lowConfidenceWarning ||
              "Cần kiểm tra thủ công trước khi phê duyệt."}
          </p>
        </div>
      )}
      {result.multiDepotRecommended && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/[0.06] border border-blue-500/15">
          <Storefront
            className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0"
            weight="fill"
          />
          <p className="text-sm text-blue-600 dark:text-blue-400/80">
            Kế hoạch yêu cầu phối hợp nhiều kho tiếp tế.
          </p>
        </div>
      )}
      {result.specialNotes && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/[0.06] border border-amber-500/15">
          <Warning
            className="h-4 w-4 text-amber-500 shrink-0 mt-0.5"
            weight="fill"
          />
          <div>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">
              Lưu ý đặc biệt
            </p>
            <p className="text-sm text-amber-600/70 dark:text-amber-400/70 leading-relaxed">
              {result.specialNotes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Error View ═══ */

function ErrorView({ error, onRetry }: { error: string; onRetry: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const readableError = normalizeAiErrorText(error);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.4)" },
    );
    gsap.fromTo(
      ref.current,
      { x: -4 },
      { x: 4, duration: 0.08, repeat: 5, yoyo: true, ease: "power1.inOut" },
    );
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div
        ref={ref}
        className="max-w-sm p-5 rounded-xl bg-red-50 dark:bg-red-500/[0.06] border border-red-500/20 text-center"
      >
        <Warning className="h-8 w-8 text-red-500 mx-auto mb-3" weight="fill" />
        <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">
          Phân tích thất bại
        </p>
        <p className="text-sm text-red-500/60 mb-4">{readableError}</p>
        <Button
          variant="destructive"
          size="sm"
          className="h-8 text-sm"
          onClick={onRetry}
        >
          <ArrowsClockwise className="h-3.5 w-3.5 mr-1.5" />
          Thử lại
        </Button>
      </div>
    </div>
  );
}

/* ═══ Footer Bar ═══ */

function FooterBar({
  onRetry,
  onViewPlan,
  primaryActionLabel,
  onPrimaryAction,
}: {
  onRetry: () => void;
  onViewPlan: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", delay: 0.5 },
    );
  }, []);

  return (
    <div
      ref={ref}
      className="px-5 py-3 border-t bg-background flex items-center gap-2"
    >
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-sm"
        onClick={onRetry}
      >
        <ArrowsClockwise className="h-3.5 w-3.5 mr-1.5" />
        Phân tích lại
      </Button>
      <div className="flex-1" />
      {onPrimaryAction ? (
        <Button
          size="sm"
          className="h-9 text-sm bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg shadow-orange-500/25"
          onClick={onPrimaryAction}
        >
          <Rocket className="h-3.5 w-3.5 mr-1.5" weight="fill" />
          {primaryActionLabel ?? "Xem & Chỉnh sửa Kế hoạch"}
        </Button>
      ) : (
        <Button
          size="sm"
          className="h-9 text-sm bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg shadow-orange-500/25"
          onClick={onViewPlan}
        >
          <Rocket className="h-3.5 w-3.5 mr-1.5" weight="fill" />
          Xem & Chỉnh sửa Kế hoạch
        </Button>
      )}
    </div>
  );
}
