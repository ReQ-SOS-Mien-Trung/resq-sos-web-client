import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRescuerApplications, reviewRescuerApplication } from "./api";
import {
  GetRescuerApplicationsResponse,
  GetRescuerApplicationsParams,
  ReviewRescuerApplicationRequest,
  ReviewRescuerApplicationResponse,
} from "./type";

export const RESCUER_APPLICATIONS_QUERY_KEY = ["rescuer-applications"] as const;

export interface UseRescuerApplicationsOptions {
  params?: GetRescuerApplicationsParams;
  enabled?: boolean;
}

/**
 * Hook to fetch all rescuer applications with pagination and optional status filter
 */
export function useRescuerApplications(
  options?: UseRescuerApplicationsOptions,
) {
  return useQuery<GetRescuerApplicationsResponse>({
    queryKey: [...RESCUER_APPLICATIONS_QUERY_KEY, options?.params],
    queryFn: () => getRescuerApplications(options?.params),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to review (approve/reject) a rescuer application
 */
export function useReviewRescuerApplication() {
  const queryClient = useQueryClient();

  return useMutation<
    ReviewRescuerApplicationResponse,
    Error,
    ReviewRescuerApplicationRequest
  >({
    mutationFn: reviewRescuerApplication,
    onSuccess: () => {
      // Invalidate rescuer applications query to refetch the list
      queryClient.invalidateQueries({
        queryKey: RESCUER_APPLICATIONS_QUERY_KEY,
      });
    },
  });
}
