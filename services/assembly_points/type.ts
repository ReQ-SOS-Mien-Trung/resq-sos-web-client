import type { RescuerType } from "../rescuers/type";

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
  imageUrl?: string | null;
  lastUpdatedAt: string;
  hasActiveEvent: boolean;
  activeEventId?: number | null;
  teams: AssemblyPointTeam[];
}

// Team domain for Assembly Point responses
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
export type AssemblyPointDetailEntity = AssemblyPointEntity;

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
  imageUrl?: string | null;
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
  imageUrl?: string | null;
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
  assemblyPointId?: number;
}

// Assembly point event status
export type AssemblyPointEventStatus = string;

// Assembly point event entity
export interface AssemblyPointEventEntity {
  eventId: number;
  assemblyPointId: number;
  assemblyDate: string;
  status: AssemblyPointEventStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
  participantCount: number;
  checkedInCount: number;
}

// Query params for fetching assembly point events
export interface GetAssemblyPointEventsParams {
  pageNumber?: number;
  pageSize?: number;
}

// Paginated response for assembly point events
export interface GetAssemblyPointEventsResponse {
  items: AssemblyPointEventEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Checked-in rescuer entity for assembly point event
export interface AssemblyPointCheckedInRescuerEntity {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  rescuerType: RescuerType;
  checkedInAt: string;
  isInTeam: boolean;
  isEarly: boolean;
  isLate: boolean;
  topAbilities: string[];
}

// Query params for fetching checked-in rescuers by event
export interface GetAssemblyPointCheckedInRescuersParams {
  pageNumber?: number;
  pageSize?: number;
  rescuerType?: Exclude<RescuerType, null>;
  abilitySubgroupCode?: string;
  abilityCategoryCode?: string;
  search?: string;
}

// Paginated response for checked-in rescuers by event
export interface GetAssemblyPointCheckedInRescuersResponse {
  items: AssemblyPointCheckedInRescuerEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
