import api from "@/config/axios";
import {
  GetDepotsResponse,
  GetDepotsParams,
  CreateDepotRequest,
  DepotEntity,
  DepotStatusMetadata,
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
