import api from "@/config/axios";
import type {
  GetRescuersParams,
  GetRescuersRawResponse,
  GetRescuersResponse,
  RescuerAssemblyPointMetadataOption,
  RescuerApiEntity,
  RescuerType,
} from "./type";

function normalizeRescuerType(
  value: RescuerApiEntity["rescuerType"] | RescuerApiEntity["type"],
): RescuerType {
  if (value === "Core" || value === "Volunteer") {
    return value;
  }

  return null;
}

function normalizeAssemblyPointId(
  value: RescuerApiEntity["assemblyPointId"],
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? null : numericValue;
}

function normalizeNullableBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

function normalizeRescuer(entity: RescuerApiEntity) {
  const attendanceConfirmed = normalizeNullableBoolean(
    entity.hasAttendanceConfirmed ??
      entity.hasPresenceConfirmation ??
      entity.checkedIn ??
      entity.isCheckedIn,
  );

  return {
    id: entity.id ?? entity.userId ?? "",
    firstName: entity.firstName ?? entity.givenName ?? "",
    lastName: entity.lastName ?? entity.familyName ?? "",
    email: entity.email ?? entity.userEmail ?? null,
    phone: entity.phone ?? entity.phoneNumber ?? null,
    avatarUrl:
      entity.avatarUrl ??
      entity.profileImageUrl ??
      entity.profilePictureUrl ??
      null,
    address: entity.address ?? null,
    ward: entity.ward ?? null,
    province: entity.province ?? null,
    rescuerType: normalizeRescuerType(entity.rescuerType ?? entity.type),
    topAbilities: entity.topAbilities ?? [],
    hasTeam: entity.hasTeam ?? Boolean(entity.teamId),
    hasAssemblyPoint:
      entity.hasAssemblyPoint ?? Boolean(entity.assemblyPointId),
    assemblyPointId: normalizeAssemblyPointId(entity.assemblyPointId),
    attendanceConfirmed,
  };
}

function normalizeRescuersResponse(
  raw: GetRescuersRawResponse,
  fallbackPageNumber: number,
  fallbackPageSize: number,
): GetRescuersResponse {
  const payload = raw.data ?? raw;
  const rawItems = payload.items ?? payload.rescuers ?? [];
  const items = rawItems.map(normalizeRescuer);

  const pageNumber =
    payload.pageNumber ?? payload.currentPage ?? fallbackPageNumber;
  const pageSize = payload.pageSize ?? fallbackPageSize;
  const totalCount = payload.totalCount ?? payload.totalItems ?? items.length;
  const totalPages =
    payload.totalPages ??
    payload.pageCount ??
    Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1)));

  const hasPreviousPage =
    payload.hasPreviousPage ?? payload.hasPrevious ?? pageNumber > 1;
  const hasNextPage =
    payload.hasNextPage ?? payload.hasNext ?? pageNumber < totalPages;

  return {
    items,
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
  };
}

/**
 * Get rescuers with pagination and filters.
 * GET /personnel/rescuers
 */
export async function getRescuers(
  params?: GetRescuersParams,
): Promise<GetRescuersResponse> {
  const pageNumber = params?.pageNumber ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const assemblyPointCodes = params?.assemblyPointCodes?.filter(Boolean);

  const { data } = await api.get<GetRescuersRawResponse>(
    "/personnel/rescuers",
    {
      params: {
        pageNumber,
        pageSize,
        hasAssemblyPoint: params?.hasAssemblyPoint,
        hasTeam: params?.hasTeam,
        rescuerType: params?.rescuerType,
        assemblyPointCodes,
        abilitySubgroupCode: params?.abilitySubgroupCode,
        abilityCategoryCode: params?.abilityCategoryCode,
        search: params?.search,
      },
      paramsSerializer: {
        indexes: null,
      },
    },
  );

  return normalizeRescuersResponse(data, pageNumber, pageSize);
}

/**
 * Get assembly point metadata for rescuer filters.
 * GET /personnel/rescuers/assembly-point-metadata
 */
export async function getRescuerAssemblyPointMetadata(): Promise<
  RescuerAssemblyPointMetadataOption[]
> {
  const { data } = await api.get<RescuerAssemblyPointMetadataOption[]>(
    "/personnel/rescuers/assembly-point-metadata",
  );

  return data;
}
