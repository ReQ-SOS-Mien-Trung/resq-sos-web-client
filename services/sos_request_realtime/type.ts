"use client";

import type { SOSRequestEntity } from "../sos_request/type";

export type SosRequestRealtimeConnectionState =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected";

export type ReceiveSosRequestUpdatePayload = {
  requestId: number;
  action: string;
  status: string;
  priorityLevel: string;
  clusterId: number | null;
  previousClusterId: number | null;
  changedAt: string;
  snapshot: SOSRequestEntity;
};

export const SOS_REQUEST_REALTIME_METHODS = {
  SubscribeSosRequest: "SubscribeSosRequest",
  UnsubscribeSosRequest: "UnsubscribeSosRequest",
  SubscribeSosCluster: "SubscribeSosCluster",
  UnsubscribeSosCluster: "UnsubscribeSosCluster",
  SubscribeUnclusteredSosRequests: "SubscribeUnclusteredSosRequests",
  UnsubscribeUnclusteredSosRequests: "UnsubscribeUnclusteredSosRequests",
} as const;

export const SOS_REQUEST_REALTIME_EVENTS = {
  ReceiveSosRequestUpdate: "ReceiveSosRequestUpdate",
} as const;
