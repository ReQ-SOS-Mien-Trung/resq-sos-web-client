export type RescueTeamTypeKey =
  | "Rescue"
  | "Medical"
  | "Transportation"
  | "Mixed";

export interface RescueTeamTypeOption {
  key: RescueTeamTypeKey;
  value: string;
}

export type RescueTeamStatusKey =
  | "AwaitingAcceptance"
  | "Ready"
  | "Gathering"
  | "Available"
  | "Assigned"
  | "OnMission"
  | "Stuck"
  | "Unavailable"
  | "Disbanded";

export interface RescueTeamStatusOption {
  key: RescueTeamStatusKey;
  value: string;
}

export interface RescueTeamMember {
  userId: string;
  isLeader: boolean;
}

export type RescueTeamMemberStatus = "Accepted" | "Pending" | "Rejected";

export type RescueTeamRoleInTeam = "Leader" | "Member";

export interface RescueTeamMemberDetail {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  avatarUrl: string | null;
  rescuerType: "Volunteer" | "Core" | null;
  status: RescueTeamMemberStatus;
  isLeader: boolean;
  roleInTeam: RescueTeamRoleInTeam;
  checkedIn: boolean;
}

export interface RescueTeamEntity {
  id: number;
  code: string;
  name: string;
  teamType: RescueTeamTypeKey;
  status: RescueTeamStatusKey;
  assemblyPointId: number;
  assemblyPointName: string;
  maxMembers: number;
  currentMemberCount: number;
  createdAt: string;
}

export interface RescueTeamByClusterEntity {
  id: number;
  code: string;
  name: string;
  teamType: string;
  status: string;
  assemblyPointId: number;
  assemblyPointName: string;
  distanceKm: number;
  maxMembers: number;
  currentMemberCount: number;
}

export type GetRescueTeamsByClusterResponse = RescueTeamByClusterEntity[];

export interface GetRescueTeamsParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface GetRescueTeamsResponse {
  items: RescueTeamEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface GetRescueTeamByIdResponse {
  id: number;
  code: string;
  name: string;
  teamType: RescueTeamTypeKey;
  status: RescueTeamStatusKey;
  assemblyPointId: number;
  assemblyPointName: string;
  managedBy: string;
  maxMembers: number;
  assemblyDate: string | null;
  createdAt: string;
  members: RescueTeamMemberDetail[];
}

export interface CreateRescueTeamRequest {
  name: string;
  type: RescueTeamTypeKey;
  assemblyPointId: number;
  maxMembers: number;
  members: RescueTeamMember[];
}

export interface CreateRescueTeamResponse {
  id: number;
  name: string;
  type: RescueTeamTypeKey;
  assemblyPointId: number;
  maxMembers: number;
  status: RescueTeamStatusKey;
  createdAt: string;
}

export interface ScheduleRescueTeamAssemblyRequest {
  id: number;
  assemblyAt: string;
}

export interface ScheduleRescueTeamAssemblyErrorResponse {
  message: string;
  errors?: {
    _domainMsg?: string[];
    [key: string]: string[] | undefined;
  };
}

export interface RemoveRescueTeamMemberRequest {
  id: number;
  userId: string;
}

export interface AddRescueTeamMemberRequest {
  id: number;
  userId: string;
  isLeader: boolean;
}
