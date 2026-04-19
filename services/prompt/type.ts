import type {
  ClusterMissionType,
  ClusterSeverityLevel,
} from "@/services/sos_cluster/type";

export type PromptType =
  | "SosPriorityAnalysis"
  | "MissionPlanning"
  | "MissionRequirementsAssessment"
  | "MissionDepotPlanning"
  | "MissionTeamPlanning"
  | "MissionPlanValidation";

export interface PromptEntity {
  id: number;
  status: "Active" | "Draft" | "Archived" | string;
  name: string;
  promptType: PromptType;
  purpose: string | null;
  version: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PromptDetailEntity extends PromptEntity {
  systemPrompt: string | null;
  userPromptTemplate: string | null;
}

export interface GetPromptsResponse {
  items: PromptEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetPromptsParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface PromptVersionSummary {
  id: number;
  status: "Active" | "Draft" | "Archived" | string;
  name: string;
  promptType: PromptType;
  version: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GetPromptVersionsResponse {
  sourcePromptId: number;
  promptType: PromptType;
  items: PromptVersionSummary[];
}

export interface PromptVersionActionResponse {
  id: number;
  name: string;
  promptType: PromptType;
  version: string | null;
  status: "Active" | "Draft" | "Archived" | string;
  message: string;
}

export interface CreatePromptRequest {
  name: string;
  prompt_type: PromptType;
  purpose: string;
  system_prompt: string;
  user_prompt_template: string;
  version: string;
  is_active?: boolean;
}

export interface CreatePromptResponse {
  id: number;
  name: string;
  promptType: PromptType;
  message: string;
}

export interface UpdatePromptRequest {
  name: string;
  prompt_type: PromptType;
  purpose: string;
  system_prompt: string;
  user_prompt_template: string;
  version: string;
  is_active: boolean;
}

export interface TestPromptRescueSuggestionRequest {
  clusterId: number;
  name: string;
  prompt_type: PromptType;
  purpose: string;
  system_prompt: string;
  user_prompt_template: string;
  version: string;
  is_active: boolean;
  ai_config_id?: number;
}

export type TestNewPromptRescueSuggestionRequest =
  TestPromptRescueSuggestionRequest;

export interface PromptTestSupplyItem {
  itemId: number | null;
  itemName: string | null;
  imageUrl: string | null;
  quantity: number;
  unit: string | null;
  plannedPickupLotAllocations: unknown[] | null;
  plannedPickupReusableUnits: unknown[] | null;
  pickupLotAllocations: unknown[] | null;
  pickedReusableUnits: unknown[] | null;
  expectedReturnUnits: unknown[] | null;
  returnedReusableUnits: unknown[] | null;
  actualReturnedQuantity: number | null;
  bufferRatio: number | null;
  bufferQuantity: number | null;
  bufferUsedQuantity: number | null;
  bufferUsedReason: string | null;
  actualDeliveredQuantity: number | null;
}

export interface PromptTestSuggestedTeam {
  teamId: number | null;
  teamName: string | null;
  teamType: string | null;
  reason: string | null;
  assemblyPointId: number | null;
  assemblyPointName: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
}

export interface PromptTestSuggestedActivity {
  step: number;
  activityType: string;
  description: string;
  priority: string;
  estimatedTime: string;
  executionMode: string | null;
  requiredTeamCount: number | null;
  coordinationGroupKey: string | null;
  coordinationNotes: string | null;
  sosRequestId: number | null;
  depotId: number | null;
  depotName: string | null;
  depotAddress: string | null;
  assemblyPointId: number | null;
  assemblyPointName: string | null;
  assemblyPointLatitude: number | null;
  assemblyPointLongitude: number | null;
  destinationName: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  suppliesToCollect: PromptTestSupplyItem[] | null;
  suggestedTeam: PromptTestSuggestedTeam | null;
}

export interface PromptTestSuggestedResource {
  resourceType: string;
  description: string;
  quantity: number;
  priority: string;
}

export interface PromptTestSupplyShortage {
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

export interface PromptTestPipelineMetadata {
  pipelineStatus: string | null;
  executionMode: string | null;
  finalResultSource: string | null;
  usedLegacyFallback: boolean;
  legacyFallbackReason: string | null;
  stages: Record<string, unknown>;
}

export interface TestPromptRescueSuggestionResponse {
  isSuccess: boolean;
  promptId: number;
  promptName: string;
  promptType: PromptType;
  clusterId: number;
  suggestionId: number | null;
  model: string | null;
  modelName: string | null;
  aiResponse: string | null;
  rawAiResponse: string | null;
  errorMessage: string | null;
  httpStatusCode: number | null;
  responseTimeMs: number | null;
  sosRequestCount: number;
  suggestedMissionTitle: string | null;
  suggestedMissionType: ClusterMissionType | string | null;
  suggestedPriorityScore: number | null;
  suggestedSeverityLevel: ClusterSeverityLevel | string | null;
  overallAssessment: string | null;
  suggestedActivities: PromptTestSuggestedActivity[];
  suggestedResources: PromptTestSuggestedResource[];
  estimatedDuration: string | null;
  specialNotes: string | null;
  needsAdditionalDepot: boolean;
  supplyShortages: PromptTestSupplyShortage[];
  confidenceScore: number | null;
  needsManualReview: boolean;
  lowConfidenceWarning: string | null;
  multiDepotRecommended: boolean;
  pipelineMetadata: PromptTestPipelineMetadata | null;
}
