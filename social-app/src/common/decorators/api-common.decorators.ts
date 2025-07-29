import { UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  ApiDecoratorFunction,
  ApiDecoratorArray,
  ApiDecoratorWithDescription,
} from '../interfaces/common-response.interfaces';

// Common API response decorators
export const ApiServerErrorResponse: ApiDecoratorFunction = () =>
  ApiInternalServerErrorResponse({ description: 'Unexpected server failure' });

export const ApiUnauthorizedErrorResponse: ApiDecoratorFunction = () =>
  ApiUnauthorizedResponse({ description: 'Missing or invalid token' });

// Combined decorator for JWT-protected endpoints
export const ApiJwtAuth: ApiDecoratorArray = () => [
  UseGuards(JwtAuthGuard),
  ApiBearerAuth(),
  ApiUnauthorizedErrorResponse(),
];

// Decorator factory for consistent internal server error responses
export const ApiInternalError: ApiDecoratorWithDescription = (
  description?: string,
) =>
  ApiInternalServerErrorResponse({
    description: description || 'Unexpected server failure',
  });
