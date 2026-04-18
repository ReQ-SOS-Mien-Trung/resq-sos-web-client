import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import {
  getRescueTeamsOverview,
  getRescueTeamDetail,
  getRescuerScores,
} from "./team-overview.api";
import {
  GetRescueTeamsOverviewParams,
  GetRescueTeamsOverviewResponse,
  RescueTeamDetailResponse,
  RescuerScoresResponse,
} from "./team-overview.type";

export const TEAM_OVERVIEW_KEYS = {
  all: ["team-overview"] as const,
  list: (params?: GetRescueTeamsOverviewParams) =>
    [...TEAM_OVERVIEW_KEYS.all, "list", params] as const,
  detail: (id: number) => [...TEAM_OVERVIEW_KEYS.all, "detail", id] as const,
  rescuerScores: (rescuerId: string) =>
    [...TEAM_OVERVIEW_KEYS.all, "rescuer-scores", rescuerId] as const,
};

export function useRescueTeamsOverview(
  params?: GetRescueTeamsOverviewParams,
  options?: Omit<
    UseQueryOptions<GetRescueTeamsOverviewResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<GetRescueTeamsOverviewResponse>({
    queryKey: TEAM_OVERVIEW_KEYS.list(params),
    queryFn: () => getRescueTeamsOverview(params),
    ...options,
  });
}

export function useRescueTeamDetail(
  id: number,
  options?: Omit<
    UseQueryOptions<RescueTeamDetailResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<RescueTeamDetailResponse>({
    queryKey: TEAM_OVERVIEW_KEYS.detail(id),
    queryFn: () => getRescueTeamDetail(id),
    enabled: id > 0,
    ...options,
  });
}

export function useRescuerScores(
  rescuerId: string,
  options?: Omit<
    UseQueryOptions<RescuerScoresResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<RescuerScoresResponse>({
    queryKey: TEAM_OVERVIEW_KEYS.rescuerScores(rescuerId),
    queryFn: () => getRescuerScores(rescuerId),
    enabled: !!rescuerId,
    ...options,
  });
}
