import { ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import {
  UserRequest,
  UserWithEmail,
} from '../interfaces/common-response.interfaces';

// Common validation pipe with consistent settings
export const commonValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
});

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
