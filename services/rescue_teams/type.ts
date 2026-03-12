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
