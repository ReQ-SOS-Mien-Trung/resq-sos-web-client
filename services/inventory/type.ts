export interface InventoryCategory {
  key: string;
  value: string;
}

export interface MyDepotCategoryQuantityItem {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  totalConsumableQuantity: number;
  availableConsumableQuantity: number;
  totalReusableUnits: number;
  availableReusableUnits: number;
}

export type GetMyDepotCategoryQuantitiesResponse =
  MyDepotCategoryQuantityItem[];

export interface GetMyDepotCategoryQuantitiesParams {
  depotId: number;
}

export type InventoryItemType = InventoryCategory;

export type InventoryTargetGroup = InventoryCategory;

export type InventoryOrganization = InventoryCategory;

export type InventoryActionType = InventoryCategory;

export type InventorySourceType = InventoryCategory;

export type InventoryReliefItem = InventoryCategory;

export interface InventoryItemModelMetadata {
  key: number;
  value: string;
}

export type ReusableItemCondition = InventoryCategory;

export interface ReusableBreakdown {
  totalUnits: number;
  availableUnits: number;
  totalReservedUnits: number;
  reservedForMissionUnits: number;
  reservedForTransferUnits: number;
  inTransitUnits: number;
  inUseUnits: number;
  maintenanceUnits: number;
  decommissionedUnits: number;
  goodCount: number;
  fairCount: number;
  poorCount: number;
  /** Legacy field from older payloads */
  reservedUnits?: number;
}

interface InventoryItemEntityBase {
  itemModelId: number;
  itemModelName: string;
  imageUrl?: string | null;
  categoryId: number;
  categoryName: string;
  targetGroups: string[];
  lastStockedAt: string | null;
  measurementUnit?: string | null;
  weightPerUnit?: number | null;
  volumePerUnit?: number | null;
}

export interface ConsumableItemEntity extends InventoryItemEntityBase {
  itemType: "Consumable";
  quantity: number;
  totalReservedQuantity: number;
  reservedForMissionQuantity: number;
  reservedForTransferQuantity: number;
  availableQuantity: number;
  reusableBreakdown?: null;
  /** Số lô hiện tại */
  lotCount?: number;
  /** Ngày hết hạn gần nhất trong các lô */
  nearestExpiryDate?: string | null;
  /** true nếu có lô sắp hết hạn */
  isExpiringSoon?: boolean;
  /** Legacy field from older payloads */
  reservedQuantity?: number;
}

export interface ReusableItemEntity extends InventoryItemEntityBase {
  itemType: "Reusable";
  /** Total unit count */
  unit: number;
  totalReservedUnits: number;
  reservedForMissionUnits: number;
  reservedForTransferUnits: number;
  availableUnit: number;
  reusableBreakdown?: ReusableBreakdown;
  /** Legacy fields from older payloads */
  reservedUnit?: number;
  reservedForMissionUnit?: number;
  reservedForTransferUnit?: number;
}

export type InventoryItemEntity = ConsumableItemEntity | ReusableItemEntity;

export interface GetMyDepotInventoryParams {
  depotId: number;
  categoryCode?: string[];
  itemTypes?: string[];
  targetGroups?: string[];
  pageNumber?: number;
  pageSize?: number;
}

export interface GetDepotInventoryParams {
  depotId: number;
  categoryIds?: number[];
  categoryCode?: string[];
  itemTypes?: string[];
  targetGroups?: string[];
  itemName?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface InventoryTotalsSummary {
  totalQuantity?: number | string | null;
  totalReservedQuantity?: number | string | null;
  totalAvailableQuantity?: number | string | null;
  totalStock?: number | string | null;
  reservedStock?: number | string | null;
  availableStock?: number | string | null;
}

export interface GetMyDepotInventoryResponse {
  items: InventoryItemEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  totalQuantity?: number | string | null;
  totalReservedQuantity?: number | string | null;
  totalAvailableQuantity?: number | string | null;
  totalStock?: number | string | null;
  reservedStock?: number | string | null;
  availableStock?: number | string | null;
  summary?: InventoryTotalsSummary;
}

// ─── Import from Organization ───

export interface ImportInventoryItem {
  row: number;
  itemModelId?: number;
  itemName: string;
  categoryCode: string;
  description?: string | null;
  imageUrl: string | null;
  quantity: number;
  unit: string;
  itemType: string;
  targetGroups: string[];
  volumePerUnit?: number | null;
  weightPerUnit?: number | null;
  receivedDate: string;
  expiredDate?: string | null;
}

export interface ImportInventoryRequest {
  depotId: number;
  organizationId?: number;
  organizationName?: string;
  batchNote?: string;
  items: ImportInventoryItem[];
}

// ─── VAT Invoice (Purchase Import) ───

export interface VatInvoice {
  invoiceSerial: string;
  invoiceNumber: string;
  supplierName: string;
  supplierTaxCode: string;
  invoiceDate: string;
  totalAmount: number;
  fileUrl: string;
}

export interface ImportPurchaseItem {
  row: number;
  itemModelId?: number;
  itemName: string;
  categoryCode: string;
  description?: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  unit: string;
  itemType: string;
  targetGroups: string[];
  volumePerUnit?: number | null;
  weightPerUnit?: number | null;
  receivedDate: string;
  expiredDate?: string | null;
}

export type ImportRegularRequest = {
  depotId: number;
  depotFundId?: number;
  invoices: Array<{
    batchNote?: string;
    vatInvoice: VatInvoice;
    items: ImportPurchaseItem[];
    campaignDisbursementId?: number;
  }>;
};

export interface DepotFundMetadataItem {
  key: string;
  value: string;
}

export interface UpdateItemModelPayload {
  categoryId: number;
  name: string;
  description?: string | null;
  unit: string;
  itemType: string;
  targetGroups: string[];
  imageUrl?: string | null;
  volumePerUnit: number;
  weightPerUnit: number;
}

// ─── Stock Movement History ───

export interface StockMovementLotDetail {
  lotId: number;
  receivedDate?: string | null;
  expiredDate?: string | null;
  quantityChange: number;
}

export interface StockMovementReusableDetail {
  reusableItemId: number;
  serialNumber?: string | null;
  quantityChange: number;
}

export interface StockMovementItem {
  itemId: number;
  itemModelId: number;
  actionType: string;
  note?: string | null;
  remainingQuantity: number | null;
  supplyInventoryLotId?: number | null;
  lotId?: number | null;
  reusableItemId?: number | null;
  serialNumber?: string | null;
  itemName: string;
  quantityChange: number;
  formattedQuantityChange: string;
  unit: string;
  itemType: string;
  targetGroup: string;
  categoryName: string;
  /** Ngày nhập lô (chỉ có với Consumable) */
  receivedDate?: string | null;
  /** Ngày hết hạn lô (chỉ có với Consumable) */
  expiredDate?: string | null;
  lotDetails?: StockMovementLotDetail[];
  reusableDetails?: StockMovementReusableDetail[];
}

export interface StockMovementEntity {
  transactionId: string;
  actionType: string;
  sourceType: string;
  sourceId: number | null;
  sourceName: string;
  performedByName: string;
  note: string | null;
  createdAt: string;
  items: StockMovementItem[];
  /** VAT Invoice fields – only present for Purchase imports */
  vatInvoiceId?: number | null;
  invoiceSerial?: string | null;
  invoiceNumber?: string | null;
  supplierName?: string | null;
  supplierTaxCode?: string | null;
  invoiceDate?: string | null;
  invoiceTotalAmount?: number | null;
  invoiceFileUrl?: string | null;
}

export interface GetDepotStockMovementsParams {
  depotId: number;
  itemModelId?: number;
  actionTypes?: string[];
  sourceTypes?: string[];
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Export Movements ───

export type ExportPeriodType = "ByDateRange" | "ByMonth";

export interface ExportMovementsParams {
  depotId: number;
  periodType: ExportPeriodType;
  /** Optional item model filter */
  itemModelId?: number;
  /** Required when periodType = ByMonth */
  month?: number;
  /** Required when periodType = ByMonth */
  year?: number;
  /** Required when periodType = ByDateRange */
  fromDate?: string;
  /** Required when periodType = ByDateRange */
  toDate?: string;
}

export interface GetDepotStockMovementsResponse {
  items: StockMovementEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Inventory Lots (FEFO) ───

export interface InventoryLotItem {
  lotId: number;
  quantity: number;
  remainingQuantity: number;
  receivedDate: string;
  expiredDate: string;
  sourceType: string;
  createdAt: string;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

export interface GetInventoryLotsResponse {
  items: InventoryLotItem[];
}

export interface GetInventoryLotsParams {
  itemModelId: number;
  depotId: number;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Search Depots by Relief Items ───

export interface SearchDepotsParams {
  itemModelIds: number[];
  quantities: number[];
  activeDepotsOnly?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface SearchDepotWarehouseEntity {
  depotId: number;
  depotName: string;
  depotAddress: string;
  depotStatus: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastStockedAt: string;
  distanceKm: number;
}

export interface SearchDepotItemEntity {
  itemModelId: number;
  itemModelName: string;
  categoryName: string;
  itemType: string;
  unit: string;
  measurementUnit?: string | null;
  totalAvailableAcrossWarehouses: number;
  warehouses: SearchDepotWarehouseEntity[];
}

export interface SearchDepotsResponse {
  items: SearchDepotItemEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Create Supply Requests ───

export interface CreateSupplyRequestItem {
  itemModelId: number;
  quantity: number;
}

export interface CreateSupplyRequestEntry {
  sourceDepotId: number;
  priorityLevel: string;
  items: CreateSupplyRequestItem[];
  note?: string;
}

export interface CreateSupplyRequestsPayload {
  depotId: number;
  requests: CreateSupplyRequestEntry[];
}

// ─── Supply Requests List ───

export type SourceSupplyRequestStatus =
  | "Pending"
  | "Accepted"
  | "Preparing"
  | "Shipping"
  | "Completed"
  | "Rejected";

export type RequestingSupplyRequestStatus =
  | "WaitingForApproval"
  | "Approved"
  | "InTransit"
  | "Received"
  | "Rejected";

export type SupplyRequestRole = "Requester" | "Source";

export interface GetSupplyRequestsParams {
  depotId: number;
  role?: SupplyRequestRole;
  sourceStatus?: SourceSupplyRequestStatus;
  requestingStatus?: RequestingSupplyRequestStatus;
  pageNumber?: number;
  pageSize?: number;
}

export interface SupplyRequestListReliefItem {
  itemModelId: number;
  itemModelName: string;
  unit: string;
  quantity: number;
}

export interface SupplyRequestListItem {
  id: number;
  requestingDepotId: number;
  requestingDepotName: string;
  sourceDepotId: number;
  sourceDepotName: string;
  priorityLevel: string | null;
  role: SupplyRequestRole;
  sourceStatus: SourceSupplyRequestStatus;
  requestingStatus: RequestingSupplyRequestStatus;
  note: string | null;
  rejectedReason: string | null;
  requestedBy: string;
  createdAt: string;
  responseDeadline: string | null;
  remainingSeconds: number | null;
  respondedAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  items: SupplyRequestListReliefItem[];
}

export interface GetSupplyRequestsResponse {
  items: SupplyRequestListItem[];
  pageNumber?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface RejectSupplyRequestPayload {
  reason: string;
}

export interface SupplyRequestActionParams {
  id: number;
  depotId: number;
}

export type GetDepotInventoryResponse = GetMyDepotInventoryResponse;

// ─── Upcoming Pickups (My Depot) ───

export interface UpcomingPickupItem {
  itemId: number;
  itemName: string;
  imageUrl: string;
  quantity: number;
  unit: string;
}

export interface UpcomingPickupEntity {
  depotId: number;
  depotName: string;
  missionId: number;
  missionType: string;
  missionStatus: string;
  missionStartTime: string;
  missionExpectedEndTime: string;
  activityId: number;
  step: number;
  activityCode?: string;
  activityType: string;
  description: string;
  priority: string;
  estimatedTime: number;
  status: string;
  assignedAt: string;
  missionTeamId: number;
  rescueTeamId: number;
  rescueTeamName: string;
  teamType: string;
  items: UpcomingPickupItem[];
}

export interface GetUpcomingPickupsParams {
  depotId: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetUpcomingPickupsResponse {
  items: UpcomingPickupEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Pickup History (My Depot) ───

export interface PickupHistoryItem {
  itemId: number;
  itemName: string;
  imageUrl: string;
  quantity: number;
  unit: string;
}

export interface PickupHistoryEntity {
  depotId: number;
  depotName: string;
  depotAddress: string;
  missionId: number;
  missionType: string;
  missionStatus: string;
  missionStartTime: string;
  missionExpectedEndTime: string;
  activityId: number;
  step: number;
  activityCode?: string;
  activityType: string;
  description: string;
  priority: string;
  estimatedTime: number;
  status: string;
  assignedAt: string;
  completedAt: string;
  completedBy: string;
  completedByName: string;
  missionTeamId: number;
  rescueTeamId: number;
  rescueTeamName: string;
  teamType: string;
  items: PickupHistoryItem[];
}

export interface GetPickupHistoryParams {
  depotId: number;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetPickupHistoryResponse {
  items: PickupHistoryEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Upcoming Returns (My Depot) ───

export interface ReturnReusableUnit {
  reusableItemId: number;
  itemModelId: number;
  itemName: string;
  serialNumber: string;
  condition: string;
  note: string | null;
}

export interface PickupLotAllocation {
  lotId: number;
  quantityTaken: number;
  receivedDate?: string | null;
  expiredDate?: string | null;
  remainingQuantityAfterExecution?: number | null;
}

export interface UpcomingReturnItem {
  itemId: number;
  itemModelId?: number | null;
  itemName: string;
  imageUrl: string | null;
  quantity: number;
  unit: string;
  actualReturnedQuantity: number;
  expiredDate?: string | null;
  expectedReturnUnits: ReturnReusableUnit[];
  returnedReusableUnits: ReturnReusableUnit[];
  expectedReturnLotAllocations?: PickupLotAllocation[];
  returnedLotAllocations?: PickupLotAllocation[];
  pickupLotAllocations?: PickupLotAllocation[];
}

interface ReturnActivityEntityBase {
  depotId: number;
  depotName: string;
  missionId: number;
  missionType: string;
  missionStatus: string;
  missionStartTime: string;
  missionExpectedEndTime: string;
  activityId: number;
  step: number;
  activityType: string;
  description: string;
  priority: string;
  estimatedTime: number;
  status: string;
  assignedAt: string;
  missionTeamId: number;
  rescueTeamId: number;
  rescueTeamName: string;
  teamType: string;
  items: UpcomingReturnItem[];
}

export type UpcomingReturnEntity = ReturnActivityEntityBase;

export interface GetUpcomingReturnsParams {
  depotId: number;
  status?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetUpcomingReturnsResponse {
  items: UpcomingReturnEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Return History (My Depot) ───

export interface ReturnHistoryEntity extends ReturnActivityEntityBase {
  depotAddress: string;
  completedAt: string;
  completedBy: string;
  completedByName: string;
}

export interface GetReturnHistoryParams {
  depotId: number;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetReturnHistoryResponse {
  items: ReturnHistoryEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Thresholds ───

export type ThresholdScopeType =
  | "Global"
  | "Depot"
  | "DepotCategory"
  | "DepotItem";

export type ResolvedThresholdScopeType = ThresholdScopeType | "None";

export interface WarningBandConfig {
  id?: number;
  critical: number;
  medium: number;
  low: number;
  updatedBy?: string;
  updatedAt?: string;
}

export interface UpdateWarningBandConfigPayload {
  critical: number;
  medium: number;
  low: number;
}

export interface ThresholdConfig {
  id?: number;
  scopeType: ThresholdScopeType;
  depotId?: number | null;
  categoryId?: number | null;
  itemModelId?: number | null;
  minimumThreshold: number | null;
  rowVersion?: number | null;
  updatedAt?: string | null;
  message?: string;
}

export interface GetThresholdsResponse {
  depotId?: number;
  global: ThresholdConfig | null;
  depot: ThresholdConfig | null;
  depotCategories: ThresholdConfig[];
  depotItems: ThresholdConfig[];
}

export interface GetThresholdsParams {
  depotId?: number;
}

export interface UpdateThresholdPayload {
  depotId: number;
  scopeType: ThresholdScopeType;
  categoryId?: number;
  itemModelId?: number;
  minimumThreshold: number | null;
  rowVersion?: number;
  reason?: string;
}

export type UpdateThresholdResponse = ThresholdConfig;

export interface DeleteThresholdPayload {
  depotId: number;
  scopeType: ThresholdScopeType;
  categoryId?: number;
  itemModelId?: number;
  rowVersion?: number;
  reason?: string;
}

export type DeleteThresholdResponse = ThresholdConfig;

// ─── Low Stock ───

export type LowStockLevel =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "OK"
  | "UNCONFIGURED"
  | string;

export interface LowStockItem {
  depotId?: number;
  depotName?: string;
  itemModelId: number;
  itemModelName: string;
  unit?: string;
  categoryId?: number | null;
  categoryName?: string | null;
  targetGroups?: string[];
  targetGroup?: string;
  quantity?: number;
  reservedQuantity?: number;
  availableQuantity: number;
  minimumThreshold: number | null;
  severityRatio: number;
  warningLevel: LowStockLevel;
  resolvedThresholdScope: ResolvedThresholdScopeType;
  isUsingGlobalDefault: boolean;
  // Legacy fields kept optional during backend rollout.
  availableRatio?: number;
  alertLevel?: string;
  alertLevelLabel?: string;
}

export interface GetLowStockResponse {
  items: LowStockItem[];
  pageNumber?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface GetLowStockParams {
  depotId: number;
  warningLevel?: LowStockLevel;
  categoryCode?: string[];
  pageNumber?: number;
  pageSize?: number;
  // Legacy filter name kept during backend rollout.
  level?: LowStockLevel;
}

// ─── Supply Request Priority Config ───

export interface SupplyRequestPriorityConfig {
  urgentMinutes: number;
  highMinutes: number;
  mediumMinutes: number;
  updatedBy?: string;
  updatedAt?: string;
}

export interface UpdateSupplyRequestPriorityConfigPayload {
  urgentMinutes: number;
  highMinutes: number;
  mediumMinutes: number;
}

export type SupplyRequestPriorityLevel = InventoryCategory;

// ─── Disposal / Decommission ───

export interface ExpiringLotItem {
  lotId: number;
  itemModelId: number;
  itemModelName: string;
  remainingQuantity: number;
  expiredDate: string;
  receivedDate: string;
  sourceType: string;
  isExpired: boolean;
}

export interface GetExpiringLotsParams {
  depotId: number;
  daysAhead?: number;
}

export type GetExpiringLotsResponse = ExpiringLotItem[];

export interface DisposeLotPayload {
  lotId: number;
  quantity: number;
  reason: string;
  note?: string;
}

export interface DisposeLotParams {
  depotId: number;
  lotId: number;
  payload: DisposeLotPayload;
}

export interface DisposeLotResponse {
  message: string;
}

export interface DecommissionReusablePayload {
  note: string;
}

export interface DecommissionReusableParams {
  depotId: number;
  itemId: number;
  payload: DecommissionReusablePayload;
}

export interface DecommissionReusableResponse {
  message: string;
}

export type ReusableItemStatus = InventoryCategory;

export interface SearchDepotReusableUnitsParams {
  depotId: number;
  itemModelId: number;
  serialNumber?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface DepotReusableUnitSearchItem {
  itemId: number;
  itemModelId: number;
  itemModelName: string;
  imageUrl?: string | null;
  categoryId: number;
  categoryName: string;
  serialNumber: string;
  status: string;
  condition: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchDepotReusableUnitsResponse {
  items: DepotReusableUnitSearchItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface UpdateReusableStatusPayload {
  note: string;
  condition?: string;
}

export interface UpdateReusableStatusParams {
  depotId: number;
  itemId: number;
  payload: UpdateReusableStatusPayload;
}

export interface UpdateReusableStatusResponse {
  message?: string;
}
