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
  AvailableDepotManager,
  GetAvailableDepotManagersParams,
  DepotActiveManager,
  ManagedDepotSummary,
  DepotFund,
  MyDepotFund,
  UpdateDepotRequest,
  UpdateDepotStatusRequest,
  UpdateDepotStatusResponse,
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
  InitiateDepotClosureTransferRequest,
  InitiateDepotClosureTransferResponse,
  DepotClosureTransferSuggestionsResponse,
  GetMyDepotTransfersResponse,
  GetMyDepotClosuresResponse,
  DepotClosureDetail,
  DepotClosureTransfer,
  DepotTransferActionRequest,
  DepotTransferActionResponse,
  DepotReceiveTransferResponse,
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

  return candidate as DepotClosureDetail;
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
  const response = await api.post(`/logistics/depot/${id}/close`, body, {
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
 * Download depot close external-resolution template
 * Proxied via /api/depot/close-export-template
 * → GET /logistics/depot/close/export-template
 */
export async function downloadDepotClosureExportTemplate(): Promise<{
  blob: Blob;
  filename: string;
}> {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch("/api/depot/close-export-template", {
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
  return data;
}

/**
 * [Admin] Get current/latest closure detail of a depot
 * GET /logistics/depot/{depotId}/closures
 */
export async function getDepotClosureByDepotId(
  depotId: number,
): Promise<DepotClosureDetail | null> {
  const response = await api.get(`/logistics/depot/${depotId}/closures`, {
    validateStatus: (status) => status === 200 || status === 404,
  });
  return response.status === 404
    ? null
    : normalizeDepotClosureDetailResponse(response.data);
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
 * GET /logistics/depot/{id}/transfer/{transferId}
 */
export async function getDepotClosureTransfer(
  id: number,
  transferId: number,
): Promise<DepotClosureTransfer> {
  const { data } = await api.get(
    `/logistics/depot/${id}/transfer/${transferId}`,
  );
  return data;
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
    `/logistics/depot/transfer/${transferId}/prepare`,
    note ? { note } : {},
    {
      params: { depotId },
    },
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
    `/logistics/depot/transfer/${transferId}/ship`,
    note ? { note } : {},
    {
      params: { depotId },
    },
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
    `/logistics/depot/transfer/${transferId}/complete`,
    note ? { note } : {},
    {
      params: { depotId },
    },
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
    `/logistics/depot/transfer/${transferId}/receive`,
    note ? { note } : {},
    {
      params: { depotId },
    },
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
