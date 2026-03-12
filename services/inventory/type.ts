// Item Type
export type ItemType = "Consumable" | "Reusable" | "Equipment";

// Target Group
export type TargetGroup = "General" | "Children" | "Elderly" | "Pregnant";

// Inventory Item Entity
export interface InventoryItem {
  reliefItemId: number;
  reliefItemName: string;
  categoryId: number;
  categoryName: string;
  itemType: ItemType;
  targetGroup: TargetGroup;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastStockedAt: string;
}

// Paginated Response for Inventory
export interface GetInventoryResponse {
  items: InventoryItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Query params for fetching inventory by depot
export interface GetInventoryParams {
  depotId: number;
  categoryIds?: number[];
  itemTypes?: ItemType[];
  targetGroups?: TargetGroup[];
  pageNumber?: number;
  pageSize?: number;
}
