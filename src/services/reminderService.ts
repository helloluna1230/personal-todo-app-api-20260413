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
   * - If the task does not exist → throws `TASK_NOT_FOUND`.
   * - If `remindAt` is after `dueAt` → throws `REMIND_AFTER_DUE`.
   * - If OS notification permission is not granted → creates a
   *   `permission_denied` job so the client can surface "pending
   *   authorization" UI rather than treating this as a hard error.
   * - Otherwise → creates a `scheduled` job.
   *
   * @throws {ReminderError} TASK_NOT_FOUND  – task does not exist
   * @throws {ReminderError} REMIND_AFTER_DUE – remindAt is after dueAt
   */
  setReminder(taskId: string, remindAt: Date): ReminderJob {
    const task = this.taskRepo.findById(taskId);
    if (!task) {
      throw new ReminderError('任务不存在。', 'TASK_NOT_FOUND');
    }

    if (task.dueAt && remindAt > task.dueAt) {
      throw new ReminderError(
        '提醒时间必须早于或等于截止时间。',
        'REMIND_AFTER_DUE',
      );
    }

    // When permission is not granted, record the reminder intent as
    // 'permission_denied' rather than rejecting the request outright.
    // The client should display an authorization prompt and, once
    // permission is granted, call this endpoint again to upgrade to
    // 'scheduled'.
    const initialStatus = this.permissionService.isGranted()
      ? 'scheduled'
      : 'permission_denied';

    return this.reminderJobRepo.upsert(taskId, remindAt, initialStatus);
  }

  /**
   * Returns the active reminder job (scheduled or permission_denied) for a
   * task, or undefined when none exists.
   */
  getReminderForTask(taskId: string): ReminderJob | undefined {
    return this.reminderJobRepo.findActiveByTaskId(taskId);
  }

  /**
   * Cancels all scheduled / permission_denied reminder jobs for a task.
   * No-ops when there are no active jobs.
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
