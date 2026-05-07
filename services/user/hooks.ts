import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
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
  getRoleMetadata,
  getRescuerTypeMetadata,
  getAbilityCategoryMetadata,
  getDocumentFileTypes,
  getAbilities,
  updateUserAbilities,
  createRescuerDocuments,
  updateRescuerDocuments,
} from "./api";
import {
  UserMeResponse,
  GetUsersParams,
  GetUsersResponse,
  GetRescuersParams,
  GetRescuersResponse,
  BanUserRequest,
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AdminUpdateUserRequest,
  GetAdminUserByIdResponse,
  GetUsersForPermissionParams,
  GetUsersForPermissionResponse,
  RoleMetadataOption,
  RescuerTypeMetadataOption,
  AbilityCategoryMetadataOption,
  GetDocumentFileTypesResponse,
  GetAbilitiesResponse,
  UpdateUserAbilitiesRequest,
  UpsertRescuerDocumentsRequest,
} from "./type";

export const USER_ME_QUERY_KEY = ["user", "me"] as const;

export interface UseUserMeOptions {
  enabled?: boolean;
  onSuccess?: (data: UserMeResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseRoleMetadataOptions {
  enabled?: boolean;
}

export interface UseAbilityCategoryMetadataOptions {
  enabled?: boolean;
}

export interface UseRescuerTypeMetadataOptions {
  enabled?: boolean;
}

export interface UseDocumentFileTypesOptions {
  enabled?: boolean;
}

export interface UseAbilitiesOptions {
  enabled?: boolean;
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
    mutationFn: (
      data: AdminCreateUserRequest,
    ): Promise<AdminCreateUserResponse> => adminCreateUser(data),
  });
}

export const ROLE_METADATA_QUERY_KEY = [
  "identity",
  "roles",
  "metadata",
] as const;

export const ABILITY_CATEGORY_METADATA_QUERY_KEY = [
  "identity",
  "ability-categories",
  "metadata",
] as const;

export const RESCUER_TYPE_METADATA_QUERY_KEY = [
  "identity",
  "rescuer",
  "metadata",
  "types",
] as const;

export const DOCUMENT_FILE_TYPES_QUERY_KEY = [
  "identity",
  "document-file-types",
] as const;

export const ABILITIES_QUERY_KEY = ["identity", "abilities"] as const;

export function useRoleMetadata(options?: UseRoleMetadataOptions) {
  return useQuery<RoleMetadataOption[], Error>({
    queryKey: ROLE_METADATA_QUERY_KEY,
    queryFn: getRoleMetadata,
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
  });
}

export function useRescuerTypeMetadata(
  options?: UseRescuerTypeMetadataOptions,
) {
  return useQuery<RescuerTypeMetadataOption[], Error>({
    queryKey: RESCUER_TYPE_METADATA_QUERY_KEY,
    queryFn: getRescuerTypeMetadata,
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
  });
}

export function useAbilityCategoryMetadata(
  options?: UseAbilityCategoryMetadataOptions,
) {
  return useQuery<AbilityCategoryMetadataOption[], Error>({
    queryKey: ABILITY_CATEGORY_METADATA_QUERY_KEY,
    queryFn: getAbilityCategoryMetadata,
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
  });
}

export function useDocumentFileTypes(options?: UseDocumentFileTypesOptions) {
  return useQuery<GetDocumentFileTypesResponse, Error>({
    queryKey: DOCUMENT_FILE_TYPES_QUERY_KEY,
    queryFn: getDocumentFileTypes,
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
  });
}

export function useAbilities(options?: UseAbilitiesOptions) {
  return useQuery<GetAbilitiesResponse, Error>({
    queryKey: ABILITIES_QUERY_KEY,
    queryFn: getAbilities,
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
  });
}

export function useUpdateUserAbilities() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { userId: string; data: UpdateUserAbilitiesRequest }
  >({
    mutationFn: ({ userId, data }) => updateUserAbilities(userId, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: [...ADMIN_USERS_QUERY_KEY, variables.userId],
      });
    },
  });
}

export function useCreateRescuerDocuments() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { userId: string; data: UpsertRescuerDocumentsRequest }
  >({
    mutationFn: ({ userId, data }) => createRescuerDocuments(userId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
    },
  });
}

export function useUpdateRescuerDocuments() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { userId: string; data: UpsertRescuerDocumentsRequest }
  >({
    mutationFn: ({ userId, data }) => updateRescuerDocuments(userId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USER_ME_QUERY_KEY });
    },
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
    enabled: true,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
