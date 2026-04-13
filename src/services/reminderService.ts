import { Task } from '../models/task';
import { TaskRepository } from '../repositories/taskRepository';
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

export class ReminderService {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly permissionService: NotificationPermissionService,
  ) {}

  /**
   * Sets a reminder for a task.
   *
   * Rules:
   * 1. Notification permission must be granted.
   * 2. remindAt must be <= dueAt when a dueAt is present on the task.
   *
   * @throws {ReminderError} PERMISSION_REQUIRED – permission not granted
   * @throws {ReminderError} TASK_NOT_FOUND – task does not exist or is deleted
   * @throws {ReminderError} REMIND_AFTER_DUE – remindAt is after dueAt
   */
  setReminder(taskId: string, remindAt: Date): Task {
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

    const updated = this.taskRepo.setReminder(taskId, remindAt);
    // In a real implementation a local/push notification would be scheduled
    // here (e.g. via expo-notifications on the mobile client or a job queue).
    return updated!;
  }

  /**
   * Cancels the reminder for a task (e.g. after completion or deletion).
   * No-ops when the task has no active reminder.
   *
   * @throws {ReminderError} TASK_NOT_FOUND – task does not exist
   */
  cancelReminder(taskId: string): Task {
    const task = this.taskRepo.findById(taskId);
    if (!task) {
      throw new ReminderError('任务不存在。', 'TASK_NOT_FOUND');
    }

    const updated = this.taskRepo.clearReminder(taskId);
    // In a real implementation any scheduled notification would be cancelled
    // here via the notification system's cancellation API.
    return updated!;
  }
}
