import api from "@/config/axios";
import {
  GetSOSRequestsResponse,
  GetSOSRequestByIdResponse,
  RescueSuggestionRequest,
  RescueSuggestionResponse,
} from "./type";

/**
 * Get all SOS requests
 * GET /emergency/sos-requests
 */
export async function getSOSRequests(): Promise<GetSOSRequestsResponse> {
  const { data } = await api.get("/emergency/sos-requests");
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
 * Get AI rescue suggestion for SOS requests
 * POST /emergency/sos-requests/rescue-suggestion
 */
export async function getRescueSuggestion(
  request: RescueSuggestionRequest,
): Promise<RescueSuggestionResponse> {
  const { data } = await api.post(
    "/emergency/sos-requests/rescue-suggestion",
    request,
    { timeout: 60000 }, // AI processing can take 15-30s
  );
  return data;
}
