export type MissionType = "RESCUE" | "RESCUER";

export type MissionStatus = "Pending" | "InProgress" | "Completed" | "Cancelled";

export type ActivityStatus = "Pending" | "InProgress" | "Completed" | "Cancelled";

export interface MissionActivity {
  id: number;
  step: number;
  activityCode: string;
  activityType: string;
  description: string;
  target: string;
  items: unknown | null;
  targetLatitude: number;
  targetLongitude: number;
  status: ActivityStatus;
  assignedAt: string;
  completedAt: string | null;
}

export interface MissionEntity {
  id: number;
  clusterId: number;
  missionType: MissionType;
  priorityScore: number;
  status: MissionStatus;
  startTime: string;
  expectedEndTime: string;
  isCompleted: boolean;
  createdById: string;
  createdAt: string;
  completedAt: string | null;
  activityCount: number;
  activities: MissionActivity[];
}

export interface GetMissionsResponse {
  missions: MissionEntity[];
}

export interface GetMissionsParams {
  clusterId: number;
}

export interface UpdateMissionRequest {
  missionType: MissionType;
  priorityScore: number;
  startTime: string;
  expectedEndTime: string;
}

export interface UpdateMissionResponse {
  missionId: number;
  missionType: MissionType;
  priorityScore: number;
  startTime: string;
  expectedEndTime: string;
}

export interface UpdateMissionStatusRequest {
  status: MissionStatus;
}

export interface UpdateMissionStatusResponse {
  missionId: number;
  status: MissionStatus;
  isCompleted: boolean;
}

export interface UpdateActivityStatusRequest {
  status: ActivityStatus;
}

export interface UpdateActivityStatusResponse {
  activityId: number;
  status: ActivityStatus;
  decisionBy: string;
}
