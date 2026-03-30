import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  getDepotInventory,
  getMyDepotInventory,
  getInventoryCategories,
  getMyDepotQuantityByCategory,
  getInventoryItemTypes,
  getInventoryTargetGroups,
  getInventoryOrganizations,
  getInventoryActionTypes,
  getInventorySourceTypes,
  getInventoryReliefItemsByCategory,
  searchDepotsByReliefItems,
  createSupplyRequests,
  getSupplyRequests,
  acceptSupplyRequest,
  prepareSupplyRequest,
  shipSupplyRequest,
  completeSupplyRequest,
  confirmSupplyRequest,
  rejectSupplyRequest,
  importInventory,
  importRegularInventory,
  getDepotStockMovements,
  exportInventoryMovements,
  getInventoryLots,
  downloadDonationImportTemplate,
  downloadPurchaseImportTemplate,
  getMyDepotThresholds,
  getMyDepotThresholdsHistory,
  updateMyDepotThreshold,
  deleteMyDepotThreshold,
  getMyDepotLowStock,
} from "./api";
import {
  GetDepotInventoryParams,
  GetDepotInventoryResponse,
  GetMyDepotInventoryParams,
  GetMyDepotInventoryResponse,
  GetMyDepotCategoryQuantitiesResponse,
  ImportInventoryRequest,
  ImportRegularRequest,
  InventoryCategory,
  InventoryItemType,
  InventoryOrganization,
  InventoryTargetGroup,
  InventoryActionType,
  InventorySourceType,
  InventoryReliefItem,
  SearchDepotsParams,
  SearchDepotsResponse,
  CreateSupplyRequestsPayload,
  GetSupplyRequestsParams,
  GetSupplyRequestsResponse,
  RejectSupplyRequestPayload,
  GetDepotStockMovementsParams,
  GetDepotStockMovementsResponse,
  ExportMovementsParams,
  GetInventoryLotsResponse,
  GetThresholdsResponse,
  GetThresholdsHistoryParams,
  GetThresholdsHistoryResponse,
  UpdateThresholdPayload,
  UpdateThresholdResponse,
  DeleteThresholdPayload,
  DeleteThresholdResponse,
  GetLowStockParams,
  GetLowStockResponse,
} from "./type";

export const INVENTORY_KEYS = {
  all: ["inventory"] as const,
  depot: (params: GetDepotInventoryParams) =>
    [...INVENTORY_KEYS.all, "depot", params] as const,
  myDepot: (params: GetMyDepotInventoryParams) =>
    [...INVENTORY_KEYS.all, "myDepot", params] as const,
  categories: () => [...INVENTORY_KEYS.all, "categories"] as const,
  quantityByCategory: () =>
    [...INVENTORY_KEYS.all, "quantityByCategory"] as const,
  itemTypes: () => [...INVENTORY_KEYS.all, "itemTypes"] as const,
  targetGroups: () => [...INVENTORY_KEYS.all, "targetGroups"] as const,
  actionTypes: () => [...INVENTORY_KEYS.all, "actionTypes"] as const,
  sourceTypes: () => [...INVENTORY_KEYS.all, "sourceTypes"] as const,
  reliefItemsByCategory: (categoryCode: string) =>
    [...INVENTORY_KEYS.all, "reliefItemsByCategory", categoryCode] as const,
  searchDepots: (params: SearchDepotsParams) =>
    [...INVENTORY_KEYS.all, "searchDepots", params] as const,
  supplyRequests: (params: GetSupplyRequestsParams) =>
    [...INVENTORY_KEYS.all, "supplyRequests", params] as const,
  organizations: () => [...INVENTORY_KEYS.all, "organizations"] as const,
  stockMovements: (params: GetDepotStockMovementsParams) =>
    [...INVENTORY_KEYS.all, "transactions", params] as const,
  lots: (itemModelId: number) =>
    [...INVENTORY_KEYS.all, "lots", itemModelId] as const,
  thresholds: () => [...INVENTORY_KEYS.all, "thresholds"] as const,
  thresholdsHistory: (params: GetThresholdsHistoryParams) =>
    [...INVENTORY_KEYS.all, "thresholdsHistory", params] as const,
  lowStock: (params?: GetLowStockParams) =>
    [...INVENTORY_KEYS.all, "lowStock", params] as const,
};

export function useDepotInventory(
  params: GetDepotInventoryParams,
  options?: Omit<
    UseQueryOptions<GetDepotInventoryResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.depot(params),
    queryFn: () => getDepotInventory(params),
    ...options,
  });
}

export function useMyDepotInventory(
  params: GetMyDepotInventoryParams,
  options?: Omit<
    UseQueryOptions<GetMyDepotInventoryResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.myDepot(params),
    queryFn: () => getMyDepotInventory(params),
    ...options,
  });
}

export function useInventoryCategories(
  options?: Omit<
    UseQueryOptions<InventoryCategory[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.categories(),
    queryFn: getInventoryCategories,
    ...options,
  });
}

export function useMyDepotQuantityByCategory(
  options?: Omit<
    UseQueryOptions<GetMyDepotCategoryQuantitiesResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.quantityByCategory(),
    queryFn: getMyDepotQuantityByCategory,
    ...options,
  });
}

export function useInventoryItemTypes(
  options?: Omit<
    UseQueryOptions<InventoryItemType[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.itemTypes(),
    queryFn: getInventoryItemTypes,
    staleTime: Infinity,
    ...options,
  });
}

export function useInventoryTargetGroups(
  options?: Omit<
    UseQueryOptions<InventoryTargetGroup[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.targetGroups(),
    queryFn: getInventoryTargetGroups,
    staleTime: Infinity,
    ...options,
  });
}

export function useInventoryActionTypes(
  options?: Omit<
    UseQueryOptions<InventoryActionType[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.actionTypes(),
    queryFn: getInventoryActionTypes,
    staleTime: Infinity,
    ...options,
  });
}

export function useInventorySourceTypes(
  options?: Omit<
    UseQueryOptions<InventorySourceType[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.sourceTypes(),
    queryFn: getInventorySourceTypes,
    staleTime: Infinity,
    ...options,
  });
}

export function useInventoryReliefItemsByCategory(
  categoryCode: string,
  options?: Omit<
    UseQueryOptions<InventoryReliefItem[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.reliefItemsByCategory(categoryCode),
    queryFn: () => getInventoryReliefItemsByCategory(categoryCode),
    enabled: !!categoryCode,
    staleTime: Infinity,
    ...options,
  });
}

export function useSearchDepotsByReliefItems(
  params: SearchDepotsParams,
  options?: Omit<
    UseQueryOptions<SearchDepotsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.searchDepots(params),
    queryFn: () => searchDepotsByReliefItems(params),
    ...options,
  });
}

export function useCreateSupplyRequests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupplyRequestsPayload) =>
      createSupplyRequests(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

export function useSupplyRequests(
  params: GetSupplyRequestsParams,
  options?: Omit<
    UseQueryOptions<GetSupplyRequestsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.supplyRequests(params),
    queryFn: () => getSupplyRequests(params),
    ...options,
  });
}

export function useInventoryOrganizations(
  options?: Omit<
    UseQueryOptions<InventoryOrganization[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.organizations(),
    queryFn: getInventoryOrganizations,
    staleTime: Infinity,
    ...options,
  });
}

export function useImportInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportInventoryRequest) => importInventory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

export function useImportRegularInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportRegularRequest) =>
      importRegularInventory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

export function useDepotStockMovements(
  params: GetDepotStockMovementsParams,
  options?: Omit<
    UseQueryOptions<GetDepotStockMovementsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.stockMovements(params),
    queryFn: () => getDepotStockMovements(params),
    ...options,
  });
}

export function useExportInventoryMovements() {
  return useMutation({
    mutationFn: (params: ExportMovementsParams) =>
      exportInventoryMovements(params),
  });
}

export function useAcceptSupplyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => acceptSupplyRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

export function usePrepareSupplyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => prepareSupplyRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

export function useShipSupplyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => shipSupplyRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

export function useCompleteSupplyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => completeSupplyRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

export function useConfirmSupplyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => confirmSupplyRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

export function useRejectSupplyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: RejectSupplyRequestPayload;
    }) => rejectSupplyRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

export function useInventoryLots(
  itemModelId: number,
  options?: Omit<
    UseQueryOptions<GetInventoryLotsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<GetInventoryLotsResponse>({
    queryKey: INVENTORY_KEYS.lots(itemModelId),
    queryFn: () => getInventoryLots(itemModelId),
    ...options,
  });
}

export function useDownloadDonationImportTemplate() {
  return useMutation({
    mutationFn: downloadDonationImportTemplate,
  });
}

export function useDownloadPurchaseImportTemplate() {
  return useMutation({
    mutationFn: downloadPurchaseImportTemplate,
  });
}

// ─── Thresholds ───

export function useMyDepotThresholds(
  options?: Omit<
    UseQueryOptions<GetThresholdsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<GetThresholdsResponse>({
    queryKey: INVENTORY_KEYS.thresholds(),
    queryFn: getMyDepotThresholds,
    ...options,
  });
}

export function useMyDepotThresholdsHistory(
  params: GetThresholdsHistoryParams,
  options?: Omit<
    UseQueryOptions<GetThresholdsHistoryResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<GetThresholdsHistoryResponse>({
    queryKey: INVENTORY_KEYS.thresholdsHistory(params),
    queryFn: () => getMyDepotThresholdsHistory(params),
    ...options,
  });
}

export function useUpdateMyDepotThreshold() {
  const queryClient = useQueryClient();
  return useMutation<UpdateThresholdResponse, Error, UpdateThresholdPayload>({
    mutationFn: updateMyDepotThreshold,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.thresholds() });
    },
  });
}

export function useDeleteMyDepotThreshold() {
  const queryClient = useQueryClient();
  return useMutation<DeleteThresholdResponse, Error, DeleteThresholdPayload>({
    mutationFn: deleteMyDepotThreshold,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.thresholds() });
    },
  });
}

// ─── Low Stock ───

export function useMyDepotLowStock(
  params?: GetLowStockParams,
  options?: Omit<
    UseQueryOptions<GetLowStockResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<GetLowStockResponse>({
    queryKey: INVENTORY_KEYS.lowStock(params),
    queryFn: () => getMyDepotLowStock(params),
    ...options,
  });
}
