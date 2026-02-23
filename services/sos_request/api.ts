import api from "@/config/axios";
import { GetSOSRequestsResponse, GetSOSRequestByIdResponse } from "./type";

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
