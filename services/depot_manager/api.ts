import api from "@/config/axios";
import type { GetDepotManagersParams, GetDepotManagersResponse } from "./type";

/**
 * [Admin] Get depot-manager assignment history for a depot
 * GET /logistics/depot-manager
 */
export async function getDepotManagers(
  params: GetDepotManagersParams,
): Promise<GetDepotManagersResponse> {
  const { data } = await api.get("/logistics/depot-manager", {
    params: {
      depotId: params.depotId,
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
    },
  });

  return data;
}

