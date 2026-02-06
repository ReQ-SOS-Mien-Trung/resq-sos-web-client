// Depot Status
export type DepotStatus =
  | "Available"
  | "Full"
  | "Unavailable"
  | "PendingAssignment"
  | "Closed";

// Depot Status Metadata (from /logistics/depot/metadata/depot-statuses)
export interface DepotStatusMetadata {
  key: DepotStatus;
  label: string;
}

// Depot Entity
export interface DepotEntity {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  currentUtilization: number;
  status: DepotStatus;
  depotManagerId: string | null;
  lastUpdatedAt: string;
}

// Paginated Response for Depots
export interface GetDepotsResponse {
  items: DepotEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query params for fetching depots
export interface GetDepotsParams {
  pageNumber?: number;
  pageSize?: number;
}

// Create Depot Request
export interface CreateDepotRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
}

// Update Depot Status Request
export interface UpdateDepotStatusRequest {
  id: number;
  status: DepotStatus;
}

// Update Depot Status Response
export interface UpdateDepotStatusResponse {
  id: number;
  status: DepotStatus;
  message: string;
}
