import api from "@/config/axios";
import {
  GetMyDepotInventoryParams,
  GetMyDepotInventoryResponse,
  ImportInventoryRequest,
  ImportRegularRequest,
  InventoryCategory,
  InventoryItemType,
  InventoryOrganization,
  InventoryTargetGroup,
  InventoryActionType,
  InventorySourceType,
  GetDepotTransactionsParams,
  GetDepotTransactionsResponse,
} from "./type";

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

/**
 * Get list of organizations
 * GET /logistics/inventory/metadata/organizations
 */
export async function getInventoryOrganizations(): Promise<
  InventoryOrganization[]
> {
  const { data } = await api.get("/logistics/inventory/metadata/organizations");
  return data;
}

/**
 * Get list of inventory action types
 * GET /logistics/inventory/metadata/inventory-action-types
 */
export async function getInventoryActionTypes(): Promise<
  InventoryActionType[]
> {
  const { data } = await api.get(
    "/logistics/inventory/metadata/inventory-action-types",
  );
  return data;
}

/**
 * Get list of inventory source types
 * GET /logistics/inventory/metadata/inventory-source-types
 */
export async function getInventorySourceTypes(): Promise<
  InventorySourceType[]
> {
  const { data } = await api.get(
    "/logistics/inventory/metadata/inventory-source-types",
  );
  return data;
}

/**
 * Import inventory items from an organization
 * POST /logistics/inventory/import
 */
export async function importInventory(
  payload: ImportInventoryRequest,
): Promise<void> {
  await api.post("/logistics/inventory/import", payload, {
    timeout: 60000,
  });
}

/**
 * Import regular (purchase) inventory items with VAT invoice
 * POST /logistics/inventory/import-purchase
 */
export async function importRegularInventory(
  payload: ImportRegularRequest,
): Promise<void> {
  await api.post("/logistics/inventory/import-purchase", payload, {
    timeout: 60000,
  });
}

/**
 * Get depot transaction history
 * GET /logistics/inventory/transactions/my-depot
 */
export async function getDepotTransactions(
  params: GetDepotTransactionsParams,
): Promise<GetDepotTransactionsResponse> {
  const { data } = await api.get("/logistics/inventory/transactions/my-depot", {
    params,
    paramsSerializer: {
      indexes: null,
    },
  });
  return data;
}
