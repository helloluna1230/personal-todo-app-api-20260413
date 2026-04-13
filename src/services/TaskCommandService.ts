import { TaskRepository } from '../repositories/TaskRepository';
import { ReminderConfigRepository } from '../repositories/ReminderConfigRepository';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class TaskCommandService {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly reminderRepo: ReminderConfigRepository,
  ) {}

  deleteTask(taskId: string): void {
    const task = this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundError(`Task not found: ${taskId}`);
    }
    // Atomically remove the task record and all associated reminder configs
    this.reminderRepo.deleteByTaskId(taskId);
    this.taskRepo.delete(taskId);
  }
}
