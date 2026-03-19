import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFundingRequests,
  getFundingRequestStatuses,
  createFundingRequest,
  approveFundingRequest,
  rejectFundingRequest,
} from "./api";
import type {
  GetFundingRequestsParams,
  GetFundingRequestsResponse,
  CreateFundingRequestPayload,
  ApproveFundingRequestPayload,
  RejectFundingRequestPayload,
} from "./type";

export const FUNDING_REQUESTS_QUERY_KEY = ["funding-requests"] as const;
export const FUNDING_REQUEST_STATUSES_QUERY_KEY = [
  "funding-request-statuses",
] as const;

/* ── GET funding requests ── */

export interface UseFundingRequestsOptions {
  params?: GetFundingRequestsParams;
  enabled?: boolean;
}

/**
 * Hook to fetch funding requests list with filters
 */
export function useFundingRequests(options?: UseFundingRequestsOptions) {
  return useQuery<GetFundingRequestsResponse>({
    queryKey: [...FUNDING_REQUESTS_QUERY_KEY, options?.params],
    queryFn: () => getFundingRequests(options?.params),
    enabled: options?.enabled ?? true,
  });
}

/* ── GET funding request statuses metadata ── */

/**
 * Hook to fetch funding request status values from API
 */
export function useFundingRequestStatuses(options?: { enabled?: boolean }) {
  return useQuery<string[]>({
    queryKey: FUNDING_REQUEST_STATUSES_QUERY_KEY,
    queryFn: getFundingRequestStatuses,
    enabled: options?.enabled ?? true,
  });
}

/* ── POST create funding request ── */

/**
 * Hook for depot to submit a funding request with item list
 */
export function useCreateFundingRequest() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, CreateFundingRequestPayload>({
    mutationFn: createFundingRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FUNDING_REQUESTS_QUERY_KEY });
    },
  });
}

/* ── PATCH approve funding request ── */

/**
 * Hook for admin to approve a funding request (pick campaign)
 */
export function useApproveFundingRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { id: number; payload: ApproveFundingRequestPayload }
  >({
    mutationFn: ({ id, payload }) => approveFundingRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FUNDING_REQUESTS_QUERY_KEY });
    },
  });
}

/* ── PATCH reject funding request ── */

/**
 * Hook for admin to reject a funding request
 */
export function useRejectFundingRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { id: number; payload: RejectFundingRequestPayload }
  >({
    mutationFn: ({ id, payload }) => rejectFundingRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FUNDING_REQUESTS_QUERY_KEY });
    },
  });
}
