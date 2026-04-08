import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import {
  getCampaignTransactions,
  getCampaignTransactionTypes,
  getCampaignReferenceTypes,
  getCampaignDirections,
  getDepotFundTransactions,
  getDepotFundTransactionTypes,
  getDepotFundReferenceTypes,
} from "./api";
import {
  DepotFundMetadataItem,
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
  depotFundTransactionTypes: () =>
    [...TRANSACTION_KEYS.all, "depotFundTransactionTypes"] as const,
  depotFundReferenceTypes: () =>
    [...TRANSACTION_KEYS.all, "depotFundReferenceTypes"] as const,
  campaignTransactionTypes: () =>
    [...TRANSACTION_KEYS.all, "campaignTransactionTypes"] as const,
  campaignReferenceTypes: () =>
    [...TRANSACTION_KEYS.all, "campaignReferenceTypes"] as const,
  campaignDirections: () =>
    [...TRANSACTION_KEYS.all, "campaignDirections"] as const,
};

export function useDepotFundTransactionTypes() {
  return useQuery<DepotFundMetadataItem[]>({
    queryKey: TRANSACTION_KEYS.depotFundTransactionTypes(),
    queryFn: getDepotFundTransactionTypes,
    staleTime: Infinity,
  });
}

export function useDepotFundReferenceTypes() {
  return useQuery<DepotFundMetadataItem[]>({
    queryKey: TRANSACTION_KEYS.depotFundReferenceTypes(),
    queryFn: getDepotFundReferenceTypes,
    staleTime: Infinity,
  });
}

export function useCampaignTransactionTypes() {
  return useQuery<DepotFundMetadataItem[]>({
    queryKey: TRANSACTION_KEYS.campaignTransactionTypes(),
    queryFn: getCampaignTransactionTypes,
    staleTime: Infinity,
  });
}

export function useCampaignReferenceTypes() {
  return useQuery<DepotFundMetadataItem[]>({
    queryKey: TRANSACTION_KEYS.campaignReferenceTypes(),
    queryFn: getCampaignReferenceTypes,
    staleTime: Infinity,
  });
}

export function useCampaignDirections() {
  return useQuery<DepotFundMetadataItem[]>({
    queryKey: TRANSACTION_KEYS.campaignDirections(),
    queryFn: getCampaignDirections,
    staleTime: Infinity,
  });
}

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
