"use client";

export type DepotRealtimeEventEnvelope = {
  eventId: string;
  eventType: string;
  depotId: number;
  missionId?: number | null;
  version: number;
  occurredAtUtc: string;
  operation:
    | "Create"
    | "Update"
    | "Import"
    | "Export"
    | "Transfer"
    | "Delete";
  payloadKind: "Full" | "Delta";
  isCritical: boolean;
  requeryRecommended: boolean;
  payload: unknown;
};

export type DepotRealtimeVersionGapContext = {
  expected: number;
  actual: number;
  envelope: DepotRealtimeEventEnvelope;
};

export const DEPOT_REALTIME_METHODS = {
  JoinDepotGroup: "JoinDepotGroup",
  LeaveDepotGroup: "LeaveDepotGroup",
} as const;

export const DEPOT_REALTIME_EVENTS = {
  DepotUpdated: "DepotUpdated",
} as const;
