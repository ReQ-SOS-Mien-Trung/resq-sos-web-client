import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SOS_CLUSTERS_QUERY_KEY } from "@/services/sos_cluster/hooks";
import {
  createActivity,
  createMission,
  getMissionActivities,
  getMissionById,
  getMissions,
  updateActivityStatus,
  updateActivity,
  updateMission,
  updateMissionStatus,
  getActivityRoute,
  getMissionTeamRoute,
} from "./api";
import {
  CreateActivityResponse,
  CreateMissionActivityRequest,
  CreateMissionRequest,
  CreateMissionResponse,
  GetMissionsResponse,
  MissionActivity,
  MissionEntity,
  UpdateActivityStatusRequest,
  UpdateActivityStatusResponse,
  UpdateActivityRequest,
  UpdateActivityResponse,
  UpdateMissionRequest,
  UpdateMissionResponse,
  UpdateMissionStatusRequest,
  UpdateMissionStatusResponse,
  ActivityRouteResponse,
  GetActivityRouteParams,
  GetMissionTeamRouteParams,
  MissionTeamRouteResponse,
} from "./type";

export const MISSIONS_QUERY_KEY = ["missions"] as const;
export const MISSION_ACTIVITIES_QUERY_KEY = ["mission-activities"] as const;

export interface UseMissionsOptions {
  enabled?: boolean;
}

export function useMissions(clusterId: number, options?: UseMissionsOptions) {
  return useQuery<GetMissionsResponse>({
    queryKey: [...MISSIONS_QUERY_KEY, clusterId],
    queryFn: () => getMissions({ clusterId }),
    enabled: options?.enabled ?? true,
  });
}

export interface UseMissionOptions {
  enabled?: boolean;
}

export function useMission(missionId: number, options?: UseMissionOptions) {
  return useQuery<MissionEntity>({
    queryKey: [...MISSIONS_QUERY_KEY, missionId],
    queryFn: () => getMissionById(missionId),
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateMission() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateMissionResponse,
    Error,
    { missionId: number; request: UpdateMissionRequest }
  >({
    mutationFn: ({ missionId, request }) => updateMission(missionId, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: MISSIONS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...MISSIONS_QUERY_KEY, data.missionId],
      });
    },
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();

  return useMutation<CreateMissionResponse, Error, CreateMissionRequest>({
    mutationFn: (request) => createMission(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MISSIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: SOS_CLUSTERS_QUERY_KEY });
    },
  });
}

export function useUpdateMissionStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateMissionStatusResponse,
    Error,
    { missionId: number; request: UpdateMissionStatusRequest }
  >({
    mutationFn: ({ missionId, request }) =>
      updateMissionStatus(missionId, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: MISSIONS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...MISSIONS_QUERY_KEY, data.missionId],
      });
    },
  });
}

export interface UseMissionActivitiesOptions {
  enabled?: boolean;
}

export function useMissionActivities(
  missionId: number,
  options?: UseMissionActivitiesOptions,
) {
  return useQuery<MissionActivity[]>({
    queryKey: [...MISSION_ACTIVITIES_QUERY_KEY, missionId],
    queryFn: () => getMissionActivities(missionId),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation<
    CreateActivityResponse,
    Error,
    { missionId: number; request: CreateMissionActivityRequest }
  >({
    mutationFn: ({ missionId, request }) => createActivity(missionId, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: MISSIONS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...MISSION_ACTIVITIES_QUERY_KEY, variables.missionId],
      });
    },
  });
}

export function useUpdateActivityStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateActivityStatusResponse,
    Error,
    {
      missionId: number;
      activityId: number;
      request: UpdateActivityStatusRequest;
    }
  >({
    mutationFn: ({ missionId, activityId, request }) =>
      updateActivityStatus(missionId, activityId, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: MISSIONS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...MISSION_ACTIVITIES_QUERY_KEY, variables.missionId],
      });
    },
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateActivityResponse,
    Error,
    {
      missionId: number;
      activityId: number;
      request: UpdateActivityRequest;
    }
  >({
    mutationFn: ({ missionId, activityId, request }) =>
      updateActivity(missionId, activityId, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: MISSIONS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...MISSION_ACTIVITIES_QUERY_KEY, variables.missionId],
      });
    },
  });
}

export const ACTIVITY_ROUTE_QUERY_KEY = ["activity-route"] as const;

export function useActivityRoute(
  params: GetActivityRouteParams | null,
  options?: { enabled?: boolean },
) {
  return useQuery<ActivityRouteResponse>({
    queryKey: [
      ...ACTIVITY_ROUTE_QUERY_KEY,
      params?.missionId,
      params?.activityId,
      params?.originLat,
      params?.originLng,
      params?.vehicle,
    ],
    queryFn: () => getActivityRoute(params!),
    enabled: (options?.enabled ?? true) && !!params,
  });
}

export const MISSION_TEAM_ROUTE_QUERY_KEY = ["mission-team-route"] as const;

export function useMissionTeamRoute(
  params: GetMissionTeamRouteParams | null,
  options?: { enabled?: boolean },
) {
  return useQuery<MissionTeamRouteResponse>({
    queryKey: [
      ...MISSION_TEAM_ROUTE_QUERY_KEY,
      params?.missionId,
      params?.missionTeamId,
      params?.originLat,
      params?.originLng,
      params?.vehicle,
    ],
    queryFn: () => getMissionTeamRoute(params!),
    enabled: (options?.enabled ?? true) && !!params,
  });
}
