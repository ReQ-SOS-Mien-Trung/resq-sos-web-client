// Login Request Payload
export interface LoginPayload {
  username: string;
  password: string;
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
