import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  activatePrompt,
  createPrompt,
  createPromptDraft,
  deletePrompt,
  getPromptById,
  getPrompts,
  getPromptVersions,
  rollbackPrompt,
  testNewPromptRescueSuggestion,
  testPromptRescueSuggestion,
  updatePrompt,
} from "./api";
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

export const PROMPTS_QUERY_KEY = ["prompts"] as const;

export interface UsePromptsOptions {
  params?: GetPromptsParams;
  enabled?: boolean;
}

export function usePrompts(options?: UsePromptsOptions) {
  return useQuery<GetPromptsResponse>({
    queryKey: [...PROMPTS_QUERY_KEY, options?.params],
    queryFn: () => getPrompts(options?.params),
    enabled: options?.enabled ?? true,
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation<
    CreatePromptResponse,
    AxiosError<{ message: string }>,
    CreatePromptRequest
  >({
    mutationFn: createPrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_QUERY_KEY });
    },
  });
}

export function usePromptById(id: number | null, enabled = true) {
  return useQuery<PromptDetailEntity>({
    queryKey: [...PROMPTS_QUERY_KEY, "detail", id],
    queryFn: () => getPromptById(id as number),
    enabled: enabled && typeof id === "number",
  });
}

export function usePromptVersions(id: number | null, enabled = true) {
  return useQuery<GetPromptVersionsResponse>({
    queryKey: [...PROMPTS_QUERY_KEY, "versions", id],
    queryFn: () => getPromptVersions(id as number),
    enabled: enabled && typeof id === "number",
  });
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<{ message: string }>,
    { id: number; data: UpdatePromptRequest }
  >({
    mutationFn: ({ id, data }) => updatePrompt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_QUERY_KEY });
    },
  });
}

export function useCreatePromptDraft() {
  const queryClient = useQueryClient();

  return useMutation<
    PromptVersionActionResponse,
    AxiosError<{ message: string }>,
    number
  >({
    mutationFn: createPromptDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_QUERY_KEY });
    },
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<{ message: string }>, number>({
    mutationFn: deletePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_QUERY_KEY });
    },
  });
}

export function useActivatePrompt() {
  const queryClient = useQueryClient();

  return useMutation<
    PromptVersionActionResponse,
    AxiosError<{ message: string }>,
    number
  >({
    mutationFn: activatePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_QUERY_KEY });
    },
  });
}

export function useRollbackPrompt() {
  const queryClient = useQueryClient();

  return useMutation<
    PromptVersionActionResponse,
    AxiosError<{ message: string }>,
    number
  >({
    mutationFn: rollbackPrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMPTS_QUERY_KEY });
    },
  });
}

export function useTestPromptRescueSuggestion() {
  return useMutation<
    TestPromptRescueSuggestionResponse,
    AxiosError<{ message: string }>,
    { id: number; data: TestPromptRescueSuggestionRequest }
  >({
    mutationFn: ({ id, data }) => testPromptRescueSuggestion(id, data),
  });
}

export function useTestNewPromptRescueSuggestion() {
  return useMutation<
    TestPromptRescueSuggestionResponse,
    AxiosError<{ message: string }>,
    TestNewPromptRescueSuggestionRequest
  >({
    mutationFn: testNewPromptRescueSuggestion,
  });
}
