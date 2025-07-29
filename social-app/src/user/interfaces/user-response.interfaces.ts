import { User } from 'generated/prisma';

/**
 * Full user data from database
 */
export type UserData = User;

/**
 * User data without sensitive fields (password, deletedAt)
 */
export type SafeUserData = Omit<User, 'password' | 'deletedAt'>;

/**
 * Minimal user data for deletion response
 */
export type MinimalUserData = Omit<
  User,
  'password' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

/**
 * Parameters interface for getting users
 */
export interface GetUsersParams {
  skip?: number;
  take?: number;
  cursor?: { id: string } | { email: string };
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

/**
 * Create user input interface
 */
export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

/**
 * Update user input interface
 */
export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}

/**
 * Response interface for user deletion
 */
export interface DeleteUserResponse {
  message: string;
}

/**
 * Validation result interface
 */
export type ValidationResult = Promise<void>;
