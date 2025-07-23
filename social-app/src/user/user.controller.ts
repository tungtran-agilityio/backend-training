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
import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserResponseDto } from 'src/common/dtos/user.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @ApiBadRequestResponse({
    description: 'Missing required fields or invalid input data',
  })
  @ApiConflictResponse({ description: 'Email already exists' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected failure during user registration',
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  async createUser(@Body() userCreateInput: CreateUserDto) {
    // get user by email
    const user = await this.userService.getUser({
      email: userCreateInput.email,
    });

    if (user) {
      throw new ConflictException('User already exists');
    }

    return this.userService.createUser(userCreateInput);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
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
  @ApiBadRequestResponse({
    description: 'Invalid field value or format',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid token',
  })
  @ApiNotFoundResponse({
    description: 'User not found or not owned by requester',
  })
  @ApiOkResponse({ type: UserResponseDto })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() userUpdateInput: UpdateUserDto,
    @Req() req: Request,
  ) {
    // check userid in access token
    const { userId } = req.user as { userId: string };
    const existingUser = await this.userService.getUser({ id });

    if (!existingUser || existingUser.deletedAt !== null || userId !== id) {
      throw new NotFoundException('User not found or not owned by requester');
    }

    // check if email is already in use
    if (userUpdateInput.email) {
      const existingUserWithEmail = await this.userService.getUser({
        email: userUpdateInput.email,
      });
      if (existingUserWithEmail && existingUserWithEmail.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    return this.userService.updateUser({ id }, userUpdateInput);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid token',
  })
  @ApiNotFoundResponse({
    description: 'User not found or not owned by requester',
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected failure',
  })
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
    const { userId } = req.user as { userId: string };
    const existingUser = await this.userService.getUser({ id });

    if (!existingUser || existingUser.deletedAt !== null || userId !== id) {
      throw new NotFoundException('User not found or not owned by requester');
    }

    await this.userService.deleteUser({ id });

    return { message: 'User deleted successfully' };
  }
}
