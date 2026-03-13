import { useQuery } from "@tanstack/react-query";
import { getFreeRescuers } from "./api";
import type { GetFreeRescuersParams, GetFreeRescuersResponse } from "./type";

export const FREE_RESCUERS_QUERY_KEY = ["free-rescuers"] as const;

export interface UseFreeRescuersOptions {
  params?: GetFreeRescuersParams;
  enabled?: boolean;
}

export function useFreeRescuers(options?: UseFreeRescuersOptions) {
  const params = options?.params;

  return useQuery<GetFreeRescuersResponse>({
    queryKey: [
      ...FREE_RESCUERS_QUERY_KEY,
      params?.pageNumber ?? 1,
      params?.pageSize ?? 10,
    ],
    queryFn: () => getFreeRescuers(params),
    enabled: options?.enabled ?? true,
  });
}
