import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  allocateDisbursement,
  getCampaignSpending,
  getCampaigns,
  getCampaignStatuses,
} from "./api";
import type {
  AllocateDisbursementRequest,
  CampaignStatusMetadata,
  GetCampaignSpendingParams,
  GetCampaignSpendingResponse,
  GetCampaignsParams,
  GetCampaignsResponse,
} from "./type";

export const CAMPAIGN_SPENDING_QUERY_KEY = ["campaign-spending"] as const;
export const CAMPAIGNS_QUERY_KEY = ["campaigns"] as const;
export const CAMPAIGN_STATUSES_QUERY_KEY = ["campaign-statuses"] as const;

/* ── GET campaign spending ── */

export interface UseCampaignSpendingOptions {
  params: GetCampaignSpendingParams;
  enabled?: boolean;
}

/**
 * Hook to fetch public campaign spending (disbursements + items)
 */
export function useCampaignSpending(options: UseCampaignSpendingOptions) {
  return useQuery<GetCampaignSpendingResponse>({
    queryKey: [...CAMPAIGN_SPENDING_QUERY_KEY, options.params],
    queryFn: () => getCampaignSpending(options.params),
    enabled: options.enabled ?? true,
  });
}

/* ── POST allocate disbursement ── */

/**
 * Hook to allocate funds from Campaign → Depot
 */
export function useAllocateDisbursement() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, AllocateDisbursementRequest>({
    mutationFn: allocateDisbursement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGN_SPENDING_QUERY_KEY });
    },
  });
}

/* ── GET campaigns ── */

export interface UseCampaignsOptions {
  params?: GetCampaignsParams;
  enabled?: boolean;
}

/**
 * Hook to fetch campaigns list
 */
export function useCampaigns(options?: UseCampaignsOptions) {
  return useQuery<GetCampaignsResponse>({
    queryKey: [...CAMPAIGNS_QUERY_KEY, options?.params],
    queryFn: () => getCampaigns(options?.params),
    enabled: options?.enabled ?? true,
  });
}

/* ── GET campaign status metadata ── */

/**
 * Hook to fetch campaign status options (key/value pairs for filter)
 */
export function useCampaignStatuses() {
  return useQuery<CampaignStatusMetadata[]>({
    queryKey: CAMPAIGN_STATUSES_QUERY_KEY,
    queryFn: getCampaignStatuses,
    staleTime: Infinity,
  });
}
