// ---- SOS Cluster ----

// Severity level
export type ClusterSeverityLevel = "Low" | "Medium" | "High" | "Critical";

// SOS Cluster Entity
export interface SOSClusterEntity {
  id: number;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number | null;
  severityLevel: ClusterSeverityLevel;
  waterLevel: string | null;
  victimEstimated: number | null;
  childrenCount: number | null;
  elderlyCount: number | null;
  medicalUrgencyScore: number | null;
  sosRequestCount: number;
  sosRequestIds: number[];
  isMissionCreated: boolean;
  createdAt: string;
  lastUpdatedAt: string;
}

// GET /emergency/sos-clusters response
export interface GetSOSClustersResponse {
  clusters: SOSClusterEntity[];
}

// POST /emergency/sos-clusters request
export interface CreateSOSClusterRequest {
  sosRequestIds: number[];
}

// POST /emergency/sos-clusters response
export interface CreateSOSClusterResponse {
  clusterId: number;
  sosRequestCount: number;
  sosRequestIds: number[];
  severityLevel: ClusterSeverityLevel;
  createdAt: string;
}

// ---- Mission Suggestions ----

// Activity type
export type ClusterActivityType =
  | "ASSESS"
  | "RESCUE"
  | "MEDICAL_AID"
  | "EVACUATE"
  | "DELIVER_SUPPLIES"
  | "COLLECT_SUPPLIES"
  | "RETURN_SUPPLIES"
  | "MIXED";

// Supply collection details
export interface ClusterSupplyCollection {
  itemId: number;
  itemName: string;
  quantity: number;
  unit: string;
}

// Suggested team info (shape may expand from backend over time)
export interface ClusterSuggestedTeam {
  teamId?: number | null;
  teamName?: string | null;
  teamType?: string | null;
  reason?: string | null;
  assemblyPointName?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  contactPhone?: string | null;
  estimatedEtaMinutes?: number | null;
  [key: string]: unknown;
}

// Suggested activity step
export interface ClusterSuggestedActivity {
  step: number;
  activityType: ClusterActivityType;
  description: string;
  priority: string;
  estimatedTime: string;
  executionMode?: string | null;
  requiredTeamCount?: number | null;
  coordinationGroupKey?: string | null;
  coordinationNotes?: string | null;
  sosRequestId: number | null;
  depotId: number | null;
  depotName: string | null;
  depotAddress: string | null;
  assemblyPointId?: number | null;
  assemblyPointName?: string | null;
  assemblyPointLatitude?: number | null;
  assemblyPointLongitude?: number | null;
  suppliesToCollect: ClusterSupplyCollection[] | null;
  suggestedTeam?: ClusterSuggestedTeam | null;
}

// Activity group (wraps suggested activities)
export interface MissionSuggestionActivity {
  id: number;
  activityType: ClusterActivityType;
  suggestionPhase: string;
  suggestedActivities: ClusterSuggestedActivity[];
  confidenceScore: number;
  createdAt: string;
}

// Mission suggestion entity
export interface MissionSuggestionEntity {
  id: number;
  clusterId: number;
  modelName: string;
  analysisType: string;
  suggestedMissionTitle: string;
  suggestedPriorityScore: number;
  confidenceScore: number;
  suggestionScope: string | null;
  createdAt: string;
  activities: MissionSuggestionActivity[];
}

// GET /emergency/sos-clusters/{clusterId}/mission-suggestions response
export interface GetMissionSuggestionsResponse {
  clusterId: number;
  totalSuggestions: number;
  missionSuggestions: MissionSuggestionEntity[];
}

// ---- Rescue Suggestion (POST trigger) ----

// Resource type
export type ClusterResourceType =
  | "TEAM"
  | "BOAT"
  | "MEDICAL_KIT"
  | "EQUIPMENT"
  | "VEHICLE"
  | "FOOD"
  | "WATER"
  | "FUEL";

// Suggested resource in rescue plan
export interface ClusterSuggestedResource {
  resourceType: ClusterResourceType;
  description: string;
  quantity: number;
  priority: string;
}

// Mission type
export type ClusterMissionType =
  | "RESCUE"
  | "EVACUATE"
  | "MEDICAL"
  | "SUPPLY"
  | "MIXED";

// POST /emergency/sos-clusters/{clusterId}/rescue-suggestion response
export interface ClusterRescueSuggestionResponse {
  suggestionId: number;
  isSuccess: boolean;
  errorMessage: string | null;
  modelName: string;
  responseTimeMs: number;
  sosRequestCount: number;
  suggestedMissionTitle: string;
  suggestedMissionType: ClusterMissionType;
  suggestedPriorityScore: number;
  suggestedSeverityLevel: ClusterSeverityLevel;
  overallAssessment: string;
  suggestedActivities: ClusterSuggestedActivity[];
  suggestedResources: ClusterSuggestedResource[];
  estimatedDuration: string;
  specialNotes: string | null;
  confidenceScore: number;
  needsManualReview: boolean;
  lowConfidenceWarning: string | null;
  multiDepotRecommended: boolean;
}

// ---- Alternative Depots ----

export interface AlternativeDepotItemCoverage {
  itemId: number | null;
  itemName: string;
  unit: string | null;
  neededQuantity: number;
  availableQuantity: number;
  coveredQuantity: number;
  remainingQuantity: number;
  coverageStatus: "Full" | "Partial" | "None" | string;
}

export interface AlternativeDepot {
  depotId: number;
  depotName: string;
  depotAddress: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number;
  coversAllShortages: boolean;
  coveredQuantity: number;
  totalMissingQuantity: number;
  coveragePercent: number;
  reason: string;
  itemCoverageDetails: AlternativeDepotItemCoverage[];
}

export interface AlternativeDepotsResponse {
  clusterId: number;
  selectedDepotId: number;
  sourceSuggestionId: number;
  totalShortageItems: number;
  totalMissingQuantity: number;
  alternativeDepots: AlternativeDepot[];
}

// ---- SSE Stream types ----

export type SseEventType = "status" | "chunk" | "result" | "error";

export interface SseMissionEvent {
  eventType: SseEventType;
  data: string | null;
  result: ClusterRescueSuggestionResponse | null;
}

export interface AiStreamState {
  status: string;
  thinkingText: string;
  result: ClusterRescueSuggestionResponse | null;
  error: string | null;
  loading: boolean;
}
