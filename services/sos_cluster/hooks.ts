import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getSOSClusters,
  createSOSCluster,
  getMissionSuggestions,
  getClusterRescueSuggestion,
  streamClusterRescueSuggestion,
} from "./api";
import {
  GetSOSClustersResponse,
  CreateSOSClusterRequest,
  CreateSOSClusterResponse,
  GetMissionSuggestionsResponse,
  ClusterRescueSuggestionResponse,
} from "./type";

export const SOS_CLUSTERS_QUERY_KEY = ["sos-clusters"] as const;
export const MISSION_SUGGESTIONS_QUERY_KEY = ["mission-suggestions"] as const;

export interface UseMissionSuggestionsOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch all SOS clusters
 */
export function useSOSClusters() {
  return useQuery<GetSOSClustersResponse>({
    queryKey: SOS_CLUSTERS_QUERY_KEY,
    queryFn: getSOSClusters,
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
    if (msg.includes("Đang tải")) return "loading-data" as const;
    if (msg.includes("Đã tải")) return "loading-data" as const;
    if (msg.includes("Đang gọi AI")) return "calling-ai" as const;
    if (msg.includes("Đang xử lý")) return "processing" as const;
    if (msg.includes("Đã lưu")) return "done" as const;
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
          setStatus(msg);
          addLog(msg, "status");
          setPhase(derivePhase(msg));
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
