import api from "@/config/axios";
import {
  GetDepotManagersResponse,
  GetDepotManagersParams,
  DepotManagerEntity,
} from "./type";

/**
 * Get depot managers by depot ID with pagination
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
