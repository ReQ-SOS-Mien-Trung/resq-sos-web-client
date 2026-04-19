import api from "@/config/axios";
import {
  GetRescueTeamsOverviewParams,
  GetRescueTeamsOverviewResponse,
  RescueTeamDetailResponse,
  RescuerScoresResponse,
} from "./team-overview.type";

/**
 * GET /personnel/dashboard/rescue-teams?pageNumber=1&pageSize=10
 */
export async function getRescueTeamsOverview(
  params?: GetRescueTeamsOverviewParams,
): Promise<GetRescueTeamsOverviewResponse> {
  const { data } = await api.get("/personnel/dashboard/rescue-teams", {
    params,
  });
  return data;
}

/**
 * GET /personnel/dashboard/rescue-teams/{id}
 */
export async function getRescueTeamDetail(
  id: number,
): Promise<RescueTeamDetailResponse> {
  const { data } = await api.get(`/personnel/dashboard/rescue-teams/${id}`);
  return data;
}

/**
 * GET /personnel/dashboard/rescuers/{rescuerId}/scores
 */
export async function getRescuerScores(
  rescuerId: string,
): Promise<RescuerScoresResponse> {
  const { data } = await api.get(
    `/personnel/dashboard/rescuers/${rescuerId}/scores`,
  );
  return data;
}
