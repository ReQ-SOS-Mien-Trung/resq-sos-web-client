import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import {
  getSosStatuses,
  getVictimsByPeriod,
  getRescuersDailyStatistics,
  getMissionSuccessRateSummary,
  getSosRequestsSummary,
} from "./api";
import {
  SosStatusOption,
  VictimsByPeriodParams,
  VictimsByPeriodResponse,
  RescuersDailyStatisticsResponse,
  MissionSuccessRateSummaryResponse,
  SosRequestsSummaryResponse,
} from "./type";

export const ADMIN_DASHBOARD_KEYS = {
  all: ["admin-dashboard"] as const,
  sosStatuses: () => [...ADMIN_DASHBOARD_KEYS.all, "sos-statuses"] as const,
  victimsByPeriod: (params?: VictimsByPeriodParams) =>
    [...ADMIN_DASHBOARD_KEYS.all, "victims-by-period", params] as const,
  rescuersDailyStatistics: () =>
    [...ADMIN_DASHBOARD_KEYS.all, "rescuers-daily-statistics"] as const,
  missionSuccessRateSummary: () =>
    [...ADMIN_DASHBOARD_KEYS.all, "mission-success-rate-summary"] as const,
  sosRequestsSummary: () =>
    [...ADMIN_DASHBOARD_KEYS.all, "sos-requests-summary"] as const,
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

/**
 * Fetch rescuers daily statistics.
 */
export function useRescuersDailyStatistics(
  options?: Omit<
    UseQueryOptions<RescuersDailyStatisticsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<RescuersDailyStatisticsResponse>({
    queryKey: ADMIN_DASHBOARD_KEYS.rescuersDailyStatistics(),
    queryFn: getRescuersDailyStatistics,
    ...options,
  });
}

/**
 * Fetch mission success rate summary.
 */
export function useMissionSuccessRateSummary(
  options?: Omit<
    UseQueryOptions<MissionSuccessRateSummaryResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<MissionSuccessRateSummaryResponse>({
    queryKey: ADMIN_DASHBOARD_KEYS.missionSuccessRateSummary(),
    queryFn: getMissionSuccessRateSummary,
    ...options,
  });
}

/**
 * Fetch SOS requests summary.
 */
export function useSosRequestsSummary(
  options?: Omit<
    UseQueryOptions<SosRequestsSummaryResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<SosRequestsSummaryResponse>({
    queryKey: ADMIN_DASHBOARD_KEYS.sosRequestsSummary(),
    queryFn: getSosRequestsSummary,
    ...options,
  });
}
