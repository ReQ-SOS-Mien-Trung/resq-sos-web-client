import api from "@/config/axios";
import type {
  GetItemModelsParams,
  ItemModelEntity,
  UpdateItemModelPayload,
} from "./type";

export async function getItemModels(
  params?: GetItemModelsParams,
): Promise<ItemModelEntity[]> {
  const { data } = await api.get("/logistics/item-model", {
    params: {
      categoryId: params?.categoryId,
      itemType: params?.itemType,
    },
  });
  return Array.isArray(data) ? data : [];
}

export async function updateItemModel(
  id: number,
  payload: UpdateItemModelPayload,
): Promise<ItemModelEntity> {
  const { data } = await api.put(`/logistics/item-model/${id}`, payload);
  return data;
}
