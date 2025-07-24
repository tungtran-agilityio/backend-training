import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

// Common decorators
const ApiServerErrorResponse = () =>
  ApiInternalServerErrorResponse({ description: 'Unexpected failure' });

interface UserWithDeletion {
  id: string;
  email: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Controller('users')
@ApiTags('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @ApiBadRequestResponse({
    description: 'Missing required fields or invalid input data',
  })
  @ApiConflictResponse({ description: 'Email already exists' })
  @ApiServerErrorResponse()
  @ApiCreatedResponse({ type: UserResponseDto })
  async createUser(@Body() userCreateInput: CreateUserDto) {
    await this.validateEmailNotExists(userCreateInput.email);
    return this.userService.createUser(userCreateInput);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'User not found or inaccessible' })
  @ApiServerErrorResponse()
  @ApiOkResponse({ type: UserResponseDto })
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userService.getUser({ id });

    if (!user) {
      throw new NotFoundException('User not found or inaccessible');
    }

    return user;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBadRequestResponse({ description: 'Invalid field value or format' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({
    description: 'User not found or not owned by requester',
  })
  @ApiServerErrorResponse()
  @ApiOkResponse({ type: UserResponseDto })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() userUpdateInput: UpdateUserDto,
    @Req() req: Request,
  ) {
    const user = this.extractUserFromRequest(req);
    await this.validateUserOwnership(id, user.userId);

    // Check if email is already in use by another user
    if (userUpdateInput.email) {
      await this.validateEmailNotExists(userUpdateInput.email, id);
    }

    return this.userService.updateUser({ id }, userUpdateInput);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({
    description: 'User not found or not owned by requester',
  })
  @ApiServerErrorResponse()
  @ApiOkResponse({
    schema: {
      example: {
        message: 'User deleted successfully',
      },
    },
  })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = this.extractUserFromRequest(req);
    await this.validateUserOwnership(id, user.userId);

    await this.userService.deleteUser({ id });

    return { message: 'User deleted successfully' };
  }

  private extractUserFromRequest(req: Request): { userId: string } {
    return req.user as { userId: string };
  }

  private async validateEmailNotExists(
    email: string,
    excludeUserId?: string,
  ): Promise<void> {
    const existingUser = await this.userService.getUser({ email });

    if (existingUser && (!excludeUserId || existingUser.id !== excludeUserId)) {
      throw new ConflictException(
        excludeUserId ? 'Email already in use' : 'User already exists',
      );
    }
  }

  private async validateUserOwnership(
    userId: string,
    requesterId: string,
  ): Promise<UserWithDeletion> {
    const existingUser = await this.userService.getUser({ id: userId });

    if (
      !existingUser ||
      existingUser.deletedAt !== null ||
      requesterId !== userId
    ) {
      throw new NotFoundException('User not found or not owned by requester');
    }

    return existingUser;
  }
}
