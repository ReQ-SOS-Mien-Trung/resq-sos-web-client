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

export interface InventoryItemEntity {
  reliefItemId: number;
  reliefItemName: string;
  categoryId: number;
  categoryName: string;
  itemType: string;
  targetGroup: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastStockedAt: string;
}

export interface GetMyDepotInventoryParams {
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
  reliefItemIds: number[];
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
  reliefItemId: number;
  reliefItemName: string;
  categoryName: string;
  itemType: string;
  unit: string;
  totalAvailableAcrossWarehouses: number;
  warehouses: SearchDepotWarehouseEntity[];
}

export interface SearchDepotsResponse {
  items: SearchDepotItemEntity[];
}
