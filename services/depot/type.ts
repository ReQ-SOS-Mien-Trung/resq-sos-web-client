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

export interface DepotByClusterEntity {
  id: number;
  name: string;
  address: string;
  status: DepotStatus | string;
  capacity: number;
  currentUtilization: number;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

export type GetDepotsByClusterResponse = DepotByClusterEntity[];

export interface AvailableDepotManager {
  id: string;
  fullName: string;
  email: string;
  phone: string;
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

// Active Request attached to a depot (from GET /logistics/depot)
export interface DepotActiveRequest {
  id: number;
  requestingDepotId: number;
  requestingDepotName: string;
  sourceDepotId: number;
  sourceDepotName: string;
  role: string; // "Requester" | "Source"
  priorityLevel: string; // "Low" | "Medium" | "High" | "Critical"
  sourceStatus: string;
  requestingStatus: string;
  createdAt: string;
  autoRejectAt: string | null;
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
  requests: DepotActiveRequest[];
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
  search?: string;
  statuses?: string[];
}

// Create Depot Request
export interface CreateDepotRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  managerId?: string;
  imageUrl?: string;
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

export interface AssignDepotManagerRequest {
  id: number;
  managerId: string;
}

export interface UnassignDepotManagerRequest {
  id: number;
}

export interface DepotManagerAssignmentResponse {
  depotId: number;
  depotName: string;
  status: DepotStatus | string;
  assignedAt?: string;
  unassignedAt?: string;
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

export type DepotClosureStatus =
  | "InProgress"
  | "Processing"
  | "TransferPending"
  | "Completed"
  | "Cancelled"
  | "TimedOut";

// Initiate Depot Closure (POST /logistics/depot/{id}/close)
export interface InitiateDepotClosureRequest {
  id: number;
  reason: string;
}

export interface InitiateDepotClosureResponse {
  closureId: number;
  depotId: number;
  depotName: string;
  closureStatus: DepotClosureStatus;
  requiresResolution: boolean;
  inventorySummary: {
    consumableItemTypeCount: number;
    consumableUnitTotal: number;
    reusableAvailableCount: number;
    reusableInUseCount: number;
  } | null;
  closingTimeoutAt?: string | null;
  timeoutAt: string | null;
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
  depotName: string;
  resolutionType: string;
  completedAt: string | null;
  message: string;
  transferPending: boolean;
  transferId: number | null;
  transferSummary: {
    transferId: number;
    targetDepotId: number;
    targetDepotName: string;
    transferStatus: string;
    snapshotConsumableUnits: number;
    snapshotReusableUnits: number;
    reusableItemsSkipped: number;
  } | null;
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
  restoredStatus: string;
  cancelledAt: string;
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

// GET /logistics/depot/my-incoming-closure-transfer
export interface DepotIncomingClosureTransfer {
  sourceDepotId: number;
  closureId: number;
  transferId: number;
  targetDepotId: number | null;
  sourceDepotName: string | null;
  targetDepotName: string | null;
  closureStatus: string | null;
  transferStatus: string | null;
  snapshotConsumableUnits: number | null;
  snapshotReusableUnits: number | null;
  closingTimeoutAt: string | null;
  createdAt: string | null;
}

// GET /logistics/depot/{id}/closures — summary of a transfer inside a closure
export interface DepotClosureTransferSummary {
  transferId: number;
  status: string;
}

// GET /logistics/depot/{id}/closures — one closure record
export interface DepotClosureRecord {
  id: number;
  depotId: number;
  sourceDepotName?: string | null;
  status: string;
  previousStatus: string;
  closeReason: string;
  resolutionType: string | null;
  targetDepotId: number | null;
  targetDepotName: string | null;
  externalNote: string | null;
  initiatedBy: string;
  initiatedByFullName: string;
  cancelledBy: string | null;
  cancelledByFullName: string | null;
  cancellationReason: string | null;
  snapshotConsumableUnits: number;
  snapshotReusableUnits: number;
  initiatedAt: string;
  closingTimeoutAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  transfer: DepotClosureTransferSummary | null;
}

// POST prepare / ship / complete / receive — shared request & response
export interface DepotTransferActionRequest {
  id: number; // depotId
  closureId: number;
  transferId: number;
  note?: string;
}

// POST .../prepare  |  .../ship  |  .../complete
export interface DepotTransferActionResponse {
  transferId: number;
  transferStatus: string;
  message: string;
}

// POST .../receive — bulk transfer + closure finalisation
export interface DepotReceiveTransferResponse {
  transferId: number;
  closureId: number;
  transferStatus: string;
  consumableUnitsMoved: number;
  reusableItemsMoved: number;
  completedAt: string;
  message: string;
}
