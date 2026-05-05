"use client";

export const ADMIN_DEPOT_REALTIME_EVENTS = {
  ReceiveDepotUpdate: "ReceiveDepotUpdate",
  ReceiveDepotClosureUpdate: "ReceiveDepotClosureUpdate",
  ReceiveTransferUpdate: "ReceiveTransferUpdate",
  ReceiveChartInvalidation: "ReceiveChartInvalidation",
} as const;

export const ADMIN_DEPOT_REALTIME_METHODS = {
  SubscribeDepots: "SubscribeDepots",
  SubscribeDepot: "SubscribeDepot",
  SubscribeDepotCharts: "SubscribeDepotCharts",
} as const;

export interface AdminDepotUpdatePayload {
  entityId: number;
  entityType: string;
  action: string;
  status?: string;
  changedAt: string;
  depotId?: number | null;
}
