import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  getAssemblyPoints,
  getAssemblyPointById,
  getAssemblyPointEvents,
  getAssemblyPointStatuses,
  getAssemblyPointMetadata,
  createAssemblyPoint,
  updateAssemblyPoint,
  updateAssemblyPointStatus,
  deleteAssemblyPoint,
  updateRescuerAssemblyPointAssignment,
  scheduleAssemblyPointGathering,
  startAssemblyPointGathering,
} from "./api";
import {
  GetAssemblyPointsResponse,
  GetAssemblyPointsParams,
  AssemblyPointEntity,
  AssemblyPointDetailEntity,
  CreateAssemblyPointRequest,
  CreateAssemblyPointResponse,
  AssemblyPointStatusMetadata,
  AssemblyPointMetadataOption,
  UpdateAssemblyPointRequest,
  UpdateAssemblyPointResponse,
  UpdateAssemblyPointStatusRequest,
  UpdateAssemblyPointStatusResponse,
  UpdateRescuerAssemblyPointAssignmentRequest,
  ScheduleAssemblyPointGatheringRequest,
  ScheduleAssemblyPointGatheringResponse,
  ScheduleAssemblyPointGatheringErrorResponse,
  StartAssemblyPointGatheringRequest,
  GetAssemblyPointEventsParams,
  GetAssemblyPointEventsResponse,
} from "./type";
import { AxiosError } from "axios";

export const ASSEMBLY_POINTS_QUERY_KEY = ["assembly-points"] as const;
export const ASSEMBLY_POINT_STATUSES_QUERY_KEY = [
  "assembly-point-statuses",
] as const;
export const ASSEMBLY_POINT_METADATA_QUERY_KEY = [
  "assembly-point-metadata",
] as const;
export const ASSEMBLY_POINT_EVENTS_QUERY_KEY = [
  "assembly-point-events",
] as const;

export interface UseAssemblyPointsOptions {
  params?: GetAssemblyPointsParams;
  enabled?: boolean;
}

export interface UseAssemblyPointByIdOptions {
  enabled?: boolean;
}

export interface UseAssemblyPointStatusesOptions {
  enabled?: boolean;
}

export interface UseAssemblyPointMetadataOptions {
  enabled?: boolean;
}

export interface UseAssemblyPointEventsOptions {
  params?: GetAssemblyPointEventsParams;
  enabled?: boolean;
}

/**
 * Hook to fetch all assembly points with pagination
 */
export function useAssemblyPoints(options?: UseAssemblyPointsOptions) {
  return useQuery<GetAssemblyPointsResponse>({
    queryKey: [...ASSEMBLY_POINTS_QUERY_KEY, options?.params],
    queryFn: () => getAssemblyPoints(options?.params),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch all assembly points with infinite pagination
 */
export function useInfiniteAssemblyPoints(options?: UseAssemblyPointsOptions) {
  return useInfiniteQuery<GetAssemblyPointsResponse>({
    queryKey: [...ASSEMBLY_POINTS_QUERY_KEY, "infinite", options?.params],
    queryFn: ({ pageParam = 1 }) =>
      getAssemblyPoints({
        ...options?.params,
        pageNumber: pageParam as number,
        pageSize: options?.params?.pageSize || 10,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // Assuming paginated response shape typically contains `currentPage` and `totalPages` directly
      // Adjust according to actual response shape
      const { currentPage, totalPages } = lastPage as any;
      if (typeof currentPage === "number" && typeof totalPages === "number") {
        return currentPage < totalPages ? currentPage + 1 : undefined;
      }
      return undefined;
    },
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch an assembly point by ID
 */
export function useAssemblyPointById(
  id: number,
  options?: UseAssemblyPointByIdOptions,
) {
  return useQuery<AssemblyPointDetailEntity>({
    queryKey: [...ASSEMBLY_POINTS_QUERY_KEY, id],
    queryFn: () => getAssemblyPointById(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch events by assembly point ID with pagination
 */
export function useAssemblyPointEvents(
  id: number,
  options?: UseAssemblyPointEventsOptions,
) {
  return useQuery<GetAssemblyPointEventsResponse>({
    queryKey: [...ASSEMBLY_POINT_EVENTS_QUERY_KEY, id, options?.params],
    queryFn: () => getAssemblyPointEvents(id, options?.params),
    enabled: (options?.enabled ?? true) && Number.isFinite(id),
  });
}

/**
 * Hook to fetch assembly point statuses metadata
 */
export function useAssemblyPointStatuses(
  options?: UseAssemblyPointStatusesOptions,
) {
  return useQuery<AssemblyPointStatusMetadata[]>({
    queryKey: ASSEMBLY_POINT_STATUSES_QUERY_KEY,
    queryFn: getAssemblyPointStatuses,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch assembly point metadata for dropdowns
 */
export function useAssemblyPointMetadata(
  options?: UseAssemblyPointMetadataOptions,
) {
  return useQuery<AssemblyPointMetadataOption[]>({
    queryKey: ASSEMBLY_POINT_METADATA_QUERY_KEY,
    queryFn: getAssemblyPointMetadata,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new assembly point
 */
export function useCreateAssemblyPoint() {
  const queryClient = useQueryClient();

  return useMutation<
    CreateAssemblyPointResponse,
    Error,
    CreateAssemblyPointRequest
  >({
    mutationFn: createAssemblyPoint,
    onSuccess: () => {
      // Invalidate assembly points query to refetch the list
      queryClient.invalidateQueries({ queryKey: ASSEMBLY_POINTS_QUERY_KEY });
    },
  });
}

/**
 * Hook to update an assembly point
 */
export function useUpdateAssemblyPoint() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAssemblyPointResponse,
    Error,
    UpdateAssemblyPointRequest
  >({
    mutationFn: updateAssemblyPoint,
    onSuccess: (data) => {
      // Invalidate assembly points query to refetch the list
      queryClient.invalidateQueries({ queryKey: ASSEMBLY_POINTS_QUERY_KEY });
      // Invalidate specific assembly point query
      queryClient.invalidateQueries({
        queryKey: [...ASSEMBLY_POINTS_QUERY_KEY, data.id],
      });
    },
  });
}

/**
 * Hook to update assembly point status
 */
export function useUpdateAssemblyPointStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAssemblyPointStatusResponse,
    Error,
    UpdateAssemblyPointStatusRequest
  >({
    mutationFn: updateAssemblyPointStatus,
    onSuccess: (data) => {
      // Invalidate assembly points query to refetch the list
      queryClient.invalidateQueries({ queryKey: ASSEMBLY_POINTS_QUERY_KEY });
      // Invalidate specific assembly point query
      queryClient.invalidateQueries({
        queryKey: [...ASSEMBLY_POINTS_QUERY_KEY, data.id],
      });
    },
  });
}

/**
 * Hook to delete an assembly point
 */
export function useDeleteAssemblyPoint() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: deleteAssemblyPoint,
    onSuccess: () => {
      // Invalidate assembly points query to refetch the list
      queryClient.invalidateQueries({ queryKey: ASSEMBLY_POINTS_QUERY_KEY });
    },
  });
}

/**
 * Hook to assign or unassign rescuer to assembly point
 */
export function useUpdateRescuerAssemblyPointAssignment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateRescuerAssemblyPointAssignmentRequest>({
    mutationFn: updateRescuerAssemblyPointAssignment,
    onSuccess: () => {
      // Invalidate assembly points query to refetch the list
      queryClient.invalidateQueries({ queryKey: ASSEMBLY_POINTS_QUERY_KEY });
    },
  });
}

/**
 * Hook to schedule gathering at assembly point
 */
export function useScheduleAssemblyPointGathering() {
  const queryClient = useQueryClient();

  return useMutation<
    ScheduleAssemblyPointGatheringResponse,
    AxiosError<ScheduleAssemblyPointGatheringErrorResponse>,
    ScheduleAssemblyPointGatheringRequest
  >({
    mutationFn: scheduleAssemblyPointGathering,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSEMBLY_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...ASSEMBLY_POINTS_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: [...ASSEMBLY_POINT_EVENTS_QUERY_KEY, variables.id],
      });
    },
  });
}

/**
 * Hook to start gathering for assembly event
 */
export function useStartAssemblyPointGathering() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, StartAssemblyPointGatheringRequest>({
    mutationFn: startAssemblyPointGathering,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSEMBLY_POINTS_QUERY_KEY });
      if (variables.assemblyPointId) {
        queryClient.invalidateQueries({
          queryKey: [...ASSEMBLY_POINTS_QUERY_KEY, variables.assemblyPointId],
        });
        queryClient.invalidateQueries({
          queryKey: [
            ...ASSEMBLY_POINT_EVENTS_QUERY_KEY,
            variables.assemblyPointId,
          ],
        });
      }
    },
  });
}
