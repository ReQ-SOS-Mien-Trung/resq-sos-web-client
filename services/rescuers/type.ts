export type RescuerType = "Volunteer" | "Core" | null;

export interface RescuerApiEntity {
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  givenName?: string;
  familyName?: string;
  email?: string | null;
  userEmail?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  profilePictureUrl?: string | null;
  address?: string | null;
  ward?: string | null;
  province?: string | null;
  rescuerType?: RescuerType;
  type?: string | null;
  topAbilities?: string[];
  hasTeam?: boolean;
  hasAssemblyPoint?: boolean;
  teamId?: number | null;
  assemblyPointId?: number | string | null;
}

export interface RescuerEntity {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  address?: string | null;
  ward?: string | null;
  province?: string | null;
  rescuerType?: RescuerType;
  topAbilities?: string[];
  hasTeam: boolean;
  hasAssemblyPoint: boolean;
  assemblyPointId?: number | null;
}

export interface GetRescuersParams {
  pageNumber?: number;
  pageSize?: number;
  hasAssemblyPoint?: boolean;
  hasTeam?: boolean;
  rescuerType?: Exclude<RescuerType, null>;
  assemblyPointCodes?: string[];
  abilitySubgroupCode?: string;
  abilityCategoryCode?: string;
  search?: string;
}

export interface RescuerAssemblyPointMetadataOption {
  key: string;
  value: string;
}

export interface GetRescuersResponse {
  items: RescuerEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface GetRescuersRawResponse {
  items?: RescuerApiEntity[];
  rescuers?: RescuerApiEntity[];
  pageNumber?: number;
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  totalItems?: number;
  totalPages?: number;
  pageCount?: number;
  hasPreviousPage?: boolean;
  hasPrevious?: boolean;
  hasNextPage?: boolean;
  hasNext?: boolean;
  data?: {
    items?: RescuerApiEntity[];
    rescuers?: RescuerApiEntity[];
    pageNumber?: number;
    currentPage?: number;
    pageSize?: number;
    totalCount?: number;
    totalItems?: number;
    totalPages?: number;
    pageCount?: number;
    hasPreviousPage?: boolean;
    hasPrevious?: boolean;
    hasNextPage?: boolean;
    hasNext?: boolean;
  };
}
