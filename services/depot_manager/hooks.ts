import { useQuery } from "@tanstack/react-query";
import { getDepotManagers } from "./api";
import { GetDepotManagersResponse, GetDepotManagersParams } from "./type";

export const DEPOT_MANAGERS_QUERY_KEY = ["depot-managers"] as const;

export interface UseDepotManagersOptions {
  params: GetDepotManagersParams;
  enabled?: boolean;
}

/**
 * Hook to fetch depot managers by depot ID with pagination
 */
export function useDepotManagers(options: UseDepotManagersOptions) {
  return useQuery<GetDepotManagersResponse>({
    queryKey: [...DEPOT_MANAGERS_QUERY_KEY, options.params],
    queryFn: () => getDepotManagers(options.params),
    enabled: options.enabled ?? true,
  });
}
