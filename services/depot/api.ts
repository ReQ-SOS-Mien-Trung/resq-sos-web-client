import api from "@/config/axios";
import {
  GetDepotsResponse,
  GetDepotsParams,
  CreateDepotRequest,
  DepotEntity,
  DepotStatusMetadata,
  DepotMetadataItem,
  DepotFund,
  UpdateDepotRequest,
  UpdateDepotStatusRequest,
  UpdateDepotStatusResponse,
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
    },
  });
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
