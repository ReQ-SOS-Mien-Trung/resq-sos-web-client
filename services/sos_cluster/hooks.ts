import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getSOSClusters,
  createSOSCluster,
  getMissionSuggestions,
  getAlternativeDepots,
  getClusterRescueSuggestion,
  streamClusterRescueSuggestion,
} from "./api";
import {
  GetSOSClustersResponse,
  GetSOSClustersParams,
  CreateSOSClusterRequest,
  CreateSOSClusterResponse,
  GetMissionSuggestionsResponse,
  ClusterRescueSuggestionResponse,
  AlternativeDepotsResponse,
} from "./type";

export const SOS_CLUSTERS_QUERY_KEY = ["sos-clusters"] as const;
export const MISSION_SUGGESTIONS_QUERY_KEY = ["mission-suggestions"] as const;
export const ALTERNATIVE_DEPOTS_QUERY_KEY = ["alternative-depots"] as const;

export interface UseMissionSuggestionsOptions {
  enabled?: boolean;
}

export interface UseAlternativeDepotsOptions {
  enabled?: boolean;
}

export interface UseSOSClustersOptions {
  params?: GetSOSClustersParams;
  enabled?: boolean;
}

/**
 * Hook to fetch all SOS clusters
 */
export function useSOSClusters(options?: UseSOSClustersOptions) {
  const queryKey = options?.params
    ? [...SOS_CLUSTERS_QUERY_KEY, options.params]
    : SOS_CLUSTERS_QUERY_KEY;

  return useQuery<GetSOSClustersResponse>({
    queryKey,
    queryFn: () => getSOSClusters(options?.params),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new SOS cluster (mutation)
 */
export function useCreateSOSCluster() {
  return useMutation<CreateSOSClusterResponse, Error, CreateSOSClusterRequest>({
    mutationFn: createSOSCluster,
  });
}

/**
 * Hook to fetch mission suggestions for a SOS cluster
 */
export function useMissionSuggestions(
  clusterId: number,
  options?: UseMissionSuggestionsOptions,
) {
  return useQuery<GetMissionSuggestionsResponse>({
    queryKey: [...MISSION_SUGGESTIONS_QUERY_KEY, clusterId],
    queryFn: () => getMissionSuggestions(clusterId),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch alternative depots for shortage items inferred by AI.
 */
export function useAlternativeDepots(
  clusterId: number,
  selectedDepotId: number,
  options?: UseAlternativeDepotsOptions,
) {
  return useQuery<AlternativeDepotsResponse>({
    queryKey: [...ALTERNATIVE_DEPOTS_QUERY_KEY, clusterId, selectedDepotId],
    queryFn: () => getAlternativeDepots(clusterId, selectedDepotId),
    enabled:
      (options?.enabled ?? true) &&
      Number.isFinite(clusterId) &&
      clusterId > 0 &&
      Number.isFinite(selectedDepotId) &&
      selectedDepotId > 0,
  });
}

/**
 * Hook to trigger AI rescue suggestion for a SOS cluster (mutation)
 */
export function useClusterRescueSuggestion() {
  return useMutation<ClusterRescueSuggestionResponse, Error, number>({
    mutationFn: (clusterId: number) => getClusterRescueSuggestion(clusterId),
  });
}

/** A timestamped status entry for the activity log */
export interface StreamLogEntry {
  id: number;
  timestamp: number;
  message: string;
  type: "status" | "chunk" | "result" | "error";
}

const TOOL_LABELS: Record<string, string> = {
  getTeams: "danh sách đội cứu hộ",
  getAssemblyPoints: "điểm tập kết",
  getDepots: "kho vật tư",
  getDepotInventory: "tồn kho vật tư",
  getSOSRequests: "dữ liệu yêu cầu SOS",
  getSOSClusters: "dữ liệu cụm SOS",
};

const STATUS_TOKEN_LABELS: Record<string, string> = {
  loading_context: "Đang tải ngữ cảnh hiện trường...",
  loading_data: "Đang tải dữ liệu hiện trường...",
  context: "Đang tải ngữ cảnh hiện trường...",
  load_context: "Đang tải ngữ cảnh hiện trường...",
  requirements: "Đang tổng hợp nhu cầu cứu hộ...",
  requirements_fragment: "Đang tổng hợp nhu cầu vật phẩm và nhân lực...",
  requirement: "Đang tổng hợp nhu cầu cứu hộ...",
  depot_fragment: "Đang đối chiếu kho vật phẩm phù hợp...",
  depot: "Đang đối chiếu kho vật phẩm phù hợp...",
  depots: "Đang đối chiếu kho vật phẩm phù hợp...",
  single_depot_required: "Đang xác định kho xuất phát phù hợp...",
  eligible_depot_count: "Đang kiểm tra số kho có thể đáp ứng...",
  nearby_team_count: "Đang rà soát đội cứu hộ lân cận...",
  team: "Đang gán đội cứu hộ phù hợp...",
  teams: "Đang gán đội cứu hộ phù hợp...",
  assemble: "Đang ráp nháp kế hoạch nhiệm vụ...",
  assembly: "Đang ráp nháp kế hoạch nhiệm vụ...",
  draft: "Đang ráp nháp kế hoạch nhiệm vụ...",
  validate: "Đang kiểm tra và chuẩn hóa kế hoạch cuối...",
  validation: "Đang kiểm tra và chuẩn hóa kế hoạch cuối...",
  finalize: "Đang hoàn thiện kế hoạch cuối...",
  done: "AI đã hoàn tất phân tích.",
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function findStatusTokenLabel(lowerMessage: string): string | null {
  const normalizedToken = lowerMessage.replace(/[\s-]+/g, "_");
  if (STATUS_TOKEN_LABELS[normalizedToken]) {
    return STATUS_TOKEN_LABELS[normalizedToken];
  }

  for (const [token, label] of Object.entries(STATUS_TOKEN_LABELS)) {
    const tokenPattern = token
      .split("_")
      .map((part) => escapeRegex(part))
      .join("[\\s_-]*");
    const regex = new RegExp(`\\b${tokenPattern}\\b`, "i");

    if (regex.test(lowerMessage)) {
      return label;
    }
  }

  return null;
}

function toReadableToolLabel(toolName?: string): string {
  if (!toolName) return "dữ liệu hiện trường";
  return TOOL_LABELS[toolName] ?? "dữ liệu hiện trường";
}

function extractToolName(message: string): string | null {
  const callMatch = message.match(
    /(?:tool|công cụ)\s*:?\s*([A-Za-z_][A-Za-z0-9_]*)/i,
  );
  if (callMatch?.[1]) return callMatch[1];

  const resultMatch = message.match(/([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)/);
  if (resultMatch?.[1]) return resultMatch[1];

  return null;
}

function normalizeStatusMessage(raw: string): string {
  const message = raw.trim();
  if (!message) return "Đang chuẩn bị phân tích...";

  const lower = message.toLowerCase();
  const matchedStatusLabel = findStatusTokenLabel(lower);
  const toolName = extractToolName(message) ?? undefined;
  const toolLabel = toReadableToolLabel(toolName);

  if (matchedStatusLabel) {
    return matchedStatusLabel;
  }

  if (lower.includes("agent") && lower.includes("công cụ")) {
    return `AI đang thu thập ${toolLabel}...`;
  }

  if (lower.includes("công cụ") && lower.includes("đã trả về kết quả")) {
    return `Đã tải xong ${toolLabel}.`;
  }

  return message
    .replace(/\bai agent\b/gi, "AI")
    .replace(/\bSOS requests?\b/gi, "yêu cầu SOS")
    .replace(/\brequests?\b/gi, "yêu cầu")
    .replace(/([A-Za-z_][A-Za-z0-9_]*)\([^)]*\)/g, (_, fnName: string) =>
      toReadableToolLabel(fnName),
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hook to stream AI rescue suggestion via SSE with real-time updates.
 * Exposes a full activity log so the UI can render an animated timeline.
 */
export function useAiMissionStream() {
  const [status, setStatus] = useState("");
  const [statusLog, setStatusLog] = useState<StreamLogEntry[]>([]);
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
    (message: string, type: StreamLogEntry["type"]) => {
      logIdRef.current += 1;
      const entry: StreamLogEntry = {
        id: logIdRef.current,
        timestamp: Date.now(),
        message,
        type,
      };
      setStatusLog((prev) => [...prev, entry]);
    },
    [],
  );

  const derivePhase = useCallback((msg: string) => {
    const normalizedMessage = msg.toLowerCase();

    if (msg.includes("Đang tải") || msg.includes("thu thập")) {
      return "loading-data" as const;
    }

    if (msg.includes("Đã tải")) {
      return "loading-data" as const;
    }

    if (
      msg.includes("Đang tổng hợp") ||
      msg.includes("Đang rà soát") ||
      msg.includes("Đang xác định")
    ) {
      return "loading-data" as const;
    }

    if (
      msg.includes("Đang gọi AI") ||
      msg.includes("Đang đối chiếu") ||
      msg.includes("Đang gán đội") ||
      normalizedMessage.includes("depot") ||
      normalizedMessage.includes("team")
    ) {
      return "calling-ai" as const;
    }

    if (
      msg.includes("Đang xử lý") ||
      msg.includes("Đang ráp") ||
      msg.includes("Đang kiểm tra") ||
      msg.includes("Đang hoàn thiện") ||
      msg.includes("chuẩn hóa") ||
      normalizedMessage.includes("assemble") ||
      normalizedMessage.includes("validate")
    ) {
      return "processing" as const;
    }

    if (msg.includes("Đã lưu")) {
      return "done" as const;
    }

    if (msg.includes("hoàn tất")) {
      return "done" as const;
    }

    return "connecting" as const;
  }, []);

  const startStream = useCallback(
    (clusterId: number) => {
      // Reset state
      setStatus("");
      setStatusLog([]);
      setThinkingText("");
      setResult(null);
      setError(null);
      setLoading(true);
      setPhase("connecting");
      logIdRef.current = 0;

      // Abort any existing stream
      abortRef.current?.abort();

      abortRef.current = streamClusterRescueSuggestion(clusterId, {
        onStatus: (msg) => {
          const readableMessage = normalizeStatusMessage(msg);
          setStatus(readableMessage);
          addLog(readableMessage, "status");
          setPhase(derivePhase(readableMessage));
        },
        onChunk: (text) => setThinkingText((prev) => prev + text),
        onResult: (res) => {
          setResult(res);
          addLog("AI đã hoàn tất phân tích!", "result");
          setPhase("done");
        },
        onError: (err) => {
          setError(err);
          addLog(err, "error");
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

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    setPhase("idle");
  }, []);

  const reset = useCallback(() => {
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
    startStream,
    stopStream,
    reset,
  };
}
