import { useQuery } from "@tanstack/react-query";
import {
  getSystemFund,
  getSystemFundTransactions,
  getSystemFundTransactionTypes,
} from "./api";
import type {
  GetSystemFundTransactionsParams,
  GetSystemFundTransactionsResponse,
  SystemFundEntity,
  SystemFundMetadataItem,
} from "./type";

export const SYSTEM_FUND_QUERY_KEYS = {
  all: ["system-fund"] as const,
  summary: () => [...SYSTEM_FUND_QUERY_KEYS.all, "summary"] as const,
  transactions: (params: GetSystemFundTransactionsParams) =>
    [...SYSTEM_FUND_QUERY_KEYS.all, "transactions", params] as const,
  transactionTypes: () =>
    [...SYSTEM_FUND_QUERY_KEYS.all, "transaction-types"] as const,
};

export function useSystemFund(options?: { enabled?: boolean }) {
  return useQuery<SystemFundEntity>({
    queryKey: SYSTEM_FUND_QUERY_KEYS.summary(),
    queryFn: getSystemFund,
    enabled: options?.enabled ?? true,
  });
}

export function useSystemFundTransactionTypes(options?: { enabled?: boolean }) {
  return useQuery<SystemFundMetadataItem[]>({
    queryKey: SYSTEM_FUND_QUERY_KEYS.transactionTypes(),
    queryFn: getSystemFundTransactionTypes,
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
  });
}

export function useSystemFundTransactions(
  params: GetSystemFundTransactionsParams,
  options?: { enabled?: boolean },
) {
  return useQuery<GetSystemFundTransactionsResponse>({
    queryKey: SYSTEM_FUND_QUERY_KEYS.transactions(params),
    queryFn: () => getSystemFundTransactions(params),
    enabled: options?.enabled ?? true,
  });
}
