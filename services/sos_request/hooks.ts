import { useQuery, useMutation } from "@tanstack/react-query";
import { getSOSRequests, getSOSRequestById, getRescueSuggestion } from "./api";
import {
  GetSOSRequestsResponse,
  GetSOSRequestByIdResponse,
  RescueSuggestionRequest,
  RescueSuggestionResponse,
} from "./type";

export const SOS_REQUESTS_QUERY_KEY = ["sos-requests"] as const;

export interface UseSOSRequestByIdOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch all SOS requests
 */
export function useSOSRequests() {
  return useQuery<GetSOSRequestsResponse>({
    queryKey: SOS_REQUESTS_QUERY_KEY,
    queryFn: getSOSRequests,
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
 * Hook to get AI rescue suggestion for SOS requests (mutation)
 */
export function useRescueSuggestion() {
  return useMutation<RescueSuggestionResponse, Error, RescueSuggestionRequest>({
    mutationFn: getRescueSuggestion,
  });
}
