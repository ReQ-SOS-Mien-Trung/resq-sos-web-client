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
  ClipboardText,
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
} from "@/services/prompt/type";
import {
  usePromptRescuePreviewStream,
} from "@/services/prompt/hooks";
import { useSOSClusters } from "@/services/sos_cluster/hooks";
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
        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
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

const PromptEditor = ({
  prompt,
  isSubmitting,
  onSave,
  onCancel,
}: PromptEditorProps) => {
  const isEditing = Boolean(prompt);

  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const userPromptRef = useRef<HTMLTextAreaElement>(null);
  const customModelInputRef = useRef<HTMLInputElement>(null);
  const hasPreviewArtifactsRef = useRef(false);

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
  const [isPreviewPanelOpen, setIsPreviewPanelOpen] = useState(false);

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
    if (!isEditing || !prompt || formData.model.trim()) {
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
  }, [isEditing, prompt, formData.model, formData.provider]);

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
    hasPreviewArtifactsRef.current = Boolean(previewResult || previewError);
  }, [previewResult, previewError]);

  useEffect(() => {
    if (!hasPreviewArtifactsRef.current) {
      return;
    }

    resetPreview();
    setIsPreviewPanelOpen(false);
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
  const canRunPreview = Boolean(
    supportsMissionPreview &&
      previewClusterId &&
      formData.provider &&
      formData.model.trim() &&
      formData.system_prompt.trim() &&
      formData.api_url.trim(),
  );

  const buildSubmitPayload = useCallback(() => {
    const normalizedApiKey = formData.api_key.trim();

    return {
      ...formData,
      prompt_type: normalizePromptType(formData.prompt_type, prompt?.promptType),
      name: formData.name.trim(),
      purpose: formData.purpose.trim(),
      system_prompt: formData.system_prompt.trim(),
      user_prompt_template: formData.user_prompt_template.trim(),
      model: formData.model.trim(),
      version: toVersionString(formData.version.trim()),
      api_url: formData.api_url.trim(),
      api_key: normalizedApiKey || undefined,
    };
  }, [formData, prompt?.promptType]);

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
      api_url: payload.api_url || undefined,
      api_key: payload.api_key,
    };

    return request;
  }, [buildSubmitPayload, previewClusterId, prompt?.id]);

  const handleRunPreview = useCallback(() => {
    const request = buildPreviewRequest();
    if (!request) {
      return;
    }

    startPreview(request);
    setIsPreviewPanelOpen(true);
  }, [buildPreviewRequest, startPreview]);

  const handleApprovePreview = useCallback(() => {
    const payload = buildSubmitPayload();

    if (isEditing) {
      onSave(payload as UpdatePromptRequest);
      return;
    }

    onSave({
      ...payload,
      is_active: formData.is_active,
    } as CreatePromptRequest);
  }, [buildSubmitPayload, formData.is_active, isEditing, onSave]);

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
      <div className="space-y-1.5 pt-1">
        <Label htmlFor={customInputId}>Mã model custom</Label>
        <Input
          id={customInputId}
          ref={customModelInputRef}
          value={isCustomModelMode ? formData.model : ""}
          onChange={(e) => handleCustomModelChange(e.target.value)}
          placeholder="Chọn 'Khác (tự nhập mã)' rồi nhập mã model tại đây"
          disabled={!isCustomModelMode}
        />
      </div>
      {helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );

  const renderPreviewSection = () => (
    <div className="space-y-4 rounded-xl border border-orange-200/70 bg-orange-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Test Theo SOS Cluster
          </h3>
          <p className="text-xs text-muted-foreground">
            Dùng cấu hình draft hiện tại để preview kế hoạch AI trước khi cập
            nhật prompt thật.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRunPreview}
          disabled={!canRunPreview || previewLoading}
        >
          {previewLoading ? (
            <CircleNotch size={14} className="mr-1.5 animate-spin" />
          ) : (
            <ClipboardText size={14} className="mr-1.5" />
          )}
          Test
        </Button>
      </div>

      {supportsMissionPreview ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="preview_cluster">SOS Cluster để test</Label>
            <Select
              value={previewClusterId ? String(previewClusterId) : ""}
              onValueChange={(value) => setPreviewClusterId(Number(value))}
            >
              <SelectTrigger id="preview_cluster">
                <SelectValue
                  placeholder={
                    clustersLoading
                      ? "Đang tải danh sách cluster..."
                      : "Chọn cluster để preview"
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
            <p className="text-xs text-muted-foreground">
              Preview không ghi mission suggestion thật vào hệ thống. Nếu test
              fail bạn vẫn có thể bấm lưu cấu hình như bình thường.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsPreviewPanelOpen(true)}
            disabled={!previewResult && !previewError}
          >
            Mở Review
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Preview theo `sos-cluster` hiện chỉ hỗ trợ các prompt Mission*.
        </p>
      )}
    </div>
  );

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      return;
    }

    const payload = buildSubmitPayload();

    if (isEditing) {
      onSave(payload as UpdatePromptRequest);
      return;
    }

    const createData: CreatePromptRequest = {
      ...payload,
      is_active: formData.is_active,
    };
    onSave(createData as CreatePromptRequest);
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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onCancel}
          >
            <X size={16} />
          </Button>
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
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
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
                      handleProviderChange(value as PromptFormData["provider"])
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
                  <p className="text-xs text-muted-foreground">
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
                <p className="text-xs text-muted-foreground">
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
                  onChange={(e) => updateField("system_prompt", e.target.value)}
                  required
                  rows={6}
                  className="font-mono text-base"
                  placeholder="Nhập system prompt..."
                />
                <p className="text-xs text-muted-foreground">
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
                <p className="text-xs text-muted-foreground">
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
                <Label htmlFor="is_active" className="cursor-pointer text-base">
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
                  Cập nhật
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Luồng tạo mới gồm 3 bước. Hoàn tất bước hiện tại để mở bước kế
                  tiếp.
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
                          <CheckCircle size={16} className="text-emerald-600" />
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold">
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
                    <span className="text-xs font-medium text-emerald-700">
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
                    <p className="text-xs text-muted-foreground">
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
                      <span className="text-xs font-medium text-emerald-700">
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

                  <p className="text-xs text-muted-foreground">
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
                      <span className="text-xs font-medium text-emerald-700">
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
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
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
                    <p className="text-xs text-muted-foreground">
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
                    <p className="text-xs text-muted-foreground">
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
      <AiStreamPanel
        open={isPreviewPanelOpen}
        onClose={() => setIsPreviewPanelOpen(false)}
        clusterId={previewClusterId}
        status={previewStatus}
        statusLog={previewStatusLog}
        thinkingText={previewThinkingText}
        result={previewResult}
        error={previewError}
        loading={previewLoading}
        phase={previewPhase}
        onStop={stopPreview}
        onRetry={handleRunPreview}
        onViewPlan={() => setIsPreviewPanelOpen(false)}
        primaryActionLabel={
          isEditing
            ? "Cập nhật prompt với cấu hình này"
            : "Tạo prompt với cấu hình này"
        }
        onPrimaryAction={handleApprovePreview}
      />
    </>
  );
};

export default PromptEditor;
