// ─── Rescue Teams Overview (paginated list) ───

export interface GetRescueTeamsOverviewParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface RescueTeamOverviewItem {
  id: number;
  code: string;
  name: string;
  teamType: string;
  status: string;
  assemblyPointId: number;
  assemblyPointName: string;
  maxMembers: number;
  currentMemberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetRescueTeamsOverviewResponse {
  items: RescueTeamOverviewItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

// ─── Rescue Team Detail ───

export interface TeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  avatarUrl: string | null;
  rescuerType: string;
  status: string;
  isLeader: boolean;
  roleInTeam: string;
  joinedAt: string;
}

export interface MissionActivity {
  id: number;
  step: number;
  activityType: string;
  description: string;
  status: string;
  assignedAt: string;
  completedAt: string | null;
}

export interface TeamMission {
  missionTeamId: number;
  missionId: number;
  missionStatus: string;
  missionType: string;
  teamAssignmentStatus: string;
  assignedAt: string;
  missionCompletedAt: string | null;
  isCompleted: boolean;
  reportStatus: string;
  activities: MissionActivity[];
}

export interface CompletionRate {
  totalMissions: number;
  completedCount: number;
  incompletedCount: number;
  completedPercent: number;
  incompletedPercent: number;
}

export interface RescueTeamDetailResponse {
  id: number;
  code: string;
  name: string;
  teamType: string;
  status: string;
  assemblyPointName: string;
  managedByName: string;
  maxMembers: number;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
  missions: TeamMission[];
  completionRate: CompletionRate;
}

// ─── Rescuer Scores ───

export interface OverallScore {
  overallAverageScore: number;
  evaluationCount: number;
  responseTimeScore: number;
  rescueEffectivenessScore: number;
  decisionHandlingScore: number;
  safetyMedicalSkillScore: number;
  teamworkCommunicationScore: number;
}

export interface MissionEvaluation {
  evaluationId: number;
  missionTeamReportId: number;
  missionId: number;
  missionType: string;
  missionCompletedAt: string;
  responseTimeScore: number;
  rescueEffectivenessScore: number;
  decisionHandlingScore: number;
  safetyMedicalSkillScore: number;
  teamworkCommunicationScore: number;
  averageScore: number;
  evaluatedAt: string;
}

export interface TeamHistoryItem {
  teamId: number;
  teamCode: string;
  teamName: string;
  teamType?: string;
  status: string;
  isLeader?: boolean;
  roleInTeam?: string;
  joinedAt: string;
  leftAt: string | null;
}

export interface RescuerScoresResponse {
  rescuerId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  overallScore: OverallScore;
  missionEvaluations: MissionEvaluation[];
  teamHistory: TeamHistoryItem[];
}
