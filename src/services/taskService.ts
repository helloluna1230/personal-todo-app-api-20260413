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
    return this.taskRepo.findById(id);
  }

  listTasks(): Task[] {
    return this.taskRepo.findAll();
  }

  /**
   * Updates a task.
   *
   * When `status` transitions to `DONE`:
   * - `completedAt` is set to the current time.
   * - Any pending reminder jobs are cancelled (AC-3).
   *
   * When `status` is explicitly set back to `TODO`:
   * - `completedAt` is cleared.
   *
   * The tasks main record is written only here; ReminderService writes only
   * to reminder_jobs (single-writer boundary).
   */
  updateTask(id: string, dto: UpdateTaskDto): Task | undefined {
    const task = this.taskRepo.findById(id);
    if (!task) return undefined;

    // Compute completedAt from the status transition.
    let completedAt: Date | undefined = task.completedAt;
    if (dto.status === 'DONE' && task.status !== 'DONE') {
      completedAt = new Date();
    } else if (dto.status === 'TODO') {
      completedAt = undefined;
    }

    // Strip undefined DTO fields so they don't clobber existing task values
    // when spread into the update payload.
    const cleanDto = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as Partial<UpdateTaskDto>;

    const updated = this.taskRepo.update(id, {
      ...cleanDto,
      completedAt,
      version: task.version + 1,
    });
    if (!updated) return undefined;

    // Cancel pending reminder jobs when the task is marked as done.
    if (dto.status === 'DONE') {
      this.reminderService.cancelReminderForTask(id);
    }

    return this.taskRepo.findById(id);
  }

  /**
   * Physically removes the task and cancels all associated reminder jobs.
   * Returns false when the task does not exist.
   */
  deleteTask(id: string): boolean {
    const task = this.taskRepo.findById(id);
    if (!task) return false;

    // Cancel reminder jobs before removing the task record so that
    // cancelReminderForTask can still verify the task exists.
    this.reminderService.cancelReminderForTask(id);

    return this.taskRepo.delete(id);
  }
}
