export interface ManagedDepotSummary {
  depotId: number;
  depotName: string;
  status: string;
  address: string;
  imageUrl?: string | null;
}

// Login Request Payload
export interface LoginPayload {
  username: string;
  password: string;
}

// Login Hook Options
export interface LoginHookOptions {
  onSuccess?: (data: LoginResponse) => void;
  onError?: (error: Error) => void;
  onUnauthorizedRole?: () => void; // Called when role is not allowed
}

// Login Response
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roleId: number;
  permissions: string[];
  managedDepots?: ManagedDepotSummary[];
  depotId?: number | null;
  depotName?: string | null;
}

// Logout Response
export interface LogoutResponse {
  success: boolean;
  message: string;
}

// Refresh Token Request Payload
export interface RefreshTokenPayload {
  accessToken: string;
  refreshToken: string;
}

// Refresh Token Response
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  permissions?: string[];
}
