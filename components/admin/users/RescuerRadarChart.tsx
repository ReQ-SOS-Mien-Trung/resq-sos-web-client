"use client";

import { useState, useEffect, useRef } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import type { RescuerScoreEntity } from "@/services/user/type";
import {
  Lightning,
  FirstAidKit,
  Brain,
  ShieldStar,
  HandHeart,
  type Icon,
} from "@phosphor-icons/react";

interface DimensionConfig {
  key: keyof Omit<RescuerScoreEntity, "overallAverageScore" | "evaluationCount">;
  label: string;
  shortLabel: string;
  PhosphorIcon: Icon;
  description: string;
  color: string;
}

const DIMENSIONS: DimensionConfig[] = [
  {
    key: "responseTimeScore",
    label: "Thời gian phản ứng",
    shortLabel: "Phản ứng",
    PhosphorIcon: Lightning,
    description: "Tốc độ từ lúc nhận SOS → đến hiện trường",
    color: "#f59e0b",
  },
  {
    key: "rescueEffectivenessScore",
    label: "Hiệu quả cứu hộ",
    shortLabel: "Hiệu quả",
    PhosphorIcon: FirstAidKit,
    description: "Mức độ hoàn thành nhiệm vụ & xử lý đúng nhu cầu",
    color: "#3b82f6",
  },
  {
    key: "decisionHandlingScore",
    label: "Xử lý tình huống",
    shortLabel: "Xử lý",
    PhosphorIcon: Brain,
    description: "Ưu tiên đúng đối tượng, xử lý tình huống bất ngờ",
    color: "#8b5cf6",
  },
  {
    key: "safetyMedicalSkillScore",
    label: "An toàn & chuyên môn",
    shortLabel: "Chuyên môn",
    PhosphorIcon: ShieldStar,
    description: "Không gây thêm rủi ro, sơ cứu đúng cách",
    color: "#ef4444",
  },
  {
    key: "teamworkCommunicationScore",
    label: "Hợp tác & giao tiếp",
    shortLabel: "Hợp tác",
    PhosphorIcon: HandHeart,
    description: "Làm việc nhóm, giao tiếp & báo cáo",
    color: "#10b981",
  },
];

const MAX_SCORE = 10;

// Astrological star decorations
const STAR_CONFIGS = [
  { top: "7%",  left: "11%", size: 15, char: "✦" },
  { top: "3%",  left: "73%", size: 11, char: "✧" },
  { top: "38%", left: "93%", size: 14, char: "✦" },
  { top: "84%", left: "84%", size: 11, char: "✧" },
  { top: "90%", left: "17%", size: 15, char: "✦" },
  { top: "44%", left: "1%",  size: 11, char: "✧" },
  { top: "16%", left: "5%",  size: 9,  char: "⋆" },
  { top: "68%", left: "90%", size: 9,  char: "⋆" },
  { top: "22%", left: "86%", size: 8,  char: "·" },
  { top: "76%", left: "7%",  size: 8,  char: "·" },
];

function getScoreLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 8) return { label: "Xuất sắc", color: "text-emerald-600", bg: "bg-emerald-500" };
  if (score >= 6) return { label: "Tốt",         color: "text-blue-600",    bg: "bg-blue-500"    };
  if (score >= 4) return { label: "Trung bình", color: "text-amber-600",   bg: "bg-amber-500"   };
  return             { label: "Cần cải thiện", color: "text-red-600", bg: "bg-red-500" };
}

interface TooltipPayload {
  dimKey: string;
  score: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TooltipPayload }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const dim = DIMENSIONS.find((x) => x.key === d.dimKey);
  const level = getScoreLevel(d.score);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-border/60 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm min-w-50">
      <div className="flex items-center gap-2 mb-2">
        {dim && <dim.PhosphorIcon size={16} weight="fill" style={{ color: d.color }} />}
        <span className="text-sm font-semibold tracking-tighter text-foreground">{dim?.label}</span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-2xl font-black tracking-tighter" style={{ color: d.color }}>
          {d.score.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground">/ {MAX_SCORE}</span>
        <span className={cn("text-sm font-semibold px-1.5 py-0.5 rounded-full text-white ml-auto", level.bg)}>
          {level.label}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200/80 overflow-hidden mb-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${(d.score / MAX_SCORE) * 100}%`, backgroundColor: d.color }}
        />
      </div>
      <p className="text-xs text-muted-foreground tracking-tighter leading-relaxed">{dim?.description}</p>
    </div>
  );
}

interface RescuerRadarChartProps {
  score: RescuerScoreEntity;
  className?: string;
}

export function RescuerRadarChart({ score, className }: RescuerRadarChartProps) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const barsRef         = useRef<(HTMLDivElement | null)[]>([]);
  const starRefs        = useRef<(HTMLSpanElement | null)[]>([]);
  const ringRef         = useRef<HTMLDivElement>(null);
  const innerRingRef    = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { scale: 0.8, opacity: 0, y: 32 },
        { scale: 1, opacity: 1, y: 0, duration: 0.85, ease: "back.out(1.5)" },
      );
    }

    const obj = { p: 0 };
    const tween = gsap.to(obj, {
      p: 1,
      duration: 2,
      ease: "power3.out",
      delay: 0.1,
      onUpdate()  { setProgress(obj.p); },
      onComplete() { setProgress(1); },
    });

    const bars = barsRef.current.filter(Boolean) as HTMLDivElement[];
    if (bars.length) {
      gsap.fromTo(
        bars,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.55, stagger: 0.09, ease: "power2.out", delay: 0.5 },
      );
    }

    // Astrological bling: twinkling stars
    starRefs.current.filter(Boolean).forEach((star, i) => {
      gsap.set(star!, { opacity: 0 });
      gsap.to(star!, {
        opacity: 0.5 + (i % 3) * 0.2,
        scale: 0.85 + (i % 4) * 0.13,
        duration: 1.3 + (i % 3) * 0.9,
        repeat: -1,
        yoyo: true,
        delay: 1 + i * 0.38,
        ease: "sine.inOut",
      });
    });

    // Zodiac rotating rings
    if (ringRef.current) {
      gsap.to(ringRef.current, {
        rotation: 360,
        duration: 35,
        repeat: -1,
        ease: "none",
        transformOrigin: "center center",
      });
    }
    if (innerRingRef.current) {
      gsap.to(innerRingRef.current, {
        rotation: -360,
        duration: 22,
        repeat: -1,
        ease: "none",
        transformOrigin: "center center",
      });
    }

    return () => { tween.kill(); };
  }, []);

  const chartData = DIMENSIONS.map((dim) => ({
    subject: dim.shortLabel,
    dimKey:  dim.key,
    score:   score[dim.key] * progress,
    fullMark: MAX_SCORE,
    color:   dim.color,
  }));

  const overallLevel = getScoreLevel(score.overallAverageScore);

  // Guard: no evaluations yet — render nothing (hooks already called above)
  if (!score || score.evaluationCount === 0) return null;

  return (
    <div ref={containerRef} className={cn("space-y-4", className)}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tighter text-foreground flex items-center">
            Biểu đồ năng lực
          </h3>
          <p className="text-sm text-muted-foreground tracking-tighter mt-0.5">
            Đánh giá dựa trên <span className="font-semibold text-primary">{score.evaluationCount} lượt đánh giá</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-xs text-muted-foreground tracking-tighter">Trung bình</p>
            <p className={cn("text-4xl font-black tracking-tighter leading-none mt-0.5", overallLevel.color)}>
              {score.overallAverageScore.toFixed(1)}
            </p>
          </div>
          <span className={cn("text-sm font-semibold px-3 py-1 rounded-full text-white", overallLevel.bg)}>
            {overallLevel.label}
          </span>
        </div>
      </div>

      {/* ── Radar with astrological decorations ── */}
      <div className="relative">

        {/* Rotating zodiac rings */}
        <div
          ref={ringRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[76%] aspect-square rounded-full border border-dashed border-amber-400/35 pointer-events-none"
        />
        <div
          ref={innerRingRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[82%] aspect-square rounded-full border border-dashed border-violet-500/20 pointer-events-none"
        />

        {/* Twinkling stars */}
        {STAR_CONFIGS.map((star, i) => (
          <span
            key={i}
            ref={(el) => { starRefs.current[i] = el; }}
            className="absolute pointer-events-none text-amber-500 select-none opacity-0 font-bold"
            style={{ top: star.top, left: star.left, fontSize: star.size }}
          >
            {star.char}
          </span>
        ))}

        <ResponsiveContainer width="100%" height={430}>
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="62%">
            <defs>
              <linearGradient id="rescuerRadarFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#FF5722" stopOpacity={0.38} />
                <stop offset="100%" stopColor="#FF9800" stopOpacity={0.06} />
              </linearGradient>
              <filter id="rescuerRadarGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feFlood floodColor="#FF5722" floodOpacity="0.35" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <PolarGrid stroke="#7c3aed" strokeOpacity={0.28} strokeDasharray="4 3" />

            <PolarAngleAxis
              dataKey="subject"
              tick={({ x, y, payload }: { x: string | number; y: string | number; payload: { value: string } }) => {
                const nx = Number(x);
                const ny = Number(y);
                const dim = DIMENSIONS.find((d) => d.shortLabel === payload.value);
                const isRight = dim?.key === "rescueEffectivenessScore" || dim?.key === "decisionHandlingScore";
                const isLeft  = dim?.key === "safetyMedicalSkillScore"  || dim?.key === "teamworkCommunicationScore";
                const anchor  = isRight ? "start" : isLeft ? "end" : "middle";
                const dxOff   = isRight ? 6 : isLeft ? -6 : 0;
                return (
                  <g transform={`translate(${nx},${ny})`}>
                    <text
                      textAnchor={anchor}
                      dx={dxOff}
                      dy={5}
                      style={{ fontSize: 14, fontWeight: 600, fill: "currentColor", letterSpacing: "-0.5px" }}
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
            />

            <PolarRadiusAxis angle={90} domain={[0, MAX_SCORE]} tickCount={6} tick={false} axisLine={false} />

            <Radar
              name="Điểm"
              dataKey="score"
              stroke="#FF5722"
              strokeWidth={1.6}
              fill="url(#rescuerRadarFill)"
              filter="url(#rescuerRadarGlow)"
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; index?: number }) => {
                const dim = DIMENSIONS[props.index ?? 0];
                return (
                  <circle
                    key={props.index}
                    cx={props.cx ?? 0}
                    cy={props.cy ?? 0}
                    r={5.5}
                    fill={dim?.color ?? "#FF5722"}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={(props: { cx?: number; cy?: number; index?: number }) => {
                const dim = DIMENSIONS[props.index ?? 0];
                return (
                  <circle
                    key={props.index}
                    cx={props.cx ?? 0}
                    cy={props.cy ?? 0}
                    r={7.5}
                    fill={dim?.color ?? "#FF5722"}
                    stroke="#fff"
                    strokeWidth={2.5}
                  />
                );
              }}
            />

            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Score Legend ── */}
      <div className="grid grid-cols-1 gap-1">
        {DIMENSIONS.map((dim, i) => {
          const val = score[dim.key];
          const pct = (val / MAX_SCORE) * 100;
          return (
            <div
              key={dim.key}
              ref={(el) => { barsRef.current[i] = el; }}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/40 transition-colors opacity-0"
            >
              <dim.PhosphorIcon size={15} weight="fill" style={{ color: dim.color }} className="shrink-0" />
              <span className="text-sm font-medium tracking-tighter text-foreground w-36 truncate shrink-0">
                {dim.label}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-1000 ease-out"
                  style={{
                    width: progress > 0.25 ? `${pct}%` : "0%",
                    backgroundColor: dim.color,
                    transitionDelay: `${i * 90}ms`,
                  }}
                />
              </div>
              <span className="text-sm font-bold tracking-tighter tabular-nums w-8 text-right" style={{ color: dim.color }}>
                {val.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
