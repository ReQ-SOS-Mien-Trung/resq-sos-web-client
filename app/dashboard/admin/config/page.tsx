"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  pointerWithin,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowCounterClockwise,
  CaretDown,
  CaretLeft,
  CaretRight,
  CheckCircle,
  DotsSixVertical,
  FadersIcon,
  FloppyDisk,
  Info,
  Play,
  Plus,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/components/admin";
import { DashboardLayout } from "@/components/admin/dashboard";
import { SupplyRequestPriorityConfigCard } from "@/components/admin/inventory/SupplyRequestPriorityConfigCard";
import { WarningBandConfigCard } from "@/components/admin/inventory/WarningBandConfigCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import {
  useActivateSosPriorityRuleConfig,
  useCreateSosPriorityRuleConfigDraft,
  useDeleteSosPriorityRuleConfigDraft,
  useRescuerScoreVisibilityConfig,
  useSosPriorityRuleConfig,
  useSosPriorityRuleConfigById,
  useSosPriorityRuleConfigVersions,
  useUpdateRescuerScoreVisibilityConfig,
  useUpdateSosPriorityRuleConfigDraft,
  useValidateSosPriorityRuleConfig,
} from "@/services/config";
import type {
  SosExpressionNode,
  SosPriorityRuleConfigDocument,
  SosPriorityRuleConfigEntity,
  UpdateRescuerScoreVisibilityConfigRequest,
} from "@/services/config/type";

type AdminDashboardData = Awaited<ReturnType<typeof getDashboardData>>;

type FormulaField = "vulnerability" | "relief" | "priority";
type ConfigSectionId =
  | "medical"
  | "relief"
  | "threshold"
  | "formula"
  | "validation";
type ConfigHelperPanelId = "flow" | "editCluster";
type FormulaTokenKind =
  | "variable"
  | "number"
  | "operator"
  | "function"
  | "leftParen"
  | "rightParen"
  | "comma";

interface FormulaToken {
  id: string;
  kind: FormulaTokenKind;
  value: string;
}

interface FormulaPaletteItem {
  id: string;
  title: string;
  hint: string;
  tokens: Omit<FormulaToken, "id">[];
}

interface FormulaCompileResult {
  expression: SosExpressionNode | null;
  error: string | null;
  formula: string;
}

type ActiveFormulaDragState =
  | {
      source: "palette";
      item: FormulaPaletteItem;
      tokens: FormulaToken[];
    }
  | {
      source: "canvas";
      tokenId: string;
    };

type FormulaDropTarget =
  | {
      kind: "end";
    }
  | {
      kind: "token";
      tokenId: string;
      insertAfter: boolean;
    };

const EMPTY_FORMULA_TOKENS: Record<FormulaField, FormulaToken[]> = {
  vulnerability: [],
  relief: [],
  priority: [],
};

const DEFAULT_DISPLAY_LABELS: SosPriorityRuleConfigDocument["display_labels"] =
  {
    medical_issues: {
      UNCONSCIOUS: "Bất tỉnh",
      BREATHING_DIFFICULTY: "Khó thở",
      CHEST_PAIN_STROKE: "Đau ngực/đột quỵ",
      DROWNING: "Đuối nước",
      SEVERELY_BLEEDING: "Chảy máu nặng",
      BLEEDING: "Chảy máu",
      BURNS: "Bỏng",
      HEAD_INJURY: "Chấn thương đầu",
      CANNOT_MOVE: "Không thể di chuyển",
      HIGH_FEVER: "Sốt cao",
      DEHYDRATION: "Mất nước",
      FRACTURE: "Gãy xương",
      INFANT_NEEDS_MILK: "Trẻ sơ sinh cần sữa",
      LOST_PARENT: "Trẻ lạc người thân",
      CHRONIC_DISEASE: "Bệnh nền",
      CONFUSION: "Mất phương hướng",
      NEEDS_MEDICAL_DEVICE: "Cần thiết bị y tế",
      OTHER: "Khác",
      PREGNANCY: "Bầu",
      COVID: "Covid",
    },
    situations: {
      FLOODING: "Ngập lụt",
      COLLAPSED: "Sập công trình",
      TRAPPED: "Mắc kẹt",
      DANGER_ZONE: "Vùng nguy hiểm",
      CANNOT_MOVE: "Không thể di chuyển",
      OTHER: "Khác",
      DEFAULT_WHEN_NULL: "Mặc định",
    },
    water_duration: {
      UNDER_6H: "Dưới 6 giờ",
      "6_TO_12H": "6 đến 12 giờ",
      "12_TO_24H": "12 đến 24 giờ",
      "1_TO_2_DAYS": "1 đến 2 ngày",
      OVER_2_DAYS: "Trên 2 ngày",
      NOT_SELECTED: "Chưa chọn",
    },
    food_duration: {
      UNDER_12H: "Dưới 12 giờ",
      "12_TO_24H": "12 đến 24 giờ",
      "1_TO_2_DAYS": "1 đến 2 ngày",
      "2_TO_3_DAYS": "2 đến 3 ngày",
      OVER_3_DAYS: "Trên 3 ngày",
      NOT_SELECTED: "Chưa chọn",
    },
    age_groups: {
      ADULT: "Người lớn",
      CHILD: "Trẻ em",
      ELDERLY: "Người cao tuổi",
    },
    request_types: {
      RESCUE: "Cứu nạn",
      RELIEF: "Tiếp tế",
      OTHER: "Khác",
    },
  };

const INFIX_OPERATOR_META = {
  ADD: { symbol: "+", precedence: 1 },
  SUB: { symbol: "-", precedence: 1 },
  MUL: { symbol: "*", precedence: 2 },
  DIV: { symbol: "/", precedence: 2 },
} as const;

const SYMBOL_TO_OPERATOR = {
  "+": "ADD",
  "-": "SUB",
  "*": "MUL",
  "/": "DIV",
} as const;

const FUNCTION_ARITY = {
  MIN: 2,
  MAX: 2,
  ROUND: 1,
  CEIL: 1,
  FLOOR: 1,
} as const;

const FORMULA_DRAG_ACTIVATION_CONSTRAINT = {
  distance: 10,
};

const FORMULA_SORTABLE_TRANSITION = {
  duration: 240,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

const FORMULA_DROP_ANIMATION = {
  duration: 260,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.2",
      },
    },
  }),
};

const FORMULA_DROP_TARGET_PROGRESS_THRESHOLD = 0.6;

function isTouchList(value: unknown): value is TouchList {
  return (
    typeof value === "object" &&
    value !== null &&
    "length" in value &&
    typeof value.length === "number"
  );
}

function hasTouches(event: Event): event is Event & { touches: TouchList } {
  return isTouchList((event as Event & { touches?: unknown }).touches);
}

function hasChangedTouches(
  event: Event,
): event is Event & { changedTouches: TouchList } {
  return isTouchList(
    (event as Event & { changedTouches?: unknown }).changedTouches,
  );
}

function hasClientCoordinates(
  event: Event,
): event is Event & { clientX: number; clientY: number } {
  const candidate = event as Event & { clientX?: unknown; clientY?: unknown };

  return (
    typeof candidate.clientX === "number" &&
    typeof candidate.clientY === "number"
  );
}

function getEventClientCoordinates(event: Event | null) {
  if (!event) {
    return null;
  }

  if (hasTouches(event) && event.touches.length > 0) {
    const touch = event.touches[0];
    return { x: touch.clientX, y: touch.clientY };
  }

  if (hasChangedTouches(event) && event.changedTouches.length > 0) {
    const touch = event.changedTouches[0];
    return { x: touch.clientX, y: touch.clientY };
  }

  if (hasClientCoordinates(event)) {
    return { x: event.clientX, y: event.clientY };
  }

  return null;
}

const centerFormulaDragOverlayToCursor: Modifier = ({
  activatorEvent,
  activeNodeRect,
  overlayNodeRect,
  transform,
}) => {
  const pointerCoordinates = getEventClientCoordinates(activatorEvent);
  const referenceRect = overlayNodeRect ?? activeNodeRect;

  if (!pointerCoordinates || !activeNodeRect || !referenceRect) {
    return transform;
  }

  return {
    ...transform,
    x:
      transform.x +
      (pointerCoordinates.x - activeNodeRect.left - referenceRect.width / 2),
    y:
      transform.y +
      (pointerCoordinates.y - activeNodeRect.top - referenceRect.height / 2),
  };
};

const FORMULA_DRAG_OVERLAY_MODIFIERS: Modifier[] = [
  centerFormulaDragOverlayToCursor,
];

const VARIABLE_META: Record<
  string,
  { label: string; tone: string; hint: string }
> = {
  medical_score: {
    label: "medical_score",
    tone: "border-rose-500/30 bg-rose-500/10 text-rose-700",
    hint: "Điểm y tế sau khi cộng issue và age weight",
  },
  relief_score: {
    label: "relief_score",
    tone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700",
    hint: "Điểm tiếp tế đã gộp supply urgency và vulnerability",
  },
  situation_multiplier: {
    label: "situation_multiplier",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    hint: "Hệ số bối cảnh dùng ở bước cuối",
  },
  supply_urgency_score: {
    label: "supply_urgency_score",
    tone: "border-sky-500/30 bg-sky-500/10 text-sky-700",
    hint: "Tổng urgency của nước, đồ ăn, chăn và quần áo",
  },
  vulnerability_score: {
    label: "vulnerability_score",
    tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    hint: "Điểm dễ tổn thương sau khi áp cap",
  },
  vulnerability_raw: {
    label: "vulnerability_raw",
    tone: "border-teal-500/30 bg-teal-500/10 text-teal-700",
    hint: "Điểm dễ tổn thương thô trước khi áp cap",
  },
  cap_ratio: {
    label: "cap_ratio",
    tone: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700",
    hint: "Tỷ lệ giới hạn vulnerability theo supply urgency",
  },
  request_type_score: {
    label: "request_type_score",
    tone: "border-orange-500/30 bg-orange-500/10 text-orange-700",
    hint: "Biến dự phòng nếu cần đưa request type quay lại công thức",
  },
};

const FORMULA_FIELD_META: Record<
  FormulaField,
  {
    title: string;
    description: string;
    tone: string;
    suggestedVariables: string[];
  }
> = {
  vulnerability: {
    title: "Vulnerability score",
    description:
      "Biểu thức này dùng raw vulnerability, cap ratio và supply urgency để ra điểm dễ tổn thương cuối cùng.",
    tone: "border-emerald-500/25 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_42%)]",
    suggestedVariables: [
      "vulnerability_raw",
      "supply_urgency_score",
      "cap_ratio",
    ],
  },
  relief: {
    title: "Relief score",
    description:
      "Biểu thức này gộp phần tiếp tế với vulnerability score sau khi raw calculators đã tính xong.",
    tone: "border-sky-500/25 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_42%)]",
    suggestedVariables: ["supply_urgency_score", "vulnerability_score"],
  },
  priority: {
    title: "Priority score",
    description:
      "Biểu thức cuối cùng đưa medical, relief và situation multiplier vào cùng một công thức để ra priority score.",
    tone: "border-amber-500/25 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_42%)]",
    suggestedVariables: [
      "medical_score",
      "relief_score",
      "situation_multiplier",
      "request_type_score",
    ],
  },
};

const FORMULA_PALETTE_GROUPS: Array<{
  title: string;
  description: string;
  items: FormulaPaletteItem[];
}> = [
  {
    title: "Biến runtime",
    description:
      "Những giá trị backend đã tính trước khi evaluator chạy expression tree.",
    items: Object.entries(VARIABLE_META).map(([key, value]) => ({
      id: `variable-${key}`,
      title: value.label,
      hint: value.hint,
      tokens: [{ kind: "variable", value: key }],
    })),
  },
  {
    title: "Toán tử",
    description:
      "Dùng để ghép các biến theo dạng infix như trong công thức thông thường.",
    items: [
      {
        id: "operator-add",
        title: "+",
        hint: "Cộng hai biểu thức",
        tokens: [{ kind: "operator", value: "+" }],
      },
      {
        id: "operator-sub",
        title: "-",
        hint: "Trừ hai biểu thức",
        tokens: [{ kind: "operator", value: "-" }],
      },
      {
        id: "operator-mul",
        title: "*",
        hint: "Nhân hai biểu thức",
        tokens: [{ kind: "operator", value: "*" }],
      },
      {
        id: "operator-div",
        title: "/",
        hint: "Chia hai biểu thức",
        tokens: [{ kind: "operator", value: "/" }],
      },
    ],
  },
  {
    title: "Khối công thức",
    description: "Chèn nhanh skeleton của unary hoặc binary function.",
    items: [
      {
        id: "function-round",
        title: "ROUND(0)",
        hint: "Làm tròn away-from-zero ở backend",
        tokens: [
          { kind: "function", value: "ROUND" },
          { kind: "leftParen", value: "(" },
          { kind: "number", value: "0" },
          { kind: "rightParen", value: ")" },
        ],
      },
      {
        id: "function-ceil",
        title: "CEIL(0)",
        hint: "Làm tròn lên",
        tokens: [
          { kind: "function", value: "CEIL" },
          { kind: "leftParen", value: "(" },
          { kind: "number", value: "0" },
          { kind: "rightParen", value: ")" },
        ],
      },
      {
        id: "function-floor",
        title: "FLOOR(0)",
        hint: "Làm tròn xuống",
        tokens: [
          { kind: "function", value: "FLOOR" },
          { kind: "leftParen", value: "(" },
          { kind: "number", value: "0" },
          { kind: "rightParen", value: ")" },
        ],
      },
      {
        id: "function-min",
        title: "MIN(0, 0)",
        hint: "Lấy giá trị nhỏ hơn",
        tokens: [
          { kind: "function", value: "MIN" },
          { kind: "leftParen", value: "(" },
          { kind: "number", value: "0" },
          { kind: "comma", value: "," },
          { kind: "number", value: "0" },
          { kind: "rightParen", value: ")" },
        ],
      },
      {
        id: "function-max",
        title: "MAX(0, 0)",
        hint: "Lấy giá trị lớn hơn",
        tokens: [
          { kind: "function", value: "MAX" },
          { kind: "leftParen", value: "(" },
          { kind: "number", value: "0" },
          { kind: "comma", value: "," },
          { kind: "number", value: "0" },
          { kind: "rightParen", value: ")" },
        ],
      },
    ],
  },
  {
    title: "Dấu và hằng số",
    description:
      "Dùng để tinh chỉnh vị trí, nhóm toán hạng hoặc nhập literal number.",
    items: [
      {
        id: "punctuation-left",
        title: "(",
        hint: "Mở ngoặc",
        tokens: [{ kind: "leftParen", value: "(" }],
      },
      {
        id: "punctuation-right",
        title: ")",
        hint: "Đóng ngoặc",
        tokens: [{ kind: "rightParen", value: ")" }],
      },
      {
        id: "punctuation-comma",
        title: ",",
        hint: "Phân tách tham số hàm MIN/MAX",
        tokens: [{ kind: "comma", value: "," }],
      },
      {
        id: "number-zero",
        title: "0",
        hint: "Hằng số có thể sửa ngay trên canvas",
        tokens: [{ kind: "number", value: "0" }],
      },
    ],
  },
];

function createTokenId() {
  return `formula-${Math.random().toString(36).slice(2, 10)}`;
}

function materializeTokens(tokens: Omit<FormulaToken, "id">[]): FormulaToken[] {
  return tokens.map((token) => ({
    ...token,
    id: createTokenId(),
  }));
}

function cloneDocument(
  value: SosPriorityRuleConfigDocument,
): SosPriorityRuleConfigDocument {
  return structuredClone(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("vi-VN");
}

function getStatusVariant(status?: string) {
  switch (status) {
    case "Active":
      return "success" as const;
    case "Draft":
      return "warning" as const;
    case "Archived":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function extractConfigDocument(
  config: SosPriorityRuleConfigEntity,
): SosPriorityRuleConfigDocument {
  return {
    config_version: config.config_version,
    is_active: config.is_active,
    medical_severe_issues: config.medical_severe_issues,
    request_type_scores: config.request_type_scores,
    priority_score: config.priority_score,
    medical_score: config.medical_score,
    relief_score: config.relief_score,
    situation_multiplier: config.situation_multiplier,
    priority_level: config.priority_level,
    ui_constraints: config.ui_constraints,
    ui_options: config.ui_options,
    display_labels: {
      ...DEFAULT_DISPLAY_LABELS,
      ...config.display_labels,
      medical_issues: {
        ...DEFAULT_DISPLAY_LABELS.medical_issues,
        ...config.display_labels?.medical_issues,
      },
      situations: {
        ...DEFAULT_DISPLAY_LABELS.situations,
        ...config.display_labels?.situations,
      },
      water_duration: {
        ...DEFAULT_DISPLAY_LABELS.water_duration,
        ...config.display_labels?.water_duration,
      },
      food_duration: {
        ...DEFAULT_DISPLAY_LABELS.food_duration,
        ...config.display_labels?.food_duration,
      },
      age_groups: {
        ...DEFAULT_DISPLAY_LABELS.age_groups,
        ...config.display_labels?.age_groups,
      },
      request_types: {
        ...DEFAULT_DISPLAY_LABELS.request_types,
        ...config.display_labels?.request_types,
      },
    },
  };
}

function isVariableExpressionNode(
  node: SosExpressionNode,
): node is { var: string } {
  return typeof (node as { var?: unknown }).var === "string";
}

function isLiteralExpressionNode(
  node: SosExpressionNode,
): node is { value: number } {
  return (
    typeof (node as { value?: unknown }).value === "number" &&
    typeof (node as { op?: unknown }).op !== "string"
  );
}

function expressionToTokens(node: SosExpressionNode): FormulaToken[] {
  if (isVariableExpressionNode(node)) {
    return materializeTokens([{ kind: "variable", value: node.var }]);
  }

  if (isLiteralExpressionNode(node)) {
    return materializeTokens([
      {
        kind: "number",
        value: String(node.value),
      },
    ]);
  }

  const op = (node as { op?: string }).op;
  const left = (node as { left?: SosExpressionNode }).left;
  const right = (node as { right?: SosExpressionNode }).right;
  const value = (node as { value?: SosExpressionNode }).value;

  if (op && op in INFIX_OPERATOR_META && left && right) {
    return [
      ...materializeTokens([{ kind: "leftParen", value: "(" }]),
      ...expressionToTokens(left),
      ...materializeTokens([
        {
          kind: "operator",
          value:
            INFIX_OPERATOR_META[op as keyof typeof INFIX_OPERATOR_META].symbol,
        },
      ]),
      ...expressionToTokens(right),
      ...materializeTokens([{ kind: "rightParen", value: ")" }]),
    ];
  }

  if ((op === "MIN" || op === "MAX") && left && right) {
    return [
      ...materializeTokens([{ kind: "function", value: op }]),
      ...materializeTokens([{ kind: "leftParen", value: "(" }]),
      ...expressionToTokens(left),
      ...materializeTokens([{ kind: "comma", value: "," }]),
      ...expressionToTokens(right),
      ...materializeTokens([{ kind: "rightParen", value: ")" }]),
    ];
  }

  if ((op === "ROUND" || op === "CEIL" || op === "FLOOR") && value) {
    return [
      ...materializeTokens([{ kind: "function", value: op }]),
      ...materializeTokens([{ kind: "leftParen", value: "(" }]),
      ...expressionToTokens(value),
      ...materializeTokens([{ kind: "rightParen", value: ")" }]),
    ];
  }

  return materializeTokens([{ kind: "number", value: "0" }]);
}

function tokensToLooseFormulaText(tokens: FormulaToken[]): string {
  return tokens
    .map((token) => {
      if (token.kind === "comma") return ",";
      return token.value;
    })
    .join(" ")
    .replace(/\s+\)/g, ")")
    .replace(/\(\s+/g, "(")
    .replace(/\s+,/g, ",")
    .replace(/,\s+/g, ", ");
}

function validateTokenSequence(tokens: FormulaToken[]) {
  if (tokens.length === 0) {
    throw new Error("Công thức đang trống.");
  }

  const frames: Array<{
    type: "group" | "function";
    functionName?: string;
    commaCount: number;
  }> = [];
  let expectOperand = true;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previousToken = tokens[index - 1];
    const nextToken = tokens[index + 1];

    switch (token.kind) {
      case "variable":
      case "number":
        if (!expectOperand) {
          throw new Error(
            `Thiếu toán tử trước \`${token.value}\`. Công thức phải theo cú pháp thông thường như \`1 + 1\`.`,
          );
        }
        expectOperand = false;
        break;
      case "function":
        if (!expectOperand) {
          throw new Error(`Thiếu toán tử trước hàm \`${token.value}\`.`);
        }

        if (!nextToken || nextToken.kind !== "leftParen") {
          throw new Error(
            `Hàm ${token.value} phải đi kèm dấu \`(\` ngay sau đó.`,
          );
        }
        break;
      case "leftParen":
        if (!expectOperand) {
          throw new Error("Thiếu toán tử trước dấu mở ngoặc.");
        }

        frames.push({
          type: previousToken?.kind === "function" ? "function" : "group",
          functionName:
            previousToken?.kind === "function"
              ? previousToken.value
              : undefined,
          commaCount: 0,
        });
        expectOperand = true;
        break;
      case "rightParen": {
        if (expectOperand) {
          throw new Error(
            "Không thể đóng ngoặc khi biểu thức bên trong còn dang dở.",
          );
        }

        const frame = frames.pop();
        if (!frame) {
          throw new Error("Công thức đang thừa dấu đóng ngoặc.");
        }

        if (frame.type === "function") {
          const arity =
            FUNCTION_ARITY[frame.functionName as keyof typeof FUNCTION_ARITY];

          if (!arity) {
            throw new Error(`Hàm ${frame.functionName} chưa được hỗ trợ.`);
          }

          if (frame.commaCount !== arity - 1) {
            throw new Error(
              `Hàm ${frame.functionName} đang thiếu hoặc thừa tham số.`,
            );
          }
        }

        expectOperand = false;
        break;
      }
      case "operator":
        if (expectOperand) {
          throw new Error(
            `Toán tử \`${token.value}\` đang nằm sai vị trí. Hãy đặt nó giữa hai toán hạng.`,
          );
        }
        expectOperand = true;
        break;
      case "comma": {
        if (expectOperand) {
          throw new Error("Dấu phẩy chỉ hợp lệ sau một tham số hoàn chỉnh.");
        }

        const frame = frames[frames.length - 1];
        if (!frame || frame.type !== "function") {
          throw new Error("Dấu phẩy chỉ hợp lệ bên trong MIN/MAX.");
        }

        const arity =
          FUNCTION_ARITY[frame.functionName as keyof typeof FUNCTION_ARITY];
        if (!arity || frame.commaCount >= arity - 1) {
          throw new Error(`Hàm ${frame.functionName} không nhận thêm tham số.`);
        }

        frame.commaCount += 1;
        expectOperand = true;
        break;
      }
    }
  }

  if (expectOperand) {
    throw new Error(
      "Công thức không thể kết thúc bằng toán tử hoặc dấu mở ngoặc.",
    );
  }

  if (frames.length > 0) {
    throw new Error("Công thức đang thiếu dấu đóng ngoặc.");
  }
}

function popAndApply(
  operators: FormulaToken[],
  values: SosExpressionNode[],
): void {
  const token = operators.pop();

  if (!token) {
    throw new Error("Không thể áp dụng toán tử trống.");
  }

  if (token.kind === "operator") {
    const right = values.pop();
    const left = values.pop();
    if (!left || !right) {
      throw new Error("Thiếu toán hạng cho toán tử nhị phân.");
    }

    values.push({
      op: SYMBOL_TO_OPERATOR[token.value as keyof typeof SYMBOL_TO_OPERATOR],
      left,
      right,
    });
    return;
  }

  if (token.kind === "function") {
    const arity = FUNCTION_ARITY[token.value as keyof typeof FUNCTION_ARITY];
    if (!arity) {
      throw new Error(`Hàm ${token.value} chưa được hỗ trợ.`);
    }

    if (arity === 1) {
      const value = values.pop();
      if (!value) {
        throw new Error(`Hàm ${token.value} cần 1 tham số.`);
      }

      values.push({
        op: token.value,
        value,
      });
      return;
    }

    const right = values.pop();
    const left = values.pop();
    if (!left || !right) {
      throw new Error(`Hàm ${token.value} cần 2 tham số.`);
    }

    values.push({
      op: token.value,
      left,
      right,
    });
    return;
  }

  throw new Error(`Token ${token.value} không thể áp dụng như toán tử.`);
}

function parseTokensToExpression(tokens: FormulaToken[]): SosExpressionNode {
  const operators: FormulaToken[] = [];
  const values: SosExpressionNode[] = [];

  validateTokenSequence(tokens);

  for (const token of tokens) {
    switch (token.kind) {
      case "variable":
        values.push({ var: token.value });
        break;
      case "number": {
        const parsed = Number(token.value);
        if (Number.isNaN(parsed)) {
          throw new Error(`Giá trị số không hợp lệ: ${token.value}`);
        }

        values.push({ value: parsed });
        break;
      }
      case "function":
        operators.push(token);
        break;
      case "operator": {
        while (operators.length > 0) {
          const top = operators[operators.length - 1];
          if (top.kind !== "operator") {
            break;
          }

          const currentPrecedence =
            INFIX_OPERATOR_META[
              SYMBOL_TO_OPERATOR[token.value as keyof typeof SYMBOL_TO_OPERATOR]
            ].precedence;
          const topPrecedence =
            INFIX_OPERATOR_META[
              SYMBOL_TO_OPERATOR[top.value as keyof typeof SYMBOL_TO_OPERATOR]
            ].precedence;

          if (topPrecedence < currentPrecedence) {
            break;
          }

          popAndApply(operators, values);
        }

        operators.push(token);
        break;
      }
      case "leftParen":
        operators.push(token);
        break;
      case "comma":
        while (
          operators.length > 0 &&
          operators[operators.length - 1]?.kind !== "leftParen"
        ) {
          popAndApply(operators, values);
        }

        if (
          operators.length === 0 ||
          operators[operators.length - 1]?.kind !== "leftParen"
        ) {
          throw new Error("Dấu phẩy chỉ hợp lệ bên trong MIN/MAX.");
        }
        break;
      case "rightParen":
        while (
          operators.length > 0 &&
          operators[operators.length - 1]?.kind !== "leftParen"
        ) {
          popAndApply(operators, values);
        }

        if (
          operators.length === 0 ||
          operators[operators.length - 1]?.kind !== "leftParen"
        ) {
          throw new Error("Công thức đang thừa dấu đóng ngoặc.");
        }

        operators.pop();

        if (operators[operators.length - 1]?.kind === "function") {
          popAndApply(operators, values);
        }
        break;
    }
  }

  while (operators.length > 0) {
    const top = operators[operators.length - 1];
    if (top.kind === "leftParen" || top.kind === "rightParen") {
      throw new Error("Công thức đang thiếu dấu đóng ngoặc.");
    }

    popAndApply(operators, values);
  }

  if (values.length !== 1) {
    throw new Error(
      "Công thức chưa khép kín. Hãy kiểm tra lại toán tử và toán hạng.",
    );
  }

  return values[0];
}

function compileFormulaTokens(tokens: FormulaToken[]): FormulaCompileResult {
  const inputFormula = tokensToLooseFormulaText(tokens);

  try {
    const expression = parseTokensToExpression(tokens);
    return {
      expression,
      error: null,
      formula: inputFormula,
    };
  } catch (error) {
    return {
      expression: null,
      error:
        error instanceof Error
          ? error.message
          : "Không thể biên dịch công thức này.",
      formula: inputFormula,
    };
  }
}

function humanizeKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveDisplayLabel(
  labels: Record<string, string> | undefined,
  key: string,
) {
  if (labels) {
    const matched = Object.entries(labels).find(
      ([candidate]) =>
        candidate.trim().toLowerCase() === key.trim().toLowerCase(),
    );

    if (matched?.[1]) {
      return matched[1];
    }
  }

  return humanizeKey(key);
}

function updateDocumentAtPath(
  source: SosPriorityRuleConfigDocument,
  path: string[],
  value: unknown,
) {
  const next = cloneDocument(source);
  let cursor: Record<string, unknown> = next as unknown as Record<
    string,
    unknown
  >;

  for (let index = 0; index < path.length - 1; index += 1) {
    cursor = cursor[path[index]] as Record<string, unknown>;
  }

  cursor[path[path.length - 1]] = value;
  return next;
}

function mergeFormulaCompileIntoDocument(
  source: SosPriorityRuleConfigDocument,
  field: FormulaField,
  compile: FormulaCompileResult,
) {
  const next = cloneDocument(source);

  if (field === "vulnerability") {
    next.relief_score.vulnerability_score.formula = compile.formula;
    if (compile.expression) {
      next.relief_score.vulnerability_score.expression = compile.expression;
    }
    return next;
  }

  if (field === "relief") {
    next.relief_score.formula = compile.formula;
    if (compile.expression) {
      next.relief_score.expression = compile.expression;
    }
    return next;
  }

  next.priority_score.formula = compile.formula;
  if (compile.expression) {
    next.priority_score.expression = compile.expression;
  }
  return next;
}

function getFormulaFieldExpression(
  document: SosPriorityRuleConfigDocument,
  field: FormulaField,
) {
  if (field === "vulnerability") {
    return document.relief_score.vulnerability_score.expression;
  }

  if (field === "relief") {
    return document.relief_score.expression;
  }

  return document.priority_score.expression;
}

function buildFormulaState(document: SosPriorityRuleConfigDocument) {
  return {
    vulnerability: expressionToTokens(
      getFormulaFieldExpression(document, "vulnerability"),
    ),
    relief: expressionToTokens(getFormulaFieldExpression(document, "relief")),
    priority: expressionToTokens(
      getFormulaFieldExpression(document, "priority"),
    ),
  };
}

function getTokenTone(token: FormulaToken) {
  if (token.kind === "variable") {
    return (
      VARIABLE_META[token.value]?.tone ??
      "border-slate-500/20 bg-slate-500/10 text-slate-700"
    );
  }

  if (token.kind === "operator" || token.kind === "function") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  }

  if (token.kind === "number") {
    return "border-slate-500/20 bg-slate-500/10 text-slate-700";
  }

  return "border-border/60 bg-muted/70 text-muted-foreground";
}

function getTokenLabel(token: FormulaToken) {
  if (token.kind === "variable") {
    return VARIABLE_META[token.value]?.label ?? token.value;
  }

  return token.value;
}

function areDropTargetsEqual(
  left: FormulaDropTarget | null,
  right: FormulaDropTarget | null,
) {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "end") {
    return true;
  }

  return (
    right.kind === "token" &&
    left.tokenId === right.tokenId &&
    left.insertAfter === right.insertAfter
  );
}

function clampFormulaInsertIndex(index: number, tokenCount: number) {
  const safeTokenCount = Math.max(tokenCount, 0);
  return Math.min(Math.max(index, 0), safeTokenCount);
}

function describeFormulaInsertionPoint(tokens: FormulaToken[], index: number) {
  const normalizedIndex = clampFormulaInsertIndex(index, tokens.length);

  if (tokens.length === 0) {
    return "Canvas đang trống";
  }

  if (normalizedIndex === 0) {
    return `Trước ${getTokenLabel(tokens[0])}`;
  }

  if (normalizedIndex === tokens.length) {
    return `Sau ${getTokenLabel(tokens[tokens.length - 1])}`;
  }

  return `Giữa ${getTokenLabel(tokens[normalizedIndex - 1])} và ${getTokenLabel(
    tokens[normalizedIndex],
  )}`;
}

function getMetricCardsGridTemplateColumns(versionValue: string) {
  const normalizedLength = versionValue.trim().length;

  if (normalizedLength >= 34) {
    return "minmax(0,2.35fr) minmax(0,0.88fr) minmax(0,0.88fr) minmax(0,0.88fr)";
  }

  if (normalizedLength >= 28) {
    return "minmax(0,2.1fr) minmax(0,0.93fr) minmax(0,0.93fr) minmax(0,0.93fr)";
  }

  if (normalizedLength >= 22) {
    return "minmax(0,1.8fr) minmax(0,0.98fr) minmax(0,0.98fr) minmax(0,0.98fr)";
  }

  return "repeat(4,minmax(0,1fr))";
}

function FieldShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
      <div className="mb-3 space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="text-xs tracking-tight text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function SectionShell({
  eyebrow,
  title,
  description,
  badge,
  className,
  collapsible,
  open = true,
  onToggle,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: ReactNode;
  className?: string;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn("overflow-hidden border-border/60 shadow-sm", className)}
    >
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              {eyebrow}
            </p>
            <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
            <CardDescription className="max-w-3xl text-sm tracking-tighter">
              {description}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {badge}
            {collapsible && onToggle && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onToggle}
                className="bg-background/80"
              >
                {open ? "Thu gọn" : "Mở cụm"}
                <CaretDown
                  size={14}
                  className={cn(
                    "transition-transform",
                    open ? "rotate-0" : "-rotate-90",
                  )}
                />
              </Button>
            )}
          </div>
        </div>
        {collapsible && !open && summary ? (
          <div className="mt-4">{summary}</div>
        ) : null}
      </CardHeader>
      {open ? (
        <CardContent className="space-y-4 p-5">{children}</CardContent>
      ) : null}
    </Card>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-border/60 px-4 py-3 shadow-sm",
        accent,
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 min-w-0 text-lg font-semibold leading-tight tracking-tight text-foreground",
          valueClassName,
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-xs tracking-tighter">{hint}</p>
    </div>
  );
}

function TogglePill({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors",
        value
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-border/60 bg-background/80",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {label}
        </p>
        <p className="text-xs tracking-tight text-muted-foreground">
          {description}
        </p>
      </div>
      <Badge variant={value ? "success" : "outline"}>
        {value ? "Bật" : "Tắt"}
      </Badge>
    </button>
  );
}

function StringListEditor({
  title,
  description,
  items,
  labels,
  disabled,
  placeholder,
  onChange,
}: {
  title: string;
  description: string;
  items: string[];
  labels?: Record<string, string>;
  disabled?: boolean;
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <FieldShell title={title} description={description}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <div
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-3 py-1.5 text-xs font-medium tracking-tight"
            >
              <div className="leading-tight">
                <p>{resolveDisplayLabel(labels, item)}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {item}
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange(items.filter((current) => current !== item))
                }
                className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
              >
                <Trash size={12} />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-xs tracking-tight text-muted-foreground">
              Chưa có mục nào trong nhóm này.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={draft}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || !draft.trim()}
            onClick={() => {
              const nextValue = draft.trim();
              if (!nextValue || items.includes(nextValue)) {
                return;
              }

              onChange([...items, nextValue]);
              setDraft("");
            }}
          >
            <Plus size={14} />
            Thêm
          </Button>
        </div>
      </div>
    </FieldShell>
  );
}

function NumericRecordEditor<TEntries extends object>({
  title,
  description,
  entries,
  labels,
  disabled,
  entriesScrollClassName,
  onChange,
}: {
  title: string;
  description: string;
  entries: TEntries;
  labels?: Record<string, string>;
  disabled?: boolean;
  entriesScrollClassName?: string;
  onChange: (next: TEntries) => void;
}) {
  const [draftKey, setDraftKey] = useState("");
  const [draftValue, setDraftValue] = useState("0");
  const numericEntries = entries as unknown as Record<string, number>;

  return (
    <FieldShell title={title} description={description}>
      <div className="space-y-3">
        <div
          className={cn(
            entriesScrollClassName,
            entriesScrollClassName &&
              "overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/50",
          )}
        >
          <div className={cn("space-y-3", entriesScrollClassName && "pr-3")}>
            {Object.entries(numericEntries).map(([key, value]) => (
              <div
                key={key}
                className="grid gap-2 rounded-2xl border border-border/60 bg-background/80 p-3 sm:grid-cols-[minmax(0,1fr)_132px_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                    {resolveDisplayLabel(labels, key)}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {key}
                  </p>
                </div>
                <Input
                  type="number"
                  step="any"
                  disabled={disabled}
                  value={value}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (Number.isNaN(nextValue)) {
                      return;
                    }

                    onChange({
                      ...numericEntries,
                      [key]: nextValue,
                    } as unknown as TEntries);
                  }}
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => {
                    const nextEntries = { ...numericEntries };
                    delete nextEntries[key];
                    onChange(nextEntries as unknown as TEntries);
                  }}
                >
                  <Trash size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_132px_auto]">
          <Input
            value={draftKey}
            disabled={disabled}
            onChange={(event) => setDraftKey(event.target.value)}
            placeholder="Thêm KEY_MỚI"
          />
          <Input
            type="number"
            step="any"
            disabled={disabled}
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || !draftKey.trim()}
            onClick={() => {
              const key = draftKey.trim();
              const value = Number(draftValue);
              if (!key || Number.isNaN(value)) {
                return;
              }

              onChange({
                ...numericEntries,
                [key]: value,
              } as unknown as TEntries);
              setDraftKey("");
              setDraftValue("0");
            }}
          >
            <Plus size={14} />
          </Button>
        </div>
      </div>
    </FieldShell>
  );
}

function KeyValueTextGrid({
  title,
  description,
  values,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  values: Array<{
    keyName: string;
    label: string;
    value: string | number;
    inputType?: "text" | "number";
    step?: string;
  }>;
  disabled?: boolean;
  onChange: (keyName: string, value: string | number) => void;
}) {
  return (
    <FieldShell title={title} description={description}>
      <div className="grid gap-3 md:grid-cols-2">
        {values.map((item) => (
          <div
            key={item.keyName}
            className="rounded-2xl border border-border/60 bg-background/80 p-3"
          >
            <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {item.label}
            </Label>
            <Input
              className="mt-2"
              type={item.inputType ?? "text"}
              step={item.step}
              disabled={disabled}
              value={item.value}
              onChange={(event) => {
                if (item.inputType === "number") {
                  const nextValue = Number(event.target.value);
                  if (Number.isNaN(nextValue)) {
                    return;
                  }

                  onChange(item.keyName, nextValue);
                  return;
                }

                onChange(item.keyName, event.target.value);
              }}
            />
          </div>
        ))}
      </div>
    </FieldShell>
  );
}

function PaletteItemButton({
  item,
  onInsert,
  isHighlighted,
  disabled,
}: {
  item: FormulaPaletteItem;
  onInsert: (item: FormulaPaletteItem) => void;
  isHighlighted?: boolean;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.id}`,
    data: {
      source: "palette",
      item,
    },
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all select-none",
        isHighlighted
          ? "border-foreground/20 bg-foreground/[0.045]"
          : "border-border/60 bg-background/70",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        {...listeners}
        {...attributes}
        onClick={(event) => event.stopPropagation()}
        className="mt-0.5 rounded-full border border-border/60 bg-background/80 p-2 text-muted-foreground transition-colors touch-none hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <DotsSixVertical size={14} />
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onInsert(item)}
        className="flex-1 space-y-1 text-left disabled:cursor-not-allowed"
      >
        <p className="font-mono text-sm font-semibold tracking-tight text-foreground">
          {item.title}
        </p>
        <p className="text-xs tracking-tight text-muted-foreground">
          {item.hint}
        </p>
        <p className="text-[11px] tracking-tight text-muted-foreground/80">
          Bấm vào để chèn tại vị trí đang chọn.
        </p>
      </button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="ml-auto shrink-0"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onInsert(item);
        }}
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}

function FormulaInsertionSlot({
  compact,
  dragActive,
  isPreviewTarget,
  isActive,
  disabled,
  onSelect,
}: {
  compact?: boolean;
  dragActive?: boolean;
  isPreviewTarget?: boolean;
  isActive?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label="Chọn vị trí chèn công thức"
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full border border-dashed text-[10px] font-medium uppercase tracking-[0.14em] transition-all duration-150",
        compact ? "h-11 min-w-[28px] px-1.5" : "h-12 min-w-[112px] px-3",
        dragActive
          ? "border-border/50 bg-background/45"
          : "border-border/30 bg-transparent hover:border-border/50 hover:bg-background/40",
        isActive &&
          !dragActive &&
          "border-primary/30 bg-primary/[0.06] text-foreground",
        isPreviewTarget &&
          (compact ? "min-w-[56px] px-2" : "min-w-[72px] px-2"),
        isPreviewTarget
          ? "border-foreground/30 bg-foreground/[0.06] text-foreground"
          : undefined,
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <Plus
        size={10}
        className={cn(
          "shrink-0",
          !isActive && !isPreviewTarget && "text-muted-foreground/70",
        )}
      />
      {(isActive || isPreviewTarget || !compact) && (
        <span className="whitespace-nowrap">
          {isPreviewTarget ? "Thả vào đây" : "Chèn"}
        </span>
      )}
    </button>
  );
}

function FormulaPreviewTokenChip({
  token,
  floating,
}: {
  token: FormulaToken;
  floating?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl border border-dashed px-3 py-2 shadow-sm",
        getTokenTone(token),
        "pointer-events-none opacity-60",
        floating && "bg-background/95 shadow-xl backdrop-blur-sm",
      )}
    >
      <div className="rounded-full p-1 text-muted-foreground/80">
        <DotsSixVertical size={14} />
      </div>
      <span className="font-mono text-sm font-semibold tracking-tight">
        {token.kind === "number" ? token.value : getTokenLabel(token)}
      </span>
    </div>
  );
}

function SortableFormulaTokenChip({
  token,
  index,
  totalTokens,
  isInsertAnchor,
  disabled,
  onChange,
  onMoveLeft,
  onMoveRight,
  onRemove,
  onSelectInsertAfter,
}: {
  token: FormulaToken;
  index: number;
  totalTokens: number;
  isInsertAnchor?: boolean;
  disabled?: boolean;
  onChange: (id: string, value: string) => void;
  onMoveLeft: (id: string) => void;
  onMoveRight: (id: string) => void;
  onRemove: (id: string) => void;
  onSelectInsertAfter: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: token.id,
    data: {
      source: "canvas",
      tokenId: token.id,
    },
    disabled,
    transition: FORMULA_SORTABLE_TRANSITION,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={() => {
        if (!disabled) {
          onSelectInsertAfter(index + 1);
        }
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm select-none will-change-transform",
        getTokenTone(token),
        !disabled && "cursor-pointer",
        isInsertAnchor &&
          "ring-2 ring-foreground/15 ring-offset-2 ring-offset-background",
        isDragging && "z-50 hidden",
      )}
    >
      <div
        className={cn(
          "rounded-full p-1 text-muted-foreground touch-none",
          disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        )}
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical size={14} />
      </div>

      {token.kind === "number" ? (
        <Input
          type="number"
          step="any"
          disabled={disabled}
          value={token.value}
          onChange={(event) => onChange(token.id, event.target.value)}
          onClick={(event) => event.stopPropagation()}
          className="h-8 w-24 border-border/50 bg-background/70 font-mono text-xs"
        />
      ) : (
        <span className="font-mono text-sm font-semibold tracking-tight">
          {getTokenLabel(token)}
        </span>
      )}

      <button
        type="button"
        disabled={disabled || index === 0}
        onClick={(event) => {
          event.stopPropagation();
          onMoveLeft(token.id);
        }}
        className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        aria-label="Di chuyển sang trái"
      >
        <CaretLeft size={12} />
      </button>
      <button
        type="button"
        disabled={disabled || index >= totalTokens - 1}
        onClick={(event) => {
          event.stopPropagation();
          onMoveRight(token.id);
        }}
        className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        aria-label="Di chuyển sang phải"
      >
        <CaretRight size={12} />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onRemove(token.id);
        }}
        className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
      >
        <Trash size={12} />
      </button>
    </div>
  );
}

function FormulaCanvas({
  id,
  tokens,
  disabled,
  activeField,
  compile,
  onTokensChange,
}: {
  id: FormulaField;
  tokens: FormulaToken[];
  disabled?: boolean;
  activeField: FormulaField;
  compile: FormulaCompileResult;
  onTokensChange: (next: FormulaToken[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: FORMULA_DRAG_ACTIVATION_CONSTRAINT,
    }),
  );
  const [activeDrag, setActiveDrag] = useState<ActiveFormulaDragState | null>(
    null,
  );
  const [dropTarget, setDropTarget] = useState<FormulaDropTarget | null>(null);
  const [insertIndex, setInsertIndex] = useState(() => tokens.length);
  const previousFieldIdRef = useRef(id);

  useEffect(() => {
    if (previousFieldIdRef.current === id) {
      return;
    }

    previousFieldIdRef.current = id;
    setInsertIndex(tokens.length);
  }, [id, tokens.length]);

  useEffect(() => {
    setInsertIndex((currentIndex) =>
      clampFormulaInsertIndex(currentIndex, tokens.length),
    );
  }, [tokens.length]);

  const visibleTokens = useMemo(() => {
    if (activeDrag?.source !== "canvas") {
      return tokens;
    }

    return tokens.filter((token) => token.id !== activeDrag.tokenId);
  }, [activeDrag, tokens]);
  const visibleTokenIds = useMemo(
    () => new Set(visibleTokens.map((token) => token.id)),
    [visibleTokens],
  );
  const { setNodeRef, isOver } = useDroppable({
    id: `${id}-canvas`,
    disabled,
  });
  const collisionDetectionStrategy = useMemo<CollisionDetection>(
    () => (args) => {
      const relevantContainers = args.droppableContainers.filter(
        (container) => {
          const containerId = container.id?.toString();
          return (
            containerId === `${id}-canvas` ||
            (containerId ? visibleTokenIds.has(containerId) : false)
          );
        },
      );

      const normalizedArgs = {
        ...args,
        droppableContainers:
          relevantContainers.length > 0
            ? relevantContainers
            : args.droppableContainers,
      };

      const pointerCollisions = pointerWithin(normalizedArgs);
      const tokenPointerCollisions = pointerCollisions.filter(
        (collision) => collision.id?.toString() !== `${id}-canvas`,
      );
      if (tokenPointerCollisions.length > 0) {
        return tokenPointerCollisions;
      }

      const tokenContainers = normalizedArgs.droppableContainers.filter(
        (container) => container.id?.toString() !== `${id}-canvas`,
      );
      if (tokenContainers.length > 0) {
        const nearestTokenCollisions = closestCenter({
          ...normalizedArgs,
          droppableContainers: tokenContainers,
        });
        if (nearestTokenCollisions.length > 0) {
          return nearestTokenCollisions;
        }
      }

      if (pointerCollisions.length > 0) {
        return pointerCollisions;
      }

      return closestCenter(normalizedArgs);
    },
    [id, visibleTokenIds],
  );

  const insertTokens = (
    item: FormulaPaletteItem,
    index = clampFormulaInsertIndex(insertIndex, tokens.length),
  ) => {
    const payload = materializeTokens(item.tokens);
    const normalizedIndex = Math.min(Math.max(index, 0), tokens.length);
    onTokensChange([
      ...tokens.slice(0, normalizedIndex),
      ...payload,
      ...tokens.slice(normalizedIndex),
    ]);
    setInsertIndex(normalizedIndex + payload.length);
  };

  const insertPreparedTokens = (
    payload: FormulaToken[],
    index = clampFormulaInsertIndex(insertIndex, tokens.length),
  ) => {
    const normalizedIndex = Math.min(Math.max(index, 0), tokens.length);
    onTokensChange([
      ...tokens.slice(0, normalizedIndex),
      ...payload,
      ...tokens.slice(normalizedIndex),
    ]);
    setInsertIndex(normalizedIndex + payload.length);
  };

  const resolveDropTarget = (
    event: DragOverEvent | DragEndEvent,
  ): FormulaDropTarget | null => {
    const overId = event.over?.id?.toString();
    if (!overId) {
      return null;
    }

    if (overId === `${id}-canvas`) {
      return {
        kind: "end",
      };
    }

    if (!visibleTokenIds.has(overId) || !event.over) {
      return null;
    }

    const activeRect =
      event.active.rect.current.translated ?? event.active.rect.current.initial;
    const overRect = event.over.rect;
    const activeCenterX = activeRect.left + activeRect.width / 2;
    const activeCenterY = activeRect.top + activeRect.height / 2;
    const overCenterY = overRect.top + overRect.height / 2;
    const isRowTransition =
      Math.abs(activeCenterY - overCenterY) > overRect.height * 0.45;
    const horizontalProgress =
      (activeCenterX - overRect.left) / Math.max(overRect.width, 1);
    const verticalProgress =
      (activeCenterY - overRect.top) / Math.max(overRect.height, 1);
    const insertAfter = isRowTransition
      ? verticalProgress > FORMULA_DROP_TARGET_PROGRESS_THRESHOLD
      : horizontalProgress > FORMULA_DROP_TARGET_PROGRESS_THRESHOLD;

    return {
      kind: "token",
      tokenId: overId,
      insertAfter,
    };
  };

  const getPreviewIndex = (target: FormulaDropTarget | null) => {
    if (!target) {
      return null;
    }

    if (target.kind === "end") {
      return visibleTokens.length;
    }

    const hoveredIndex = visibleTokens.findIndex(
      (token) => token.id === target.tokenId,
    );
    if (hoveredIndex === -1) {
      return null;
    }

    return hoveredIndex + (target.insertAfter ? 1 : 0);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const payload = event.active.data.current as
      | { source: "palette"; item: FormulaPaletteItem }
      | { source: "canvas"; tokenId: string }
      | undefined;

    if (!payload) {
      setActiveDrag(null);
      setDropTarget(null);
      return;
    }

    if (payload.source === "palette") {
      setActiveDrag({
        source: "palette",
        item: payload.item,
        tokens: materializeTokens(payload.item.tokens),
      });
      return;
    }

    setActiveDrag({
      source: "canvas",
      tokenId: payload.tokenId,
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const nextTarget = resolveDropTarget(event);
    setDropTarget((currentTarget) =>
      areDropTargetsEqual(currentTarget, nextTarget)
        ? currentTarget
        : nextTarget,
    );
  };

  const resetDragState = () => {
    setActiveDrag(null);
    setDropTarget(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const payload = event.active.data.current as
      | { source: "palette"; item: FormulaPaletteItem }
      | { source: "canvas"; tokenId: string }
      | undefined;
    const target = resolveDropTarget(event);
    const previewIndex = getPreviewIndex(target);

    resetDragState();

    if (!payload || previewIndex === null) {
      return;
    }

    if (payload.source === "palette") {
      if (activeDrag?.source === "palette") {
        insertPreparedTokens(activeDrag.tokens, previewIndex);
        return;
      }

      insertTokens(payload.item, previewIndex);
      return;
    }

    const activeIndex = tokens.findIndex(
      (token) => token.id === payload.tokenId,
    );
    if (activeIndex === -1) {
      return;
    }

    if (activeIndex === previewIndex) {
      return;
    }

    onTokensChange(arrayMove(tokens, activeIndex, previewIndex));
    setInsertIndex(clampFormulaInsertIndex(previewIndex + 1, tokens.length));
  };

  const previewIndex = getPreviewIndex(dropTarget);
  const effectiveInsertIndex =
    activeDrag && previewIndex !== null ? previewIndex : insertIndex;
  const insertionDescription = useMemo(
    () => describeFormulaInsertionPoint(tokens, insertIndex),
    [insertIndex, tokens],
  );

  const previewTokens = useMemo(() => {
    if (!activeDrag) {
      return [];
    }

    if (activeDrag.source === "palette") {
      return activeDrag.tokens;
    }

    const token = tokens.find((entry) => entry.id === activeDrag.tokenId);
    return token ? [token] : [];
  }, [activeDrag, tokens]);

  const handleSelectInsertIndex = (nextIndex: number) => {
    setInsertIndex(clampFormulaInsertIndex(nextIndex, tokens.length));
  };

  const handleRemoveToken = (tokenId: string) => {
    const removedIndex = tokens.findIndex((entry) => entry.id === tokenId);
    if (removedIndex === -1) {
      return;
    }

    onTokensChange(tokens.filter((entry) => entry.id !== tokenId));
    setInsertIndex((currentIndex) =>
      clampFormulaInsertIndex(
        removedIndex < currentIndex ? currentIndex - 1 : currentIndex,
        tokens.length - 1,
      ),
    );
  };

  const handleMoveToken = (tokenId: string, direction: -1 | 1) => {
    const currentIndex = tokens.findIndex((entry) => entry.id === tokenId);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex = clampFormulaInsertIndex(
      currentIndex + direction,
      Math.max(tokens.length - 1, 0),
    );
    if (nextIndex === currentIndex) {
      return;
    }

    onTokensChange(arrayMove(tokens, currentIndex, nextIndex));
    setInsertIndex(clampFormulaInsertIndex(nextIndex + 1, tokens.length));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-3">
        {FORMULA_PALETTE_GROUPS.map((group) => (
          <div
            key={group.title}
            className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm"
          >
            <div className="mb-3 space-y-1">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {group.title}
              </p>
              <p className="text-xs tracking-tight text-muted-foreground">
                {group.description}
              </p>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => (
                <PaletteItemButton
                  key={item.id}
                  item={item}
                  onInsert={insertTokens}
                  disabled={disabled}
                  isHighlighted={FORMULA_FIELD_META[
                    activeField
                  ].suggestedVariables.some((variable) =>
                    item.tokens.some(
                      (token) =>
                        token.kind === "variable" && token.value === variable,
                    ),
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={resetDragState}
      >
        <div className="space-y-4">
          <div
            ref={setNodeRef}
            className={cn(
              "min-h-[248px] rounded-[28px] border border-dashed p-4 transition-colors",
              isOver
                ? "border-foreground/30 bg-foreground/[0.04]"
                : "border-border/60 bg-background/75",
            )}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant={compile.error ? "destructive" : "success"}>
                {compile.error ? "Expression lỗi" : "Expression hợp lệ"}
              </Badge>
              <p className="text-xs tracking-tight text-muted-foreground">
                Bấm token để chọn điểm chèn, bấm item bên trái để chèn, hoặc
                dùng mũi tên trên token để đổi vị trí.
              </p>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2">
              <span className="text-xs font-medium tracking-tight text-muted-foreground">
                Vị trí chèn:
              </span>
              <Badge
                variant="outline"
                className="border-border/60 bg-background/80"
              >
                {insertionDescription}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => handleSelectInsertIndex(0)}
              >
                Đầu
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => handleSelectInsertIndex(tokens.length)}
              >
                Cuối
              </Button>
            </div>

            <SortableContext
              items={visibleTokens.map((token) => token.id)}
              strategy={rectSortingStrategy}
            >
              <div className="flex min-h-[160px] flex-wrap items-start gap-2">
                {(visibleTokens.length > 0 || activeDrag) && (
                  <FormulaInsertionSlot
                    compact
                    dragActive={Boolean(activeDrag)}
                    isPreviewTarget={previewIndex === 0}
                    isActive={!activeDrag && effectiveInsertIndex === 0}
                    disabled={disabled}
                    onSelect={() => handleSelectInsertIndex(0)}
                  />
                )}
                {previewIndex === 0 &&
                  previewTokens.map((token) => (
                    <FormulaPreviewTokenChip
                      key={`preview-${token.id}`}
                      token={token}
                    />
                  ))}
                {visibleTokens.map((token, index) => (
                  <Fragment key={token.id}>
                    <SortableFormulaTokenChip
                      token={token}
                      index={index}
                      totalTokens={tokens.length}
                      isInsertAnchor={
                        !activeDrag && effectiveInsertIndex === index + 1
                      }
                      disabled={disabled}
                      onRemove={handleRemoveToken}
                      onChange={(tokenId, value) =>
                        onTokensChange(
                          tokens.map((entry) =>
                            entry.id === tokenId ? { ...entry, value } : entry,
                          ),
                        )
                      }
                      onMoveLeft={(tokenId) => handleMoveToken(tokenId, -1)}
                      onMoveRight={(tokenId) => handleMoveToken(tokenId, 1)}
                      onSelectInsertAfter={handleSelectInsertIndex}
                    />
                    <FormulaInsertionSlot
                      compact
                      dragActive={Boolean(activeDrag)}
                      isPreviewTarget={previewIndex === index + 1}
                      isActive={
                        !activeDrag && effectiveInsertIndex === index + 1
                      }
                      disabled={disabled}
                      onSelect={() => handleSelectInsertIndex(index + 1)}
                    />
                    {previewIndex === index + 1 &&
                      previewTokens.map((previewToken) => (
                        <FormulaPreviewTokenChip
                          key={`preview-${previewToken.id}`}
                          token={previewToken}
                        />
                      ))}
                  </Fragment>
                ))}

                {tokens.length === 0 && !activeDrag && (
                  <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-border/60 bg-muted/20 px-4 py-8 text-center">
                    <FormulaInsertionSlot
                      disabled={disabled}
                      isActive
                      onSelect={() => handleSelectInsertIndex(0)}
                    />
                    <p className="mt-4 text-sm font-semibold tracking-tight text-foreground">
                      Canvas đang trống
                    </p>
                    <p className="mt-1 max-w-md text-xs tracking-tight text-muted-foreground">
                      Bấm item bên trái hoặc nút `+` để chèn nhanh cho{" "}
                      {FORMULA_FIELD_META[activeField].title.toLowerCase()}.
                    </p>
                  </div>
                )}
              </div>
            </SortableContext>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Formula preview
              </Label>
              <p className="mt-2 min-h-[52px] rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 font-mono text-sm tracking-tight text-foreground">
                {compile.formula || "Chưa có công thức"}
              </p>
              {compile.error ? (
                <p className="mt-2 text-xs tracking-tight text-destructive">
                  {compile.error}
                </p>
              ) : (
                <p className="mt-2 text-xs tracking-tight text-muted-foreground">
                  Công thức này sẽ được chuyển thành expression tree trước khi
                  lưu.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Expression JSON
              </Label>
              <Textarea
                readOnly
                value={JSON.stringify(compile.expression ?? {}, null, 2)}
                className="mt-2 min-h-[180px] font-mono text-xs leading-6"
              />
            </div>
          </div>
        </div>

        <DragOverlay
          dropAnimation={FORMULA_DROP_ANIMATION}
          modifiers={FORMULA_DRAG_OVERLAY_MODIFIERS}
        >
          {previewTokens.length > 0 ? (
            <div className="flex max-w-[520px] flex-wrap gap-2 will-change-transform">
              {previewTokens.map((token) => (
                <FormulaPreviewTokenChip
                  key={`overlay-${token.id}`}
                  token={token}
                  floating
                />
              ))}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function RescuerScoreVisibilityConfigCard() {
  const { data, isLoading, isFetching, refetch } =
    useRescuerScoreVisibilityConfig();
  const updateMutation = useUpdateRescuerScoreVisibilityConfig();

  const [draft, setDraft] = useState<string | null>(null);
  const currentValue = draft ?? String(data?.minimumEvaluationCount ?? 0);

  const parsedValue = Number(currentValue);
  const isInvalid =
    !Number.isFinite(parsedValue) ||
    !Number.isInteger(parsedValue) ||
    parsedValue < 0;

  const handleSave = () => {
    if (isInvalid) {
      toast.error("Ngưỡng phải là số nguyên không âm");
      return;
    }

    const payload: UpdateRescuerScoreVisibilityConfigRequest = {
      minimumEvaluationCount: parsedValue,
    };

    const toastId = toast.loading("Đang cập nhật ngưỡng hiển thị...");
    updateMutation.mutate(payload, {
      onSuccess: async () => {
        toast.dismiss(toastId);
        toast.success("Cập nhật ngưỡng hiển thị thành công");
        setDraft(null);
        await refetch();
      },
      onError: () => {
        toast.dismiss(toastId);
        toast.error("Không thể cập nhật ngưỡng hiển thị");
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm tracking-tighter text-muted-foreground">
          Thiết lập ngưỡng hiển thị điểm cứu hộ viên.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(null);
              refetch();
            }}
            disabled={isLoading || isFetching || updateMutation.isPending}
          >
            <ArrowCounterClockwise
              size={14}
              className={cn("mr-1.5", isFetching && "animate-spin")}
            />
            Làm mới
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading || isInvalid || updateMutation.isPending}
          >
            <FloppyDisk size={14} className="mr-1.5" />
            Lưu cấu hình
          </Button>
        </div>
      </div>

      <Card className="max-w-xl border-l-4 border-l-violet-400 border-border/60">
        <CardHeader>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <CardTitle className="text-base tracking-tighter">
              Ngưỡng hiển thị điểm
            </CardTitle>
            <CardDescription className="text-base tracking-tighter">
              (Chỉ hiển thị điểm khi số lượt đánh giá đạt ngưỡng)
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="mb-1.5 block text-sm tracking-tighter text-muted-foreground">
              Số lượt đánh giá tối thiểu
            </Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={currentValue}
              onChange={(event) => setDraft(event.target.value)}
              disabled={isLoading || updateMutation.isPending}
              className="h-9 max-w-65"
            />
            {isInvalid && (
              <p className="mt-1 text-xs tracking-tighter text-red-500">
                Giá trị không hợp lệ. Vui lòng nhập số nguyên không âm.
              </p>
            )}
            <p className="text-xs tracking-tighter text-muted-foreground">
              Cập nhật:{" "}
              {data?.updatedAt
                ? new Date(data.updatedAt).toLocaleString("vi-VN")
                : "—"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const AdminConfigPage = () => {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(
    null,
  );
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [deleteDraftTarget, setDeleteDraftTarget] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const [optimisticSelectedEntity, setOptimisticSelectedEntity] =
    useState<SosPriorityRuleConfigEntity | null>(null);
  const [editorSourceKey, setEditorSourceKey] = useState<string | null>(null);
  const [editorDocument, setEditorDocument] =
    useState<SosPriorityRuleConfigDocument | null>(null);
  const [editorFormulaTokens, setEditorFormulaTokens] =
    useState<Record<FormulaField, FormulaToken[]>>(EMPTY_FORMULA_TOKENS);
  const [previewSosRequestId, setPreviewSosRequestId] = useState("");
  const [activeFormulaField, setActiveFormulaField] =
    useState<FormulaField>("priority");
  const [showRawJson, setShowRawJson] = useState(false);
  const [openSections, setOpenSections] = useState<
    Record<ConfigSectionId, boolean>
  >({
    medical: false,
    relief: false,
    threshold: false,
    formula: true,
    validation: true,
  });
  const [openHelperPanels, setOpenHelperPanels] = useState<
    Record<ConfigHelperPanelId, boolean>
  >({
    flow: false,
    editCluster: false,
  });

  const {
    data: activeConfig,
    isLoading: activeLoading,
    isFetching: activeFetching,
    refetch: refetchActiveConfig,
  } = useSosPriorityRuleConfig();
  const {
    data: versions = [],
    isLoading: versionsLoading,
    isFetching: versionsFetching,
    refetch: refetchVersions,
  } = useSosPriorityRuleConfigVersions();

  const hasValidExplicitSelection =
    selectedConfigId !== null &&
    (selectedConfigId === activeConfig?.id ||
      versions.some((item) => item.id === selectedConfigId));
  const effectiveSelectedConfigId = hasValidExplicitSelection
    ? selectedConfigId
    : (activeConfig?.id ?? null);
  const selectionExists =
    effectiveSelectedConfigId !== null &&
    (effectiveSelectedConfigId === activeConfig?.id ||
      versions.some((item) => item.id === effectiveSelectedConfigId));
  const shouldLoadSelectedConfig =
    selectionExists && effectiveSelectedConfigId !== activeConfig?.id;

  const {
    data: selectedConfigData,
    isLoading: selectedConfigLoading,
    isFetching: selectedConfigFetching,
    refetch: refetchSelectedConfig,
  } = useSosPriorityRuleConfigById(
    effectiveSelectedConfigId,
    shouldLoadSelectedConfig,
  );

  const createDraftMutation = useCreateSosPriorityRuleConfigDraft();
  const deleteDraftMutation = useDeleteSosPriorityRuleConfigDraft();
  const updateDraftMutation = useUpdateSosPriorityRuleConfigDraft();
  const validateMutation = useValidateSosPriorityRuleConfig();
  const activateMutation = useActivateSosPriorityRuleConfig();

  useEffect(() => {
    getDashboardData()
      .then(setDashboardData)
      .catch(console.error)
      .finally(() => setDashboardLoading(false));
  }, []);

  const selectedConfig = useMemo(() => {
    if (
      optimisticSelectedEntity &&
      optimisticSelectedEntity.id === effectiveSelectedConfigId
    ) {
      return optimisticSelectedEntity;
    }

    if (effectiveSelectedConfigId === activeConfig?.id) {
      return activeConfig ?? null;
    }

    return selectedConfigData ?? null;
  }, [
    activeConfig,
    effectiveSelectedConfigId,
    optimisticSelectedEntity,
    selectedConfigData,
  ]);

  const selectedVersionSummary = useMemo(
    () =>
      versions.find((item) => item.id === effectiveSelectedConfigId) ?? null,
    [effectiveSelectedConfigId, versions],
  );

  const selectedStatus =
    selectedVersionSummary?.status ?? selectedConfig?.status ?? "Unknown";
  const isDraft = selectedStatus === "Draft";
  const canActivate =
    selectedStatus === "Draft" || selectedStatus === "Archived";

  const sourceKey = selectedConfig
    ? `${selectedConfig.id}:${selectedConfig.updated_at}`
    : null;

  const sourceDocument = useMemo(
    () => (selectedConfig ? extractConfigDocument(selectedConfig) : null),
    [selectedConfig],
  );

  const baseFormulaTokens = useMemo(
    () =>
      sourceDocument ? buildFormulaState(sourceDocument) : EMPTY_FORMULA_TOKENS,
    [sourceDocument],
  );

  const formulaTokens =
    sourceKey && editorSourceKey === sourceKey
      ? editorFormulaTokens
      : baseFormulaTokens;

  const vulnerabilityCompile = useMemo(
    () => compileFormulaTokens(formulaTokens.vulnerability),
    [formulaTokens.vulnerability],
  );
  const reliefCompile = useMemo(
    () => compileFormulaTokens(formulaTokens.relief),
    [formulaTokens.relief],
  );
  const priorityCompile = useMemo(
    () => compileFormulaTokens(formulaTokens.priority),
    [formulaTokens.priority],
  );

  const workingDocument = useMemo(() => {
    const baseDocument =
      sourceKey && editorSourceKey === sourceKey && editorDocument
        ? editorDocument
        : sourceDocument;

    if (!baseDocument) {
      return null;
    }

    let next = mergeFormulaCompileIntoDocument(
      baseDocument,
      "vulnerability",
      vulnerabilityCompile,
    );
    next = mergeFormulaCompileIntoDocument(next, "relief", reliefCompile);
    next = mergeFormulaCompileIntoDocument(next, "priority", priorityCompile);
    return next;
  }, [
    editorDocument,
    editorSourceKey,
    priorityCompile,
    reliefCompile,
    sourceDocument,
    sourceKey,
    vulnerabilityCompile,
  ]);

  const formulaErrorEntries = useMemo(
    () =>
      [
        ["vulnerability", vulnerabilityCompile.error],
        ["relief", reliefCompile.error],
        ["priority", priorityCompile.error],
      ].filter((entry): entry is [string, string] => Boolean(entry[1])),
    [priorityCompile.error, reliefCompile.error, vulnerabilityCompile.error],
  );

  const handleRefresh = async (options?: { skipSelected?: boolean }) => {
    await Promise.all([
      refetchActiveConfig(),
      refetchVersions(),
      !options?.skipSelected && shouldLoadSelectedConfig
        ? refetchSelectedConfig()
        : Promise.resolve(),
    ]);
  };

  const hydrateFromEntity = (entity: SosPriorityRuleConfigEntity) => {
    const document = extractConfigDocument(entity);
    setOptimisticSelectedEntity(entity);
    setSelectedConfigId(entity.id);
    setEditorSourceKey(`${entity.id}:${entity.updated_at}`);
    setEditorDocument(document);
    setEditorFormulaTokens(buildFormulaState(document));
    validateMutation.reset();
  };

  const withFormulaGuard = () => {
    if (!workingDocument) {
      toast.error("Chưa có config để thao tác.");
      return false;
    }

    if (formulaErrorEntries.length > 0) {
      toast.error(
        "Hãy sửa các công thức đang lỗi trước khi validate hoặc lưu.",
      );
      return false;
    }

    return true;
  };

  const handleCreateDraft = (
    sourceConfigId?: number | null,
    sourceVersion?: string,
  ) => {
    const resolvedSourceId = sourceConfigId ?? effectiveSelectedConfigId;
    if (!resolvedSourceId) {
      toast.error("Chưa có version để clone.");
      return;
    }

    const toastId = toast.loading("Đang tạo draft config...");
    createDraftMutation.mutate(resolvedSourceId, {
      onSuccess: (draft) => {
        toast.dismiss(toastId);
        toast.success(
          sourceVersion
            ? `Đã tạo draft từ ${sourceVersion}`
            : "Đã tạo draft mới",
        );
        hydrateFromEntity(draft);
        void handleRefresh({ skipSelected: true });
      },
      onError: (error) => {
        toast.dismiss(toastId);
        toast.error(
          error.response?.data?.message ?? "Không thể tạo draft config mới",
        );
      },
    });
  };

  const handleValidate = () => {
    if (!withFormulaGuard() || !workingDocument) {
      return;
    }

    const requestId = previewSosRequestId.trim();
    const numericRequestId = requestId ? Number(requestId) : null;

    if (requestId && Number.isNaN(numericRequestId)) {
      toast.error("`sos_request_id` phải là số hợp lệ.");
      return;
    }

    validateMutation.mutate(
      {
        ...workingDocument,
        sos_request_id: numericRequestId,
      },
      {
        onError: (error) => {
          toast.error(
            error.response?.data?.message ??
              "Không thể validate config với SOS request này.",
          );
        },
      },
    );
  };

  const handleSaveDraft = () => {
    if (!effectiveSelectedConfigId || !isDraft) {
      toast.error("Chỉ draft config mới có thể lưu.");
      return;
    }

    if (!withFormulaGuard() || !workingDocument) {
      return;
    }

    const toastId = toast.loading("Đang lưu draft config...");
    updateDraftMutation.mutate(
      {
        id: effectiveSelectedConfigId,
        data: {
          ...workingDocument,
          is_active: false,
        },
      },
      {
        onSuccess: (saved) => {
          toast.dismiss(toastId);
          toast.success("Đã lưu draft config");
          hydrateFromEntity(saved);
          void handleRefresh();
        },
        onError: (error) => {
          toast.dismiss(toastId);
          toast.error(
            error.response?.data?.message ?? "Không thể lưu draft config",
          );
        },
      },
    );
  };

  const handleActivate = () => {
    if (!effectiveSelectedConfigId || !canActivate) {
      toast.error("Chỉ draft hoặc archived mới có thể activate.");
      return;
    }

    if (!withFormulaGuard()) {
      return;
    }

    const toastId = toast.loading("Đang activate config...");
    activateMutation.mutate(effectiveSelectedConfigId, {
      onSuccess: (entity) => {
        toast.dismiss(toastId);
        toast.success("Activate config thành công");
        hydrateFromEntity(entity);
        void handleRefresh();
      },
      onError: (error) => {
        toast.dismiss(toastId);
        toast.error(
          error.response?.data?.message ?? "Không thể activate config",
        );
      },
    });
  };

  const requestDeleteDraft = (id: number, configVersion?: string) => {
    const matchedVersion = versions.find((version) => version.id === id);
    if (matchedVersion?.status !== "Draft") {
      toast.error("Chỉ draft config mới có thể xóa.");
      return;
    }

    const label = configVersion ?? matchedVersion?.config_version ?? `ID ${id}`;
    setDeleteDraftTarget({
      id,
      label,
    });
  };

  const handleDeleteDraft = () => {
    if (!deleteDraftTarget) {
      return;
    }

    const toastId = toast.loading("Đang xóa draft config...");
    deleteDraftMutation.mutate(deleteDraftTarget.id, {
      onSuccess: () => {
        toast.dismiss(toastId);
        toast.success("Đã xóa draft config");

        if (effectiveSelectedConfigId === deleteDraftTarget.id) {
          setSelectedConfigId(activeConfig?.id ?? null);
          setOptimisticSelectedEntity(null);
          setEditorSourceKey(null);
          setEditorDocument(null);
          setEditorFormulaTokens(EMPTY_FORMULA_TOKENS);
          validateMutation.reset();
        }

        setDeleteDraftTarget(null);
        void handleRefresh();
      },
      onError: (error) => {
        toast.dismiss(toastId);
        toast.error(
          error.response?.data?.message ?? "Không thể xóa draft config",
        );
      },
    });
  };

  const handleDocumentFieldChange = (path: string[], value: unknown) => {
    if (!sourceKey || !workingDocument) {
      return;
    }

    validateMutation.reset();
    setEditorSourceKey(sourceKey);
    setEditorDocument(updateDocumentAtPath(workingDocument, path, value));
  };

  const handleFormulaTokensChange = (
    field: FormulaField,
    next: FormulaToken[],
  ) => {
    if (!sourceKey) {
      return;
    }

    validateMutation.reset();
    setEditorSourceKey(sourceKey);
    setEditorFormulaTokens((current) => ({
      ...(editorSourceKey === sourceKey ? current : baseFormulaTokens),
      [field]: next,
    }));
  };

  const toggleSection = (section: ConfigSectionId) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const toggleHelperPanel = (panel: ConfigHelperPanelId) => {
    setOpenHelperPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }));
  };

  const isBusy =
    activeLoading ||
    versionsLoading ||
    selectedConfigLoading ||
    activeFetching ||
    versionsFetching ||
    selectedConfigFetching;

  if (dashboardLoading || !dashboardData) {
    return (
      <DashboardLayout
        favorites={[]}
        projects={[]}
        cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
      >
        <DashboardSkeleton variant="editor" />
      </DashboardLayout>
    );
  }

  const jsonSnapshot = workingDocument
    ? JSON.stringify(workingDocument, null, 2)
    : "{}";

  const compileByField: Record<FormulaField, FormulaCompileResult> = {
    vulnerability: vulnerabilityCompile,
    relief: reliefCompile,
    priority: priorityCompile,
  };

  const activeFormulaCompile = compileByField[activeFormulaField];
  const versionMetricValue =
    workingDocument?.config_version ??
    selectedConfig?.config_version ??
    "Chưa chọn";
  const metricCardsGridStyle = {
    "--metric-grid-columns":
      getMetricCardsGridTemplateColumns(versionMetricValue),
  } as CSSProperties;

  return (
    <DashboardLayout
      favorites={dashboardData.favorites}
      projects={dashboardData.projects}
      cloudStorage={dashboardData.cloudStorage}
    >
      <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
        <div className="flex flex-col items-start justify-between gap-4 xl:flex-row">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <FadersIcon size={24} className="text-foreground" />
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Cấu hình hệ thống
              </p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Tham số hệ thống
            </h1>
          </div>
        </div>

        <Tabs defaultValue="sos-priority">
          <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-border/60 bg-transparent p-0">
            <TabsTrigger
              value="sos-priority"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium tracking-tight data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Ưu tiên SOS
            </TabsTrigger>
            <TabsTrigger
              value="warning-band"
              className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium tracking-tight data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <WarningCircle size={14} className="text-amber-500" />
              Dải cảnh báo kho
            </TabsTrigger>
            <TabsTrigger
              value="supply-priority"
              className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium tracking-tight data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Info size={14} className="text-sky-500" />
              Thời gian tiếp tế
            </TabsTrigger>
            <TabsTrigger
              value="rescuer-score-visibility"
              className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium tracking-tight data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Info size={14} className="text-violet-500" />
              Ngưỡng điểm cứu hộ viên
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sos-priority" className="mt-5 space-y-5">
            <Card className="overflow-hidden py-0 border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.15),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.78))] shadow-sm">
              <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl space-y-2">
                  <Badge
                    variant="outline"
                    className="border-foreground/10 bg-background/70"
                  >
                    Workspace versioned rule-base
                  </Badge>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    Biên tập rule-base SOS theo cụm tham số và formula studio
                    kéo thả
                  </h2>
                  <p className="text-sm tracking-tight text-muted-foreground">
                    Cập nhật các nhóm tham số theo ngữ cảnh, `sos_request_id`
                    thật và sắp xếp lại biến, toán tử, khối hàm ngay trên canvas
                    công thức.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleRefresh();
                    }}
                    disabled={isBusy}
                    className="bg-background/70"
                  >
                    <ArrowCounterClockwise
                      size={14}
                      className={cn("mr-1.5", isBusy && "animate-spin")}
                    />
                    Làm mới
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleCreateDraft(
                        effectiveSelectedConfigId,
                        selectedVersionSummary?.config_version ??
                          selectedConfig?.config_version,
                      )
                    }
                    disabled={
                      createDraftMutation.isPending ||
                      !effectiveSelectedConfigId
                    }
                    className="bg-background/70"
                  >
                    <Plus size={14} className="mr-1.5" />
                    Clone bản đang chọn
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleValidate}
                    disabled={validateMutation.isPending || !workingDocument}
                    className="bg-background/70"
                  >
                    <CheckCircle size={14} className="mr-1.5" />
                    Validate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      effectiveSelectedConfigId
                        ? requestDeleteDraft(
                            effectiveSelectedConfigId,
                            workingDocument?.config_version ??
                              selectedConfig?.config_version,
                          )
                        : undefined
                    }
                    disabled={!isDraft || deleteDraftMutation.isPending}
                    className="bg-background/70 text-destructive hover:text-destructive"
                  >
                    <Trash size={14} className="mr-1.5" />
                    Xoá draft
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={!isDraft || updateDraftMutation.isPending}
                  >
                    <FloppyDisk size={14} className="mr-1.5" />
                    Lưu draft
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleActivate}
                    disabled={!canActivate || activateMutation.isPending}
                    className="bg-background/70"
                  >
                    <Play size={14} className="mr-1.5" />
                    {selectedStatus === "Archived"
                      ? "Kích hoạt lại"
                      : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="overflow-hidden border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/50 [.border-b]:pb-2">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-2xl tracking-tight ">
                        Version rail
                      </CardTitle>
                      <CardDescription className="tracking-tighter">
                        Đưa version lên trên để chọn nhanh, phần thân chỉ dành
                        cho cụm đang chỉnh.
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusVariant(selectedStatus)}>
                      {selectedStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-5 py-2">
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-3 pb-1">
                      {versions.map((version) => {
                        const isSelected =
                          version.id === effectiveSelectedConfigId;
                        return (
                          <div
                            key={version.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedConfigId(version.id);
                              setOptimisticSelectedEntity(null);
                              setEditorSourceKey(null);
                              setEditorDocument(null);
                              setEditorFormulaTokens(EMPTY_FORMULA_TOKENS);
                              validateMutation.reset();
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) {
                                return;
                              }

                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedConfigId(version.id);
                                setOptimisticSelectedEntity(null);
                                setEditorSourceKey(null);
                                setEditorDocument(null);
                                setEditorFormulaTokens(EMPTY_FORMULA_TOKENS);
                                validateMutation.reset();
                              }
                            }}
                            className={cn(
                              "w-80 shrink-0 rounded-[24px] border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 cursor-pointer",
                              isSelected
                                ? "border-foreground/20 bg-foreground/4 shadow-sm"
                                : "border-border/60 bg-background/75 hover:border-foreground/15",
                            )}
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                              <div className="min-w-0 space-y-4">
                                <div className="space-y-1">
                                  <p className="whitespace-normal break-words font-mono text-base font-semibold leading-tight tracking-tight">
                                    {version.config_version}
                                  </p>
                                  <p className="text-sm uppercase text-muted-foreground">
                                    ID {version.id}
                                  </p>
                                </div>

                                <div className="space-y-1.5 text-[13px] tracking-tighter text-muted-foreground">
                                  <p>
                                    Tạo:{" "}
                                    <span className="text-black font-medium">
                                      {formatDateTime(version.created_at)}
                                    </span>
                                  </p>
                                  <p>
                                    Cập nhật:{" "}
                                    <span className="text-black font-medium">
                                      {formatDateTime(version.updated_at)}
                                    </span>
                                  </p>
                                  <p>
                                    Activate:{" "}
                                    <span className="text-black font-medium">
                                      {formatDateTime(version.activated_at)}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <Badge
                                  variant={getStatusVariant(version.status)}
                                  className="inline-flex h-10 items-center self-end rounded-full px-5 text-sm leading-none"
                                >
                                  {version.status}
                                </Badge>
                                <button
                                  type="button"
                                  aria-label={`Clone version ${version.config_version}`}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/15 bg-background/70 text-foreground transition-colors hover:bg-foreground/6"
                                  onPointerDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  onClickCapture={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleCreateDraft(
                                      version.id,
                                      version.config_version,
                                    );
                                  }}
                                >
                                  <Plus size={14} />
                                </button>
                                {version.status === "Draft" ? (
                                  <button
                                    type="button"
                                    aria-label={`Xoá draft ${version.config_version}`}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5 text-destructive transition-colors hover:bg-destructive/10"
                                    onPointerDown={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                    }}
                                    onClickCapture={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                    }}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      requestDeleteDraft(
                                        version.id,
                                        version.config_version,
                                      );
                                    }}
                                  >
                                    <Trash size={14} />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                    <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-2">
                      <button
                        type="button"
                        onClick={() => toggleHelperPanel("flow")}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <div>
                          <p className="text-base font-semibold tracking-tighter text-foreground">
                            Flow thao tác
                          </p>
                          <p className="mt-0.5 text-sm tracking-tighter text-muted-foreground">
                            {openHelperPanels.flow
                              ? "Thu gọn hướng dẫn"
                              : "Bấm để xem hướng dẫn thao tác"}
                          </p>
                        </div>
                        <CaretDown
                          size={16}
                          className={cn(
                            "shrink-0 text-muted-foreground transition-transform duration-200",
                            openHelperPanels.flow ? "rotate-0" : "-rotate-90",
                          )}
                        />
                      </button>
                      {openHelperPanels.flow ? (
                        <div className="mt-3 space-y-1.5 text-sm tracking-tighter">
                          <p>
                            1. Chọn version bất kỳ rồi clone thành draft nếu cần
                            chỉnh sửa.
                          </p>
                          <p>
                            2. Mở đúng cụm tham số cần chỉnh thay vì xem toàn
                            trang.
                          </p>
                          <p>3. Xây công thức bằng canvas kéo thả.</p>
                          <p>
                            4. Validate với `sos_request_id`, sau đó activate
                            draft hoặc kích hoạt lại archived.
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/75 px-4 py-2">
                      <button
                        type="button"
                        onClick={() => toggleHelperPanel("editCluster")}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <div>
                          <p className="text-base font-semibold tracking-tighter text-foreground">
                            Cụm chỉnh sửa
                          </p>
                          <p className="mt-0.5 text-sm tracking-tighter text-muted-foreground">
                            {openHelperPanels.editCluster
                              ? "Thu gọn danh sách cụm"
                              : "Bấm để mở nhanh các cụm chỉnh sửa"}
                          </p>
                        </div>
                        <CaretDown
                          size={16}
                          className={cn(
                            "shrink-0 text-muted-foreground tracking-tighter transition-transform duration-200",
                            openHelperPanels.editCluster
                              ? "rotate-0"
                              : "-rotate-90",
                          )}
                        />
                      </button>
                      {openHelperPanels.editCluster ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(
                            [
                              ["medical", "Y tế"],
                              ["relief", "Tiếp tế"],
                              ["threshold", "Ngưỡng"],
                              ["formula", "Công thức"],
                              ["validation", "Preview"],
                            ] as Array<[ConfigSectionId, string]>
                          ).map(([sectionId, label]) => (
                            <button
                              type="button"
                              key={sectionId}
                              onClick={() => toggleSection(sectionId)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-sm font-medium tracking-tighter transition-colors",
                                openSections[sectionId]
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                                  : "border-border/60 bg-background text-muted-foreground",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-5">
                <div
                  className="grid gap-3 md:grid-cols-2 xl:[grid-template-columns:var(--metric-grid-columns)]"
                  style={metricCardsGridStyle}
                >
                  <MetricCard
                    label="Version"
                    value={versionMetricValue}
                    hint="Định danh version đang được mở trong workspace."
                    accent="bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_55%)]"
                    valueClassName="whitespace-nowrap"
                  />
                  <MetricCard
                    label="Trạng thái"
                    value={selectedStatus}
                    hint={
                      isDraft
                        ? "Draft có thể chỉnh và activate."
                        : selectedStatus === "Archived"
                          ? "Archived chỉ xem nhưng có thể kích hoạt lại hoặc clone thành draft."
                          : "Active chỉ xem. Muốn chỉnh thì clone thành draft."
                    }
                    accent="bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_55%)]"
                  />
                  <MetricCard
                    label="Biến y tế"
                    value={String(
                      Object.keys(
                        workingDocument?.medical_score.medical_issue_severity ??
                          {},
                      ).length,
                    )}
                    hint="Số issue y tế đang có trong rule-base."
                    accent="bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.10),transparent_55%)]"
                  />
                  <MetricCard
                    label="Formula checks"
                    value={
                      formulaErrorEntries.length === 0
                        ? "Sẵn sàng"
                        : `${formulaErrorEntries.length} lỗi`
                    }
                    hint="Kiểm tra expression trước khi gửi sang backend."
                    accent="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_55%)]"
                  />
                </div>

                {workingDocument && (
                  <>
                    <SectionShell
                      eyebrow="Medical cluster"
                      title="Y tế và độ nghiêm trọng"
                      description="Nhóm này chi phối raw `medical_score`: age weights, trọng số issue y tế và severe flags."
                      className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,240,0.94))]"
                      collapsible
                      open={openSections.medical}
                      onToggle={() => toggleSection("medical")}
                      badge={
                        <Badge
                          variant="outline"
                          className="border-rose-500/20 bg-rose-500/5"
                        >
                          {workingDocument.medical_severe_issues.length} severe
                          flags
                        </Badge>
                      }
                      summary={
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Issue weights
                            </p>
                            <p className="mt-0.5 text-base font-semibold tracking-tighter text-foreground">
                              {
                                Object.keys(
                                  workingDocument.medical_score
                                    .medical_issue_severity,
                                ).length
                              }{" "}
                              mục
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Age weights
                            </p>
                            <p className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
                              {
                                Object.keys(
                                  workingDocument.medical_score.age_weights,
                                ).length
                              }{" "}
                              nhóm
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Severe set
                            </p>
                            <p className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
                              {workingDocument.medical_severe_issues.length}{" "}
                              issue
                            </p>
                          </div>
                        </div>
                      }
                    >
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
                        <NumericRecordEditor
                          title="Trọng số issue y tế"
                          description="Điểm severity của từng medical issue trước khi nhân age weight theo nạn nhân."
                          entries={
                            workingDocument.medical_score.medical_issue_severity
                          }
                          labels={workingDocument.display_labels.medical_issues}
                          entriesScrollClassName="max-h-[min(65vh,42rem)] rounded-[20px]"
                          disabled={!isDraft}
                          onChange={(next) =>
                            handleDocumentFieldChange(
                              ["medical_score", "medical_issue_severity"],
                              next,
                            )
                          }
                        />

                        <div className="space-y-4">
                          <NumericRecordEditor
                            title="Age weights"
                            description="Hệ số nhóm tuổi được nhân vào issue weight sum cho từng nạn nhân bị thương."
                            entries={workingDocument.medical_score.age_weights}
                            labels={workingDocument.display_labels.age_groups}
                            disabled={!isDraft}
                            onChange={(next) =>
                              handleDocumentFieldChange(
                                ["medical_score", "age_weights"],
                                next,
                              )
                            }
                          />

                          <FieldShell
                            title="Công thức tính điểm Y Tế"
                            description="Biểu thức trực quan để admin nhìn nhanh cách raw medical score đang được tính."
                          >
                            <div className="rounded-[22px] border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.08),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,250,250,0.92))] px-4 py-5 shadow-sm">
                              <div className="overflow-x-auto py-1">
                                <div className="inline-flex min-w-max items-center gap-1.5 whitespace-nowrap font-serif text-[clamp(0.9rem,1.35vw,1.45rem)] tracking-tight text-foreground">
                                  <span className="italic">medical_score</span>
                                  <span>=</span>
                                  <span className="relative inline-flex h-[2.55em] w-[1.45em] shrink-0 items-center justify-center align-middle">
                                    <span className="text-[1.08em] leading-none">
                                      ∑
                                    </span>
                                    <span className="absolute top-[0.14em] left-1/2 -translate-x-1/2 text-[0.4em] italic">
                                      n
                                    </span>
                                    <span className="absolute bottom-[0.08em] left-1/2 -translate-x-1/2 text-[0.34em] italic tracking-normal">
                                      i=1
                                    </span>
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <span>(</span>
                                    <span className="italic">
                                      issue_weight_sum
                                      <sub className="text-[0.5em]">i</sub>
                                    </span>
                                    <span>·</span>
                                    <span className="italic">
                                      age_weight
                                      <sub className="text-[0.5em]">i</sub>
                                    </span>
                                    <span>)</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </FieldShell>

                          <StringListEditor
                            title="Severe issue set"
                            description="Nếu request chứa một trong các issue này thì threshold P1/P2 mới có hiệu lực."
                            items={workingDocument.medical_severe_issues}
                            labels={
                              workingDocument.display_labels.medical_issues
                            }
                            disabled={!isDraft}
                            placeholder="Ví dụ: UNCONSCIOUS"
                            onChange={(next) =>
                              handleDocumentFieldChange(
                                ["medical_severe_issues"],
                                next,
                              )
                            }
                          />
                        </div>
                      </div>
                    </SectionShell>

                    <SectionShell
                      eyebrow="Relief cluster"
                      title="Tiếp tế, nhu cầu và vulnerability"
                      description="Các tham số ở đây điều khiển raw calculators cho supply urgency, vulnerability raw và cap ratio."
                      className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.94))]"
                      collapsible
                      open={openSections.relief}
                      onToggle={() => toggleSection("relief")}
                      badge={
                        <Badge
                          variant="outline"
                          className="border-sky-500/20 bg-sky-500/5"
                        >
                          Relief + vulnerability
                        </Badge>
                      }
                      summary={
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Water urgency
                            </p>
                            <p className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
                              {
                                Object.keys(
                                  workingDocument.relief_score
                                    .supply_urgency_score.water_urgency_score,
                                ).length
                              }{" "}
                              mức
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Food urgency
                            </p>
                            <p className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
                              {
                                Object.keys(
                                  workingDocument.relief_score
                                    .supply_urgency_score.food_urgency_score,
                                ).length
                              }{" "}
                              mức
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Cap ratio
                            </p>
                            <p className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
                              {
                                workingDocument.relief_score.vulnerability_score
                                  .cap_ratio
                              }
                            </p>
                          </div>
                        </div>
                      }
                    >
                      <div className="grid gap-4 xl:grid-cols-2">
                        <NumericRecordEditor
                          title="Water urgency score"
                          description="Map thời lượng thiếu nước sang điểm urgency."
                          entries={
                            workingDocument.relief_score.supply_urgency_score
                              .water_urgency_score
                          }
                          labels={workingDocument.display_labels.water_duration}
                          disabled={!isDraft}
                          onChange={(next) =>
                            handleDocumentFieldChange(
                              [
                                "relief_score",
                                "supply_urgency_score",
                                "water_urgency_score",
                              ],
                              next,
                            )
                          }
                        />
                        <NumericRecordEditor
                          title="Food urgency score"
                          description="Map thời lượng thiếu thức ăn sang điểm urgency."
                          entries={
                            workingDocument.relief_score.supply_urgency_score
                              .food_urgency_score
                          }
                          labels={workingDocument.display_labels.food_duration}
                          disabled={!isDraft}
                          onChange={(next) =>
                            handleDocumentFieldChange(
                              [
                                "relief_score",
                                "supply_urgency_score",
                                "food_urgency_score",
                              ],
                              next,
                            )
                          }
                        />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <FieldShell
                          title="Blanket urgency rules"
                          description="Quy tắc chấm điểm cho nhu cầu chăn màn."
                        >
                          <div className="space-y-3">
                            <TogglePill
                              label="Chỉ áp khi supply được chọn"
                              description="Nếu tắt, score chăn có thể được tính cả khi chưa đánh dấu mục supply."
                              value={
                                workingDocument.relief_score
                                  .supply_urgency_score.blanket_urgency_score
                                  .apply_only_when_supply_selected
                              }
                              disabled={!isDraft}
                              onChange={(value) =>
                                handleDocumentFieldChange(
                                  [
                                    "relief_score",
                                    "supply_urgency_score",
                                    "blanket_urgency_score",
                                    "apply_only_when_supply_selected",
                                  ],
                                  value,
                                )
                              }
                            />
                            <TogglePill
                              label="Chỉ áp khi chăn không đủ"
                              description="Nếu bật, backend cần cờ `are_blankets_enough = false` mới chấm điểm."
                              value={
                                workingDocument.relief_score
                                  .supply_urgency_score.blanket_urgency_score
                                  .apply_only_when_are_blankets_enough_is_false
                              }
                              disabled={!isDraft}
                              onChange={(value) =>
                                handleDocumentFieldChange(
                                  [
                                    "relief_score",
                                    "supply_urgency_score",
                                    "blanket_urgency_score",
                                    "apply_only_when_are_blankets_enough_is_false",
                                  ],
                                  value,
                                )
                              }
                            />
                            <KeyValueTextGrid
                              title="Score values"
                              description="Điểm được dùng theo số lượng chăn yêu cầu so với số người."
                              disabled={!isDraft}
                              values={[
                                {
                                  keyName: "none_or_not_selected_score",
                                  label: "None or not selected",
                                  value:
                                    workingDocument.relief_score
                                      .supply_urgency_score
                                      .blanket_urgency_score
                                      .none_or_not_selected_score,
                                  inputType: "number",
                                },
                                {
                                  keyName: "requested_count_equals_1_score",
                                  label: "Requested count = 1",
                                  value:
                                    workingDocument.relief_score
                                      .supply_urgency_score
                                      .blanket_urgency_score
                                      .requested_count_equals_1_score,
                                  inputType: "number",
                                },
                                {
                                  keyName:
                                    "requested_count_between_2_and_half_people_score",
                                  label: "2 đến half people",
                                  value:
                                    workingDocument.relief_score
                                      .supply_urgency_score
                                      .blanket_urgency_score
                                      .requested_count_between_2_and_half_people_score,
                                  inputType: "number",
                                },
                                {
                                  keyName:
                                    "requested_count_more_than_half_people_score",
                                  label: "> half people",
                                  value:
                                    workingDocument.relief_score
                                      .supply_urgency_score
                                      .blanket_urgency_score
                                      .requested_count_more_than_half_people_score,
                                  inputType: "number",
                                },
                                {
                                  keyName: "half_people_operator",
                                  label: "Half people operator",
                                  value:
                                    workingDocument.relief_score
                                      .supply_urgency_score
                                      .blanket_urgency_score
                                      .half_people_operator,
                                  inputType: "text",
                                },
                              ]}
                              onChange={(keyName, value) =>
                                handleDocumentFieldChange(
                                  [
                                    "relief_score",
                                    "supply_urgency_score",
                                    "blanket_urgency_score",
                                    keyName,
                                  ],
                                  value,
                                )
                              }
                            />
                          </div>
                        </FieldShell>

                        <FieldShell
                          title="Clothing urgency rules"
                          description="Quy tắc chấm điểm cho nhu cầu quần áo khô và đồ mặc thay."
                        >
                          <div className="space-y-3">
                            <TogglePill
                              label="Chỉ áp khi supply được chọn"
                              description="Giữ clothing score bám đúng flow chọn loại nhu cầu."
                              value={
                                workingDocument.relief_score
                                  .supply_urgency_score.clothing_urgency_score
                                  .apply_only_when_supply_selected
                              }
                              disabled={!isDraft}
                              onChange={(value) =>
                                handleDocumentFieldChange(
                                  [
                                    "relief_score",
                                    "supply_urgency_score",
                                    "clothing_urgency_score",
                                    "apply_only_when_supply_selected",
                                  ],
                                  value,
                                )
                              }
                            />
                            <KeyValueTextGrid
                              title="Score values"
                              description="Điểm clothing score theo số người cần quần áo."
                              disabled={!isDraft}
                              values={[
                                {
                                  keyName: "none_or_not_selected_score",
                                  label: "None or not selected",
                                  value:
                                    workingDocument.relief_score
                                      .supply_urgency_score
                                      .clothing_urgency_score
                                      .none_or_not_selected_score,
                                  inputType: "number",
                                },
                                {
                                  keyName: "needed_people_equals_1_score",
                                  label: "Needed people = 1",
                                  value:
                                    workingDocument.relief_score
                                      .supply_urgency_score
                                      .clothing_urgency_score
                                      .needed_people_equals_1_score,
                                  inputType: "number",
                                },
                                {
                                  keyName:
                                    "needed_people_between_2_and_half_people_score",
                                  label: "2 đến half people",
                                  value:
                                    workingDocument.relief_score
                                      .supply_urgency_score
                                      .clothing_urgency_score
                                      .needed_people_between_2_and_half_people_score,
                                  inputType: "number",
                                },
                                {
                                  keyName:
                                    "needed_people_more_than_half_people_score",
                                  label: "> half people",
                                  value:
                                    workingDocument.relief_score
                                      .supply_urgency_score
                                      .clothing_urgency_score
                                      .needed_people_more_than_half_people_score,
                                  inputType: "number",
                                },
                                {
                                  keyName: "half_people_operator",
                                  label: "Half people operator",
                                  value:
                                    workingDocument.relief_score
                                      .supply_urgency_score
                                      .clothing_urgency_score
                                      .half_people_operator,
                                  inputType: "text",
                                },
                              ]}
                              onChange={(keyName, value) =>
                                handleDocumentFieldChange(
                                  [
                                    "relief_score",
                                    "supply_urgency_score",
                                    "clothing_urgency_score",
                                    keyName,
                                  ],
                                  value,
                                )
                              }
                            />
                          </div>
                        </FieldShell>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
                        <NumericRecordEditor
                          title="Vulnerability raw"
                          description="Điểm raw theo số trẻ em, người già và trạng thái có phụ nữ mang thai."
                          entries={
                            workingDocument.relief_score.vulnerability_score
                              .vulnerability_raw
                          }
                          disabled={!isDraft}
                          onChange={(next) =>
                            handleDocumentFieldChange(
                              [
                                "relief_score",
                                "vulnerability_score",
                                "vulnerability_raw",
                              ],
                              next,
                            )
                          }
                        />
                        <FieldShell
                          title="Cap ratio và notes"
                          description="Cap ratio giới hạn vulnerability theo supply urgency, còn note dùng để ghi ý nghĩa raw calculator."
                        >
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Cap ratio
                              </Label>
                              <Input
                                className="mt-2"
                                type="number"
                                step="0.01"
                                disabled={!isDraft}
                                value={
                                  workingDocument.relief_score
                                    .vulnerability_score.cap_ratio
                                }
                                onChange={(event) => {
                                  const nextValue = Number(event.target.value);
                                  if (Number.isNaN(nextValue)) {
                                    return;
                                  }

                                  handleDocumentFieldChange(
                                    [
                                      "relief_score",
                                      "vulnerability_score",
                                      "cap_ratio",
                                    ],
                                    nextValue,
                                  );
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Supply urgency note
                              </Label>
                              <Textarea
                                className="mt-2 min-h-[110px]"
                                disabled={!isDraft}
                                value={
                                  workingDocument.relief_score
                                    .supply_urgency_score.formula
                                }
                                onChange={(event) =>
                                  handleDocumentFieldChange(
                                    [
                                      "relief_score",
                                      "supply_urgency_score",
                                      "formula",
                                    ],
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </FieldShell>
                        <FieldShell
                          title="Duration options"
                          description="Các option hiển thị ra UI để user chọn khoảng thời gian thiếu nước và thức ăn."
                        >
                          <div className="space-y-4">
                            <StringListEditor
                              title="Water duration"
                              description="Danh sách option UI cho nước."
                              items={workingDocument.ui_options.WATER_DURATION}
                              labels={
                                workingDocument.display_labels.water_duration
                              }
                              disabled={!isDraft}
                              placeholder="Ví dụ: UNDER_6H"
                              onChange={(next) =>
                                handleDocumentFieldChange(
                                  ["ui_options", "WATER_DURATION"],
                                  next,
                                )
                              }
                            />
                            <StringListEditor
                              title="Food duration"
                              description="Danh sách option UI cho thức ăn."
                              items={workingDocument.ui_options.FOOD_DURATION}
                              labels={
                                workingDocument.display_labels.food_duration
                              }
                              disabled={!isDraft}
                              placeholder="Ví dụ: UNDER_12H"
                              onChange={(next) =>
                                handleDocumentFieldChange(
                                  ["ui_options", "FOOD_DURATION"],
                                  next,
                                )
                              }
                            />
                          </div>
                        </FieldShell>
                      </div>
                    </SectionShell>

                    <SectionShell
                      eyebrow="Threshold cluster"
                      title="Bối cảnh, ngưỡng và guardrails"
                      description="Nhóm tham số này quyết định multipliers, threshold priority và các ràng buộc UI/runtime liên quan."
                      className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,251,235,0.94))]"
                      collapsible
                      open={openSections.threshold}
                      onToggle={() => toggleSection("threshold")}
                      badge={
                        <Badge
                          variant="outline"
                          className="border-amber-500/20 bg-amber-500/5"
                        >
                          Threshold orchestration
                        </Badge>
                      }
                      summary={
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Multipliers
                            </p>
                            <p className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
                              {
                                Object.keys(
                                  workingDocument.situation_multiplier,
                                ).length
                              }{" "}
                              tình huống
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Thresholds
                            </p>
                            <p className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
                              {workingDocument.priority_level.P1_THRESHOLD}/
                              {workingDocument.priority_level.P2_THRESHOLD}/
                              {workingDocument.priority_level.P3_THRESHOLD}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              UI guardrails
                            </p>
                            <p className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
                              Min people{" "}
                              {
                                workingDocument.ui_constraints
                                  .MIN_TOTAL_PEOPLE_TO_PROCEED
                              }
                            </p>
                          </div>
                        </div>
                      }
                    >
                      <div className="grid gap-4 xl:grid-cols-2">
                        <NumericRecordEditor
                          title="Situation multiplier"
                          description="Hệ số nhân theo tình huống thực địa trước khi ra priority score cuối."
                          entries={workingDocument.situation_multiplier}
                          labels={workingDocument.display_labels.situations}
                          disabled={!isDraft}
                          onChange={(next) =>
                            handleDocumentFieldChange(
                              ["situation_multiplier"],
                              next,
                            )
                          }
                        />
                        <NumericRecordEditor
                          title="Request type scores"
                          description="Bảng điểm dự phòng cho request type, vẫn giữ để có thể gọi lại trong expression nếu cần."
                          entries={workingDocument.request_type_scores}
                          labels={workingDocument.display_labels.request_types}
                          disabled={!isDraft}
                          onChange={(next) =>
                            handleDocumentFieldChange(
                              ["request_type_scores"],
                              next,
                            )
                          }
                        />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
                        <FieldShell
                          title="Priority thresholds"
                          description="Ngưỡng score để map sang Critical/High/Medium/Low, cộng với severe gating rule."
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                P1 threshold
                              </Label>
                              <Input
                                className="mt-2"
                                type="number"
                                disabled={!isDraft}
                                value={
                                  workingDocument.priority_level.P1_THRESHOLD
                                }
                                onChange={(event) => {
                                  const nextValue = Number(event.target.value);
                                  if (Number.isNaN(nextValue)) return;
                                  handleDocumentFieldChange(
                                    ["priority_level", "P1_THRESHOLD"],
                                    nextValue,
                                  );
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                P2 threshold
                              </Label>
                              <Input
                                className="mt-2"
                                type="number"
                                disabled={!isDraft}
                                value={
                                  workingDocument.priority_level.P2_THRESHOLD
                                }
                                onChange={(event) => {
                                  const nextValue = Number(event.target.value);
                                  if (Number.isNaN(nextValue)) return;
                                  handleDocumentFieldChange(
                                    ["priority_level", "P2_THRESHOLD"],
                                    nextValue,
                                  );
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                P3 threshold
                              </Label>
                              <Input
                                className="mt-2"
                                type="number"
                                disabled={!isDraft}
                                value={
                                  workingDocument.priority_level.P3_THRESHOLD
                                }
                                onChange={(event) => {
                                  const nextValue = Number(event.target.value);
                                  if (Number.isNaN(nextValue)) return;
                                  handleDocumentFieldChange(
                                    ["priority_level", "P3_THRESHOLD"],
                                    nextValue,
                                  );
                                }}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Threshold rule note
                              </Label>
                              <Textarea
                                className="mt-2 min-h-[110px]"
                                disabled={!isDraft}
                                value={workingDocument.priority_level.rule}
                                onChange={(event) =>
                                  handleDocumentFieldChange(
                                    ["priority_level", "rule"],
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </FieldShell>

                        <FieldShell
                          title="UI guardrails"
                          description="Ràng buộc tối thiểu để UI và backend cùng hiểu giới hạn nhập liệu."
                        >
                          <div className="grid gap-3">
                            <div>
                              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Min total people to proceed
                              </Label>
                              <Input
                                className="mt-2"
                                type="number"
                                disabled={!isDraft}
                                value={
                                  workingDocument.ui_constraints
                                    .MIN_TOTAL_PEOPLE_TO_PROCEED
                                }
                                onChange={(event) => {
                                  const nextValue = Number(event.target.value);
                                  if (Number.isNaN(nextValue)) return;
                                  handleDocumentFieldChange(
                                    [
                                      "ui_constraints",
                                      "MIN_TOTAL_PEOPLE_TO_PROCEED",
                                    ],
                                    nextValue,
                                  );
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Blanket request default
                              </Label>
                              <Input
                                className="mt-2"
                                type="number"
                                disabled={!isDraft}
                                value={
                                  workingDocument.ui_constraints
                                    .BLANKET_REQUEST_COUNT_DEFAULT
                                }
                                onChange={(event) => {
                                  const nextValue = Number(event.target.value);
                                  if (Number.isNaN(nextValue)) return;
                                  handleDocumentFieldChange(
                                    [
                                      "ui_constraints",
                                      "BLANKET_REQUEST_COUNT_DEFAULT",
                                    ],
                                    nextValue,
                                  );
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Blanket request min
                              </Label>
                              <Input
                                className="mt-2"
                                type="number"
                                disabled={!isDraft}
                                value={
                                  workingDocument.ui_constraints
                                    .BLANKET_REQUEST_COUNT_MIN
                                }
                                onChange={(event) => {
                                  const nextValue = Number(event.target.value);
                                  if (Number.isNaN(nextValue)) return;
                                  handleDocumentFieldChange(
                                    [
                                      "ui_constraints",
                                      "BLANKET_REQUEST_COUNT_MIN",
                                    ],
                                    nextValue,
                                  );
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Max formula
                              </Label>
                              <Input
                                className="mt-2"
                                disabled={!isDraft}
                                value={
                                  workingDocument.ui_constraints
                                    .BLANKET_REQUEST_COUNT_MAX_FORMULA
                                }
                                onChange={(event) =>
                                  handleDocumentFieldChange(
                                    [
                                      "ui_constraints",
                                      "BLANKET_REQUEST_COUNT_MAX_FORMULA",
                                    ],
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </FieldShell>

                        <FieldShell
                          title="Version metadata"
                          description="Định danh version và flag `use_request_type_score` cho logic phối hợp cũ/mới."
                        >
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Config version
                              </Label>
                              <Input
                                className="mt-2 font-mono"
                                disabled={!isDraft}
                                value={workingDocument.config_version}
                                onChange={(event) =>
                                  handleDocumentFieldChange(
                                    ["config_version"],
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <TogglePill
                              label="use_request_type_score"
                              description="Giữ cờ cấu hình này nếu muốn cho phép expression cuối tham chiếu request type score."
                              value={
                                workingDocument.priority_score
                                  .use_request_type_score
                              }
                              disabled={!isDraft}
                              onChange={(value) =>
                                handleDocumentFieldChange(
                                  ["priority_score", "use_request_type_score"],
                                  value,
                                )
                              }
                            />
                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                              <p className="text-xs tracking-tight text-muted-foreground">
                                Created:{" "}
                                {formatDateTime(selectedConfig?.created_at)}
                              </p>
                              <p className="mt-1 text-xs tracking-tight text-muted-foreground">
                                Updated:{" "}
                                {formatDateTime(selectedConfig?.updated_at)}
                              </p>
                              <p className="mt-1 text-xs tracking-tight text-muted-foreground">
                                Activated:{" "}
                                {formatDateTime(selectedConfig?.activated_at)}
                              </p>
                            </div>
                          </div>
                        </FieldShell>
                      </div>
                    </SectionShell>

                    <SectionShell
                      eyebrow="Formula studio"
                      title="Canvas công thức kéo thả"
                      description="Chọn một expression, kéo biến hoặc khối hàm vào canvas, đổi vị trí token để tổ chức lại công thức rồi xem expression tree sinh ra ngay bên cạnh."
                      className={FORMULA_FIELD_META[activeFormulaField].tone}
                      collapsible
                      open={openSections.formula}
                      onToggle={() => toggleSection("formula")}
                      badge={
                        <div className="flex flex-wrap gap-2">
                          {(
                            Object.keys(FORMULA_FIELD_META) as FormulaField[]
                          ).map((field) => (
                            <button
                              type="button"
                              key={field}
                              onClick={() => setActiveFormulaField(field)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-sm font-medium tracking-tight transition-colors",
                                activeFormulaField === field
                                  ? "border-foreground/20 bg-foreground/[0.06] text-foreground"
                                  : "border-border/60 bg-background/80 text-muted-foreground",
                              )}
                            >
                              {FORMULA_FIELD_META[field].title}
                              {compileByField[field].error ? " · lỗi" : ""}
                            </button>
                          ))}
                        </div>
                      }
                      summary={
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Active formula
                            </p>
                            <p className="mt-1 text-sm font-semibold tracking-tight text-foreground">
                              {FORMULA_FIELD_META[activeFormulaField].title}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Tokens
                            </p>
                            <p className="mt-1 text-sm font-semibold tracking-tight text-foreground">
                              {formulaTokens[activeFormulaField].length} token
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Compile
                            </p>
                            <p className="mt-1 text-sm font-semibold tracking-tight text-foreground">
                              {activeFormulaCompile.error ? "Có lỗi" : "Ổn"}
                            </p>
                          </div>
                        </div>
                      }
                    >
                      <div className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <h3 className="text-base font-semibold tracking-tight text-foreground">
                              {FORMULA_FIELD_META[activeFormulaField].title}
                            </h3>
                            <p className="text-sm tracking-tight text-muted-foreground">
                              {
                                FORMULA_FIELD_META[activeFormulaField]
                                  .description
                              }
                            </p>
                          </div>
                          <Badge
                            variant={
                              activeFormulaCompile.error
                                ? "destructive"
                                : "success"
                            }
                          >
                            {activeFormulaCompile.error
                              ? "Compile lỗi"
                              : "Compile ổn"}
                          </Badge>
                        </div>
                        <Separator className="my-4" />
                        <FormulaCanvas
                          id={activeFormulaField}
                          activeField={activeFormulaField}
                          tokens={formulaTokens[activeFormulaField]}
                          disabled={!isDraft}
                          compile={activeFormulaCompile}
                          onTokensChange={(next) =>
                            handleFormulaTokensChange(activeFormulaField, next)
                          }
                        />
                      </div>
                    </SectionShell>

                    <SectionShell
                      eyebrow="Validation & snapshot"
                      title="Kiểm thử trên SOS thật và xem payload cuối"
                      description="Validate candidate config trên dữ liệu thật của SOS request, đồng thời giữ JSON snapshot ở cuối để cross-check nhanh với backend payload."
                      className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))]"
                      collapsible
                      open={openSections.validation}
                      onToggle={() => toggleSection("validation")}
                      badge={
                        <Badge
                          variant="outline"
                          className="border-border/60 bg-background/70"
                        >
                          End-to-end preview
                        </Badge>
                      }
                      summary={
                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              SOS preview id
                            </p>
                            <p className="mt-1 text-sm font-semibold tracking-tight text-foreground">
                              {previewSosRequestId.trim() || "Chưa nhập"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Validate state
                            </p>
                            <p className="mt-1 text-sm font-semibold tracking-tight text-foreground">
                              {validateMutation.isPending
                                ? "Đang chạy"
                                : validateMutation.isError
                                  ? "Lỗi"
                                  : validateMutation.data
                                    ? "Đã có kết quả"
                                    : "Chưa chạy"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Raw JSON
                            </p>
                            <p className="mt-1 text-sm font-semibold tracking-tight text-foreground">
                              {showRawJson ? "Đang mở" : "Đang ẩn"}
                            </p>
                          </div>
                        </div>
                      }
                    >
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                        <FieldShell
                          title="Validate preview"
                          description="Nhập `sos_request_id` để chạy validate end-to-end trên dữ liệu SOS thật."
                        >
                          <div className="space-y-3">
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Input
                                value={previewSosRequestId}
                                onChange={(event) => {
                                  setPreviewSosRequestId(event.target.value);
                                  validateMutation.reset();
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleValidate();
                                  }
                                }}
                                placeholder="Ví dụ: 123"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                disabled={
                                  validateMutation.isPending || !workingDocument
                                }
                                onClick={handleValidate}
                                className="sm:min-w-[120px]"
                              >
                                <CheckCircle size={14} />
                                Preview
                              </Button>
                            </div>

                            {previewSosRequestId.trim().length > 0 &&
                              !validateMutation.isPending &&
                              !validateMutation.data &&
                              !validateMutation.isError && (
                                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                                  <p className="text-sm tracking-tight text-muted-foreground">
                                    Nhập ID xong hãy bấm `Preview` hoặc nhấn
                                    `Enter` để tải kết quả validate.
                                  </p>
                                </div>
                              )}

                            {formulaErrorEntries.length > 0 && (
                              <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-3">
                                <p className="text-sm font-semibold tracking-tight text-destructive">
                                  Formula issues
                                </p>
                                <div className="mt-2 space-y-1 text-xs tracking-tight text-destructive">
                                  {formulaErrorEntries.map(
                                    ([field, message]) => (
                                      <p key={field}>
                                        {
                                          FORMULA_FIELD_META[
                                            field as FormulaField
                                          ].title
                                        }
                                        : {message}
                                      </p>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {(validateMutation.isPending ||
                              validateMutation.data ||
                              validateMutation.isError) && (
                              <div className="space-y-3 rounded-2xl border border-border/60 bg-background/80 p-4">
                                {validateMutation.isPending && (
                                  <p className="text-sm tracking-tight text-muted-foreground">
                                    Đang validate config candidate...
                                  </p>
                                )}

                                {validateMutation.isError && (
                                  <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-3">
                                    <p className="text-sm font-semibold tracking-tight text-destructive">
                                      Validate thất bại
                                    </p>
                                    <p className="mt-2 text-sm tracking-tight text-destructive">
                                      {validateMutation.error?.response?.data
                                        ?.message ??
                                        "Không lấy được preview cho SOS request này."}
                                    </p>
                                  </div>
                                )}

                                {validateMutation.data && (
                                  <>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge
                                        variant={
                                          validateMutation.data.is_valid
                                            ? "success"
                                            : "destructive"
                                        }
                                      >
                                        {validateMutation.data.is_valid
                                          ? "Config hợp lệ"
                                          : "Config lỗi"}
                                      </Badge>
                                      <span className="text-sm tracking-tight text-muted-foreground">
                                        {validateMutation.data.errors.length}{" "}
                                        lỗi
                                      </span>
                                    </div>

                                    {validateMutation.data.errors.length >
                                      0 && (
                                      <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-3">
                                        <div className="space-y-1.5 text-sm tracking-tight text-destructive">
                                          {validateMutation.data.errors.map(
                                            (error) => (
                                              <p key={error}>• {error}</p>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {validateMutation.data.preview && (
                                      <div className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                                        <div className="grid gap-3 sm:grid-cols-3">
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                              SOS Request
                                            </p>
                                            <p className="mt-1 font-mono text-sm font-semibold">
                                              {
                                                validateMutation.data.preview
                                                  .sos_request_id
                                              }
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                              Priority score
                                            </p>
                                            <p className="mt-1 font-mono text-sm font-semibold">
                                              {
                                                validateMutation.data.preview
                                                  .priority_score
                                              }
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                              Priority level
                                            </p>
                                            <p className="mt-1 font-mono text-sm font-semibold">
                                              {
                                                validateMutation.data.preview
                                                  .priority_level
                                              }
                                            </p>
                                          </div>
                                        </div>

                                        <Textarea
                                          readOnly
                                          value={JSON.stringify(
                                            validateMutation.data.preview
                                              .breakdown ?? {},
                                            null,
                                            2,
                                          )}
                                          className="min-h-[260px] font-mono text-xs leading-6"
                                        />
                                      </div>
                                    )}

                                    {!validateMutation.data.preview &&
                                      previewSosRequestId.trim().length > 0 &&
                                      validateMutation.data.errors.length ===
                                        0 && (
                                        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3">
                                          <p className="text-sm tracking-tight text-amber-700">
                                            Config hợp lệ nhưng backend không
                                            trả về preview cho `sos_request_id`
                                            này.
                                          </p>
                                        </div>
                                      )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </FieldShell>

                        <FieldShell
                          title="Raw JSON snapshot"
                          description="Snapshot này giúp đối chiếu nhanh với payload thật gửi sang backend khi cần debug."
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs tracking-tight text-muted-foreground">
                                Có thể dùng như read-only audit trail cho những
                                field ít dùng.
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setShowRawJson((current) => !current)
                                }
                              >
                                {showRawJson ? "Ẩn JSON" : "Xem JSON"}
                              </Button>
                            </div>
                            {showRawJson ? (
                              <Textarea
                                readOnly
                                value={jsonSnapshot}
                                className="min-h-[420px] font-mono text-xs leading-6"
                              />
                            ) : (
                              <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-5 text-sm tracking-tight text-muted-foreground">
                                JSON snapshot đang được ẩn để giao diện tập
                                trung vào editor trực quan. Bấm `Xem JSON` khi
                                cần kiểm tra payload chi tiết.
                              </div>
                            )}
                          </div>
                        </FieldShell>
                      </div>
                    </SectionShell>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="warning-band" className="space-y-4">
            <WarningBandConfigCard />
          </TabsContent>

          <TabsContent value="supply-priority" className="mt-5 space-y-4">
            <SupplyRequestPriorityConfigCard />
          </TabsContent>

          <TabsContent
            value="rescuer-score-visibility"
            className="mt-5 space-y-4"
          >
            <RescuerScoreVisibilityConfigCard />
          </TabsContent>
        </Tabs>
        <Dialog
          open={deleteDraftTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteDraftTarget(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="tracking-tight text-destructive">
                Xoá draft config
              </DialogTitle>
              <DialogDescription className="tracking-tight">
                {deleteDraftTarget
                  ? `Draft '${deleteDraftTarget.label}' sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.`
                  : "Xác nhận xoá draft config."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDraftTarget(null)}
                disabled={deleteDraftMutation.isPending}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteDraft}
                disabled={deleteDraftMutation.isPending}
              >
                <Trash size={14} className="mr-1.5" />
                {deleteDraftMutation.isPending ? "Đang xoá..." : "Xoá draft"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminConfigPage;
