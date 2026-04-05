// Depot Status
export type DepotStatus =
  | "Available"
  | "Full"
  | "PendingAssignment"
  | "Closed"
  | "Closing"
  | "UnderMaintenance";

// Depot Status Metadata (from /logistics/depot/metadata/depot-statuses)
export interface DepotStatusMetadata {
  key: DepotStatus;
  value: string;
}

// Depot Metadata (from /logistics/depot/metadata/depots) - key/value pairs
export interface DepotMetadataItem {
  key: number;
  value: string;
}

// Depot Manager
export interface DepotManager {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  fullName?: string | null;
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
  imageUrl?: string | null;
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

// Depot Fund Transaction (from /finance/depot-funds/my/transactions)
export interface DepotFundTransaction {
  id: number;
  depotFundId: number;
  transactionType: string;
  amount: number;
  referenceType: string;
  referenceId: number | null;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface GetDepotFundTransactionsResponse {
  items: DepotFundTransaction[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface GetDepotFundTransactionsParams {
  pageNumber?: number;
  pageSize?: number;
}

// Depot Closure Resolution Type
export type DepotClosureResolutionType =
  | "TransferToDepot"
  | "ExternalResolution";

// Depot Closure Metadata item
export interface DepotClosureResolutionTypeItem {
  key: DepotClosureResolutionType;
  value: string;
}

// Response from GET /logistics/depot/metadata/closure
export interface DepotClosureMetadata {
  resolutionTypes: DepotClosureResolutionTypeItem[];
}

// Initiate Depot Closure (POST /logistics/depot/{id}/close/initiate)
export interface InitiateDepotClosureRequest {
  id: number;
  reason: string;
}

export interface InitiateDepotClosureResponse {
  closureId: number;
  depotId: number;
  status: string;
  message: string;
}

// Resolve Depot Closure (POST /logistics/depot/{id}/close/{closureId}/resolve)
export interface ResolveDepotClosureRequest {
  id: number;
  closureId: number;
  resolutionType: DepotClosureResolutionType;
  targetDepotId?: number;
  externalNote?: string;
}

export interface ResolveDepotClosureResponse {
  closureId: number;
  depotId: number;
  status: string;
  message: string;
}

// Cancel Depot Closure (POST /logistics/depot/{id}/close/{closureId}/cancel)
export interface CancelDepotClosureRequest {
  id: number;
  closureId: number;
  cancellationReason: string;
}

export interface CancelDepotClosureResponse {
  closureId: number;
  depotId: number;
  status: string;
  message: string;
}

// ── Depot Closure Transfer ─────────────────────────────────────

// GET /logistics/depot/{id}/close/{closureId}/transfer/{transferId}
export interface DepotClosureTransfer {
  id: number;
  closureId: number;
  sourceDepotId: number;
  targetDepotId: number;
  status: string;
  createdAt: string;
  transferDeadlineAt: string | null;
  snapshotConsumableUnits: number;
  snapshotReusableUnits: number;
  shippedAt: string | null;
  shippedBy: string | null;
  shipNote: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
  receiveNote: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
}

// POST prepare / ship / complete / receive — shared request & response
export interface DepotTransferActionRequest {
  id: number; // depotId
  closureId: number;
  transferId: number;
  note?: string;
}

export type DepotTransferActionResponse = DepotClosureTransfer;
