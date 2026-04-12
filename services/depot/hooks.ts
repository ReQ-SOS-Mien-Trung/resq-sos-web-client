import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDepots,
  getDepotsByCluster,
  getDepotById,
  getDepotStatuses,
  getDepotChangeableStatuses,
  getDepotMetadata,
  getDepotClosureResolutionMetadata,
  getAvailableDepotManagers,
  getDepotFunds,
  getMyDepotFund,
  createInternalAdvance,
  createInternalRepayment,
  createDepot,
  updateDepot,
  updateDepotStatus,
  assignDepotManager,
  unassignDepotManager,
  updateDepotAdvanceLimit,
  getMyDepotFundTransactions,
  initiateDepotClosure,
  markDepotClosureExternal,
  submitDepotExternalResolution,
  downloadDepotClosureExportTemplate,
  initiateDepotClosureTransfer,
  getMyDepotTransfers,
  getMyDepotClosures,
  getMyDepotClosureDetail,
  getDepotClosureByDepotId,
  getDepotClosureDetailByDepotId,
  getDepotClosureTransfer,
  prepareDepotTransfer,
  shipDepotTransfer,
  completeDepotTransfer,
  receiveDepotTransfer,
} from "./api";
import {
  GetDepotsResponse,
  GetDepotsByClusterResponse,
  GetDepotsParams,
  CreateDepotRequest,
  DepotEntity,
  ChangeableDepotStatusMetadata,
  DepotStatusMetadata,
  DepotMetadataItem,
  DepotClosureResolutionMetadataItem,
  AvailableDepotManager,
  DepotFund,
  MyDepotFund,
  UpdateDepotRequest,
  UpdateDepotStatusRequest,
  UpdateDepotStatusResponse,
  AssignDepotManagerRequest,
  UnassignDepotManagerRequest,
  DepotManagerAssignmentResponse,
  GetDepotFundTransactionsResponse,
  GetDepotFundTransactionsParams,
  CreateInternalAdvanceRequest,
  CreateInternalRepaymentRequest,
  InitiateDepotClosureRequest,
  InitiateDepotClosureResponse,
  MarkDepotClosureExternalRequest,
  MarkDepotClosureExternalResponse,
  SubmitDepotExternalResolutionRequest,
  SubmitDepotExternalResolutionResponse,
  InitiateDepotClosureTransferRequest,
  InitiateDepotClosureTransferResponse,
  GetMyDepotTransfersResponse,
  GetMyDepotClosuresResponse,
  DepotClosureDetail,
  DepotClosureTransfer,
  DepotTransferActionRequest,
  DepotTransferActionResponse,
  DepotReceiveTransferResponse,
} from "./type";

export const DEPOTS_QUERY_KEY = ["depots"] as const;
export const DEPOTS_BY_CLUSTER_QUERY_KEY = [
  ...DEPOTS_QUERY_KEY,
  "by-cluster",
] as const;
export const DEPOT_STATUSES_QUERY_KEY = ["depot-statuses"] as const;
export const DEPOT_CHANGEABLE_STATUSES_QUERY_KEY = [
  "depot-changeable-statuses",
] as const;
export const DEPOT_METADATA_QUERY_KEY = ["depot-metadata"] as const;
export const DEPOT_CLOSURE_RESOLUTION_METADATA_QUERY_KEY = [
  "depot-closure-resolution-metadata",
] as const;
export const DEPOT_AVAILABLE_MANAGERS_QUERY_KEY = [
  "depot-available-managers",
] as const;
export const MY_DEPOT_CLOSURES_QUERY_KEY = ["my-depot-closures"] as const;
export const MY_DEPOT_CLOSURE_DETAIL_QUERY_KEY = [
  "my-depot-closure-detail",
] as const;
export const MY_DEPOT_TRANSFERS_QUERY_KEY = ["my-depot-transfers"] as const;
export const DEPOT_CLOSURE_BY_DEPOT_QUERY_KEY = [
  "depot-closure-by-depot",
] as const;
export const DEPOT_CLOSURE_DETAIL_BY_DEPOT_QUERY_KEY = [
  "depot-closure-detail-by-depot",
] as const;
export const DEPOT_FUNDS_QUERY_KEY = ["depot-funds"] as const;
export const MY_DEPOT_FUND_QUERY_KEY = ["my-depot-fund"] as const;
export const MY_DEPOT_FUND_TRANSACTIONS_QUERY_KEY = [
  "my-depot-fund-transactions",
] as const;

function invalidateDepotFundFinanceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: MY_DEPOT_FUND_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: MY_DEPOT_FUND_TRANSACTIONS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: DEPOT_FUNDS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
}

export interface UseDepotsOptions {
  params?: GetDepotsParams;
  enabled?: boolean;
}

export interface UseDepotByIdOptions {
  enabled?: boolean;
}

export interface UseDepotsByClusterOptions {
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
 * Hook to fetch depots nearest to a SOS cluster
 */
export function useDepotsByCluster(
  clusterId: number,
  options?: UseDepotsByClusterOptions,
) {
  return useQuery<GetDepotsByClusterResponse>({
    queryKey: [...DEPOTS_BY_CLUSTER_QUERY_KEY, clusterId],
    queryFn: () => getDepotsByCluster(clusterId),
    enabled:
      (options?.enabled ?? true) && Number.isFinite(clusterId) && clusterId > 0,
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
 * Hook to fetch changeable depot statuses for PATCH /{id}/status
 */
export function useDepotChangeableStatuses(options?: UseDepotStatusesOptions) {
  return useQuery<ChangeableDepotStatusMetadata[]>({
    queryKey: DEPOT_CHANGEABLE_STATUSES_QUERY_KEY,
    queryFn: getDepotChangeableStatuses,
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

export function useDepotClosureResolutionMetadata(
  options?: UseDepotMetadataOptions,
) {
  return useQuery<DepotClosureResolutionMetadataItem[]>({
    queryKey: DEPOT_CLOSURE_RESOLUTION_METADATA_QUERY_KEY,
    queryFn: getDepotClosureResolutionMetadata,
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

/**
 * [Manager] Hook to fetch my depot fund
 */
export function useMyDepotFund(options?: { enabled?: boolean }) {
  return useQuery<MyDepotFund>({
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
        invalidateDepotFundFinanceQueries(queryClient);
      },
    },
  );
}

export function useCreateInternalAdvance() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { depotFundId: number; payload: CreateInternalAdvanceRequest }
  >({
    mutationFn: ({ depotFundId, payload }) =>
      createInternalAdvance(depotFundId, payload),
    onSuccess: () => {
      invalidateDepotFundFinanceQueries(queryClient);
    },
  });
}

export function useCreateInternalRepayment() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    CreateInternalRepaymentRequest
  >({
    mutationFn: createInternalRepayment,
    onSuccess: () => {
      invalidateDepotFundFinanceQueries(queryClient);
    },
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
        queryKey: [...DEPOT_CLOSURE_BY_DEPOT_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_CLOSURE_DETAIL_BY_DEPOT_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_CLOSURES_QUERY_KEY });
    },
  });
}

/**
 * [Admin] Hook to mark a closure as externally handled
 */
export function useMarkDepotClosureExternal() {
  const queryClient = useQueryClient();

  return useMutation<
    MarkDepotClosureExternalResponse,
    Error,
    MarkDepotClosureExternalRequest
  >({
    mutationFn: markDepotClosureExternal,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOTS_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: [...DEPOT_CLOSURE_BY_DEPOT_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_CLOSURE_DETAIL_BY_DEPOT_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_CLOSURES_QUERY_KEY });
    },
  });
}

/**
 * [Depot Manager] Hook to submit external resolution JSON
 */
export function useSubmitDepotExternalResolution() {
  const queryClient = useQueryClient();

  return useMutation<
    SubmitDepotExternalResolutionResponse,
    Error,
    SubmitDepotExternalResolutionRequest
  >({
    mutationFn: submitDepotExternalResolution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_CLOSURES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: MY_DEPOT_CLOSURE_DETAIL_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_TRANSFERS_QUERY_KEY });
    },
  });
}

export function useDownloadDepotClosureExportTemplate() {
  return useMutation({
    mutationFn: downloadDepotClosureExportTemplate,
  });
}

export function useMyDepotClosures(options?: { enabled?: boolean }) {
  return useQuery<GetMyDepotClosuresResponse>({
    queryKey: MY_DEPOT_CLOSURES_QUERY_KEY,
    queryFn: getMyDepotClosures,
    enabled: options?.enabled ?? true,
  });
}

export function useMyDepotClosureDetail(
  closureId: number,
  options?: { enabled?: boolean },
) {
  return useQuery<DepotClosureDetail>({
    queryKey: [...MY_DEPOT_CLOSURE_DETAIL_QUERY_KEY, closureId],
    queryFn: () => getMyDepotClosureDetail(closureId),
    enabled: (options?.enabled ?? true) && Number.isFinite(closureId) && closureId > 0,
  });
}

export function useMyDepotTransfers(options?: { enabled?: boolean }) {
  return useQuery<GetMyDepotTransfersResponse>({
    queryKey: MY_DEPOT_TRANSFERS_QUERY_KEY,
    queryFn: getMyDepotTransfers,
    enabled: options?.enabled ?? true,
  });
}

export function useDepotClosureByDepotId(
  depotId: number,
  options?: { enabled?: boolean },
) {
  return useQuery<DepotClosureDetail | null>({
    queryKey: [...DEPOT_CLOSURE_BY_DEPOT_QUERY_KEY, depotId],
    queryFn: () => getDepotClosureByDepotId(depotId),
    enabled: (options?.enabled ?? true) && Number.isFinite(depotId) && depotId > 0,
  });
}

export function useDepotClosureDetailByDepotId(
  depotId: number,
  closureId: number,
  options?: { enabled?: boolean },
) {
  return useQuery<DepotClosureDetail | null>({
    queryKey: [...DEPOT_CLOSURE_DETAIL_BY_DEPOT_QUERY_KEY, depotId, closureId],
    queryFn: () => getDepotClosureDetailByDepotId(depotId, closureId),
    enabled:
      (options?.enabled ?? true) &&
      Number.isFinite(depotId) &&
      depotId > 0 &&
      Number.isFinite(closureId) &&
      closureId > 0,
  });
}

/**
 * [Admin] Hook to start depot-closure transfer flow
 */
export function useInitiateDepotClosureTransfer() {
  const queryClient = useQueryClient();

  return useMutation<
    InitiateDepotClosureTransferResponse,
    Error,
    InitiateDepotClosureTransferRequest
  >({
    mutationFn: initiateDepotClosureTransfer,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...DEPOTS_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: [...DEPOT_CLOSURE_BY_DEPOT_QUERY_KEY, variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_CLOSURE_DETAIL_BY_DEPOT_QUERY_KEY,
      });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_CLOSURES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_TRANSFERS_QUERY_KEY });
    },
  });
}
// ── Depot Closure Transfer ─────────────────────────────────────────

export const DEPOT_TRANSFER_QUERY_KEY = ["depot-closure-transfer"] as const;

/**
 * Hook to fetch a transfer record
 * GET /logistics/depot/{id}/transfer/{transferId}
 */
export function useDepotClosureTransfer(
  id: number,
  transferId: number,
  options?: { enabled?: boolean },
) {
  return useQuery<DepotClosureTransfer>({
    queryKey: [...DEPOT_TRANSFER_QUERY_KEY, id, transferId],
    queryFn: () => getDepotClosureTransfer(id, transferId),
    enabled: options?.enabled ?? (!!id && !!transferId),
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
      if (v.sourceDepotId) {
        queryClient.invalidateQueries({
          queryKey: [...DEPOT_TRANSFER_QUERY_KEY, v.sourceDepotId, v.transferId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: DEPOT_TRANSFER_QUERY_KEY });
      }
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_TRANSFERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_CLOSURES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: MY_DEPOT_CLOSURE_DETAIL_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_CLOSURE_BY_DEPOT_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_CLOSURE_DETAIL_BY_DEPOT_QUERY_KEY,
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
      if (v.sourceDepotId) {
        queryClient.invalidateQueries({
          queryKey: [...DEPOT_TRANSFER_QUERY_KEY, v.sourceDepotId, v.transferId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: DEPOT_TRANSFER_QUERY_KEY });
      }
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_TRANSFERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_CLOSURES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: MY_DEPOT_CLOSURE_DETAIL_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_CLOSURE_BY_DEPOT_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_CLOSURE_DETAIL_BY_DEPOT_QUERY_KEY,
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
      if (v.sourceDepotId) {
        queryClient.invalidateQueries({
          queryKey: [...DEPOT_TRANSFER_QUERY_KEY, v.sourceDepotId, v.transferId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: DEPOT_TRANSFER_QUERY_KEY });
      }
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_TRANSFERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_CLOSURES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: MY_DEPOT_CLOSURE_DETAIL_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_CLOSURE_BY_DEPOT_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_CLOSURE_DETAIL_BY_DEPOT_QUERY_KEY,
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
      if (v.sourceDepotId) {
        queryClient.invalidateQueries({
          queryKey: [...DEPOT_TRANSFER_QUERY_KEY, v.sourceDepotId, v.transferId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: DEPOT_TRANSFER_QUERY_KEY });
      }
      queryClient.invalidateQueries({ queryKey: DEPOTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_TRANSFERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_DEPOT_CLOSURES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: MY_DEPOT_CLOSURE_DETAIL_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_CLOSURE_BY_DEPOT_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: DEPOT_CLOSURE_DETAIL_BY_DEPOT_QUERY_KEY,
      });
    },
  });
}
