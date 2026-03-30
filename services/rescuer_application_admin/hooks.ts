import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  getRescuerApplications,
  getRescuerApplicationDetail,
  reviewRescuerApplication,
} from "./api";
import {
  GetRescuerApplicationsResponse,
  GetRescuerApplicationsParams,
  RescuerApplicationDetail,
  ReviewRescuerApplicationRequest,
  ReviewRescuerApplicationResponse,
} from "./type";

export const RESCUER_APPLICATIONS_KEYS = {
  all: ["rescuer-applications"] as const,
  list: (params?: GetRescuerApplicationsParams) =>
    [...RESCUER_APPLICATIONS_KEYS.all, "list", params] as const,
  detail: (id: number) =>
    [...RESCUER_APPLICATIONS_KEYS.all, "detail", id] as const,
};

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
    queryKey: RESCUER_APPLICATIONS_KEYS.list(options?.params),
    queryFn: () => getRescuerApplications(options?.params),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch a single rescuer application detail by ID
 */
export function useRescuerApplicationDetail(
  id: number,
  options?: Omit<
    UseQueryOptions<RescuerApplicationDetail, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<RescuerApplicationDetail>({
    queryKey: RESCUER_APPLICATIONS_KEYS.detail(id),
    queryFn: () => getRescuerApplicationDetail(id),
    enabled: id > 0,
    ...options,
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
      queryClient.invalidateQueries({
        queryKey: RESCUER_APPLICATIONS_KEYS.all,
      });
    },
  });
}
