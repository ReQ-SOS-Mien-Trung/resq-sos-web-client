import api from "@/config/axios";
import type { RescueTeamTypeOption, RescueTeamStatusOption } from "./type";

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
