import api from "@/config/axios";
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
  RoleMetadataOption,
  RescuerTypeMetadataOption,
  AbilityCategoryMetadataOption,
  AdminCreateUserResponse,
  GetDocumentFileTypesResponse,
  GetAbilitiesResponse,
  UpdateUserAbilitiesRequest,
  UpsertRescuerDocumentsRequest,
} from "./type";

type AbilityCategoryMetadataApiItem = {
  key?: string;
  value?: string;
  code?: string;
  name?: string;
  description?: string;
  categoryCode?: string;
  categoryDescription?: string;
};

type AbilityCategoryMetadataApiResponse =
  | AbilityCategoryMetadataApiItem[]
  | {
      data?: AbilityCategoryMetadataApiItem[];
      items?: AbilityCategoryMetadataApiItem[];
    };

function normalizeAbilityCategoryMetadataItem(
  item: AbilityCategoryMetadataApiItem,
): AbilityCategoryMetadataOption | null {
  const rawKey = item.key ?? item.code ?? item.categoryCode;
  const normalizedKey = String(rawKey ?? "")
    .trim()
    .toUpperCase();

  if (!normalizedKey) {
    return null;
  }

  const rawValue =
    item.value ?? item.description ?? item.name ?? item.categoryDescription;
  const normalizedValue = String(rawValue ?? "").trim() || normalizedKey;

  return {
    key: normalizedKey,
    value: normalizedValue,
  };
}

export async function getUserMe(): Promise<UserMeResponse> {
  const { data } = await api.get("/identity/user/me");
  return data;
}

export async function updateUserAvatar(
  userId: string,
  avatarUrl: string,
): Promise<any> {
  const { data } = await api.put(`/identity/admin/users/${userId}/avatar`, {
    avatarUrl,
  });
  return data;
}

export async function getAdminUsers(
  params?: GetUsersParams,
): Promise<GetUsersResponse> {
  const { data } = await api.get("/identity/admin/users", { params });
  return data;
}

export async function getAdminRescuers(
  params?: GetRescuersParams,
): Promise<GetRescuersResponse> {
  const { data } = await api.get("/identity/admin/users/rescuers", { params });
  return data;
}

export async function banUser(
  userId: string,
  data: BanUserRequest,
): Promise<void> {
  await api.post(`/identity/admin/users/${userId}/ban`, data);
}

export async function unbanUser(userId: string): Promise<void> {
  await api.post(`/identity/admin/users/${userId}/unban`);
}

export async function getAdminUserById(
  userId: string,
): Promise<GetAdminUserByIdResponse> {
  const { data } = await api.get(`/identity/admin/users/${userId}`);
  return data;
}

export async function adminCreateUser(
  data: AdminCreateUserRequest,
): Promise<AdminCreateUserResponse> {
  const response = await api.post("/identity/admin/users", data);
  return response.data;
}

export async function updateAdminUser(
  userId: string,
  data: AdminUpdateUserRequest,
): Promise<UserEntity> {
  const response = await api.put(`/identity/admin/users/${userId}`, data);
  return response.data;
}

export async function getUsersForPermission(
  params?: GetUsersForPermissionParams,
): Promise<GetUsersForPermissionResponse> {
  const searchTerm = params?.search?.trim();
  const normalizedPhone = searchTerm?.replace(/[^\d+]/g, "") ?? "";
  const isEmailSearch = !!searchTerm && searchTerm.includes("@");
  const isPhoneSearch =
    !!normalizedPhone && /^\+?\d{6,}$/.test(normalizedPhone);

  const { data } = await api.get("/identity/admin/users/for-permission", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 50,
      ...(params?.roleId ? { roleId: params.roleId } : {}),
      ...(searchTerm
        ? isEmailSearch
          ? { email: searchTerm }
          : isPhoneSearch
            ? { phone: normalizedPhone }
            : { name: searchTerm }
        : {}),
    },
  });
  return data;
}

export async function getRoleMetadata(): Promise<RoleMetadataOption[]> {
  const { data } = await api.get("/identity/roles/metadata");
  return data;
}

export async function getRescuerTypeMetadata(): Promise<
  RescuerTypeMetadataOption[]
> {
  const { data } = await api.get("/identity/user/rescuer/metadata/types");
  return data;
}

export async function getAbilityCategoryMetadata(): Promise<
  AbilityCategoryMetadataOption[]
> {
  const { data } = await api.get<AbilityCategoryMetadataApiResponse>(
    "/identity/ability-categories/metadata",
  );

  const rawItems = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.items)
        ? data.items
        : [];

  const deduplicated = new Map<string, string>();

  rawItems.forEach((item) => {
    const normalized = normalizeAbilityCategoryMetadataItem(item);
    if (!normalized) {
      return;
    }

    deduplicated.set(normalized.key, normalized.value);
  });

  return Array.from(deduplicated.entries()).map(([key, value]) => ({
    key,
    value,
  }));
}

export async function getDocumentFileTypes(): Promise<GetDocumentFileTypesResponse> {
  const { data } = await api.get("/identity/document-file-types");
  return data;
}

export async function getAbilities(): Promise<GetAbilitiesResponse> {
  const { data } = await api.get("/identity/abilities");
  return data;
}

export async function updateUserAbilities(
  userId: string,
  payload: UpdateUserAbilitiesRequest,
): Promise<void> {
  await api.put(`/identity/user/${userId}/abilities`, payload);
}

export async function createRescuerDocuments(
  userId: string,
  payload: UpsertRescuerDocumentsRequest,
): Promise<void> {
  await api.post(
    `/identity/admin/rescuer-applications/${userId}/certificates`,
    payload,
  );
}

export async function updateRescuerDocuments(
  userId: string,
  payload: UpsertRescuerDocumentsRequest,
): Promise<void> {
  await api.put(
    `/identity/admin/rescuer-applications/${userId}/certificates`,
    payload,
  );
}
