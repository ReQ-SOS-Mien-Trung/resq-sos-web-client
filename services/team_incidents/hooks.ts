import { useQuery } from "@tanstack/react-query";
import { getTeamIncidents, getTeamIncidentsByMission } from "./api";
import type {
  GetTeamIncidentsByMissionResponse,
  GetTeamIncidentsParams,
  GetTeamIncidentsResponse,
} from "./type";

export const TEAM_INCIDENTS_QUERY_KEY = ["team-incidents"] as const;
export const TEAM_INCIDENTS_BY_MISSION_QUERY_KEY = [
  "team-incidents",
  "by-mission",
] as const;

export interface UseTeamIncidentsOptions {
  params?: GetTeamIncidentsParams;
  enabled?: boolean;
}

export interface UseTeamIncidentsByMissionOptions {
  enabled?: boolean;
}

export function useTeamIncidents(options?: UseTeamIncidentsOptions) {
  const params = options?.params;

  return useQuery<GetTeamIncidentsResponse>({
    queryKey: [
      ...TEAM_INCIDENTS_QUERY_KEY,
      params?.missionTeamId ?? null,
      params?.status ?? null,
    ],
    queryFn: () => getTeamIncidents(params),
    enabled: options?.enabled ?? true,
  });
}

export function useTeamIncidentsByMission(
  missionId: number,
  options?: UseTeamIncidentsByMissionOptions,
) {
  return useQuery<GetTeamIncidentsByMissionResponse>({
    queryKey: [...TEAM_INCIDENTS_BY_MISSION_QUERY_KEY, missionId],
    queryFn: () => getTeamIncidentsByMission(missionId),
    enabled: (options?.enabled ?? true) && Number.isFinite(missionId),
  });
}
