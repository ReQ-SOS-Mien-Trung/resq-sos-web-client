import api from "@/config/axios";
import {
  GetSOSRequestsResponse,
  GetSOSRequestsParams,
  GetSOSRequestByIdResponse,
  RescueSuggestionRequest,
  RescueSuggestionResponse,
  GetSOSRequestAnalysisResponse,
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
