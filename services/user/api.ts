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
  AbilityCategoryMetadataOption,
  AdminCreateUserResponse,
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
  const { data } = await api.get("/identity/admin/users/for-permission", {
    params,
  });
  return data;
}

export async function getRoleMetadata(): Promise<RoleMetadataOption[]> {
  const { data } = await api.get("/identity/roles/metadata");
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
