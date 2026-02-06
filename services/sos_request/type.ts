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
  userId: string;
  rawMessage: string;
  status: SOSRequestStatus;
  priorityLevel: SOSPriorityLevel;
  waitTimeMinutes: number;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  lastUpdatedAt: string | null;
}

// Get All SOS Requests Response
export interface GetSOSRequestsResponse {
  sosRequests: SOSRequestEntity[];
}
