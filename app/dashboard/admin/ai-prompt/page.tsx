"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowsIn,
  ArrowsOut,
  ArrowClockwise,
  ArrowCounterClockwise,
  CheckCircle,
  ClockCounterClockwise,
  Code,
  DotsSixVertical,
  PencilSimple,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/components/admin";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  DeletePromptDialog,
  PromptEditor,
  PromptList,
} from "@/components/admin/ai-prompt";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_PROVIDER_OPTIONS, PROMPT_TYPE_OPTIONS } from "@/lib/constants";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { cn } from "@/lib/utils";
import { getPromptById } from "@/services/prompt/api";
import {
  useActivatePrompt,
  useCreatePrompt,
  useCreatePromptDraft,
  useDeletePrompt,
  usePrompts,
  useRollbackPrompt,
  usePromptVersions,
  useUpdatePrompt,
} from "@/services/prompt/hooks";
import type {
  CreatePromptRequest,
  PromptDetailEntity,
  PromptEntity,
  PromptType,
  UpdatePromptRequest,
} from "@/services/prompt/type";
import {
  useActivateAiConfig,
  useAiConfigById,
  useAiConfigVersions,
  useAiConfigs,
  useCreateAiConfig,
  useCreateAiConfigDraft,
  useDeleteAiConfigDraft,
  useRollbackAiConfig,
  useUpdateAiConfigDraft,
} from "@/services/ai-config/hooks";
import type {
  AiProvider,
  AiConfigSummaryEntity,
  CreateAiConfigRequest,
  UpdateAiConfigRequest,
} from "@/services/ai-config/type";

type EditorMode = "closed" | "creating" | "editing";
type AiConfigDialogMode = "closed" | "create" | "edit";

type AiConfigFormState = {
  name: string;
  provider: AiProvider;
  model: string;
  temperature: number;
  max_tokens: number;
  api_url: string;
  api_key: string;
  version: string;
  is_active: boolean;
};

type AiConfigFormErrors = Partial<Record<keyof AiConfigFormState, string>>;

const GEMINI_API_URL_TEMPLATE =
  "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent?key={1}";
const OPENROUTER_API_URL_TEMPLATE =
  "https://openrouter.ai/api/v1/chat/completions";

function getDefaultAiConfigApiUrl(provider: AiProvider) {
  return provider === "Gemini"
    ? GEMINI_API_URL_TEMPLATE
    : OPENROUTER_API_URL_TEMPLATE;
}

function normalizeAiConfigVersion(version: string) {
  const trimmedVersion = version.trim();
  if (!trimmedVersion) {
    return "";
  }

  return trimmedVersion.startsWith("v") ? trimmedVersion : `v${trimmedVersion}`;
}

function isAbsoluteUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return Boolean(parsedUrl.protocol && parsedUrl.host);
  } catch {
    return false;
  }
}

function validateAiConfigForm(
  form: AiConfigFormState,
  mode: AiConfigDialogMode,
): AiConfigFormErrors {
  const errors: AiConfigFormErrors = {};
  const trimmedName = form.name.trim();
  const trimmedModel = form.model.trim();
  const trimmedApiUrl = form.api_url.trim();
  const normalizedVersion = normalizeAiConfigVersion(form.version);

  if (!trimmedName) {
    errors.name = "Tên AI config không được để trống.";
  } else if (trimmedName.length > 255) {
    errors.name = "Tên AI config không được vượt quá 255 ký tự.";
  }

  if (!trimmedModel) {
    errors.model = "Model không được để trống.";
  } else if (trimmedModel.length > 100) {
    errors.model = "Model không được vượt quá 100 ký tự.";
  }

  if (
    Number.isNaN(form.temperature) ||
    form.temperature < 0 ||
    form.temperature > 2
  ) {
    errors.temperature = "Temperature phải nằm trong khoảng từ 0 đến 2.";
  }

  if (
    Number.isNaN(form.max_tokens) ||
    !Number.isFinite(form.max_tokens) ||
    form.max_tokens <= 0
  ) {
    errors.max_tokens = "MaxTokens phải lớn hơn 0.";
  }

  if (!trimmedApiUrl) {
    errors.api_url = "ApiUrl không được để trống.";
  } else if (trimmedApiUrl.length > 500) {
    errors.api_url = "ApiUrl không được vượt quá 500 ký tự.";
  } else if (!isAbsoluteUrl(trimmedApiUrl)) {
    errors.api_url = "ApiUrl phải là URL tuyệt đối hợp lệ.";
  } else if (
    form.provider === "Gemini" &&
    (!trimmedApiUrl.includes("{0}") || !trimmedApiUrl.includes("{1}"))
  ) {
    errors.api_url =
      "Gemini backend hiện tại yêu cầu URL dạng .../models/{0}:generateContent?key={1}.";
  } else if (
    form.provider === "OpenRouter" &&
    (trimmedApiUrl.includes("{0}") || trimmedApiUrl.includes("{1}"))
  ) {
    errors.api_url =
      "OpenRouter dùng URL cố định, không cần placeholder {0} hoặc {1}.";
  }

  if (!normalizedVersion) {
    errors.version = "Phiên bản không được để trống.";
  } else if (normalizedVersion.length > 20) {
    errors.version = "Phiên bản không được vượt quá 20 ký tự.";
  } else if (mode === "create" && normalizedVersion.includes("-D")) {
    errors.version =
      "Version tạo mới không được dùng định dạng draft '-D'. Hãy dùng Clone draft.";
  } else if (mode === "edit" && !normalizedVersion.includes("-D")) {
    errors.version = "Version của draft phải chứa dấu hiệu '-D'.";
  }

  if (mode === "create" && !form.api_key.trim()) {
    errors.api_key = "API key không được để trống khi tạo AI config mới.";
  }

  return errors;
}

function getAiConfigWorkflowHint(
  selectedAiConfig: AiConfigSummaryEntity | null,
  activeAiConfig: AiConfigSummaryEntity | null,
) {
  if (!selectedAiConfig) {
    return "Tạo AI config đầu tiên rồi chọn version để test prompt. Khi đã ổn, activate version đó để chạy thật trên hệ thống.";
  }

  if (selectedAiConfig.status === "Draft") {
    return "Bạn đang chọn bản Draft. Có thể sửa draft, test prompt với draft này, activate để đưa lên hệ thống, hoặc xóa draft nếu muốn làm lại.";
  }

  if (selectedAiConfig.status === "Active") {
    return "Bạn đang xem bản Active đang chạy thật. Nếu muốn chỉnh sửa, hãy bấm Clone draft để tạo bản nháp riêng rồi sửa trên draft đó.";
  }

  if (activeAiConfig && selectedAiConfig.id !== activeAiConfig.id) {
    return "Bạn đang xem một bản Archived. Có thể rollback để active lại ngay, hoặc clone draft từ bản này nếu muốn chỉnh tiếp mà chưa đổi bản đang chạy.";
  }

  return "Chọn một version rồi dùng các nút thao tác ở phía trên để clone draft, activate hoặc rollback.";
}

function getStatusWeight(status: string) {
  if (status === "Active") return 0;
  if (status === "Draft") return 1;
  return 2;
}

function sortByLifecycle<
  T extends {
    status: string;
    updatedAt: string | null;
    createdAt: string | null;
    id: number;
  },
>(items: T[]) {
  return [...items].sort((left, right) => {
    const statusDelta =
      getStatusWeight(left.status) - getStatusWeight(right.status);
    if (statusDelta !== 0) {
      return statusDelta;
    }

    const leftTime = new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();
    const rightTime = new Date(
      right.updatedAt ?? right.createdAt ?? 0,
    ).getTime();
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return right.id - left.id;
  });
}

function sortByCreatedAtDesc<
  T extends {
    createdAt: string | null;
    id: number;
  },
>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.createdAt ?? 0).getTime();
    const rightTime = new Date(right.createdAt ?? 0).getTime();
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return right.id - left.id;
  });
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shouldShowPromptVersion(status: string) {
  return status !== "Draft";
}

function getDefaultAiConfigForm(
  seed?: Partial<AiConfigFormState>,
): AiConfigFormState {
  const provider = seed?.provider ?? "Gemini";
  const providerOption =
    AI_PROVIDER_OPTIONS.find((option) => option.value === provider) ??
    AI_PROVIDER_OPTIONS[0];
  const defaultModel = providerOption.models[0]?.code ?? "";

  return {
    name: seed?.name ?? "",
    provider,
    model: seed?.model ?? defaultModel,
    temperature: seed?.temperature ?? 0.3,
    max_tokens: seed?.max_tokens ?? 2048,
    api_url: seed?.api_url ?? getDefaultAiConfigApiUrl(provider),
    api_key: seed?.api_key ?? "",
    version: seed?.version ?? "1.0",
    is_active: seed?.is_active ?? true,
  };
}

const FORM_SELECT_TRIGGER_CLASSNAME =
  "h-12 w-full rounded-lg bg-background px-4 text-sm";
const CUSTOM_AI_MODEL_OPTION_VALUE = "__custom_ai_model__";
const EDITOR_MIN_PANEL_HEIGHT = 380;
const EDITOR_DEFAULT_PANEL_HEIGHT = 760;
const INVALID_FIELD_CLASSNAME =
  "border-destructive focus-visible:ring-destructive/20";

const AIPromptPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [selectedPromptType, setSelectedPromptType] =
    useState<PromptType | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [selectedAiConfigId, setSelectedAiConfigId] = useState<number | null>(
    null,
  );
  const [editorMode, setEditorMode] = useState<EditorMode>("closed");
  const [editingPrompt, setEditingPrompt] = useState<PromptDetailEntity | null>(
    null,
  );
  const [editorPanelHeight, setEditorPanelHeight] = useState(
    EDITOR_DEFAULT_PANEL_HEIGHT,
  );
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const editorDragStartY = useRef(0);
  const editorDragStartHeight = useRef(0);
  const isEditorDragging = useRef(false);
  const [deletingPrompt, setDeletingPrompt] = useState<PromptEntity | null>(
    null,
  );
  const [activatingPromptId, setActivatingPromptId] = useState<number | null>(
    null,
  );
  const [editorSourcePromptId, setEditorSourcePromptId] = useState<
    number | null
  >(null);
  const [aiConfigDialogMode, setAiConfigDialogMode] =
    useState<AiConfigDialogMode>("closed");
  const [aiConfigForm, setAiConfigForm] = useState<AiConfigFormState>(
    getDefaultAiConfigForm(),
  );
  const [aiConfigFormTargetId, setAiConfigFormTargetId] = useState<
    number | null
  >(null);

  const {
    data: promptsData,
    isLoading: promptsLoading,
    refetch: refetchPrompts,
  } = usePrompts({ params: { pageSize: 100 } });
  const prompts = useMemo(() => promptsData?.items ?? [], [promptsData?.items]);

  const {
    data: aiConfigsData,
    isLoading: aiConfigsLoading,
    refetch: refetchAiConfigs,
  } = useAiConfigs({ pageSize: 100 });
  const aiConfigs = useMemo(
    () => aiConfigsData?.items ?? [],
    [aiConfigsData?.items],
  );

  const activeAiConfig =
    aiConfigs.find((item) => item.isActive || item.status === "Active") ?? null;

  useEffect(() => {
    getDashboardData()
      .then(setDashboardData)
      .catch(console.error)
      .finally(() => setDashboardLoading(false));
  }, []);

  const effectiveSelectedPromptType = useMemo(() => {
    if (selectedPromptType) {
      return selectedPromptType;
    }

    return (
      PROMPT_TYPE_OPTIONS.find((option) =>
        prompts.some(
          (prompt) =>
            prompt.promptType === option.value &&
            shouldShowPromptVersion(prompt.status),
        ),
      )?.value ?? null
    );
  }, [prompts, selectedPromptType]);

  const promptTypeCounts = useMemo(
    () =>
      PROMPT_TYPE_OPTIONS.reduce(
        (accumulator, option) => {
          accumulator[option.value] = prompts.filter(
            (prompt) =>
              prompt.promptType === option.value &&
              shouldShowPromptVersion(prompt.status),
          ).length;
          return accumulator;
        },
        {} as Record<PromptType, number>,
      ),
    [prompts],
  );

  const promptSummariesForType = useMemo(() => {
    if (!effectiveSelectedPromptType) {
      return [];
    }

    return sortByCreatedAtDesc(
      prompts.filter(
        (prompt) => prompt.promptType === effectiveSelectedPromptType,
      ),
    );
  }, [effectiveSelectedPromptType, prompts]);

  const visiblePromptSummariesForType = useMemo(
    () =>
      promptSummariesForType.filter((prompt) =>
        shouldShowPromptVersion(prompt.status),
      ),
    [promptSummariesForType],
  );

  const effectiveSelectedPromptId = useMemo(() => {
    if (
      selectedPromptId !== null &&
      visiblePromptSummariesForType.some(
        (prompt) => prompt.id === selectedPromptId,
      )
    ) {
      return selectedPromptId;
    }

    return (
      visiblePromptSummariesForType.find((prompt) => prompt.status === "Active")
        ?.id ??
      visiblePromptSummariesForType[0]?.id ??
      null
    );
  }, [selectedPromptId, visiblePromptSummariesForType]);

  const activeAiConfigId = activeAiConfig?.id ?? null;
  const effectiveSelectedAiConfigId = useMemo(() => {
    if (
      selectedAiConfigId !== null &&
      aiConfigs.some((config) => config.id === selectedAiConfigId)
    ) {
      return selectedAiConfigId;
    }

    return activeAiConfigId ?? aiConfigs[0]?.id ?? null;
  }, [activeAiConfigId, aiConfigs, selectedAiConfigId]);

  const { data: promptVersionsData } = usePromptVersions(
    effectiveSelectedPromptId,
    Boolean(effectiveSelectedPromptId),
  );

  const promptVersions = useMemo(() => {
    if (!effectiveSelectedPromptType) {
      return [];
    }

    const rawVersions = promptVersionsData?.items ?? promptSummariesForType;
    const hydratedVersions = rawVersions.map((item) => {
      const matchedPrompt = prompts.find((prompt) => prompt.id === item.id);
      return matchedPrompt ?? { ...item, purpose: null };
    });

    return sortByCreatedAtDesc(
      hydratedVersions.filter((item) => shouldShowPromptVersion(item.status)),
    );
  }, [
    effectiveSelectedPromptType,
    promptSummariesForType,
    promptVersionsData?.items,
    prompts,
  ]);

  const { data: selectedAiConfigDetail } = useAiConfigById(
    effectiveSelectedAiConfigId,
    Boolean(effectiveSelectedAiConfigId),
  );
  const { data: aiConfigVersionsData } = useAiConfigVersions(
    effectiveSelectedAiConfigId,
    Boolean(effectiveSelectedAiConfigId),
  );

  const selectedAiConfig =
    selectedAiConfigDetail ??
    aiConfigs.find((item) => item.id === effectiveSelectedAiConfigId) ??
    null;
  const promptAiConfig = selectedAiConfig ?? activeAiConfig ?? null;
  const isSelectedAiConfigActive = selectedAiConfig?.id === activeAiConfig?.id;
  const aiConfigWorkflowHint = useMemo(
    () => getAiConfigWorkflowHint(selectedAiConfig, activeAiConfig),
    [activeAiConfig, selectedAiConfig],
  );
  const aiConfigVersions = useMemo(
    () => sortByLifecycle(aiConfigVersionsData?.items ?? aiConfigs),
    [aiConfigVersionsData?.items, aiConfigs],
  );
  const selectedAiProviderOption = useMemo(
    () =>
      AI_PROVIDER_OPTIONS.find(
        (option) => option.value === aiConfigForm.provider,
      ) ?? AI_PROVIDER_OPTIONS[0],
    [aiConfigForm.provider],
  );
  const aiProviderModelOptions = selectedAiProviderOption.models;
  const isSelectedModelInProviderOptions = aiProviderModelOptions.some(
    (modelOption) => modelOption.code === aiConfigForm.model,
  );
  const aiConfigModelSelectValue = isSelectedModelInProviderOptions
    ? aiConfigForm.model
    : CUSTOM_AI_MODEL_OPTION_VALUE;
  const aiConfigFormErrors = useMemo(
    () => validateAiConfigForm(aiConfigForm, aiConfigDialogMode),
    [aiConfigDialogMode, aiConfigForm],
  );
  const canSaveAiConfig =
    aiConfigDialogMode !== "closed" &&
    Object.keys(aiConfigFormErrors).length === 0;

  const createPromptMutation = useCreatePrompt();
  const updatePromptMutation = useUpdatePrompt();
  const deletePromptMutation = useDeletePrompt();
  const activatePromptMutation = useActivatePrompt();
  const rollbackPromptMutation = useRollbackPrompt();
  const createPromptDraftMutation = useCreatePromptDraft();

  const createAiConfigMutation = useCreateAiConfig();
  const updateAiConfigDraftMutation = useUpdateAiConfigDraft();
  const createAiConfigDraftMutation = useCreateAiConfigDraft();
  const activateAiConfigMutation = useActivateAiConfig();
  const rollbackAiConfigMutation = useRollbackAiConfig();
  const deleteAiConfigDraftMutation = useDeleteAiConfigDraft();

  const closeEditor = useCallback(() => {
    setEditorMode("closed");
    setEditingPrompt(null);
    setEditorSourcePromptId(null);
    setIsEditorFullscreen(false);
  }, []);

  const openCreatePromptEditor = useCallback(() => {
    setEditingPrompt(null);
    setEditorSourcePromptId(null);
    setEditorMode("creating");
  }, []);

  const openEditPromptEditor = useCallback(
    async (prompt: PromptEntity) => {
      if (!prompt) {
        return;
      }

      setEditorSourcePromptId(prompt.id);
      setSelectedPromptId(prompt.id);

      const toastId = toast.loading(
        prompt.status === "Draft"
          ? "Đang mở draft prompt..."
          : "Đang tạo draft prompt...",
      );

      try {
        let targetId = prompt.id;

        if (prompt.status !== "Draft") {
          const draft = await createPromptDraftMutation.mutateAsync(prompt.id);
          targetId = draft.id;
          setSelectedPromptId(draft.id);
        }

        const detail = await getPromptById(targetId);
        setEditingPrompt(detail);
        setEditorMode("editing");
        setIsEditorFullscreen(false);
        toast.dismiss(toastId);
        toast.success(
          prompt.status === "Draft"
            ? "Đã mở draft prompt."
            : "Đã tạo draft từ version đang chọn.",
        );
      } catch (error) {
        toast.dismiss(toastId);
        setEditorSourcePromptId(null);
        const message =
          error instanceof Error
            ? error.message
            : "Không thể mở prompt editor.";
        toast.error(message);
      }
    },
    [createPromptDraftMutation],
  );

  useEffect(() => {
    if (editorMode === "closed") {
      return;
    }

    setEditorPanelHeight(EDITOR_DEFAULT_PANEL_HEIGHT);
    setIsEditorFullscreen(false);
  }, [editorMode]);

  const handleEditorPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isEditorFullscreen) {
        return;
      }

      event.preventDefault();
      editorDragStartY.current = event.clientY;
      editorDragStartHeight.current = editorPanelHeight;
      isEditorDragging.current = true;

      const maxHeight =
        typeof window !== "undefined" ? window.innerHeight * 0.93 : 900;

      const onMove = (moveEvent: PointerEvent) => {
        if (!isEditorDragging.current) {
          return;
        }

        const delta = editorDragStartY.current - moveEvent.clientY;
        const nextHeight = Math.max(
          EDITOR_MIN_PANEL_HEIGHT,
          Math.min(maxHeight, editorDragStartHeight.current + delta),
        );
        setEditorPanelHeight(nextHeight);
      };

      const onUp = () => {
        isEditorDragging.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [editorPanelHeight, isEditorFullscreen],
  );

  const handleSavePrompt = useCallback(
    async (payload: CreatePromptRequest | UpdatePromptRequest) => {
      try {
        if (editingPrompt) {
          await updatePromptMutation.mutateAsync({
            id: editingPrompt.id,
            data: payload as UpdatePromptRequest,
          });
          toast.success("Đã lưu draft prompt.");
        } else {
          const createdPrompt = await createPromptMutation.mutateAsync(
            payload as CreatePromptRequest,
          );
          toast.success("Đã tạo prompt mới.");
          setSelectedPromptType(createdPrompt.promptType);
          setSelectedPromptId(createdPrompt.id);
        }

        setEditorMode("closed");
        setEditingPrompt(null);
        await Promise.all([refetchPrompts(), refetchAiConfigs()]);
      } catch (error) {
        const message =
          error instanceof AxiosError
            ? (error.response?.data?.message ?? "Không thể lưu prompt.")
            : "Không thể lưu prompt.";
        toast.error(message);
      }
    },
    [
      createPromptMutation,
      editingPrompt,
      refetchAiConfigs,
      refetchPrompts,
      updatePromptMutation,
    ],
  );

  const handleDeletePrompt = useCallback(async () => {
    if (!deletingPrompt) {
      return;
    }

    try {
      await deletePromptMutation.mutateAsync(deletingPrompt.id);
      toast.success("Đã xóa draft prompt.");
      setDeletingPrompt(null);
      if (selectedPromptId === deletingPrompt.id) {
        setSelectedPromptId(null);
      }
      await refetchPrompts();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message ?? "Không thể xóa draft prompt.")
          : "Không thể xóa draft prompt.";
      toast.error(message);
    }
  }, [deletePromptMutation, deletingPrompt, refetchPrompts, selectedPromptId]);

  const handleTogglePromptActive = useCallback(
    async (prompt: PromptEntity, nextActive: boolean) => {
      if (!nextActive) {
        return;
      }

      if (prompt.status === "Active") {
        return;
      }

      setActivatingPromptId(prompt.id);

      try {
        await activatePromptMutation.mutateAsync(prompt.id);
        toast.success("Đã kích hoạt prompt.");
        setSelectedPromptId(prompt.id);
        await refetchPrompts();
      } catch (error) {
        const message =
          error instanceof AxiosError
            ? (error.response?.data?.message ?? "Không thể kích hoạt prompt.")
            : "Không thể kích hoạt prompt.";
        toast.error(message);
      } finally {
        setActivatingPromptId(null);
      }
    },
    [activatePromptMutation, refetchPrompts],
  );

  const handleRollbackPromptFromEditor = useCallback(async () => {
    if (!editorSourcePromptId) {
      toast.info("Không có version để rollback.");
      return;
    }

    try {
      await rollbackPromptMutation.mutateAsync(editorSourcePromptId);
      toast.success("Đã rollback về version trước.");
      setSelectedPromptId(editorSourcePromptId);
      closeEditor();
      await refetchPrompts();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message ?? "Không thể rollback prompt.")
          : "Không thể rollback prompt.";
      toast.error(message);
    }
  }, [
    closeEditor,
    editorSourcePromptId,
    refetchPrompts,
    rollbackPromptMutation,
  ]);

  const openCreateAiConfigDialog = useCallback(() => {
    setAiConfigDialogMode("create");
    setAiConfigFormTargetId(null);
    setAiConfigForm(
      getDefaultAiConfigForm({
        is_active: aiConfigs.length === 0,
      }),
    );
  }, [aiConfigs.length]);

  const openEditAiConfigDialog = useCallback(() => {
    if (!selectedAiConfig) {
      return;
    }

    if (selectedAiConfig.status !== "Draft") {
      toast.error("Chỉ draft AI config mới có thể chỉnh sửa trực tiếp.");
      return;
    }

    setAiConfigDialogMode("edit");
    setAiConfigFormTargetId(selectedAiConfig.id);
    setAiConfigForm(
      getDefaultAiConfigForm({
        name: selectedAiConfig.name,
        provider: selectedAiConfig.provider,
        model: selectedAiConfig.model,
        temperature: selectedAiConfig.temperature,
        max_tokens: selectedAiConfig.maxTokens,
        api_url: selectedAiConfig.apiUrl ?? "",
        api_key: "",
        version: (selectedAiConfig.version ?? "1.0").replace(/^v/i, ""),
        is_active: selectedAiConfig.isActive,
      }),
    );
  }, [selectedAiConfig]);

  const handleSaveAiConfig = useCallback(async () => {
    if (!canSaveAiConfig) {
      toast.error("Vui lòng kiểm tra lại các trường AI config đang báo lỗi.");
      return;
    }

    const normalizedVersion = aiConfigForm.version.trim();
    const payloadBase = {
      name: aiConfigForm.name.trim(),
      provider: aiConfigForm.provider,
      model: aiConfigForm.model.trim(),
      temperature: aiConfigForm.temperature,
      max_tokens: aiConfigForm.max_tokens,
      api_url: aiConfigForm.api_url.trim(),
      version: normalizedVersion.startsWith("v")
        ? normalizedVersion
        : `v${normalizedVersion}`,
      is_active: aiConfigForm.is_active,
    };

    try {
      if (aiConfigDialogMode === "create") {
        const createdConfig = await createAiConfigMutation.mutateAsync({
          ...payloadBase,
          api_key: aiConfigForm.api_key.trim() || undefined,
        } satisfies CreateAiConfigRequest);
        toast.success("Đã tạo AI config.");
        setSelectedAiConfigId(createdConfig.id);
      } else if (aiConfigFormTargetId) {
        await updateAiConfigDraftMutation.mutateAsync({
          id: aiConfigFormTargetId,
          data: {
            ...payloadBase,
            api_key: aiConfigForm.api_key.trim() || undefined,
          } satisfies UpdateAiConfigRequest,
        });
        toast.success("Đã lưu draft AI config.");
      }

      setAiConfigDialogMode("closed");
      setAiConfigFormTargetId(null);
      await refetchAiConfigs();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message ?? "Không thể lưu AI config.")
          : "Không thể lưu AI config.";
      toast.error(message);
    }
  }, [
    aiConfigDialogMode,
    aiConfigForm,
    aiConfigFormTargetId,
    canSaveAiConfig,
    createAiConfigMutation,
    refetchAiConfigs,
    updateAiConfigDraftMutation,
  ]);

  const handleCreateAiConfigDraft = useCallback(async () => {
    if (!selectedAiConfig) {
      return;
    }

    try {
      const createdDraft = await createAiConfigDraftMutation.mutateAsync(
        selectedAiConfig.id,
      );
      toast.success("Đã tạo draft AI config.");
      setSelectedAiConfigId(createdDraft.id);
      await refetchAiConfigs();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message ?? "Không thể tạo draft AI config.")
          : "Không thể tạo draft AI config.";
      toast.error(message);
    }
  }, [createAiConfigDraftMutation, refetchAiConfigs, selectedAiConfig]);

  const handleActivateAiConfig = useCallback(async () => {
    if (!selectedAiConfig) {
      return;
    }

    try {
      await activateAiConfigMutation.mutateAsync(selectedAiConfig.id);
      toast.success("Đã activate AI config.");
      await refetchAiConfigs();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message ?? "Không thể activate AI config.")
          : "Không thể activate AI config.";
      toast.error(message);
    }
  }, [activateAiConfigMutation, refetchAiConfigs, selectedAiConfig]);

  const handleRollbackAiConfig = useCallback(async () => {
    if (!selectedAiConfig) {
      return;
    }

    try {
      await rollbackAiConfigMutation.mutateAsync(selectedAiConfig.id);
      toast.success("Rollback AI config thành công.");
      await refetchAiConfigs();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message ?? "Không thể rollback AI config.")
          : "Không thể rollback AI config.";
      toast.error(message);
    }
  }, [refetchAiConfigs, rollbackAiConfigMutation, selectedAiConfig]);

  const handleDeleteAiConfigDraft = async () => {
    if (!selectedAiConfig || selectedAiConfig.status !== "Draft") {
      return;
    }

    try {
      await deleteAiConfigDraftMutation.mutateAsync(selectedAiConfig.id);
      toast.success("Đã xóa draft AI config.");
      setSelectedAiConfigId(activeAiConfig?.id ?? null);
      await refetchAiConfigs();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message ?? "Không thể xóa draft AI config.")
          : "Không thể xóa draft AI config.";
      toast.error(message);
    }
  };

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

  const handleOpenAiConfigFromEditor = () => {
    if (aiConfigs.length === 0) {
      openCreateAiConfigDialog();
      return;
    }

    if (selectedAiConfig?.status === "Draft") {
      openEditAiConfigDialog();
      return;
    }

    toast.info(
      "Chọn 'Clone draft' ở khu AI config phía trên để chỉnh cấu hình.",
    );
  };

  return (
    <DashboardLayout
      favorites={dashboardData.favorites}
      projects={dashboardData.projects}
      cloudStorage={dashboardData.cloudStorage}
    >
      <div className="animate-in slide-in-from-bottom-4 space-y-6 duration-500">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Cấu hình AI Prompt
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Đồng bộ prompt lifecycle với AI config versioning ở backend.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void Promise.all([refetchPrompts(), refetchAiConfigs()]);
              }}
              disabled={promptsLoading || aiConfigsLoading}
            >
              <ArrowCounterClockwise
                size={16}
                className={cn(
                  "mr-2",
                  (promptsLoading || aiConfigsLoading) && "animate-spin",
                )}
              />
              Làm mới
            </Button>
            <Button onClick={openCreatePromptEditor}>
              <Plus size={16} className="mr-2" />
              Tạo prompt mới
            </Button>
          </div>
        </div>

        <Card className="border border-border/60 bg-card/95 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Code size={18} />
                  AI config dùng chung toàn hệ thống
                </CardTitle>
                <CardDescription className="mt-1 text-sm">
                  Mỗi prompt sẽ dùng AI config đang chọn hoặc đang active để
                  test và chạy thực tế.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                {aiConfigs.length === 0 ? (
                  <Button onClick={openCreateAiConfigDialog}>
                    <Plus size={16} className="mr-2" />
                    Tạo AI config đầu tiên
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCreateAiConfigDraft}
                      disabled={!selectedAiConfig}
                    >
                      <Plus size={16} className="mr-2" />
                      Clone draft để sửa
                    </Button>
                    <Button
                      variant="outline"
                      onClick={openEditAiConfigDialog}
                      disabled={selectedAiConfig?.status !== "Draft"}
                    >
                      <PencilSimple size={16} className="mr-2" />
                      Mở draft
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleActivateAiConfig}
                      disabled={
                        !selectedAiConfig ||
                        (selectedAiConfig.status !== "Draft" &&
                          selectedAiConfig.status !== "Archived")
                      }
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Activate bản chọn
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRollbackAiConfig}
                      disabled={
                        !selectedAiConfig ||
                        selectedAiConfig.status === "Active"
                      }
                    >
                      <ClockCounterClockwise size={16} className="mr-2" />
                      Rollback bản chọn
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAiConfigDraft}
                      disabled={selectedAiConfig?.status !== "Draft"}
                    >
                      <Trash size={16} className="mr-2" />
                      Xóa draft
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">
                Cách dùng nhanh
              </p>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Bước 1
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    Chọn một version AI config ở danh sách bên dưới để review và
                    dùng version đó khi test prompt.
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Bước 2
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    Muốn chỉnh sửa thì clone draft. Chỉ bản Draft mới sửa hoặc
                    xóa trực tiếp được.
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Bước 3
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    Activate để chạy thật. Rollback để quay về version cũ khi
                    version mới có vấn đề.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/70 bg-background px-3 py-2.5">
                <p className="text-sm text-muted-foreground">
                  Đang chọn để test prompt
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {selectedAiConfig?.name ?? "Chưa có cấu hình"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedAiConfig
                    ? `${selectedAiConfig.status} • ${selectedAiConfig.version || "—"}`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-3 py-2.5">
                <p className="text-sm text-muted-foreground">
                  Đang active trên hệ thống
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {activeAiConfig?.name ?? "Chưa có bản active"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeAiConfig
                    ? `${activeAiConfig.version || "—"} • ${activeAiConfig.provider} • ${activeAiConfig.model}`
                    : "Các prompt sẽ chưa có config để chạy thật."}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-3 py-2.5">
                <p className="text-sm text-muted-foreground">
                  Model của bản đang chọn
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-foreground">
                  {selectedAiConfig
                    ? `${selectedAiConfig.provider} • ${selectedAiConfig.model}`
                    : "—"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Temp {selectedAiConfig?.temperature ?? "—"} • Max tokens{" "}
                  {selectedAiConfig?.maxTokens?.toLocaleString() ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-3 py-2.5">
                <p className="text-sm text-muted-foreground">
                  API URL / API key
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-foreground">
                  {selectedAiConfig?.apiUrl || "Dùng endpoint mặc định backend"}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {selectedAiConfig?.hasApiKey
                    ? selectedAiConfig.apiKeyMasked || "Đã cấu hình"
                    : "Chưa cấu hình"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cập nhật: {formatDate(selectedAiConfig?.updatedAt ?? null)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Gợi ý thao tác cho version đang chọn
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {aiConfigWorkflowHint}
              </p>
              {selectedAiConfig && !isSelectedAiConfigActive ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Prompt sẽ test bằng version đang chọn, còn chạy thực tế vẫn
                  dùng bản Active cho đến khi bạn Activate version khác.
                </p>
              ) : null}
            </div>

            {aiConfigVersions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <p className="text-sm font-medium text-foreground">
                    Version rail AI config
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Bấm một card để chọn version dùng khi review và test prompt.
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {aiConfigVersions.map((config) => (
                    <button
                      key={config.id}
                      type="button"
                      onClick={() => setSelectedAiConfigId(config.id)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all",
                        effectiveSelectedAiConfigId === config.id
                          ? "border-primary/50 bg-primary/5 shadow-sm"
                          : "border-border/60 hover:border-border hover:bg-muted/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            {config.name}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {config.provider} • {config.model}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant={
                              config.status === "Active" ? "success" : "outline"
                            }
                          >
                            {config.status}
                          </Badge>
                          {effectiveSelectedAiConfigId === config.id ? (
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Đang chọn
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                        <span>Version: {config.version || "—"}</span>
                        <span>
                          API key:{" "}
                          {config.hasApiKey ? "Đã cấu hình" : "Chưa cấu hình"}
                        </span>
                        <span>Cập nhật: {formatDate(config.updatedAt)}</span>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {config.id === activeAiConfig?.id
                          ? "Đây là bản đang chạy thật trên hệ thống."
                          : effectiveSelectedAiConfigId === config.id
                            ? "Prompt sẽ test bằng version này."
                            : "Bấm để chọn version này khi test prompt."}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <PromptList
          prompts={promptVersions}
          isLoading={promptsLoading}
          selectedId={effectiveSelectedPromptId}
          activatingPromptId={activatingPromptId}
          selectedPromptType={effectiveSelectedPromptType}
          promptTypeCounts={promptTypeCounts}
          aiConfig={promptAiConfig}
          onSelectPromptType={setSelectedPromptType}
          onSelect={(prompt) => setSelectedPromptId(prompt.id)}
          onToggleActive={(prompt, nextActive) => {
            void handleTogglePromptActive(prompt, nextActive);
          }}
          onEdit={(prompt) => {
            void openEditPromptEditor(prompt);
          }}
          onDelete={(prompt) => {
            setSelectedPromptId(prompt.id);

            if (prompt.status !== "Draft") {
              toast.info("Chỉ có thể xóa bản draft.");
              return;
            }

            setDeletingPrompt(prompt);
          }}
        />
      </div>

      <AnimatePresence>
        {editorMode !== "closed" ? (
          <>
            <motion.div
              key="prompt-editor-backdrop"
              className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[1.5px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={closeEditor}
            />

            <motion.div
              key="prompt-editor-panel"
              className={cn(
                "fixed z-51 flex",
                isEditorFullscreen
                  ? "inset-0 items-stretch justify-stretch"
                  : "inset-x-0 bottom-0 items-end justify-stretch",
              )}
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 340,
                damping: 34,
                mass: 0.85,
              }}
            >
              <div
                className={cn(
                  "relative flex flex-col overflow-hidden bg-background text-[14px] shadow-2xl",
                  isEditorFullscreen
                    ? "h-screen w-screen rounded-none border-0"
                    : "w-full rounded-t-2xl border-t border-border/60",
                )}
                style={
                  isEditorFullscreen ? undefined : { height: editorPanelHeight }
                }
              >
                <div className="relative px-5 pt-2.5 pb-1 shrink-0">
                  <div className="flex justify-center">
                    {!isEditorFullscreen ? (
                      <div
                        className="group flex cursor-ns-resize select-none flex-col items-center touch-none"
                        onPointerDown={handleEditorPointerDown}
                      >
                        <div className="h-1.5 w-14 rounded-full bg-border transition-colors duration-150 group-hover:bg-primary/50 group-active:bg-primary/70" />
                        <span className="mt-1 flex items-center gap-0.5 text-xs tracking-tighter text-muted-foreground/80 transition-colors group-hover:text-muted-foreground/70">
                          <DotsSixVertical className="h-3 w-3" />
                          kéo để thay đổi kích cỡ
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs tracking-tighter text-muted-foreground">
                        Đang ở chế độ xem đầy đủ
                      </span>
                    )}
                  </div>

                  <div className="absolute right-5 top-2.5 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() =>
                        setIsEditorFullscreen((previous) => !previous)
                      }
                    >
                      {isEditorFullscreen ? (
                        <ArrowsIn className="h-4 w-4" />
                      ) : (
                        <ArrowsOut className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={closeEditor}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                  <PromptEditor
                    prompt={editingPrompt}
                    forcedPromptType={effectiveSelectedPromptType}
                    aiConfig={promptAiConfig}
                    aiConfigId={promptAiConfig?.id ?? null}
                    canRollback={Boolean(editorSourcePromptId)}
                    isRollingBack={rollbackPromptMutation.isPending}
                    isSubmitting={
                      createPromptMutation.isPending ||
                      updatePromptMutation.isPending
                    }
                    onSave={handleSavePrompt}
                    onRollback={() => {
                      void handleRollbackPromptFromEditor();
                    }}
                    onCancel={closeEditor}
                    hideHeaderClose
                    onOpenAiConfig={handleOpenAiConfigFromEditor}
                  />
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <Dialog
        open={aiConfigDialogMode !== "closed"}
        onOpenChange={(open) => {
          if (!open) {
            setAiConfigDialogMode("closed");
            setAiConfigFormTargetId(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {aiConfigDialogMode === "create"
                ? "Tạo AI config"
                : "Chỉnh sửa draft AI config"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ai_config_name">Tên AI config</Label>
              <Input
                id="ai_config_name"
                value={aiConfigForm.name}
                maxLength={255}
                className={cn(
                  aiConfigFormErrors.name && INVALID_FIELD_CLASSNAME,
                )}
                onChange={(event) =>
                  setAiConfigForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
              />
              {aiConfigFormErrors.name ? (
                <p className="text-sm text-destructive">
                  {aiConfigFormErrors.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai_config_provider">Provider</Label>
              <Select
                value={aiConfigForm.provider}
                onValueChange={(value) => {
                  const nextProvider = value as AiProvider;
                  const providerOption = AI_PROVIDER_OPTIONS.find(
                    (option) => option.value === nextProvider,
                  );
                  setAiConfigForm((previous) => {
                    const previousDefaultUrl = getDefaultAiConfigApiUrl(
                      previous.provider,
                    );
                    const nextDefaultUrl =
                      getDefaultAiConfigApiUrl(nextProvider);

                    return {
                      ...previous,
                      provider: nextProvider,
                      model: providerOption?.models[0]?.code ?? previous.model,
                      api_url:
                        !previous.api_url.trim() ||
                        previous.api_url === previousDefaultUrl
                          ? nextDefaultUrl
                          : previous.api_url,
                    };
                  });
                }}
              >
                <SelectTrigger
                  id="ai_config_provider"
                  className={FORM_SELECT_TRIGGER_CLASSNAME}
                >
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai_config_model">Model</Label>
              <Select
                value={aiConfigModelSelectValue}
                onValueChange={(value) => {
                  if (value === CUSTOM_AI_MODEL_OPTION_VALUE) {
                    setAiConfigForm((previous) => ({
                      ...previous,
                      model: "",
                    }));
                    return;
                  }

                  setAiConfigForm((previous) => ({
                    ...previous,
                    model: value,
                  }));
                }}
              >
                <SelectTrigger
                  id="ai_config_model"
                  className={cn(
                    FORM_SELECT_TRIGGER_CLASSNAME,
                    aiConfigFormErrors.model && INVALID_FIELD_CLASSNAME,
                  )}
                >
                  <SelectValue placeholder="Chọn model" />
                </SelectTrigger>
                <SelectContent>
                  {aiProviderModelOptions.map((modelOption) => (
                    <SelectItem key={modelOption.code} value={modelOption.code}>
                      {modelOption.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_AI_MODEL_OPTION_VALUE}>
                    Khác (tự nhập)
                  </SelectItem>
                </SelectContent>
              </Select>

              {aiConfigModelSelectValue === CUSTOM_AI_MODEL_OPTION_VALUE ? (
                <Input
                  value={aiConfigForm.model}
                  maxLength={100}
                  className={cn(
                    aiConfigFormErrors.model && INVALID_FIELD_CLASSNAME,
                  )}
                  onChange={(event) =>
                    setAiConfigForm((previous) => ({
                      ...previous,
                      model: event.target.value,
                    }))
                  }
                  placeholder="Nhập model tùy chỉnh"
                />
              ) : null}
              {aiConfigFormErrors.model ? (
                <p className="text-sm text-destructive">
                  {aiConfigFormErrors.model}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ai_config_temperature">Temperature</Label>
                <Input
                  id="ai_config_temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  className={cn(
                    aiConfigFormErrors.temperature && INVALID_FIELD_CLASSNAME,
                  )}
                  value={aiConfigForm.temperature}
                  onChange={(event) =>
                    setAiConfigForm((previous) => ({
                      ...previous,
                      temperature: parseFloat(event.target.value) || 0,
                    }))
                  }
                />
                {aiConfigFormErrors.temperature ? (
                  <p className="text-sm text-destructive">
                    {aiConfigFormErrors.temperature}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai_config_max_tokens">Max tokens</Label>
                <Input
                  id="ai_config_max_tokens"
                  type="number"
                  min="1"
                  className={cn(
                    aiConfigFormErrors.max_tokens && INVALID_FIELD_CLASSNAME,
                  )}
                  value={aiConfigForm.max_tokens}
                  onChange={(event) =>
                    setAiConfigForm((previous) => ({
                      ...previous,
                      max_tokens: parseInt(event.target.value, 10) || 0,
                    }))
                  }
                />
                {aiConfigFormErrors.max_tokens ? (
                  <p className="text-sm text-destructive">
                    {aiConfigFormErrors.max_tokens}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai_config_version">Version</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground/70">
                  v
                </span>
                <Input
                  id="ai_config_version"
                  value={aiConfigForm.version}
                  maxLength={20}
                  className={cn(
                    "pl-6",
                    aiConfigFormErrors.version && INVALID_FIELD_CLASSNAME,
                  )}
                  onChange={(event) =>
                    setAiConfigForm((previous) => ({
                      ...previous,
                      version: event.target.value.replace(
                        /[^0-9.a-zA-Z-]/g,
                        "",
                      ),
                    }))
                  }
                />
              </div>
              {aiConfigFormErrors.version ? (
                <p className="text-sm text-destructive">
                  {aiConfigFormErrors.version}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai_config_api_url">API URL</Label>
              <Input
                id="ai_config_api_url"
                value={aiConfigForm.api_url}
                maxLength={500}
                className={cn(
                  aiConfigFormErrors.api_url && INVALID_FIELD_CLASSNAME,
                )}
                onChange={(event) =>
                  setAiConfigForm((previous) => ({
                    ...previous,
                    api_url: event.target.value,
                  }))
                }
                placeholder={getDefaultAiConfigApiUrl(aiConfigForm.provider)}
              />
              {aiConfigFormErrors.api_url ? (
                <p className="text-sm text-destructive">
                  {aiConfigFormErrors.api_url}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai_config_api_key">API key</Label>
              <Input
                id="ai_config_api_key"
                type="password"
                className={cn(
                  aiConfigFormErrors.api_key && INVALID_FIELD_CLASSNAME,
                )}
                value={aiConfigForm.api_key}
                onChange={(event) =>
                  setAiConfigForm((previous) => ({
                    ...previous,
                    api_key: event.target.value,
                  }))
                }
                placeholder="Nhập API key"
                autoComplete="new-password"
              />
              {aiConfigFormErrors.api_key ? (
                <p className="text-sm text-destructive">
                  {aiConfigFormErrors.api_key}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAiConfigDialogMode("closed")}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleSaveAiConfig();
              }}
              disabled={
                !canSaveAiConfig ||
                createAiConfigMutation.isPending ||
                updateAiConfigDraftMutation.isPending
              }
            >
              {createAiConfigMutation.isPending ||
              updateAiConfigDraftMutation.isPending ? (
                <ArrowClockwise size={16} className="mr-2 animate-spin" />
              ) : null}
              Lưu AI config
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeletePromptDialog
        prompt={deletingPrompt}
        open={Boolean(deletingPrompt)}
        isDeleting={deletePromptMutation.isPending}
        onClose={() => setDeletingPrompt(null)}
        onConfirm={() => {
          void handleDeletePrompt();
        }}
      />
    </DashboardLayout>
  );
};

export default AIPromptPage;
