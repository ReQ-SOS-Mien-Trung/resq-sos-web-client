import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
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
    queryKey: [...FREE_RESCUERS_QUERY_KEY, params],
    queryFn: () => getFreeRescuers(params),
    enabled: options?.enabled ?? true,
  });
}

export function useInfiniteFreeRescuers(options?: {
  params?: Omit<GetFreeRescuersParams, "pageNumber" | "pageSize">;
  pageSize?: number;
  enabled?: boolean;
}) {
  const pageSize = options?.pageSize ?? 10;
  const params = options?.params;

  return useInfiniteQuery<GetFreeRescuersResponse>({
    queryKey: [...FREE_RESCUERS_QUERY_KEY, "infinite", pageSize, params],
    queryFn: ({ pageParam = 1 }) =>
      getFreeRescuers({
        ...params,
        pageNumber: pageParam as number,
        pageSize,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.pageNumber + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: options?.enabled ?? true,
  });
}
