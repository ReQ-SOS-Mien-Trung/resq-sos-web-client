import api from "@/config/axios";
import { useAuthStore } from "@/stores/auth.store";
import {
  GetSOSClustersResponse,
  CreateSOSClusterRequest,
  CreateSOSClusterResponse,
  GetMissionSuggestionsResponse,
  ClusterRescueSuggestionResponse,
  SseMissionEvent,
} from "./type";

/**
 * Get all SOS clusters
 * GET /emergency/sos-clusters
 */
export async function getSOSClusters(): Promise<GetSOSClustersResponse> {
  const { data } = await api.get("/emergency/sos-clusters");
  return data;
}

/**
 * Create a new SOS cluster from SOS request IDs
 * POST /emergency/sos-clusters
 */
export async function createSOSCluster(
  request: CreateSOSClusterRequest,
): Promise<CreateSOSClusterResponse> {
  const { data } = await api.post("/emergency/sos-clusters", request);
  return data;
}

/**
 * Get mission suggestions for a SOS cluster
 * GET /emergency/sos-clusters/{clusterId}/mission-suggestions
 */
export async function getMissionSuggestions(
  clusterId: number,
): Promise<GetMissionSuggestionsResponse> {
  const { data } = await api.get(
    `/emergency/sos-clusters/${clusterId}/mission-suggestions`,
  );
  return data;
}

/**
 * Trigger AI rescue suggestion for a SOS cluster
 * POST /emergency/sos-clusters/{clusterId}/rescue-suggestion
 */
export async function getClusterRescueSuggestion(
  clusterId: number,
): Promise<ClusterRescueSuggestionResponse> {
  const { data } = await api.post(
    `/emergency/sos-clusters/${clusterId}/rescue-suggestion`,
    {},
    { timeout: 60000 }, // AI processing can take 15-30s
  );
  return data;
}

/**
 * Stream AI rescue suggestion via SSE
 * GET /emergency/sos-clusters/{clusterId}/rescue-suggestion/stream
 */
export function streamClusterRescueSuggestion(
  clusterId: number,
  callbacks: {
    onStatus: (message: string) => void;
    onChunk: (text: string) => void;
    onResult: (result: ClusterRescueSuggestionResponse) => void;
    onError: (error: string) => void;
    onDone: () => void;
  },
): AbortController {
  const abortController = new AbortController();
  const token = useAuthStore.getState().accessToken;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");

  (async () => {
    try {
      const response = await fetch(
        `${baseUrl}/emergency/sos-clusters/${clusterId}/rescue-suggestion/stream`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        callbacks.onError(`HTTP ${response.status}: ${response.statusText}`);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let nlIdx = buffer.indexOf("\n");
        while (nlIdx !== -1) {
          const line = buffer.slice(0, nlIdx).trim();
          buffer = buffer.slice(nlIdx + 1);
          
          if (!line.startsWith("data: ")) {
            nlIdx = buffer.indexOf("\n");
            continue;
          }
          
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) {
            nlIdx = buffer.indexOf("\n");
            continue;
          }

          let event: SseMissionEvent;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            nlIdx = buffer.indexOf("\n");
            continue;
          }

          switch (event.eventType) {
            case "status":
              if (event.data === "done") {
                callbacks.onDone();
                return;
              }
              callbacks.onStatus(event.data || "");
              break;
            case "chunk":
              callbacks.onChunk(event.data || "");
              break;
            case "result":
              if (event.result) {
                callbacks.onResult(event.result);
              }
              break;
            case "error":
              callbacks.onError(event.data || "Đã xảy ra lỗi không xác định");
              return;
          }
          
          nlIdx = buffer.indexOf("\n");
        }
      }

      // Process any remaining buffer when done
      if (buffer.trim().startsWith("data: ")) {
        try {
          const jsonStr = buffer.trim().slice(6).trim();
          if (jsonStr) {
            const event: SseMissionEvent = JSON.parse(jsonStr);
            if (event.eventType === "result" && event.result) {
              callbacks.onResult(event.result);
            }
          }
        } catch {}
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      callbacks.onError(
        err instanceof Error ? err.message : "Lỗi kết nối không xác định",
      );
    }
  })();

  return abortController;
}
