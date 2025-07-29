import { User } from 'generated/prisma';

/**
 * User data without sensitive fields like password
 */
export type AuthUserData = Omit<User, 'password'>;

/**
 * Response interface for successful login
 */
export interface LoginResponse {
  user: AuthUserData;
  accessToken: string;
}

/**
 * Response interface for successful sign-in from service
 */
export interface SignInResponse {
  user: AuthUserData;
  accessToken: string;
  refreshToken: string;
}

/**
 * Response interface for token refresh
 */
export interface RefreshTokenResponse {
  accessToken: string;
}

/**
 * Response interface for logout
 */
export interface LogoutResponse {
  message: string;
}
