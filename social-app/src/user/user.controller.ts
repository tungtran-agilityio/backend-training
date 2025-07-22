import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';

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
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userService.getUser({ id });

    if (!user) {
      throw new NotFoundException('User not found or inaccessible');
    }

    return user;
  }
}
