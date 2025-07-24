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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  ApiServerErrorResponse,
  ApiUnauthorizedErrorResponse,
} from 'src/common/decorators/api-common.decorators';
import { ControllerUtils } from 'src/common/utils/controller.utils';
import {
  SafeUserData,
  UserData,
  DeleteUserResponse,
  ValidationResult,
} from './interfaces/user-response.interfaces';

@Controller({
  path: 'users',
  version: '1',
})
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
  async createUser(
    @Body() userCreateInput: CreateUserDto,
  ): Promise<SafeUserData> {
    await this.validateEmailNotExists(userCreateInput.email);
    return this.userService.createUser(userCreateInput);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedErrorResponse()
  @ApiNotFoundResponse({ description: 'User not found or inaccessible' })
  @ApiServerErrorResponse()
  @ApiOkResponse({ type: UserResponseDto })
  async getUser(@Param('id', ParseUUIDPipe) id: string): Promise<UserData> {
    const user = await this.userService.getUser({ id });

    if (!user) {
      throw new NotFoundException('User not found or inaccessible');
    }

    return user;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBadRequestResponse({ description: 'Invalid field value or format' })
  @ApiUnauthorizedErrorResponse()
  @ApiNotFoundResponse({
    description: 'User not found or not owned by requester',
  })
  @ApiServerErrorResponse()
  @ApiOkResponse({ type: UserResponseDto })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() userUpdateInput: UpdateUserDto,
    @Req() req: Request,
  ): Promise<SafeUserData> {
    const user = ControllerUtils.extractUserFromRequest(req);
    await this.validateUserOwnership(id, user.userId);

    // Check if email is already in use by another user
    if (userUpdateInput.email) {
      await this.validateEmailNotExists(userUpdateInput.email, id);
    }

    return this.userService.updateUser({ id }, userUpdateInput);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedErrorResponse()
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
  ): Promise<DeleteUserResponse> {
    const user = ControllerUtils.extractUserFromRequest(req);
    await this.validateUserOwnership(id, user.userId);

    await this.userService.deleteUser({ id });

    return { message: 'User deleted successfully' };
  }

  private async validateEmailNotExists(
    email: string,
    excludeUserId?: string,
  ): ValidationResult {
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
  ): Promise<UserData> {
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
