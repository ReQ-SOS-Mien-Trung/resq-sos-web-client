import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFinanceRealtimeClient } from "@/services/admin_finance_realtime/client";
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
  transactionsRoot: () =>
    [...SYSTEM_FUND_QUERY_KEYS.all, "transactions"] as const,
  transactions: (params: GetSystemFundTransactionsParams) =>
    [...SYSTEM_FUND_QUERY_KEYS.transactionsRoot(), params] as const,
  transactionTypes: () =>
    [...SYSTEM_FUND_QUERY_KEYS.all, "transaction-types"] as const,
};

export function useSystemFund(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = adminFinanceRealtimeClient.onSystemFundUpdate(
      (payload) => {
        if (payload.entityType !== "SystemFund") return;

        queryClient.setQueryData<SystemFundEntity>(
          SYSTEM_FUND_QUERY_KEYS.summary(),
          {
            id: payload.systemFundId,
            name: payload.name,
            balance: payload.balance,
            lastUpdatedAt: payload.lastUpdatedAt ?? payload.changedAt,
          },
        );
        void queryClient.invalidateQueries({
          queryKey: SYSTEM_FUND_QUERY_KEYS.transactionsRoot(),
        });
      },
    );

    void adminFinanceRealtimeClient.subscribeSystemFund().catch((error) => {
      console.warn("Failed to subscribe system fund realtime:", error);
    });

    return () => {
      unsubscribe();
      void adminFinanceRealtimeClient.unsubscribeSystemFund().catch(() => null);
    };
  }, [enabled, queryClient]);

  return useQuery<SystemFundEntity>({
    queryKey: SYSTEM_FUND_QUERY_KEYS.summary(),
    queryFn: getSystemFund,
    enabled,
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
