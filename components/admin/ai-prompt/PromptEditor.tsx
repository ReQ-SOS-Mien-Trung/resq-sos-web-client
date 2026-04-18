"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  CircleNotch,
  FloppyDisk,
  Gear,
  TestTube,
  Trash,
  X,
} from "@phosphor-icons/react";
import AiStreamPanel from "@/components/coordinator/AiStreamPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  INITIAL_FORM_DATA,
  PROMPT_TYPE_OPTIONS,
  PROMPT_VARIABLES_BY_TYPE,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PromptFormData, PromptTextField } from "@/type";
import { useSOSClusters } from "@/services/sos_cluster/hooks";
import type {
  ClusterMissionType,
  ClusterRescueSuggestionResponse,
  ClusterSeverityLevel,
  ClusterSuggestedActivity,
} from "@/services/sos_cluster/type";
import type {
  CreatePromptRequest,
  PromptDetailEntity,
  PromptType,
  TestNewPromptRescueSuggestionRequest,
  TestPromptRescueSuggestionRequest,
  TestPromptRescueSuggestionResponse,
  UpdatePromptRequest,
} from "@/services/prompt/type";
import {
  useTestNewPromptRescueSuggestion,
  useTestPromptRescueSuggestion,
} from "@/services/prompt/hooks";
import type { AiConfigSummaryEntity } from "@/services/ai-config/type";

const FORM_SELECT_TRIGGER_CLASSNAME =
  "h-12 w-full rounded-lg bg-background px-4 text-sm";
const FORM_INPUT_CLASSNAME = "h-12 rounded-lg bg-background px-4 text-sm";
const INVALID_FIELD_CLASSNAME =
  "border-destructive focus-visible:ring-destructive/20";

type PromptEditorProps = {
  prompt?: PromptDetailEntity | null;
  forcedPromptType?: PromptType | null;
  aiConfig?: AiConfigSummaryEntity | null;
  aiConfigId?: number | null;
  isSubmitting?: boolean;
  onSave: (
    data: CreatePromptRequest | UpdatePromptRequest,
  ) => void | Promise<void>;
  onDiscardDraft?: () => void;
  canDiscardDraft?: boolean;
  isDiscardingDraft?: boolean;
  onRollbackProduction?: () => void;
  canRollbackProduction?: boolean;
  isRollingBackProduction?: boolean;
  rollbackProductionLabel?: string | null;
  onOpenPreviousVersion?: () => void;
  onOpenNextVersion?: () => void;
  canOpenPreviousVersion?: boolean;
  canOpenNextVersion?: boolean;
  previousVersionLabel?: string | null;
  nextVersionLabel?: string | null;
  isOpeningVersion?: boolean;
  onCancel: () => void;
  hideHeaderClose?: boolean;
  onOpenAiConfig?: () => void;
};

type PromptReviewPhase =
  | "idle"
  | "connecting"
  | "loading-data"
  | "calling-ai"
  | "processing"
  | "done"
  | "error";

type PromptReviewLogEntry = {
  id: number;
  timestamp: number;
  message: string;
  type: "status" | "chunk" | "result" | "error";
};

type PromptDetailTypeFallback = PromptDetailEntity & {
  prompt_type?: string | null;
};

const VALID_MISSION_TYPES: ReadonlySet<string> = new Set([
  "RESCUE",
  "EVACUATE",
  "MEDICAL",
  "SUPPLY",
  "MIXED",
]);

const VALID_SEVERITY_LEVELS: ReadonlySet<string> = new Set([
  "Low",
  "Medium",
  "High",
  "Critical",
]);

const canonicalizePromptType = (value: string): string =>
  value.replace(/[^a-z0-9]/gi, "").toLowerCase();

const promptTypeByCanonical = new Map<string, PromptType>(
  PROMPT_TYPE_OPTIONS.map((option) => [
    canonicalizePromptType(option.value),
    option.value,
  ]),
);

const normalizePromptType = (
  ...candidates: Array<string | null | undefined>
): PromptType => {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const trimmedCandidate = candidate.trim();
    if (!trimmedCandidate) {
      continue;
    }

    const matchedPromptType = promptTypeByCanonical.get(
      canonicalizePromptType(trimmedCandidate),
    );

    if (matchedPromptType) {
      return matchedPromptType;
    }
  }

  return INITIAL_FORM_DATA.prompt_type;
};

const stripVersionPrefix = (version: string): string =>
  version.replace(/^v/i, "");

const toVersionString = (version: string): string =>
  `v${stripVersionPrefix(version)}`;

function getStatusLabel(status: string) {
  if (status === "Active") {
    return "Đang chạy";
  }

  if (status === "Draft") {
    return "Bản nháp";
  }

  if (status === "Archived") {
    return "Lưu trữ";
  }

  return status;
}

type PromptFormErrors = Partial<Record<keyof PromptFormData, string>>;

function validatePromptForm(
  formData: PromptFormData,
  isEditing: boolean,
): PromptFormErrors {
  const errors: PromptFormErrors = {};
  const trimmedName = formData.name.trim();
  const trimmedPurpose = formData.purpose.trim();
  const trimmedSystemPrompt = formData.system_prompt.trim();
  const trimmedUserPromptTemplate = formData.user_prompt_template.trim();
  const normalizedVersion = toVersionString(formData.version.trim());

  if (!trimmedName) {
    errors.name = "Tên mẫu lệnh không được để trống.";
  } else if (trimmedName.length > 255) {
    errors.name = "Tên mẫu lệnh không được vượt quá 255 ký tự.";
  }

  if (!trimmedPurpose) {
    errors.purpose = "Mục đích không được để trống.";
  }

  if (!trimmedSystemPrompt) {
    errors.system_prompt = "Lệnh hệ thống không được để trống.";
  }

  if (!trimmedUserPromptTemplate) {
    errors.user_prompt_template = "Mẫu lệnh người dùng không được để trống.";
  }

  if (!formData.version.trim()) {
    errors.version = "Phiên bản không được để trống.";
  } else if (normalizedVersion.length > 20) {
    errors.version = "Phiên bản không được vượt quá 20 ký tự.";
  } else if (isEditing && !normalizedVersion.includes("-D")) {
    errors.version = "Phiên bản của bản nháp phải chứa hậu tố '-D'.";
  } else if (!isEditing && normalizedVersion.includes("-D")) {
    errors.version =
      "Phiên bản tạo mới không được dùng định dạng bản nháp '-D'. Hãy tạo xong rồi tạo bản nháp khi cần sửa.";
  }

  return errors;
}

function findMatchingClosingBrace(source: string, openIndex: number): number {
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === "\\") {
        escaping = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }

      if (depth < 0) {
        return -1;
      }
    }
  }

  return -1;
}

function splitSystemPromptSections(systemPrompt: string): {
  editableText: string;
  lockedJson: string;
} {
  const normalizedPrompt = systemPrompt.toLowerCase();
  const markerIndex = normalizedPrompt.lastIndexOf("format json");
  let searchIndex = markerIndex >= 0 ? markerIndex : 0;

  while (searchIndex < systemPrompt.length) {
    const openIndex = systemPrompt.indexOf("{", searchIndex);

    if (openIndex === -1) {
      break;
    }

    const closeIndex = findMatchingClosingBrace(systemPrompt, openIndex);
    if (closeIndex === -1) {
      break;
    }

    const trailingText = systemPrompt.slice(closeIndex + 1).trim();
    if (trailingText.length > 0) {
      searchIndex = openIndex + 1;
      continue;
    }

    const lockedJson = systemPrompt.slice(openIndex, closeIndex + 1).trim();
    if (!lockedJson.includes(":")) {
      searchIndex = openIndex + 1;
      continue;
    }

    return {
      editableText: systemPrompt.slice(0, openIndex).trimEnd(),
      lockedJson,
    };
  }

  return {
    editableText: systemPrompt,
    lockedJson: "",
  };
}

function mergeSystemPromptSections(
  editableText: string,
  lockedJson: string,
): string {
  if (!lockedJson.trim()) {
    return editableText;
  }

  const trimmedText = editableText.trimEnd();
  if (!trimmedText) {
    return lockedJson.trim();
  }

  return `${trimmedText}\n\n${lockedJson.trim()}`;
}

const mapDetailToForm = (detail: PromptDetailEntity): PromptFormData => ({
  name: detail.name,
  prompt_type: normalizePromptType(
    detail.promptType,
    (detail as PromptDetailTypeFallback).prompt_type,
  ),
  purpose: detail.purpose ?? "",
  system_prompt: detail.systemPrompt ?? "",
  user_prompt_template: detail.userPromptTemplate ?? "",
  version: stripVersionPrefix(detail.version ?? ""),
  is_active: detail.isActive,
});

const VariableChips = ({
  variables = [],
  onInsert,
}: {
  variables?: readonly { label: string; value: string }[];
  onInsert: (field: PromptTextField, variable: string) => void;
}) => (
  <div className="flex flex-wrap gap-1.5 pb-1">
    {variables.map((item) => (
      <button
        key={`variable-${item.value}`}
        type="button"
        onClick={() => onInsert("user_prompt_template", item.value)}
        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
      >
        + {item.label}
      </button>
    ))}
  </div>
);

function normalizeMissionType(value?: string | null): ClusterMissionType {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (VALID_MISSION_TYPES.has(normalized)) {
    return normalized as ClusterMissionType;
  }

  return "MIXED";
}

function normalizeSeverityLevel(value?: string | null): ClusterSeverityLevel {
  const normalized = value?.trim() ?? "";
  if (VALID_SEVERITY_LEVELS.has(normalized)) {
    return normalized as ClusterSeverityLevel;
  }

  const normalizedLower = normalized.toLowerCase();
  if (normalizedLower === "low") return "Low";
  if (normalizedLower === "medium") return "Medium";
  if (normalizedLower === "high") return "High";
  if (normalizedLower === "critical") return "Critical";

  return "Medium";
}

function normalizeConfidenceScore(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0.5;
  }

  if (value > 1) {
    return Math.min(1, value / 100);
  }

  return Math.min(1, Math.max(0, value));
}

function mapPromptTestResponseToReviewResult(
  response: TestPromptRescueSuggestionResponse,
): ClusterRescueSuggestionResponse {
  const activities: ClusterSuggestedActivity[] =
    response.suggestedActivities?.map((activity, index) => ({
      step: activity.step ?? index + 1,
      activityType:
        (activity.activityType as ClusterSuggestedActivity["activityType"]) ||
        "MIXED",
      description: activity.description || "Không có mô tả chi tiết.",
      priority: activity.priority || "Medium",
      estimatedTime: activity.estimatedTime || "Chưa xác định",
      executionMode: activity.executionMode ?? null,
      requiredTeamCount: activity.requiredTeamCount ?? null,
      coordinationGroupKey: activity.coordinationGroupKey ?? null,
      coordinationNotes: activity.coordinationNotes ?? null,
      sosRequestId: activity.sosRequestId ?? null,
      depotId: activity.depotId ?? null,
      depotName: activity.depotName ?? null,
      depotAddress: activity.depotAddress ?? null,
      assemblyPointId: activity.assemblyPointId ?? null,
      assemblyPointName: activity.assemblyPointName ?? null,
      assemblyPointLatitude: activity.assemblyPointLatitude ?? null,
      assemblyPointLongitude: activity.assemblyPointLongitude ?? null,
      suppliesToCollect: activity.suppliesToCollect
        ? activity.suppliesToCollect.map((item) => ({
            itemId: item.itemId ?? 0,
            itemName: item.itemName ?? "Vật phẩm",
            quantity: Number(item.quantity) || 0,
            unit: item.unit ?? "đơn vị",
          }))
        : null,
      suggestedTeam: activity.suggestedTeam
        ? {
            teamId: activity.suggestedTeam.teamId,
            teamName: activity.suggestedTeam.teamName,
            teamType: activity.suggestedTeam.teamType,
            reason: activity.suggestedTeam.reason,
            assemblyPointId: activity.suggestedTeam.assemblyPointId,
            assemblyPointName: activity.suggestedTeam.assemblyPointName,
            latitude: activity.suggestedTeam.latitude,
            longitude: activity.suggestedTeam.longitude,
            distanceKm: activity.suggestedTeam.distanceKm,
          }
        : null,
    })) ?? [];

  return {
    suggestionId: response.suggestionId ?? 0,
    isSuccess: response.isSuccess,
    errorMessage: response.errorMessage,
    modelName:
      response.modelName?.trim() || response.model?.trim() || "Không có",
    responseTimeMs: response.responseTimeMs ?? 0,
    sosRequestCount: response.sosRequestCount ?? 0,
    suggestedMissionTitle:
      response.suggestedMissionTitle?.trim() ||
      response.promptName ||
      "Kế hoạch cứu hộ",
    suggestedMissionType: normalizeMissionType(response.suggestedMissionType),
    suggestedPriorityScore:
      typeof response.suggestedPriorityScore === "number"
        ? response.suggestedPriorityScore
        : 0,
    suggestedSeverityLevel: normalizeSeverityLevel(
      response.suggestedSeverityLevel,
    ),
    overallAssessment:
      response.overallAssessment?.trim() ||
      "Chưa có đánh giá tổng quan từ máy chủ.",
    suggestedActivities: activities,
    suggestedResources:
      response.suggestedResources?.map((resource) => ({
        resourceType:
          resource.resourceType as ClusterRescueSuggestionResponse["suggestedResources"][number]["resourceType"],
        description: resource.description,
        quantity: resource.quantity,
        priority: resource.priority,
      })) ?? [],
    estimatedDuration: response.estimatedDuration || "Chưa xác định",
    specialNotes: response.specialNotes,
    confidenceScore: normalizeConfidenceScore(response.confidenceScore),
    needsManualReview: response.needsManualReview,
    lowConfidenceWarning: response.lowConfidenceWarning,
    multiDepotRecommended: response.multiDepotRecommended,
  };
}

function parseStatusCodeFromText(raw?: string | null): number | null {
  if (!raw) {
    return null;
  }

  const statusMatch = raw.match(/\b([1-5]\d{2})\b/);
  if (!statusMatch) {
    return null;
  }

  const code = Number(statusMatch[1]);
  return Number.isFinite(code) ? code : null;
}

function toUserFriendlyAiErrorMessage(options: {
  rawMessage?: string | null;
  statusCode?: number | null;
}): string {
  const rawMessage = options.rawMessage?.trim() ?? "";
  const normalizedMessage = rawMessage.toLowerCase();
  const statusCode =
    options.statusCode ?? parseStatusCodeFromText(options.rawMessage);

  const isRateLimitError =
    statusCode === 429 ||
    /(429|rate\s*limit|too\s*many\s*requests|quota|resource\s*has\s*been\s*exhausted|exhausted|token)/i.test(
      normalizedMessage,
    );

  if (isRateLimitError) {
    return "AI đang tạm hết token/quota hoặc quá tải. Vui lòng thử lại sau vài phút.";
  }

  const isAuthorizationError =
    statusCode === 401 ||
    statusCode === 403 ||
    /(unauthorized|forbidden|api\s*key|permission denied|access denied)/i.test(
      normalizedMessage,
    );

  if (isAuthorizationError) {
    return "Không thể gọi AI do thiếu quyền hoặc khóa API chưa hợp lệ. Vui lòng kiểm tra lại cấu hình.";
  }

  const isTimeoutError =
    statusCode === 408 ||
    statusCode === 504 ||
    /(timeout|timed\s*out|deadline\s*exceeded|gateway\s*timeout)/i.test(
      normalizedMessage,
    );

  if (isTimeoutError) {
    return "AI phản hồi quá chậm nên phiên chạy thử đã quá thời gian. Vui lòng thử lại.";
  }

  const isServerError =
    (typeof statusCode === "number" && statusCode >= 500) ||
    /(internal\s*server\s*error|bad\s*gateway|service\s*unavailable)/i.test(
      normalizedMessage,
    );

  if (isServerError) {
    return "Dịch vụ AI đang gián đoạn tạm thời. Vui lòng thử lại sau.";
  }

  if (
    /(network|failed\s*to\s*fetch|connection|socket|econn|enotfound)/i.test(
      normalizedMessage,
    )
  ) {
    return "Không kết nối được tới dịch vụ AI. Vui lòng kiểm tra mạng rồi thử lại.";
  }

  return (
    rawMessage || "AI chưa thể xử lý yêu cầu lúc này. Vui lòng thử lại sau."
  );
}

function extractPromptTestErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) {
    return toUserFriendlyAiErrorMessage({ rawMessage: error });
  }

  if (error && typeof error === "object") {
    const maybeError = error as {
      message?: unknown;
      response?: {
        status?: unknown;
        data?: {
          message?: unknown;
        };
      };
    };

    const statusCode =
      typeof maybeError.response?.status === "number"
        ? maybeError.response.status
        : null;

    if (
      typeof maybeError.response?.data?.message === "string" &&
      maybeError.response.data.message.trim()
    ) {
      return toUserFriendlyAiErrorMessage({
        rawMessage: maybeError.response.data.message,
        statusCode,
      });
    }

    if (typeof maybeError.message === "string" && maybeError.message.trim()) {
      return toUserFriendlyAiErrorMessage({
        rawMessage: maybeError.message,
        statusCode,
      });
    }
  }

  return "AI chưa thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.";
}

const PromptEditor = ({
  prompt,
  forcedPromptType = null,
  aiConfig = null,
  aiConfigId = null,
  isSubmitting = false,
  onSave,
  onDiscardDraft,
  canDiscardDraft = false,
  isDiscardingDraft = false,
  onRollbackProduction,
  canRollbackProduction = false,
  isRollingBackProduction = false,
  rollbackProductionLabel = null,
  onOpenPreviousVersion,
  onOpenNextVersion,
  canOpenPreviousVersion = false,
  canOpenNextVersion = false,
  previousVersionLabel = null,
  nextVersionLabel = null,
  isOpeningVersion = false,
  onCancel,
  hideHeaderClose = false,
  onOpenAiConfig,
}: PromptEditorProps) => {
  const isEditing = Boolean(prompt);
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const userPromptRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState<PromptFormData>(INITIAL_FORM_DATA);
  const [previewClusterId, setPreviewClusterId] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewStatusLog, setReviewStatusLog] = useState<
    PromptReviewLogEntry[]
  >([]);
  const [reviewResult, setReviewResult] =
    useState<ClusterRescueSuggestionResponse | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewPhase, setReviewPhase] = useState<PromptReviewPhase>("idle");
  const reviewLogIdRef = useRef(0);
  const [testSnapshots, setTestSnapshots] = useState<PromptFormData[]>([]);
  const [testSnapshotIndex, setTestSnapshotIndex] = useState(-1);
  const testSnapshotsRef = useRef<PromptFormData[]>([]);
  const testSnapshotIndexRef = useRef(-1);

  const textareaRefMap = useMemo<
    Record<PromptTextField, React.RefObject<HTMLTextAreaElement | null>>
  >(
    () => ({
      system_prompt: systemPromptRef,
      user_prompt_template: userPromptRef,
    }),
    [],
  );

  const { data: clustersData, isLoading: clustersLoading } = useSOSClusters();
  const testExistingPromptMutation = useTestPromptRescueSuggestion();
  const testNewPromptMutation = useTestNewPromptRescueSuggestion();

  const clearTestSnapshots = useCallback(() => {
    setTestSnapshots([]);
    setTestSnapshotIndex(-1);
    testSnapshotsRef.current = [];
    testSnapshotIndexRef.current = -1;
  }, []);

  const pushTestSnapshot = useCallback((snapshot: PromptFormData) => {
    const currentSnapshots = testSnapshotsRef.current;
    const currentIndex = testSnapshotIndexRef.current;
    const nextSnapshots = [
      ...currentSnapshots.slice(0, currentIndex + 1),
      { ...snapshot },
    ];

    const nextIndex = nextSnapshots.length - 1;
    testSnapshotsRef.current = nextSnapshots;
    testSnapshotIndexRef.current = nextIndex;
    setTestSnapshots(nextSnapshots);
    setTestSnapshotIndex(nextIndex);
  }, []);

  const restoreTestSnapshot = useCallback((snapshot: PromptFormData) => {
    setFormData({ ...snapshot });
    setReviewStatus("Đã khôi phục bản lưu nhanh trước khi chạy thử.");
    setReviewError(null);
    setReviewPhase("idle");
  }, []);

  const undoTestSnapshot = useCallback(() => {
    const currentIndex = testSnapshotIndexRef.current;
    if (currentIndex < 0) {
      return false;
    }

    const snapshot = testSnapshotsRef.current[currentIndex];
    if (!snapshot) {
      return false;
    }

    const nextIndex = currentIndex - 1;
    testSnapshotIndexRef.current = nextIndex;
    setTestSnapshotIndex(nextIndex);
    restoreTestSnapshot(snapshot);
    return true;
  }, [restoreTestSnapshot]);

  const redoTestSnapshot = useCallback(() => {
    const nextIndex = testSnapshotIndexRef.current + 1;
    const snapshot = testSnapshotsRef.current[nextIndex];
    if (!snapshot) {
      return false;
    }

    testSnapshotIndexRef.current = nextIndex;
    setTestSnapshotIndex(nextIndex);
    restoreTestSnapshot(snapshot);
    return true;
  }, [restoreTestSnapshot]);

  const canUndoTestSnapshot = testSnapshotIndex >= 0;
  const canRedoTestSnapshot = testSnapshotIndex + 1 < testSnapshots.length;

  useEffect(() => {
    testSnapshotsRef.current = testSnapshots;
  }, [testSnapshots]);

  useEffect(() => {
    testSnapshotIndexRef.current = testSnapshotIndex;
  }, [testSnapshotIndex]);

  useEffect(() => {
    if (prompt) {
      clearTestSnapshots();
      setFormData(mapDetailToForm(prompt));
      return;
    }

    clearTestSnapshots();
    setFormData({
      ...INITIAL_FORM_DATA,
      prompt_type: forcedPromptType ?? INITIAL_FORM_DATA.prompt_type,
    });
  }, [clearTestSnapshots, forcedPromptType, prompt]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;
      if (!hasModifier || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const isUndo = key === "z" && !event.shiftKey;
      const isRedo = key === "y" || (key === "z" && event.shiftKey);

      if (!isUndo && !isRedo) {
        return;
      }

      const restored = isUndo ? undoTestSnapshot() : redoTestSnapshot();
      if (!restored) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [redoTestSnapshot, undoTestSnapshot]);

  useEffect(() => {
    const firstClusterId = clustersData?.clusters?.[0]?.id ?? null;
    if (previewClusterId === null && firstClusterId !== null) {
      setPreviewClusterId(firstClusterId);
    }
  }, [clustersData, previewClusterId]);

  const addReviewLog = useCallback(
    (message: string, type: PromptReviewLogEntry["type"]) => {
      reviewLogIdRef.current += 1;
      setReviewStatusLog((previous) => [
        ...previous,
        {
          id: reviewLogIdRef.current,
          timestamp: Date.now(),
          message,
          type,
        },
      ]);
    },
    [],
  );

  const resetReview = useCallback(() => {
    setReviewStatus("");
    setReviewStatusLog([]);
    setReviewResult(null);
    setReviewError(null);
    setReviewLoading(false);
    setReviewPhase("idle");
    reviewLogIdRef.current = 0;
  }, []);

  useEffect(() => {
    resetReview();
  }, [
    aiConfigId,
    formData.name,
    formData.prompt_type,
    formData.purpose,
    formData.system_prompt,
    formData.user_prompt_template,
    formData.version,
    previewClusterId,
    resetReview,
  ]);

  const updateField = <K extends keyof PromptFormData>(
    key: K,
    value: PromptFormData[K],
  ) => {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const effectivePromptType = normalizePromptType(
    forcedPromptType,
    formData.prompt_type,
    prompt?.promptType,
    (prompt as PromptDetailTypeFallback | undefined)?.prompt_type,
  );
  const selectedPromptType = PROMPT_TYPE_OPTIONS.find(
    (option) => option.value === effectivePromptType,
  );
  const promptTypeVariables = PROMPT_VARIABLES_BY_TYPE[effectivePromptType];
  const clusterOptions = clustersData?.clusters ?? [];
  const {
    editableText: editableSystemPromptText,
    lockedJson: lockedSystemPromptJson,
  } = useMemo(
    () => splitSystemPromptSections(formData.system_prompt),
    [formData.system_prompt],
  );
  const hasLockedSystemPromptJson = lockedSystemPromptJson.length > 0;
  const promptFormErrors = useMemo(
    () => validatePromptForm(formData, isEditing),
    [formData, isEditing],
  );
  const canSubmit = Object.keys(promptFormErrors).length === 0;
  const canRunPromptTest = Boolean(previewClusterId && canSubmit);

  const handleInsertVariable = useCallback(
    (field: PromptTextField, variable: string) => {
      const textarea = textareaRefMap[field].current;
      if (!textarea) {
        return;
      }

      const { selectionStart: start, selectionEnd: end } = textarea;
      const insertion = `{{${variable}}}`;
      const newText =
        formData[field].slice(0, start) +
        insertion +
        formData[field].slice(end);

      updateField(field, newText);

      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPosition = start + insertion.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      });
    },
    [formData, textareaRefMap],
  );

  const handleSystemPromptTextChange = (nextText: string) => {
    updateField(
      "system_prompt",
      mergeSystemPromptSections(nextText, lockedSystemPromptJson),
    );
  };

  const buildPayload = useCallback((): UpdatePromptRequest => {
    const resolvedPromptType = normalizePromptType(
      forcedPromptType,
      formData.prompt_type,
      prompt?.promptType,
      (prompt as PromptDetailTypeFallback | undefined)?.prompt_type,
    );

    return {
      name: formData.name.trim(),
      prompt_type: resolvedPromptType,
      purpose: formData.purpose.trim(),
      system_prompt: formData.system_prompt.trim(),
      user_prompt_template: formData.user_prompt_template.trim(),
      version: toVersionString(formData.version.trim()),
      is_active: formData.is_active,
    };
  }, [forcedPromptType, formData, prompt]);

  const runPromptTest = useCallback(async () => {
    if (!previewClusterId) {
      return;
    }

    pushTestSnapshot(formData);

    const payload = buildPayload();
    const requestBase = {
      clusterId: previewClusterId,
      ...payload,
      ai_config_id: aiConfigId ?? undefined,
    };

    setReviewLoading(true);
    setReviewError(null);
    setReviewResult(null);
    setReviewPhase("calling-ai");
    setReviewStatus("Đang gửi bản nháp để chạy thử...");
    setReviewStatusLog([]);
    addReviewLog("Đang gửi bản nháp để chạy thử...", "status");

    try {
      const response =
        isEditing && prompt
          ? await testExistingPromptMutation.mutateAsync({
              id: prompt.id,
              data: requestBase as TestPromptRescueSuggestionRequest,
            })
          : await testNewPromptMutation.mutateAsync(
              requestBase as TestNewPromptRescueSuggestionRequest,
            );

      if (!response.isSuccess) {
        const failureMessage = toUserFriendlyAiErrorMessage({
          rawMessage: response.errorMessage,
          statusCode: response.httpStatusCode,
        });
        setReviewError(failureMessage);
        setReviewStatus("AI trả về lỗi khi chạy thử mẫu lệnh.");
        setReviewPhase("error");
        addReviewLog(failureMessage, "error");
        setReviewLoading(false);
        return;
      }

      const mappedResult = mapPromptTestResponseToReviewResult(response);
      const completedMessage = `Chạy thử hoàn tất. Đã tạo ${mappedResult.suggestedActivities.length} hoạt động đề xuất.`;

      setReviewResult(mappedResult);
      setReviewStatus(completedMessage);
      setReviewPhase("done");
      addReviewLog(completedMessage, "result");
    } catch (error) {
      const message = extractPromptTestErrorMessage(error);
      setReviewError(message);
      setReviewStatus(message);
      setReviewPhase("error");
      addReviewLog(message, "error");
    } finally {
      setReviewLoading(false);
    }
  }, [
    addReviewLog,
    aiConfigId,
    buildPayload,
    formData,
    isEditing,
    previewClusterId,
    prompt,
    pushTestSnapshot,
    testExistingPromptMutation,
    testNewPromptMutation,
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const payload = buildPayload();

    if (isEditing) {
      await Promise.resolve(onSave(payload as UpdatePromptRequest));
      return;
    }

    await Promise.resolve(onSave(payload as CreatePromptRequest));
  };

  return (
    <Card className="animate-in slide-in-from-top-2 border border-border/60 bg-card/95 shadow-sm duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Gear size={20} weight="duotone" />
            {isEditing ? "Chỉnh sửa bản nháp mẫu lệnh" : "Tạo mẫu lệnh mới"}
          </CardTitle>
          {!hideHeaderClose ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onCancel}
            >
              <X size={16} />
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium">
                Loại: {selectedPromptType?.label || effectivePromptType}
              </span>
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium">
                Phiên bản: {toVersionString(formData.version || "1.0")}
              </span>
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium">
                Trạng thái: {getStatusLabel(prompt?.status ?? "Mới")}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {isEditing
                ? "Mẫu lệnh hiện được chỉnh trên bản nháp phía máy chủ. Sau khi lưu bạn có thể chạy thử tiếp hoặc kích hoạt từ màn hình chính."
                : "Tạo mẫu lệnh mới rồi chạy thử nhanh với cấu hình AI đang chọn trước khi đưa vào hệ thống."}
            </p>
            {isEditing ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onOpenPreviousVersion}
                  disabled={
                    isSubmitting ||
                    isOpeningVersion ||
                    !canOpenPreviousVersion ||
                    !onOpenPreviousVersion
                  }
                >
                  <CaretLeft size={14} className="mr-1.5" />
                  {previousVersionLabel
                    ? `Phiên bản trước: ${previousVersionLabel}`
                    : "Phiên bản trước"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onOpenNextVersion}
                  disabled={
                    isSubmitting ||
                    isOpeningVersion ||
                    !canOpenNextVersion ||
                    !onOpenNextVersion
                  }
                >
                  <CaretRight size={14} className="mr-1.5" />
                  {nextVersionLabel
                    ? `Phiên bản sau: ${nextVersionLabel}`
                    : "Phiên bản sau"}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-4">
              <section className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
                <h3 className="text-sm font-semibold text-foreground">
                  Thông tin cơ bản
                </h3>

                <div className="space-y-1.5">
                  <Label htmlFor="prompt_name">Tên mẫu lệnh *</Label>
                  <Input
                    id="prompt_name"
                    value={formData.name}
                    maxLength={255}
                    className={cn(
                      FORM_INPUT_CLASSNAME,
                      promptFormErrors.name && INVALID_FIELD_CLASSNAME,
                    )}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    required
                    placeholder="Ví dụ: Lập kế hoạch nhiệm vụ"
                  />
                  {promptFormErrors.name ? (
                    <p className="text-sm text-destructive">
                      {promptFormErrors.name}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="prompt_version">Phiên bản *</Label>
                    <Input
                      id="prompt_version"
                      value={formData.version}
                      className={cn(
                        FORM_INPUT_CLASSNAME,
                        promptFormErrors.version && INVALID_FIELD_CLASSNAME,
                      )}
                      onChange={(event) =>
                        updateField(
                          "version",
                          event.target.value.replace(/[^0-9.a-zA-Z-]/g, ""),
                        )
                      }
                      leftIcon={
                        <span className="text-sm text-muted-foreground/70">
                          v
                        </span>
                      }
                      placeholder="1.0"
                    />
                    <p
                      className={cn(
                        "text-sm",
                        promptFormErrors.version
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {promptFormErrors.version ??
                        (isEditing
                          ? "Phiên bản bản nháp phải giữ hậu tố -D theo quy tắc máy chủ."
                          : "Mẫu lệnh tạo mới không dùng hậu tố -D. Máy chủ sẽ tạo bản nháp riêng khi cần chỉnh sửa.")}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prompt_type">Loại mẫu lệnh *</Label>
                    <Select
                      value={effectivePromptType}
                      onValueChange={(value) =>
                        updateField("prompt_type", normalizePromptType(value))
                      }
                      disabled={isEditing}
                    >
                      <SelectTrigger
                        id="prompt_type"
                        className={cn(
                          FORM_SELECT_TRIGGER_CLASSNAME,
                          "border-input",
                        )}
                      >
                        <SelectValue placeholder="Chọn loại mẫu lệnh" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROMPT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {selectedPromptType?.description}
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="prompt_purpose">Mục đích *</Label>
                  <Input
                    id="prompt_purpose"
                    value={formData.purpose}
                    className={cn(
                      FORM_INPUT_CLASSNAME,
                      promptFormErrors.purpose && INVALID_FIELD_CLASSNAME,
                    )}
                    onChange={(event) =>
                      updateField("purpose", event.target.value)
                    }
                    required
                    placeholder="Mô tả ngắn gọn mục đích mẫu lệnh"
                  />
                  {promptFormErrors.purpose ? (
                    <p className="text-sm text-destructive">
                      {promptFormErrors.purpose}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-3">
                    <input
                      id="prompt_is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(event) =>
                        updateField("is_active", event.target.checked)
                      }
                      className="rounded border-border"
                    />
                    <Label
                      htmlFor="prompt_is_active"
                      className="cursor-pointer text-sm font-medium"
                    >
                      Đánh dấu đang chạy khi tạo mới
                    </Label>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Với bản nháp đang chỉnh, máy chủ sẽ không cho kích hoạt qua
                    điểm cuối cập nhật.
                  </p>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Cấu hình AI dùng chung
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Mẫu lệnh không còn giữ mô hình hoặc nhà cung cấp riêng.
                      Toàn bộ phần AI lấy từ cấu hình AI hệ thống đang chọn.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onOpenAiConfig}
                    disabled={!onOpenAiConfig}
                  >
                    Mở cấu hình AI
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">
                      Nhà cung cấp
                    </p>
                    <p className="mt-1 font-medium">
                      {aiConfig?.provider ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">Mô hình</p>
                    <p className="mt-1 font-medium break-all">
                      {aiConfig?.model ?? "Chưa có cấu hình AI"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">Nhiệt độ</p>
                    <p className="mt-1 font-medium">
                      {aiConfig?.temperature ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">
                      Số token tối đa
                    </p>
                    <p className="mt-1 font-medium">
                      {aiConfig?.maxTokens?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground">Địa chỉ API</p>
                  <p className="mt-1 break-all font-medium">
                    {aiConfig?.apiUrl || "Dùng địa chỉ mặc định phía máy chủ"}
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground">Khóa API</p>
                  <p className="mt-1 font-medium">
                    {aiConfig?.hasApiKey
                      ? aiConfig.apiKeyMasked || "Đã cấu hình"
                      : "Chưa cấu hình khóa riêng"}
                  </p>
                </div>
              </section>
            </div>

            <div className="space-y-4 xl:col-span-8">
              <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
                <h3 className="text-sm font-semibold text-foreground">
                  Nội dung mẫu lệnh
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="system_prompt">Lệnh hệ thống *</Label>
                  <Textarea
                    id="system_prompt"
                    ref={systemPromptRef}
                    value={editableSystemPromptText}
                    className={cn(
                      "font-mono text-base",
                      promptFormErrors.system_prompt && INVALID_FIELD_CLASSNAME,
                    )}
                    onChange={(event) =>
                      handleSystemPromptTextChange(event.target.value)
                    }
                    required
                    rows={12}
                    placeholder="Nhập lệnh hệ thống..."
                  />
                  <p
                    className={cn(
                      "text-sm",
                      promptFormErrors.system_prompt
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {promptFormErrors.system_prompt ??
                      "Máy chủ không thay thế biến ở trường này. Nếu mẫu lệnh có lược đồ JSON đầu ra ở cuối, phần lược đồ sẽ được khóa riêng để tránh sửa sai."}
                  </p>
                </div>

                {hasLockedSystemPromptJson ? (
                  <div className="space-y-2 rounded-lg border border-border/70 bg-muted/25 p-3">
                    <Label htmlFor="system_prompt_locked_json">
                      Lược đồ JSON đầu ra (khóa chỉnh sửa)
                    </Label>
                    <Textarea
                      id="system_prompt_locked_json"
                      value={lockedSystemPromptJson}
                      readOnly
                      disabled
                      rows={10}
                      className="font-mono text-base opacity-70"
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="user_prompt_template">
                    Mẫu lệnh người dùng *
                  </Label>
                  <VariableChips
                    variables={promptTypeVariables}
                    onInsert={handleInsertVariable}
                  />
                  <Textarea
                    id="user_prompt_template"
                    ref={userPromptRef}
                    value={formData.user_prompt_template}
                    className={cn(
                      "font-mono text-base",
                      promptFormErrors.user_prompt_template &&
                        INVALID_FIELD_CLASSNAME,
                    )}
                    onChange={(event) =>
                      updateField("user_prompt_template", event.target.value)
                    }
                    rows={8}
                    placeholder="Nhập mẫu lệnh người dùng..."
                  />
                  <p
                    className={cn(
                      "text-sm",
                      promptFormErrors.user_prompt_template
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {promptFormErrors.user_prompt_template ??
                      "Máy chủ yêu cầu trường này không được để trống để có đủ dữ liệu dựng yêu cầu chạy thử và vận hành thực tế."}
                  </p>
                </div>
              </section>
            </div>
          </div>

          <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Chạy thử theo cụm SOS
                </h3>
                <p className="text-sm text-muted-foreground">
                  Dùng cấu hình AI đang chọn để chạy thử nội dung mẫu lệnh trước
                  khi lưu hoặc kích hoạt.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={runPromptTest}
                disabled={!canRunPromptTest || reviewLoading || !aiConfigId}
              >
                {reviewLoading ? (
                  <CircleNotch size={16} className="mr-2 animate-spin" />
                ) : (
                  <TestTube size={16} className="mr-2" />
                )}
                {reviewLoading ? "Đang chạy thử..." : "Chạy thử"}
              </Button>
            </div>

            {!aiConfigId ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Cần chọn hoặc tạo cấu hình AI trước khi chạy thử mẫu lệnh.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="preview_cluster">Cụm SOS để chạy thử</Label>
              <Select
                value={previewClusterId ? String(previewClusterId) : ""}
                onValueChange={(value) => setPreviewClusterId(Number(value))}
              >
                <SelectTrigger
                  id="preview_cluster"
                  className={FORM_SELECT_TRIGGER_CLASSNAME}
                >
                  <SelectValue
                    placeholder={
                      clustersLoading
                        ? "Đang tải danh sách cụm..."
                        : "Chọn cụm để chạy thử"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clusterOptions.map((cluster) => (
                    <SelectItem key={cluster.id} value={String(cluster.id)}>
                      {`#${cluster.id} • ${cluster.severityLevel} • ${cluster.sosRequestCount} SOS`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border/70 bg-background/95 p-3">
              <p className="text-sm text-muted-foreground">
                {reviewStatus ||
                  "Chưa có kết quả chạy thử. Bấm Chạy thử để gửi bản mẫu lệnh hiện tại lên máy chủ."}
              </p>
              {reviewError ? (
                <p className="mt-2 text-sm font-medium text-destructive">
                  {reviewError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Lưu nhanh khi chạy thử: {testSnapshots.length} bản. Có thể dùng
                Cmd/Ctrl+Z để quay lại bản trước khi chạy thử.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={undoTestSnapshot}
                  disabled={!canUndoTestSnapshot || isSubmitting}
                >
                  <ArrowCounterClockwise size={14} className="mr-1.5" />
                  Hoàn tác
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={redoTestSnapshot}
                  disabled={!canRedoTestSnapshot || isSubmitting}
                >
                  <ArrowClockwise size={14} className="mr-1.5" />
                  Làm lại
                </Button>
              </div>
            </div>

            {isEditing && rollbackProductionLabel ? (
              <p className="text-sm text-muted-foreground">
                Khôi phục hệ thống sẽ kích hoạt lại {rollbackProductionLabel}.
              </p>
            ) : null}

            <AiStreamPanel
              open={
                reviewLoading || Boolean(reviewResult) || Boolean(reviewError)
              }
              inline
              size="expanded"
              onClose={resetReview}
              clusterId={previewClusterId}
              status={reviewStatus}
              statusLog={reviewStatusLog}
              thinkingText=""
              result={reviewResult}
              error={reviewError}
              loading={reviewLoading}
              phase={reviewPhase}
              onStop={resetReview}
              onRetry={runPromptTest}
              onViewPlan={resetReview}
              hidePlanAction
            />
          </section>

          <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap justify-end gap-2 rounded-xl border border-border/70 bg-card/95 px-3 py-3 backdrop-blur">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? (
                <CircleNotch size={16} className="mr-2 animate-spin" />
              ) : (
                <FloppyDisk size={16} className="mr-2" />
              )}
              {isSubmitting
                ? "Đang lưu..."
                : isEditing
                  ? "Lưu bản nháp"
                  : "Tạo mẫu lệnh"}
            </Button>
            {isEditing ? (
              <Button
                type="button"
                variant="destructive"
                onClick={onDiscardDraft}
                disabled={isSubmitting || isDiscardingDraft || !canDiscardDraft}
              >
                {isDiscardingDraft ? (
                  <CircleNotch size={16} className="mr-2 animate-spin" />
                ) : (
                  <Trash size={16} className="mr-2" />
                )}
                Hủy bản nháp
              </Button>
            ) : null}
            {isEditing ? (
              <Button
                type="button"
                variant="outline"
                onClick={onRollbackProduction}
                disabled={
                  isSubmitting ||
                  isRollingBackProduction ||
                  !canRollbackProduction
                }
              >
                {isRollingBackProduction ? (
                  <CircleNotch size={16} className="mr-2 animate-spin" />
                ) : (
                  <ArrowCounterClockwise size={16} className="mr-2" />
                )}
                Khôi phục hệ thống
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={runPromptTest}
              disabled={!canRunPromptTest || reviewLoading || !aiConfigId}
            >
              {reviewLoading ? (
                <CircleNotch size={16} className="mr-2 animate-spin" />
              ) : (
                <ArrowClockwise size={16} className="mr-2" />
              )}
              Chạy thử nhanh
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PromptEditor;
