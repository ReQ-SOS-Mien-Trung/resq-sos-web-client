import api from "@/config/axios";
import {
  GetPromptsResponse,
  GetPromptsParams,
  PromptDetailEntity,
  CreatePromptRequest,
  CreatePromptResponse,
  UpdatePromptRequest,
} from "./type";

/**
 * Get all prompts with pagination
 * GET /system/prompts
 */
export async function getPrompts(
  params?: GetPromptsParams,
): Promise<GetPromptsResponse> {
  const { data } = await api.get("/system/prompts", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  });
  return data;
}

/**
 * Create a new prompt
 * POST /system/prompts
 */
export async function createPrompt(
  request: CreatePromptRequest,
): Promise<CreatePromptResponse> {
  const { data } = await api.post("/system/prompts", request);
  return data;
}

/**
 * Get a prompt by ID
 * GET /system/prompts/{id}
 */
export async function getPromptById(id: number): Promise<PromptDetailEntity> {
  const { data } = await api.get(`/system/prompts/${id}`);
  return data;
}

/**
 * Update a prompt
 * PUT /system/prompts/{id}
 */
export async function updatePrompt(
  id: number,
  request: UpdatePromptRequest,
): Promise<void> {
  await api.put(`/system/prompts/${id}`, request);
}

/**
 * Delete a prompt
 * DELETE /system/prompts/{id}
 */
export async function deletePrompt(id: number): Promise<void> {
  await api.delete(`/system/prompts/${id}`);
}
