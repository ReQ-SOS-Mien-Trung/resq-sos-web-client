export type RescuerType = "Volunteer" | "Core" | null;

export interface FreeRescuerEntity {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  rescuerType: RescuerType;
  address: string | null;
  ward: string | null;
  province: string | null;
  topAbilities: string[];
}

export interface GetFreeRescuersParams {
  pageNumber?: number;
  pageSize?: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  rescuerType?: Exclude<RescuerType, null>;
}

export interface GetFreeRescuersResponse {
  items: FreeRescuerEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
