import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UsePipes,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserBaseDto, createUserBaseSchema } from './user.dto';
import { ZodValidationPipe } from 'src/common/common.pipe';

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
  @UsePipes(new ZodValidationPipe(createUserBaseSchema))
  createUser(@Body() createUserBaseDto: CreateUserBaseDto) {
    return this.userService.createUser(createUserBaseDto);
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
