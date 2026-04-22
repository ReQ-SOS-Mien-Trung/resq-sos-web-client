import api from "@/config/axios";
import { useAuthStore } from "@/stores/auth.store";
import {
  GetDepotsResponse,
  GetDepotsByClusterResponse,
  GetDepotsParams,
  CreateDepotRequest,
  DepotEntity,
  ChangeableDepotStatusMetadata,
  DepotStatusMetadata,
  DepotMetadataItem,
  DepotClosureResolutionMetadataItem,
  DepotClosureTransferStatusMetadata,
  AvailableDepotManager,
  GetAvailableDepotManagersParams,
  DepotActiveManager,
  ManagedDepotSummary,
  MyDepotFund,
  UpdateDepotRequest,
  UpdateDepotStatusRequest,
  UpdateDepotStatusResponse,
  InitiateDepotClosingRequest,
  InitiateDepotClosingResponse,
  AssignDepotManagerRequest,
  UnassignDepotManagerRequest,
  DepotManagerAssignmentResponse,
  GetDepotFundTransactionsResponse,
  GetDepotFundTransactionsParams,
  GetMyDepotAdvancersResponse,
  GetMyDepotAdvancersParams,
  CreateInternalAdvanceRequest,
  CreateInternalRepaymentRequest,
  InitiateDepotClosureRequest,
  InitiateDepotClosureResponse,
  MarkDepotClosureExternalRequest,
  MarkDepotClosureExternalResponse,
  SubmitDepotExternalResolutionRequest,
  SubmitDepotExternalResolutionResponse,
  DepotExternalResolutionState,
  InitiateDepotClosureTransferRequest,
  InitiateDepotClosureTransferResponse,
  DepotClosureTransferSuggestionsResponse,
  GetMyDepotTransfersResponse,
  GetMyDepotClosuresResponse,
  GetDepotClosuresListByDepotIdResponse,
  DepotClosureDetail,
  DepotClosureDetailTransfer,
  DepotClosureDetailTransferItem,
  DepotClosureRemainingInventoryItem,
  DepotClosureTransfer,
  DepotTransferActionRequest,
  DepotTransferActionResponse,
  DepotReceiveTransferResponse,
  CancelDepotClosureTransferRequest,
  CancelDepotClosureTransferResponse,
  DepotExternalResolvedItem,
} from "./type";

function parseContentDispositionFilename(
  disposition: string,
  fallback: string,
): string {
  const utf8Match = disposition.match(/filename\*=[^']*'[^']*'([^;\s]+)/i);
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = disposition.match(/filename="([^"]+)"/);
  if (asciiMatch) {
    return asciiMatch[1];
  }

  const plainMatch = disposition.match(/filename=([^;\s]+)/);
  if (plainMatch) {
    return plainMatch[1];
  }

  return fallback;
}

function normalizeDepotClosureDetailResponse(
  payload: unknown,
): DepotClosureDetail | null {
  if (Array.isArray(payload)) {
    if (payload.length === 0) return null;
    return normalizeDepotClosureDetailResponse(payload[0]);
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Partial<DepotClosureDetail>;
  if (typeof candidate.id !== "number" || candidate.id <= 0) {
    return null;
  }

  const source = payload as Record<string, unknown>;
  const remainingInventoryItems = normalizeRemainingInventoryItems(
    source.remainingInventoryItems ?? source.remainingItems,
  );
  const transferDetail = normalizeDepotClosureDetailTransfer(
    source.transferDetail,
  );
  const transferDetails = normalizeDepotClosureDetailTransfers(
    source.transferDetails,
  );

  return {
    id: candidate.id,
    depotId: typeof candidate.depotId === "number" ? candidate.depotId : 0,
    depotName: typeof candidate.depotName === "string" ? candidate.depotName : "",
    status: typeof candidate.status === "string" ? candidate.status : "",
    previousStatus:
      typeof candidate.previousStatus === "string"
        ? candidate.previousStatus
        : null,
    closeReason:
      typeof candidate.closeReason === "string" ? candidate.closeReason : "",
    resolutionType:
      typeof candidate.resolutionType === "string"
        ? candidate.resolutionType
        : null,
    targetDepotId:
      typeof candidate.targetDepotId === "number" ? candidate.targetDepotId : null,
    targetDepotName:
      typeof candidate.targetDepotName === "string"
        ? candidate.targetDepotName
        : null,
    externalNote:
      typeof candidate.externalNote === "string" ? candidate.externalNote : null,
    initiatedBy:
      typeof candidate.initiatedBy === "string" ? candidate.initiatedBy : "",
    initiatedByFullName:
      typeof candidate.initiatedByFullName === "string"
        ? candidate.initiatedByFullName
        : null,
    cancelledBy:
      typeof candidate.cancelledBy === "string" ? candidate.cancelledBy : null,
    cancelledByFullName:
      typeof candidate.cancelledByFullName === "string"
        ? candidate.cancelledByFullName
        : null,
    cancellationReason:
      typeof candidate.cancellationReason === "string"
        ? candidate.cancellationReason
        : null,
    snapshotConsumableUnits:
      typeof candidate.snapshotConsumableUnits === "number"
        ? candidate.snapshotConsumableUnits
        : 0,
    snapshotReusableUnits:
      typeof candidate.snapshotReusableUnits === "number"
        ? candidate.snapshotReusableUnits
        : 0,
    actualConsumableUnits:
      typeof candidate.actualConsumableUnits === "number"
        ? candidate.actualConsumableUnits
        : 0,
    actualReusableUnits:
      typeof candidate.actualReusableUnits === "number"
        ? candidate.actualReusableUnits
        : 0,
    driftNote: typeof candidate.driftNote === "string" ? candidate.driftNote : null,
    failureReason:
      typeof candidate.failureReason === "string" ? candidate.failureReason : null,
    isForced: typeof candidate.isForced === "boolean" ? candidate.isForced : false,
    forceReason:
      typeof candidate.forceReason === "string" ? candidate.forceReason : null,
    initiatedAt:
      typeof candidate.initiatedAt === "string" ? candidate.initiatedAt : "",
    completedAt:
      typeof candidate.completedAt === "string" ? candidate.completedAt : null,
    cancelledAt:
      typeof candidate.cancelledAt === "string" ? candidate.cancelledAt : null,
    hasOpenTransfers:
      typeof candidate.hasOpenTransfers === "boolean"
        ? candidate.hasOpenTransfers
        : Boolean(
            transferDetails.some(
              (transfer) =>
                transfer.status !== "Received" && transfer.status !== "Cancelled",
            ) ||
              (transferDetail &&
                transferDetail.status !== "Received" &&
                transferDetail.status !== "Cancelled"),
          ),
    hasRemainingItems:
      typeof candidate.hasRemainingItems === "boolean"
        ? candidate.hasRemainingItems
        : Boolean((remainingInventoryItems?.length ?? 0) > 0),
    remainingItemCount:
      typeof candidate.remainingItemCount === "number"
        ? candidate.remainingItemCount
        : remainingInventoryItems?.length ?? 0,
    hasTransferableRemainingItems:
      typeof candidate.hasTransferableRemainingItems === "boolean"
        ? candidate.hasTransferableRemainingItems
        : false,
    transferableRemainingItemCount:
      typeof candidate.transferableRemainingItemCount === "number"
        ? candidate.transferableRemainingItemCount
        : 0,
    transferableRemainingUnitCount:
      typeof candidate.transferableRemainingUnitCount === "number"
        ? candidate.transferableRemainingUnitCount
        : 0,
    blockedRemainingItemCount:
      typeof candidate.blockedRemainingItemCount === "number"
        ? candidate.blockedRemainingItemCount
        : 0,
    blockedRemainingUnitCount:
      typeof candidate.blockedRemainingUnitCount === "number"
        ? candidate.blockedRemainingUnitCount
        : 0,
    hasClosingBlockers:
      typeof candidate.hasClosingBlockers === "boolean"
        ? candidate.hasClosingBlockers
        : false,
    reservedConsumableItemCount:
      typeof candidate.reservedConsumableItemCount === "number"
        ? candidate.reservedConsumableItemCount
        : 0,
    reservedConsumableUnitCount:
      typeof candidate.reservedConsumableUnitCount === "number"
        ? candidate.reservedConsumableUnitCount
        : 0,
    nonAvailableReusableItemModelCount:
      typeof candidate.nonAvailableReusableItemModelCount === "number"
        ? candidate.nonAvailableReusableItemModelCount
        : 0,
    nonAvailableReusableUnitCount:
      typeof candidate.nonAvailableReusableUnitCount === "number"
        ? candidate.nonAvailableReusableUnitCount
        : 0,
    canSelectResolutionOption:
      typeof candidate.canSelectResolutionOption === "boolean"
        ? candidate.canSelectResolutionOption
        : false,
    canConfirmClose:
      typeof candidate.canConfirmClose === "boolean"
        ? candidate.canConfirmClose
        : false,
    canDownloadExternalTemplate:
      typeof candidate.canDownloadExternalTemplate === "boolean"
        ? candidate.canDownloadExternalTemplate
        : false,
    canUploadExternalResolution:
      typeof candidate.canUploadExternalResolution === "boolean"
        ? candidate.canUploadExternalResolution
        : false,
    hasTransferRecords:
      typeof candidate.hasTransferRecords === "boolean"
        ? candidate.hasTransferRecords
        : transferDetails.length > 0 || transferDetail != null,
    hasExternalResolutionRecords:
      typeof candidate.hasExternalResolutionRecords === "boolean"
        ? candidate.hasExternalResolutionRecords
        : false,
    transferDetail,
    transferDetails,
    externalItems: normalizeExternalResolvedItems(source.externalItems),
    remainingInventoryItems,
  };
}

function normalizeRemainingInventoryItems(
  payload: unknown,
): DepotClosureRemainingInventoryItem[] | null {
  if (!Array.isArray(payload)) {
    return null;
  }

  return payload.map((item) => {
    const candidate = (item ?? {}) as Partial<DepotClosureRemainingInventoryItem>;
    return {
      itemModelId:
        typeof candidate.itemModelId === "number" ? candidate.itemModelId : 0,
      itemName: typeof candidate.itemName === "string" ? candidate.itemName : "",
      categoryName:
        typeof candidate.categoryName === "string" ? candidate.categoryName : null,
      itemType: typeof candidate.itemType === "string" ? candidate.itemType : "",
      unit: typeof candidate.unit === "string" ? candidate.unit : null,
      quantity: typeof candidate.quantity === "number" ? candidate.quantity : 0,
      currentQuantity:
        typeof candidate.currentQuantity === "number"
          ? candidate.currentQuantity
          : null,
      assignedQuantity:
        typeof candidate.assignedQuantity === "number"
          ? candidate.assignedQuantity
          : null,
      remainingTransferableQuantity:
        typeof candidate.remainingTransferableQuantity === "number"
          ? candidate.remainingTransferableQuantity
          : null,
      blockedQuantity:
        typeof candidate.blockedQuantity === "number"
          ? candidate.blockedQuantity
          : null,
      transferableQuantity:
        typeof candidate.transferableQuantity === "number"
          ? candidate.transferableQuantity
          : null,
      volumePerUnit:
        typeof candidate.volumePerUnit === "number" ? candidate.volumePerUnit : null,
      weightPerUnit:
        typeof candidate.weightPerUnit === "number"
          ? candidate.weightPerUnit
          : typeof candidate.WeightPerUnit === "number"
            ? candidate.WeightPerUnit
            : null,
      WeightPerUnit:
        typeof candidate.WeightPerUnit === "number" ? candidate.WeightPerUnit : null,
      imageUrl: typeof candidate.imageUrl === "string" ? candidate.imageUrl : null,
      receivedDate:
        typeof candidate.receivedDate === "string" ? candidate.receivedDate : null,
      expiredDate:
        typeof candidate.expiredDate === "string" ? candidate.expiredDate : null,
    };
  });
}

function normalizeDepotClosureDetailTransferItems(
  payload: unknown,
): DepotClosureDetailTransferItem[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item) => {
    const candidate = (item ?? {}) as Partial<DepotClosureDetailTransferItem>;
    return {
      itemModelId:
        typeof candidate.itemModelId === "number" ? candidate.itemModelId : 0,
      itemName: typeof candidate.itemName === "string" ? candidate.itemName : "",
      itemType: typeof candidate.itemType === "string" ? candidate.itemType : "",
      unit: typeof candidate.unit === "string" ? candidate.unit : null,
      quantity: typeof candidate.quantity === "number" ? candidate.quantity : 0,
    };
  });
}

function normalizeDepotClosureDetailTransfer(
  payload: unknown,
): DepotClosureDetailTransfer | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Partial<DepotClosureDetailTransfer>;
  if (typeof candidate.id !== "number" || candidate.id <= 0) {
    return null;
  }

  const source = payload as Record<string, unknown>;
  return {
    id: candidate.id,
    closureId: typeof candidate.closureId === "number" ? candidate.closureId : 0,
    sourceDepotId:
      typeof candidate.sourceDepotId === "number" ? candidate.sourceDepotId : 0,
    sourceDepotName:
      typeof candidate.sourceDepotName === "string"
        ? candidate.sourceDepotName
        : null,
    targetDepotId:
      typeof candidate.targetDepotId === "number" ? candidate.targetDepotId : 0,
    targetDepotName:
      typeof candidate.targetDepotName === "string"
        ? candidate.targetDepotName
        : null,
    status: typeof candidate.status === "string" ? candidate.status : "",
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : "",
    snapshotConsumableUnits:
      typeof candidate.snapshotConsumableUnits === "number"
        ? candidate.snapshotConsumableUnits
        : 0,
    snapshotReusableUnits:
      typeof candidate.snapshotReusableUnits === "number"
        ? candidate.snapshotReusableUnits
        : 0,
    shippedAt: typeof candidate.shippedAt === "string" ? candidate.shippedAt : null,
    shippedBy: typeof candidate.shippedBy === "string" ? candidate.shippedBy : null,
    shipNote: typeof candidate.shipNote === "string" ? candidate.shipNote : null,
    receivedAt:
      typeof candidate.receivedAt === "string" ? candidate.receivedAt : null,
    receivedBy:
      typeof candidate.receivedBy === "string" ? candidate.receivedBy : null,
    receiveNote:
      typeof candidate.receiveNote === "string" ? candidate.receiveNote : null,
    cancelledAt:
      typeof candidate.cancelledAt === "string" ? candidate.cancelledAt : null,
    cancelledBy:
      typeof candidate.cancelledBy === "string" ? candidate.cancelledBy : null,
    cancellationReason:
      typeof candidate.cancellationReason === "string"
        ? candidate.cancellationReason
        : null,
    items: normalizeDepotClosureDetailTransferItems(source.items),
  };
}

function normalizeDepotClosureDetailTransfers(
  payload: unknown,
): DepotClosureDetailTransfer[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => normalizeDepotClosureDetailTransfer(item))
    .filter((item): item is DepotClosureDetailTransfer => item != null);
}

function normalizeDepotClosureTransferResponse(
  payload: unknown,
): DepotClosureTransfer {
  const normalized = normalizeDepotClosureDetailTransfer(payload);
  if (!normalized) {
    throw new Error("Invalid depot closure transfer response");
  }
  return normalized;
}

function normalizeExternalResolvedItems(
  payload: unknown,
): DepotExternalResolvedItem[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item) => {
    const candidate = (item ?? {}) as Partial<DepotExternalResolvedItem>;
    return {
      id: typeof candidate.id === "number" ? candidate.id : 0,
      itemName: typeof candidate.itemName === "string" ? candidate.itemName : "",
      categoryName:
        typeof candidate.categoryName === "string" ? candidate.categoryName : "",
      itemType: typeof candidate.itemType === "string" ? candidate.itemType : "",
      unit: typeof candidate.unit === "string" ? candidate.unit : "",
      quantity: typeof candidate.quantity === "number" ? candidate.quantity : 0,
      unitPrice:
        typeof candidate.unitPrice === "number" ? candidate.unitPrice : 0,
      totalPrice:
        typeof candidate.totalPrice === "number" ? candidate.totalPrice : 0,
      handlingMethod:
        typeof candidate.handlingMethod === "string" ? candidate.handlingMethod : "",
      handlingMethodDisplay:
        typeof candidate.handlingMethodDisplay === "string"
          ? candidate.handlingMethodDisplay
          : typeof candidate.handlingMethod === "string"
            ? candidate.handlingMethod
            : "",
      recipient: typeof candidate.recipient === "string" ? candidate.recipient : "",
      note: typeof candidate.note === "string" ? candidate.note : null,
      imageUrl: typeof candidate.imageUrl === "string" ? candidate.imageUrl : null,
      processedBy:
        typeof candidate.processedBy === "string" ? candidate.processedBy : "",
      processedByFullName:
        typeof candidate.processedByFullName === "string"
          ? candidate.processedByFullName
          : null,
      processedAt:
        typeof candidate.processedAt === "string" ? candidate.processedAt : "",
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : "",
    };
  });
}

function normalizeDepotClosureInitiateResponse(
  payload: InitiateDepotClosureResponse,
  httpStatus: number,
): InitiateDepotClosureResponse {
  const normalizedRemainingItems =
    payload.remainingInventoryItems ?? payload.remainingItems ?? null;

  return {
    ...payload,
    remainingItems: normalizedRemainingItems,
    remainingInventoryItems: normalizedRemainingItems,
    httpStatus,
  };
}

/**
 * Get all depots with pagination
 * GET /logistics/depot
 */
export async function getDepots(
  params?: GetDepotsParams,
): Promise<GetDepotsResponse> {
  const { data } = await api.get("/logistics/depot", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.statuses?.length ? { statuses: params.statuses } : {}),
    },
    // axios needs paramsSerializer to send array as repeated keys
    paramsSerializer: { indexes: null },
  });
  return data;
}

/**
 * Get nearby depots for a cluster.
 * GET /logistics/depot/by-cluster/{clusterId}
 */
export async function getDepotsByCluster(
  clusterId: number,
): Promise<GetDepotsByClusterResponse> {
  const { data } = await api.get(`/logistics/depot/by-cluster/${clusterId}`);
  return data;
}

/**
 * Get a depot by ID
 * GET /logistics/depot/{id}
 */
export async function getDepotById(id: number): Promise<DepotEntity> {
  const { data } = await api.get(`/logistics/depot/${id}`);
  return data;
}

/**
 * Get depot statuses metadata
 * GET /logistics/depot/metadata/depot-statuses
 */
export async function getDepotStatuses(): Promise<DepotStatusMetadata[]> {
  const { data } = await api.get("/logistics/depot/metadata/depot-statuses");
  return data;
}

/**
 * Get changeable statuses for PATCH /logistics/depot/{id}/status
 * GET /logistics/depot/metadata/changeable-statuses
 */
export async function getDepotChangeableStatuses(): Promise<
  ChangeableDepotStatusMetadata[]
> {
  const { data } = await api.get(
    "/logistics/depot/metadata/changeable-statuses",
  );
  return data;
}

/**
 * Get depot metadata (key-value pairs for dropdown)
 * GET /logistics/depot/metadata/depots
 */
export async function getDepotMetadata(): Promise<DepotMetadataItem[]> {
  const { data } = await api.get("/logistics/depot/metadata/depots");
  return data;
}

/**
 * Get closure resolution metadata
 * GET /logistics/depot/metadata/closure
 */
export async function getDepotClosureResolutionMetadata(): Promise<
  DepotClosureResolutionMetadataItem[]
> {
  const { data } = await api.get("/logistics/depot/metadata/closure");
  return data;
}

/**
 * Get closure transfer status metadata
 * GET /logistics/depot/metadata/closure-transfer-statuses
 */
export async function getDepotClosureTransferStatuses(): Promise<
  DepotClosureTransferStatusMetadata[]
> {
  const { data } = await api.get(
    "/logistics/depot/metadata/closure-transfer-statuses",
  );
  return data;
}

/**
 * Get available managers for a specific depot assignment context
 * GET /logistics/depot/metadata/available-managers?depotId={id}
 */
export async function getAvailableDepotManagers(
  params?: GetAvailableDepotManagersParams,
): Promise<AvailableDepotManager[]> {
  const { data } = await api.get(
    "/logistics/depot/metadata/available-managers",
    {
      params:
        Number.isFinite(params?.depotId) && (params?.depotId ?? 0) > 0
          ? { depotId: params?.depotId }
          : undefined,
    },
  );
  return data;
}

/**
 * Get active managers of a depot
 * GET /logistics/depot/{id}/managers
 */
export async function getDepotActiveManagers(
  id: number,
): Promise<DepotActiveManager[]> {
  const { data } = await api.get(`/logistics/depot/${id}/managers`);
  return data;
}

/**
 * Get depots managed by the current manager
 * GET /logistics/depot/metadata/my-managed-depots
 */
export async function getMyManagedDepots(): Promise<ManagedDepotSummary[]> {
  const { data } = await api.get("/logistics/depot/metadata/my-managed-depots");
  return data;
}

/**
 * Create a new depot
 * POST /logistics/depot
 */
export async function createDepot(
  request: CreateDepotRequest,
): Promise<DepotEntity> {
  const { data } = await api.post("/logistics/depot", request);
  return data;
}

/**
 * Update a depot
 * PUT /logistics/depot/{id}
 */
export async function updateDepot(
  request: UpdateDepotRequest,
): Promise<DepotEntity> {
  const { id, ...body } = request;
  const { data } = await api.put(`/logistics/depot/${id}`, body);
  return data;
}

/**
 * Update depot status
 * PATCH /logistics/depot/{id}/status
 */
export async function updateDepotStatus(
  request: UpdateDepotStatusRequest,
): Promise<UpdateDepotStatusResponse> {
  const { data } = await api.patch(
    `/logistics/depot/${request.id}/status`,
    null,
    {
      params: { Status: request.status },
    },
  );
  return data;
}

/**
 * Move depot to Closing status before starting the closure workflow
 * POST /logistics/depot/{id}/status/closing
 */
export async function initiateDepotClosing(
  request: InitiateDepotClosingRequest,
): Promise<InitiateDepotClosingResponse> {
  const { data } = await api.post(
    `/logistics/depot/${request.id}/status/closing`,
  );
  return data;
}

/**
 * Assign one or many managers for a depot
 * PATCH /logistics/depot/{id}/manager
 */
export async function assignDepotManager(
  request: AssignDepotManagerRequest,
): Promise<DepotManagerAssignmentResponse> {
  const { id, managerIds } = request;
  const { data } = await api.patch(`/logistics/depot/${id}/manager`, {
    managerIds,
  });
  return data;
}

/**
 * Unassign manager from a depot
 * DELETE /logistics/depot/{id}/manager
 */
export async function unassignDepotManager(
  request: UnassignDepotManagerRequest,
): Promise<DepotManagerAssignmentResponse> {
  const { data } = await api.delete(`/logistics/depot-manager/${request.id}`, {
    data:
      request.userIds && request.userIds.length > 0
        ? { userIds: request.userIds }
        : undefined,
  });
  return data;
}

/**
 * [Admin] Get all depot funds (paginated)
 * GET /logistics/depot/funds
 */
export async function getDepotFunds(
  params?: import("./type").GetDepotFundsParams,
): Promise<import("./type").GetDepotFundsResponse> {
  const { data } = await api.get("/logistics/depot/funds", { params });
  return data;
}

/**
 * [Manager] Get my depot fund
 * GET /finance/depot-funds/my
 */
export async function getMyDepotFund(depotId: number): Promise<MyDepotFund> {
  const { data } = await api.get("/finance/depot-funds/my", {
    params: { depotId },
  });
  return data;
}

/**
 * [Admin] Cấu hình hạn mức ứng trước (balance âm tối đa) cho một kho
 * PUT /finance/depot-funds/{depotId}/advance-limit
 */
export async function updateDepotAdvanceLimit(
  depotId: number,
  maxAdvanceLimit: number,
): Promise<void> {
  await api.put(`/finance/depot-funds/${depotId}/advance-limit`, {
    maxAdvanceLimit,
  });
}

/**
 * [Manager] Advance money from a selected depot fund to one or more contributors
 * POST /finance/depot-funds/{depotFundId}/advance
 */
export async function createInternalAdvance(
  depotFundId: number,
  payload: CreateInternalAdvanceRequest,
): Promise<void> {
  await api.post(`/finance/depot-funds/${depotFundId}/advance`, payload);
}

/**
 * [Manager] Repay internal advance money back to one or more depot funds
 * POST /finance/depot-funds/repayment
 */
export async function createInternalRepayment(
  payload: CreateInternalRepaymentRequest,
): Promise<void> {
  await api.post("/finance/depot-funds/repayment", payload);
}

/**
 * [Manager] Get my depot fund transaction history
 * GET /finance/depot-funds/my/transactions
 */
export async function getMyDepotFundTransactions(
  params: GetDepotFundTransactionsParams,
): Promise<GetDepotFundTransactionsResponse> {
  const { data } = await api.get("/finance/depot-funds/my/transactions", {
    params: {
      depotId: params.depotId,
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 20,
    },
  });
  return data;
}

/**
 * [Manager] Get my depot fund advancers (people who owe money)
 * GET /finance/depot-funds/my/advancers
 */
export async function getMyDepotAdvancers(
  params: GetMyDepotAdvancersParams,
): Promise<GetMyDepotAdvancersResponse> {
  const { data } = await api.get("/finance/depot-funds/my/advancers", {
    params: {
      depotId: params.depotId,
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  });
  return data;
}

/**
 * [Admin] Initiate depot closure
 * Nếu kho trống → đóng ngay. Nếu còn hàng → chuyển sang Closing, chờ resolve.
 * POST /logistics/depot/{id}/close
 */
export async function initiateDepotClosure(
  request: InitiateDepotClosureRequest,
): Promise<InitiateDepotClosureResponse> {
  const { id, ...body } = request;
  const response = await api.post(`/logistics/depot/${id}/closed`, body, {
    validateStatus: (status) => status === 200 || status === 409,
  });
  return normalizeDepotClosureInitiateResponse(response.data, response.status);
}

/**
 * [Admin] Get AI suggestions for transferring remaining inventory during depot closure
 * GET /logistics/depot/{id}/close/transfer-suggestions
 */
export async function getDepotClosureTransferSuggestions(
  id: number,
): Promise<DepotClosureTransferSuggestionsResponse> {
  const { data } = await api.get(
    `/logistics/depot/${id}/close/transfer-suggestions`,
  );
  return data;
}

/**
 * [Admin] Mark an active depot closure as externally handled
 * POST /logistics/depot/{id}/close/mark-external
 */
export async function markDepotClosureExternal(
  request: MarkDepotClosureExternalRequest,
): Promise<MarkDepotClosureExternalResponse> {
  const { id, ...body } = request;
  const { data } = await api.post(
    `/logistics/depot/${id}/close/mark-external`,
    body,
  );
  return data;
}

/**
 * [Admin] Submit external resolution JSON result for depot closure
 * POST /logistics/depot/close/external-resolution
 */
export async function submitDepotExternalResolution(
  request: SubmitDepotExternalResolutionRequest,
): Promise<SubmitDepotExternalResolutionResponse> {
  const { depotId, ...body } = request;
  const { data } = await api.post(
    "/logistics/depot/close/external-resolution",
    body,
    {
      params: { depotId },
    },
  );
  return data;
}

/**
 * [Depot Manager] Get external resolution state for current depot closure
 * GET /logistics/depot/{id}/close/external-resolution-state
 */
export async function getDepotExternalResolutionState(
  id: number,
): Promise<DepotExternalResolutionState> {
  const { data } = await api.get(
    `/logistics/depot/${id}/close/external-resolution-state`,
  );
  return data;
}

/**
 * Download depot close external-resolution template
 * Proxied via /api/depot/close-export-template?depotId={id}
 * → GET /logistics/depot/{id}/close/export-template
 */
export async function downloadDepotClosureExportTemplate(id: number): Promise<{
  blob: Blob;
  filename: string;
}> {
  const token = useAuthStore.getState().accessToken;
  const query = new URLSearchParams({ depotId: String(id) });
  const response = await fetch(`/api/depot/close-export-template?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = parseContentDispositionFilename(
    disposition,
    "mau_xu_ly_dong_kho.xlsx",
  );

  return { blob: await response.blob(), filename };
}

/**
 * [Admin] Start transfer flow for depot closure
 * POST /logistics/depot/{id}/close/transfer
 */
export async function initiateDepotClosureTransfer(
  request: InitiateDepotClosureTransferRequest,
): Promise<InitiateDepotClosureTransferResponse> {
  const { id, ...body } = request;
  const { data } = await api.post(
    `/logistics/depot/${id}/close/transfer`,
    body,
  );
  return data;
}

/**
 * [Manager] Get transfers where current depot participates
 * GET /logistics/depot/transfer
 */
export async function getMyDepotTransfers(
  depotId: number,
): Promise<GetMyDepotTransfersResponse> {
  const { data } = await api.get("/logistics/depot/transfer", {
    params: { depotId },
  });
  return data;
}

/**
 * [Manager kho đích] Tìm transfer đang chờ nhận
 * GET /logistics/depot/my-incoming-closure-transfer?depotId={targetDepotId}
 */
export async function getMyIncomingClosureTransfer(
  depotId: number,
): Promise<GetMyDepotTransfersResponse> {
  const { data } = await api.get(
    "/logistics/depot/my-incoming-closure-transfer",
    { params: { depotId } },
  );
  return Array.isArray(data) ? data : [];
}

/**
 * [Manager] Get closure history/list for current depot
 * GET /logistics/depot/closures
 */
export async function getMyDepotClosures(
  depotId: number,
): Promise<GetMyDepotClosuresResponse> {
  const { data } = await api.get("/logistics/depot/closures", {
    params: { depotId },
  });
  return data;
}

/**
 * [Manager] Get closure detail
 * GET /logistics/depot/closures/{closureId}
 */
export async function getMyDepotClosureDetail(
  closureId: number,
  depotId: number,
): Promise<DepotClosureDetail> {
  const { data } = await api.get(`/logistics/depot/closures/${closureId}`, {
    params: { depotId },
  });
  const normalized = normalizeDepotClosureDetailResponse(data);
  if (!normalized) {
    throw new Error("Invalid depot closure detail response");
  }
  return normalized;
}

/**
 * [Admin] Get all closures list for a depot
 * GET /logistics/depot/{depotId}/closures  (returns array)
 */
export async function getDepotClosuresListByDepotId(
  depotId: number,
): Promise<GetDepotClosuresListByDepotIdResponse> {
  const { data } = await api.get(`/logistics/depot/${depotId}/closures`);
  return Array.isArray(data) ? data : [];
}

/**
 * [Admin] Get specific closure detail by depotId + closureId
 * GET /logistics/depot/{depotId}/closures/{closureId}
 */
export async function getDepotClosureDetailByDepotId(
  depotId: number,
  closureId: number,
): Promise<DepotClosureDetail | null> {
  const response = await api.get(
    `/logistics/depot/${depotId}/closures/${closureId}`,
    {
      validateStatus: (status) => status === 200 || status === 404,
    },
  );
  return response.status === 404
    ? null
    : normalizeDepotClosureDetailResponse(response.data);
}

// ── Depot Closure Transfer ───────────────────────────────────────────

/**
 * Get transfer record
 * GET /logistics/depot/{id}/close/transfer/{transferId}
 */
export async function getDepotClosureTransfer(
  id: number,
  transferId: number,
): Promise<DepotClosureTransfer> {
  const { data } = await api.get(
    `/logistics/depot/${id}/close/transfer/${transferId}`,
  );
  return normalizeDepotClosureTransferResponse(data);
}

/**
 * [Manager kho nguồn] Xác nhận đang chuẩn bị hàng — chuyển transfer sang Preparing
 * POST /logistics/depot/transfer/{transferId}/prepare
 */
export async function prepareDepotTransfer(
  request: DepotTransferActionRequest,
): Promise<DepotTransferActionResponse> {
  const { transferId, depotId, note } = request;
  const { data } = await api.post(
    `/logistics/depot/${depotId}/transfer/${transferId}/prepare`,
    note ? { note } : {},
  );
  return data;
}

/**
 * [Manager kho nguồn] Xác nhận đã xuất hàng — chuyển transfer sang Shipping
 * POST /logistics/depot/transfer/{transferId}/ship
 */
export async function shipDepotTransfer(
  request: DepotTransferActionRequest,
): Promise<DepotTransferActionResponse> {
  const { transferId, depotId, note } = request;
  const { data } = await api.post(
    `/logistics/depot/${depotId}/transfer/${transferId}/ship`,
    note ? { note } : {},
  );
  return data;
}

/**
 * [Manager kho nguồn] Xác nhận đã xuất toàn bộ hàng — chuyển transfer sang Completed
 * POST /logistics/depot/transfer/{transferId}/complete
 */
export async function completeDepotTransfer(
  request: DepotTransferActionRequest,
): Promise<DepotTransferActionResponse> {
  const { transferId, depotId, note } = request;
  const { data } = await api.post(
    `/logistics/depot/${depotId}/transfer/${transferId}/complete`,
    note ? { note } : {},
  );
  return data;
}

/**
 * [Manager kho đích] Xác nhận đã nhận hàng — kích hoạt bulk transfer và hoàn tất đóng kho
 * POST /logistics/depot/transfer/{transferId}/receive
 */
export async function receiveDepotTransfer(
  request: DepotTransferActionRequest,
): Promise<DepotReceiveTransferResponse> {
  const { transferId, depotId, note } = request;
  const { data } = await api.post(
    `/logistics/depot/${depotId}/transfer/${transferId}/receive`,
    note ? { note } : {},
  );
  return data;
}

/**
 * [Admin] Hủy một transfer thuộc closure hiện tại
 * DELETE /logistics/depot/{id}/close/transfer/{transferId}
 */
export async function cancelDepotClosureTransfer(
  request: CancelDepotClosureTransferRequest,
): Promise<CancelDepotClosureTransferResponse> {
  const { id, transferId, reason } = request;
  const { data } = await api.delete(
    `/logistics/depot/${id}/close/transfer/${transferId}`,
    { data: reason ? { reason } : {} },
  );
  return data;
}

// ─── Chart API ────────────────────────────────────────────────────────────────

export async function getDepotCapacityChart(
  depotId: number,
): Promise<import("./type").DepotCapacityChartResponse> {
  const { data } = await api.get(`/logistics/depot/${depotId}/chart/capacity`);
  return data;
}

export async function getDepotInventoryMovementChart(
  depotId: number,
  params?: import("./type").GetDepotInventoryMovementParams,
): Promise<import("./type").DepotInventoryMovementChartResponse> {
  const { data } = await api.get(
    `/logistics/depot/${depotId}/chart/inventory-movement`,
    { params },
  );
  return data;
}

export async function getDepotFundMovementChart(
  depotId: number,
  params?: import("./type").GetDepotFundMovementParams,
): Promise<import("./type").DepotFundMovementChartResponse> {
  const { data } = await api.get(
    `/finance/depot-funds/${depotId}/chart/fund-movement`,
    { params },
  );
  return data;
}

/**
 * GET /finance/depot-funds/{fundId}/fund-transactions
 */
export async function getDepotFundTransactionsByFundId(
  fundId: number,
  params: import("./type").GetFundTransactionsByFundIdParams,
): Promise<import("./type").GetFundTransactionsByFundIdResponse> {
  const { data } = await api.get(
    `/finance/depot-funds/${fundId}/fund-transactions`,
    { params },
  );
  return data;
}
