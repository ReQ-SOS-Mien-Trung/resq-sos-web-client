import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { getRescuerAssemblyPointMetadata, getRescuers } from "./api";
import type {
  GetRescuersParams,
  GetRescuersResponse,
  RescuerAssemblyPointMetadataOption,
} from "./type";

export const RESCUERS_QUERY_KEY = ["rescuers"] as const;
export const RESCUER_ASSEMBLY_POINT_METADATA_QUERY_KEY = [
  "rescuers",
  "assembly-point-metadata",
] as const;

export interface UseRescuersOptions {
  params?: GetRescuersParams;
  enabled?: boolean;
}

export interface UseRescuerAssemblyPointMetadataOptions {
  enabled?: boolean;
}

export function useRescuers(options?: UseRescuersOptions) {
  const params = options?.params;

  return useQuery<GetRescuersResponse>({
    queryKey: [...RESCUERS_QUERY_KEY, params],
    queryFn: () => getRescuers(params),
    enabled: options?.enabled ?? true,
  });
}

export function useRescuerAssemblyPointMetadata(
  options?: UseRescuerAssemblyPointMetadataOptions,
) {
  return useQuery<RescuerAssemblyPointMetadataOption[]>({
    queryKey: RESCUER_ASSEMBLY_POINT_METADATA_QUERY_KEY,
    queryFn: getRescuerAssemblyPointMetadata,
    enabled: options?.enabled ?? true,
  });
}

export function useInfiniteRescuers(options?: {
  params?: Omit<GetRescuersParams, "pageNumber" | "pageSize">;
  pageSize?: number;
  enabled?: boolean;
}) {
  const pageSize = options?.pageSize ?? 10;
  const params = options?.params;

  return useInfiniteQuery<GetRescuersResponse>({
    queryKey: [...RESCUERS_QUERY_KEY, "infinite", pageSize, params],
    queryFn: ({ pageParam = 1 }) =>
      getRescuers({
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
