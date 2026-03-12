import { useQuery } from "@tanstack/react-query";
import { getDepotInventory } from "./api";
import { GetInventoryResponse, GetInventoryParams } from "./type";

export const INVENTORY_QUERY_KEY = ["inventory"] as const;

export interface UseDepotInventoryOptions {
  params: GetInventoryParams;
  enabled?: boolean;
}

/**
 * Hook to fetch inventory items for a depot
 */
export function useDepotInventory(options: UseDepotInventoryOptions) {
  return useQuery<GetInventoryResponse>({
    queryKey: [...INVENTORY_QUERY_KEY, options.params],
    queryFn: () => getDepotInventory(options.params),
    enabled: options.enabled ?? true,
  });
}
