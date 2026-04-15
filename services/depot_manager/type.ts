// Depot Manager Entity
export interface DepotManagerEntity {
  userId: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
  phone: string;
  assignedAt: string;
  unassignedAt: string | null;
  isCurrent: boolean;
}

// Paginated Response for Depot Managers
export interface GetDepotManagersResponse {
  items: DepotManagerEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query params for fetching depot managers
export interface GetDepotManagersParams {
  depotId: number;
  pageNumber?: number;
  pageSize?: number;
}
