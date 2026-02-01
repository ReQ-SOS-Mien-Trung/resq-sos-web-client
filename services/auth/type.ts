// Login Request Payload
export interface LoginPayload {
  username: string;
  password: string;
}

// Google Login Request Payload
export interface GoogleLoginPayload {
  idToken: string;
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
  fullName: string;
  roleId: number;
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
}
