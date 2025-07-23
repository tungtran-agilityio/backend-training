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

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
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
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userService.getUser({ id });

    if (!user) {
      throw new NotFoundException('User not found or inaccessible');
    }

    return user;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
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
