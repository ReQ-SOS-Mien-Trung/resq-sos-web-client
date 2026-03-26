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
export type SOSSituation =
  | "FLOODING"
  | "LANDSLIDE"
  | "ACCIDENT"
  | "TRAPPED"
  | "ISOLATED"
  | "STRANDED"
  | "COLLAPSED"
  | "DANGER_ZONE"
  | "CANNOT_MOVE"
  | "OTHER";

// Supply types
export type SupplyType =
  | "MEDICINE"
  | "FOOD"
  | "WATER"
  | "CLOTHES"
  | "BLANKET"
  | "OTHER"
  | "RESCUE_EQUIPMENT"
  | "TRANSPORTATION";

// Medical issue types
export type MedicalIssueType =
  | "SEVERELY_BLEEDING"
  | "FRACTURE"
  | "BLEEDING"
  | "HEAD_INJURY"
  | "BURNS"
  | "UNCONSCIOUS"
  | "CHRONIC_DISEASE"
  | "PREGNANCY"
  | "BREATHING_DIFFICULTY"
  | "MOBILITY_IMPAIRMENT"
  | "CHEST_PAIN_STROKE"
  | "CANNOT_MOVE"
  | "DROWNING"
  | "HIGH_FEVER"
  | "DEHYDRATION"
  | "INFANT_NEEDS_MILK"
  | "LOST_PARENT"
  | "CONFUSION"
  | "NEEDS_MEDICAL_DEVICE"
  | "OTHER";

export type MedicalSupportNeedType =
  | "COMMON_MEDICINE"
  | "FIRST_AID"
  | "CHRONIC_MAINTENANCE"
  | "MINOR_INJURY";

export type ClothingGenderType = "MALE" | "FEMALE";

export type WaterDurationType =
  | "UNDER_6H"
  | "6_TO_12H"
  | "12_TO_24H"
  | "1_TO_2_DAYS"
  | "OVER_2_DAYS";

export type WaterRemainingType =
  | "NONE"
  | "UNDER_2L"
  | "2_TO_5L"
  | "OVER_5L";

export type FoodDurationType =
  | "UNDER_12H"
  | "12_TO_24H"
  | "1_TO_2_DAYS"
  | "2_TO_3_DAYS"
  | "OVER_3_DAYS";

// Injured person in SOS request
export interface InjuredPerson {
  index: number;
  name: string;
  custom_name: string | null;
  person_type: string;
  medical_issues: MedicalIssueType[];
  severity: string;
}

export interface SOSSpecialDietPerson {
  person_type: string;
  index: number;
  name: string;
  custom_name: string | null;
  diet_description: string | null;
}

export interface SOSClothingPerson {
  person_type: string;
  index: number;
  name: string;
  custom_name: string | null;
  gender: ClothingGenderType;
}

export interface SOSSupplyDetails {
  water_duration?: WaterDurationType | null;
  water_remaining?: WaterRemainingType | null;
  food_duration?: FoodDurationType | null;
  special_diet_need?: string | null;
  special_diet_persons?: SOSSpecialDietPerson[] | null;
  needs_urgent_medicine?: boolean | null;
  medicine_conditions?: string[] | null;
  medicine_other_description?: string | null;
  medical_needs?: MedicalSupportNeedType[] | null;
  medical_description?: string | null;
  is_cold_or_wet?: boolean | null;
  blanket_availability?: string | null;
  are_blankets_enough?: boolean | null;
  blanket_request_count?: number | null;
  clothing_status?: string | null;
  clothing_persons?: SOSClothingPerson[] | null;
}

// Structured data from SOS request
export interface SOSStructuredData {
  situation: SOSSituation | string;
  other_situation_description: string | null;
  has_injured: boolean;
  medical_issues: MedicalIssueType[];
  other_medical_description: string | null;
  others_are_stable: boolean;
  people_count: {
    adult: number;
    child: number;
    elderly: number;
  };
  can_move: boolean;
  need_medical: boolean;
  supplies: SupplyType[];
  other_supply_description: string | null;
  supply_details?: SOSSupplyDetails | null;
  additional_description: string | null;
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
  user_name: string | null;
  user_phone: string | null;
  battery_level: number | null;
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
  waitTimeMinutes?: number | null;
  latitude: number;
  longitude: number;
  locationAccuracy: number | null;
  timestamp: number | null;
  createdAt: string;
  receivedAt: string | null;
  lastUpdatedAt: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  createdByCoordinatorId?: string | null;
  createdByCoordinatorName?: string | null;
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
