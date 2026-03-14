import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  getAssemblyPoints,
  getAssemblyPointById,
  getAssemblyPointStatuses,
  createAssemblyPoint,
  updateAssemblyPoint,
  updateAssemblyPointStatus,
  deleteAssemblyPoint,
} from "./api";
import {
  GetAssemblyPointsResponse,
  GetAssemblyPointsParams,
  AssemblyPointEntity,
  CreateAssemblyPointRequest,
  CreateAssemblyPointResponse,
  AssemblyPointStatusMetadata,
  UpdateAssemblyPointRequest,
  UpdateAssemblyPointResponse,
  UpdateAssemblyPointStatusRequest,
  UpdateAssemblyPointStatusResponse,
} from "./type";

export const ASSEMBLY_POINTS_QUERY_KEY = ["assembly-points"] as const;
export const ASSEMBLY_POINT_STATUSES_QUERY_KEY = [
  "assembly-point-statuses",
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
  return useQuery<AssemblyPointEntity>({
    queryKey: [...ASSEMBLY_POINTS_QUERY_KEY, id],
    queryFn: () => getAssemblyPointById(id),
    enabled: options?.enabled ?? true,
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
