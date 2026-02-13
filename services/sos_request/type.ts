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
