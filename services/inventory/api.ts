import api from "@/config/axios";
import { useAuthStore } from "@/stores/auth.store";
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
  InventoryReliefItem,
  SearchDepotsParams,
  SearchDepotsResponse,
  CreateSupplyRequestsPayload,
  GetSupplyRequestsParams,
  GetSupplyRequestsResponse,
  GetDepotTransactionsParams,
  GetDepotTransactionsResponse,
  ExportMovementsParams,
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
 * Get list of relief items by category code
 * GET /logistics/inventory/metadata/relief-items/category/{categoryCode}
 */
export async function getInventoryReliefItemsByCategory(
  categoryCode: string,
): Promise<InventoryReliefItem[]> {
  const { data } = await api.get(
    `/logistics/inventory/metadata/relief-items/category/${categoryCode}`,
  );
  return data;
}

/**
 * Search depots by requested relief items and quantities
 * GET /logistics/inventory/search-depots
 */
export async function searchDepotsByReliefItems(
  params: SearchDepotsParams,
): Promise<SearchDepotsResponse> {
  const { data } = await api.get("/logistics/inventory/search-depots", {
    params,
    paramsSerializer: {
      indexes: null,
    },
  });
  return data;
}

/**
 * Create supply requests
 * POST /logistics/inventory/supply-requests
 */
export async function createSupplyRequests(
  payload: CreateSupplyRequestsPayload,
): Promise<void> {
  await api.post("/logistics/inventory/supply-requests", payload);
}

/**
 * Get supply requests list of current depot (both requested and source roles)
 * GET /logistics/inventory/supply-requests
 */
export async function getSupplyRequests(
  params: GetSupplyRequestsParams,
): Promise<GetSupplyRequestsResponse> {
  const { data } = await api.get("/logistics/inventory/supply-requests", {
    params,
  });
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
  const { data } = await api.get(
    "/logistics/inventory/stock-movements/my-depot",
    {
      params,
      paramsSerializer: {
        indexes: null,
      },
    },
  );
  return data;
}

/**
 * Export inventory movements to Excel.
 * Routes through /api/inventory/export-movements (Next.js server-side proxy)
 * so Content-Disposition header is readable without CORS restrictions.
 */
export async function exportInventoryMovements(
  params: ExportMovementsParams,
): Promise<{ blob: Blob; filename: string }> {
  // Build query string
  const searchParams = new URLSearchParams();
  searchParams.set("periodType", params.periodType);
  if (params.fromDate) searchParams.set("fromDate", params.fromDate);
  if (params.toDate) searchParams.set("toDate", params.toDate);
  if (params.month !== undefined)
    searchParams.set("month", String(params.month));
  if (params.year !== undefined) searchParams.set("year", String(params.year));

  // Get token from store (Zustand getState works outside React)
  const token = useAuthStore.getState().accessToken;

  // Call the Next.js proxy — same-origin, so all response headers are readable
  const response = await fetch(
    `/api/inventory/export-movements?${searchParams.toString()}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }

  // Content-Disposition is now readable (same-origin response)
  const disposition = response.headers.get("content-disposition") ?? "";
  let filename = "BaoCao.xlsx";

  // RFC 5987: filename*=<charset>'<language>'<encoded-value>
  const utf8Match = disposition.match(/filename\*=[^']*'[^']*'([^;\s]+)/i);
  if (utf8Match) {
    filename = decodeURIComponent(utf8Match[1]);
  } else {
    const asciiMatch = disposition.match(/filename="([^"]+)"/);
    if (asciiMatch) filename = asciiMatch[1];
  }

  const blob = await response.blob();
  return { blob, filename };
}
