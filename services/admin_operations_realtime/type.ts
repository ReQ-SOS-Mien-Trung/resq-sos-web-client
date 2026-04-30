"use client";

export const ADMIN_OPERATIONS_REALTIME_EVENTS = {
  ReceiveRescueTeamUpdate: "ReceiveRescueTeamUpdate",
  ReceiveRescuerScoresUpdate: "ReceiveRescuerScoresUpdate",
  ReceiveChartInvalidation: "ReceiveChartInvalidation",
} as const;

export const ADMIN_OPERATIONS_REALTIME_METHODS = {
  SubscribeRescueTeams: "SubscribeRescueTeams",
  UnsubscribeRescueTeams: "UnsubscribeRescueTeams",
  SubscribeRescueTeam: "SubscribeRescueTeam",
  UnsubscribeRescueTeam: "UnsubscribeRescueTeam",
  SubscribeRescuerScores: "SubscribeRescuerScores",
  UnsubscribeRescuerScores: "UnsubscribeRescuerScores",
  SubscribeDepotCharts: "SubscribeDepotCharts",
  UnsubscribeDepotCharts: "UnsubscribeDepotCharts",
} as const;
