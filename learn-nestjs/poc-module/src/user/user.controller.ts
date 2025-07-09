import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getUsers() {
    return this.userService.getUsers();
  }

  @Get(':id')
  getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }

  @Post()
  createUser(@Body('name') name: string) {
    return this.userService.createUser(name);
  }

  @Get(':id/tasks')
  getTasksForUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getTasksForUser(id);
  }

  @Get(':id/tasks/:taskId')
  getTaskByIdForUser(
    @Param('id', ParseIntPipe) id: number,
    @Param('taskId') taskId: number,
  ) {
    return this.userService.getTaskByIdForUser(id, taskId);
  }

  @Post(':id/tasks')
  createTaskForUser(
    @Param('id', ParseIntPipe) id: number,
    @Body('title') title: string,
  ) {
    return this.userService.createTaskForUser(id, title);
  }
}
