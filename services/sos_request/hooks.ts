import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSOSRequests,
  getSOSRequestById,
  getSOSRequestAnalysis,
  createSOSRequest,
} from "./api";
import {
  GetSOSRequestsResponse,
  GetSOSRequestsParams,
  GetSOSRequestByIdResponse,
  RescueSuggestionRequest,
  RescueSuggestionResponse,
  GetSOSRequestAnalysisResponse,
  CreateSOSRequestPayload,
  SOSRequestEntity,
} from "./type";

export const SOS_REQUESTS_QUERY_KEY = ["sos-requests"] as const;

export interface UseSOSRequestsOptions {
  params?: GetSOSRequestsParams;
}

export interface UseSOSRequestByIdOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch all SOS requests (paginated)
 */
export function useSOSRequests(options?: UseSOSRequestsOptions) {
  const params = options?.params;
  return useQuery<GetSOSRequestsResponse>({
    queryKey: [
      ...SOS_REQUESTS_QUERY_KEY,
      params?.pageNumber ?? 1,
      params?.pageSize ?? 10,
    ],
    queryFn: () => getSOSRequests(params),
  });
}

/**
 * Hook to fetch a SOS request by ID
 */
export function useSOSRequestById(
  id: number,
  options?: UseSOSRequestByIdOptions,
) {
  return useQuery<GetSOSRequestByIdResponse>({
    queryKey: [...SOS_REQUESTS_QUERY_KEY, id],
    queryFn: () => getSOSRequestById(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch analysis for a SOS request by ID
 */
export function useSOSRequestAnalysis(
  id: number,
  options?: UseSOSRequestByIdOptions,
) {
  return useQuery<GetSOSRequestAnalysisResponse>({
    queryKey: [...SOS_REQUESTS_QUERY_KEY, id, "analysis"],
    queryFn: () => getSOSRequestAnalysis(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to manually create an SOS request
 */
export function useCreateSOSRequest() {
  const queryClient = useQueryClient();

  return useMutation<SOSRequestEntity, Error, CreateSOSRequestPayload>({
    mutationFn: (payload) => createSOSRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOS_REQUESTS_QUERY_KEY });
    },
  });
}
