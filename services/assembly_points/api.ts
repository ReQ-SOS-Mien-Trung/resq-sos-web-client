import api from "@/config/axios";
import {
  GetAssemblyPointsResponse,
  GetAssemblyPointsParams,
  AssemblyPointDetailEntity,
  CreateAssemblyPointRequest,
  CreateAssemblyPointResponse,
  AssemblyPointStatusMetadata,
  AssemblyPointMetadataOption,
  UpdateAssemblyPointRequest,
  UpdateAssemblyPointResponse,
  UpdateRescuerAssemblyPointAssignmentRequest,
  AssemblyPointStatusTransitionRequest,
  AssemblyPointStatusTransitionResponse,
  ScheduleAssemblyPointGatheringRequest,
  ScheduleAssemblyPointGatheringResponse,
  StartAssemblyPointGatheringRequest,
  GetAssemblyPointEventsParams,
  GetAssemblyPointEventsResponse,
  GetAssemblyPointCheckedInRescuersParams,
  GetAssemblyPointCheckedInRescuersResponse,
} from "./type";

/**
 * Get all assembly points with pagination
 * GET /personnel/assembly-point
 */
export async function getAssemblyPoints(
  params?: GetAssemblyPointsParams,
): Promise<GetAssemblyPointsResponse> {
  const { data } = await api.get("/personnel/assembly-point", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
      status: params?.status,
    },
  });
  return data;
}

/**
 * Get an assembly point by ID
 * GET /personnel/assembly-point/{id}
 */
export async function getAssemblyPointById(
  id: number,
): Promise<AssemblyPointDetailEntity> {
  const { data } = await api.get(`/personnel/assembly-point/${id}`);
  return data;
}

/**
 * Get assembly point statuses metadata
 * GET /personnel/assembly-point/status-metadata
 */
export async function getAssemblyPointStatuses(): Promise<
  AssemblyPointStatusMetadata[]
> {
  const { data } = await api.get("/personnel/assembly-point/status-metadata");
  return data;
}

/**
 * Get assembly point metadata for dropdown options
 * GET /personnel/assembly-point/metadata
 */
export async function getAssemblyPointMetadata(): Promise<
  AssemblyPointMetadataOption[]
> {
  const { data } = await api.get("/personnel/assembly-point/metadata");
  return data;
}

/**
 * Create a new assembly point
 * POST /personnel/assembly-point
 */
export async function createAssemblyPoint(
  payload: CreateAssemblyPointRequest,
): Promise<CreateAssemblyPointResponse> {
  const { data } = await api.post("/personnel/assembly-point", payload);
  return data;
}

/**
 * Update an assembly point
 * PUT /personnel/assembly-point/{id}
 */
export async function updateAssemblyPoint(
  payload: UpdateAssemblyPointRequest,
): Promise<UpdateAssemblyPointResponse> {
  const { id, ...body } = payload;
  const { data } = await api.put(`/personnel/assembly-point/${id}`, body);
  return data;
}

/**
 * Activate an assembly point
 * PATCH /personnel/assembly-point/{id}/activate
 */
export async function activateAssemblyPoint(
  id: number,
): Promise<AssemblyPointStatusTransitionResponse> {
  const { data } = await api.patch(`/personnel/assembly-point/${id}/activate`);
  return data;
}

/**
 * Set an assembly point to unavailable
 * PATCH /personnel/assembly-point/{id}/set-unavailable
 */
export async function setAssemblyPointUnavailable(
  payload: AssemblyPointStatusTransitionRequest,
): Promise<AssemblyPointStatusTransitionResponse> {
  const { id, reason } = payload;
  const { data } = await api.patch(
    `/personnel/assembly-point/${id}/set-unavailable`,
    {
      reason: reason ?? null,
    },
  );
  return data;
}

/**
 * Set an assembly point to available
 * PATCH /personnel/assembly-point/{id}/set-available
 */
export async function setAssemblyPointAvailable(
  payload: AssemblyPointStatusTransitionRequest,
): Promise<AssemblyPointStatusTransitionResponse> {
  const { id, reason } = payload;
  const { data } = await api.patch(
    `/personnel/assembly-point/${id}/set-available`,
    {
      reason: reason ?? null,
    },
  );
  return data;
}

/**
 * Close an assembly point permanently
 * PATCH /personnel/assembly-point/{id}/close
 */
export async function closeAssemblyPoint(
  payload: AssemblyPointStatusTransitionRequest,
): Promise<AssemblyPointStatusTransitionResponse> {
  const { id, reason } = payload;
  const { data } = await api.patch(`/personnel/assembly-point/${id}/close`, {
    reason,
  });
  return data;
}

/**
 * Assign or unassign one or many rescuers to an assembly point
 * POST /personnel/assembly-point/rescuers/assignment
 */
export async function updateRescuerAssemblyPointAssignment(
  payload: UpdateRescuerAssemblyPointAssignmentRequest,
): Promise<void> {
  const { userIds, assemblyPointId } = payload;
  await api.post(`/personnel/assembly-point/rescuers/assignment`, {
    userIds,
    assemblyPointId,
  });
}

/**
 * Schedule gathering time at assembly point
 * POST /personnel/assembly-point/{id}/schedule-gathering
 */
export async function scheduleAssemblyPointGathering(
  payload: ScheduleAssemblyPointGatheringRequest,
): Promise<ScheduleAssemblyPointGatheringResponse> {
  const { id, assemblyDate, checkInDeadline } = payload;
  const { data } = await api.post(
    `/personnel/assembly-point/${id}/schedule-gathering`,
    {
      assemblyDate,
      checkInDeadline,
    },
  );
  return data;
}

/**
 * Start gathering for an assembly event
 * POST /personnel/assembly-point/events/{eventId}/start-gathering
 */
export async function startAssemblyPointGathering(
  payload: StartAssemblyPointGatheringRequest,
): Promise<void> {
  const { eventId } = payload;
  await api.post(`/personnel/assembly-point/events/${eventId}/start-gathering`);
}

/**
 * Get events by assembly point with pagination
 * GET /personnel/assembly-point/{id}/events
 */
export async function getAssemblyPointEvents(
  id: number,
  params?: GetAssemblyPointEventsParams,
): Promise<GetAssemblyPointEventsResponse> {
  const { data } = await api.get(`/personnel/assembly-point/${id}/events`, {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  });
  return data;
}

/**
 * Get checked-in rescuers for an assembly point event with pagination and filters
 * GET /personnel/assembly-point/events/{eventId}/checked-in-rescuers
 */
export async function getAssemblyPointCheckedInRescuers(
  eventId: number,
  params?: GetAssemblyPointCheckedInRescuersParams,
): Promise<GetAssemblyPointCheckedInRescuersResponse> {
  const { data } = await api.get(
    `/personnel/assembly-point/events/${eventId}/checked-in-rescuers`,
    {
      params: {
        pageNumber: params?.pageNumber ?? 1,
        pageSize: params?.pageSize ?? 10,
        rescuerType: params?.rescuerType,
        abilitySubgroupCode: params?.abilitySubgroupCode,
        abilityCategoryCode: params?.abilityCategoryCode?.toUpperCase(),
        search: params?.search,
      },
    },
  );
  return data;
}
