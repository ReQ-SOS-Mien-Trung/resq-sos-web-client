// Depot Status
export type DepotStatus = "Available" | "Full" | "PendingAssignment" | "Closed";

// Depot Status Metadata (from /logistics/depot/metadata/depot-statuses)
export interface DepotStatusMetadata {
  key: DepotStatus;
  label: string;
}

// Depot Metadata (from /logistics/depot/metadata/depots) - key/value pairs
export interface DepotMetadataItem {
  key: number;
  value: string;
}

// Depot Manager
export interface DepotManager {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
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
  manager: DepotManager | null;
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

// Update Depot Request
export interface UpdateDepotRequest {
  id: number;
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

// Depot Fund (from /logistics/depot/funds & /logistics/depot/my-fund)
export interface DepotFund {
  depotId: number;
  depotName: string;
  balance: number;
  /** Giới hạn ứng trước tối đa (số dư có thể xuống đến −maxAdvanceLimit) */
  maxAdvanceLimit: number;
  lastUpdatedAt: string;
}
