import { Body, ConflictException, Controller, Post } from '@nestjs/common';
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
}
