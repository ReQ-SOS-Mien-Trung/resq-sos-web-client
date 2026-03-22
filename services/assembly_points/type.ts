// Assembly Point Status
export type AssemblyPointStatus = "Active" | "Overloaded" | "Unavailable";

// Assembly Point Status Metadata (from /personnel/assembly-point/status-metadata)
export interface AssemblyPointStatusMetadata {
  key: AssemblyPointStatus;
  label: string;
}

// Assembly Point Metadata option (for dropdown)
export interface AssemblyPointMetadataOption {
  key: string;
  value: string;
}

// Assembly Point Entity
export interface AssemblyPointEntity {
  id: number;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  maxCapacity: number;
  status: AssemblyPointStatus;
  lastUpdatedAt: string;
}

// Team domain for Assembly Point detail
export type AssemblyPointTeamType = "Rescue" | "Medical" | "Transportation";

export type AssemblyPointTeamStatus =
  | "AwaitingAcceptance"
  | "Ready"
  | "Gathering";

export type AssemblyPointTeamMemberStatus = "Accepted" | "Pending";

export type AssemblyPointTeamMemberRole = "Leader" | "Member";

export interface AssemblyPointTeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  roleInTeam: AssemblyPointTeamMemberRole;
  isLeader: boolean;
  status: AssemblyPointTeamMemberStatus;
}

export interface AssemblyPointTeam {
  id: number;
  code: string;
  name: string;
  teamType: AssemblyPointTeamType;
  status: AssemblyPointTeamStatus;
  maxMembers: number;
  members: AssemblyPointTeamMember[];
}

// Detail Response for GET /personnel/assembly-point/{id}
export interface AssemblyPointDetailEntity extends AssemblyPointEntity {
  teams: AssemblyPointTeam[];
}

// Paginated Response for Assembly Points
export interface GetAssemblyPointsResponse {
  items: AssemblyPointEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query params for fetching assembly points
export interface GetAssemblyPointsParams {
  pageNumber?: number;
  pageSize?: number;
}

// Create Assembly Point Request
export interface CreateAssemblyPointRequest {
  name: string;
  latitude: number;
  longitude: number;
  maxCapacity: number;
}

// Create Assembly Point Response
export interface CreateAssemblyPointResponse {
  id: number;
  code: string;
  name: string;
  maxCapacity: number;
  status: AssemblyPointStatus;
}

// Update Assembly Point Request
export interface UpdateAssemblyPointRequest {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  maxCapacity: number;
}

// Update Assembly Point Response
export interface UpdateAssemblyPointResponse {
  id: number;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  maxCapacity: number;
  status: AssemblyPointStatus;
  lastUpdatedAt: string;
}

// Update Assembly Point Status Request
export interface UpdateAssemblyPointStatusRequest {
  id: number;
  status: AssemblyPointStatus;
}

// Update Assembly Point Status Response
export interface UpdateAssemblyPointStatusResponse {
  id: number;
  status: AssemblyPointStatus;
  message: string;
}

// Assign or unassign rescuer to assembly point request
export interface UpdateRescuerAssemblyPointAssignmentRequest {
  userId: string;
  assemblyPointId: number | null;
}

// Schedule gathering at an assembly point request
export interface ScheduleAssemblyPointGatheringRequest {
  id: number;
  assemblyDate: string;
}

// Schedule gathering success response
export interface ScheduleAssemblyPointGatheringResponse {
  eventId: number;
}

// Schedule gathering validation error response (HTTP 400)
export interface ScheduleAssemblyPointGatheringErrorResponse {
  message: string;
  errors?: {
    AssemblyDate?: string[];
    [key: string]: string[] | undefined;
  };
}

// Start gathering by assembly event id request
export interface StartAssemblyPointGatheringRequest {
  eventId: number;
}
