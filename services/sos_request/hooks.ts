import { useQuery } from "@tanstack/react-query";
import { getSOSRequests, getSOSRequestById } from "./api";
import { GetSOSRequestsResponse, GetSOSRequestByIdResponse } from "./type";

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
