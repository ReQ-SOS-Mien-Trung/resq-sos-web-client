import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  getRescuerScoreVisibilityConfig,
  getSosPriorityRuleConfig,
  updateRescuerScoreVisibilityConfig,
  updateSosPriorityRuleConfig,
} from "./api";
import {
  RescuerScoreVisibilityConfigEntity,
  SosPriorityRuleConfigEntity,
  UpdateRescuerScoreVisibilityConfigRequest,
  UpdateSosPriorityRuleConfigRequest,
} from "./type";

export const SOS_PRIORITY_RULE_CONFIG_QUERY_KEY = [
  "sos-priority-rule-config",
] as const;

export const RESCUER_SCORE_VISIBILITY_CONFIG_QUERY_KEY = [
  "rescuer-score-visibility-config",
] as const;

/**
 * Hook to fetch SOS priority rule config
 */
export function useSosPriorityRuleConfig(enabled = true) {
  return useQuery<SosPriorityRuleConfigEntity>({
    queryKey: SOS_PRIORITY_RULE_CONFIG_QUERY_KEY,
    queryFn: getSosPriorityRuleConfig,
    enabled,
  });
}

/**
 * Hook to update SOS priority rule config
 */
export function useUpdateSosPriorityRuleConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<{ message: string }>,
    { id: number; data: UpdateSosPriorityRuleConfigRequest }
  >({
    mutationFn: ({ id, data }) => updateSosPriorityRuleConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SOS_PRIORITY_RULE_CONFIG_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to fetch rescuer score visibility config
 */
export function useRescuerScoreVisibilityConfig(enabled = true) {
  return useQuery<RescuerScoreVisibilityConfigEntity>({
    queryKey: RESCUER_SCORE_VISIBILITY_CONFIG_QUERY_KEY,
    queryFn: getRescuerScoreVisibilityConfig,
    enabled,
  });
}

/**
 * Hook to update rescuer score visibility config
 */
export function useUpdateRescuerScoreVisibilityConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<{ message: string }>,
    UpdateRescuerScoreVisibilityConfigRequest
  >({
    mutationFn: (data) => updateRescuerScoreVisibilityConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RESCUER_SCORE_VISIBILITY_CONFIG_QUERY_KEY,
      });
    },
  });
}
