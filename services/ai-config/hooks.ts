import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  activateAiConfig,
  createAiConfig,
  createAiConfigDraft,
  deleteAiConfigDraft,
  getAiConfigById,
  getAiConfigVersions,
  getAiConfigs,
  rollbackAiConfig,
  updateAiConfigDraft,
} from "./api";
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

export const AI_CONFIGS_QUERY_KEY = ["ai-configs"] as const;

export function useAiConfigs(params?: GetAiConfigsParams, enabled = true) {
  return useQuery<GetAiConfigsResponse>({
    queryKey: [...AI_CONFIGS_QUERY_KEY, params],
    queryFn: () => getAiConfigs(params),
    enabled,
  });
}

export function useAiConfigById(id: number | null, enabled = true) {
  return useQuery<AiConfigDetailEntity>({
    queryKey: [...AI_CONFIGS_QUERY_KEY, "detail", id],
    queryFn: () => getAiConfigById(id as number),
    enabled: enabled && typeof id === "number",
  });
}

export function useAiConfigVersions(id: number | null, enabled = true) {
  return useQuery<GetAiConfigVersionsResponse>({
    queryKey: [...AI_CONFIGS_QUERY_KEY, "versions", id],
    queryFn: () => getAiConfigVersions(id as number),
    enabled: enabled && typeof id === "number",
  });
}

export function useCreateAiConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    CreateAiConfigResponse,
    AxiosError<{ message: string }>,
    CreateAiConfigRequest
  >({
    mutationFn: createAiConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_CONFIGS_QUERY_KEY });
    },
  });
}

export function useCreateAiConfigDraft() {
  const queryClient = useQueryClient();

  return useMutation<
    AiConfigVersionActionResponse,
    AxiosError<{ message: string }>,
    number
  >({
    mutationFn: createAiConfigDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_CONFIGS_QUERY_KEY });
    },
  });
}

export function useUpdateAiConfigDraft() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<{ message: string }>,
    { id: number; data: UpdateAiConfigRequest }
  >({
    mutationFn: ({ id, data }) => updateAiConfigDraft(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_CONFIGS_QUERY_KEY });
    },
  });
}

export function useDeleteAiConfigDraft() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<{ message: string }>, number>({
    mutationFn: deleteAiConfigDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_CONFIGS_QUERY_KEY });
    },
  });
}

export function useActivateAiConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    AiConfigVersionActionResponse,
    AxiosError<{ message: string }>,
    number
  >({
    mutationFn: activateAiConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_CONFIGS_QUERY_KEY });
    },
  });
}

export function useRollbackAiConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    AiConfigVersionActionResponse,
    AxiosError<{ message: string }>,
    number
  >({
    mutationFn: rollbackAiConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_CONFIGS_QUERY_KEY });
    },
  });
}
