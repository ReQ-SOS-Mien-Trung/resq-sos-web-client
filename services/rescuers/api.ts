import api from "@/config/axios";
import type { GetFreeRescuersParams, GetFreeRescuersResponse } from "./type";

/**
 * Get free rescuers with pagination.
 * GET /personnel/rescuers/free
 */
export async function getFreeRescuers(
  params?: GetFreeRescuersParams,
): Promise<GetFreeRescuersResponse> {
  const { data } = await api.get("/personnel/rescuers/free", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
      firstName: params?.firstName,
      lastName: params?.lastName,
      phone: params?.phone,
      email: params?.email,
      rescuerType: params?.rescuerType,
    },
  });

  return data;
}
