import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getSosStatuses, getVictimsByPeriod } from "./api";
import {
  SosStatusOption,
  VictimsByPeriodParams,
  VictimsByPeriodResponse,
} from "./type";

export const ADMIN_DASHBOARD_KEYS = {
  all: ["admin-dashboard"] as const,
  sosStatuses: () => [...ADMIN_DASHBOARD_KEYS.all, "sos-statuses"] as const,
  victimsByPeriod: (params?: VictimsByPeriodParams) =>
    [...ADMIN_DASHBOARD_KEYS.all, "victims-by-period", params] as const,
};

/**
 * Fetch SOS status options (for dropdown).
 * Loaded once and cached indefinitely.
 */
export function useSosStatuses(
  options?: Omit<
    UseQueryOptions<SosStatusOption[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<SosStatusOption[]>({
    queryKey: ADMIN_DASHBOARD_KEYS.sosStatuses(),
    queryFn: getSosStatuses,
    staleTime: Infinity,
    ...options,
  });
}

/**
 * Fetch victims-by-period data (for bar chart).
 * Re-fetches whenever params change.
 */
export function useVictimsByPeriod(
  params?: VictimsByPeriodParams,
  options?: Omit<
    UseQueryOptions<VictimsByPeriodResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<VictimsByPeriodResponse>({
    queryKey: ADMIN_DASHBOARD_KEYS.victimsByPeriod(params),
    queryFn: () => getVictimsByPeriod(params),
    ...options,
  });
}
