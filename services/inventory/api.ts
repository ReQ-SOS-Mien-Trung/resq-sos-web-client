import api from "@/config/axios";
import { useAuthStore } from "@/stores/auth.store";
import {
  GetDepotInventoryParams,
  GetDepotInventoryResponse,
  GetMyDepotInventoryParams,
  GetMyDepotInventoryResponse,
  InventoryItemEntity,
  GetMyDepotCategoryQuantitiesResponse,
  ImportInventoryRequest,
  ImportRegularRequest,
  InventoryCategory,
  InventoryItemType,
  InventoryOrganization,
  InventoryTargetGroup,
  InventoryActionType,
  InventorySourceType,
  InventoryReliefItem,
  ReusableItemCondition,
  SearchDepotsParams,
  SearchDepotsResponse,
  CreateSupplyRequestsPayload,
  GetSupplyRequestsParams,
  GetSupplyRequestsResponse,
  RejectSupplyRequestPayload,
  GetDepotStockMovementsParams,
  GetDepotStockMovementsResponse,
  ExportMovementsParams,
  GetInventoryLotsResponse,
  GetThresholdsParams,
  GetThresholdsResponse,
  GetThresholdsHistoryParams,
  GetThresholdsHistoryResponse,
  UpdateThresholdPayload,
  UpdateThresholdResponse,
  DeleteThresholdPayload,
  DeleteThresholdResponse,
  GetLowStockParams,
  GetLowStockResponse,
  WarningBandConfig,
  UpdateWarningBandConfigPayload,
  SupplyRequestPriorityConfig,
  UpdateSupplyRequestPriorityConfigPayload,
  SupplyRequestPriorityLevel,
  GetUpcomingPickupsParams,
  GetUpcomingPickupsResponse,
  GetPickupHistoryParams,
  GetPickupHistoryResponse,
  GetUpcomingReturnsParams,
  GetUpcomingReturnsResponse,
  GetReturnHistoryParams,
  GetReturnHistoryResponse,
  UpcomingReturnEntity,
} from "./type";

type InventoryItemLike = Partial<InventoryItemEntity> & {
  itemType?: unknown;
  quantity?: unknown;
  reservedQuantity?: unknown;
  availableQuantity?: unknown;
  unit?: unknown;
  reservedUnit?: unknown;
  availableUnit?: unknown;
  totalReservedQuantity?: unknown;
  reservedForMissionQuantity?: unknown;
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isReusableItemType(value: unknown): boolean {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return (
    normalized === "reusable" ||
    normalized.includes("tai su dung") ||
    normalized.includes("tái sử dụng")
  );
}

function normalizeInventoryItem(item: InventoryItemLike): InventoryItemEntity {
  const reusable = isReusableItemType(item.itemType);

  if (reusable) {
    const unit = toFiniteNumber(item.unit ?? item.quantity, 0);
    const reservedUnit = toFiniteNumber(
      item.reservedUnit ?? item.reservedQuantity ?? item.totalReservedQuantity,
      0,
    );
    const availableUnit = toFiniteNumber(
      item.availableUnit ?? item.availableQuantity,
      Math.max(unit - reservedUnit, 0),
    );

    return {
      ...(item as object),
      itemType: "Reusable",
      unit,
      reservedUnit,
      availableUnit,
    } as InventoryItemEntity;
  }

  const quantity = toFiniteNumber(item.quantity ?? item.unit, 0);
  const reservedQuantity = toFiniteNumber(
    item.reservedQuantity ??
    item.totalReservedQuantity ??
    item.reservedForMissionQuantity,
    0,
  );
  const availableQuantity = toFiniteNumber(
    item.availableQuantity ?? item.availableUnit,
    Math.max(quantity - reservedQuantity, 0),
  );

  return {
    ...(item as object),
    itemType: "Consumable",
    quantity,
    reservedQuantity,
    availableQuantity,
  } as InventoryItemEntity;
}

function normalizeInventoryResponse<T extends { items?: unknown[] }>(
  data: T,
): T {
  if (!Array.isArray(data?.items)) return data;

  return {
    ...data,
    items: data.items.map((item) =>
      normalizeInventoryItem(item as InventoryItemLike),
    ),
  } as T;
}

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
  return normalizeInventoryResponse<GetDepotInventoryResponse>(data);
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
  return normalizeInventoryResponse<GetMyDepotInventoryResponse>(data);
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
 * Get quantity summary by category for current depot
 * GET /logistics/inventory/my-depot/quantity-by-category
 */
export async function getMyDepotQuantityByCategory(): Promise<GetMyDepotCategoryQuantitiesResponse> {
  const { data } = await api.get(
    "/logistics/inventory/my-depot/quantity-by-category",
  );
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
    `/logistics/inventory/metadata/item-models/category/${categoryCode}`,
  );
  return data;
}

/**
 * Get reusable item conditions metadata
 * GET /logistics/inventory/metadata/reusable-item-conditions
 */
export async function getReusableItemConditions(): Promise<
  ReusableItemCondition[]
> {
  const { data } = await api.get(
    "/logistics/inventory/metadata/reusable-item-conditions",
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
  // API wraps response in { data: { items: [...], ... }, serverTime: "..." }
  return data?.data ?? data;
}

/**
 * Get upcoming pickup activities for current depot manager
 * GET /logistics/inventory/my-depot/upcoming-pickups
 */
export async function getMyDepotUpcomingPickups(
  params: GetUpcomingPickupsParams,
): Promise<GetUpcomingPickupsResponse> {
  const { data } = await api.get(
    "/logistics/inventory/my-depot/upcoming-pickups",
    {
      params,
    },
  );
  return data;
}

/**
 * Get historical pickup activities for current depot manager
 * GET /logistics/inventory/my-depot/pickup-history
 */
export async function getMyDepotPickupHistory(
  params: GetPickupHistoryParams,
): Promise<GetPickupHistoryResponse> {
  const { data } = await api.get(
    "/logistics/inventory/my-depot/pickup-history",
    {
      params,
    },
  );
  return data;
}

/**
 * Get upcoming return activities for current depot manager
 * GET /logistics/inventory/my-depot/upcoming-returns
 */
export async function getMyDepotUpcomingReturns(
  params: GetUpcomingReturnsParams,
): Promise<GetUpcomingReturnsResponse> {
  const { data } = await api.get(
    "/logistics/inventory/my-depot/upcoming-returns",
    {
      params,
      paramsSerializer: {
        indexes: null,
      },
    },
  );
  return data;
}

const UPCOMING_RETURNS_BATCH_SIZE = 100;

export async function getMyDepotUpcomingReturnsByStatuses(
  statuses: string[],
): Promise<UpcomingReturnEntity[]> {
  const uniqueStatuses = Array.from(
    new Set(statuses.map((status) => status.trim()).filter(Boolean)),
  );

  if (uniqueStatuses.length === 0) {
    return [];
  }

  const groups = await Promise.all(
    uniqueStatuses.map(async (status) => {
      const firstPage = await getMyDepotUpcomingReturns({
        status,
        pageNumber: 1,
        pageSize: UPCOMING_RETURNS_BATCH_SIZE,
      });

      const totalPages = Math.max(firstPage.totalPages ?? 1, 1);

      if (totalPages === 1) {
        return firstPage.items ?? [];
      }

      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          getMyDepotUpcomingReturns({
            status,
            pageNumber: index + 2,
            pageSize: UPCOMING_RETURNS_BATCH_SIZE,
          }).then((page) => page.items ?? []),
        ),
      );

      return [...(firstPage.items ?? []), ...remainingPages.flat()];
    }),
  );

  return groups.flat();
}

/**
 * Get historical return activities for current depot manager
 * GET /logistics/inventory/my-depot/return-history
 */
export async function getMyDepotReturnHistory(
  params: GetReturnHistoryParams,
): Promise<GetReturnHistoryResponse> {
  const { data } = await api.get(
    "/logistics/inventory/my-depot/return-history",
    {
      params,
    },
  );
  return data;
}

/**
 * Accept a supply request (Source Manager)
 * PUT /logistics/inventory/supply-requests/{id}/accept
 */
export async function acceptSupplyRequest(id: number): Promise<void> {
  await api.put(`/logistics/inventory/supply-requests/${id}/accept`);
}

/**
 * Start preparing a supply request (Source Manager)
 * PUT /logistics/inventory/supply-requests/{id}/prepare
 */
export async function prepareSupplyRequest(id: number): Promise<void> {
  await api.put(`/logistics/inventory/supply-requests/${id}/prepare`);
}

/**
 * Ship a supply request — decreases source depot inventory (Source Manager)
 * PUT /logistics/inventory/supply-requests/{id}/ship
 */
export async function shipSupplyRequest(id: number): Promise<void> {
  await api.put(`/logistics/inventory/supply-requests/${id}/ship`);
}

/**
 * Mark supply request as completed/delivered (Source Manager)
 * PUT /logistics/inventory/supply-requests/{id}/complete
 */
export async function completeSupplyRequest(id: number): Promise<void> {
  await api.put(`/logistics/inventory/supply-requests/${id}/complete`);
}

/**
 * Confirm receipt of supply request — increases requesting depot inventory (Requesting Manager)
 * PUT /logistics/inventory/supply-requests/{id}/confirm
 */
export async function confirmSupplyRequest(id: number): Promise<void> {
  await api.put(`/logistics/inventory/supply-requests/${id}/confirm`);
}

/**
 * Reject a supply request with reason (Source Manager, only from Pending)
 * PUT /logistics/inventory/supply-requests/{id}/reject
 */
export async function rejectSupplyRequest(
  id: number,
  payload: RejectSupplyRequestPayload,
): Promise<void> {
  await api.put(`/logistics/inventory/supply-requests/${id}/reject`, payload);
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
 * Get depot stock movement history
 * GET /logistics/inventory/stock-movements/my-depot
 */
export async function getDepotStockMovements(
  params: GetDepotStockMovementsParams,
): Promise<GetDepotStockMovementsResponse> {
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
 * Get inventory lots (FEFO) for a specific item model
 * GET /logistics/inventory/{itemModelId}/lots
 */
export async function getInventoryLots(
  itemModelId: number,
): Promise<GetInventoryLotsResponse> {
  const { data } = await api.get(`/logistics/inventory/${itemModelId}/lots`);
  return data;
}

/**
 * Download donation import template
 * Proxied via /api/inventory/template-donation → GET /logistics/inventory/template/donation-import
 */
export async function downloadDonationImportTemplate(): Promise<{
  blob: Blob;
  filename: string;
}> {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch("/api/inventory/template-donation", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const disposition = response.headers.get("content-disposition") ?? "";
  let filename = "mau_nhap_kho_tu_thien.xlsx";
  const utf8Match = disposition.match(/filename\*=[^']*'[^']*'([^;\s]+)/i);
  if (utf8Match) {
    filename = decodeURIComponent(utf8Match[1]);
  } else {
    const asciiMatch = disposition.match(/filename="([^"]+)"/);
    if (asciiMatch) filename = asciiMatch[1];
    else if (disposition.includes("filename=")) {
      const plain = disposition.match(/filename=([^;\s]+)/);
      if (plain) filename = plain[1];
    }
  }
  const blob = await response.blob();
  return { blob, filename };
}

/**
 * Download purchase import template
 * Proxied via /api/inventory/template-purchase → GET /logistics/inventory/template/purchase-import
 */
export async function downloadPurchaseImportTemplate(): Promise<{
  blob: Blob;
  filename: string;
}> {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch("/api/inventory/template-purchase", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const disposition = response.headers.get("content-disposition") ?? "";
  let filename = "mau_nhap_kho_thuong.xlsx";
  const utf8Match = disposition.match(/filename\*=[^']*'[^']*'([^;\s]+)/i);
  if (utf8Match) {
    filename = decodeURIComponent(utf8Match[1]);
  } else {
    const asciiMatch = disposition.match(/filename="([^"]+)"/);
    if (asciiMatch) filename = asciiMatch[1];
    else if (disposition.includes("filename=")) {
      const plain = disposition.match(/filename=([^;\s]+)/);
      if (plain) filename = plain[1];
    }
  }
  const blob = await response.blob();
  return { blob, filename };
}

/**
 * Export inventory movements to Excel.
 * Routes through /api/inventory/export-movements so the browser can read the
 * original Content-Disposition header and keep the backend-provided filename.
 */
export async function exportInventoryMovements(
  params: ExportMovementsParams,
): Promise<{ blob: Blob; filename: string }> {
  const searchParams = new URLSearchParams();
  searchParams.set("periodType", params.periodType);
  if (params.fromDate) searchParams.set("fromDate", params.fromDate);
  if (params.toDate) searchParams.set("toDate", params.toDate);
  if (params.month !== undefined) {
    searchParams.set("month", String(params.month));
  }
  if (params.year !== undefined) {
    searchParams.set("year", String(params.year));
  }

  const token = useAuthStore.getState().accessToken;
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

  const disposition = response.headers.get("content-disposition") ?? "";
  let filename = "BaoCao.xlsx";

  // RFC 5987: filename*=<charset>'<language>'<encoded-value>
  const utf8Match = disposition.match(/filename\*=[^']*'[^']*'([^;\s]+)/i);
  if (utf8Match) {
    filename = decodeURIComponent(utf8Match[1]);
  } else {
    const asciiMatch = disposition.match(/filename="([^"]+)"/);
    if (asciiMatch) filename = asciiMatch[1];
    else if (disposition.includes("filename=")) {
      const plainMatch = disposition.match(/filename=([^;\s]+)/);
      if (plainMatch) filename = plainMatch[1];
    }
  }

  return { blob: await response.blob(), filename };
}

// ─── Thresholds ───

/**
 * Get warning band config (Admin)
 * GET /logistics/inventory/warning-band-config
 */
export async function getWarningBandConfig(): Promise<WarningBandConfig> {
  const { data } = await api.get("/logistics/inventory/warning-band-config");
  return data;
}

/**
 * Update warning band config (Admin)
 * PUT /logistics/inventory/warning-band-config
 */
export async function updateWarningBandConfig(
  payload: UpdateWarningBandConfigPayload,
): Promise<WarningBandConfig> {
  const { data } = await api.put(
    "/logistics/inventory/warning-band-config",
    payload,
  );
  return data;
}

/**
 * Get threshold configs (Admin)
 * GET /logistics/inventory/thresholds
 */
export async function getThresholds(
  params?: GetThresholdsParams,
): Promise<GetThresholdsResponse> {
  const { data } = await api.get("/logistics/inventory/thresholds", {
    params,
  });
  return data;
}

/**
 * Get current threshold configs (global + overrides) for my depot
 * GET /logistics/inventory/my-depot/thresholds
 */
export async function getMyDepotThresholds(): Promise<GetThresholdsResponse> {
  const { data } = await api.get("/logistics/inventory/my-depot/thresholds");
  return data;
}

/**
 * Get threshold change history with optional filters + pagination
 * GET /logistics/inventory/my-depot/thresholds/history
 */
export async function getMyDepotThresholdsHistory(
  params: GetThresholdsHistoryParams,
): Promise<GetThresholdsHistoryResponse> {
  const { data } = await api.get(
    "/logistics/inventory/my-depot/thresholds/history",
    { params },
  );
  return data;
}

/**
 * Create or update a threshold config by scope
 * PUT /logistics/inventory/my-depot/thresholds
 */
export async function updateMyDepotThreshold(
  payload: UpdateThresholdPayload,
): Promise<UpdateThresholdResponse> {
  const { data } = await api.put(
    "/logistics/inventory/my-depot/thresholds",
    payload,
  );
  return data;
}

/**
 * Soft-reset (deactivate) a threshold config
 * DELETE /logistics/inventory/my-depot/thresholds
 */
export async function deleteMyDepotThreshold(
  payload: DeleteThresholdPayload,
): Promise<DeleteThresholdResponse> {
  const { data } = await api.delete(
    "/logistics/inventory/my-depot/thresholds",
    { data: payload },
  );
  return data;
}

// ─── Low Stock ───

/**
 * Get low-stock items across depots (Admin)
 * GET /logistics/inventory/low-stock
 */
export async function getLowStock(
  params?: GetLowStockParams,
): Promise<GetLowStockResponse> {
  const { data } = await api.get("/logistics/inventory/low-stock", {
    params,
  });
  return data;
}

/**
 * Get low-stock items for my depot (resolved by threshold precedence)
 * GET /logistics/inventory/my-depot/low-stock
 */
export async function getMyDepotLowStock(
  params?: GetLowStockParams,
): Promise<GetLowStockResponse> {
  const { data } = await api.get("/logistics/inventory/my-depot/low-stock", {
    params,
  });
  return data;
}

// ─── Supply Request Priority Config ───

/**
 * Get supply request priority config (Admin / Depot Manager)
 * GET /logistics/inventory/supply-request-priority-config
 */
export async function getSupplyRequestPriorityConfig(): Promise<SupplyRequestPriorityConfig> {
  const { data } = await api.get(
    "/logistics/inventory/supply-request-priority-config",
  );
  return data;
}

/**
 * Update supply request priority config (Admin)
 * PUT /logistics/inventory/supply-request-priority-config
 */
export async function updateSupplyRequestPriorityConfig(
  payload: UpdateSupplyRequestPriorityConfigPayload,
): Promise<SupplyRequestPriorityConfig> {
  const { data } = await api.put(
    "/logistics/inventory/supply-request-priority-config",
    payload,
  );
  return data;
}

/**
 * Get supply request priority levels metadata
 * GET /logistics/inventory/metadata/supply-request-priority-levels
 */
export async function getSupplyRequestPriorityLevels(): Promise<
  SupplyRequestPriorityLevel[]
> {
  const { data } = await api.get(
    "/logistics/inventory/metadata/supply-request-priority-levels",
  );
  return data;
}
