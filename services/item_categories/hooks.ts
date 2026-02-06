import { useQuery } from "@tanstack/react-query";
import {
  getItemCategories,
  getItemCategoryCodes,
  getItemCategoryById,
  getItemCategoryByCode,
} from "./api";
import {
  GetItemCategoriesResponse,
  GetItemCategoriesParams,
  ItemCategoryEntity,
  ItemCategoryCodeOption,
} from "./type";

export const ITEM_CATEGORIES_QUERY_KEY = ["item-categories"] as const;
export const ITEM_CATEGORY_CODES_QUERY_KEY = ["item-category-codes"] as const;

export interface UseItemCategoriesOptions {
  params?: GetItemCategoriesParams;
  enabled?: boolean;
}

export interface UseItemCategoryByIdOptions {
  enabled?: boolean;
}

export interface UseItemCategoryByCodeOptions {
  enabled?: boolean;
}

export interface UseItemCategoryCodesOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch all item categories with pagination
 */
export function useItemCategories(options?: UseItemCategoriesOptions) {
  return useQuery<GetItemCategoriesResponse>({
    queryKey: [...ITEM_CATEGORIES_QUERY_KEY, options?.params],
    queryFn: () => getItemCategories(options?.params),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch all item category codes
 */
export function useItemCategoryCodes(options?: UseItemCategoryCodesOptions) {
  return useQuery<ItemCategoryCodeOption[]>({
    queryKey: ITEM_CATEGORY_CODES_QUERY_KEY,
    queryFn: getItemCategoryCodes,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch an item category by ID
 */
export function useItemCategoryById(
  id: number,
  options?: UseItemCategoryByIdOptions,
) {
  return useQuery<ItemCategoryEntity>({
    queryKey: [...ITEM_CATEGORIES_QUERY_KEY, id],
    queryFn: () => getItemCategoryById(id),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch an item category by code
 */
export function useItemCategoryByCode(
  code: string,
  options?: UseItemCategoryByCodeOptions,
) {
  return useQuery<ItemCategoryEntity>({
    queryKey: [...ITEM_CATEGORIES_QUERY_KEY, "code", code],
    queryFn: () => getItemCategoryByCode(code),
    enabled: options?.enabled ?? true,
  });
}
