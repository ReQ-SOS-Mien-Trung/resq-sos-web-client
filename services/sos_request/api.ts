import api from "@/config/axios";
import {
  GetSOSRequestsResponse,
  GetSOSRequestsParams,
  GetSOSRequestByIdResponse,
  RescueSuggestionResponse,
  GetSOSRequestAnalysisResponse,
  CreateSOSRequestPayload,
  SOSRequestEntity,
} from "./type";

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
