import api from "@/config/axios";
import {
  CreatePromptRequest,
  CreatePromptResponse,
  GetPromptVersionsResponse,
  GetPromptsParams,
  GetPromptsResponse,
  PromptDetailEntity,
  PromptVersionActionResponse,
  TestNewPromptRescueSuggestionRequest,
  TestPromptRescueSuggestionRequest,
  TestPromptRescueSuggestionResponse,
  UpdatePromptRequest,
} from "./type";

function withPromptTypeAlias<T extends { prompt_type: string }>(request: T) {
  return {
    ...request,
    promptType: request.prompt_type,
  };
}

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

export async function createPrompt(
  request: CreatePromptRequest,
): Promise<CreatePromptResponse> {
  const { data } = await api.post(
    "/system/prompts",
    withPromptTypeAlias(request),
  );

  return data;
}

export async function getPromptById(id: number): Promise<PromptDetailEntity> {
  const { data } = await api.get(`/system/prompts/${id}`);
  return data;
}

export async function getPromptVersions(
  id: number,
): Promise<GetPromptVersionsResponse> {
  const { data } = await api.get(`/system/prompts/${id}/versions`);
  return data;
}

export async function updatePrompt(
  id: number,
  request: UpdatePromptRequest,
): Promise<void> {
  await api.put(`/system/prompts/drafts/${id}`, withPromptTypeAlias(request));
}

export async function deletePrompt(id: number): Promise<void> {
  await api.delete(`/system/prompts/drafts/${id}`);
}

export async function createPromptDraft(
  id: number,
): Promise<PromptVersionActionResponse> {
  const { data } = await api.post(`/system/prompts/${id}/drafts`);
  return data;
}

export async function activatePrompt(
  id: number,
): Promise<PromptVersionActionResponse> {
  const { data } = await api.post(`/system/prompts/${id}/activate`);
  return data;
}

export async function rollbackPrompt(
  id: number,
): Promise<PromptVersionActionResponse> {
  const { data } = await api.post(`/system/prompts/${id}/rollback`);
  return data;
}

export async function testPromptRescueSuggestion(
  id: number,
  request: TestPromptRescueSuggestionRequest,
): Promise<TestPromptRescueSuggestionResponse> {
  const { data } = await api.post(
    `/system/prompts/${id}/test`,
    withPromptTypeAlias(request),
    {
      timeout: 120000,
    },
  );

  return data;
}

export async function testNewPromptRescueSuggestion(
  request: TestNewPromptRescueSuggestionRequest,
): Promise<TestPromptRescueSuggestionResponse> {
  const { data } = await api.post(
    "/system/prompts/test",
    withPromptTypeAlias(request),
    {
      timeout: 120000,
    },
  );

  return data;
}
