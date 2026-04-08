import api from "@/config/axios";
import type {
  RescueTeamTypeOption,
  RescueTeamStatusOption,
  GetRescueTeamsParams,
  GetRescueTeamsResponse,
  GetRescueTeamsByClusterResponse,
  GetRescueTeamByIdResponse,
  CreateRescueTeamRequest,
  CreateRescueTeamResponse,
  ScheduleRescueTeamAssemblyRequest,
  RemoveRescueTeamMemberRequest,
  AddRescueTeamMemberRequest,
} from "./type";

/**
 * Get rescue teams with pagination.
 * GET /personnel/rescue-teams
 */
export async function getRescueTeams(
  params?: GetRescueTeamsParams,
): Promise<GetRescueTeamsResponse> {
  const { data } = await api.get("/personnel/rescue-teams", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  });
  return data;
}

/**
 * Get rescue teams by cluster ID.
 * GET /personnel/rescue-teams/by-cluster/{clusterId}
 */
export async function getRescueTeamsByCluster(
  clusterId: number,
): Promise<GetRescueTeamsByClusterResponse> {
  const { data } = await api.get(
    `/personnel/rescue-teams/by-cluster/${clusterId}`,
  );
  return data;
}

/**
 * Get rescue team detail by ID.
 * GET /personnel/rescue-teams/{id}
 */
export async function getRescueTeamById(
  id: number,
): Promise<GetRescueTeamByIdResponse> {
  const { data } = await api.get(`/personnel/rescue-teams/${id}`);
  return data;
}

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

/**
 * Schedule rescue team assembly time.
 * PATCH /personnel/rescue-teams/{id}/schedule-assembly
 * Success response: 204 No Content
 */
export async function scheduleRescueTeamAssembly(
  request: ScheduleRescueTeamAssemblyRequest,
): Promise<void> {
  const { id, assemblyAt } = request;
  await api.patch(
    `/personnel/rescue-teams/${id}/schedule-assembly`,
    JSON.stringify(assemblyAt),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Remove a member from rescue team.
 * DELETE /personnel/rescue-teams/{id}/members/{userId}
 * Success response: 204 No Content
 */
export async function removeRescueTeamMember(
  request: RemoveRescueTeamMemberRequest,
): Promise<void> {
  const { id, userId } = request;
  await api.delete(`/personnel/rescue-teams/${id}/members/${userId}`);
}

/**
 * Add a member to rescue team.
 * POST /personnel/rescue-teams/{id}/members
 * Success response: 204 No Content
 */
export async function addRescueTeamMember(
  request: AddRescueTeamMemberRequest,
): Promise<void> {
  const { id, userId, isLeader } = request;
  await api.post(`/personnel/rescue-teams/${id}/members`, {
    userId,
    isLeader,
  });
}
