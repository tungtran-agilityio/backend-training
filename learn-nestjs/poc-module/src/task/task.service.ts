import { Injectable } from '@nestjs/common';

@Injectable()
export class TaskService {
  // Define your service methods here
  getTasks() {
    return ['Task 1', 'Task 2', 'Task 3'];
  }

  getTaskById(id: number) {
    return `Task ${id}`;
  }

  createTask(title: string) {
    return `Task "${title}" created.`;
  }
}
