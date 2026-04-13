import { Task, CreateTaskDto, UpdateTaskDto } from '../models/task';
import { TaskRepository } from '../repositories/taskRepository';
import { ReminderService } from './reminderService';

export class TaskService {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly reminderService: ReminderService,
  ) {}

  createTask(dto: CreateTaskDto): Task {
    return this.taskRepo.create(dto);
  }

  getTask(id: string): Task | undefined {
    const task = this.taskRepo.findById(id);
    return task && !task.isDeleted ? task : undefined;
  }

  listTasks(): Task[] {
    return this.taskRepo.findAll();
  }

  /**
   * Updates a task.
   * When a task is completed or soft-deleted any pending reminder is
   * automatically cancelled (acceptance criterion AC-3).
   */
  updateTask(id: string, dto: UpdateTaskDto): Task | undefined {
    const task = this.taskRepo.findById(id);
    if (!task || task.isDeleted) return undefined;

    const updated = this.taskRepo.update(id, dto);
    if (!updated) return undefined;

    // Cancel any pending reminder when the task is completed or deleted.
    if ((dto.isCompleted || dto.isDeleted) && updated.remindAt) {
      this.reminderService.cancelReminder(id);
    }

    // Return the latest snapshot after potential reminder clearance.
    return this.taskRepo.findById(id);
  }
}
