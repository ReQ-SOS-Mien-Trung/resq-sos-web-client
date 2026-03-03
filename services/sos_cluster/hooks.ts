import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getSOSClusters,
  createSOSCluster,
  getMissionSuggestions,
  getClusterRescueSuggestion,
} from "./api";
import {
  GetSOSClustersResponse,
  CreateSOSClusterRequest,
  CreateSOSClusterResponse,
  GetMissionSuggestionsResponse,
  ClusterRescueSuggestionResponse,
} from "./type";

export const SOS_CLUSTERS_QUERY_KEY = ["sos-clusters"] as const;
export const MISSION_SUGGESTIONS_QUERY_KEY = ["mission-suggestions"] as const;

export interface UseMissionSuggestionsOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch all SOS clusters
 */
export function useSOSClusters() {
  return useQuery<GetSOSClustersResponse>({
    queryKey: SOS_CLUSTERS_QUERY_KEY,
    queryFn: getSOSClusters,
  });
}

/**
 * Hook to create a new SOS cluster (mutation)
 */
export function useCreateSOSCluster() {
  return useMutation<
    CreateSOSClusterResponse,
    Error,
    CreateSOSClusterRequest
  >({
    mutationFn: createSOSCluster,
  });
}

/**
 * Hook to fetch mission suggestions for a SOS cluster
 */
export function useMissionSuggestions(
  clusterId: number,
  options?: UseMissionSuggestionsOptions,
) {
  return useQuery<GetMissionSuggestionsResponse>({
    queryKey: [...MISSION_SUGGESTIONS_QUERY_KEY, clusterId],
    queryFn: () => getMissionSuggestions(clusterId),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to trigger AI rescue suggestion for a SOS cluster (mutation)
 */
export function useClusterRescueSuggestion() {
  return useMutation<ClusterRescueSuggestionResponse, Error, number>({
    mutationFn: (clusterId: number) => getClusterRescueSuggestion(clusterId),
  });
}
