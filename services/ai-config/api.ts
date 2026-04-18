import api from "@/config/axios";
import type {
  AiConfigDetailEntity,
  CreateAiConfigResponse,
  AiConfigVersionActionResponse,
  CreateAiConfigRequest,
  GetAiConfigVersionsResponse,
  GetAiConfigsParams,
  GetAiConfigsResponse,
  UpdateAiConfigRequest,
} from "./type";

export async function getAiConfigs(
  params?: GetAiConfigsParams,
): Promise<GetAiConfigsResponse> {
  const { data } = await api.get("/system/ai-configs", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 20,
    },
  });

  return data;
}

export async function getAiConfigById(id: number): Promise<AiConfigDetailEntity> {
  const { data } = await api.get(`/system/ai-configs/${id}`);
  return data;
}

export async function getAiConfigVersions(
  id: number,
): Promise<GetAiConfigVersionsResponse> {
  const { data } = await api.get(`/system/ai-configs/${id}/versions`);
  return data;
}

export async function createAiConfig(
  request: CreateAiConfigRequest,
): Promise<CreateAiConfigResponse> {
  const { data } = await api.post("/system/ai-configs", request);
  return data;
}

export async function createAiConfigDraft(
  id: number,
): Promise<AiConfigVersionActionResponse> {
  const { data } = await api.post(`/system/ai-configs/${id}/drafts`);
  return data;
}

export async function updateAiConfigDraft(
  id: number,
  request: UpdateAiConfigRequest,
): Promise<void> {
  await api.put(`/system/ai-configs/drafts/${id}`, request);
}

export async function deleteAiConfigDraft(id: number): Promise<void> {
  await api.delete(`/system/ai-configs/drafts/${id}`);
}

export async function activateAiConfig(
  id: number,
): Promise<AiConfigVersionActionResponse> {
  const { data } = await api.post(`/system/ai-configs/${id}/activate`);
  return data;
}

export async function rollbackAiConfig(
  id: number,
): Promise<AiConfigVersionActionResponse> {
  const { data } = await api.post(`/system/ai-configs/${id}/rollback`);
  return data;
}
