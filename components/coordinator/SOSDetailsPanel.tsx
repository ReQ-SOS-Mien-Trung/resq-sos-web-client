"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { SOSDetailsPanelProps } from "@/type";
import { cn } from "@/lib/utils";
import SOSDetailsPanelShell from "@/components/coordinator/SOSDetailsPanelShell";
import { PRIORITY_BADGE_VARIANT, PRIORITY_LABELS } from "@/lib/priority";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MapPin,
  Stethoscope,
  ForkKnife,
  Anchor,
  Lightning,
  X,
  TreeStructure,
  Users,
  Phone,
  FirstAid,
  Warning,
  WifiHigh,
  WifiSlash,
  Timer,
  Brain,
  ChartBar,
  Info,
} from "@phosphor-icons/react";
import {
  useSOSRequestAnalysis,
  useSOSRequestById,
} from "@/services/sos_request/hooks";
import { useSosFormPriorityRuleConfig } from "@/services/config/hooks";
import { useAuthStore } from "@/stores/auth.store";
import {
  getClothingGenderLabel,
  getFoodDurationLabel,
  getMedicalIssueLabel,
  getMedicalSupportNeedLabel,
  getSupplyLabel,
  getSituationLabel,
  getSosTypeLabel,
  getWaterDurationLabel,
  getWaterRemainingLabel,
} from "@/lib/sos";

// Panel width
const PANEL_WIDTH = 420;

type MedicalIssueTier = "critical" | "severe" | "moderate" | "low" | "other";

const MEDICAL_ISSUE_META: Record<
  string,
  { label: string; icon: string; tier: MedicalIssueTier }
> = {
  UNCONSCIOUS: { label: "Bất tỉnh", icon: "ph:brain", tier: "critical" },
  BREATHING_DIFFICULTY: {
    label: "Khó thở",
    icon: "ph:lungs",
    tier: "critical",
  },
  CHEST_PAIN_STROKE: {
    label: "Đau ngực / Đột quỵ",
    icon: "ph:heartbreak",
    tier: "critical",
  },
  DROWNING: { label: "Đuối nước", icon: "ph:waves", tier: "critical" },
  SEVERELY_BLEEDING: {
    label: "Chảy máu nặng",
    icon: "ph:drop",
    tier: "severe",
  },
  BLEEDING: { label: "Chảy máu", icon: "ph:drop", tier: "severe" },
  BURNS: { label: "Bỏng", icon: "ph:fire", tier: "severe" },
  HEAD_INJURY: {
    label: "Chấn thương đầu",
    icon: "ph:head-circuit",
    tier: "severe",
  },
  CANNOT_MOVE: {
    label: "Không thể di chuyển",
    icon: "ph:wheelchair",
    tier: "severe",
  },
  HIGH_FEVER: {
    label: "Sốt cao",
    icon: "ph:thermometer-hot",
    tier: "moderate",
  },
  DEHYDRATION: { label: "Mất nước", icon: "ph:drop", tier: "moderate" },
  FRACTURE: { label: "Gãy xương", icon: "ph:bone", tier: "moderate" },
  INFANT_NEEDS_MILK: {
    label: "Trẻ sơ sinh cần sữa",
    icon: "ph:baby-bottle",
    tier: "moderate",
  },
  LOST_PARENT: {
    label: "Lạc cha mẹ",
    icon: "ph:person-simple-run",
    tier: "moderate",
  },
  CHRONIC_DISEASE: {
    label: "Cần thuốc bệnh nền",
    icon: "ph:pill",
    tier: "low",
  },
  CONFUSION: {
    label: "Lú lẫn / mất phương hướng",
    icon: "ph:brain",
    tier: "low",
  },
  NEEDS_MEDICAL_DEVICE: {
    label: "Cần thiết bị y tế",
    icon: "ph:stethoscope",
    tier: "low",
  },
  OTHER: { label: "Khác", icon: "ph:first-aid", tier: "other" },
  // Backward compatibility for older payloads
  MOBILITY_IMPAIRMENT: {
    label: "Hạn chế vận động",
    icon: "ph:wheelchair",
    tier: "severe",
  },
  PREGNANCY: { label: "Thai kỳ", icon: "ph:person-simple", tier: "low" },
  MINOR_WOUND: { label: "Vết thương nhẹ", icon: "ph:bandage", tier: "low" },
  SEVERE_WOUND: { label: "Vết thương nặng", icon: "ph:drop", tier: "severe" },
  INFECTION: { label: "Nhiễm trùng", icon: "ph:virus", tier: "low" },
  SHOCK: { label: "Sốc/Ngất", icon: "ph:warning-circle", tier: "moderate" },
  FEVER: { label: "Sốt", icon: "ph:thermometer-hot", tier: "moderate" },
  HYPOTHERMIA: { label: "Hạ thân nhiệt", icon: "ph:snowflake", tier: "low" },
  STARVATION: { label: "Đói lả", icon: "ph:fork-knife", tier: "moderate" },
};

const MEDICAL_ISSUE_CODE_ALIASES: Record<string, string> = {
  CHESTPAIN_STROKE: "CHEST_PAIN_STROKE",
  CANNOTMOVE: "CANNOT_MOVE",
  BURN: "BURNS",
};

function normalizeMedicalIssueCode(code: string): string {
  const normalized = code
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return MEDICAL_ISSUE_CODE_ALIASES[normalized] ?? normalized;
}

function getMedicalIssueMeta(code: string) {
  return MEDICAL_ISSUE_META[normalizeMedicalIssueCode(code)] ?? null;
}

function getMedicalIssueColorClass(code: string): string {
  const tier = getMedicalIssueMeta(code)?.tier ?? "other";

  if (tier === "critical") {
    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
  }

  if (tier === "severe") {
    return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400";
  }

  if (tier === "moderate") {
    return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
  }

  if (tier === "low") {
    return "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
}

function formatScoreValue(value: unknown, fallback = "N/A"): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(1);
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return fallback;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function getNestedValueByKey(source: unknown, key: string): unknown {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const record = source as Record<string, unknown>;
  const variants = Array.from(
    new Set([
      key,
      key.toLowerCase(),
      key.toUpperCase(),
      toCamelCase(key),
      key.replace(/_/g, ""),
    ]),
  );

  for (const variant of variants) {
    if (variant in record) {
      return record[variant];
    }
  }

  for (const value of Object.values(record)) {
    const nestedValue = getNestedValueByKey(value, key);
    if (nestedValue !== undefined) {
      return nestedValue;
    }
  }

  return undefined;
}

function getBreakdownNumber(
  breakdown: Record<string, unknown> | null | undefined,
  key: string,
  fallback?: number | null,
): number | null {
  const value = getNestedValueByKey(breakdown, key);
  const parsedValue = coerceNumber(value);

  if (parsedValue != null) {
    return parsedValue;
  }

  return coerceNumber(fallback);
}

function compactFormulaDetails(
  lines: Array<ReactNode | null | undefined | false>,
): ReactNode[] {
  return lines.filter((line): line is ReactNode => Boolean(line));
}

const ITEMS_NEEDED_LABELS: Record<string, { label: string; icon: string }> = {
  FIRST_AID_KIT: {
    label: "Bộ sơ cứu",
    icon: "ph:first-aid-kit",
  },
  MEDICAL_SUPPLIES: {
    label: "Vật phẩm y tế",
    icon: "ph:pill",
  },
  BANDAGES: {
    label: "Băng gạc",
    icon: "ph:bandage",
  },
  BLOOD_CLOTTING_AGENTS: {
    label: "Thuốc cầm máu",
    icon: "ph:drop",
  },
  LIFE_JACKET: {
    label: "Áo phao",
    icon: "ph:lifebuoy",
  },
  RESCUE_BOAT: {
    label: "Xuồng cứu hộ",
    icon: "ph:boat",
  },
  ROPE: {
    label: "Dây thừng",
    icon: "ph:circles-three",
  },
  RESCUE_EQUIPMENT: {
    label: "Thiết bị cứu hộ",
    icon: "ph:toolbox",
  },
  FIRE_EXTINGUISHER: {
    label: "Bình chữa cháy",
    icon: "ph:fire-extinguisher",
  },
  PROTECTIVE_GEAR: {
    label: "Đồ bảo hộ",
    icon: "ph:shield-check",
  },
  FOOD_RATIONS: {
    label: "Lương thực",
    icon: "ph:package",
  },
  WATER: { label: "Nước uống", icon: "ph:drop" },
  CLOTHING: {
    label: "Quần áo",
    icon: "ph:t-shirt",
  },
  BLANKETS: { label: "Chăn mền", icon: "ph:bed" },
  TRANSPORT_VEHICLE: {
    label: "Phương tiện vận chuyển",
    icon: "ph:ambulance",
  },
  STRETCHER: {
    label: "Cáng cứu thương",
    icon: "ph:first-aid",
  },
};

function FormulaVar({
  name,
  subscript,
}: {
  name: string;
  subscript?: ReactNode;
}) {
  return (
    <span className="font-serif italic text-foreground">
      {name}
      {subscript ? (
        <sub className="ml-0.5 text-[0.55em] leading-none">{subscript}</sub>
      ) : null}
    </span>
  );
}

function SigmaSymbol() {
  return (
    <span className="relative mx-1 inline-flex h-9 w-8 items-center justify-center align-middle font-serif text-3xl leading-none text-foreground">
      <span className="absolute -top-0.5 text-[10px] leading-none">n</span>
      <span>Σ</span>
      <span className="absolute -bottom-0.5 text-[10px] leading-none">i=1</span>
    </span>
  );
}

function FormulaOperator({ children }: { children: ReactNode }) {
  return <span className="mx-2 text-muted-foreground">{children}</span>;
}

function PriorityFormulaNotation({
  formulaTemplate,
  substitutedFormula,
  totalScore,
}: {
  formulaTemplate: string;
  substitutedFormula: string;
  totalScore: string;
}) {
  return (
    <div className="space-y-3 font-serif text-lg leading-snug tracking-normal text-foreground">
      <div className="text-muted-foreground text-base border-b pb-3 border-border/50">
        <FormulaVar name="S" />
        <FormulaOperator>=</FormulaOperator>
        <span className="font-sans text-[0.85em]">{formulaTemplate}</span>
      </div>
      <div className="font-semibold text-xl">
        <FormulaVar name="S" />
        <FormulaOperator>=</FormulaOperator>
        <span className="font-sans text-[0.85em]">{substitutedFormula}</span>
        <FormulaOperator>≈</FormulaOperator>
        <span className="font-sans text-[0.9em] not-italic text-indigo-600 dark:text-indigo-400">
          {totalScore}
        </span>
      </div>
    </div>
  );
}

function InlineMedicalFormula() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <FormulaVar name="M" />
      <span>=</span>
      <SigmaSymbol />
      <span>(</span>
      <FormulaVar name="W" subscript="i" />
      <span>×</span>
      <FormulaVar name="A" subscript="i" />
      <span>)</span>
    </span>
  );
}

function InlineReliefFormula() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <FormulaVar name="R" />
      <span>=</span>
      <FormulaVar name="U" />
      <span>+</span>
      <FormulaVar name="V" />
    </span>
  );
}

function formatPrioritySymbolValues(
  values: Array<[symbol: string, value: unknown]>,
): string {
  return `Giá trị hiện tại: ${values
    .map(([symbol, value]) => `${symbol} = ${formatScoreValue(value)}`)
    .join("; ")}`;
}

function parseItemsNeeded(
  items: string[] | string | null | undefined,
): string[] {
  try {
    if (typeof items === "string") {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    }

    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function getRulePriorityLabel(level?: string | null): string {
  if (level === "Critical") return "Nguy kịch";
  if (level === "High") return "Khẩn cấp cao";
  if (level === "Medium") return "Trung bình";
  if (level === "Low") return "Thấp";
  return level || "Chưa rõ";
}

function getRulePriorityBadgeClass(level?: string | null): string {
  if (level === "Critical") {
    return "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
  }
  if (level === "High") {
    return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
  }
  if (level === "Medium") {
    return "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
  }
  if (level === "Low") {
    return "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
  }
  return "";
}

function formatConfidencePercent(value?: number | null): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalizedPercent = value > 1 ? value : value * 100;
  const clampedPercent = Math.max(0, Math.min(100, normalizedPercent));

  return `${clampedPercent.toFixed(clampedPercent >= 10 ? 0 : 1)}%`;
}

function ParsedMessage({
  text,
  hideInjurySection = false,
}: {
  text?: string | null;
  hideInjurySection?: boolean;
}) {
  if (!text) return null;

  if (!text.includes("|")) {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    );
  }

  const parts = text
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith("[") && part.endsWith("]")) {
          return (
            <div key={index} className="mb-1">
              <Badge
                variant="destructive"
                className="font-bold text-sm px-2 py-0 uppercase tracking-wider rounded"
              >
                {part.replace(/[\[\]]/g, "")}
              </Badge>
            </div>
          );
        }

        const colonIndex = part.indexOf(":");
        if (colonIndex > -1) {
          const title = part.slice(0, colonIndex).trim();
          const content = part.slice(colonIndex + 1).trim();

          if (hideInjurySection && title.toLowerCase() === "bị thương") {
            return null;
          }

          if (
            title.toLowerCase() === "bị thương" &&
            content.includes("(") &&
            content.includes(")")
          ) {
            const injuries = content.includes(";")
              ? content
                  .split(";")
                  .map((i) => i.trim())
                  .filter(Boolean)
              : [content.trim()];

            // Sort injuries by severity: Nghiêm trọng/Nặng > Trung bình > Nhẹ > Unknown
            const getSeverityScore = (injury: string) => {
              const match = injury.match(/(.*?)\s*\((.*?)\)$/);
              if (match) {
                const lowerSeverity = match[2].toLowerCase();
                if (
                  lowerSeverity.includes("nghiêm trọng") ||
                  lowerSeverity.includes("nặng")
                )
                  return 3;
                if (lowerSeverity.includes("trung bình")) return 2;
                if (lowerSeverity.includes("nhẹ")) return 1;
              }
              return 0;
            };

            injuries.sort((a, b) => getSeverityScore(b) - getSeverityScore(a));

            return (
              <div key={index} className="space-y-2 py-1">
                <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <FirstAid className="w-4 h-4 text-red-500" />
                  {title}:
                </span>
                <div className="flex flex-col gap-2">
                  {injuries.map((injury, i) => {
                    const match = injury.match(/(.*?)\s*\((.*?)\)$/);
                    if (match) {
                      const [, text, severity] = match;
                      let severityColor =
                        "bg-muted text-muted-foreground border-border";
                      const lowerSeverity = severity.toLowerCase();

                      if (
                        lowerSeverity.includes("nghiêm trọng") ||
                        lowerSeverity.includes("nặng")
                      ) {
                        severityColor =
                          "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50";
                      } else if (lowerSeverity.includes("trung bình")) {
                        severityColor =
                          "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50";
                      } else if (lowerSeverity.includes("nhẹ")) {
                        severityColor =
                          "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/50";
                      }

                      const infoParts = text.split(":");

                      return (
                        <div
                          key={i}
                          className="flex items-start justify-between gap-3 text-sm bg-background p-2.5 rounded-md border shadow-sm"
                        >
                          <div className="flex-1 min-w-0">
                            {infoParts.length > 1 ? (
                              <p className="leading-snug">
                                <span className="font-medium text-foreground">
                                  {infoParts[0].trim()}:
                                </span>
                                <span className="text-muted-foreground ml-1.5">
                                  {infoParts.slice(1).join(":").trim()}
                                </span>
                              </p>
                            ) : (
                              <p className="leading-snug text-muted-foreground">
                                {text}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-sm px-2.5 py-0.5 h-6 font-medium ${severityColor}`}
                          >
                            {severity}
                          </Badge>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={i}
                        className="text-sm text-muted-foreground bg-background p-2.5 rounded-md border shadow-sm"
                      >
                        {injury}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (title.toLowerCase() === "ghi chú") {
            return (
              <div
                key={index}
                className="bg-muted/30 rounded-lg p-3.5 mt-2 border border-dashed flex gap-2 items-start"
              >
                <span className="text-sm font-semibold text-foreground shrink-0 mt-0.5">
                  {title}:
                </span>
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  {content}
                </p>
              </div>
            );
          }

          return (
            <div key={index} className="text-sm leading-relaxed">
              <span className="font-semibold text-foreground mr-1.5">
                {title}:
              </span>
              <span className="text-muted-foreground">{content}</span>
            </div>
          );
        }

        return (
          <div key={index} className="text-sm text-foreground leading-relaxed">
            {part}
          </div>
        );
      })}
    </div>
  );
}

function FormulaTooltip({
  title,
  formula,
  description,
  details,
}: {
  title: string;
  formula: ReactNode;
  description?: string;
  details?: ReactNode[];
}) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center text-muted-foreground hover:text-foreground transition-colors ml-1.5 focus:outline-none"
          aria-label={`Xem công thức: ${title}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Info className="h-4 w-4" weight="fill" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        align="center"
        sideOffset={12}
        collisionPadding={20}
        className="w-[320px] sm:w-[380px] p-0 shadow-2xl z-[10001] bg-popover border-border/50 overflow-hidden"
      >
        <div className="p-4">
          <ScrollArea className="max-h-[60vh]">
            <div className="pr-4">
              <p className="font-bold text-foreground text-sm tracking-tight">
                {title}
              </p>
              {description ? (
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/90 font-medium">
                  {description}
                </p>
              ) : null}
              <div className="mt-4 overflow-x-auto rounded-lg border bg-muted/30 px-3.5 py-3.5 shadow-inner border-border/40">
                {formula}
              </div>
              {details && details.length > 0 && (
                <div className="mt-4 space-y-2.5 text-[11px] leading-relaxed text-muted-foreground/80">
                  {details.map((line, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-500/50" />
                      <div className="flex-1">{line}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function DetailCard({
  title,
  lines,
}: {
  title: string;
  lines: Array<string | null | undefined>;
}) {
  const normalizedLines = lines.filter(Boolean) as string[];
  if (normalizedLines.length === 0) return null;

  return (
    <div className="rounded-lg border bg-background px-3 py-3 shadow-sm">
      <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="mt-2 space-y-1 text-sm text-foreground">
        {normalizedLines.map((line, index) => (
          <p key={`${title}-${index}`} className="leading-snug">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

const SOSDetailsPanel = ({
  open,
  onOpenChange,
  sosRequest,
  onProcessSOS,
  isProcessing = false,
  nearbySOSRequests,
  hideProcessAction = false,
}: SOSDetailsPanelProps) => {
  const pathname = usePathname();
  const isCoordinatorDashboard =
    pathname?.startsWith("/dashboard/coordinator") ?? false;
  const currentUser = useAuthStore((state) => state.user);
  const [renderedAt] = useState(() => Date.now());

  const {
    data: sosRequestDetailResponse,
    isLoading: isLoadingSOSRequestDetail,
  } = useSOSRequestById(Number(sosRequest?.id) || 0, {
    enabled: !!sosRequest?.id && open && !sosRequest?.evaluation,
  });
  const embeddedEvaluation =
    sosRequestDetailResponse?.sosRequest.evaluation ?? sosRequest?.evaluation;
  const shouldFetchLegacyAnalysis =
    !!sosRequest?.id &&
    open &&
    !isLoadingSOSRequestDetail &&
    !embeddedEvaluation;
  const { data: analysisResponse, isLoading: isLoadingLegacyAnalysis } =
    useSOSRequestAnalysis(Number(sosRequest?.id) || 0, {
      enabled: shouldFetchLegacyAnalysis,
    });
  const { data: priorityRuleConfig, isLoading: isLoadingPriorityRuleConfig } =
    useSosFormPriorityRuleConfig(open);

  if (!sosRequest && !open) return null;

  const evaluationSnapshot = embeddedEvaluation ?? analysisResponse ?? null;
  const ruleEvaluation = evaluationSnapshot?.ruleEvaluation ?? null;
  const aiAnalyses = evaluationSnapshot?.aiAnalyses ?? [];
  const hasAiAnalysis =
    evaluationSnapshot?.hasAiAnalysis ?? aiAnalyses.length > 0;
  const isLoadingEvaluation =
    isLoadingSOSRequestDetail ||
    (shouldFetchLegacyAnalysis && isLoadingLegacyAnalysis);

  const priorityColors = {
    P1: "bg-red-500",
    P2: "bg-orange-500",
    P3: "bg-yellow-500",
    P4: "bg-teal-500",
  };

  const statusLabels = {
    PENDING: { text: "Chờ xử lý", variant: "warning" as const },
    ASSIGNED: { text: "Đã phân công", variant: "info" as const },
    RESCUED: { text: "Đã cứu", variant: "success" as const },
  };

  // Handle case when sosRequest is null but panel is open (during close animation)
  if (!sosRequest) {
    if (isCoordinatorDashboard) {
      return (
        <div
          className={cn(
            "absolute top-0 right-0 h-full z-1000 transition-all duration-300 ease-in-out",
            open
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-full pointer-events-none",
          )}
          style={{ width: PANEL_WIDTH }}
        />
      );
    }

    return (
      <SOSDetailsPanelShell
        open={open}
        onOpenChange={onOpenChange}
        width={PANEL_WIDTH}
      />
    );
  }

  // Get risk factors from AI analysis
  const riskFactors = sosRequest.aiAnalysis?.riskFactors || [];
  const injuredPersons = sosRequest.injuredPersons ?? [];
  const waitTimeMinutes =
    sosRequest.waitTimeMinutes ??
    Math.max(
      0,
      Math.floor((renderedAt - sosRequest.createdAt.getTime()) / 60000),
    );
  const waitDurationLabel =
    waitTimeMinutes >= 1440
      ? `${Math.floor(waitTimeMinutes / 1440)} ngày`
      : `${Math.max(1, Math.floor(waitTimeMinutes / 60))} giờ`;

  const severityLabel = (value?: string) => {
    const normalized = (value || "").toLowerCase();
    if (normalized === "none") {
      return "Chưa đánh giá";
    }
    if (normalized.includes("high") || normalized.includes("cao")) {
      return "Cao";
    }
    if (normalized.includes("critical") || normalized.includes("nghiêm")) {
      return "Nghiêm trọng";
    }
    if (normalized.includes("moderate") || normalized.includes("trung")) {
      return "Trung bình";
    }
    if (normalized.includes("low") || normalized.includes("nhẹ")) {
      return "Nhẹ";
    }
    return value || "Chưa rõ";
  };

  const severityBadgeClass = (value?: string) => {
    const normalized = (value || "").toLowerCase();
    if (normalized.includes("critical") || normalized.includes("nghiêm")) {
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50";
    }
    if (normalized.includes("high") || normalized.includes("cao")) {
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50";
    }
    if (normalized.includes("moderate") || normalized.includes("trung")) {
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50";
    }
    if (normalized.includes("low") || normalized.includes("nhẹ")) {
      return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/50";
    }
    return "bg-muted text-muted-foreground border-border";
  };

  const personTypeLabel = (value?: string) => {
    const normalized = (value || "").toLowerCase();
    if (normalized === "elderly") return "Người già";
    if (normalized === "child") return "Trẻ em";
    if (normalized === "adult") return "Người lớn";
    return "Nạn nhân";
  };

  const issueLabel = (value: string) => getMedicalIssueLabel(value);

  const supplyDetails =
    sosRequest.supplyDetails ?? sosRequest.structuredData?.supply_details;
  const specialDietPersons =
    sosRequest.specialDietPersons ?? supplyDetails?.special_diet_persons ?? [];
  const clothingPersons =
    sosRequest.clothingPersons ?? supplyDetails?.clothing_persons ?? [];
  const medicalSupportNeeds =
    sosRequest.medicalSupportNeeds ?? supplyDetails?.medical_needs ?? [];
  const requestedPeopleMap = new Map<
    string,
    {
      name: string;
      personType?: string | null;
      dietDescription?: string | null;
      gender?: string | null;
      needs: string[];
    }
  >();

  specialDietPersons.forEach((person) => {
    const key = `${person.person_type}-${person.index}`;
    const existing = requestedPeopleMap.get(key);
    requestedPeopleMap.set(key, {
      name: person.custom_name?.trim() || person.name,
      personType: person.person_type,
      dietDescription: person.diet_description,
      gender: existing?.gender,
      needs: Array.from(
        new Set([...(existing?.needs ?? []), "Chế độ ăn đặc biệt"]),
      ),
    });
  });

  clothingPersons.forEach((person) => {
    const key = `${person.person_type}-${person.index}`;
    const existing = requestedPeopleMap.get(key);
    requestedPeopleMap.set(key, {
      name: person.custom_name?.trim() || person.name,
      personType: person.person_type,
      dietDescription: existing?.dietDescription,
      gender: person.gender,
      needs: Array.from(new Set([...(existing?.needs ?? []), "Quần áo"])),
    });
  });

  const requestedPeople = Array.from(requestedPeopleMap.values());

  const legacyScoreRows = [
    {
      key: "medical",
      label: "Y tế",
      value: ruleEvaluation?.medicalScore ?? 0,
      icon: FirstAid,
      colorClass: "text-red-600 dark:text-red-400",
      formula: "Điểm y tế dựa trên mức độ cần can thiệp y tế khẩn cấp (0-100).",
    },
    {
      key: "injury",
      label: "Chấn thương",
      value: ruleEvaluation?.injuryScore ?? 0,
      icon: Warning,
      colorClass: "text-orange-600 dark:text-orange-400",
      formula:
        "Điểm chấn thương tăng khi có người bị thương nặng hoặc nhiều ca cùng lúc (0-100).",
    },
    {
      key: "environment",
      label: "Môi trường",
      value: ruleEvaluation?.environmentScore ?? 0,
      icon: Lightning,
      colorClass: "text-blue-600 dark:text-blue-400",
      formula:
        "Điểm môi trường phản ánh rủi ro từ lũ, thời tiết, ngập, sạt lở... (0-100).",
    },
    {
      key: "mobility",
      label: "Di chuyển",
      value: ruleEvaluation?.mobilityScore ?? 0,
      icon: MapPin,
      colorClass: "text-amber-600 dark:text-amber-400",
      formula:
        "Điểm di chuyển tăng khi nạn nhân khó/không thể tự di chuyển (0-100).",
    },
    {
      key: "food",
      label: "Thực phẩm",
      value: ruleEvaluation?.foodScore ?? 0,
      icon: ForkKnife,
      colorClass: "text-green-600 dark:text-green-400",
      formula:
        "Điểm thực phẩm phản ánh nhu cầu nhu yếu phẩm và nước uống (0-100).",
    },
  ] as const;

  const displayedTotalScore = ruleEvaluation?.totalScore ?? 0;
  const ruleBreakdown = ruleEvaluation?.breakdown ?? null;
  const medicalScoreValue = getBreakdownNumber(
    ruleBreakdown,
    "medical_score",
    ruleEvaluation?.medicalScore ?? null,
  );
  const reliefScoreValue = getBreakdownNumber(
    ruleBreakdown,
    "relief_score",
    ruleEvaluation?.foodScore ?? null,
  );
  const supplyUrgencyScoreValue = getBreakdownNumber(
    ruleBreakdown,
    "supply_urgency_score",
    ruleEvaluation?.injuryScore ?? null,
  );
  const vulnerabilityScoreValue = getBreakdownNumber(
    ruleBreakdown,
    "vulnerability_score",
    ruleEvaluation?.mobilityScore ?? null,
  );
  // Calculate local factors to match BE Rule 3.0 (for display in tooltip)
  const sosTypeKey = (sosRequest.sosType || "").toUpperCase();
  let requestTypeScore =
    priorityRuleConfig?.request_type_scores?.[sosTypeKey] ?? 10;
  const sosTypeStr = (sosRequest.sosType || "").toLowerCase();
  if (sosTypeStr.includes("rescue")) {
    requestTypeScore =
      priorityRuleConfig?.request_type_scores?.RESCUE ?? requestTypeScore ?? 30;
  } else if (sosTypeStr.includes("relief") || sosTypeStr.includes("support")) {
    requestTypeScore =
      priorityRuleConfig?.request_type_scores?.RELIEF ?? requestTypeScore ?? 20;
  } else if (sosTypeStr.includes("both")) {
    requestTypeScore =
      priorityRuleConfig?.request_type_scores?.BOTH ?? requestTypeScore ?? 10;
  }

  let situationMultiplier = 1.0;
  const sitStr = (sosRequest.situation || "").toLowerCase();
  if (
    sitStr.includes("flood") ||
    sitStr.includes("collapse") ||
    sitStr.includes("flooding") ||
    sitStr.includes("building_collapse")
  ) {
    situationMultiplier = 1.5;
  } else if (sitStr.includes("trapped") || sitStr.includes("danger")) {
    situationMultiplier = 1.3;
  } else if (sitStr.includes("cannot_move") || sosRequest.canMove === false) {
    situationMultiplier = 1.2;
  }

  const requestTypeScoreValue = getBreakdownNumber(
    ruleBreakdown,
    "request_type_score",
    requestTypeScore,
  );
  const situationMultiplierValue = getBreakdownNumber(
    ruleBreakdown,
    "situation_multiplier",
    situationMultiplier,
  );

  const backendBreakdownRows = [
    {
      key: "medical_score",
      label: "Y tế",
      value: medicalScoreValue,
      icon: FirstAid,
      colorClass: "text-red-600 dark:text-red-400",
      formula:
        "Điểm y tế do backend cộng từ từng vấn đề y khoa và hệ số tuổi/nhóm đối tượng.",
    },
    {
      key: "request_type_score",
      label: "Loại yêu cầu",
      value: requestTypeScoreValue,
      icon: Anchor,
      colorClass: "text-orange-600 dark:text-orange-400",
      formula: "Điểm nền theo loại SOS như cứu hộ, cứu trợ hoặc kết hợp.",
    },
    {
      key: "relief_score",
      label: "Cứu trợ",
      value: reliefScoreValue,
      icon: ForkKnife,
      colorClass: "text-green-600 dark:text-green-400",
      formula:
        "Điểm cứu trợ là phần backend gộp từ nhu yếu phẩm khẩn cấp và mức dễ tổn thương.",
    },
    {
      key: "supply_urgency_score",
      label: "Nhu yếu phẩm",
      value: supplyUrgencyScoreValue,
      icon: Warning,
      colorClass: "text-amber-600 dark:text-amber-400",
      formula:
        "Mức khẩn cấp của nước, thực phẩm, chăn mền, quần áo và các nhu cầu thiết yếu.",
    },
    {
      key: "vulnerability_score",
      label: "Dễ tổn thương",
      value: vulnerabilityScoreValue,
      icon: Users,
      colorClass: "text-sky-600 dark:text-sky-400",
      formula:
        "Điểm dễ tổn thương của trẻ em, người già, thai phụ hoặc các nhóm cần ưu tiên.",
    },
    {
      key: "situation_multiplier",
      label: "Hệ số tình huống",
      value: situationMultiplierValue,
      icon: Lightning,
      colorClass: "text-indigo-600 dark:text-indigo-400",
      formula:
        "Hệ số nhân cuối cùng theo bối cảnh như mắc kẹt, ngập, vùng nguy hiểm hoặc khó di chuyển.",
    },
  ].filter((row) => row.value != null);

  const hasBackendBreakdownRows = backendBreakdownRows.length >= 3;
  const displayScoreRows = hasBackendBreakdownRows
    ? backendBreakdownRows
    : legacyScoreRows;

  const reliefFormulaScore =
    medicalScoreValue != null &&
    reliefScoreValue != null &&
    situationMultiplierValue != null
      ? Math.round(
          (medicalScoreValue + reliefScoreValue) * situationMultiplierValue,
        )
      : null;
  const requestTypeFormulaScore =
    medicalScoreValue != null &&
    requestTypeScoreValue != null &&
    situationMultiplierValue != null
      ? Math.round(
          (medicalScoreValue + requestTypeScoreValue) *
            situationMultiplierValue,
        )
      : null;
  const shouldUseRequestTypeFormula =
    requestTypeFormulaScore != null &&
    Math.abs(requestTypeFormulaScore - displayedTotalScore) <= 0.5
      ? true
      : reliefFormulaScore != null &&
          Math.abs(reliefFormulaScore - displayedTotalScore) <= 0.5
        ? false
        : Boolean(priorityRuleConfig?.priority_score?.use_request_type_score);
  const derivedFormulaTemplate = shouldUseRequestTypeFormula
    ? "ROUND((request_type_score + medical_score) * situation_multiplier)"
    : "ROUND((medical_score + relief_score) * situation_multiplier)";
  const priorityConfigFormula =
    priorityRuleConfig?.config_version &&
    ruleEvaluation?.configVersion &&
    priorityRuleConfig.config_version === ruleEvaluation.configVersion
      ? priorityRuleConfig.priority_score?.formula?.trim() ||
        derivedFormulaTemplate
      : derivedFormulaTemplate;
  const priorityFormulaUsesRequestType =
    priorityConfigFormula.includes("request_type_score");
  const priorityFormulaUsesMedical =
    priorityConfigFormula.includes("medical_score");
  const priorityFormulaUsesRelief =
    priorityConfigFormula.includes("relief_score");
  const priorityFormulaUsesSituation = priorityConfigFormula.includes(
    "situation_multiplier",
  );
  const priorityValueEntries: Array<[symbol: string, value: unknown]> = [
    priorityFormulaUsesRequestType ? ["T", requestTypeScoreValue] : null,
    priorityFormulaUsesMedical ? ["M", medicalScoreValue] : null,
    priorityFormulaUsesRelief ? ["R", reliefScoreValue] : null,
    priorityFormulaUsesSituation ? ["K", situationMultiplierValue] : null,
  ].filter((entry): entry is [symbol: string, value: unknown] =>
    Boolean(entry),
  );
  const readableFormula = priorityConfigFormula
    .replace(/request_type_score/g, "Điểm Loại YC")
    .replace(/medical_score/g, "Y Tế")
    .replace(/injury_score/g, "Chấn Thương")
    .replace(/environment_score/g, "Môi Trường")
    .replace(/mobility_score/g, "Di Chuyển")
    .replace(/food_score/g, "Thực Phẩm")
    .replace(/relief_score/g, "Cứu Trợ")
    .replace(/situation_multiplier/g, "Hệ số Tình Huống")
    .replace(/ROUND/g, "làm tròn");

  const substitutedFormula = priorityConfigFormula
    .replace(
      /request_type_score/g,
      formatScoreValue(requestTypeScoreValue, "?"),
    )
    .replace(/medical_score/g, formatScoreValue(medicalScoreValue, "?"))
    .replace(
      /injury_score/g,
      formatScoreValue(ruleEvaluation?.injuryScore ?? null, "?"),
    )
    .replace(
      /environment_score/g,
      formatScoreValue(ruleEvaluation?.environmentScore ?? null, "?"),
    )
    .replace(
      /mobility_score/g,
      formatScoreValue(ruleEvaluation?.mobilityScore ?? null, "?"),
    )
    .replace(
      /food_score/g,
      formatScoreValue(ruleEvaluation?.foodScore ?? null, "?"),
    )
    .replace(/relief_score/g, formatScoreValue(reliefScoreValue, "?"))
    .replace(
      /situation_multiplier/g,
      formatScoreValue(situationMultiplierValue, "?"),
    )
    .replace(/ROUND/g, "làm tròn");

  const priorityFormulaContent = (
    <PriorityFormulaNotation
      formulaTemplate={readableFormula}
      substitutedFormula={substitutedFormula}
      totalScore={displayedTotalScore.toFixed(1)}
    />
  );
  const priorityLevelConfig = priorityRuleConfig?.priority_level;
  const priorityThresholdText = priorityLevelConfig
    ? [
        `Ngưỡng ưu tiên: P1 ≥ ${priorityLevelConfig.P1_THRESHOLD}, P2 ≥ ${priorityLevelConfig.P2_THRESHOLD}, P3 ≥ ${priorityLevelConfig.P3_THRESHOLD}.`,
        priorityLevelConfig.rule.includes("has_severe_flag")
          ? "P1/P2 cần có ca nặng để tránh đẩy ưu tiên quá cao."
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    : null;

  const priorityFormulaDetails = compactFormulaDetails([
    ruleEvaluation?.configVersion
      ? `Config đã chấm request: ${ruleEvaluation.configVersion}`
      : null,
    priorityRuleConfig?.config_version
      ? `Config form đang active: ${priorityRuleConfig.config_version}`
      : null,
    ruleEvaluation?.configVersion &&
    priorityRuleConfig?.config_version &&
    ruleEvaluation.configVersion !== priorityRuleConfig.config_version
      ? "Config đang active trên form khác với config đã chấm request này, nên tooltip ưu tiên bám theo breakdown backend."
      : null,
    isLoadingPriorityRuleConfig
      ? "Đang tải công thức active từ backend..."
      : null,
    formatPrioritySymbolValues(priorityValueEntries),
    priorityFormulaUsesMedical ? (
      <span>
        <InlineMedicalFormula />: W là mức độ y tế, A là hệ số tuổi của từng
        người.
      </span>
    ) : null,
    priorityFormulaUsesRelief ? (
      <span>
        <InlineReliefFormula />: điểm cứu trợ gồm nhu yếu phẩm khẩn cấp và mức
        dễ tổn thương.
      </span>
    ) : null,
    priorityThresholdText,
  ]);
  const itemsNeeded = parseItemsNeeded(ruleEvaluation?.itemsNeeded);
  const latestAiAnalysis =
    aiAnalyses.length > 0
      ? [...aiAnalyses].sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )[0]
      : null;
  const aiConfidencePercent = formatConfidencePercent(
    latestAiAnalysis?.confidenceScore,
  );
  const aiPriorityLabel =
    latestAiAnalysis?.suggestedPriority != null
      ? getRulePriorityLabel(latestAiAnalysis.suggestedPriority)
      : null;
  const aiExplanation =
    latestAiAnalysis?.metadata?.analysisResult?.explanation?.trim() ||
    latestAiAnalysis?.explanation?.trim() ||
    null;

  const normalizeContactText = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  const victimDisplayName = normalizeContactText(sosRequest.victimName);
  const victimDisplayPhone = normalizeContactText(sosRequest.victimPhone);
  const victimPrimaryContact = victimDisplayName || victimDisplayPhone;
  const victimSecondaryContact =
    victimDisplayName &&
    victimDisplayPhone &&
    victimDisplayName !== victimDisplayPhone
      ? victimDisplayPhone
      : null;

  const reporterDisplayName = normalizeContactText(
    sosRequest.reporterName ||
      sosRequest.createdByCoordinatorName ||
      (sosRequest.createdByCoordinatorId &&
      currentUser?.userId === sosRequest.createdByCoordinatorId
        ? currentUser.fullName
        : null),
  );
  const reporterDisplayPhone = normalizeContactText(sosRequest.reporterPhone);
  const reporterPrimaryContact = reporterDisplayName || reporterDisplayPhone;
  const reporterSecondaryContact =
    reporterDisplayName &&
    reporterDisplayPhone &&
    reporterDisplayName !== reporterDisplayPhone
      ? reporterDisplayPhone
      : null;
  const reporterRoleLabel = sosRequest.isSentOnBehalf
    ? "Người gửi hộ"
    : "Người gửi SOS";
  const sosTypeLabel = sosRequest.sosType
    ? getSosTypeLabel(sosRequest.sosType)
    : null;

  const renderPanelContent = () => (
    <>
      {/* Header */}
      <div className="p-5 pb-4 border-b shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <div
                className={cn(
                  "w-3 h-3 rounded-full animate-pulse",
                  priorityColors[sosRequest.priority],
                )}
              />
              SOS {sosRequest.id}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Chi tiết yêu cầu SOS
              </p>
              {sosTypeLabel && (
                <Badge
                  variant="outline"
                  className={cn(
                    "max-w-46 px-2 py-0 text-[10px] font-semibold leading-4",
                    sosRequest.sosType.toUpperCase() === "RESCUE"
                      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                      : sosRequest.sosType.toUpperCase() === "RELIEF"
                        ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                        : "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-400",
                  )}
                  title={sosTypeLabel}
                >
                  <span className="block truncate">{sosTypeLabel}</span>
                </Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant={PRIORITY_BADGE_VARIANT[sosRequest.priority]}
              className="text-sm px-3 whitespace-nowrap"
            >
              {PRIORITY_LABELS[sosRequest.priority]}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-muted rounded-lg p-3 text-center">
            <Badge variant={statusLabels[sosRequest.status].variant}>
              {statusLabels[sosRequest.status].text}
            </Badge>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {sosRequest.peopleCount
                ? `${sosRequest.peopleCount.adult + sosRequest.peopleCount.child + sosRequest.peopleCount.elderly} người`
                : "N/A"}
            </div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <Timer className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm text-muted-foreground leading-tight">
              Chờ {waitDurationLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea
        data-sos-panel-scroll-region
        className="flex-1 min-h-0 [&>div]:overscroll-contain"
      >
        <div className="p-5 space-y-5">
          {/* Victim / Reporter Info */}
          {(victimPrimaryContact ||
            sosRequest.address ||
            reporterPrimaryContact ||
            sosRequest.isSentOnBehalf ||
            sosRequest.reporterIsOnline !== undefined) && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Thông tin liên hệ
              </h4>
              <div className="flex items-center justify-between">
                <div className="text-sm space-y-1">
                  {victimPrimaryContact && (
                    <div>
                      <span className="text-sm text-muted-foreground uppercase tracking-wide">
                        Nạn nhân
                      </span>
                      <div className="font-medium">{victimPrimaryContact}</div>
                      {victimSecondaryContact && (
                        <div className="text-sm text-muted-foreground">
                          {victimSecondaryContact}
                        </div>
                      )}
                    </div>
                  )}
                  {reporterPrimaryContact && (
                    <div>
                      <span className="text-sm text-muted-foreground uppercase tracking-wide">
                        {reporterRoleLabel}
                      </span>
                      <div className="font-medium">
                        {reporterPrimaryContact}
                      </div>
                      {reporterSecondaryContact && (
                        <div className="text-sm text-muted-foreground">
                          {reporterSecondaryContact}
                        </div>
                      )}
                    </div>
                  )}
                  {!victimPrimaryContact &&
                    !sosRequest.isSentOnBehalf &&
                    reporterPrimaryContact && (
                      <div className="text-sm text-muted-foreground">
                        Người gửi đang là đầu mối liên hệ cho yêu cầu này.
                      </div>
                    )}
                  {!victimPrimaryContact && !reporterPrimaryContact && (
                    <div className="text-sm text-muted-foreground">
                      Chưa có thông tin liên hệ của người gửi/nạn nhân.
                    </div>
                  )}
                  {sosRequest.address && (
                    <div className="text-sm text-muted-foreground">
                      Địa chỉ nhập tay: {sosRequest.address}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {sosRequest.isSentOnBehalf && (
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                      <Users
                        className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                        weight="fill"
                      />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Gửi hộ
                      </span>
                    </div>
                  )}
                  {sosRequest.reporterIsOnline !== undefined &&
                    (sosRequest.reporterIsOnline ? (
                      <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-200 dark:border-green-800">
                        <WifiHigh
                          className="h-3.5 w-3.5 text-green-600 dark:text-green-400"
                          weight="fill"
                        />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          Gửi qua Internet
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md border border-orange-200 dark:border-orange-800">
                        <WifiSlash
                          className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400"
                          weight="fill"
                        />
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                          Gửi ngoại tuyến (Mesh)
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              {sosRequest.hopCount != null && sosRequest.hopCount > 0 && (
                <div className="text-sm text-muted-foreground mt-2">
                  Tin nhắn qua {sosRequest.hopCount} hop relay
                </div>
              )}
            </div>
          )}

          {/* People Count Details */}
          {sosRequest.peopleCount && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" weight="fill" />
                Số người cần cứu
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {sosRequest.peopleCount.adult}
                  </div>
                  <div className="text-sm text-muted-foreground">Người lớn</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    {sosRequest.peopleCount.child}
                  </div>
                  <div className="text-sm text-muted-foreground">Trẻ em</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {sosRequest.peopleCount.elderly}
                  </div>
                  <div className="text-sm text-muted-foreground">Người già</div>
                </div>
              </div>
            </div>
          )}

          {/* Situation & Conditions */}
          {(sosRequest.situation || sosRequest.canMove !== undefined) && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Warning className="h-4 w-4 text-orange-500" weight="fill" />
                Tình trạng
              </h4>
              <div className="flex flex-wrap gap-2">
                {sosRequest.situation && (
                  <Badge variant="secondary" className="text-sm">
                    {getSituationLabel(sosRequest.situation)}
                  </Badge>
                )}
                {sosRequest.canMove === false && (
                  <Badge variant="secondary" className="text-sm">
                    Không thể di chuyển
                  </Badge>
                )}
                {sosRequest.hasInjured && (
                  <Badge variant="secondary" className="text-sm">
                    Có người bị thương
                  </Badge>
                )}
                {sosRequest.othersAreStable === false && (
                  <Badge variant="secondary" className="text-sm">
                    Tình trạng không ổn định
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Medical Issues */}
          {injuredPersons.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FirstAid className="h-4 w-4 text-rose-500" weight="fill" />
                Người bị thương ({injuredPersons.length})
              </h4>
              <div className="space-y-2">
                {injuredPersons
                  .slice()
                  .sort((a, b) => {
                    const rank = (s?: string) => {
                      const v = (s || "").toLowerCase();
                      if (v.includes("critical") || v.includes("nghiêm"))
                        return 4;
                      if (v.includes("high") || v.includes("cao")) return 3;
                      if (v.includes("moderate") || v.includes("trung"))
                        return 2;
                      if (v.includes("low") || v.includes("nhẹ")) return 1;
                      return 0;
                    };
                    return rank(b.severity) - rank(a.severity);
                  })
                  .map((person) => {
                    const displayName =
                      person.customName?.trim() ||
                      person.name ||
                      `${personTypeLabel(person.personType)} ${person.index}`;
                    return (
                      <div
                        key={`${person.index}-${displayName}`}
                        className="rounded-lg border bg-background px-3 py-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-snug">
                              {displayName}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {personTypeLabel(person.personType)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-sm px-2.5 py-0.5 h-6 shrink-0 font-medium",
                              severityBadgeClass(person.severity),
                            )}
                          >
                            {severityLabel(person.severity)}
                          </Badge>
                        </div>

                        {person.medicalIssues &&
                          person.medicalIssues.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {person.medicalIssues.map((issue, idx) => {
                                const issueMeta = getMedicalIssueMeta(issue);
                                return (
                                  <Badge
                                    key={`${displayName}-${issue}-${idx}`}
                                    variant="secondary"
                                    className="text-sm h-6 px-2 inline-flex items-center gap-1"
                                  >
                                    {issueMeta ? (
                                      <>
                                        <Icon
                                          icon={issueMeta.icon}
                                          className="h-3 w-3"
                                        />
                                        <span>{issueMeta.label}</span>
                                      </>
                                    ) : (
                                      issueLabel(issue)
                                    )}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {sosRequest.medicalIssues && sosRequest.medicalIssues.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FirstAid className="h-4 w-4 text-red-500" weight="fill" />
                Vấn đề y tế
              </h4>
              <div className="flex flex-wrap gap-2">
                {sosRequest.medicalIssues.map((issue, idx) => {
                  const issueMeta = getMedicalIssueMeta(issue);
                  const colorClass = getMedicalIssueColorClass(issue);

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                        colorClass,
                      )}
                    >
                      <span className="text-sm font-medium">
                        {issueMeta ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Icon icon={issueMeta.icon} className="h-4 w-4" />
                            <span>{issueMeta.label}</span>
                          </span>
                        ) : (
                          issue
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Nội dung cầu cứu</h4>
            <div className="bg-muted/30 rounded-lg p-4 border shadow-sm">
              <ParsedMessage
                text={sosRequest.message}
                hideInjurySection={injuredPersons.length > 0}
              />
            </div>
          </div>

          {/* Required Resources */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Yêu cầu hỗ trợ</h4>
            <div className="flex flex-wrap gap-2">
              {sosRequest.needs.medical && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                  <Stethoscope className="h-4 w-4" weight="fill" />
                  <span className="text-sm font-medium">Y tế khẩn cấp</span>
                </div>
              )}
              {sosRequest.needs.boat && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                  <Anchor className="h-4 w-4" weight="fill" />
                  <span className="text-sm font-medium">Cần phương tiện</span>
                </div>
              )}
              {sosRequest.needs.food && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg">
                  <ForkKnife className="h-4 w-4" weight="fill" />
                  <span className="text-sm font-medium">
                    Cần thực phẩm/nước
                  </span>
                </div>
              )}
              {!sosRequest.needs.medical &&
                !sosRequest.needs.boat &&
                !sosRequest.needs.food && (
                  <div className="text-sm text-muted-foreground">
                    Không có yêu cầu cụ thể
                  </div>
                )}
            </div>
          </div>

          {(sosRequest.supplies && sosRequest.supplies.length > 0) ||
          supplyDetails ? (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Chi tiết cứu trợ</h4>

              {sosRequest.supplies && sosRequest.supplies.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Nhu yếu phẩm yêu cầu
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sosRequest.supplies.map((supply) => (
                      <Badge
                        key={supply}
                        variant="outline"
                        className="text-sm px-2 py-1"
                      >
                        {getSupplyLabel(supply)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sosRequest.waterDuration && (
                  <DetailCard
                    title="Nước uống"
                    lines={[
                      `Còn duy trì được: ${getWaterDurationLabel(sosRequest.waterDuration)}`,
                      sosRequest.waterRemaining
                        ? `Lượng còn lại: ${getWaterRemainingLabel(sosRequest.waterRemaining)}`
                        : null,
                    ]}
                  />
                )}
                {sosRequest.foodDuration && (
                  <DetailCard
                    title="Thực phẩm"
                    lines={[
                      `Còn duy trì được: ${getFoodDurationLabel(sosRequest.foodDuration)}`,
                    ]}
                  />
                )}
                {(medicalSupportNeeds.length > 0 ||
                  sosRequest.medicalDescription ||
                  supplyDetails?.medicine_conditions?.length ||
                  supplyDetails?.medicine_other_description) && (
                  <DetailCard
                    title="Y tế"
                    lines={[
                      medicalSupportNeeds.length > 0
                        ? `Hạng mục: ${medicalSupportNeeds
                            .map((item) => getMedicalSupportNeedLabel(item))
                            .join(", ")}`
                        : null,
                      sosRequest.medicalDescription
                        ? `Mô tả: ${sosRequest.medicalDescription}`
                        : null,
                      supplyDetails?.medicine_conditions?.length
                        ? `Legacy: ${supplyDetails.medicine_conditions.join(", ")}`
                        : null,
                      supplyDetails?.medicine_other_description
                        ? `Legacy mô tả: ${supplyDetails.medicine_other_description}`
                        : null,
                    ]}
                  />
                )}
                {(sosRequest.areBlanketsEnough !== undefined ||
                  supplyDetails?.blanket_availability ||
                  supplyDetails?.is_cold_or_wet !== undefined) && (
                  <DetailCard
                    title="Chăn mền"
                    lines={[
                      sosRequest.areBlanketsEnough === true
                        ? "Tình trạng: Còn đủ"
                        : sosRequest.areBlanketsEnough === false
                          ? `Tình trạng: Không đủ${
                              sosRequest.blanketRequestCount
                                ? `, cần thêm ${sosRequest.blanketRequestCount}`
                                : ""
                            }`
                          : supplyDetails?.blanket_availability
                            ? `Legacy: ${supplyDetails.blanket_availability}`
                            : null,
                      supplyDetails?.is_cold_or_wet === true
                        ? "Legacy: Người đang lạnh hoặc ướt"
                        : null,
                    ]}
                  />
                )}
                {sosRequest.otherSupplyDescription && (
                  <DetailCard
                    title="Khác"
                    lines={[sosRequest.otherSupplyDescription]}
                  />
                )}
                {!specialDietPersons.length &&
                  !!supplyDetails?.special_diet_need && (
                    <DetailCard
                      title="Chế độ ăn đặc biệt"
                      lines={[`Legacy: ${supplyDetails.special_diet_need}`]}
                    />
                  )}
                {!clothingPersons.length &&
                  !!supplyDetails?.clothing_status && (
                    <DetailCard
                      title="Quần áo"
                      lines={[`Legacy: ${supplyDetails.clothing_status}`]}
                    />
                  )}
              </div>

              {requestedPeople.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Yêu cầu theo người
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {requestedPeople.map((person, index) => (
                      <div
                        key={`${person.name}-${index}`}
                        className="rounded-lg border bg-background px-3 py-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-snug">
                              {person.name}
                            </p>
                            {person.personType && (
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {person.personType === "ELDERLY"
                                  ? "Người già"
                                  : person.personType === "CHILD"
                                    ? "Trẻ em"
                                    : "Người lớn"}
                              </p>
                            )}
                          </div>
                          {person.gender && (
                            <Badge variant="outline" className="text-sm">
                              {getClothingGenderLabel(person.gender)}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Yêu cầu: {person.needs.join(", ")}
                        </div>
                        {person.dietDescription && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            Chế độ ăn: {person.dietDescription}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* System Analysis & AI Scores */}
          {(ruleEvaluation ||
            isLoadingEvaluation ||
            hasAiAnalysis ||
            riskFactors.length > 0) && (
            <div className="space-y-4 border-t pt-4">
              {isLoadingEvaluation ? (
                <div className="flex animate-pulse items-center gap-2 text-sm text-muted-foreground">
                  <Brain className="h-4 w-4" weight="fill" />
                  Đang tải điểm hệ thống và AI...
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <ChartBar
                      className="h-4 w-4 text-indigo-500"
                      weight="fill"
                    />
                    Thông số hệ thống & AI
                  </h4>

                  <div className="space-y-3 rounded-lg border bg-muted/30 p-3.5 shadow-sm">
                    {ruleEvaluation && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 rounded-md border bg-background p-2.5 shadow-sm">
                          <div className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap pl-1">
                            Rule base
                            <FormulaTooltip
                              title="Công thức tính điểm ưu tiên"
                              formula={priorityFormulaContent}
                              details={priorityFormulaDetails}
                            />
                          </div>

                          <div className="flex items-center gap-3 pr-1">
                            <div className="flex items-center gap-2 text-right">
                              <div className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Tổng
                                <FormulaTooltip
                                  title="Công thức tính điểm ưu tiên"
                                  formula={priorityFormulaContent}
                                  details={priorityFormulaDetails}
                                />
                              </div>
                              <div className="text-base font-bold text-foreground">
                                {ruleEvaluation.totalScore.toFixed(1)}
                              </div>
                            </div>

                            {ruleEvaluation.priorityLevel ? (
                              <>
                                <div className="h-4 w-px bg-border/60 shrink-0"></div>
                                <Badge
                                  variant={
                                    ruleEvaluation.priorityLevel === "Critical"
                                      ? "destructive"
                                      : ruleEvaluation.priorityLevel === "High"
                                        ? "warning"
                                        : ruleEvaluation.priorityLevel === "Low"
                                          ? "success"
                                          : "secondary"
                                  }
                                  className={cn(
                                    "h-6 px-2 text-xs shrink-0",
                                    getRulePriorityBadgeClass(
                                      ruleEvaluation.priorityLevel,
                                    ),
                                  )}
                                >
                                  {getRulePriorityLabel(
                                    ruleEvaluation.priorityLevel,
                                  )}
                                </Badge>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {itemsNeeded.length > 0 && (
                          <div className="border-t border-border/50 pt-3">
                            <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                              <FirstAid className="h-3.5 w-3.5" />
                              Vật phẩm gợi ý
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {itemsNeeded.map((item, idx) => {
                                const config = ITEMS_NEEDED_LABELS[item];

                                return (
                                  <Badge
                                    key={`${item}-${idx}`}
                                    variant="outline"
                                    className="inline-flex h-auto items-center gap-1.5 border-border/60 bg-background px-2.5 py-1 text-sm font-medium"
                                  >
                                    {config ? (
                                      <>
                                        <Icon
                                          icon={config.icon}
                                          className="h-3.5 w-3.5 text-muted-foreground"
                                        />
                                        <span>{config.label}</span>
                                      </>
                                    ) : (
                                      item
                                    )}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={cn(
                        "space-y-3",
                        ruleEvaluation && "border-t border-border/50 pt-3",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
                            <Brain
                              className="h-4 w-4 text-violet-500"
                              weight="fill"
                            />
                            AI
                            <FormulaTooltip
                              title="Cách đọc chỉ số AI"
                              description="AI là phần nhận định của mô hình, không chạy theo công thức điểm cố định như rule base."
                              formula={
                                <div className="space-y-2 text-sm leading-relaxed text-foreground">
                                  <p>
                                    Độ tin cậy được hiển thị theo phần trăm.
                                  </p>
                                  <p>
                                    Nếu backend trả giá trị từ 0 đến 1, giao
                                    diện sẽ quy đổi sang 0 đến 100%.
                                  </p>
                                </div>
                              }
                            />
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            Nhận định của model để hỗ trợ coordinator, có thể
                            đồng thuận hoặc khác nhẹ với rule base.
                          </p>
                        </div>
                        {aiConfidencePercent ? (
                          <Badge
                            variant="secondary"
                            className="h-6 px-2 text-sm"
                          >
                            Tin cậy {aiConfidencePercent}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="h-6 px-2 text-[10px] uppercase tracking-wider font-semibold bg-muted/30 text-muted-foreground/70 border-dashed animate-pulse"
                          >
                            Đang chờ
                          </Badge>
                        )}
                      </div>

                      {riskFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {riskFactors.map((factor, idx) => (
                            <Badge
                              key={`${factor}-${idx}`}
                              variant="outline"
                              className="text-sm border-violet-200 bg-violet-50/30 dark:border-violet-800 dark:bg-violet-900/10"
                            >
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {latestAiAnalysis ? (
                        <div className="rounded-md border border-violet-200 bg-violet-50/50 p-3 shadow-sm dark:border-violet-800/30 dark:bg-violet-900/10">
                          <div className="flex flex-wrap gap-1.5">
                            {aiPriorityLabel ? (
                              <Badge
                                variant="outline"
                                className="border-violet-200 bg-background/80 text-sm dark:border-violet-800/60"
                              >
                                Ưu tiên AI: {aiPriorityLabel}
                              </Badge>
                            ) : null}
                            {latestAiAnalysis.suggestedSeverityLevel ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-sm",
                                  severityBadgeClass(
                                    latestAiAnalysis.suggestedSeverityLevel,
                                  ),
                                )}
                              >
                                Mức độ:{" "}
                                {severityLabel(
                                  latestAiAnalysis.suggestedSeverityLevel,
                                )}
                              </Badge>
                            ) : null}
                            {latestAiAnalysis.modelName ? (
                              <Badge
                                variant="outline"
                                className="text-sm border-violet-200 bg-background/80 dark:border-violet-800/60"
                              >
                                {latestAiAnalysis.modelName}
                              </Badge>
                            ) : null}
                          </div>

                          {aiExplanation ? (
                            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-violet-900/85 dark:text-violet-300/85">
                              {aiExplanation}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic bg-muted/10 rounded-md p-3 border border-dashed border-border/40 flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
                          Đang chờ nhận định chi tiết từ AI...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Same-group SOS requests for cluster selection */}
          {(() => {
            if (nearbySOSRequests.length === 0) return null;
            return (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TreeStructure
                    className="h-4 w-4 text-violet-500"
                    weight="fill"
                  />
                  SOS gần đây trong bán kính 1 km ({nearbySOSRequests.length})
                </h4>
                <div className="space-y-2">
                  {nearbySOSRequests.map((sos) => (
                    <div
                      key={sos.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-violet-50/50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800/30"
                    >
                      <MapPin
                        className={cn(
                          "h-4 w-4 shrink-0",
                          sos.priority === "P1"
                            ? "text-red-500"
                            : sos.priority === "P2"
                              ? "text-orange-500"
                              : sos.priority === "P3"
                                ? "text-yellow-500"
                                : "text-teal-500",
                        )}
                        weight="fill"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={PRIORITY_BADGE_VARIANT[sos.priority]}
                            className="text-sm px-1.5 py-0 h-5"
                          >
                            {PRIORITY_LABELS[sos.priority]}
                          </Badge>
                          <span className="text-sm font-mono text-muted-foreground">
                            SOS {sos.id}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {sos.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </ScrollArea>

      {/* Footer - only show action button for PENDING requests */}
      {!hideProcessAction &&
        sosRequest.status === "PENDING" &&
        nearbySOSRequests.length > 0 && (
          <div className="p-4 border-t shrink-0">
            <Button
              className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-lg shadow-violet-500/20"
              size="lg"
              onClick={() =>
                onProcessSOS([
                  sosRequest.id,
                  ...nearbySOSRequests.map((s) => s.id),
                ])
              }
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Đang gom cụm & AI phân tích...
                </>
              ) : (
                <>
                  <TreeStructure className="h-5 w-5 mr-2" weight="fill" />
                  Gom cụm & AI phân tích ({nearbySOSRequests.length + 1} SOS)
                </>
              )}
            </Button>
          </div>
        )}
    </>
  );

  if (isCoordinatorDashboard) {
    return (
      <div
        className={cn(
          "absolute top-0 right-0 h-full z-1000 transition-all duration-300 ease-in-out",
          open
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-full pointer-events-none",
        )}
        style={{ width: PANEL_WIDTH }}
      >
        <section
          role="dialog"
          aria-modal="false"
          className="h-full min-h-0 bg-background border-l shadow-2xl flex flex-col"
        >
          {renderPanelContent()}
        </section>
      </div>
    );
  }

  return (
    <SOSDetailsPanelShell
      open={open}
      onOpenChange={onOpenChange}
      width={PANEL_WIDTH}
    >
      {renderPanelContent()}
    </SOSDetailsPanelShell>
  );
};

export default SOSDetailsPanel;
