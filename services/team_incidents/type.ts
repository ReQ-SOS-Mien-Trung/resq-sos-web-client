export type TeamIncidentStatus =
  | "Reported"
  | "Acknowledged"
  | "Resolved"
  | string;

export interface TeamIncidentEntity {
  incidentId: number;
  missionTeamId: number;
  latitude: number;
  longitude: number;
  description: string;
  status: TeamIncidentStatus;
  reportedBy: string;
  reportedAt: string;
}

export interface GetTeamIncidentsParams {
  missionTeamId?: number;
  status?: TeamIncidentStatus;
}

export interface GetTeamIncidentsResponse {
  incidents: TeamIncidentEntity[];
}

export interface GetTeamIncidentsByMissionResponse {
  missionId: number;
  incidents: TeamIncidentEntity[];
}
