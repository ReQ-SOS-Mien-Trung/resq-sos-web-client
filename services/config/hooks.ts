import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  activateSosPriorityRuleConfig,
  createSosPriorityRuleConfigDraft,
  deleteSosPriorityRuleConfigDraft,
  getRescueTeamRadiusConfig,
  getRescuerScoreVisibilityConfig,
  getSosClusterGroupingConfig,
  getSosPriorityRuleConfig,
  getSosPriorityRuleConfigById,
  getSosPriorityRuleConfigVersions,
  updateRescueTeamRadiusConfig,
  updateRescuerScoreVisibilityConfig,
  updateSosClusterGroupingConfig,
  updateSosPriorityRuleConfigDraft,
  validateSosPriorityRuleConfig,
} from "./api";
import {
  RescuerScoreVisibilityConfigEntity,
  RescueTeamRadiusConfigEntity,
  SosClusterGroupingConfigEntity,
  SosPriorityRuleConfigEntity,
  SosPriorityRuleConfigValidationResponse,
  SosPriorityRuleConfigVersionSummary,
  UpdateRescueTeamRadiusConfigRequest,
  UpdateRescuerScoreVisibilityConfigRequest,
  UpdateSosClusterGroupingConfigRequest,
  UpdateSosPriorityRuleConfigRequest,
  ValidateSosPriorityRuleConfigRequest,
} from "./type";

export const SOS_PRIORITY_RULE_CONFIG_QUERY_KEY = [
  "sos-priority-rule-config",
] as const;

export const SOS_PRIORITY_RULE_CONFIG_VERSIONS_QUERY_KEY = [
  "sos-priority-rule-config-versions",
] as const;

export const RESCUER_SCORE_VISIBILITY_CONFIG_QUERY_KEY = [
  "rescuer-score-visibility-config",
] as const;

export const SOS_CLUSTER_GROUPING_CONFIG_QUERY_KEY = [
  "sos-cluster-grouping-config",
] as const;

export const RESCUE_TEAM_RADIUS_CONFIG_QUERY_KEY = [
  "rescue-team-radius-config",
] as const;

export function useSosPriorityRuleConfig(enabled = true) {
  return useQuery<SosPriorityRuleConfigEntity>({
    queryKey: SOS_PRIORITY_RULE_CONFIG_QUERY_KEY,
    queryFn: getSosPriorityRuleConfig,
    enabled,
  });
}

export function useSosPriorityRuleConfigById(id: number | null, enabled = true) {
  return useQuery<SosPriorityRuleConfigEntity>({
    queryKey: [...SOS_PRIORITY_RULE_CONFIG_QUERY_KEY, id],
    queryFn: () => getSosPriorityRuleConfigById(id as number),
    enabled: enabled && typeof id === "number",
    retry: false,
  });
}

export function useSosPriorityRuleConfigVersions(enabled = true) {
  return useQuery<SosPriorityRuleConfigVersionSummary[]>({
    queryKey: SOS_PRIORITY_RULE_CONFIG_VERSIONS_QUERY_KEY,
    queryFn: getSosPriorityRuleConfigVersions,
    enabled,
  });
}

export function useCreateSosPriorityRuleConfigDraft() {
  const queryClient = useQueryClient();

  return useMutation<
    SosPriorityRuleConfigEntity,
    AxiosError<{ message: string }>,
    number | null | undefined
  >({
    mutationFn: createSosPriorityRuleConfigDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOS_PRIORITY_RULE_CONFIG_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: SOS_PRIORITY_RULE_CONFIG_VERSIONS_QUERY_KEY,
      });
    },
  });
}

export function useUpdateSosPriorityRuleConfigDraft() {
  const queryClient = useQueryClient();

  return useMutation<
    SosPriorityRuleConfigEntity,
    AxiosError<{ message: string }>,
    { id: number; data: UpdateSosPriorityRuleConfigRequest }
  >({
    mutationFn: ({ id, data }) => updateSosPriorityRuleConfigDraft(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SOS_PRIORITY_RULE_CONFIG_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...SOS_PRIORITY_RULE_CONFIG_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: SOS_PRIORITY_RULE_CONFIG_VERSIONS_QUERY_KEY,
      });
    },
  });
}

export function useDeleteSosPriorityRuleConfigDraft() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<{ message: string }>, number>({
    mutationFn: deleteSosPriorityRuleConfigDraft,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: SOS_PRIORITY_RULE_CONFIG_QUERY_KEY });
      queryClient.removeQueries({
        queryKey: [...SOS_PRIORITY_RULE_CONFIG_QUERY_KEY, deletedId],
      });
      queryClient.invalidateQueries({
        queryKey: SOS_PRIORITY_RULE_CONFIG_VERSIONS_QUERY_KEY,
      });
    },
  });
}

export function useValidateSosPriorityRuleConfig() {
  return useMutation<
    SosPriorityRuleConfigValidationResponse,
    AxiosError<{ message: string }>,
    ValidateSosPriorityRuleConfigRequest
  >({
    mutationFn: validateSosPriorityRuleConfig,
  });
}

export function useActivateSosPriorityRuleConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    SosPriorityRuleConfigEntity,
    AxiosError<{ message: string }>,
    number
  >({
    mutationFn: activateSosPriorityRuleConfig,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SOS_PRIORITY_RULE_CONFIG_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...SOS_PRIORITY_RULE_CONFIG_QUERY_KEY, data.id],
      });
      queryClient.invalidateQueries({
        queryKey: SOS_PRIORITY_RULE_CONFIG_VERSIONS_QUERY_KEY,
      });
    },
  });
}

export function useRescuerScoreVisibilityConfig(enabled = true) {
  return useQuery<RescuerScoreVisibilityConfigEntity>({
    queryKey: RESCUER_SCORE_VISIBILITY_CONFIG_QUERY_KEY,
    queryFn: getRescuerScoreVisibilityConfig,
    enabled,
  });
}

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

export function useSosClusterGroupingConfig(enabled = true) {
  return useQuery<SosClusterGroupingConfigEntity>({
    queryKey: SOS_CLUSTER_GROUPING_CONFIG_QUERY_KEY,
    queryFn: getSosClusterGroupingConfig,
    enabled,
  });
}

export function useUpdateSosClusterGroupingConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<{ message: string }>,
    UpdateSosClusterGroupingConfigRequest
  >({
    mutationFn: (data) => updateSosClusterGroupingConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SOS_CLUSTER_GROUPING_CONFIG_QUERY_KEY,
      });
    },
  });
}

export function useRescueTeamRadiusConfig(enabled = true) {
  return useQuery<RescueTeamRadiusConfigEntity>({
    queryKey: RESCUE_TEAM_RADIUS_CONFIG_QUERY_KEY,
    queryFn: getRescueTeamRadiusConfig,
    enabled,
  });
}

export function useUpdateRescueTeamRadiusConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    AxiosError<{ message: string }>,
    UpdateRescueTeamRadiusConfigRequest
  >({
    mutationFn: (data) => updateRescueTeamRadiusConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RESCUE_TEAM_RADIUS_CONFIG_QUERY_KEY,
      });
    },
  });
}
