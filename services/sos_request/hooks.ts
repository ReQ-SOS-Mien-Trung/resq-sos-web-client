import { useQuery } from "@tanstack/react-query";
import { getSOSRequests } from "./api";
import { GetSOSRequestsResponse } from "./type";

export const SOS_REQUESTS_QUERY_KEY = ["sos-requests"] as const;

/**
 * Hook to fetch all SOS requests
 */
export function useSOSRequests() {
  return useQuery<GetSOSRequestsResponse>({
    queryKey: SOS_REQUESTS_QUERY_KEY,
    queryFn: getSOSRequests,
  });
}
