export type TeamIncidentStatus =
  | "Reported"
  | "Acknowledged"
  | "Resolved"
  | string;

export interface TeamIncidentReporter {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface TeamIncidentEntity {
  incidentId: number;
  missionTeamId: number;
  latitude: number;
  longitude: number;
  description: string;
  status: TeamIncidentStatus;
  reportedBy: TeamIncidentReporter | string | null;
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
