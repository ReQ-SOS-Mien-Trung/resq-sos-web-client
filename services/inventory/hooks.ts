import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  getMyDepotInventory,
  getInventoryCategories,
  getInventoryItemTypes,
  getInventoryTargetGroups,
  getInventoryOrganizations,
  getInventoryActionTypes,
  getInventorySourceTypes,
  getInventoryReliefItemsByCategory,
  searchDepotsByReliefItems,
  createSupplyRequests,
  getSupplyRequests,
  importInventory,
  importRegularInventory,
  getDepotTransactions,
  exportInventoryMovements,
} from "./api";
import {
  GetMyDepotInventoryParams,
  GetMyDepotInventoryResponse,
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
  GetDepotTransactionsParams,
  GetDepotTransactionsResponse,
  ExportMovementsParams,
} from "./type";

export const INVENTORY_KEYS = {
  all: ["inventory"] as const,
  myDepot: (params: GetMyDepotInventoryParams) =>
    [...INVENTORY_KEYS.all, "myDepot", params] as const,
  categories: () => [...INVENTORY_KEYS.all, "categories"] as const,
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
  transactions: (params: GetDepotTransactionsParams) =>
    [...INVENTORY_KEYS.all, "transactions", params] as const,
};

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

export function useDepotTransactions(
  params: GetDepotTransactionsParams,
  options?: Omit<
    UseQueryOptions<GetDepotTransactionsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.transactions(params),
    queryFn: () => getDepotTransactions(params),
    ...options,
  });
}

export function useExportInventoryMovements() {
  return useMutation({
    mutationFn: (params: ExportMovementsParams) =>
      exportInventoryMovements(params),
  });
}
