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

export type AiProvider = "Gemini" | "OpenRouter";

// Prompt Entity (item in paginated list)
export interface PromptEntity {
  id: number;
  name: string;
  promptType: PromptType;
  provider: AiProvider;
  purpose: string | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  version: string | null;
  apiUrl: string | null;
  apiKeyMasked: string | null;
  hasApiKey: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

// Prompt Detail Entity (GET /system/prompts/{id})
export interface PromptDetailEntity extends PromptEntity {
  systemPrompt: string | null;
  userPromptTemplate: string | null;
  apiKey: string | null;
}

// Paginated Response for Prompts
export interface GetPromptsResponse {
  items: PromptEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query params for fetching prompts
export interface GetPromptsParams {
  pageNumber?: number;
  pageSize?: number;
}

// Create Prompt Request
export interface CreatePromptRequest {
  name: string;
  prompt_type: PromptType;
  provider: AiProvider;
  purpose: string;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  version: string;
  api_url?: string;
  api_key?: string;
  is_active?: boolean;
}

// Create Prompt Response
export interface CreatePromptResponse {
  name: string;
  message: string;
}

// Update Prompt Request
export interface UpdatePromptRequest {
  name: string;
  prompt_type: PromptType;
  provider: AiProvider;
  purpose: string;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  version: string;
  api_url?: string;
  api_key?: string;
  is_active: boolean;
}

export interface PreviewPromptRescueSuggestionRequest {
  cluster_id: number;
  source_prompt_id?: number;
  prompt_type: PromptType;
  provider: AiProvider;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  version: string;
  api_url?: string;
  api_key?: string;
}

export interface TestPromptRescueSuggestionRequest {
  clusterId: number;
}

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
