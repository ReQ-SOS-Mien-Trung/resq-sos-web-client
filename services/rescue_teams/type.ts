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
