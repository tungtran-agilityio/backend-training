import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseFilters,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { HttpExceptionFilter } from 'src/exception/http-exception.filter';

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  getTasks() {
    return this.taskService.getTasks();
  }

  @Get(':id')
  getTaskById(@Param('id') id: number) {
    return this.taskService.getTaskById(id);
  }

  @Post()
  createTask(@Body('title') title: string) {
    return this.taskService.createTask(title);
  }

  @UseFilters(new HttpExceptionFilter())
  @Get('error/protected')
  getProtected() {
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }
}
