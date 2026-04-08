import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDepots,
  getDepotById,
  getDepotStatuses,
  getDepotMetadata,
  getAvailableDepotManagers,
  getDepotFunds,
  getMyDepotFund,
  createDepot,
  updateDepot,
  updateDepotStatus,
  assignDepotManager,
  unassignDepotManager,
  updateDepotAdvanceLimit,
  getMyDepotFundTransactions,
  getDepotClosureMetadata,
  initiateDepotClosure,
  resolveDepotClosure,
  cancelDepotClosure,
  getDepotClosureTransfer,
  prepareDepotTransfer,
  shipDepotTransfer,
  completeDepotTransfer,
  receiveDepotTransfer,
  getDepotClosures,
} from "./api";
import {
  GetDepotsResponse,
  GetDepotsParams,
  CreateDepotRequest,
  DepotEntity,
  DepotStatusMetadata,
  DepotMetadataItem,
  AvailableDepotManager,
  DepotFund,
  UpdateDepotRequest,
  UpdateDepotStatusRequest,
  UpdateDepotStatusResponse,
  AssignDepotManagerRequest,
  UnassignDepotManagerRequest,
  DepotManagerAssignmentResponse,
  GetDepotFundTransactionsResponse,
  GetDepotFundTransactionsParams,
  DepotClosureMetadata,
  InitiateDepotClosureRequest,
  InitiateDepotClosureResponse,
  ResolveDepotClosureRequest,
  ResolveDepotClosureResponse,
  CancelDepotClosureRequest,
  CancelDepotClosureResponse,
  DepotClosureTransfer,
  DepotTransferActionRequest,
  DepotTransferActionResponse,
  DepotReceiveTransferResponse,
  DepotClosureRecord,
} from "./type";

export const DEPOTS_QUERY_KEY = ["depots"] as const;
export const DEPOT_STATUSES_QUERY_KEY = ["depot-statuses"] as const;
export const DEPOT_METADATA_QUERY_KEY = ["depot-metadata"] as const;
export const DEPOT_AVAILABLE_MANAGERS_QUERY_KEY = [
  "depot-available-managers",
] as const;
export const DEPOT_FUNDS_QUERY_KEY = ["depot-funds"] as const;
export const MY_DEPOT_FUND_QUERY_KEY = ["my-depot-fund"] as const;

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

export interface UseDepotMetadataOptions {
  enabled?: boolean;
}

export interface UseDepotAvailableManagersOptions {
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
 * Hook to fetch depot metadata (key-value list for dropdowns)
 */
export function useDepotMetadata(options?: UseDepotMetadataOptions) {
  return useQuery<DepotMetadataItem[]>({
    queryKey: DEPOT_METADATA_QUERY_KEY,
    queryFn: getDepotMetadata,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch available managers for depot assignment
 */
export function useDepotAvailableManagers(
  options?: UseDepotAvailableManagersOptions,
) {
  return useQuery<AvailableDepotManager[]>({
    queryKey: DEPOT_AVAILABLE_MANAGERS_QUERY_KEY,
    queryFn: getAvailableDepotManagers,
    enabled: options?.enabled ?? true,
  });
}

/**
 * [Admin] Hook to fetch all depot funds
 */
export function useDepotFunds(options?: { enabled?: boolean }) {
  return useQuery<DepotFund[]>({
    queryKey: DEPOT_FUNDS_QUERY_KEY,
    queryFn: getDepotFunds,
    enabled: options?.enabled ?? true,
  });
}

export const MY_DEPOT_FUND_TRANSACTIONS_QUERY_KEY = [
  "my-depot-fund-transactions",
] as const;

/**
 * [Manager] Hook to fetch my depot fund
 */
export function useMyDepotFund(options?: { enabled?: boolean }) {
  return useQuery<DepotFund>({
    queryKey: MY_DEPOT_FUND_QUERY_KEY,
    queryFn: getMyDepotFund,
    enabled: options?.enabled ?? true,
  });
}

/**
 * [Manager] Hook to fetch my depot fund transaction history
 */
export function useMyDepotFundTransactions(
  params?: GetDepotFundTransactionsParams,
  options?: { enabled?: boolean },
) {
  return useQuery<GetDepotFundTransactionsResponse>({
    queryKey: [...MY_DEPOT_FUND_TRANSACTIONS_QUERY_KEY, params],
    queryFn: () => getMyDepotFundTransactions(params),
    enabled: options?.enabled ?? true,
  });
}

/**
 * [Admin] Hook to update advance limit for a depot
 */
export function useUpdateDepotAdvanceLimit() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { depotId: number; maxAdvanceLimit: number }>(
    {
      mutationFn: ({ depotId, maxAdvanceLimit }) =>
        updateDepotAdvanceLimit(depotId, maxAdvanceLimit),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: DEPOT_FUNDS_QUERY_KEY });
      },
    },
  );
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

/**
 * Hook to assign/replace manager for a depot
 */
export function useAssignDepotManager() {
  const queryClient = useQueryClient();

  return useMutation<
    DepotManagerAssignmentResponse,
    Error,
    AssignDepotManagerRequest
  >({
    mutationFn: assignDepotManager,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOTS_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_AVAILABLE_MANAGERS_QUERY_KEY,
      });
    },
  });
}

/**
 * Hook to unassign manager from a depot
 */
export function useUnassignDepotManager() {
  const queryClient = useQueryClient();

  return useMutation<
    DepotManagerAssignmentResponse,
    Error,
    UnassignDepotManagerRequest
  >({
    mutationFn: unassignDepotManager,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOTS_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_AVAILABLE_MANAGERS_QUERY_KEY,
      });
    },
  });
}

export const DEPOT_CLOSURES_QUERY_KEY = ["depot-closures"] as const;

/**
 * [Admin] Hook to fetch all closure records for a depot
 * GET /logistics/depot/{id}/closures
 */
export function useDepotClosures(id: number, options?: { enabled?: boolean }) {
  return useQuery<DepotClosureRecord[]>({
    queryKey: [...DEPOT_CLOSURES_QUERY_KEY, id],
    queryFn: () => getDepotClosures(id),
    enabled: options?.enabled ?? !!id,
  });
}

export const DEPOT_CLOSURE_METADATA_QUERY_KEY = [
  "depot-closure-metadata",
] as const;

/**
 * Hook to fetch depot closure metadata (resolution type enum)
 */
export function useDepotClosureMetadata(options?: { enabled?: boolean }) {
  return useQuery<DepotClosureMetadata>({
    queryKey: DEPOT_CLOSURE_METADATA_QUERY_KEY,
    queryFn: getDepotClosureMetadata,
    enabled: options?.enabled ?? true,
  });
}

/**
 * [Admin] Hook to initiate depot closure
 */
export function useInitiateDepotClosure() {
  const queryClient = useQueryClient();

  return useMutation<
    InitiateDepotClosureResponse,
    Error,
    InitiateDepotClosureRequest
  >({
    mutationFn: initiateDepotClosure,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOTS_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: [...DEPOT_CLOSURES_QUERY_KEY, variables.id],
      });
    },
  });
}

/**
 * [Admin] Hook to resolve depot closure (chọn cách xử lý tồn kho)
 */
export function useResolveDepotClosure() {
  const queryClient = useQueryClient();

  return useMutation<
    ResolveDepotClosureResponse,
    Error,
    ResolveDepotClosureRequest
  >({
    mutationFn: resolveDepotClosure,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOTS_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: [...DEPOT_CLOSURES_QUERY_KEY, variables.id],
      });
    },
  });
}

/**
 * [Admin] Hook to cancel depot closure (kho quay về Available/Full)
 */
export function useCancelDepotClosure() {
  const queryClient = useQueryClient();

  return useMutation<
    CancelDepotClosureResponse,
    Error,
    CancelDepotClosureRequest
  >({
    mutationFn: cancelDepotClosure,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOTS_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: [...DEPOT_CLOSURES_QUERY_KEY, variables.id],
      });
    },
  });
}
// ── Depot Closure Transfer ─────────────────────────────────────────

export const DEPOT_TRANSFER_QUERY_KEY = ["depot-closure-transfer"] as const;

/**
 * Hook to fetch a transfer record
 * GET /logistics/depot/{id}/close/{closureId}/transfer/{transferId}
 */
export function useDepotClosureTransfer(
  id: number,
  closureId: number,
  transferId: number,
  options?: { enabled?: boolean },
) {
  return useQuery<DepotClosureTransfer>({
    queryKey: [...DEPOT_TRANSFER_QUERY_KEY, id, closureId, transferId],
    queryFn: () => getDepotClosureTransfer(id, closureId, transferId),
    enabled: options?.enabled ?? (!!id && !!closureId && !!transferId),
  });
}

/**
 * [Manager kho nguồn] Chuẩn bị hàng → Preparing
 * POST .../prepare
 */
export function usePrepareDepotTransfer() {
  const queryClient = useQueryClient();
  return useMutation<
    DepotTransferActionResponse,
    Error,
    DepotTransferActionRequest
  >({
    mutationFn: prepareDepotTransfer,
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...DEPOT_TRANSFER_QUERY_KEY,
          v.id,
          v.closureId,
          v.transferId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOT_CLOSURES_QUERY_KEY, v.id],
      });
    },
  });
}

/**
 * [Manager kho nguồn] Xuất hàng → Shipping
 * POST .../ship
 */
export function useShipDepotTransfer() {
  const queryClient = useQueryClient();
  return useMutation<
    DepotTransferActionResponse,
    Error,
    DepotTransferActionRequest
  >({
    mutationFn: shipDepotTransfer,
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...DEPOT_TRANSFER_QUERY_KEY,
          v.id,
          v.closureId,
          v.transferId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOT_CLOSURES_QUERY_KEY, v.id],
      });
    },
  });
}

/**
 * [Manager kho nguồn] Hoàn tất xuất → Completed
 * POST .../complete
 */
export function useCompleteDepotTransfer() {
  const queryClient = useQueryClient();
  return useMutation<
    DepotTransferActionResponse,
    Error,
    DepotTransferActionRequest
  >({
    mutationFn: completeDepotTransfer,
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...DEPOT_TRANSFER_QUERY_KEY,
          v.id,
          v.closureId,
          v.transferId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOT_CLOSURES_QUERY_KEY, v.id],
      });
    },
  });
}

/**
 * [Manager kho đích] Xác nhận nhận hàng → kích hoạt bulk transfer + hoàn tất đóng kho
 * POST .../receive
 */
export function useReceiveDepotTransfer() {
  const queryClient = useQueryClient();
  return useMutation<
    DepotReceiveTransferResponse,
    Error,
    DepotTransferActionRequest
  >({
    mutationFn: receiveDepotTransfer,
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...DEPOT_TRANSFER_QUERY_KEY,
          v.id,
          v.closureId,
          v.transferId,
        ],
      });
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOT_CLOSURES_QUERY_KEY, v.id],
      });
    },
  });
}
