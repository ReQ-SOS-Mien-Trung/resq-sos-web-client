"use client";

export const ADMIN_FINANCE_REALTIME_EVENTS = {
  ReceiveFundingRequestUpdate: "ReceiveFundingRequestUpdate",
} as const;

export const ADMIN_FINANCE_REALTIME_METHODS = {
  SubscribeFundingRequests: "SubscribeFundingRequests",
  UnsubscribeFundingRequests: "UnsubscribeFundingRequests",
  SubscribeFundingRequest: "SubscribeFundingRequest",
  UnsubscribeFundingRequest: "UnsubscribeFundingRequest",
} as const;

export type FundingRequestRealtimeAction = "Created" | "Approved" | "Rejected";

export interface FundingRequestRealtimeUpdate {
  entityId: number;
  entityType: "FundingRequest" | string;
  requestId: number;
  depotId: number;
  action: FundingRequestRealtimeAction | string;
  status: "Pending" | "Approved" | "Rejected" | string;
  changedAt: string;
}
