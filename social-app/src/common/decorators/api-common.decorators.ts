import { UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';

// Common API response decorators
export const ApiServerErrorResponse = () =>
  ApiInternalServerErrorResponse({ description: 'Unexpected server failure' });

export const ApiUnauthorizedErrorResponse = () =>
  ApiUnauthorizedResponse({ description: 'Missing or invalid token' });

// Combined decorator for JWT-protected endpoints
export const ApiJwtAuth = () => [
  UseGuards(JwtAuthGuard),
  ApiBearerAuth(),
  ApiUnauthorizedErrorResponse(),
];

// Decorator factory for consistent internal server error responses
export const ApiInternalError = (description?: string) =>
  ApiInternalServerErrorResponse({
    description: description || 'Unexpected server failure',
  });
