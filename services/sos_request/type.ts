// SOS Request Status
export type SOSRequestStatus =
  | "Pending"
  | "InProgress"
  | "Completed"
  | "Cancelled";

// SOS Request Priority Level
export type SOSPriorityLevel = "Low" | "Medium" | "High" | "Critical";

// SOS Request Entity
export interface SOSRequestEntity {
  id: number;
  packetId: number | null;
  clusterId: number | null;
  userId: string;
  sosType: string | null;
  rawMessage: string;
  structuredData: string | null;
  networkMetadata: string | null;
  status: SOSRequestStatus;
  priorityLevel: SOSPriorityLevel;
  waitTimeMinutes: number;
  latitude: number;
  longitude: number;
  locationAccuracy: number | null;
  timestamp: string | null;
  createdAt: string;
  lastUpdatedAt: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
}

// Get All SOS Requests Response
export interface GetSOSRequestsResponse {
  sosRequests: SOSRequestEntity[];
}

// Get SOS Request By ID Response
export interface GetSOSRequestByIdResponse {
  sosRequest: SOSRequestEntity;
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
