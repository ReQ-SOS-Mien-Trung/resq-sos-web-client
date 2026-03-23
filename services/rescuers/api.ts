import api from "@/config/axios";
import type { GetRescuersParams, GetRescuersResponse } from "./type";

/**
 * Get rescuers with pagination and filters.
 * GET /personnel/rescuers
 */
export async function getRescuers(
  params?: GetRescuersParams,
): Promise<GetRescuersResponse> {
  const { data } = await api.get("/personnel/rescuers", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
      hasAssemblyPoint: params?.hasAssemblyPoint,
      hasTeam: params?.hasTeam,
      rescuerType: params?.rescuerType,
      abilitySubgroupCode: params?.abilitySubgroupCode,
      abilityCategoryCode: params?.abilityCategoryCode,
    },
  });

  return data;
}
