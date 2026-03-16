import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { getSosPriorityRuleConfig, updateSosPriorityRuleConfig } from "./api";
import {
  SosPriorityRuleConfigEntity,
  UpdateSosPriorityRuleConfigRequest,
} from "./type";

export const SOS_PRIORITY_RULE_CONFIG_QUERY_KEY = [
  "sos-priority-rule-config",
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
