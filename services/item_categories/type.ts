// Item Category Code
export type ItemCategoryCode =
  | "Food"
  | "Water"
  | "Medical"
  | "Hygiene"
  | "Shelter"
  | "Clothing"
  | "RescueEquipment"
  | "Others";

// Item Category Entity
export interface ItemCategoryEntity {
  id: number;
  code: string;
  name: string;
  quantity: number;
  description: string;
}

// Paginated Response for Item Categories
export interface GetItemCategoriesResponse {
  items: ItemCategoryEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query params for fetching item categories
export interface GetItemCategoriesParams {
  pageNumber?: number;
  pageSize?: number;
}

// Item Category Code Option
export interface ItemCategoryCodeOption {
  value: number;
  name: string;
}
