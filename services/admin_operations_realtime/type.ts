"use client";

export const ADMIN_OPERATIONS_REALTIME_EVENTS = {
  ReceiveMissionUpdate: "ReceiveMissionUpdate",
  ReceiveMissionActivityUpdate: "ReceiveMissionActivityUpdate",
  ReceiveMissionExecutionProgress: "ReceiveMissionExecutionProgress",
  ReceiveRescueTeamUpdate: "ReceiveRescueTeamUpdate",
  ReceiveRescuerScoresUpdate: "ReceiveRescuerScoresUpdate",
  ReceiveChartInvalidation: "ReceiveChartInvalidation",
} as const;

export const ADMIN_OPERATIONS_REALTIME_METHODS = {
  SubscribeSOSCluster: "SubscribeSOSCluster",
  UnsubscribeSOSCluster: "UnsubscribeSOSCluster",
  SubscribeMissionActivities: "SubscribeMissionActivities",
  UnsubscribeMissionActivities: "UnsubscribeMissionActivities",
  SubscribeMissionExecution: "SubscribeMissionExecution",
  UnsubscribeMissionExecution: "UnsubscribeMissionExecution",
  SubscribeRescueTeams: "SubscribeRescueTeams",
  UnsubscribeRescueTeams: "UnsubscribeRescueTeams",
  SubscribeRescueTeam: "SubscribeRescueTeam",
  UnsubscribeRescueTeam: "UnsubscribeRescueTeam",
  SubscribeRescuerScores: "SubscribeRescuerScores",
  UnsubscribeRescuerScores: "UnsubscribeRescuerScores",
  SubscribeDepotCharts: "SubscribeDepotCharts",
  UnsubscribeDepotCharts: "UnsubscribeDepotCharts",
} as const;

export type AdminMissionRealtimeUpdate = {
  entityId: number | null;
  entityType: string;
  action: string;
  status: string | null;
  changedAt: string;
  missionId: number;
  clusterId: number | null;
};

export type AdminMissionActivityRealtimeUpdate = {
  entityId: number | null;
  entityType: string;
  action: string;
  status: string | null;
  changedAt: string;
  activityId: number;
  missionId: number | null;
  depotId: number | null;
};

export type AdminMissionExecutionAffectedActivity = {
  missionActivityId: number;
  orderIndex: number;
  isPrimary: boolean;
  step: number | null;
  activityType: string | null;
  status: string | null;
};

export type AdminMissionExecutionProgressRealtimeUpdate = {
  entityId: number | null;
  entityType: string;
  action: string;
  status: string | null;
  changedAt: string;
  eventId: string;
  missionId: number;
  activityId: number | null;
  missionTeamId: number | null;
  rescueTeamId: number | null;
  depotId: number | null;
  step: number | null;
  activityType: string | null;
  previousStatus: string | null;
  requestedStatus: string | null;
  effectiveStatus: string | null;
  imageUrl: string | null;
  changedBy: string | null;
  clientMutationId: string | null;
  syncOutcome: string | null;
  incidentId: number | null;
  incidentScope: string | null;
  affectedActivities: AdminMissionExecutionAffectedActivity[];
  note: string | null;
  safetyLatestCheckInAt: string | null;
  safetyTimeoutAt: string | null;
  safetyStatus: string | null;
  requeryRecommended: boolean;
};
