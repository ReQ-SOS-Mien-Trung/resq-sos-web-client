import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPrompts,
  getPromptById,
  createPrompt,
  updatePrompt,
  deletePrompt,
  testPromptRescueSuggestion,
  streamPromptRescueSuggestionPreview,
} from "./api";
import {
  GetPromptsResponse,
  GetPromptsParams,
  PromptDetailEntity,
  CreatePromptRequest,
  CreatePromptResponse,
  UpdatePromptRequest,
  PreviewPromptRescueSuggestionRequest,
  TestPromptRescueSuggestionRequest,
  TestPromptRescueSuggestionResponse,
} from "./type";
import { AxiosError } from "axios";
import type { ClusterRescueSuggestionResponse } from "@/services/sos_cluster/type";

export const PROMPTS_QUERY_KEY = ["prompts"] as const;

export interface UsePromptsOptions {
  params?: GetPromptsParams;
  enabled?: boolean;
}

/**
 * Hook to fetch all prompts with pagination
 */
export function usePrompts(options?: UsePromptsOptions) {
  return useQuery<GetPromptsResponse>({
    queryKey: [...PROMPTS_QUERY_KEY, options?.params],
    queryFn: () => getPrompts(options?.params),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new prompt
 * Handles 409 Conflict (prompt name already exists)
 */
export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation<
    CreatePromptResponse,
    AxiosError<{ message: string }>,
    CreatePromptRequest
  >({
    mutationFn: createPrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROMPTS_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to fetch a single prompt by ID
 */
export function usePromptById(id: number, enabled = true) {
  return useQuery<PromptDetailEntity>({
    queryKey: [...PROMPTS_QUERY_KEY, id],
    queryFn: () => getPromptById(id),
    enabled,
  });
}

/**
 * Hook to update a prompt
 */
export function useUpdatePrompt() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<{ message: string }>,
    { id: number; data: UpdatePromptRequest }
  >({
    mutationFn: ({ id, data }) => updatePrompt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROMPTS_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to delete a prompt
 */
export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<{ message: string }>, number>({
    mutationFn: deletePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROMPTS_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to test a prompt draft payload with SOS cluster data
 */
export function useTestPromptRescueSuggestion() {
  return useMutation<
    TestPromptRescueSuggestionResponse,
    AxiosError<{ message: string }>,
    { id: number; data: TestPromptRescueSuggestionRequest }
  >({
    mutationFn: ({ id, data }) => testPromptRescueSuggestion(id, data),
  });
}

export interface PromptPreviewLogEntry {
  id: number;
  timestamp: number;
  message: string;
  type: "status" | "chunk" | "result" | "error";
}

const STATUS_TOKEN_LABELS: Record<string, string> = {
  loading_context: "Đang tải ngữ cảnh hiện trường...",
  requirements: "Đang tổng hợp nhu cầu cứu hộ...",
  depot: "Đang đối chiếu kho vật tư phù hợp...",
  team: "Đang gán đội cứu hộ và điểm tập kết...",
  assemble: "Đang ráp nháp kế hoạch nhiệm vụ...",
  validate: "Đang kiểm tra và chuẩn hóa kế hoạch cuối...",
};

function normalizePreviewStatusMessage(raw: string): string {
  const message = raw.trim();
  if (!message) return "Đang chuẩn bị preview kế hoạch...";

  const lower = message.toLowerCase();
  const matchedStatusToken = Object.keys(STATUS_TOKEN_LABELS).find((token) =>
    lower.includes(token),
  );

  if (matchedStatusToken) {
    return STATUS_TOKEN_LABELS[matchedStatusToken];
  }

  if (lower === "done") {
    return "Preview kế hoạch đã hoàn tất.";
  }

  return message.replace(/\s+/g, " ").trim();
}

function normalizePreviewErrorMessage(raw: string): string {
  const message = raw.trim();
  const lower = message.toLowerCase();

  const isRateLimitError =
    /429|rate\s*limit|too\s*many\s*requests|quota|resource\s*has\s*been\s*exhausted|token|exhausted/i.test(
      lower,
    );

  if (isRateLimitError) {
    return "AI đang tạm hết token/quota hoặc quá tải. Vui lòng thử lại sau vài phút.";
  }

  const isAuthorizationError =
    /401|403|unauthorized|forbidden|api\s*key|permission denied|access denied/i.test(
      lower,
    );

  if (isAuthorizationError) {
    return "Không thể gọi AI do thiếu quyền hoặc API key chưa hợp lệ. Vui lòng kiểm tra lại cấu hình.";
  }

  const isTimeoutError =
    /408|504|timeout|timed\s*out|deadline\s*exceeded|gateway\s*timeout/i.test(
      lower,
    );

  if (isTimeoutError) {
    return "AI phản hồi quá chậm nên test bị timeout. Vui lòng thử lại.";
  }

  const isServerError =
    /5\d\d|internal\s*server\s*error|bad\s*gateway|service\s*unavailable/i.test(
      lower,
    );

  if (isServerError) {
    return "Dịch vụ AI đang gián đoạn tạm thời. Vui lòng thử lại sau.";
  }

  const isNetworkError =
    /network|failed\s*to\s*fetch|connection|socket|econn|enotfound/i.test(
      lower,
    );

  if (isNetworkError) {
    return "Không kết nối được tới dịch vụ AI. Vui lòng kiểm tra mạng rồi thử lại.";
  }

  return "AI chưa thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.";
}

export function usePromptRescuePreviewStream() {
  const [status, setStatus] = useState("");
  const [statusLog, setStatusLog] = useState<PromptPreviewLogEntry[]>([]);
  const [thinkingText, setThinkingText] = useState("");
  const [result, setResult] = useState<ClusterRescueSuggestionResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<
    | "idle"
    | "connecting"
    | "loading-data"
    | "calling-ai"
    | "processing"
    | "done"
    | "error"
  >("idle");
  const abortRef = useRef<AbortController | null>(null);
  const logIdRef = useRef(0);

  const addLog = useCallback(
    (message: string, type: PromptPreviewLogEntry["type"] = "status") => {
      const nextLog: PromptPreviewLogEntry = {
        id: ++logIdRef.current,
        timestamp: Date.now(),
        message,
        type,
      };
      setStatusLog((prev) => [...prev, nextLog]);
    },
    [],
  );

  const derivePhase = useCallback((message: string) => {
    const msg = message.toLowerCase();
    if (msg.includes("tải ngữ cảnh")) return "loading-data" as const;
    if (msg.includes("đối chiếu") || msg.includes("gán đội")) {
      return "calling-ai" as const;
    }
    if (msg.includes("ráp nháp") || msg.includes("chuẩn hóa")) {
      return "processing" as const;
    }
    if (msg.includes("hoàn tất")) return "done" as const;
    return "connecting" as const;
  }, []);

  const startPreview = useCallback(
    (request: PreviewPromptRescueSuggestionRequest) => {
      setStatus("");
      setStatusLog([]);
      setThinkingText("");
      setResult(null);
      setError(null);
      setLoading(true);
      setPhase("connecting");
      logIdRef.current = 0;
      abortRef.current?.abort();

      abortRef.current = streamPromptRescueSuggestionPreview(request, {
        onStatus: (message) => {
          const readableMessage = normalizePreviewStatusMessage(message);
          setStatus(readableMessage);
          addLog(readableMessage, "status");
          setPhase(derivePhase(readableMessage));
        },
        onChunk: (text) => setThinkingText((prev) => prev + text),
        onResult: (previewResult) => {
          setResult(previewResult);
          addLog("Preview kế hoạch đã sẵn sàng.", "result");
          setPhase("done");
        },
        onError: (previewError) => {
          const readableError = normalizePreviewErrorMessage(previewError);
          setError(readableError);
          addLog(readableError, "error");
          setLoading(false);
          setPhase("error");
        },
        onDone: () => {
          setLoading(false);
          setPhase("done");
        },
      });
    },
    [addLog, derivePhase],
  );

  const stopPreview = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    setPhase("idle");
  }, []);

  const resetPreview = useCallback(() => {
    abortRef.current?.abort();
    setStatus("");
    setStatusLog([]);
    setThinkingText("");
    setResult(null);
    setError(null);
    setLoading(false);
    setPhase("idle");
    logIdRef.current = 0;
  }, []);

  return {
    status,
    statusLog,
    thinkingText,
    result,
    error,
    loading,
    phase,
    startPreview,
    stopPreview,
    resetPreview,
  };
}
