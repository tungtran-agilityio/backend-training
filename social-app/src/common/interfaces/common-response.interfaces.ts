/**
 * Strategy validation payload interface
 */
export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * User data extracted from JWT token
 */
export interface ValidatedUser {
  userId: string;
  email: string;
}

/**
 * Basic user information for request extraction
 */
export interface UserRequest {
  userId: string;
}

/**
 * User with email information for request extraction
 */
export interface UserWithEmail extends UserRequest {
  email: string;
}

/**
 * API decorator return types
 */
export type ApiDecoratorFunction = () => MethodDecorator;
export type ApiDecoratorArray = () => MethodDecorator[];
export type ApiDecoratorWithDescription = (
  description?: string,
) => MethodDecorator;
