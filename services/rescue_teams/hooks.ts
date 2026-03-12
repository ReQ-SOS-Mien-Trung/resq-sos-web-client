import { useQuery } from "@tanstack/react-query";
import { getRescueTeamTypes, getRescueTeamStatuses } from "./api";
import type { RescueTeamTypeOption, RescueTeamStatusOption } from "./type";

export const RESCUE_TEAM_TYPES_QUERY_KEY = ["rescue-team-types"] as const;
export const RESCUE_TEAM_STATUSES_QUERY_KEY = ["rescue-team-statuses"] as const;

export interface UseRescueTeamTypesOptions {
  enabled?: boolean;
}

export function useRescueTeamTypes(options?: UseRescueTeamTypesOptions) {
  return useQuery<RescueTeamTypeOption[]>({
    queryKey: RESCUE_TEAM_TYPES_QUERY_KEY,
    queryFn: getRescueTeamTypes,
    enabled: options?.enabled ?? true,
  });
}

export interface UseRescueTeamStatusesOptions {
  enabled?: boolean;
}

export function useRescueTeamStatuses(options?: UseRescueTeamStatusesOptions) {
  return useQuery<RescueTeamStatusOption[]>({
    queryKey: RESCUE_TEAM_STATUSES_QUERY_KEY,
    queryFn: getRescueTeamStatuses,
    enabled: options?.enabled ?? true,
  });
}
