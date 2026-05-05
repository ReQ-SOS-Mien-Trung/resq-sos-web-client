"use client";

export type OperationalRealtimeConnectionState =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected";

export type ReceiveAssemblyPointListUpdatePayload = {
  changedAt: string;
};

export type ReceiveDepotInventoryUpdatePayload = {
  depotId: number;
  operation: string;
  changedAt: string;
};

export type ReceiveLogisticsUpdatePayload = {
  resourceType: "rescue-teams" | "depots";
  clusterId: number | null;
  changedAt: string;
};

export type ReceiveSupplyRequestUpdatePayload = {
  requestId: number;
  requestingDepotId: number;
  sourceDepotId: number;
  action: string;
  sourceStatus: string;
  requestingStatus: string;
  rejectedReason: string | null;
  changedAt: string;
};

export type ReceiveDepotActivityUpdatePayload = {
  activityId: number;
  depotId: number;
  missionId: number | null;
  missionTeamId: number | null;
  rescueTeamId: number | null;
  activityType: string;
  action: string;
  status: string;
  estimatedTime: number | null;
  missionExpectedEndTime: string | null;
  changedAt: string;
};

export type ReceiveDepotClosureUpdatePayload = {
  sourceDepotId: number;
  targetDepotId: number | null;
  closureId: number | null;
  transferId: number | null;
  entityType: string;
  action: string;
  status: string;
  changedAt: string;
};

export type ReceiveUpcomingReturnsUpdatePayload = {
  depotId: number;
  activityId: number;
  missionId: number;
  missionTeamId: number;
  rescueTeamId: number;
  activityType: string;
  action: string;
  status: string;
  estimatedTime: number | null;
  missionExpectedEndTime: string | null;
  changedAt: string;
};

export type ReceiveAssemblyEventCheckedInRescuersUpdatePayload = {
  assemblyPointId: number;
  eventId: number;
  operation: string;
  rescuerId: string | null;
  changedAt: string;
};

export type ReceiveInventoryLotsUpdatePayload = {
  depotId: number;
  itemModelId: number;
  operation: string;
  endpoint: string;
  query?: {
    depotId?: number;
  } | null;
  changedAt: string;
};

export type ReceiveDepotFundsUpdatePayload = {
  depotId?: number | null;
  endpoint: string;
  scope?: {
    depotId?: number | null;
  } | null;
  reason: string;
  changedAt: string;
};

export const OPERATIONAL_REALTIME_METHODS = {
  SubscribeDepot: "SubscribeDepot",
  UnsubscribeDepot: "UnsubscribeDepot",
  SubscribeDepotFunds: "SubscribeDepotFunds",
  SubscribeDepotFund: "SubscribeDepotFund",
  SubscribeCluster: "SubscribeCluster",
  UnsubscribeCluster: "UnsubscribeCluster",
  SubscribeSupplyRequests: "SubscribeSupplyRequests",
  UnsubscribeSupplyRequests: "UnsubscribeSupplyRequests",
  SubscribeSupplyRequest: "SubscribeSupplyRequest",
  UnsubscribeSupplyRequest: "UnsubscribeSupplyRequest",
  SubscribeDepotActivities: "SubscribeDepotActivities",
  UnsubscribeDepotActivities: "UnsubscribeDepotActivities",
  SubscribeActivity: "SubscribeActivity",
  UnsubscribeActivity: "UnsubscribeActivity",
  SubscribeDepotClosures: "SubscribeDepotClosures",
  UnsubscribeDepotClosures: "UnsubscribeDepotClosures",
  SubscribeClosure: "SubscribeClosure",
  UnsubscribeClosure: "UnsubscribeClosure",
  SubscribeTransfer: "SubscribeTransfer",
  UnsubscribeTransfer: "UnsubscribeTransfer",
  SubscribeUpcomingReturns: "SubscribeUpcomingReturns",
  UnsubscribeUpcomingReturns: "UnsubscribeUpcomingReturns",
  SubscribeDepotCharts: "SubscribeDepotCharts",
  UnsubscribeDepotCharts: "UnsubscribeDepotCharts",
  SubscribeInventoryLots: "SubscribeInventoryLots",
  UnsubscribeInventoryLots: "UnsubscribeInventoryLots",
  SubscribeAssemblyEventCheckedInRescuers: "SubscribeAssemblyEventCheckedInRescuers",
  UnsubscribeAssemblyEventCheckedInRescuers: "UnsubscribeAssemblyEventCheckedInRescuers",
} as const;

export const OPERATIONAL_REALTIME_EVENTS = {
  ReceiveAssemblyPointListUpdate: "ReceiveAssemblyPointListUpdate",
  ReceiveDepotInventoryUpdate: "ReceiveDepotInventoryUpdate",
  ReceiveLogisticsUpdate: "ReceiveLogisticsUpdate",
  ReceiveSupplyRequestUpdate: "ReceiveSupplyRequestUpdate",
  ReceiveDepotActivityUpdate: "ReceiveDepotActivityUpdate",
  ReceiveDepotClosureUpdate: "ReceiveDepotClosureUpdate",
  ReceiveUpcomingReturnsUpdate: "ReceiveUpcomingReturnsUpdate",
  ReceiveChartInvalidation: "ReceiveChartInvalidation",
  ReceiveInventoryLotsUpdate: "ReceiveInventoryLotsUpdate",
  ReceiveDepotFundsUpdate: "ReceiveDepotFundsUpdate",
  ReceiveAssemblyEventCheckedInRescuersUpdate: "ReceiveAssemblyEventCheckedInRescuersUpdate",
} as const;
