import type { RescuerType } from "../rescuers/type";

// Assembly Point Status
export type AssemblyPointStatus =
  | "Created"
  | "Available"
  | "PendingUnavailable"
  | "Unavailable"
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

export interface AssemblyPointStatusAuditFields {
  statusReason: string | null;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
}

// Assembly Point Entity
export interface AssemblyPointEntity extends AssemblyPointStatusAuditFields {
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
  status?: AssemblyPointStatus;
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

export interface AssemblyPointStatusTransitionRequest {
  id: number;
  reason?: string | null;
}

export interface AssemblyPointStatusTransitionResponse {
  id: number;
  status: AssemblyPointStatus;
  message: string;
  impact?: AssemblyPointUnavailableImpactResponse | null;
}

export interface AssemblyPointUnavailableAlternative {
  id: number;
  code: string;
  name: string;
  maxCapacity: number;
  status: AssemblyPointStatus | string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
}

export interface AssemblyPointUnavailableCheckedInRescuer {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  rescuerType: string | null;
  checkedInAt: string | null;
  assemblyEventId: number;
  topAbilities: string[];
}

export interface AssemblyPointUnavailableMissionActivity {
  missionActivityId: number;
  missionId: number | null;
  missionTeamId: number | null;
  rescueTeamId: number | null;
  rescueTeamCode: string | null;
  rescueTeamName: string | null;
  step: number | null;
  activityType: string | null;
  status: string;
  description: string | null;
}

export interface AssemblyPointUnavailableRescueTeamImpact {
  rescueTeamId: number | null;
  rescueTeamCode: string | null;
  rescueTeamName: string | null;
  rescueTeamStatus: string | null;
  missionTeamId: number | null;
  impactReason: string[];
  memberUserIds: string[];
  activities: AssemblyPointUnavailableMissionActivity[];
}

export interface AssemblyPointUnavailableStationedTeam {
  rescueTeamId: number;
  rescueTeamCode: string | null;
  rescueTeamName: string | null;
  rescueTeamStatus: string | null;
  memberUserIds: string[];
}

export interface AssemblyPointUnavailableImpactResponse {
  assemblyPointId: number;
  assemblyPointCode: string;
  assemblyPointName: string;
  currentStatus: AssemblyPointStatus | string;
  statusChangedAt: string | null;
  availableAssemblyPoints: AssemblyPointUnavailableAlternative[];
  checkedInRescuers: AssemblyPointUnavailableCheckedInRescuer[];
  teamlessCheckedInRescuers: AssemblyPointUnavailableCheckedInRescuer[];
  stationedTeams: AssemblyPointUnavailableStationedTeam[];
  rescueTeams: AssemblyPointUnavailableRescueTeamImpact[];
}

export interface RescuerAssemblyPointReassignment {
  userId: string;
  targetAssemblyPointId: number;
}

export interface TeamAssemblyPointReassignment {
  rescueTeamId: number;
  targetAssemblyPointId: number;
}

export interface MissionActivityAssemblyPointReassignment {
  missionActivityId: number;
  targetAssemblyPointId: number;
}

export interface SetAssemblyPointUnavailableWithReassignmentRequest {
  id: number;
  reason?: string | null;
  rescuerReassignments: RescuerAssemblyPointReassignment[];
  teamReassignments: TeamAssemblyPointReassignment[];
  missionActivityReassignments: MissionActivityAssemblyPointReassignment[];
}

export interface SetAssemblyPointUnavailableWithReassignmentResponse {
  assemblyPointId: number;
  status: AssemblyPointStatus | string;
  reassignedRescuerCount: number;
  reassignedStationedTeamCount: number;
  reassignedMissionActivityCount: number;
  notifiedUserCount: number;
  message: string;
}

// Assign or unassign one or many rescuers to an assembly point request
export interface UpdateRescuerAssemblyPointAssignmentRequest {
  userIds: string[];
  assemblyPointId: number | null;
}

// Schedule gathering at an assembly point request
export interface ScheduleAssemblyPointGatheringRequest {
  id: number;
  assemblyDate: string;
  checkInDeadline: string;
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
    CheckInDeadline?: string[];
    [key: string]: string[] | undefined;
  };
}

// Start gathering by assembly event id request
export interface StartAssemblyPointGatheringRequest {
  eventId: number;
  assemblyPointId?: number;
}

// Cancel gathering by assembly event id request
export interface CancelAssemblyPointEventRequest {
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
  email: string | null;
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

// Check-in radius config for a specific assembly point
export interface AssemblyPointCheckInRadiusConfig {
  assemblyPointId: number;
  maxRadiusMeters: number;
  isGlobalFallback: boolean;
  updatedAt: string | null;
}

// Check-in radius item in the global list (has updatedBy)
export interface AssemblyPointCheckInRadiusItem {
  assemblyPointId: number;
  maxRadiusMeters: number;
  updatedBy: string;
  updatedAt: string;
}

// Response for GET /personnel/assembly-point/check-in-radius
export interface GetAllCheckInRadiusConfigsResponse {
  items: AssemblyPointCheckInRadiusItem[];
  totalCount: number;
}

// Request body for PUT /personnel/assembly-point/{id}/check-in-radius
export interface SetCheckInRadiusRequest {
  id: number;
  maxRadiusMeters: number;
}

// Response for PUT /personnel/assembly-point/{id}/check-in-radius
export interface SetCheckInRadiusResponse {
  assemblyPointId: number;
  maxRadiusMeters: number;
  updatedAt: string;
}
