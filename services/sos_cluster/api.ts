import api from "@/config/axios";
import { useAuthStore } from "@/stores/auth.store";
import {
  GetSOSClustersResponse,
  GetSOSClustersParams,
  SOSClusterEntity,
  CreateSOSClusterRequest,
  CreateSOSClusterResponse,
  GetMissionSuggestionsResponse,
  ClusterRescueSuggestionResponse,
  AlternativeDepotsResponse,
  SseMissionEvent,
} from "./type";

type RawSOSClustersResponse = {
  clusters?: SOSClusterEntity[];
  items?: SOSClusterEntity[];
  pageNumber?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
};

const DEFAULT_PAGINATED_PAGE_SIZE = 10;
const AGGREGATED_PAGE_SIZE = 100;
const MAX_AGGREGATED_PAGES = 50;

const GENERIC_AI_ERROR_MESSAGES = new Set([
  "lỗi",
  "loi",
  "error",
  "failed",
  "đã xảy ra lỗi không xác định",
  "da xay ra loi khong xac dinh",
  "unknown error",
  "internal server error",
]);

const CONNECTIVITY_ERROR_HINTS = [
  "failed to fetch",
  "network error",
  "networkerror",
  "timeout",
  "timed out",
  "connection",
  "negotiation",
] as const;

const TEMPORARY_PROVIDER_ERROR_HINTS = [
  "serviceunavailable",
  "service unavailable",
  "unavailable",
  "model is overloaded",
  "temporarily overloaded",
  "temporarily unavailable",
  "backend is temporarily overloaded",
] as const;

type BackendErrorEnvelope = {
  message?: unknown;
  title?: unknown;
  detail?: unknown;
  error?: unknown;
  errorMessage?: unknown;
  errors?: Record<string, unknown> | null;
};

function getFirstErrorFromMap(
  errors: Record<string, unknown> | null | undefined,
): string | null {
  if (!errors || typeof errors !== "object") return null;

  for (const value of Object.values(errors)) {
    if (Array.isArray(value)) {
      const first = value.find(
        (item) => typeof item === "string" && item.trim().length > 0,
      );
      if (typeof first === "string") return first.trim();
      continue;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function tryExtractMessage(raw: unknown): string | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return tryExtractMessage(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const extracted = tryExtractMessage(item);
      if (extracted) return extracted;
    }
    return null;
  }

  if (raw && typeof raw === "object") {
    const payload = raw as BackendErrorEnvelope;
    const firstValidationError = getFirstErrorFromMap(payload.errors ?? null);
    if (firstValidationError) return firstValidationError;

    const fieldCandidates = [
      payload.message,
      payload.title,
      payload.detail,
      payload.error,
      payload.errorMessage,
    ];

    for (const candidate of fieldCandidates) {
      const extracted = tryExtractMessage(candidate);
      if (extracted) return extracted;
    }
  }

  return null;
}

function isConnectivityMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;
  return CONNECTIVITY_ERROR_HINTS.some((hint) => normalized.includes(hint));
}

function isTemporaryProviderFailure(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;
  return TEMPORARY_PROVIDER_ERROR_HINTS.some((hint) =>
    normalized.includes(hint),
  );
}

function isGenericMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return true;
  return GENERIC_AI_ERROR_MESSAGES.has(normalized);
}

function toPositiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : null;
}

function extractClustersFromRawResponse(
  payload: RawSOSClustersResponse,
): SOSClusterEntity[] {
  if (Array.isArray(payload.clusters)) {
    return payload.clusters;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

function deduplicateClusters(clusters: SOSClusterEntity[]): SOSClusterEntity[] {
  return Array.from(
    new Map(clusters.map((cluster) => [cluster.id, cluster])).values(),
  );
}

function normalizeSOSClustersPage(
  payload: RawSOSClustersResponse,
  fallbackPageNumber: number,
  fallbackPageSize: number,
): GetSOSClustersResponse {
  const clusters = deduplicateClusters(extractClustersFromRawResponse(payload));
  const pageNumber =
    toPositiveInteger(payload.pageNumber) ?? fallbackPageNumber;
  const pageSize = toPositiveInteger(payload.pageSize) ?? fallbackPageSize;
  const totalPages = toPositiveInteger(payload.totalPages);
  const totalCount = toPositiveInteger(payload.totalCount);
  const hasPreviousPage =
    payload.hasPreviousPage === true || (totalPages != null && pageNumber > 1);
  const hasNextPage =
    payload.hasNextPage === true ||
    (totalPages != null && pageNumber < totalPages);

  return {
    clusters,
    pageNumber,
    pageSize,
    totalCount: totalCount ?? clusters.length,
    totalPages,
    hasPreviousPage,
    hasNextPage,
  };
}

export function formatAiAnalysisErrorMessage(
  rawError: unknown,
  statusCode?: number,
): string {
  const extractedMessage = tryExtractMessage(rawError);

  if (statusCode === 401 || statusCode === 403) {
    return "Bạn không có quyền chạy AI phân tích. Vui lòng đăng nhập lại hoặc kiểm tra phân quyền.";
  }

  if (statusCode === 404) {
    return "Không tìm thấy cụm SOS để AI phân tích. Vui lòng tải lại dữ liệu cụm.";
  }

  if (statusCode === 429) {
    return "AI đang quá tải yêu cầu (HTTP 429). Vui lòng thử lại sau ít phút.";
  }

  if (extractedMessage && isTemporaryProviderFailure(extractedMessage)) {
    return "Dịch vụ AI đang tạm thời không sẵn sàng (ServiceUnavailable/503). Đây thường là lỗi capacity hoặc model quá tải ở phía nhà cung cấp, không phải do API key. Hãy thử lại sau ít phút hoặc chuyển sang model fallback ổn định hơn.";
  }

  if (typeof statusCode === "number" && statusCode >= 500) {
    if (extractedMessage && !isGenericMessage(extractedMessage)) {
      return extractedMessage;
    }

    return `AI phân tích thất bại do lỗi backend (HTTP ${statusCode}). Vui lòng thử lại sau ít phút.`;
  }

  if (extractedMessage) {
    if (isConnectivityMessage(extractedMessage)) {
      return "Không kết nối được backend AI. Vui lòng kiểm tra server hoặc kết nối mạng rồi thử lại.";
    }

    if (!isGenericMessage(extractedMessage)) {
      return extractedMessage;
    }
  }

  return "AI không thể phân tích cụm này. Backend chưa trả chi tiết lỗi, vui lòng thử lại sau.";
}

/**
 * Get all SOS clusters
 * GET /emergency/sos-clusters
 */
export async function getSOSClusters(
  params?: GetSOSClustersParams,
): Promise<GetSOSClustersResponse> {
  const requestedPageNumber = toPositiveInteger(params?.pageNumber);
  const requestedPageSize = toPositiveInteger(params?.pageSize);
  const requestedSOSRequestId = toPositiveInteger(params?.sosRequestId);
  const shouldUseSinglePageRequest =
    requestedPageNumber != null ||
    requestedPageSize != null ||
    requestedSOSRequestId != null;

  if (shouldUseSinglePageRequest) {
    const pageNumber = requestedPageNumber ?? 1;
    const pageSize = requestedPageSize ?? DEFAULT_PAGINATED_PAGE_SIZE;
    const { data } = await api.get("/emergency/sos-clusters", {
      params: {
        pageNumber,
        pageSize,
        sosRequestId: requestedSOSRequestId,
      },
    });

    return normalizeSOSClustersPage(
      data as RawSOSClustersResponse,
      pageNumber,
      pageSize,
    );
  }

  const collectedClusters: SOSClusterEntity[] = [];

  let nextPageNumber = 1;
  let lastKnownTotalPages: number | undefined;
  let lastKnownTotalCount: number | undefined;
  let lastKnownPageNumber = 1;
  let lastKnownHasPreviousPage = false;
  let lastKnownHasNextPage = false;

  for (let loop = 0; loop < MAX_AGGREGATED_PAGES; loop += 1) {
    const { data } = await api.get("/emergency/sos-clusters", {
      params: {
        pageNumber: nextPageNumber,
        pageSize: AGGREGATED_PAGE_SIZE,
      },
    });

    const payload = data as RawSOSClustersResponse;
    const pageClusters = extractClustersFromRawResponse(payload);
    collectedClusters.push(...pageClusters);

    const responsePageNumber = toPositiveInteger(payload.pageNumber);
    const responseTotalPages = toPositiveInteger(payload.totalPages);
    const responseTotalCount = toPositiveInteger(payload.totalCount);

    lastKnownPageNumber = responsePageNumber ?? nextPageNumber;
    lastKnownTotalPages = responseTotalPages ?? lastKnownTotalPages;
    lastKnownTotalCount = responseTotalCount ?? lastKnownTotalCount;
    lastKnownHasPreviousPage = Boolean(payload.hasPreviousPage);

    const hasNextByFlag = payload.hasNextPage === true;
    const hasNextByTotalPages =
      lastKnownTotalPages != null && lastKnownPageNumber < lastKnownTotalPages;
    const hasNextPage = hasNextByFlag || hasNextByTotalPages;
    lastKnownHasNextPage = hasNextPage;

    if (!hasNextPage) {
      break;
    }

    nextPageNumber = lastKnownPageNumber + 1;
  }

  const deduplicatedClusters = deduplicateClusters(collectedClusters);

  return {
    clusters: deduplicatedClusters,
    pageNumber: 1,
    pageSize: AGGREGATED_PAGE_SIZE,
    totalCount: lastKnownTotalCount ?? deduplicatedClusters.length,
    totalPages: lastKnownTotalPages,
    hasPreviousPage: lastKnownHasPreviousPage,
    hasNextPage: lastKnownHasNextPage,
  };
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
 * Get top alternative depots for shortage items in the latest AI suggestion.
 * GET /emergency/sos-clusters/{clusterId}/alternative-depots?selectedDepotId=...
 */
export async function getAlternativeDepots(
  clusterId: number,
  selectedDepotId: number,
): Promise<AlternativeDepotsResponse> {
  const { data } = await api.get(
    `/emergency/sos-clusters/${clusterId}/alternative-depots`,
    {
      params: { selectedDepotId },
    },
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
        const errorBody = await response.text().catch(() => "");
        callbacks.onError(
          formatAiAnalysisErrorMessage(
            errorBody || response.statusText,
            response.status,
          ),
        );
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
              callbacks.onError(formatAiAnalysisErrorMessage(event.data));
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
      callbacks.onError(formatAiAnalysisErrorMessage(err));
    }
  })();

  return abortController;
}
