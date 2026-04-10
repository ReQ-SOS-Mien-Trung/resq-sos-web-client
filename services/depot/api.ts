import api from "@/config/axios";
import {
  GetDepotsResponse,
  GetDepotsByClusterResponse,
  GetDepotsParams,
  CreateDepotRequest,
  DepotEntity,
  DepotStatusMetadata,
  DepotMetadataItem,
  AvailableDepotManager,
  DepotFund,
  UpdateDepotRequest,
  UpdateDepotStatusRequest,
  UpdateDepotStatusResponse,
  AssignDepotManagerRequest,
  UnassignDepotManagerRequest,
  DepotManagerAssignmentResponse,
  GetDepotFundTransactionsResponse,
  GetDepotFundTransactionsParams,
  DepotClosureMetadata,
  InitiateDepotClosureRequest,
  InitiateDepotClosureResponse,
  ResolveDepotClosureRequest,
  ResolveDepotClosureResponse,
  CancelDepotClosureRequest,
  CancelDepotClosureResponse,
  DepotClosureTransfer,
  DepotTransferActionRequest,
  DepotTransferActionResponse,
  DepotReceiveTransferResponse,
  DepotClosureRecord,
  DepotIncomingClosureTransfer,
} from "./type";

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
 * Get depot metadata (key-value pairs for dropdown)
 * GET /logistics/depot/metadata/depots
 */
export async function getDepotMetadata(): Promise<DepotMetadataItem[]> {
  const { data } = await api.get("/logistics/depot/metadata/depots");
  return data;
}

/**
 * Get available managers for depot assignment
 * GET /logistics/depot/metadata/available-managers
 */
export async function getAvailableDepotManagers(): Promise<
  AvailableDepotManager[]
> {
  const { data } = await api.get(
    "/logistics/depot/metadata/available-managers",
  );
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
 * Assign or replace manager for a depot
 * PATCH /logistics/depot/{id}/manager
 */
export async function assignDepotManager(
  request: AssignDepotManagerRequest,
): Promise<DepotManagerAssignmentResponse> {
  const { id, managerId } = request;
  const { data } = await api.patch(`/logistics/depot/${id}/manager`, {
    managerId,
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
  const { data } = await api.delete(`/logistics/depot/${request.id}/manager`);
  return data;
}

/**
 * [Admin] Get all depot funds
 * GET /logistics/depot/funds
 */
export async function getDepotFunds(): Promise<DepotFund[]> {
  const { data } = await api.get("/logistics/depot/funds");
  return data;
}

/**
 * [Manager] Get my depot fund
 * GET /logistics/depot/my-fund
 */
export async function getMyDepotFund(): Promise<DepotFund> {
  const { data } = await api.get("/logistics/depot/my-fund");
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
 * [Manager] Get my depot fund transaction history
 * GET /finance/depot-funds/my/transactions
 */
export async function getMyDepotFundTransactions(
  params?: GetDepotFundTransactionsParams,
): Promise<GetDepotFundTransactionsResponse> {
  const { data } = await api.get("/finance/depot-funds/my/transactions", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 20,
    },
  });
  return data;
}

/**
 * [Admin] Get all closure records for a depot
 * GET /logistics/depot/{id}/closures
 */
export async function getDepotClosures(
  id: number,
): Promise<DepotClosureRecord[]> {
  const { data } = await api.get(`/logistics/depot/${id}/closures`);
  return data;
}

/**
 * Get depot closure metadata (resolution type enum)
 * GET /logistics/depot/metadata/closure
 */
export async function getDepotClosureMetadata(): Promise<DepotClosureMetadata> {
  const { data } = await api.get("/logistics/depot/metadata/closure");
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
  const { data } = await api.post(`/logistics/depot/${id}/close`, body);
  return data;
}

/**
 * [Admin] Resolve depot closure — chọn cách xử lý tồn kho trước khi đóng
 * Option 1: TransferToDepot (cần targetDepotId)
 * Option 2: ExternalResolution (ghi chú externalNote)
 * POST /logistics/depot/{id}/close/{closureId}/resolve
 */
export async function resolveDepotClosure(
  request: ResolveDepotClosureRequest,
): Promise<ResolveDepotClosureResponse> {
  const { id, closureId, ...body } = request;
  const { data } = await api.post(
    `/logistics/depot/${id}/close/${closureId}/resolve`,
    body,
  );
  return data;
}

/**
 * [Admin] Cancel depot closure — huỷ quy trình đóng kho, kho quay về Available/Full
 * POST /logistics/depot/{id}/close/{closureId}/cancel
 */
export async function cancelDepotClosure(
  request: CancelDepotClosureRequest,
): Promise<CancelDepotClosureResponse> {
  const { id, closureId, ...body } = request;
  const { data } = await api.delete(
    `/logistics/depot/${id}/close/${closureId}`,
    { data: body },
  );
  return data;
}

// ── Depot Closure Transfer ───────────────────────────────────────────

/**
 * Get transfer record
 * GET /logistics/depot/{id}/close/{closureId}/transfer/{transferId}
 */
export async function getDepotClosureTransfer(
  id: number,
  closureId: number,
  transferId: number,
): Promise<DepotClosureTransfer> {
  const { data } = await api.get(
    `/logistics/depot/${id}/close/${closureId}/transfer/${transferId}`,
  );
  return data;
}

/**
 * [Manager kho đích] Tìm phiên nhận hàng đang chờ xác nhận của kho hiện tại
 * GET /logistics/depot/my-incoming-closure-transfer
 * Trả về 204 nếu hiện không có phiên nào đang chờ.
 */
export async function getMyIncomingDepotClosureTransfer(): Promise<DepotIncomingClosureTransfer | null> {
  const response = await api.get("/logistics/depot/my-incoming-closure-transfer", {
    validateStatus: (status) => status === 200 || status === 204,
  });

  if (response.status === 204) {
    return null;
  }

  return response.data;
}

/**
 * [Manager kho nguồn] Xác nhận đang chuẩn bị hàng — chuyển transfer sang Preparing
 * POST /logistics/depot/{id}/close/{closureId}/transfer/{transferId}/prepare
 */
export async function prepareDepotTransfer(
  request: DepotTransferActionRequest,
): Promise<DepotTransferActionResponse> {
  const { id, closureId, transferId, ...body } = request;
  const { data } = await api.post(
    `/logistics/depot/${id}/close/${closureId}/transfer/${transferId}/prepare`,
    body,
  );
  return data;
}

/**
 * [Manager kho nguồn] Xác nhận đã xuất hàng — chuyển transfer sang Shipping
 * POST /logistics/depot/{id}/close/{closureId}/transfer/{transferId}/ship
 */
export async function shipDepotTransfer(
  request: DepotTransferActionRequest,
): Promise<DepotTransferActionResponse> {
  const { id, closureId, transferId, ...body } = request;
  const { data } = await api.post(
    `/logistics/depot/${id}/close/${closureId}/transfer/${transferId}/ship`,
    body,
  );
  return data;
}

/**
 * [Manager kho nguồn] Xác nhận đã xuất toàn bộ hàng — chuyển transfer sang Completed
 * POST /logistics/depot/{id}/close/{closureId}/transfer/{transferId}/complete
 */
export async function completeDepotTransfer(
  request: DepotTransferActionRequest,
): Promise<DepotTransferActionResponse> {
  const { id, closureId, transferId, ...body } = request;
  const { data } = await api.post(
    `/logistics/depot/${id}/close/${closureId}/transfer/${transferId}/complete`,
    body,
  );
  return data;
}

/**
 * [Manager kho đích] Xác nhận đã nhận hàng — kích hoạt bulk transfer và hoàn tất đóng kho
 * POST /logistics/depot/{id}/close/{closureId}/transfer/{transferId}/receive
 */
export async function receiveDepotTransfer(
  request: DepotTransferActionRequest,
): Promise<DepotReceiveTransferResponse> {
  const { id, closureId, transferId, ...body } = request;
  const { data } = await api.post(
    `/logistics/depot/${id}/close/${closureId}/transfer/${transferId}/receive`,
    body,
  );
  return data;
}
