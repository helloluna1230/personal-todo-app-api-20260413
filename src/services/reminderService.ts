import { ReminderJob } from '../models/reminderJob';
import { TaskRepository } from '../repositories/taskRepository';
import { ReminderJobRepository } from '../repositories/reminderJobRepository';
import { NotificationPermissionService } from './notificationPermissionService';

export class ReminderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ReminderError';
  }
}

/**
 * Owns the reminder-scheduling concern.
 *
 * Single-writer contract: this service writes ONLY to `ReminderJobRepository`
 * (the `reminder_jobs` projection).  It reads the `tasks` record for
 * validation but never mutates it.
 */
export class ReminderService {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly reminderJobRepo: ReminderJobRepository,
    private readonly permissionService: NotificationPermissionService,
  ) {}

  /**
   * Registers a reminder job for a task.
   *
   * Rules:
   * 1. Notification permission must be granted.
   * 2. remindAt must be <= dueAt when dueAt is present on the task.
   *
   * @throws {ReminderError} PERMISSION_REQUIRED – permission not granted
   * @throws {ReminderError} TASK_NOT_FOUND     – task does not exist or is deleted
   * @throws {ReminderError} REMIND_AFTER_DUE   – remindAt is after dueAt
   */
  setReminder(taskId: string, remindAt: Date): ReminderJob {
    if (!this.permissionService.isGranted()) {
      throw new ReminderError(
        '通知权限未开启，请先授权后再设置提醒。',
        'PERMISSION_REQUIRED',
      );
    }

    const task = this.taskRepo.findById(taskId);
    if (!task || task.isDeleted) {
      throw new ReminderError('任务不存在或已删除。', 'TASK_NOT_FOUND');
    }

    if (task.dueAt && remindAt > task.dueAt) {
      throw new ReminderError(
        '提醒时间必须早于或等于截止时间。',
        'REMIND_AFTER_DUE',
      );
    }

    // Write only to the reminder_jobs projection – tasks table is untouched.
    return this.reminderJobRepo.upsert(taskId, remindAt);
  }

  /**
   * Returns the active reminder job for a task, or undefined when none exists.
   */
  getReminderForTask(taskId: string): ReminderJob | undefined {
    return this.reminderJobRepo.findActiveByTaskId(taskId);
  }

  /**
   * Cancels all scheduled reminder jobs for a task.
   * No-ops when there is no active job.
   *
   * @throws {ReminderError} TASK_NOT_FOUND – task does not exist
   */
  cancelReminderForTask(taskId: string): void {
    const task = this.taskRepo.findById(taskId);
    if (!task) {
      throw new ReminderError('任务不存在。', 'TASK_NOT_FOUND');
    }

    // Cancel within the reminder_jobs projection only.
    this.reminderJobRepo.cancelByTaskId(taskId);
  }
}
