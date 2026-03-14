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
  importInventory,
  importRegularInventory,
  getDepotTransactions,
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
  GetDepotTransactionsParams,
  GetDepotTransactionsResponse,
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
