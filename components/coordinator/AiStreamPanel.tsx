"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
}

/* ═══ Activity icon map ═══ */

const activityIconMap: Record<
  string,
  React.ComponentType<{ className?: string; weight?: string }>
> = {
  COLLECT_SUPPLIES: Package,
  DELIVER_SUPPLIES: Truck,
  RESCUE: Anchor,
  MEDICAL_AID: FirstAid,
  EVACUATE: Users,
  ASSESS: Eye,
  COORDINATE: TreeStructure,
  MIXED: Sparkle,
};

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

  const showSonar = loading && !result;
  const showMatrix = loading && thinkingText.length > 0 && !result;
  const showActionMap = result !== null;
  const showError = error !== null && !result;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="relative w-full max-w-5xl max-h-[92vh] mx-4 rounded-2xl overflow-hidden flex flex-col bg-zinc-950 border border-orange-500/20 shadow-[0_0_80px_rgba(249,115,22,0.12)]"
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
        <div className="relative flex-1 min-h-0 overflow-hidden">
          {showSonar && (
            <SonarRadar status={status} statusLog={statusLog} phase={phase} />
          )}
          {showMatrix && <MatrixStream text={thinkingText} />}
          {showActionMap && <ActionMapView result={result} />}
          {showError && <ErrorView error={error} onRetry={onRetry} />}
        </div>
        {result && <FooterBar onRetry={onRetry} onViewPlan={onViewPlan} />}
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
  return (
    <div className="relative flex items-center justify-between px-5 py-3 border-b border-orange-500/10 bg-zinc-950">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Brain className="h-4.5 w-4.5 text-white" weight="fill" />
          </div>
          {loading && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
          )}
          {result && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center">
              <CheckCircle className="h-2 w-2 text-white" weight="fill" />
            </span>
          )}
        </div>
        <div>
          <h3 className="text-sm font-bold text-orange-50 flex items-center gap-2">
            AI Mission Suggestion
            {clusterId && (
              <Badge className="text-[9px] font-mono px-1.5 bg-orange-500/15 text-orange-400 border-orange-500/25 hover:bg-orange-500/20">
                Cụm #{clusterId}
              </Badge>
            )}
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono">
            {loading
              ? phaseLabel(phase)
              : result
                ? "HOÀN TẤT"
                : error
                  ? "LỖI"
                  : "SẴN SÀNG"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {loading && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
            onClick={onStop}
          >
            <Stop className="h-3 w-3 mr-1" weight="fill" />
            Dừng
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md text-zinc-600 hover:text-orange-300 hover:bg-orange-500/10"
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
      return "ĐANG XỎ LÝ KẾT QUẢ...";
    case "done":
      return "HOÀN TẤT";
    default:
      return "ĐANG KHỞI TẠO...";
  }
}

/* ═══ Phase 1: Sonar Radar ═══ */

function SonarRadar({
  status,
  statusLog,
  phase,
}: {
  status: string;
  statusLog: StreamLogEntry[];
  phase: string;
}) {
  const ringRefs = useRef<(SVGCircleElement | null)[]>([]);
  const textRef = useRef<HTMLDivElement>(null);
  const glitchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (!textRef.current || !status) return;
    const target = status;
    let frame = 0;
    const chars = "░▒▓█▄▀■□◤◥◈◇⬡⬢⊕⊗";
    const el = textRef.current;
    glitchIntervalRef.current = setInterval(() => {
      frame++;
      const revealed = Math.min(frame, target.length);
      let display = target.slice(0, revealed);
      if (revealed < target.length) {
        const noiseLen = Math.min(4, target.length - revealed);
        for (let i = 0; i < noiseLen; i++) {
          display += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      el.textContent = display;
      if (frame >= target.length + 5) {
        el.textContent = target;
        if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
      }
    }, 35);
    return () => {
      if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
    };
  }, [status]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div className="relative w-72 h-72">
        <svg viewBox="0 0 300 300" className="w-full h-full">
          {[60, 100, 140].map((r) => (
            <circle
              key={r}
              cx="150"
              cy="150"
              r={r}
              fill="none"
              stroke="rgba(249,115,22,0.06)"
              strokeWidth="0.5"
            />
          ))}
          <line
            x1="150"
            y1="30"
            x2="150"
            y2="270"
            stroke="rgba(249,115,22,0.08)"
            strokeWidth="0.5"
          />
          <line
            x1="30"
            y1="150"
            x2="270"
            y2="150"
            stroke="rgba(249,115,22,0.08)"
            strokeWidth="0.5"
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
            r="18"
            fill="rgba(249,115,22,0.15)"
            stroke="rgba(249,115,22,0.6)"
            strokeWidth="2"
          />
          <circle cx="150" cy="150" r="8" fill="rgba(249,115,22,0.5)">
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Brain
            className="h-6 w-6 text-orange-500 animate-pulse"
            weight="fill"
          />
        </div>
      </div>
      <div
        ref={textRef}
        className="mt-6 text-sm font-mono text-orange-400/90 text-center tracking-wide max-w-md px-4"
      />
      {statusLog.length > 0 && (
        <div className="mt-4 space-y-1 max-w-sm">
          {statusLog.slice(-3).map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-2 text-[10px] font-mono",
                entry.type === "status" && "text-zinc-600",
                entry.type === "error" && "text-red-500/70",
              )}
            >
              <span
                className={cn(
                  "w-1 h-1 rounded-full shrink-0",
                  entry.type === "status"
                    ? "bg-orange-500/50"
                    : "bg-red-500/50",
                )}
              />
              <span className="truncate">{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ Phase 2: Matrix Stream ═══ */

function MatrixStream({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current)
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [text]);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" },
    );
  }, []);

  return (
    <div className="absolute bottom-3 right-3 w-64 max-h-32 z-10">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-[9px] font-mono text-orange-500/60 uppercase tracking-widest">
          AI Processing
        </span>
      </div>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg bg-zinc-900/80 border border-orange-500/10 p-2 max-h-24 overflow-y-auto scrollbar-none"
      >
        <div className="text-[8px] font-mono text-orange-500/40 leading-tight break-all whitespace-pre-wrap">
          {text.slice(-600)}
          <span className="inline-block w-1.5 h-3 bg-orange-500/60 animate-pulse ml-0.5 align-text-bottom" />
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
  const [revealedCount, setRevealedCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activities = result.suggestedActivities;

  useEffect(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    setRevealedCount(0);
    activities.forEach((_, idx) => {
      const t = setTimeout(
        () => setRevealedCount((p) => p + 1),
        (idx + 1) * 1200,
      );
      timerRef.current.push(t);
    });
    return () => timerRef.current.forEach(clearTimeout);
  }, [activities]);

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5" ref={containerRef}>
        <MissionBanner result={result} />
        <StatsRow result={result} />
        <div className="relative">
          <AiOriginNode />
          <div className="ml-12 space-y-0">
            {activities.slice(0, revealedCount).map((activity, idx) => (
              <ActivityFlowNode
                key={activity.step}
                activity={activity}
                index={idx}
                isLast={idx === activities.length - 1}
              />
            ))}
          </div>
          {revealedCount < activities.length && (
            <div className="ml-12 pl-4 border-l-2 border-dashed border-orange-500/20 py-3">
              <div className="flex items-center gap-2 text-[10px] font-mono text-orange-500/40">
                <span className="w-2 h-2 rounded-full bg-orange-500/30 animate-pulse" />
                Đang tải bước {revealedCount + 1}/{activities.length}...
              </div>
            </div>
          )}
        </div>
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
      className="relative overflow-hidden rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-4"
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
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
          <CheckCircle className="h-5 w-5 text-white" weight="fill" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-orange-100 truncate mb-1">
            {result.suggestedMissionTitle}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="text-[9px] bg-orange-500 text-white border-orange-600 hover:bg-orange-600">
              {severityConfig[result.suggestedSeverityLevel]?.label ||
                result.suggestedSeverityLevel}
            </Badge>
            <span className="text-[10px] font-mono text-zinc-500">
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
            className="stat-hex flex flex-col items-center gap-1 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 hover:border-orange-500/20 transition-colors"
          >
            <Icon className={cn("h-4 w-4", s.color)} weight="fill" />
            <span className={cn("text-sm font-bold font-mono", s.color)}>
              {s.value}
            </span>
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider">
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
      <div className="relative w-10 h-10 shrink-0">
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <polygon
            points="20,2 37,11 37,29 20,38 3,29 3,11"
            fill="rgba(249,115,22,0.15)"
            stroke="rgba(249,115,22,0.6)"
            strokeWidth="1.5"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Brain className="h-4 w-4 text-orange-400" weight="fill" />
        </div>
      </div>
      <div>
        <span className="text-xs font-bold text-orange-300">AI Engine</span>
        <p className="text-[10px] text-zinc-600 font-mono">
          Bắt đầu thực thi kế hoạch
        </p>
      </div>
    </div>
  );
}

/* ═══ ActivityFlowNode ═══ */

function ActivityFlowNode({
  activity,
  index,
  isLast,
}: {
  activity: ClusterSuggestedActivity;
  index: number;
  isLast: boolean;
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
        <circle r="3" fill="rgba(249,115,22,0.8)">
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
          isDepotStep && "border-amber-500/25 bg-amber-500/[0.04]",
          isSosStep && "border-red-500/20 bg-red-500/[0.03]",
          !isDepotStep && !isSosStep && "border-zinc-800 bg-zinc-900/50",
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
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-orange-300">
              {activity.step}
            </span>
          </div>
          <Badge
            className={cn(
              "text-[9px] px-1.5 h-5 border",
              config.bgColor,
              config.color,
              "border-current/20",
            )}
          >
            <Icon className="h-3 w-3 mr-0.5" weight="fill" />
            {config.label}
          </Badge>
          <Badge className="text-[9px] px-1.5 h-5 bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/15">
            {severityConfig[activity.priority]?.label || activity.priority}
          </Badge>
          {activity.estimatedTime && (
            <span className="text-[10px] font-mono text-zinc-600 flex items-center gap-0.5 ml-auto">
              <Clock className="h-3 w-3" />
              {activity.estimatedTime}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-zinc-400 mb-2 pl-9">
          {activity.description}
        </p>

        {activity.depotName && (
          <div className="ml-9 flex items-center gap-2 p-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/15 mb-2">
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
              <p className="text-[11px] font-bold text-amber-400 truncate">
                {activity.depotName}
              </p>
              {activity.depotAddress && (
                <p className="text-[10px] text-amber-500/50 truncate">
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
            <span className="text-[10px] font-mono text-red-400/70">
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
                  className="supply-tag flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/15 text-[10px]"
                >
                  <Package
                    className="h-2.5 w-2.5 text-orange-400"
                    weight="fill"
                  />
                  <span className="text-orange-300">{supply.itemName}</span>
                  <span className="text-orange-500 font-bold">
                    ×{supply.quantity}
                  </span>
                  <span className="text-orange-500/40">{supply.unit}</span>
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
      <div className="px-3 py-2 bg-violet-500/[0.06] border-b border-violet-500/10 flex items-center gap-2">
        <Brain className="h-3.5 w-3.5 text-violet-400" weight="fill" />
        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">
          Đánh giá tổng thể
        </span>
      </div>
      <div className="p-3">
        <p className="text-xs leading-relaxed text-zinc-400">{text}</p>
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
      <div className="px-3 py-2 bg-blue-500/[0.06] border-b border-blue-500/10 flex items-center gap-2">
        <Cube className="h-3.5 w-3.5 text-blue-400" weight="fill" />
        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
          Tài nguyên cần thiết
        </span>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {resources.map((res, idx) => (
          <div
            key={idx}
            className="resource-card flex items-center gap-2.5 p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50"
          >
            <div className="text-blue-400 shrink-0">
              {resourceTypeIcons[res.resourceType] || (
                <Package className="h-5 w-5" weight="fill" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-300 truncate">
                {res.description}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-blue-400">
                  SL: {res.quantity}
                </span>
                <Badge className="text-[9px] px-1 h-3.5 bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700">
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
        <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/[0.06] border border-yellow-500/15">
          <Warning className="h-4 w-4 text-yellow-500 shrink-0" weight="fill" />
          <p className="text-xs text-yellow-400/80">
            {result.lowConfidenceWarning ||
              "Cần kiểm tra thủ công trước khi phê duyệt."}
          </p>
        </div>
      )}
      {result.multiDepotRecommended && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/15">
          <Storefront
            className="h-4 w-4 text-blue-400 shrink-0"
            weight="fill"
          />
          <p className="text-xs text-blue-400/80">
            Kế hoạch yêu cầu phối hợp nhiều kho tiếp tế.
          </p>
        </div>
      )}
      {result.specialNotes && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
          <Warning
            className="h-4 w-4 text-amber-500 shrink-0 mt-0.5"
            weight="fill"
          />
          <div>
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">
              Lưu ý đặc biệt
            </p>
            <p className="text-xs text-amber-400/70 leading-relaxed">
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
        className="max-w-sm p-5 rounded-xl bg-red-500/[0.06] border border-red-500/20 text-center"
      >
        <Warning className="h-8 w-8 text-red-500 mx-auto mb-3" weight="fill" />
        <p className="text-sm font-bold text-red-400 mb-1">
          Phân tích thất bại
        </p>
        <p className="text-xs text-red-400/60 mb-4">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15"
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
}: {
  onRetry: () => void;
  onViewPlan: () => void;
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
      className="px-5 py-3 border-t border-orange-500/10 bg-zinc-950 flex items-center gap-2"
    >
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-orange-300"
        onClick={onRetry}
      >
        <ArrowsClockwise className="h-3.5 w-3.5 mr-1.5" />
        Phân tích lại
      </Button>
      <div className="flex-1" />
      <Button
        size="sm"
        className="h-9 text-xs bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg shadow-orange-500/25"
        onClick={onViewPlan}
      >
        <Rocket className="h-3.5 w-3.5 mr-1.5" weight="fill" />
        Xem & Chỉnh sửa Kế hoạch
      </Button>
    </div>
  );
}
