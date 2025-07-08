import { Injectable } from '@nestjs/common';
import { TaskService } from '../task/task.service';

@Injectable()
export class UserService {
  constructor(private readonly taskService: TaskService) {}

  // Define your service methods here
  getUsers() {
    return ['User 1', 'User 2', 'User 3'];
  }

  getUserById(id: number) {
    return `User ${id}`;
  }
  createUser(name: string) {
    return `User "${name}" created.`;
  }
  getTasksForUser(userId: number) {
    return this.taskService
      .getTasks()
      .map((task) => `${task} for User ${userId}`);
  }
  getTaskByIdForUser(userId: number, taskId: number) {
    return this.taskService.getTaskById(taskId) + ` for User ${userId}`;
  }
  createTaskForUser(userId: number, title: string) {
    return this.taskService.createTask(title) + ` for User ${userId}`;
  }
}
