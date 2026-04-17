"use client";

export type OperationalRealtimeConnectionState =
  | "connected"
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

export const OPERATIONAL_REALTIME_METHODS = {
  SubscribeDepot: "SubscribeDepot",
  UnsubscribeDepot: "UnsubscribeDepot",
  SubscribeCluster: "SubscribeCluster",
  UnsubscribeCluster: "UnsubscribeCluster",
} as const;

export const OPERATIONAL_REALTIME_EVENTS = {
  ReceiveAssemblyPointListUpdate: "ReceiveAssemblyPointListUpdate",
  ReceiveDepotInventoryUpdate: "ReceiveDepotInventoryUpdate",
  ReceiveLogisticsUpdate: "ReceiveLogisticsUpdate",
} as const;
