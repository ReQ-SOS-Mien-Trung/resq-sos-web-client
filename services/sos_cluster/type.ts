// ---- SOS Cluster ----

// Severity level
export type ClusterSeverityLevel = "Low" | "Medium" | "High" | "Critical";

// Cluster lifecycle status from backend
export type ClusterLifecycleStatus =
  | "Pending"
  | "Suggested"
  | "InProgress"
  | "Completed";

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
  status: ClusterLifecycleStatus;
  // Kept optional for compatibility with old payloads.
  isMissionCreated?: boolean;
  createdAt: string;
  lastUpdatedAt: string;
}

// GET /emergency/sos-clusters response
export interface GetSOSClustersResponse {
  clusters: SOSClusterEntity[];
  pageNumber?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

// GET /emergency/sos-clusters query params
export interface GetSOSClustersParams {
  pageNumber?: number;
  pageSize?: number;
  sosRequestId?: number;
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
export interface ClusterSupplyLotAllocation {
  lotId: number;
  quantityTaken: number;
  receivedDate: string;
  expiredDate: string;
  remainingQuantityAfterExecution: number;
}

export interface ClusterSupplyReusableUnit {
  reusableItemId?: number | null;
  itemModelId?: number | null;
  itemName?: string | null;
  serialNumber?: string | null;
  condition?: string | null;
  note?: string | null;
  [key: string]: unknown;
}

export interface ClusterSupplyCollection {
  itemId: number | null;
  itemName: string;
  itemType?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unit: string;
  plannedPickupLotAllocations?: ClusterSupplyLotAllocation[] | null;
  plannedPickupReusableUnits?: ClusterSupplyReusableUnit[] | null;
  pickupLotAllocations?: ClusterSupplyLotAllocation[] | null;
  pickedReusableUnits?: ClusterSupplyReusableUnit[] | null;
  availableDeliveryLotAllocations?: ClusterSupplyLotAllocation[] | null;
  availableDeliveryReusableUnits?: ClusterSupplyReusableUnit[] | null;
  deliveredLotAllocations?: ClusterSupplyLotAllocation[] | null;
  deliveredReusableUnits?: ClusterSupplyReusableUnit[] | null;
  expectedReturnLotAllocations?: ClusterSupplyLotAllocation[] | null;
  expectedReturnUnits?: ClusterSupplyReusableUnit[] | null;
  returnedLotAllocations?: ClusterSupplyLotAllocation[] | null;
  returnedReusableUnits?: ClusterSupplyReusableUnit[] | null;
  actualReturnedQuantity?: number | null;
  bufferRatio?: number | null;
  bufferQuantity?: number | null;
  bufferUsedQuantity?: number | null;
  bufferUsedReason?: string | null;
  actualDeliveredQuantity?: number | null;
}

export interface ClusterTargetVictim {
  [key: string]: unknown;
}

// Suggested team info (shape may expand from backend over time)
export interface ClusterSuggestedTeam {
  teamId?: number | null;
  teamName?: string | null;
  teamType?: string | null;
  reason?: string | null;
  assemblyPointId?: number | null;
  assemblyPointName?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  contactPhone?: string | null;
  estimatedEtaMinutes?: number | null;
  distanceKm?: number | null;
  [key: string]: unknown;
}

// Suggested activity step
export interface ClusterSuggestedActivity {
  step: number;
  activityType: ClusterActivityType;
  description: string;
  targetVictimSummary?: string | null;
  targetVictims?: ClusterTargetVictim[];
  priority: string | null;
  estimatedTime: string | null;
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
  destinationName?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  suppliesToCollect: ClusterSupplyCollection[] | null;
  suggestedTeam?: ClusterSuggestedTeam | null;
}

// Activity group (wraps suggested activities)
export interface MissionSuggestionActivity {
  id: number;
  activityType: ClusterActivityType;
  suggestionPhase: string;
  suggestedActivities: ClusterSuggestedActivity[];
  confidenceScore: number | null;
  createdAt: string | null;
}

export interface ClusterSupplyShortage {
  sosRequestId: number | null;
  itemId: number | null;
  itemName: string;
  unit: string | null;
  selectedDepotId: number | null;
  selectedDepotName: string | null;
  neededQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
  notes: string | null;
}

// Mission suggestion entity
export interface MissionSuggestionEntity {
  id: number;
  clusterId: number | null;
  modelName: string | null;
  analysisType: string | null;
  suggestedMissionTitle: string | null;
  suggestedMissionType: ClusterMissionType | string | null;
  suggestedPriorityScore: number | null;
  suggestedSeverityLevel: ClusterSeverityLevel | string | null;
  confidenceScore: number | null;
  overallAssessment: string | null;
  estimatedDuration: string | null;
  specialNotes: string | null;
  mixedRescueReliefWarning: string;
  needsManualReview: boolean;
  lowConfidenceWarning: string | null;
  needsAdditionalDepot: boolean;
  supplyShortages: ClusterSupplyShortage[];
  suggestedResources: ClusterSuggestedResource[];
  suggestionScope: string | null;
  createdAt: string | null;
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
  suggestionId: number | null;
  isSuccess: boolean;
  errorMessage: string | null;
  modelName: string | null;
  responseTimeMs: number;
  sosRequestCount: number;
  suggestedMissionTitle: string | null;
  suggestedMissionType: ClusterMissionType | string | null;
  suggestedPriorityScore: number | null;
  suggestedSeverityLevel: ClusterSeverityLevel | string | null;
  overallAssessment: string | null;
  suggestedActivities: ClusterSuggestedActivity[];
  suggestedResources: ClusterSuggestedResource[];
  estimatedDuration: string | null;
  specialNotes: string | null;
  mixedRescueReliefWarning: string;
  needsAdditionalDepot: boolean;
  supplyShortages: ClusterSupplyShortage[];
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
