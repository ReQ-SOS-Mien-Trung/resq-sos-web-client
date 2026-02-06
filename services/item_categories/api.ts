import api from "@/config/axios";
import {
  GetItemCategoriesResponse,
  GetItemCategoriesParams,
  ItemCategoryEntity,
  ItemCategoryCodeOption,
} from "./type";

/**
 * Get all item categories with pagination
 * GET /logistics/item-category
 */
export async function getItemCategories(
  params?: GetItemCategoriesParams,
): Promise<GetItemCategoriesResponse> {
  const { data } = await api.get("/logistics/item-category", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  });
  return data;
}

/**
 * Get all item category codes
 * GET /logistics/item-category/codes
 */
export async function getItemCategoryCodes(): Promise<
  ItemCategoryCodeOption[]
> {
  const { data } = await api.get("/logistics/item-category/codes");
  return data;
}

/**
 * Get an item category by ID
 * GET /logistics/item-category/{id}
 */
export async function getItemCategoryById(
  id: number,
): Promise<ItemCategoryEntity> {
  const { data } = await api.get(`/logistics/item-category/${id}`);
  return data;
}

/**
 * Get an item category by code
 * GET /logistics/item-category/code/{code}
 */
export async function getItemCategoryByCode(
  code: string,
): Promise<ItemCategoryEntity> {
  const { data } = await api.get(`/logistics/item-category/code/${code}`);
  return data;
}
