import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRescueTeams,
  getRescueTeamsByCluster,
  getRescueTeamById,
  getRescueTeamTypes,
  getRescueTeamStatuses,
  createRescueTeam,
  scheduleRescueTeamAssembly,
  removeRescueTeamMember,
  addRescueTeamMember,
} from "./api";
import type {
  GetRescueTeamsParams,
  GetRescueTeamsResponse,
  GetRescueTeamsByClusterResponse,
  GetRescueTeamByIdResponse,
  RescueTeamTypeOption,
  RescueTeamStatusOption,
  CreateRescueTeamRequest,
  CreateRescueTeamResponse,
  ScheduleRescueTeamAssemblyRequest,
  ScheduleRescueTeamAssemblyErrorResponse,
  RemoveRescueTeamMemberRequest,
  AddRescueTeamMemberRequest,
} from "./type";
import { AxiosError } from "axios";

export const RESCUE_TEAMS_QUERY_KEY = ["rescue-teams"] as const;
export const RESCUE_TEAMS_BY_CLUSTER_QUERY_KEY = [
  ...RESCUE_TEAMS_QUERY_KEY,
  "by-cluster",
] as const;
export const RESCUE_TEAM_TYPES_QUERY_KEY = ["rescue-team-types"] as const;
export const RESCUE_TEAM_STATUSES_QUERY_KEY = ["rescue-team-statuses"] as const;

export interface UseRescueTeamsOptions {
  params?: GetRescueTeamsParams;
  enabled?: boolean;
}

export interface UseRescueTeamByIdOptions {
  enabled?: boolean;
}

export interface UseRescueTeamsByClusterOptions {
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

export function useRescueTeamsByCluster(
  clusterId: number,
  options?: UseRescueTeamsByClusterOptions,
) {
  return useQuery<GetRescueTeamsByClusterResponse>({
    queryKey: [...RESCUE_TEAMS_BY_CLUSTER_QUERY_KEY, clusterId],
    queryFn: () => getRescueTeamsByCluster(clusterId),
    enabled: (options?.enabled ?? true) && Number.isFinite(clusterId),
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

export function useScheduleRescueTeamAssembly() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<ScheduleRescueTeamAssemblyErrorResponse>,
    ScheduleRescueTeamAssemblyRequest
  >({
    mutationFn: scheduleRescueTeamAssembly,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESCUE_TEAMS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...RESCUE_TEAMS_QUERY_KEY, variables.id],
      });
    },
  });
}

export function useRemoveRescueTeamMember() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<{ message: string }>,
    RemoveRescueTeamMemberRequest
  >({
    mutationFn: removeRescueTeamMember,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESCUE_TEAMS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...RESCUE_TEAMS_QUERY_KEY, variables.id],
      });
    },
  });
}

export function useAddRescueTeamMember() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<{ message: string }>,
    AddRescueTeamMemberRequest
  >({
    mutationFn: addRescueTeamMember,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESCUE_TEAMS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...RESCUE_TEAMS_QUERY_KEY, variables.id],
      });
    },
  });
}
