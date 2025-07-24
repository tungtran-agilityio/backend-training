import { ValidationPipe } from '@nestjs/common';
import { Request } from 'express';

// Common validation pipe with consistent settings
export const commonValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
});

// User extraction interfaces
export interface UserRequest {
  userId: string;
}

export interface UserWithEmail extends UserRequest {
  email: string;
}

// Common utility functions
export class ControllerUtils {
  /**
   * Extracts user from JWT request for basic user operations
   */
  static extractUserFromRequest(req: Request): UserRequest {
    return req.user as UserRequest;
  }

  /**
   * Extracts user with email from JWT request for auth operations
   */
  static extractUserWithEmailFromRequest(req: Request): UserWithEmail {
    return req.user as UserWithEmail;
  }
}
