import api from "@/config/axios";
import {
  GetSOSClustersResponse,
  CreateSOSClusterRequest,
  CreateSOSClusterResponse,
  GetMissionSuggestionsResponse,
  ClusterRescueSuggestionResponse,
} from "./type";

/**
 * Get all SOS clusters
 * GET /emergency/sos-clusters
 */
export async function getSOSClusters(): Promise<GetSOSClustersResponse> {
  const { data } = await api.get("/emergency/sos-clusters");
  return data;
}

/**
 * Create a new SOS cluster from SOS request IDs
 * POST /emergency/sos-clusters
 */
export async function createSOSCluster(
  request: CreateSOSClusterRequest,
): Promise<CreateSOSClusterResponse> {
  const { data } = await api.post("/emergency/sos-clusters", request);
  return data;
}

/**
 * Get mission suggestions for a SOS cluster
 * GET /emergency/sos-clusters/{clusterId}/mission-suggestions
 */
export async function getMissionSuggestions(
  clusterId: number,
): Promise<GetMissionSuggestionsResponse> {
  const { data } = await api.get(
    `/emergency/sos-clusters/${clusterId}/mission-suggestions`,
  );
  return data;
}

/**
 * Trigger AI rescue suggestion for a SOS cluster
 * POST /emergency/sos-clusters/{clusterId}/rescue-suggestion
 */
export async function getClusterRescueSuggestion(
  clusterId: number,
): Promise<ClusterRescueSuggestionResponse> {
  const { data } = await api.post(
    `/emergency/sos-clusters/${clusterId}/rescue-suggestion`,
    {},
    { timeout: 60000 }, // AI processing can take 15-30s
  );
  return data;
}
