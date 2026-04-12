// User Me Response
export interface UserMeResponse {
  id: string;
  roleId: number;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  rescuerType: string | null;
  email: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  isEligibleRescuer: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rescuerApplicationDocuments: unknown[];
}

// User Entity
export interface UserEntity {
  id: string;
  roleId: number;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  email: string | null;
  rescuerType: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  isEligibleRescuer: boolean;
  isBanned: boolean;
  bannedBy: string | null;
  bannedAt: string | null;
  banReason: string | null;
  address: string | null;
  ward: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  abilities: unknown[];
  rescuerApplicationDocuments: unknown[];
}

// Admin user detail (/identity/admin/users/{userId})
export interface AdminUserAbilityEntity {
  abilityId: number;
  code: string;
  description: string;
  level: number;
  categoryCode: string;
}

export interface AdminUserRescuerApplicationDocumentEntity {
  id: number;
  applicationId: number;
  fileUrl: string;
  fileTypeId: number;
  fileTypeCode: string | null;
  fileTypeName: string | null;
  uploadedAt: string;
}

export interface RescuerScoreEntity {
  responseTimeScore: number;
  rescueEffectivenessScore: number;
  decisionHandlingScore: number;
  safetyMedicalSkillScore: number;
  teamworkCommunicationScore: number;
  overallAverageScore: number;
  evaluationCount: number;
}

export interface GetAdminUserByIdResponse {
  id: string;
  roleId: number;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  email: string | null;
  rescuerType: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  isEligibleRescuer: boolean;
  rescuerStep: number;
  isBanned: boolean;
  bannedBy: string | null;
  bannedAt: string | null;
  banReason: string | null;
  address: string | null;
  ward: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rescuerScore: RescuerScoreEntity | null;
  abilities: AdminUserAbilityEntity[];
  rescuerApplicationDocuments: AdminUserRescuerApplicationDocumentEntity[];
}

// Paginated Response for Users
export interface GetUsersResponse {
  items: UserEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query params for fetching users
export interface GetUsersParams {
  pageNumber?: number;
  pageSize?: number;
  roleId?: number;
  isBanned?: boolean;
  search?: string;
}

// Response for rescuers list
export interface GetRescuersResponse {
  items: UserEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query params for fetching rescuers
export interface GetRescuersParams {
  pageNumber?: number;
  pageSize?: number;
  isBanned?: boolean;
  search?: string;
}

// For permission assignment search
export interface GetUsersForPermissionParams {
  search?: string;
  pageSize?: number;
  roleId?: number;
}

export interface GetUsersForPermissionResponse {
  items: UserEntity[];
  totalCount: number;
}

export interface RoleMetadataOption {
  key: string;
  value: string;
}

export interface AdminUpdateUserRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  email?: string;
  rescuerType?: string;
  roleId?: number;
  avatarUrl?: string;
  address?: string;
  ward?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  isEmailVerified?: boolean;
  isOnboarded?: boolean;
  isEligibleRescuer?: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface BanUserRequest {
  reason: string;
}

export interface AdminCreateUserRequest {
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  password?: string;
  roleId: number;
  rescuerType?: string;
  avatarUrl?: string;
  address?: string;
  ward?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  isEmailVerified?: boolean;
  isOnboarded?: boolean;
  isEligibleRescuer?: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface AdminCreateUserResponse {
  id?: string;
  userId?: string;
}
