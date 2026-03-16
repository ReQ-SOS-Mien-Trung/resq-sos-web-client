export interface InventoryCategory {
  key: string;
  value: string;
}

export type InventoryItemType = InventoryCategory;

export type InventoryTargetGroup = InventoryCategory;

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

export type GetDepotInventoryResponse = GetMyDepotInventoryResponse;
