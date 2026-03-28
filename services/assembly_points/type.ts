// Assembly Point Status
export type AssemblyPointStatus =
  | "Created"
  | "Active"
  | "Overloaded"
  | "UnderMaintenance"
  | "Closed";

// Assembly Point Status Metadata (from /personnel/assembly-point/status-metadata)
export interface AssemblyPointStatusMetadata {
  key: AssemblyPointStatus;
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
  lastUpdatedAt: string | null;
  hasActiveEvent?: boolean;
  teams?: AssemblyPointTeam[];
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
  lastUpdatedAt: string | null;
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
