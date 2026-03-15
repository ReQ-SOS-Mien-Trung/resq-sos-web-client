import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRescueTeams,
  getRescueTeamById,
  getRescueTeamTypes,
  getRescueTeamStatuses,
  createRescueTeam,
} from "./api";
import type {
  GetRescueTeamsParams,
  GetRescueTeamsResponse,
  GetRescueTeamByIdResponse,
  RescueTeamTypeOption,
  RescueTeamStatusOption,
  CreateRescueTeamRequest,
  CreateRescueTeamResponse,
} from "./type";

export const RESCUE_TEAMS_QUERY_KEY = ["rescue-teams"] as const;
export const RESCUE_TEAM_TYPES_QUERY_KEY = ["rescue-team-types"] as const;
export const RESCUE_TEAM_STATUSES_QUERY_KEY = ["rescue-team-statuses"] as const;

export interface UseRescueTeamsOptions {
  params?: GetRescueTeamsParams;
  enabled?: boolean;
}

export interface UseRescueTeamByIdOptions {
  enabled?: boolean;
}

export function useRescueTeams(options?: UseRescueTeamsOptions) {
  const params = options?.params;

  return useQuery<GetRescueTeamsResponse>({
    queryKey: [
      ...RESCUE_TEAMS_QUERY_KEY,
      params?.pageNumber ?? 1,
      params?.pageSize ?? 10,
    ],
    queryFn: () => getRescueTeams(params),
    enabled: options?.enabled ?? true,
  });
}

export function useRescueTeamById(
  id: number,
  options?: UseRescueTeamByIdOptions,
) {
  return useQuery<GetRescueTeamByIdResponse>({
    queryKey: [...RESCUE_TEAMS_QUERY_KEY, id],
    queryFn: () => getRescueTeamById(id),
    enabled: options?.enabled ?? true,
  });
}

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

export function useCreateRescueTeam() {
  const queryClient = useQueryClient();

  return useMutation<CreateRescueTeamResponse, Error, CreateRescueTeamRequest>({
    mutationFn: createRescueTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESCUE_TEAMS_QUERY_KEY });
    },
  });
}
