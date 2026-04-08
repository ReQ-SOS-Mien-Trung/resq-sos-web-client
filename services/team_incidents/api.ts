import api from "@/config/axios";
import type {
  GetTeamIncidentsByMissionResponse,
  GetTeamIncidentsParams,
  GetTeamIncidentsResponse,
} from "./type";

/**
 * Get incidents reported by mission teams.
 * GET /operations/team-incidents
 */
export async function getTeamIncidents(
  params?: GetTeamIncidentsParams,
): Promise<GetTeamIncidentsResponse> {
  const { data } = await api.get("/operations/team-incidents", {
    params: {
      missionTeamId: params?.missionTeamId,
      status: params?.status,
    },
  });

  return data;
}

/**
 * Get incidents by mission ID.
 * GET /operations/team-incidents/by-mission/{missionId}
 */
export async function getTeamIncidentsByMission(
  missionId: number,
): Promise<GetTeamIncidentsByMissionResponse> {
  const { data } = await api.get(
    `/operations/team-incidents/by-mission/${missionId}`,
  );

  return data;
}
