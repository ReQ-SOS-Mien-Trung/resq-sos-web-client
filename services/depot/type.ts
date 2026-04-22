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

export type ChangeableDepotStatus = "Available" | "Unavailable";

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

export type DepotClosureTransferStatus =
  | "AwaitingPreparation"
  | "Preparing"
  | "Shipping"
  | "Completed"
  | "Received"
  | "Cancelled";

export interface DepotClosureTransferStatusMetadata {
  key: DepotClosureTransferStatus | string;
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
  assignedDepotsCount: number;
}

export interface GetAvailableDepotManagersParams {
  depotId?: number;
}

export interface DepotActiveManager {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  assignedAt: string;
}

export interface ManagedDepotSummary {
  depotId: number;
  depotName: string;
  status: DepotStatus | string;
  address: string;
  imageUrl?: string | null;
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
  weightCapacity?: number;
  currentUtilization: number;
  currentWeightUtilization?: number;
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
  weightCapacity: number;
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
  weightCapacity?: number;
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

export interface InitiateDepotClosingRequest {
  id: number;
}

export interface InitiateDepotClosingResponse {
  depotId: number;
  closureId: number;
  status: DepotStatus | string;
  message: string;
}

export interface AssignDepotManagerRequest {
  id: number;
  managerIds: string[];
}

export interface UnassignDepotManagerRequest {
  id: number;
  userIds?: string[];
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

export interface GetDepotFundsParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
}

export interface GetDepotFundsResponse {
  items: DepotFund[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
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
  depotId: number;
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
  depotId: number;
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
  /** ExternalResolution once mark-external is confirmed */
  resolutionType?: string | null;
  /** Number of remaining item lines at the time of marking */
  remainingItemCount?: number;
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
  depotId: number;
  items: DepotExternalResolutionItem[];
}

export interface SubmitDepotExternalResolutionResponse {
  closureId?: number;
  depotId?: number;
  depotName?: string;
  processedItemCount?: number;
  soldRevenue?: number;
  snapshotConsumableUnits?: number;
  snapshotReusableUnits?: number;
  reusableItemsSkipped?: number;
  /** Completed once external resolution is uploaded */
  closureStatus?: string;
  resolutionType?: string;
  completedAt?: string | null;
  message: string;
}

export interface DepotExternalResolutionState {
  depotId: number;
  closureId: number;
  hasActiveExternalResolution: boolean;
  canDownloadExternalTemplate: boolean;
  canUploadExternalResolution: boolean;
  closureStatus: string;
  resolutionType: string | null;
  externalNote: string | null;
  remainingItemCount: number;
}

export interface DepotClosureRemainingInventoryItem {
  itemModelId: number;
  itemName: string;
  categoryName?: string | null;
  itemType: string;
  unit?: string | null;
  quantity: number;
  /** Current quantity in depot at query time (new hybrid field) */
  currentQuantity?: number | null;
  /** How much was assigned to the current batch (new hybrid field) */
  assignedQuantity?: number | null;
  /** How much is still transferable after current batch (new hybrid field) */
  remainingTransferableQuantity?: number | null;
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
  weightCapacity?: number;
  currentUtilization: number;
  currentWeightUtilization?: number;
  remainingVolume: number;
  remainingWeight: number;
  distanceKm?: number;
  /** Hạng ưu tiên của kho trong phương án suggest, 1 là tốt nhất */
  recommendationRank?: number;
  /** Số dòng hàng được đẩy vào kho này */
  suggestedItemLineCount?: number;
  /** Tổng số đơn vị hàng được đẩy vào kho này */
  suggestedUnitCount?: number;
  /** Tổng thể tích backend dự tính đưa vào kho này */
  plannedVolume?: number;
  /** Tổng khối lượng backend dự tính đưa vào kho này */
  plannedWeight?: number;
  /** Thể tích còn trống sau khi áp phương án suggest */
  projectedRemainingVolume?: number;
  /** Khối lượng còn trống sau khi áp phương án suggest */
  projectedRemainingWeight?: number;
  /** Câu giải thích ngắn vì sao kho này được xếp hạng như vậy */
  recommendationReason?: string | null;
}

export type DepotClosureAllocationMode =
  | "FullFitSingleDepot"
  | "Consolidated"
  | "SplitByCapacity"
  | "Unallocated"
  | string;

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
  distanceKm?: number;
  /** Hạng của kho đích chứa dòng này */
  recommendationRank?: number;
  /** Cách backend phân bổ dòng này */
  allocationMode?: DepotClosureAllocationMode | null;
}

export interface DepotClosureTransferSuggestionsResponse {
  sourceDepotId: number;
  sourceDepotName: string;
  totalVolumeToTransfer: number;
  totalWeightToTransfer: number;
  unallocatedVolume: number;
  unallocatedWeight: number;
  /** Số kho đích thực sự được dùng trong phương án suggest */
  suggestedTargetDepotCount?: number;
  /** Số dòng hàng chưa phân được */
  unallocatedItemLineCount?: number;
  /** Mô tả ngắn chiến lược suggest của backend */
  recommendationStrategy?: string | null;
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

/** One item within a transfer batch response */
export interface DepotClosureTransferBatchItem {
  itemModelId: number;
  itemName: string;
  itemType: string;
  unit?: string | null;
  quantity: number;
}

/** One transfer record inside the batch transfer response */
export interface DepotClosureTransferBatch {
  transferId: number;
  targetDepotId: number;
  targetDepotName: string;
  transferStatus: string;
  snapshotConsumableUnits: number;
  snapshotReusableUnits: number;
  items: DepotClosureTransferBatchItem[];
}

export interface InitiateDepotClosureTransferResponse {
  closureId?: number;
  sourceDepotId?: number;
  sourceDepotName?: string;
  /** New: per-target-depot transfer records */
  transfers?: DepotClosureTransferBatch[];
  reusableItemsSkipped?: number;
  /** New: true when some items could not be allocated in this batch */
  hasRemainingItems?: boolean;
  /** New: items left over after this batch (mirrors DepotClosureRemainingInventoryItem) */
  remainingItems?: DepotClosureRemainingInventoryItem[];
  // Legacy / compatibility fields
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
  targetDepotId: number | null;
  targetDepotName: string | null;
  status: string;
}

export type GetDepotClosuresListByDepotIdResponse = Array<{
  id: number;
  depotId: number;
  depotRole: string | null;
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
  transfers: DepotClosureTransferSummary[];
}>;

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
  processedByFullName?: string | null;
  processedAt: string;
  createdAt: string;
}

export interface DepotClosureDetailTransferItem {
  itemModelId: number;
  itemName: string;
  itemType: string;
  unit: string | null;
  quantity: number;
}

export interface DepotClosureDetailTransfer {
  id: number;
  closureId: number;
  sourceDepotId: number;
  sourceDepotName: string | null;
  targetDepotId: number;
  targetDepotName: string | null;
  status: string;
  createdAt: string;
  snapshotConsumableUnits: number;
  snapshotReusableUnits: number;
  shippedAt: string | null;
  shippedBy: string | null;
  shippedByName?: string | null;
  shipNote: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
  receivedByName?: string | null;
  receiveNote: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  items: DepotClosureDetailTransferItem[];
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
  /** true nếu còn transfer chưa hoàn tất */
  hasOpenTransfers?: boolean;
  /** true nếu kho vẫn còn hàng tồn cần xử lý */
  hasRemainingItems?: boolean;
  /** Số dòng vật phẩm còn lại */
  remainingItemCount?: number;
  /** true nếu còn vật phẩm có thể tiếp tục điều chuyển */
  hasTransferableRemainingItems?: boolean;
  /** Số dòng vật phẩm còn có thể điều chuyển */
  transferableRemainingItemCount?: number;
  /** Số đơn vị còn có thể điều chuyển */
  transferableRemainingUnitCount?: number;
  /** Số dòng vật phẩm đang bị chặn */
  blockedRemainingItemCount?: number;
  /** Số đơn vị đang bị chặn */
  blockedRemainingUnitCount?: number;
  /** true nếu đang có blocker khiến chưa thể đóng kho */
  hasClosingBlockers?: boolean;
  /** Số dòng vật phẩm tiêu hao đang bị reserve */
  reservedConsumableItemCount?: number;
  /** Số đơn vị vật phẩm tiêu hao đang bị reserve */
  reservedConsumableUnitCount?: number;
  /** Số model vật phẩm tái sử dụng chưa ở trạng thái khả dụng */
  nonAvailableReusableItemModelCount?: number;
  /** Số đơn vị vật phẩm tái sử dụng chưa ở trạng thái khả dụng */
  nonAvailableReusableUnitCount?: number;
  /** true → FE hiện các nút chọn phương án xử lý tồn kho */
  canSelectResolutionOption?: boolean;
  /** true → FE hiện nút xác nhận đóng kho (POST /closed) */
  canConfirmClose?: boolean;
  /** true → FE cho tải file mẫu xử lý bên ngoài ngay trên detail */
  canDownloadExternalTemplate?: boolean;
  /** true → FE cho upload kết quả xử lý bên ngoài ngay trên detail */
  canUploadExternalResolution?: boolean;
  /** true nếu closure đã từng có ít nhất một transfer record */
  hasTransferRecords?: boolean;
  /** true nếu closure đã từng có ít nhất một external resolution record */
  hasExternalResolutionRecords?: boolean;
  transferDetail: DepotClosureDetailTransfer | null;
  /** Danh sách tất cả các transfer trong closure này */
  transferDetails?: DepotClosureDetailTransfer[];
  externalItems: DepotExternalResolvedItem[];
  remainingInventoryItems?: DepotClosureRemainingInventoryItem[] | null;
}

// ── Cancel Depot Closure Transfer ────────────────────────────────────────────
// DELETE /logistics/depot/{id}/close/transfer/{transferId}
export interface CancelDepotClosureTransferRequest {
  /** Source depot ID */
  id: number;
  transferId: number;
  reason?: string | null;
}

export interface CancelDepotClosureTransferResponse {
  transferId: number;
  depotId: number;
  transferStatus: string;
  closureId?: number;
  /** Updated closure status: InProgress if more items remain, Completed if done */
  closureStatus?: string;
  /** true when admin still needs to create a new batch or mark external */
  requiresFurtherResolution?: boolean;
  /** Number of item lines still in depot after cancel */
  remainingItemCount?: number;
  cancelledAt?: string;
  message: string;
}

// ── Depot Closure Transfer ─────────────────────────────────────

// GET /logistics/depot/{id}/close/transfer/{transferId}
export interface DepotClosureTransfer {
  id: number;
  closureId: number;
  sourceDepotId: number;
  sourceDepotName: string | null;
  targetDepotId: number;
  targetDepotName: string | null;
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
  items: DepotClosureDetailTransferItem[];
}

// POST prepare / ship / complete / receive — shared request & response
export interface DepotTransferActionRequest {
  transferId: number;
  depotId: number;
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
  /** New: updated closure status after receive */
  closureStatus?: string;
  consumableUnitsMoved: number;
  reusableItemsMoved: number;
  /** New: true when more transfers or mark-external is still needed */
  requiresFurtherResolution?: boolean;
  /** New: number of item lines still remaining in depot */
  remainingItemCount?: number;
  completedAt: string;
  message: string;
}

// ─── Chart: Capacity ───────────────────────────────────────────────────────
// GET /logistics/depot/{id}/chart/capacity
export interface DepotCapacityChartResponse {
  depotId: number;
  depotName: string;
  currentVolume: number;
  maxVolume: number;
  volumeUsagePercent: number;
  currentWeight: number;
  maxWeight: number;
  weightUsagePercent: number;
}

// ─── Chart: Inventory Movement ────────────────────────────────────────────
// GET /logistics/depot/{id}/chart/inventory-movement
export interface InventoryMovementDataPoint {
  date: string;
  totalIn: number;
  totalOut: number;
  totalAdjust: number;
}

export interface DepotInventoryMovementChartResponse {
  depotId: number;
  depotName: string;
  from: string;
  to: string;
  dataPoints: InventoryMovementDataPoint[];
}

export interface GetDepotInventoryMovementParams {
  from?: string;
  to?: string;
}

// ─── Chart: Fund Movement ─────────────────────────────────────────────────
// GET /finance/depot-funds/{depotId}/chart/fund-movement
export interface FundMovementDataPoint {
  date: string;
  totalIn: number;
  totalOut: number;
}

export interface DepotFundMovementChartResponse {
  depotId: number;
  depotName: string;
  from: string;
  to: string;
  dataPoints: FundMovementDataPoint[];
}

export interface GetDepotFundMovementParams {
  from?: string;
  to?: string;
}

// ─── Fund Transactions by FundId ─────────────────────────────────────────────
// GET /finance/depot-funds/{fundId}/fund-transactions

export type DepotFundReferenceType = "CampaignDisbursement" | "VatInvoice";

export interface FundTransactionDetail {
  id: number;
  depotFundId: number;
  transactionType: string;
  amount: number;
  referenceType: string;
  referenceId: number | null;
  note: string;
  createdBy: string;
  createdAt: string;
  contributorName: string | null;
  contributorPhoneNumber: string | null;
  contributorTotalAdvancedAmount: number;
  contributorTotalRepaidAmount: number;
  contributorOutstandingAmount: number;
  contributorRepaidPercentage: number;
}

export interface GetFundTransactionsByFundIdParams {
  depotId: number;
  pageNumber?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  referenceTypes?: DepotFundReferenceType[];
  search?: string;
}

export interface GetFundTransactionsByFundIdResponse {
  items: FundTransactionDetail[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
