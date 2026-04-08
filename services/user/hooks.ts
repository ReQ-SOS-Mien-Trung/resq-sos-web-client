import { useQuery, useMutation, UseQueryOptions } from "@tanstack/react-query";
import {
  getUserMe,
  updateUserAvatar,
  getAdminUsers,
  getAdminRescuers,
  getAdminUserById,
  banUser,
  unbanUser,
  adminCreateUser,
  updateAdminUser,
  getUsersForPermission,
} from "./api";
import {
  UserMeResponse,
  GetUsersParams,
  GetUsersResponse,
  GetRescuersParams,
  GetRescuersResponse,
  BanUserRequest,
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  UserEntity,
  GetAdminUserByIdResponse,
  GetUsersForPermissionParams,
  GetUsersForPermissionResponse,
} from "./type";

export const USER_ME_QUERY_KEY = ["user", "me"] as const;

export interface UseUserMeOptions {
  enabled?: boolean;
  onSuccess?: (data: UserMeResponse) => void;
  onError?: (error: Error) => void;
}

export function useUserMe(options?: UseUserMeOptions) {
  return useQuery<UserMeResponse, Error>({
    queryKey: USER_ME_QUERY_KEY,
    queryFn: getUserMe,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateUserAvatar() {
  return useMutation({
    mutationFn: ({
      userId,
      avatarUrl,
    }: {
      userId: string;
      avatarUrl: string;
    }) => updateUserAvatar(userId, avatarUrl),
  });
}

export const ADMIN_USERS_QUERY_KEY = ["admin", "users"] as const;

export function useAdminUsers(
  params?: GetUsersParams,
  options?: Omit<
    UseQueryOptions<GetUsersResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<GetUsersResponse, Error>({
    queryKey: [...ADMIN_USERS_QUERY_KEY, params],
    queryFn: () => getAdminUsers(params),
    ...options,
  });
}

export const ADMIN_RESCUERS_QUERY_KEY = ["admin", "rescuers"] as const;

export function useAdminRescuers(
  params?: GetRescuersParams,
  options?: Omit<
    UseQueryOptions<GetRescuersResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<GetRescuersResponse, Error>({
    queryKey: [...ADMIN_RESCUERS_QUERY_KEY, params],
    queryFn: () => getAdminRescuers(params),
    ...options,
  });
}

export function useAdminUserById(
  userId: string,
  options?: Omit<
    UseQueryOptions<GetAdminUserByIdResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<GetAdminUserByIdResponse, Error>({
    queryKey: [...ADMIN_USERS_QUERY_KEY, userId],
    queryFn: () => getAdminUserById(userId),
    ...options,
  });
}

export function useBanUser() {
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: BanUserRequest }) =>
      banUser(userId, data),
  });
}

export function useUnbanUser() {
  return useMutation({
    mutationFn: (userId: string) => unbanUser(userId),
  });
}

export function useAdminCreateUser() {
  return useMutation({
    mutationFn: (data: AdminCreateUserRequest) => adminCreateUser(data),
  });
}

export function useUpdateAdminUser() {
  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: AdminUpdateUserRequest;
    }) => updateAdminUser(userId, data),
  });
}

export const USERS_FOR_PERMISSION_QUERY_KEY = [
  "admin",
  "users",
  "for-permission",
] as const;

export function useUsersForPermission(params?: GetUsersForPermissionParams) {
  return useQuery<GetUsersForPermissionResponse, Error>({
    queryKey: [...USERS_FOR_PERMISSION_QUERY_KEY, params],
    queryFn: () => getUsersForPermission(params),
    enabled: !!params?.search?.trim() || !!params?.roleId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
