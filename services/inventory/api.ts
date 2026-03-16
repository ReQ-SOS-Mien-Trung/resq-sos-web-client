import api from "@/config/axios";
import {
  GetDepotInventoryParams,
  GetDepotInventoryResponse,
  GetMyDepotInventoryParams,
  GetMyDepotInventoryResponse,
  InventoryCategory,
  InventoryItemType,
  InventoryTargetGroup,
} from "./type";

/**
 * Get inventory by depot ID with optional filters
 * GET /logistics/inventory/depot/{depotId}
 */
export async function getDepotInventory(
  params: GetDepotInventoryParams,
): Promise<GetDepotInventoryResponse> {
  const { depotId, ...query } = params;
  const { data } = await api.get(`/logistics/inventory/depot/${depotId}`, {
    params: query,
    paramsSerializer: {
      indexes: null,
    },
  });
  return data;
}

/**
 * Get depot inventory by passing multiple optional filters
 * GET /logistics/inventory/my-depot
 */
export async function getMyDepotInventory(
  params: GetMyDepotInventoryParams,
): Promise<GetMyDepotInventoryResponse> {
  const { data } = await api.get("/logistics/inventory/my-depot", {
    params,
    paramsSerializer: {
      indexes: null,
    },
  });
  return data;
}

/**
 * Get list of available item categories
 * GET /logistics/inventory/metadata/categories
 */
export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  const { data } = await api.get("/logistics/inventory/metadata/categories");
  return data;
}

/**
 * Get list of item types
 * GET /logistics/inventory/metadata/item-types
 */
export async function getInventoryItemTypes(): Promise<InventoryItemType[]> {
  const { data } = await api.get("/logistics/inventory/metadata/item-types");
  return data;
}

/**
 * Get list of target groups
 * GET /logistics/inventory/metadata/target-groups
 */
export async function getInventoryTargetGroups(): Promise<
  InventoryTargetGroup[]
> {
  const { data } = await api.get("/logistics/inventory/metadata/target-groups");
  return data;
}
