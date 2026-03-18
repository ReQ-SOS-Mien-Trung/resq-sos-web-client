import api from "@/config/axios";
import {
  GetAssemblyPointsResponse,
  GetAssemblyPointsParams,
  AssemblyPointEntity,
  AssemblyPointDetailEntity,
  CreateAssemblyPointRequest,
  CreateAssemblyPointResponse,
  AssemblyPointStatusMetadata,
  UpdateAssemblyPointRequest,
  UpdateAssemblyPointResponse,
  UpdateAssemblyPointStatusRequest,
  UpdateAssemblyPointStatusResponse,
} from "./type";

/**
 * Get all assembly points with pagination
 * GET /personnel/assembly-point
 */
export async function getAssemblyPoints(
  params?: GetAssemblyPointsParams,
): Promise<GetAssemblyPointsResponse> {
  const { data } = await api.get("/personnel/assembly-point", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  });
  return data;
}

/**
 * Get an assembly point by ID
 * GET /personnel/assembly-point/{id}
 */
export async function getAssemblyPointById(
  id: number,
): Promise<AssemblyPointDetailEntity> {
  const { data } = await api.get(`/personnel/assembly-point/${id}`);
  return data;
}

/**
 * Get assembly point statuses metadata
 * GET /personnel/assembly-point/status-metadata
 */
export async function getAssemblyPointStatuses(): Promise<
  AssemblyPointStatusMetadata[]
> {
  const { data } = await api.get("/personnel/assembly-point/status-metadata");
  return data;
}

/**
 * Create a new assembly point
 * POST /personnel/assembly-point
 */
export async function createAssemblyPoint(
  payload: CreateAssemblyPointRequest,
): Promise<CreateAssemblyPointResponse> {
  const { data } = await api.post("/personnel/assembly-point", payload);
  return data;
}

/**
 * Update an assembly point
 * PUT /personnel/assembly-point/{id}
 */
export async function updateAssemblyPoint(
  payload: UpdateAssemblyPointRequest,
): Promise<UpdateAssemblyPointResponse> {
  const { id, ...body } = payload;
  const { data } = await api.put(`/personnel/assembly-point/${id}`, body);
  return data;
}

/**
 * Update assembly point status
 * PATCH /personnel/assembly-point/{id}/status
 */
export async function updateAssemblyPointStatus(
  payload: UpdateAssemblyPointStatusRequest,
): Promise<UpdateAssemblyPointStatusResponse> {
  const { id, status } = payload;
  const { data } = await api.patch(
    `/personnel/assembly-point/${id}/status?status=${status}`,
  );
  return data;
}

/**
 * Delete an assembly point
 * DELETE /personnel/assembly-point/{id}
 */
export async function deleteAssemblyPoint(id: number): Promise<void> {
  await api.delete(`/personnel/assembly-point/${id}`);
}
