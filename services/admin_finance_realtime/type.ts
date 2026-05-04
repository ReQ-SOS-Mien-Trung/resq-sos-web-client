"use client";

export const ADMIN_FINANCE_REALTIME_EVENTS = {
  ReceiveFundingRequestUpdate: "ReceiveFundingRequestUpdate",
  ReceiveChartInvalidation: "ReceiveChartInvalidation",
  ReceiveSystemFundUpdate: "ReceiveSystemFundUpdate",
} as const;

export const ADMIN_FINANCE_REALTIME_METHODS = {
  SubscribeFundingRequests: "SubscribeFundingRequests",
  UnsubscribeFundingRequests: "UnsubscribeFundingRequests",
  SubscribeFundingRequest: "SubscribeFundingRequest",
  UnsubscribeFundingRequest: "UnsubscribeFundingRequest",
  SubscribeDepotFundCharts: "SubscribeDepotFundCharts",
  UnsubscribeDepotFundCharts: "UnsubscribeDepotFundCharts",
  SubscribeCampaignFundFlow: "SubscribeCampaignFundFlow",
  UnsubscribeCampaignFundFlow: "UnsubscribeCampaignFundFlow",
  SubscribeSystemFund: "SubscribeSystemFund",
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

export interface SystemFundUpdate {
  entityId: number;
  entityType: "SystemFund";
  action: string;
  status?: string;
  changedAt: string;
  systemFundId: number;
  name: string;
  balance: number;
  lastUpdatedAt?: string | null;
  amount: number;
  transactionType?: string;
  referenceType?: string;
  referenceId?: number | null;
  depotId?: number | null;
}
