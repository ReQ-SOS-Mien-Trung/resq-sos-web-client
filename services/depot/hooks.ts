import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDepots,
  getDepotById,
  getDepotStatuses,
  createDepot,
  updateDepot,
  updateDepotStatus,
} from "./api";
import {
  GetDepotsResponse,
  GetDepotsParams,
  CreateDepotRequest,
  DepotEntity,
  DepotStatusMetadata,
  UpdateDepotRequest,
  UpdateDepotStatusRequest,
  UpdateDepotStatusResponse,
} from "./type";

export const DEPOTS_QUERY_KEY = ["depots"] as const;
export const DEPOT_STATUSES_QUERY_KEY = ["depot-statuses"] as const;

export interface UseDepotsOptions {
  params?: GetDepotsParams;
  enabled?: boolean;
}

export interface UseDepotByIdOptions {
  enabled?: boolean;
}

export interface UseDepotStatusesOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch all depots with pagination
 */
export function useDepots(options?: UseDepotsOptions) {
  return useQuery<GetDepotsResponse>({
    queryKey: [...DEPOTS_QUERY_KEY, options?.params],
    queryFn: () => getDepots(options?.params),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch a depot by ID
 */
export function useDepotById(id: number, options?: UseDepotByIdOptions) {
  return useQuery<DepotEntity>({
    queryKey: [...DEPOTS_QUERY_KEY, id],
    queryFn: () => getDepotById(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch depot statuses metadata
 */
export function useDepotStatuses(options?: UseDepotStatusesOptions) {
  return useQuery<DepotStatusMetadata[]>({
    queryKey: DEPOT_STATUSES_QUERY_KEY,
    queryFn: getDepotStatuses,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to create a new depot
 */
export function useCreateDepot() {
  const queryClient = useQueryClient();

  return useMutation<DepotEntity, Error, CreateDepotRequest>({
    mutationFn: createDepot,
    onSuccess: () => {
      // Invalidate depots query to refetch the list
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
    },
  });
}

/**
 * Hook to update a depot
 */
export function useUpdateDepot() {
  const queryClient = useQueryClient();

  return useMutation<DepotEntity, Error, UpdateDepotRequest>({
    mutationFn: updateDepot,
    onSuccess: (data) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOTS_QUERY_KEY, data.id],
      });
    },
  });
}

/**
 * Hook to update depot status
 */
export function useUpdateDepotStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateDepotStatusResponse,
    Error,
    UpdateDepotStatusRequest
  >({
    mutationFn: updateDepotStatus,
    onSuccess: (_, variables) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOTS_QUERY_KEY, variables.id],
      });
    },
  });
}
