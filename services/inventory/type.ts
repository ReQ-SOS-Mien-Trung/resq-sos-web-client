export interface InventoryCategory {
  key: string;
  value: string;
}

export type InventoryItemType = InventoryCategory;

export type InventoryTargetGroup = InventoryCategory;

export type InventoryOrganization = InventoryCategory;

export type InventoryActionType = InventoryCategory;

export type InventorySourceType = InventoryCategory;

export type InventoryReliefItem = InventoryCategory;

export interface ReusableBreakdown {
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  inTransitUnits: number;
  inUseUnits: number;
  maintenanceUnits: number;
  decommissionedUnits: number;
  goodCount: number;
  fairCount: number;
  poorCount: number;
}

interface InventoryItemEntityBase {
  itemModelId: number;
  itemModelName: string;
  categoryId: number;
  categoryName: string;
  targetGroup: string;
  lastStockedAt: string;
}

export interface ConsumableItemEntity extends InventoryItemEntityBase {
  itemType: "Consumable";
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reusableBreakdown: null;
}

export interface ReusableItemEntity extends InventoryItemEntityBase {
  itemType: "Reusable";
  /** Total unit count */
  unit: number;
  reservedUnit: number;
  availableUnit: number;
  reusableBreakdown: ReusableBreakdown;
}

export type InventoryItemEntity = ConsumableItemEntity | ReusableItemEntity;

export interface GetMyDepotInventoryParams {
  categoryCode?: string[];
  itemTypes?: string[];
  targetGroups?: string[];
  pageNumber?: number;
  pageSize?: number;
}

export interface GetDepotInventoryParams {
  depotId: number;
  categoryIds?: number[];
  itemTypes?: string[];
  targetGroups?: string[];
  pageNumber?: number;
  pageSize?: number;
}

export interface GetMyDepotInventoryResponse {
  items: InventoryItemEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Import from Organization ───

export interface ImportInventoryItem {
  row: number;
  itemName: string;
  categoryCode: string;
  quantity: number;
  unit: string;
  itemType: string;
  targetGroup: string;
  receivedDate: string;
  expiredDate?: string | null;
  notes?: string | null;
}

export interface ImportInventoryRequest {
  organizationId?: number;
  organizationName?: string;
  items: ImportInventoryItem[];
}

// ─── VAT Invoice (Purchase Import) ───

export interface VatInvoice {
  invoiceSerial: string;
  invoiceNumber: string;
  supplierName: string;
  supplierTaxCode: string;
  invoiceDate: string;
  totalAmount: number;
  fileUrl: string;
}

export interface ImportPurchaseItem {
  row: number;
  itemName: string;
  categoryCode: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  itemType: string;
  targetGroup: string;
  receivedDate: string;
  expiredDate?: string | null;
  notes?: string | null;
}

export type ImportRegularRequest = {
  invoices: Array<{
    vatInvoice: VatInvoice;
    items: ImportPurchaseItem[];
  }>;
};

// ─── Transaction History ───

export interface TransactionItem {
  itemId: number;
  itemName: string;
  quantityChange: number;
  formattedQuantityChange: string;
  unit: string;
  itemType: string;
  targetGroup: string;
  categoryName: string;
}

export interface TransactionEntity {
  transactionId: string;
  actionType: string;
  sourceType: string;
  sourceId: number | null;
  sourceName: string;
  performedByName: string;
  note: string;
  createdAt: string;
  items: TransactionItem[];
}

export interface GetDepotTransactionsParams {
  actionTypes?: string[];
  sourceTypes?: string[];
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Export Movements ───

export type ExportPeriodType = "ByDateRange" | "ByMonth";

export interface ExportMovementsParams {
  periodType: ExportPeriodType;
  /** Required when periodType = ByMonth */
  month?: number;
  /** Required when periodType = ByMonth */
  year?: number;
  /** Required when periodType = ByDateRange */
  fromDate?: string;
  /** Required when periodType = ByDateRange */
  toDate?: string;
}

export interface GetDepotTransactionsResponse {
  items: TransactionEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Search Depots by Relief Items ───

export interface SearchDepotsParams {
  itemModelIds: number[];
  quantities: number[];
  activeDepotsOnly?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface SearchDepotWarehouseEntity {
  depotId: number;
  depotName: string;
  depotAddress: string;
  depotStatus: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastStockedAt: string;
  distanceKm: number;
}

export interface SearchDepotItemEntity {
  itemModelId: number;
  itemModelName: string;
  categoryName: string;
  itemType: string;
  unit: string;
  totalAvailableAcrossWarehouses: number;
  warehouses: SearchDepotWarehouseEntity[];
}

export interface SearchDepotsResponse {
  items: SearchDepotItemEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Create Supply Requests ───

export interface CreateSupplyRequestItem {
  itemModelId: number;
  quantity: number;
}

export interface CreateSupplyRequestEntry {
  sourceDepotId: number;
  items: CreateSupplyRequestItem[];
  note?: string;
}

export interface CreateSupplyRequestsPayload {
  requests: CreateSupplyRequestEntry[];
}

// ─── Supply Requests List ───

export type SourceSupplyRequestStatus =
  | "Pending"
  | "Accepted"
  | "Preparing"
  | "Shipping"
  | "Completed"
  | "Rejected";

export type RequestingSupplyRequestStatus =
  | "WaitingForApproval"
  | "Approved"
  | "InTransit"
  | "Received"
  | "Rejected";

export type SupplyRequestRole = "Requester" | "Source";

export interface GetSupplyRequestsParams {
  sourceStatus?: SourceSupplyRequestStatus;
  requestingStatus?: RequestingSupplyRequestStatus;
  pageNumber?: number;
  pageSize?: number;
}

export interface SupplyRequestListReliefItem {
  itemModelId: number;
  itemModelName: string;
  unit: string;
  quantity: number;
}

export interface SupplyRequestListItem {
  id: number;
  requestingDepotId: number;
  requestingDepotName: string;
  sourceDepotId: number;
  sourceDepotName: string;
  role: SupplyRequestRole;
  sourceStatus: SourceSupplyRequestStatus;
  requestingStatus: RequestingSupplyRequestStatus;
  note: string | null;
  rejectedReason: string | null;
  requestedBy: string;
  createdAt: string;
  respondedAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  items: SupplyRequestListReliefItem[];
}

export interface GetSupplyRequestsResponse {
  items: SupplyRequestListItem[];
  pageNumber?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface RejectSupplyRequestPayload {
  reason: string;
}
export type GetDepotInventoryResponse = GetMyDepotInventoryResponse;
