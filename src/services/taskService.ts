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
   * When a task is completed or soft-deleted any pending reminder jobs are
   * automatically cancelled in the reminder_jobs projection (AC-3).
   * The tasks main record is written only here; ReminderService writes only
   * to reminder_jobs (single-writer boundary).
   */
  updateTask(id: string, dto: UpdateTaskDto): Task | undefined {
    const task = this.taskRepo.findById(id);
    if (!task || task.isDeleted) return undefined;

    const updated = this.taskRepo.update(id, dto);
    if (!updated) return undefined;

    // When a task is completed or deleted, cancel pending reminder jobs.
    if (dto.isCompleted || dto.isDeleted) {
      this.reminderService.cancelReminderForTask(id);
    }

    return this.taskRepo.findById(id);
  }
}
