// SOS Request Status
export type SOSRequestStatus =
  | "Pending"
  | "InProgress"
  | "Assigned"
  | "Completed"
  | "Cancelled";

// SOS Request Priority Level
export type SOSPriorityLevel = "Low" | "Medium" | "High" | "Critical";

// SOS Situation Type
export type SOSSituation = "TRAPPED" | "ISOLATED" | "STRANDED" | "OTHER";

// Supply types
export type SupplyType =
  | "MEDICINE"
  | "FOOD"
  | "WATER"
  | "RESCUE_EQUIPMENT"
  | "TRANSPORTATION";

// Medical issue types
export type MedicalIssueType =
  | "FRACTURE"
  | "BLEEDING"
  | "CHRONIC_DISEASE"
  | "PREGNANCY"
  | "BREATHING_DIFFICULTY"
  | "MOBILITY_IMPAIRMENT";

// Injured person in SOS request
export interface InjuredPerson {
  index: number;
  name: string;
  custom_name: string;
  person_type: string;
  medical_issues: string[];
  severity: string;
}

// Structured data from SOS request
export interface SOSStructuredData {
  situation: string;
  other_situation_description: string;
  has_injured: boolean;
  medical_issues: string[];
  other_medical_description: string;
  others_are_stable: boolean;
  people_count: {
    adult: number;
    child: number;
    elderly: number;
  };
  can_move: boolean;
  need_medical: boolean;
  supplies: string[];
  other_supply_description: string;
  additional_description: string;
  injured_persons: InjuredPerson[];
}

// Network metadata from mesh relay
export interface SOSNetworkMetadata {
  path: string[];
  hop_count: number;
}

// Sender information
export interface SOSSenderInfo {
  device_id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  battery_level: number;
  is_online: boolean;
}

// SOS Request Entity
export interface SOSRequestEntity {
  id: number;
  packetId: string | null;
  clusterId: number | null;
  userId: string;
  sosType: string | null;
  msg: string;
  structuredData: SOSStructuredData | null;
  networkMetadata: SOSNetworkMetadata | null;
  senderInfo: SOSSenderInfo | null;
  originId: string | null;
  status: SOSRequestStatus;
  priorityLevel: SOSPriorityLevel;
  waitTimeMinutes: number;
  latitude: number;
  longitude: number;
  locationAccuracy: number | null;
  timestamp: number | null;
  createdAt: string;
  lastUpdatedAt: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
}

// Paginated Response
export interface GetSOSRequestsResponse {
  items: SOSRequestEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Request params for fetching SOS requests
export interface GetSOSRequestsParams {
  pageNumber?: number;
  pageSize?: number;
}

// Get SOS Request By ID Response
export interface GetSOSRequestByIdResponse {
  sosRequest: SOSRequestEntity;
}

// Create SOS Request Payload
export interface CreateSOSRequestPayload {
  packet_id?: string;
  origin_id?: string;
  ts?: number;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  sos_type?: string;
  msg: string;
  structured_data?: Partial<SOSStructuredData>;
  network_metadata?: Partial<SOSNetworkMetadata>;
  sender_info?: Partial<SOSSenderInfo>;
}

// ---- Rescue Suggestion ----

// Request body for rescue suggestion
export interface RescueSuggestionRequest {
  sosRequestIds: number[];
}

// Activity type
export type ActivityType = "ASSESS" | "RESCUE" | "MEDICAL_AID" | "EVACUATE";

// Suggested activity in rescue plan
export interface SuggestedActivity {
  step: number;
  activityType: ActivityType;
  description: string;
  priority: string;
  estimatedTime: string;
}

// Resource type
export type ResourceType =
  | "TEAM"
  | "BOAT"
  | "MEDICAL_KIT"
  | "EQUIPMENT"
  | "VEHICLE";

// Suggested resource in rescue plan
export interface SuggestedResource {
  resourceType: ResourceType;
  description: string;
  quantity: number;
  priority: string;
}

// Severity level
export type SeverityLevel = "Low" | "Medium" | "High" | "Critical";

// Mission type
export type MissionType = "RESCUE" | "EVACUATE" | "MEDICAL" | "SUPPLY";

// Rescue Suggestion Response
export interface RescueSuggestionResponse {
  isSuccess: boolean;
  errorMessage: string | null;
  modelName: string;
  responseTimeMs: number;
  sosRequestCount: number;
  suggestedMissionTitle: string;
  suggestedMissionType: MissionType;
  suggestedPriorityScore: number;
  suggestedSeverityLevel: SeverityLevel;
  overallAssessment: string;
  suggestedActivities: SuggestedActivity[];
  suggestedResources: SuggestedResource[];
  estimatedDuration: string;
  specialNotes: string;
  confidenceScore: number;
}

// ---- Analysis ----

export interface PriorityThresholds {
  critical: string;
  high: string;
  medium: string;
  low: string;
}

export interface ScoreWeights {
  medical: string;
  injury: string;
  mobility: string;
  environment: string;
  food: string;
}

export interface RuleEvaluation {
  id: number;
  medicalScore: number;
  injuryScore: number;
  mobilityScore: number;
  environmentScore: number;
  foodScore: number;
  totalScore: number;
  priorityLevel: SOSPriorityLevel;
  ruleVersion: string;
  itemsNeeded: string[];
  createdAt: string;
  priorityThresholds: PriorityThresholds;
  scoreWeights: ScoreWeights;
}

export interface AiAnalysisResult {
  priority: string;
  severity_level: string;
  explanation: string;
  confidence_score: number;
}

export interface AiAnalysisMetadata {
  promptId: number;
  rawResponse: string;
  promptVersion: string;
  analysisResult: AiAnalysisResult;
}

export interface AiAnalysis {
  id: number;
  modelName: string;
  modelVersion: string;
  analysisType: string;
  suggestedSeverityLevel: SeverityLevel;
  suggestedPriority: SOSPriorityLevel;
  explanation: string;
  confidenceScore: number;
  suggestionScope: string;
  metadata: AiAnalysisMetadata;
  createdAt: string;
  adoptedAt: string | null;
}

export interface GetSOSRequestAnalysisResponse {
  sosRequestId: number;
  sosType: string;
  status: SOSRequestStatus;
  currentPriorityLevel: SOSPriorityLevel;
  ruleEvaluation: RuleEvaluation;
  aiAnalyses: AiAnalysis[];
  hasAiAnalysis: boolean;
}
