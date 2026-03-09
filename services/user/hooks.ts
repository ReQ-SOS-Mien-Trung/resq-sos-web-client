import { useQuery, useMutation, UseQueryOptions } from "@tanstack/react-query";
import { getUserMe, updateUserAvatar, getAdminUsers, banUser, unbanUser } from "./api";
import { UserMeResponse, GetUsersParams, GetUsersResponse, BanUserRequest } from "./type";

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
    mutationFn: ({ userId, avatarUrl }: { userId: string; avatarUrl: string }) =>
      updateUserAvatar(userId, avatarUrl),
  });
}

export const ADMIN_USERS_QUERY_KEY = ["admin", "users"] as const;

export function useAdminUsers(
  params?: GetUsersParams,
  options?: Omit<UseQueryOptions<GetUsersResponse, Error>, "queryKey" | "queryFn">
) {
  return useQuery<GetUsersResponse, Error>({
    queryKey: [...ADMIN_USERS_QUERY_KEY, params],
    queryFn: () => getAdminUsers(params),
    ...options,
  });
}

export function useBanUser() {
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: BanUserRequest }) => banUser(userId, data),
  });
}

export function useUnbanUser() {
  return useMutation({
    mutationFn: (userId: string) => unbanUser(userId),
  });
}
