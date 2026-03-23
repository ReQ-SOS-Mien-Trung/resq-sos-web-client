export type RescuerType = "Volunteer" | "Core" | null;

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
}

export interface GetRescuersParams {
  pageNumber?: number;
  pageSize?: number;
  hasAssemblyPoint?: boolean;
  hasTeam?: boolean;
  rescuerType?: Exclude<RescuerType, null>;
  abilitySubgroupCode?: string;
  abilityCategoryCode?: string;
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
