import api from "@/config/axios";
import type {
  RescueTeamTypeOption,
  RescueTeamStatusOption,
  CreateRescueTeamRequest,
  CreateRescueTeamResponse,
} from "./type";

/**
 * Get rescue team metadata types.
 * GET /personnel/rescue-teams/metadata/types
 */
export async function getRescueTeamTypes(): Promise<RescueTeamTypeOption[]> {
  const { data } = await api.get("/personnel/rescue-teams/metadata/types");
  return data;
}

/**
 * Get rescue team metadata statuses.
 * GET /personnel/rescue-teams/metadata/status
 */
export async function getRescueTeamStatuses(): Promise<
  RescueTeamStatusOption[]
> {
  const { data } = await api.get("/personnel/rescue-teams/metadata/status");
  return data;
}

/**
 * Create a new rescue team.
 * POST /personnel/rescue-teams
 */
export async function createRescueTeam(
  request: CreateRescueTeamRequest,
): Promise<CreateRescueTeamResponse> {
  const { data } = await api.post("/personnel/rescue-teams", request);
  return data;
}
