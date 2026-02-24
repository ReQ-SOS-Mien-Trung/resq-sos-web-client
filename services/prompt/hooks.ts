import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPrompts,
  getPromptById,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from "./api";
import {
  GetPromptsResponse,
  GetPromptsParams,
  PromptDetailEntity,
  CreatePromptRequest,
  CreatePromptResponse,
  UpdatePromptRequest,
} from "./type";
import { AxiosError } from "axios";

export const PROMPTS_QUERY_KEY = ["prompts"] as const;

export interface UsePromptsOptions {
  params?: GetPromptsParams;
  enabled?: boolean;
}

/**
 * Hook to fetch all prompts with pagination
 */
export function usePrompts(options?: UsePromptsOptions) {
  return useQuery<GetPromptsResponse>({
    queryKey: [...PROMPTS_QUERY_KEY, options?.params],
    queryFn: () => getPrompts(options?.params),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new prompt
 * Handles 409 Conflict (prompt name already exists)
 */
export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation<
    CreatePromptResponse,
    AxiosError<{ message: string }>,
    CreatePromptRequest
  >({
    mutationFn: createPrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROMPTS_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to fetch a single prompt by ID
 */
export function usePromptById(id: number, enabled = true) {
  return useQuery<PromptDetailEntity>({
    queryKey: [...PROMPTS_QUERY_KEY, id],
    queryFn: () => getPromptById(id),
    enabled,
  });
}

/**
 * Hook to update a prompt
 */
export function useUpdatePrompt() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<{ message: string }>,
    { id: number; data: UpdatePromptRequest }
  >({
    mutationFn: ({ id, data }) => updatePrompt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROMPTS_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to delete a prompt
 */
export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<{ message: string }>, number>({
    mutationFn: deletePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PROMPTS_QUERY_KEY,
      });
    },
  });
}
