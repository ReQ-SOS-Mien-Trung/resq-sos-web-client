import api from "@/config/axios";
import {
  GetSOSRequestsResponse,
  GetSOSRequestsParams,
  GetSOSRequestsInBoundsParams,
  GetSOSRequestByIdResponse,
  GetSOSRequestAnalysisResponse,
  CreateSOSRequestPayload,
  SOSPriorityLevelOption,
  SOSRequestEntity,
} from "./type";
import { mapBoundsToSOSRequestParams } from "@/lib/coordinator-map-utils";

/**
 * Get all SOS requests
 * GET /emergency/sos-requests
 */
export async function getSOSRequests(
  params?: GetSOSRequestsParams,
): Promise<GetSOSRequestsResponse> {
  const { data } = await api.get("/emergency/sos-requests", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  });
  return data;
}

/**
 * Get SOS requests inside the current map bounds buffer.
 * GET /emergency/sos-requests
 */
export async function getSOSRequestsInBounds(
  params: GetSOSRequestsInBoundsParams,
): Promise<SOSRequestEntity[]> {
  const boundsParams = mapBoundsToSOSRequestParams({
    south: params.MinLat,
    north: params.MaxLat,
    west: params.MinLng,
    east: params.MaxLng,
  });

  const { data } = await api.get("/emergency/sos-requests", {
    params: {
      ...boundsParams,
      Statuses: params.Statuses,
      PriorityLevels: params.PriorityLevels,
    },
    paramsSerializer: {
      indexes: null, // ?Statuses=Pending&Statuses=Assigned
    },
  });

  return data;
}

/**
 * Get SOS priority level metadata.
 * GET /emergency/sos-requests/metadata/priority-levels
 */
export async function getSOSPriorityLevels(): Promise<
  SOSPriorityLevelOption[]
> {
  const { data } = await api.get(
    "/emergency/sos-requests/metadata/priority-levels",
  );
  return data;
}

/**
 * Get a SOS request by ID
 * GET /emergency/sos-requests/{id}
 */
export async function getSOSRequestById(
  id: number,
): Promise<GetSOSRequestByIdResponse> {
  const { data } = await api.get(`/emergency/sos-requests/${id}`);
  return data;
}

/**
 * Get analysis for a SOS request by ID
 * GET /emergency/sos-requests/{id}/analysis
 */
export async function getSOSRequestAnalysis(
  id: number,
): Promise<GetSOSRequestAnalysisResponse> {
  const { data } = await api.get(`/emergency/sos-requests/${id}/evaluation`);
  return data;
}

/**
 * Manually create a SOS request (e.g. from call center)
 * POST /emergency/sos-requests
 */
export async function createSOSRequest(
  payload: CreateSOSRequestPayload,
): Promise<SOSRequestEntity> {
  const { data } = await api.post("/emergency/sos-requests", payload);
  return data;
}
