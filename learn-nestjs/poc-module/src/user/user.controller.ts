import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getUsers() {
    return this.userService.getUsers();
  }

  @Get(':id')
  getUserById(@Param('id') id: number) {
    return this.userService.getUserById(id);
  }

  @Post()
  createUser(@Body('name') name: string) {
    return this.userService.createUser(name);
  }

  @Get(':id/tasks')
  getTasksForUser(@Param('id') id: number) {
    return this.userService.getTasksForUser(id);
  }

  @Get(':id/tasks/:taskId')
  getTaskByIdForUser(@Param('id') id: number, @Param('taskId') taskId: number) {
    return this.userService.getTaskByIdForUser(id, taskId);
  }

  @Post(':id/tasks')
  createTaskForUser(@Param('id') id: number, @Body('title') title: string) {
    return this.userService.createTaskForUser(id, title);
  }
}
