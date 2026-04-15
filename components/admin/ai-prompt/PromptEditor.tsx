"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  TestTubeIcon,
  FloppyDisk,
  X,
  CircleNotch,
  Gear,
  Plus,
} from "@phosphor-icons/react";
import type {
  PromptEditorProps,
  PromptFormData,
  PromptTextField,
} from "@/type";
import {
  AI_PROVIDER_OPTIONS,
  INITIAL_FORM_DATA,
  PROMPT_TYPE_OPTIONS,
  PROMPT_VARIABLES_BY_TYPE,
} from "@/lib/constants";
import type {
  PromptDetailEntity,
  CreatePromptRequest,
  UpdatePromptRequest,
  PreviewPromptRescueSuggestionRequest,
  TestPromptRescueSuggestionRequest,
  TestPromptRescueSuggestionResponse,
} from "@/services/prompt/type";
import {
  usePromptRescuePreviewStream,
  useTestPromptRescueSuggestion,
} from "@/services/prompt/hooks";
import { useSOSClusters } from "@/services/sos_cluster/hooks";
import type {
  ClusterMissionType,
  ClusterRescueSuggestionResponse,
  ClusterSeverityLevel,
  ClusterSuggestedActivity,
} from "@/services/sos_cluster/type";
import AiStreamPanel from "@/components/coordinator/AiStreamPanel";

// --- Helpers ---

type PromptDetailModelFallback = PromptDetailEntity & {
  modelCode?: string | null;
  modelName?: string | null;
  model_code?: string | null;
  model_name?: string | null;
  prompt_type?: string | null;
};

const stripVersionPrefix = (version: string): string =>
  version.replace(/^v/i, "");

const toVersionString = (version: string): string =>
  `v${stripVersionPrefix(version)}`;

const CUSTOM_MODEL_OPTION_VALUE = "__custom_model__";

const sanitizeModelCode = (value: string): string =>
  value.replace(/\s+/g, "").trim();

const resolveModelCode = (detail: PromptDetailModelFallback): string => {
  const candidates = [
    detail.model,
    detail.modelCode,
    detail.modelName,
    detail.model_code,
    detail.model_name,
  ];

  const model = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );

  return sanitizeModelCode(model ?? "");
};

const normalizeModelCode = (modelCode: string): string =>
  sanitizeModelCode(modelCode).toLowerCase();

const canonicalizePromptType = (value: string): string =>
  value.replace(/[^a-z0-9]/gi, "").toLowerCase();

const normalizePromptType = (
  ...candidates: Array<string | null | undefined>
): PromptFormData["prompt_type"] => {
  const promptTypeByCanonical = new Map(
    PROMPT_TYPE_OPTIONS.map((option) => [
      canonicalizePromptType(option.value),
      option.value,
    ]),
  );

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const trimmedCandidate = candidate.trim();
    if (!trimmedCandidate) {
      continue;
    }

    const normalizedMatch = promptTypeByCanonical.get(
      canonicalizePromptType(trimmedCandidate),
    );

    if (normalizedMatch) {
      return normalizedMatch;
    }
  }

  return INITIAL_FORM_DATA.prompt_type;
};

const findProviderModelByCode = (
  provider: PromptFormData["provider"],
  modelCode: string,
) => {
  if (!modelCode.trim()) {
    return undefined;
  }

  const providerOption = AI_PROVIDER_OPTIONS.find(
    (option) => option.value === provider,
  );

  return providerOption?.models.find(
    (model) => normalizeModelCode(model.code) === normalizeModelCode(modelCode),
  );
};

const mapDetailToForm = (detail: PromptDetailEntity): PromptFormData => ({
  name: detail.name,
  prompt_type: normalizePromptType(
    detail.promptType,
    (detail as PromptDetailModelFallback).prompt_type,
  ),
  provider: detail.provider,
  purpose: detail.purpose || "",
  system_prompt: detail.systemPrompt || "",
  user_prompt_template: detail.userPromptTemplate || "",
  model: resolveModelCode(detail as PromptDetailModelFallback),
  temperature: detail.temperature ?? 0,
  max_tokens: detail.maxTokens ?? 0,
  version: stripVersionPrefix(detail.version || ""),
  api_url: detail.apiUrl || "",
  api_key: "",
  is_active: detail.isActive,
});

// --- Sub-components ---

const VariableChips = ({
  variables = [],
  onInsert,
}: {
  variables?: readonly { label: string; value: string }[];
  onInsert: (field: PromptTextField, variable: string) => void;
}) => (
  <div className="flex flex-wrap gap-1.5 pb-1">
    {variables.map((v) => (
      <button
        key={`user_prompt_template-${v.value}`}
        type="button"
        onClick={() => onInsert("user_prompt_template", v.value)}
        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
      >
        <Plus size={10} weight="bold" />
        {v.label}
      </button>
    ))}
  </div>
);

type CreateStep = 1 | 2 | 3;

const CREATE_STEPS: ReadonlyArray<{ step: CreateStep; label: string }> = [
  { step: 1, label: "Chọn Provider & Model" },
  { step: 2, label: "Thông tin API" },
  { step: 3, label: "Setup Prompt" },
];

const USER_PROMPT_TEMPLATE_HINTS = {
  SosPriorityAnalysis:
    "SOS analysis hiện replace {{structured_data}}, {{raw_message}}, {{sos_type}}.",
  MissionPlanning:
    "Mission planning legacy hiện replace {{sos_requests_data}}, {{total_count}}, {{depots_data}} trước khi agent gọi tool.",
  MissionRequirementsAssessment:
    "Requirements stage hiện replace {{sos_requests_data}}, {{total_count}}.",
  MissionDepotPlanning:
    "Depot stage hiện replace {{sos_requests_data}}, {{requirements_fragment}}, {{single_depot_required}}, {{eligible_depot_count}}.",
  MissionTeamPlanning:
    "Team stage hiện replace {{sos_requests_data}}, {{requirements_fragment}}, {{depot_fragment}}, {{nearby_team_count}}.",
  MissionPlanValidation:
    "Validation stage hiện replace {{sos_requests_data}}, {{mission_draft_body}}.",
} satisfies Record<PromptFormData["prompt_type"], string>;

type PromptReviewMode = "draft-stream" | "saved-test";

type PromptReviewPhase =
  | "idle"
  | "connecting"
  | "loading-data"
  | "calling-ai"
  | "processing"
  | "done"
  | "error";

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
    modelName: response.modelName?.trim() || response.model?.trim() || "N/A",
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
      "Chưa có đánh giá tổng quan từ backend.",
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
    return "Không thể gọi AI do thiếu quyền hoặc API key chưa hợp lệ. Vui lòng kiểm tra lại cấu hình.";
  }

  const isTimeoutError =
    statusCode === 408 ||
    statusCode === 504 ||
    /(timeout|timed\s*out|deadline\s*exceeded|gateway\s*timeout)/i.test(
      normalizedMessage,
    );

  if (isTimeoutError) {
    return "AI phản hồi quá chậm nên test bị timeout. Vui lòng thử lại.";
  }

  const isServerError =
    (typeof statusCode === "number" && statusCode >= 500) ||
    /(internal\s*server\s*error|bad\s*gateway|service\s*unavailable)/i.test(
      normalizedMessage,
    );

  if (isServerError) {
    return "Dịch vụ AI đang gián đoạn tạm thời. Vui lòng thử lại sau.";
  }

  const isNetworkError =
    /(network|failed\s*to\s*fetch|connection|socket|econn|enotfound)/i.test(
      normalizedMessage,
    );

  if (isNetworkError) {
    return "Không kết nối được tới dịch vụ AI. Vui lòng kiểm tra mạng rồi thử lại.";
  }

  return "AI chưa thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.";
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
  isSubmitting,
  onSave,
  onCancel,
  hideHeaderClose = false,
}: PromptEditorProps) => {
  const isEditing = Boolean(prompt);

  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const userPromptRef = useRef<HTMLTextAreaElement>(null);
  const customModelInputRef = useRef<HTMLInputElement>(null);
  const hasPreviewArtifactsRef = useRef(false);
  const savedTestRunIdRef = useRef(0);
  const savedTestLogIdRef = useRef(0);

  const textareaRefMap: Record<
    PromptTextField,
    React.RefObject<HTMLTextAreaElement | null>
  > = {
    system_prompt: systemPromptRef,
    user_prompt_template: userPromptRef,
  };

  const [formData, setFormData] = useState<PromptFormData>(INITIAL_FORM_DATA);
  const [currentStep, setCurrentStep] = useState<CreateStep>(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<CreateStep>(1);
  const [isCustomModelMode, setIsCustomModelMode] = useState(false);
  const [previewClusterId, setPreviewClusterId] = useState<number | null>(null);
  const [reviewMode, setReviewMode] =
    useState<PromptReviewMode>("draft-stream");
  const [savedTestStatus, setSavedTestStatus] = useState("");
  const [savedTestStatusLog, setSavedTestStatusLog] = useState<
    Array<{
      id: number;
      timestamp: number;
      message: string;
      type: "status" | "chunk" | "result" | "error";
    }>
  >([]);
  const [savedTestResult, setSavedTestResult] =
    useState<ClusterRescueSuggestionResponse | null>(null);
  const [savedTestError, setSavedTestError] = useState<string | null>(null);
  const [savedTestLoading, setSavedTestLoading] = useState(false);
  const [savedTestPhase, setSavedTestPhase] =
    useState<PromptReviewPhase>("idle");

  const { data: clustersData, isLoading: clustersLoading } = useSOSClusters();
  const {
    status: previewStatus,
    statusLog: previewStatusLog,
    thinkingText: previewThinkingText,
    result: previewResult,
    error: previewError,
    loading: previewLoading,
    phase: previewPhase,
    startPreview,
    stopPreview,
    resetPreview,
  } = usePromptRescuePreviewStream();
  const testSavedPromptMutation = useTestPromptRescueSuggestion();

  const addSavedTestLog = useCallback(
    (
      message: string,
      type: "status" | "chunk" | "result" | "error" = "status",
    ) => {
      savedTestLogIdRef.current += 1;
      setSavedTestStatusLog((previous) => [
        ...previous,
        {
          id: savedTestLogIdRef.current,
          timestamp: Date.now(),
          message,
          type,
        },
      ]);
    },
    [],
  );

  const resetSavedPromptTest = useCallback(() => {
    setSavedTestStatus("");
    setSavedTestStatusLog([]);
    setSavedTestResult(null);
    setSavedTestError(null);
    setSavedTestLoading(false);
    setSavedTestPhase("idle");
    savedTestLogIdRef.current = 0;
  }, []);

  useEffect(() => {
    if (prompt) {
      const mappedFormData = mapDetailToForm(prompt);
      const matchedModel = findProviderModelByCode(
        mappedFormData.provider,
        mappedFormData.model,
      );
      const normalizedModel = matchedModel?.code ?? mappedFormData.model;

      setFormData({
        ...mappedFormData,
        model: normalizedModel,
      });
      setIsCustomModelMode(Boolean(normalizedModel) && !matchedModel);
      setCurrentStep(1);
      setMaxUnlockedStep(1);
      return;
    }

    setFormData(INITIAL_FORM_DATA);
    setIsCustomModelMode(false);
    setCurrentStep(1);
    setMaxUnlockedStep(1);
  }, [prompt]);

  useEffect(() => {
    if (!isEditing || !prompt || isCustomModelMode || formData.model.trim()) {
      return;
    }

    const fallbackModel = resolveModelCode(prompt as PromptDetailModelFallback);
    if (!fallbackModel) {
      return;
    }

    const matchedModel = findProviderModelByCode(
      formData.provider,
      fallbackModel,
    );
    const normalizedFallbackModel = matchedModel?.code ?? fallbackModel;

    setFormData((prev) => ({
      ...prev,
      model: normalizedFallbackModel,
    }));
    setIsCustomModelMode(Boolean(normalizedFallbackModel) && !matchedModel);
  }, [isEditing, prompt, formData.model, formData.provider, isCustomModelMode]);

  useEffect(() => {
    if (!isCustomModelMode) {
      return;
    }

    requestAnimationFrame(() => {
      customModelInputRef.current?.focus();
    });
  }, [isCustomModelMode]);

  useEffect(() => {
    const firstClusterId = clustersData?.clusters?.[0]?.id ?? null;

    if (previewClusterId === null && firstClusterId !== null) {
      setPreviewClusterId(firstClusterId);
    }
  }, [clustersData, previewClusterId]);

  useEffect(() => {
    hasPreviewArtifactsRef.current = Boolean(
      previewLoading ||
      previewResult ||
      previewError ||
      previewStatusLog.length > 0 ||
      savedTestLoading ||
      savedTestResult ||
      savedTestError ||
      savedTestStatusLog.length > 0,
    );
  }, [
    previewLoading,
    previewResult,
    previewError,
    previewStatusLog.length,
    savedTestLoading,
    savedTestResult,
    savedTestError,
    savedTestStatusLog.length,
  ]);

  useEffect(() => {
    if (!hasPreviewArtifactsRef.current) {
      return;
    }

    resetPreview();
    resetSavedPromptTest();
    setReviewMode("draft-stream");
  }, [
    formData.provider,
    formData.model,
    formData.prompt_type,
    formData.system_prompt,
    formData.user_prompt_template,
    formData.api_url,
    formData.api_key,
    previewClusterId,
    resetPreview,
    resetSavedPromptTest,
  ]);

  const updateField = <K extends keyof PromptFormData>(
    key: K,
    value: PromptFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleInsertVariable = useCallback(
    (field: PromptTextField, variable: string) => {
      const textarea = textareaRefMap[field].current;
      if (!textarea) return;

      const { selectionStart: start, selectionEnd: end } = textarea;
      const insertion = `{{${variable}}}`;
      const newText =
        formData[field].slice(0, start) +
        insertion +
        formData[field].slice(end);

      updateField(field, newText);

      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + insertion.length;
        textarea.setSelectionRange(pos, pos);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData],
  );

  const effectivePromptType = normalizePromptType(
    formData.prompt_type,
    prompt?.promptType,
  );
  const promptTypeVariables = PROMPT_VARIABLES_BY_TYPE[effectivePromptType];
  const selectedPromptType = PROMPT_TYPE_OPTIONS.find(
    (option) => option.value === effectivePromptType,
  );
  const selectedProvider = AI_PROVIDER_OPTIONS.find(
    (option) => option.value === formData.provider,
  );
  const systemPromptHelperText =
    effectivePromptType === "SosPriorityAnalysis"
      ? "Backend không replace biến trong trường này."
      : "Backend không replace biến trong trường này. Các prompt mission có thể được nối thêm hướng dẫn stage/tool phù hợp trước khi gọi AI.";
  const userPromptHelperText = USER_PROMPT_TEMPLATE_HINTS[effectivePromptType];
  const providerModelOptions: Array<{ label: string; code: string }> =
    selectedProvider?.models ? [...selectedProvider.models] : [];
  const matchedProviderModel = providerModelOptions.find(
    (model) =>
      normalizeModelCode(model.code) === normalizeModelCode(formData.model),
  );
  const hasModelInProviderOptions = Boolean(matchedProviderModel);
  const modelSelectValue = isCustomModelMode
    ? CUSTOM_MODEL_OPTION_VALUE
    : (matchedProviderModel?.code ?? formData.model);

  const isStep1Complete = Boolean(formData.provider && formData.model);
  const hasEffectiveApiKey =
    Boolean(formData.api_key.trim()) || Boolean(isEditing && prompt?.hasApiKey);
  const isStep2Complete = Boolean(
    formData.api_url.trim() && hasEffectiveApiKey,
  );
  const isStep3Complete = Boolean(
    formData.name.trim() &&
    formData.purpose.trim() &&
    formData.system_prompt.trim(),
  );
  const canSubmit = isEditing
    ? isStep3Complete
    : currentStep === 3 && isStep3Complete;
  const supportsMissionPreview = effectivePromptType !== "SosPriorityAnalysis";
  const clusterOptions = clustersData?.clusters ?? [];
  const canUseSavedPromptTest = Boolean(isEditing && prompt?.id);
  const canRunDraftPreview = Boolean(
    formData.provider &&
    formData.model.trim() &&
    formData.system_prompt.trim() &&
    formData.api_url.trim(),
  );
  const canRunPromptTest = Boolean(
    supportsMissionPreview &&
    previewClusterId &&
    (canUseSavedPromptTest || canRunDraftPreview),
  );
  const activeReviewStatus =
    reviewMode === "saved-test" ? savedTestStatus : previewStatus;
  const activeReviewStatusLog =
    reviewMode === "saved-test" ? savedTestStatusLog : previewStatusLog;
  const activeReviewThinkingText =
    reviewMode === "saved-test" ? "" : previewThinkingText;
  const activeReviewResult =
    reviewMode === "saved-test" ? savedTestResult : previewResult;
  const activeReviewError =
    reviewMode === "saved-test" ? savedTestError : previewError;
  const activeReviewLoading =
    reviewMode === "saved-test" ? savedTestLoading : previewLoading;
  const activeReviewPhase =
    reviewMode === "saved-test" ? savedTestPhase : previewPhase;
  const showReviewStatus = Boolean(activeReviewStatus) && !activeReviewError;
  const hasReviewArtifact = Boolean(
    activeReviewLoading ||
    activeReviewResult ||
    activeReviewError ||
    activeReviewStatusLog.length > 0,
  );

  const buildSubmitPayload = useCallback((): UpdatePromptRequest => {
    const normalizedApiKey = formData.api_key.trim();
    const normalizedApiUrl = formData.api_url.trim();

    return {
      name: formData.name.trim(),
      prompt_type: normalizePromptType(
        formData.prompt_type,
        prompt?.promptType,
      ),
      provider: formData.provider,
      purpose: formData.purpose.trim(),
      system_prompt: formData.system_prompt.trim(),
      user_prompt_template: formData.user_prompt_template.trim(),
      model: formData.model.trim(),
      temperature: formData.temperature,
      max_tokens: formData.max_tokens,
      version: toVersionString(formData.version.trim()),
      api_url: normalizedApiUrl || undefined,
      api_key: normalizedApiKey || undefined,
      is_active: formData.is_active,
    };
  }, [formData, prompt?.promptType]);

  const buildSavedPromptTestRequest = useCallback(
    (
      payload: UpdatePromptRequest,
    ): TestPromptRescueSuggestionRequest | null => {
      if (!previewClusterId) {
        return null;
      }

      return {
        clusterId: previewClusterId,
        ...payload,
      };
    },
    [previewClusterId],
  );

  const buildPreviewRequest = useCallback(() => {
    if (!previewClusterId) {
      return null;
    }

    const payload = buildSubmitPayload();

    const request: PreviewPromptRescueSuggestionRequest = {
      cluster_id: previewClusterId,
      source_prompt_id: prompt?.id,
      prompt_type: payload.prompt_type,
      provider: payload.provider,
      system_prompt: payload.system_prompt,
      user_prompt_template: payload.user_prompt_template,
      model: payload.model,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
      version: payload.version,
      api_url: payload.api_url,
      api_key: payload.api_key,
    };

    return request;
  }, [buildSubmitPayload, previewClusterId, prompt?.id]);

  const runSavedPromptTest = useCallback(
    async (payload: UpdatePromptRequest): Promise<boolean> => {
      if (!prompt?.id) {
        return false;
      }

      const requestPayload = buildSavedPromptTestRequest(payload);
      if (!requestPayload) {
        const missingClusterMessage =
          "Vui lòng chọn SOS cluster để test trước khi cập nhật.";
        setReviewMode("saved-test");
        setSavedTestError(missingClusterMessage);
        setSavedTestStatus(missingClusterMessage);
        setSavedTestPhase("error");
        addSavedTestLog(missingClusterMessage, "error");
        return false;
      }

      const currentRunId = savedTestRunIdRef.current + 1;
      savedTestRunIdRef.current = currentRunId;

      resetPreview();
      resetSavedPromptTest();
      setReviewMode("saved-test");
      setSavedTestLoading(true);
      setSavedTestPhase("calling-ai");

      const startMessage = `Đang test bản nháp mới nhất của prompt #${prompt.id} với cụm SOS #${requestPayload.clusterId}...`;
      setSavedTestStatus(startMessage);
      addSavedTestLog(startMessage, "status");

      try {
        const response = await testSavedPromptMutation.mutateAsync({
          id: prompt.id,
          data: requestPayload,
        });

        if (currentRunId !== savedTestRunIdRef.current) {
          return false;
        }

        if (!response.isSuccess) {
          const failedMessage = toUserFriendlyAiErrorMessage({
            rawMessage: response.errorMessage,
            statusCode: response.httpStatusCode,
          });

          setSavedTestError(failedMessage);
          setSavedTestStatus("Không thể lấy phản hồi từ AI.");
          setSavedTestPhase("error");
          addSavedTestLog(failedMessage, "error");
          setSavedTestLoading(false);
          return false;
        }

        const mappedResult = mapPromptTestResponseToReviewResult(response);
        const doneMessage = `Test hoàn tất. Đã tạo ${mappedResult.suggestedActivities.length} activity đề xuất.`;

        setSavedTestResult(mappedResult);
        setSavedTestStatus(doneMessage);
        setSavedTestPhase("done");
        addSavedTestLog(doneMessage, "result");
        setSavedTestLoading(false);
        return true;
      } catch (error) {
        if (currentRunId !== savedTestRunIdRef.current) {
          return false;
        }

        const errorMessage = extractPromptTestErrorMessage(error);
        setSavedTestError(errorMessage);
        setSavedTestStatus(errorMessage);
        setSavedTestPhase("error");
        addSavedTestLog(errorMessage, "error");
        setSavedTestLoading(false);
        return false;
      }
    },
    [
      prompt?.id,
      buildSavedPromptTestRequest,
      resetPreview,
      resetSavedPromptTest,
      addSavedTestLog,
      testSavedPromptMutation,
    ],
  );

  const handleRunPreview = useCallback(() => {
    if (!supportsMissionPreview || !previewClusterId) {
      return;
    }

    if (canUseSavedPromptTest) {
      const payload = buildSubmitPayload();
      void runSavedPromptTest(payload);
      return;
    }

    const request = buildPreviewRequest();
    if (!request) {
      return;
    }

    savedTestRunIdRef.current += 1;
    resetSavedPromptTest();
    setReviewMode("draft-stream");
    startPreview(request);
  }, [
    supportsMissionPreview,
    previewClusterId,
    canUseSavedPromptTest,
    buildSubmitPayload,
    runSavedPromptTest,
    buildPreviewRequest,
    resetSavedPromptTest,
    startPreview,
  ]);

  const handleStopReview = useCallback(() => {
    if (reviewMode === "saved-test") {
      savedTestRunIdRef.current += 1;
      resetSavedPromptTest();
      return;
    }

    stopPreview();
  }, [reviewMode, resetSavedPromptTest, stopPreview]);

  const renderModelField = (customInputId: string, helperText?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor="model">Model *</Label>
      <Select value={modelSelectValue} onValueChange={handleModelSelectChange}>
        <SelectTrigger id="model">
          <SelectValue placeholder="Chọn model" />
        </SelectTrigger>
        <SelectContent>
          {providerModelOptions.map((model) => (
            <SelectItem
              key={`${formData.provider}-${model.code}`}
              value={model.code}
            >
              {model.code}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_MODEL_OPTION_VALUE}>
            Khác (tự nhập mã)
          </SelectItem>
        </SelectContent>
      </Select>
      {isCustomModelMode ? (
        <div className="space-y-1.5 pt-1">
          <Label htmlFor={customInputId}>Mã model custom</Label>
          <Input
            id={customInputId}
            ref={customModelInputRef}
            value={formData.model}
            onChange={(e) => handleCustomModelChange(e.target.value)}
            placeholder="Nhập mã model custom"
          />
        </div>
      ) : null}
      {helperText ? (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );

  const renderPreviewSection = () => {
    const testModeLabel = canUseSavedPromptTest
      ? "Bản Nháp Cập Nhật"
      : "Bản Nháp";
    const testModeDescription = canUseSavedPromptTest
      ? "Bấm Test để kiểm tra bản nháp mới nhất trước khi lưu vào hệ thống."
      : "Chế độ create dùng stream preview theo draft hiện tại (chưa lưu).";

    return (
      <div className="space-y-4 rounded-xl border border-orange-200/80 bg-linear-to-br from-orange-50/70 via-background to-amber-50/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Test Theo SOS Cluster
              </h3>
              <span className="inline-flex items-center rounded-full border border-orange-300/80 bg-orange-100/80 px-2 py-0.5 text-sm font-semibold text-orange-700">
                {testModeLabel}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {testModeDescription}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRunPreview}
            disabled={!canRunPromptTest || activeReviewLoading}
            className="h-8 border-orange-300 bg-white text-orange-700 hover:bg-orange-50"
          >
            {activeReviewLoading ? (
              <CircleNotch size={14} className="mr-1.5 animate-spin" />
            ) : (
              <TestTubeIcon size={14} className="mr-1.5" />
            )}
            {activeReviewLoading ? "Đang test..." : "Test"}
          </Button>
        </div>

        {supportsMissionPreview ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="preview_cluster">SOS Cluster để test</Label>
              <Select
                value={previewClusterId ? String(previewClusterId) : ""}
                onValueChange={(value) => setPreviewClusterId(Number(value))}
              >
                <SelectTrigger id="preview_cluster" className="bg-white/90">
                  <SelectValue
                    placeholder={
                      clustersLoading
                        ? "Đang tải danh sách cluster..."
                        : "Chọn cluster để test"
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

            <div className="rounded-lg border border-orange-200/70 bg-white/80 p-3">
              <p className="text-sm text-muted-foreground">
                {canUseSavedPromptTest
                  ? "Lưu ý: Test sẽ gửi toàn bộ bản nháp mới nhất. Sau khi test ổn, bấm Cập nhật để lưu vào hệ thống."
                  : "Preview không ghi mission suggestion thật vào hệ thống. Bạn có thể test draft nhiều lần trước khi lưu."}
              </p>

              {showReviewStatus ? (
                <p className="mt-2 text-sm font-medium text-foreground/80">
                  Trạng thái: {activeReviewStatus}
                </p>
              ) : null}

              {!activeReviewStatus && !activeReviewLoading ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Chưa có review chi tiết. Bấm{" "}
                  <span className="font-medium text-foreground">Test</span> để
                  tạo kế hoạch hiển thị ngay bên dưới.
                </p>
              ) : null}

              {activeReviewResult ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                    {activeReviewResult.suggestedActivities.length} hoạt động
                  </span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                    {activeReviewResult.responseTimeMs} ms
                  </span>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-medium text-violet-700">
                    Tin cậy{" "}
                    {(activeReviewResult.confidenceScore * 100).toFixed(0)}%
                  </span>
                </div>
              ) : null}

              {activeReviewError ? (
                <p className="mt-2 text-sm font-medium text-red-600">
                  Lỗi test: {activeReviewError}
                </p>
              ) : null}
            </div>

            <AiStreamPanel
              open={hasReviewArtifact}
              inline
              onClose={handleStopReview}
              clusterId={previewClusterId}
              status={activeReviewStatus}
              statusLog={activeReviewStatusLog}
              thinkingText={activeReviewThinkingText}
              result={activeReviewResult}
              error={activeReviewError}
              loading={activeReviewLoading}
              phase={activeReviewPhase}
              onStop={handleStopReview}
              onRetry={handleRunPreview}
              onViewPlan={handleStopReview}
              hidePlanAction
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Preview theo sos-cluster hiện chỉ hỗ trợ các prompt Mission*.
          </p>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (isEditing) return;

    const nextMaxUnlockedStep: CreateStep = !isStep1Complete
      ? 1
      : !isStep2Complete
        ? 2
        : 3;

    if (maxUnlockedStep !== nextMaxUnlockedStep) {
      setMaxUnlockedStep(nextMaxUnlockedStep);
    }

    if (currentStep > nextMaxUnlockedStep) {
      setCurrentStep(nextMaxUnlockedStep);
    }
  }, [
    isEditing,
    isStep1Complete,
    isStep2Complete,
    currentStep,
    maxUnlockedStep,
  ]);

  const handleProviderChange = (value: PromptFormData["provider"]) => {
    const providerOption = AI_PROVIDER_OPTIONS.find(
      (option) => option.value === value,
    );

    const matchedModel = providerOption?.models.find(
      (model) =>
        normalizeModelCode(model.code) === normalizeModelCode(formData.model),
    );
    const shouldKeepCustomModel =
      isCustomModelMode && Boolean(formData.model.trim());
    const nextModel =
      matchedModel?.code ?? (shouldKeepCustomModel ? formData.model : "");

    setIsCustomModelMode(Boolean(nextModel) && !matchedModel);

    setFormData((prev) => ({
      ...prev,
      provider: value,
      model: nextModel,
    }));
  };

  const handleModelSelectChange = (value: string) => {
    if (value === CUSTOM_MODEL_OPTION_VALUE) {
      setIsCustomModelMode(true);

      if (hasModelInProviderOptions) {
        updateField("model", "");
      }

      return;
    }

    setIsCustomModelMode(false);
    updateField("model", value);
  };

  const handleCustomModelChange = (value: string) => {
    const matchedModel = providerModelOptions.find(
      (model) => normalizeModelCode(model.code) === normalizeModelCode(value),
    );
    const sanitizedValue = sanitizeModelCode(value);

    if (matchedModel) {
      setIsCustomModelMode(false);
      updateField("model", matchedModel.code);
      return;
    }

    setIsCustomModelMode(true);
    updateField("model", sanitizedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      return;
    }

    const payload = buildSubmitPayload();

    if (isEditing) {
      await Promise.resolve(onSave(payload as UpdatePromptRequest));
      return;
    }

    await Promise.resolve(onSave(payload as CreatePromptRequest));
  };

  const getNextStepEnabled = () => {
    if (currentStep === 1) return isStep1Complete;
    if (currentStep === 2) return isStep2Complete;
    return false;
  };

  const handleNextStep = () => {
    if (!getNextStepEnabled() || currentStep === 3) {
      return;
    }

    const nextStep = (currentStep + 1) as CreateStep;
    setMaxUnlockedStep((prev) => {
      if (nextStep > prev) {
        return nextStep;
      }
      return prev;
    });
    setCurrentStep(nextStep);
  };

  const handlePreviousStep = () => {
    if (currentStep === 1) return;
    setCurrentStep((prev) => (prev - 1) as CreateStep);
  };

  const handleSelectStep = (step: CreateStep) => {
    if (step <= maxUnlockedStep) {
      setCurrentStep(step);
    }
  };

  return (
    <>
      <Card className="border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gear size={20} weight="duotone" />
              {isEditing ? "Chỉnh sửa Prompt" : "Tạo Prompt mới"}
            </CardTitle>
            {!hideHeaderClose ? (
              <Button
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
            {isEditing ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Tên Prompt *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      required
                      placeholder="VD: Dispatch Decision Prompt"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="version">Phiên bản</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground/70 select-none pointer-events-none">
                        v
                      </span>
                      <Input
                        id="version"
                        value={formData.version}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          updateField("version", val);
                        }}
                        placeholder="1.0"
                        className="pl-6"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prompt_type">Loại Prompt *</Label>
                    <Select
                      value={effectivePromptType}
                      onValueChange={(value) =>
                        updateField("prompt_type", normalizePromptType(value))
                      }
                    >
                      <SelectTrigger id="prompt_type">
                        <SelectValue placeholder="Chọn loại prompt" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROMPT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {selectedPromptType?.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="purpose">Mục đích *</Label>
                  <Input
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => updateField("purpose", e.target.value)}
                    required
                    placeholder="Mô tả ngắn gọn mục đích của prompt này"
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="provider">AI Provider *</Label>
                    <Select
                      value={formData.provider}
                      onValueChange={(value) =>
                        handleProviderChange(
                          value as PromptFormData["provider"],
                        )
                      }
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder="Chọn provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {selectedProvider?.description}
                    </p>
                  </div>

                  {renderModelField("custom_model_code")}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={formData.temperature}
                      onChange={(e) =>
                        updateField(
                          "temperature",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="max_tokens">Max Tokens</Label>
                    <Input
                      id="max_tokens"
                      type="number"
                      min="1"
                      value={formData.max_tokens}
                      onChange={(e) =>
                        updateField("max_tokens", parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="api_url">API URL</Label>
                  <Input
                    id="api_url"
                    value={formData.api_url}
                    onChange={(e) => updateField("api_url", e.target.value)}
                    placeholder={
                      formData.provider === "OpenRouter"
                        ? "https://openrouter.ai/api/v1/chat/completions"
                        : "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent?key={1}"
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="api_key">API Key theo prompt</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => updateField("api_key", e.target.value)}
                    placeholder={
                      prompt?.hasApiKey
                        ? prompt.apiKeyMasked || "Đang có key đã lưu"
                        : "Để trống để dùng default key của backend"
                    }
                    autoComplete="new-password"
                  />
                  <p className="text-sm text-muted-foreground">
                    {prompt?.hasApiKey
                      ? "Để trống sẽ giữ key hiện có. Backend hiện chưa hỗ trợ xóa prompt-level key chỉ bằng cách gửi rỗng."
                      : "Dán key riêng cho prompt này nếu muốn test nhanh mà không sửa config mặc định ở server."}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="system_prompt">System Prompt *</Label>
                  <Textarea
                    id="system_prompt"
                    ref={systemPromptRef}
                    value={formData.system_prompt}
                    onChange={(e) =>
                      updateField("system_prompt", e.target.value)
                    }
                    required
                    rows={6}
                    className="font-mono text-base"
                    placeholder="Nhập system prompt..."
                  />
                  <p className="text-sm text-muted-foreground">
                    {systemPromptHelperText}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_prompt_template">
                    User Prompt Template
                  </Label>
                  <VariableChips
                    variables={promptTypeVariables}
                    onInsert={handleInsertVariable}
                  />
                  <Textarea
                    id="user_prompt_template"
                    ref={userPromptRef}
                    value={formData.user_prompt_template}
                    onChange={(e) =>
                      updateField("user_prompt_template", e.target.value)
                    }
                    rows={4}
                    className="font-mono text-base"
                    placeholder="Nhập user prompt template với biến {{placeholder}}..."
                  />
                  <p className="text-sm text-muted-foreground">
                    {userPromptHelperText}
                  </p>
                </div>

                {renderPreviewSection()}

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => updateField("is_active", e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label
                    htmlFor="is_active"
                    className="cursor-pointer text-base"
                  >
                    Kích hoạt prompt này
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
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
                    {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Luồng tạo mới gồm 3 bước. Hoàn tất bước hiện tại để mở bước
                    kế tiếp.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {CREATE_STEPS.map((item) => {
                      const isCompleted = item.step < maxUnlockedStep;
                      const isCurrent = item.step === currentStep;
                      const isLocked = item.step > maxUnlockedStep;

                      return (
                        <button
                          key={item.step}
                          type="button"
                          onClick={() => handleSelectStep(item.step)}
                          disabled={isLocked}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                            isCurrent
                              ? "border-primary bg-primary/10"
                              : isCompleted
                                ? "border-emerald-500/40 bg-emerald-500/10"
                                : "border-border bg-background"
                          } ${isLocked ? "opacity-50 cursor-not-allowed" : "hover:border-primary/40"}`}
                        >
                          {isCompleted ? (
                            <CheckCircle
                              size={16}
                              className="text-emerald-600"
                            />
                          ) : (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-sm font-semibold">
                              {item.step}
                            </span>
                          )}
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      Bước 1: AI Provider & Model
                    </h3>
                    {isStep1Complete && (
                      <span className="text-sm font-medium text-emerald-700">
                        Đã hoàn tất
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="provider">AI Provider *</Label>
                      <Select
                        value={formData.provider}
                        onValueChange={(value) =>
                          handleProviderChange(
                            value as PromptFormData["provider"],
                          )
                        }
                      >
                        <SelectTrigger id="provider">
                          <SelectValue placeholder="Chọn provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_PROVIDER_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        {selectedProvider?.description}
                      </p>
                    </div>

                    {renderModelField(
                      "custom_model_code_create",
                      "Chọn model phù hợp theo provider đã chọn.",
                    )}
                  </div>
                </div>

                {maxUnlockedStep >= 2 && (
                  <div className="rounded-lg border border-border/70 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">
                        Bước 2: Thông tin API
                      </h3>
                      {isStep2Complete && (
                        <span className="text-sm font-medium text-emerald-700">
                          Đã hoàn tất
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="temperature">Temperature</Label>
                        <Input
                          id="temperature"
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={formData.temperature}
                          onChange={(e) =>
                            updateField(
                              "temperature",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="max_tokens">Max Tokens</Label>
                        <Input
                          id="max_tokens"
                          type="number"
                          min="1"
                          value={formData.max_tokens}
                          onChange={(e) =>
                            updateField(
                              "max_tokens",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="api_url">API URL *</Label>
                      <Input
                        id="api_url"
                        value={formData.api_url}
                        onChange={(e) => updateField("api_url", e.target.value)}
                        placeholder={
                          formData.provider === "OpenRouter"
                            ? "https://openrouter.ai/api/v1/chat/completions"
                            : "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent?key={1}"
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="api_key">API Key theo prompt *</Label>
                      <Input
                        id="api_key"
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => updateField("api_key", e.target.value)}
                        placeholder="Nhập API key cho prompt"
                        autoComplete="new-password"
                      />
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Cần nhập đủ API URL và API Key để mở bước 3.
                    </p>
                  </div>
                )}

                {maxUnlockedStep >= 3 && (
                  <div className="rounded-lg border border-border/70 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">
                        Bước 3: Setup Prompt
                      </h3>
                      {isStep3Complete && (
                        <span className="text-sm font-medium text-emerald-700">
                          Đã hoàn tất
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Tên Prompt *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          required
                          placeholder="VD: Dispatch Decision Prompt"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="version">Phiên bản</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground/70 select-none pointer-events-none">
                            v
                          </span>
                          <Input
                            id="version"
                            value={formData.version}
                            onChange={(e) => {
                              const val = e.target.value.replace(
                                /[^0-9.]/g,
                                "",
                              );
                              updateField("version", val);
                            }}
                            placeholder="1.0"
                            className="pl-6"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="prompt_type">Loại Prompt *</Label>
                        <Select
                          value={effectivePromptType}
                          onValueChange={(value) =>
                            updateField(
                              "prompt_type",
                              normalizePromptType(value),
                            )
                          }
                        >
                          <SelectTrigger id="prompt_type">
                            <SelectValue placeholder="Chọn loại prompt" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROMPT_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          {selectedPromptType?.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="purpose">Mục đích *</Label>
                      <Input
                        id="purpose"
                        value={formData.purpose}
                        onChange={(e) => updateField("purpose", e.target.value)}
                        required
                        placeholder="Mô tả ngắn gọn mục đích của prompt này"
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="system_prompt">System Prompt *</Label>
                      <Textarea
                        id="system_prompt"
                        ref={systemPromptRef}
                        value={formData.system_prompt}
                        onChange={(e) =>
                          updateField("system_prompt", e.target.value)
                        }
                        required
                        rows={6}
                        className="font-mono text-base"
                        placeholder="Nhập system prompt..."
                      />
                      <p className="text-sm text-muted-foreground">
                        {systemPromptHelperText}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user_prompt_template">
                        User Prompt Template
                      </Label>
                      <VariableChips
                        variables={promptTypeVariables}
                        onInsert={handleInsertVariable}
                      />
                      <Textarea
                        id="user_prompt_template"
                        ref={userPromptRef}
                        value={formData.user_prompt_template}
                        onChange={(e) =>
                          updateField("user_prompt_template", e.target.value)
                        }
                        rows={4}
                        className="font-mono text-base"
                        placeholder="Nhập user prompt template với biến {{placeholder}}..."
                      />
                      <p className="text-sm text-muted-foreground">
                        {userPromptHelperText}
                      </p>
                    </div>

                    {renderPreviewSection()}
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </Button>

                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePreviousStep}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft size={16} className="mr-2" />
                      Quay lại
                    </Button>
                  )}

                  {currentStep < 3 ? (
                    <Button
                      type="button"
                      onClick={handleNextStep}
                      disabled={isSubmitting || !getNextStepEnabled()}
                    >
                      Tiếp tục
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting || !canSubmit}>
                      {isSubmitting ? (
                        <CircleNotch size={16} className="mr-2 animate-spin" />
                      ) : (
                        <FloppyDisk size={16} className="mr-2" />
                      )}
                      Tạo mới
                    </Button>
                  )}
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default PromptEditor;
