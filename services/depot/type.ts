// Depot Status
export type DepotStatus =
  | "Created"
  | "Available"
  | "Unavailable"
  | "Full"
  | "PendingAssignment"
  | "Closed"
  | "Closing"
  | "UnderMaintenance";

export type ChangeableDepotStatus = "Available" | "Unavailable" | "Closing";

// Depot Status Metadata (from /logistics/depot/metadata/depot-statuses)
export interface DepotStatusMetadata {
  key: DepotStatus | ChangeableDepotStatus;
  value: string;
}

// Depot Changeable Status Metadata
export interface ChangeableDepotStatusMetadata {
  key: ChangeableDepotStatus;
  value: string;
}

// Depot Metadata (from /logistics/depot/metadata/depots) - key/value pairs
export interface DepotMetadataItem {
  key: number;
  value: string;
}

export interface DepotClosureResolutionMetadataItem {
  key: "TransferToDepot" | "ExternalResolution" | string;
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
  status: ChangeableDepotStatus;
}

// Update Depot Status Response
export interface UpdateDepotStatusResponse {
  id: number;
  status: ChangeableDepotStatus;
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

export interface DepotFundSource {
  id: number;
  depotId: number;
  depotName: string;
  balance: number;
  fundSourceType: string;
  fundSourceName: string;
  lastUpdatedAt: string;
}

export interface AdminDepotFundSource {
  id: number;
  balance: number;
  fundSourceType: string;
  fundSourceName: string;
  lastUpdatedAt: string;
}

// Depot Fund Summary (from /logistics/depot/funds)
export interface DepotFund {
  depotId: number;
  depotName: string;
  advanceLimit: number;
  outstandingAdvanceAmount: number;
  funds: AdminDepotFundSource[];
}

// My Depot Fund Ledger (from /finance/depot-funds/my)
export interface MyDepotFund {
  advanceLimit: number;
  outstandingAdvanceAmount: number;
  funds: DepotFundSource[];
}

// Depot Fund Transaction (from /finance/depot-funds/my/transactions)
export interface DepotFundTransaction {
  id: number;
  depotFundId: number;
  ledgerEntryId?: number | string | null;
  transactionType: string;
  amount: number;
  referenceType: string;
  referenceId: number | null;
  contributorName?: string | null;
  phoneNumber?: string | null;
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

// Depot Advancer (from /finance/depot-funds/my/advancers)
export interface DepotAdvancer {
  contributorName: string;
  contributorPhoneNumber: string;
  totalAdvancedAmount: number;
  totalRepaidAmount: number;
  outstandingAmount: number;
  repaidPercentage: number;
}

export interface GetMyDepotAdvancersResponse {
  items: DepotAdvancer[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface GetMyDepotAdvancersParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateInternalAdvanceItem {
  amount: number;
  contributorName: string;
  phoneNumber: string;
}

export type CreateInternalAdvanceRequest = CreateInternalAdvanceItem[];

export interface CreateInternalRepaymentItem {
  depotFundId: number;
  amount: number;
}

export interface CreateInternalRepaymentRequest {
  contributorName: string;
  phoneNumber: string;
  repayments: CreateInternalRepaymentItem[];
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
  httpStatus?: number;
  closureId?: number;
  depotId?: number;
  depotName?: string;
  closureStatus?: DepotClosureStatus | string;
  requiresResolution?: boolean;
  inventorySummary?: {
    consumableItemTypeCount: number;
    consumableUnitTotal: number;
    reusableAvailableCount: number;
    reusableInUseCount: number;
  } | null;
  remainingItems?: DepotClosureRemainingInventoryItem[] | null;
  remainingInventoryItems?: DepotClosureRemainingInventoryItem[] | null;
  closingTimeoutAt?: string | null;
  timeoutAt?: string | null;
  message: string;
}

export interface MarkDepotClosureExternalRequest {
  id: number;
  reason: string;
}

export interface MarkDepotClosureExternalResponse {
  closureId?: number;
  depotId?: number;
  depotName?: string;
  closureStatus?: DepotClosureStatus | string;
  message: string;
}

export interface DepotExternalResolutionItem {
  rowNumber: number;
  itemName: string;
  categoryName: string;
  targetGroup: string;
  itemType: string;
  unit: string;
  receivedDate?: string | null;
  expiredDate?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  handlingMethod: string;
  recipient: string;
  note?: string | null;
  imageUrl?: string | null;
}

export interface SubmitDepotExternalResolutionRequest {
  items: DepotExternalResolutionItem[];
}

export interface SubmitDepotExternalResolutionResponse {
  closureId?: number;
  depotId?: number;
  completedAt?: string | null;
  message: string;
}

export interface DepotClosureRemainingInventoryItem {
  itemModelId: number;
  itemName: string;
  categoryName?: string | null;
  itemType: string;
  unit?: string | null;
  quantity: number;
  blockedQuantity?: number | null;
  transferableQuantity?: number | null;
  volumePerUnit?: number | null;
  weightPerUnit?: number | null;
  WeightPerUnit?: number | null;
  imageUrl?: string | null;
  receivedDate?: string | null;
  expiredDate?: string | null;
}

export interface DepotClosureTransferSuggestionTargetMetric {
  depotId: number;
  depotName: string;
  capacity: number;
  currentUtilization: number;
  remainingVolume: number;
  remainingWeight: number;
}

export interface DepotClosureSuggestedTransfer {
  targetDepotId: number | null;
  targetDepotName: string | null;
  itemModelId: number;
  itemName: string;
  itemType: string;
  unit?: string | null;
  suggestedQuantity: number;
  totalVolume: number;
  totalWeight: number;
}

export interface DepotClosureTransferSuggestionsResponse {
  sourceDepotId: number;
  sourceDepotName: string;
  totalVolumeToTransfer: number;
  totalWeightToTransfer: number;
  unallocatedVolume: number;
  unallocatedWeight: number;
  targetDepotMetrics: DepotClosureTransferSuggestionTargetMetric[];
  suggestedTransfers: DepotClosureSuggestedTransfer[];
}

export interface DepotClosureTransferAssignmentItem {
  itemModelId: number;
  itemType: string;
  quantity: number;
}

export interface DepotClosureTransferAssignment {
  targetDepotId: number;
  items: DepotClosureTransferAssignmentItem[];
}

export interface InitiateDepotClosureTransferRequest {
  id: number;
  reason: string;
  assignments: DepotClosureTransferAssignment[];
}

export interface InitiateDepotClosureTransferResponse {
  closureId?: number;
  depotId?: number;
  transferId?: number;
  transferIds?: number[];
  targetDepotId?: number;
  targetDepotName?: string;
  assignmentsCount?: number;
  transferStatus?: string;
  message: string;
}

export interface DepotClosureTransferSummary {
  transferId: number;
  status: string;
}

export interface DepotTransferListItem {
  transferId: number;
  closureId: number;
  sourceDepotId: number;
  sourceDepotName: string;
  targetDepotId: number;
  targetDepotName: string;
  status: string;
  userRole: string;
  relatedDepotId: number;
  relatedDepotName: string;
  counterpartyDepotId: number;
  counterpartyDepotName: string;
  createdAt: string;
  snapshotConsumableUnits: number;
  snapshotReusableUnits: number;
  shippedAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
}

export type GetMyDepotTransfersResponse = DepotTransferListItem[];

export interface DepotExternalResolvedItem {
  id: number;
  itemName: string;
  categoryName: string;
  itemType: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  handlingMethod: string;
  handlingMethodDisplay: string;
  recipient: string;
  note: string | null;
  imageUrl: string | null;
  processedBy: string;
  processedAt: string;
  createdAt: string;
}

export interface DepotClosureDetailTransfer {
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

export interface DepotClosureListItem {
  id: number;
  depotId: number;
  depotRole?: string | null;
  status: string;
  previousStatus: string | null;
  closeReason: string;
  resolutionType: string | null;
  targetDepotId: number | null;
  targetDepotName: string | null;
  externalNote: string | null;
  initiatedBy: string;
  initiatedByFullName: string | null;
  cancelledBy: string | null;
  cancelledByFullName: string | null;
  cancellationReason: string | null;
  snapshotConsumableUnits: number;
  snapshotReusableUnits: number;
  initiatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  transfer: DepotClosureTransferSummary | null;
  remainingInventoryItems?: DepotClosureRemainingInventoryItem[] | null;
}

export type GetMyDepotClosuresResponse = DepotClosureListItem[];

export interface DepotClosureDetail {
  id: number;
  depotId: number;
  depotName: string;
  status: string;
  previousStatus: string | null;
  closeReason: string;
  resolutionType: string | null;
  targetDepotId: number | null;
  targetDepotName: string | null;
  externalNote: string | null;
  initiatedBy: string;
  initiatedByFullName: string | null;
  cancelledBy: string | null;
  cancelledByFullName: string | null;
  cancellationReason: string | null;
  snapshotConsumableUnits: number;
  snapshotReusableUnits: number;
  actualConsumableUnits: number;
  actualReusableUnits: number;
  driftNote: string | null;
  failureReason: string | null;
  isForced: boolean;
  forceReason: string | null;
  initiatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  transferDetail: DepotClosureDetailTransfer | null;
  externalItems: DepotExternalResolvedItem[];
  remainingInventoryItems?: DepotClosureRemainingInventoryItem[] | null;
}

// ── Depot Closure Transfer ─────────────────────────────────────

// GET /logistics/depot/{id}/transfer/{transferId}
export interface DepotClosureTransfer {
  id: number;
  closureId?: number;
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

// POST prepare / ship / complete / receive — shared request & response
export interface DepotTransferActionRequest {
  transferId: number;
  sourceDepotId?: number;
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
  closureId?: number;
  transferStatus: string;
  consumableUnitsMoved: number;
  reusableItemsMoved: number;
  completedAt: string;
  message: string;
}
