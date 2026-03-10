import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getMyDepotInventory, getInventoryCategories } from "./api";
import { GetMyDepotInventoryParams, GetMyDepotInventoryResponse, InventoryCategory } from "./type";

export const INVENTORY_KEYS = {
  all: ["inventory"] as const,
  myDepot: (params: GetMyDepotInventoryParams) => [...INVENTORY_KEYS.all, "myDepot", params] as const,
  categories: () => [...INVENTORY_KEYS.all, "categories"] as const,
};

export function useMyDepotInventory(
  params: GetMyDepotInventoryParams,
  options?: Omit<UseQueryOptions<GetMyDepotInventoryResponse, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.myDepot(params),
    queryFn: () => getMyDepotInventory(params),
    ...options,
  });
}

export function useInventoryCategories(
  options?: Omit<UseQueryOptions<InventoryCategory[], Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: INVENTORY_KEYS.categories(),
    queryFn: getInventoryCategories,
    ...options,
  });
}
