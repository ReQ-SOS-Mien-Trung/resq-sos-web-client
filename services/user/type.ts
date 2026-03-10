// User Me Response
export interface UserMeResponse {
  id: string;
  roleId: number;
  fullName: string;
  username: string;
  phone: string;
  rescuerType: string | null;
  email: string | null;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  isEligibleRescuer: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
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
  createdAt: string;
  updatedAt: string;
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
}
