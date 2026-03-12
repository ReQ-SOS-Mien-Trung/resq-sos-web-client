import api from "@/config/axios";
import { GetInventoryResponse, GetInventoryParams } from "./type";

/**
 * Get inventory items for a depot with filtering and pagination
 * GET /logistics/inventory/depot/{depotId}
 */
export async function getDepotInventory(
  params: GetInventoryParams,
): Promise<GetInventoryResponse> {
  const { depotId, ...query } = params;
  const { data } = await api.get(`/logistics/inventory/depot/${depotId}`, {
    params: {
      categoryIds: query.categoryIds,
      itemTypes: query.itemTypes,
      targetGroups: query.targetGroups,
      pageNumber: query.pageNumber ?? 1,
      pageSize: query.pageSize ?? 10,
    },
  });
  return data;
}
