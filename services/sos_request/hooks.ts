import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSOSRequests,
  getSOSRequestsInBounds,
  getSOSPriorityLevels,
  getSOSRequestById,
  getSOSRequestAnalysis,
  createSOSRequest,
} from "./api";
import {
  GetSOSRequestsResponse,
  GetSOSRequestsParams,
  GetSOSRequestsInBoundsParams,
  SOSPriorityLevelOption,
  GetSOSRequestByIdResponse,
  GetSOSRequestAnalysisResponse,
  CreateSOSRequestPayload,
  SOSRequestEntity,
} from "./type";
import { getMapBoundsCacheKey } from "@/lib/coordinator-map-utils";

export const SOS_REQUESTS_QUERY_KEY = ["sos-requests"] as const;
export const SOS_PRIORITY_LEVELS_QUERY_KEY = [
  ...SOS_REQUESTS_QUERY_KEY,
  "priority-levels",
] as const;

export interface UseSOSRequestsOptions {
  params?: GetSOSRequestsParams;
}

export interface UseSOSRequestsInBoundsOptions {
  params?: GetSOSRequestsInBoundsParams;
  enabled?: boolean;
}

export interface UseSOSRequestByIdOptions {
  enabled?: boolean;
}

export interface UseSOSRequestsByIdsOptions {
  enabled?: boolean;
}

export interface UseSOSPriorityLevelsOptions {
  enabled?: boolean;
}

type SOSRequestsByIdsQueryData = {
  items: SOSRequestEntity[];
  failedIds: number[];
};

/**
 * Hook to fetch all SOS requests (paginated)
 */
export function useSOSRequests(options?: UseSOSRequestsOptions) {
  const params = options?.params;
  const normalizedStatuses = useMemo(
    () =>
      Array.from(new Set((params?.Statuses ?? []).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [params?.Statuses],
  );
  const normalizedPriorityLevels = useMemo(
    () =>
      Array.from(new Set((params?.Priorities ?? []).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [params?.Priorities],
  );
  const normalizedSosTypes = useMemo(
    () =>
      Array.from(new Set((params?.SosTypes ?? []).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [params?.SosTypes],
  );

  return useQuery<GetSOSRequestsResponse>({
    queryKey: [
      ...SOS_REQUESTS_QUERY_KEY,
      params?.pageNumber ?? 1,
      params?.pageSize ?? 10,
      normalizedStatuses.join(","),
      normalizedPriorityLevels.join(","),
      normalizedSosTypes.join(","),
    ],
    queryFn: () => getSOSRequests(params),
  });
}

export function useSOSRequestsInBounds(
  options?: UseSOSRequestsInBoundsOptions,
) {
  const params = options?.params;
  const boundsKey = getMapBoundsCacheKey(
    params
      ? {
          south: params.MinLat,
          north: params.MaxLat,
          west: params.MinLng,
          east: params.MaxLng,
        }
      : null,
  );
  const normalizedStatuses = useMemo(
    () =>
      Array.from(new Set((params?.Statuses ?? []).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [params?.Statuses],
  );
  const normalizedPriorityLevels = useMemo(
    () =>
      Array.from(new Set((params?.Priorities ?? []).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [params?.Priorities],
  );
  const normalizedSosTypes = useMemo(
    () =>
      Array.from(new Set((params?.SosTypes ?? []).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [params?.SosTypes],
  );

  return useQuery<SOSRequestEntity[]>({
    queryKey: [
      ...SOS_REQUESTS_QUERY_KEY,
      "bounds",
      boundsKey,
      normalizedStatuses.join(","),
      normalizedPriorityLevels.join(","),
      normalizedSosTypes.join(","),
    ],
    queryFn: () => getSOSRequestsInBounds(params!),
    enabled:
      (options?.enabled ?? true) &&
      Number.isFinite(params?.MinLat) &&
      Number.isFinite(params?.MaxLat) &&
      Number.isFinite(params?.MinLng) &&
      Number.isFinite(params?.MaxLng),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useSOSPriorityLevels(options?: UseSOSPriorityLevelsOptions) {
  return useQuery<SOSPriorityLevelOption[]>({
    queryKey: SOS_PRIORITY_LEVELS_QUERY_KEY,
    queryFn: getSOSPriorityLevels,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
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
 * Hook to fetch SOS requests by a list of IDs.
 * Requests run in parallel and partial failures are surfaced via failedIds.
 */
export function useSOSRequestsByIds(
  ids: number[],
  options?: UseSOSRequestsByIdsOptions,
) {
  const normalizedIds = useMemo(
    () =>
      Array.from(
        new Set(
          ids.filter((id): id is number => Number.isFinite(id) && id > 0),
        ),
      ).sort((left, right) => left - right),
    [ids],
  );

  const query = useQuery<SOSRequestsByIdsQueryData>({
    queryKey: [...SOS_REQUESTS_QUERY_KEY, "by-ids", normalizedIds],
    queryFn: async () => {
      const results = await Promise.allSettled(
        normalizedIds.map((id) => getSOSRequestById(id)),
      );

      const items: SOSRequestEntity[] = [];
      const failedIds: number[] = [];

      results.forEach((result, index) => {
        const id = normalizedIds[index];

        if (result.status === "fulfilled") {
          items.push(result.value.sosRequest);
        } else {
          failedIds.push(id);
        }
      });

      return { items, failedIds };
    },
    enabled: (options?.enabled ?? true) && normalizedIds.length > 0,
  });

  const byId = useMemo(
    () =>
      new Map(
        (query.data?.items ?? []).map((item) => [item.id, item] as const),
      ),
    [query.data?.items],
  );

  return {
    ...query,
    ids: normalizedIds,
    items: query.data?.items ?? [],
    failedIds: query.data?.failedIds ?? [],
    byId,
  };
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
