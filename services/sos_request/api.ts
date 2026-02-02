import api from "@/config/axios";
import { GetSOSRequestsResponse } from "./type";

/**
 * Get all SOS requests
 * GET /api/sos-requests
 */
export async function getSOSRequests(): Promise<GetSOSRequestsResponse> {
  const { data } = await api.get("/api/sos-requests");
  return data;
}
