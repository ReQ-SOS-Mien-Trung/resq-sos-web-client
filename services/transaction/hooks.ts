import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getCampaignTransactions, getDepotFundTransactions } from "./api";
import {
  GetDepotFundTransactionsParams,
  GetDepotFundTransactionsResponse,
  GetCampaignTransactionsParams,
  GetCampaignTransactionsResponse,
} from "./type";

export const TRANSACTION_KEYS = {
  all: ["transactions"] as const,
  campaignTransactions: (params: GetCampaignTransactionsParams) =>
    [...TRANSACTION_KEYS.all, "campaign", params] as const,
  depotFundTransactions: (params: GetDepotFundTransactionsParams) =>
    [...TRANSACTION_KEYS.all, "depotFund", params] as const,
};

export function useCampaignTransactions(
  params: GetCampaignTransactionsParams,
  options?: Omit<
    UseQueryOptions<GetCampaignTransactionsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: TRANSACTION_KEYS.campaignTransactions(params),
    queryFn: () => getCampaignTransactions(params),
    enabled: params.id > 0,
    ...options,
  });
}

export function useDepotFundTransactions(
  params: GetDepotFundTransactionsParams,
  options?: Omit<
    UseQueryOptions<GetDepotFundTransactionsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: TRANSACTION_KEYS.depotFundTransactions(params),
    queryFn: () => getDepotFundTransactions(params),
    enabled: params.depotId > 0,
    ...options,
  });
}
