import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { getItemModels, updateItemModel } from "./api";
import type {
  GetItemModelsParams,
  ItemModelEntity,
  UpdateItemModelPayload,
} from "./type";

export const ITEM_MODEL_KEYS = {
  all: ["item-models"] as const,
  list: (params?: GetItemModelsParams) =>
    [...ITEM_MODEL_KEYS.all, "list", params] as const,
};

export function useItemModels(
  params?: GetItemModelsParams,
  options?: Omit<
    UseQueryOptions<ItemModelEntity[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: ITEM_MODEL_KEYS.list(params),
    queryFn: () => getItemModels(params),
    ...options,
  });
}

export function useUpdateItemModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateItemModelPayload;
    }) => updateItemModel(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ITEM_MODEL_KEYS.all });
    },
  });
}
