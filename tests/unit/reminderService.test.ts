import { TaskRepository } from '../../src/repositories/taskRepository';
import { ReminderJobRepository } from '../../src/repositories/reminderJobRepository';
import { NotificationPermissionRepository } from '../../src/repositories/notificationPermissionRepository';
import { NotificationPermissionService } from '../../src/services/notificationPermissionService';
import { ReminderService, ReminderError } from '../../src/services/reminderService';
import { TaskService } from '../../src/services/taskService';

function buildDependencies() {
  const taskRepo = new TaskRepository();
  const reminderJobRepo = new ReminderJobRepository();
  const permissionRepo = new NotificationPermissionRepository();
  const permissionService = new NotificationPermissionService(permissionRepo);
  const reminderService = new ReminderService(taskRepo, reminderJobRepo, permissionService);
  const taskService = new TaskService(taskRepo, reminderService);
  return { taskRepo, reminderJobRepo, permissionRepo, permissionService, reminderService, taskService };
}

describe('ReminderService – unit tests', () => {
  describe('setReminder', () => {
    it('throws PERMISSION_REQUIRED when notification permission is not granted', () => {
      const { taskRepo, reminderService } = buildDependencies();
      // permissionService defaults to 'undetermined'
      const task = taskRepo.create({ title: 'Test task' });

      expect(() => reminderService.setReminder(task.id, new Date())).toThrow(
        expect.objectContaining({ code: 'PERMISSION_REQUIRED' }),
      );
    });

    it('throws TASK_NOT_FOUND when the task does not exist', () => {
      const { permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');

      expect(() => reminderService.setReminder('non-existent-id', new Date())).toThrow(
        expect.objectContaining({ code: 'TASK_NOT_FOUND' }),
      );
    });

    it('throws TASK_NOT_FOUND when the task is soft-deleted', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const task = taskRepo.create({ title: 'Deleted task' });
      taskRepo.update(task.id, { isDeleted: true });

      expect(() => reminderService.setReminder(task.id, new Date())).toThrow(
        expect.objectContaining({ code: 'TASK_NOT_FOUND' }),
      );
    });

    it('throws REMIND_AFTER_DUE when remindAt is after dueAt', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const dueAt = new Date('2026-06-01T12:00:00Z');
      const task = taskRepo.create({ title: 'Task with due date', dueAt });

      const remindAt = new Date('2026-06-01T13:00:00Z'); // 1 hour after dueAt
      expect(() => reminderService.setReminder(task.id, remindAt)).toThrow(
        expect.objectContaining({ code: 'REMIND_AFTER_DUE' }),
      );
    });

    it('returns a ReminderJob (not a Task) when remindAt equals dueAt', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const dueAt = new Date('2026-06-01T12:00:00Z');
      const task = taskRepo.create({ title: 'Task', dueAt });

      const job = reminderService.setReminder(task.id, dueAt);
      expect(job.taskId).toBe(task.id);
      expect(job.remindAt).toEqual(dueAt);
      expect(job.status).toBe('scheduled');
    });

    it('returns a ReminderJob when remindAt is before dueAt', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const dueAt = new Date('2026-06-01T12:00:00Z');
      const remindAt = new Date('2026-06-01T11:00:00Z');
      const task = taskRepo.create({ title: 'Task', dueAt });

      const job = reminderService.setReminder(task.id, remindAt);
      expect(job.remindAt).toEqual(remindAt);
      expect(job.status).toBe('scheduled');
    });

    it('returns a ReminderJob when the task has no dueAt', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const task = taskRepo.create({ title: 'No-due-date task' });
      const remindAt = new Date('2026-06-01T09:00:00Z');

      const job = reminderService.setReminder(task.id, remindAt);
      expect(job.remindAt).toEqual(remindAt);
      expect(job.status).toBe('scheduled');
    });

    it('does NOT mutate the tasks record (single-writer boundary)', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const task = taskRepo.create({ title: 'Task' });
      const remindAt = new Date('2026-06-01T09:00:00Z');

      reminderService.setReminder(task.id, remindAt);

      // The task record must remain unchanged – no remindAt field on it.
      const storedTask = taskRepo.findById(task.id)!;
      expect(storedTask).not.toHaveProperty('remindAt');
    });

    it('replaces a previous scheduled job when called again (upsert behaviour)', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const task = taskRepo.create({ title: 'Task' });
      const first = new Date('2026-06-01T08:00:00Z');
      const second = new Date('2026-06-01T09:00:00Z');

      reminderService.setReminder(task.id, first);
      const latest = reminderService.setReminder(task.id, second);

      expect(latest.remindAt).toEqual(second);
      expect(latest.status).toBe('scheduled');
      // Previous job should no longer be active.
      const active = reminderService.getReminderForTask(task.id);
      expect(active?.remindAt).toEqual(second);
    });
  });

  describe('cancelReminderForTask', () => {
    it('cancels the active reminder job without touching the task record', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const task = taskRepo.create({ title: 'Task' });
      reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

      reminderService.cancelReminderForTask(task.id);

      expect(reminderService.getReminderForTask(task.id)).toBeUndefined();
      // The task itself must be unchanged.
      const storedTask = taskRepo.findById(task.id)!;
      expect(storedTask).not.toHaveProperty('remindAt');
    });

    it('is a no-op when the task has no active reminder', () => {
      const { taskRepo, reminderService } = buildDependencies();
      const task = taskRepo.create({ title: 'Task without reminder' });

      expect(() => reminderService.cancelReminderForTask(task.id)).not.toThrow();
    });

    it('throws TASK_NOT_FOUND when the task does not exist', () => {
      const { reminderService } = buildDependencies();

      expect(() => reminderService.cancelReminderForTask('ghost-id')).toThrow(
        expect.objectContaining({ code: 'TASK_NOT_FOUND' }),
      );
    });
  });

  describe('getReminderForTask', () => {
    it('returns undefined when no reminder has been set', () => {
      const { taskRepo, reminderService } = buildDependencies();
      const task = taskRepo.create({ title: 'Task' });

      expect(reminderService.getReminderForTask(task.id)).toBeUndefined();
    });

    it('returns the active reminder job', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const task = taskRepo.create({ title: 'Task' });
      const remindAt = new Date('2026-06-01T09:00:00Z');
      reminderService.setReminder(task.id, remindAt);

      const job = reminderService.getReminderForTask(task.id);
      expect(job?.remindAt).toEqual(remindAt);
      expect(job?.status).toBe('scheduled');
    });
  });
});

describe('TaskService – reminder cancellation on state change (AC-3)', () => {
  it('cancels reminder job automatically when task is completed', () => {
    const { taskRepo, permissionService, reminderService, taskService } = buildDependencies();
    permissionService.updatePermission('granted');
    const task = taskRepo.create({ title: 'Task to complete' });
    reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

    taskService.updateTask(task.id, { isCompleted: true });

    // The reminder job must be cancelled in the reminder_jobs projection.
    expect(reminderService.getReminderForTask(task.id)).toBeUndefined();
    // The task record must remain intact (single-writer boundary).
    const storedTask = taskRepo.findById(task.id)!;
    expect(storedTask.isCompleted).toBe(true);
  });

  it('cancels reminder job automatically when task is soft-deleted', () => {
    const { taskRepo, permissionService, reminderService, taskService } = buildDependencies();
    permissionService.updatePermission('granted');
    const task = taskRepo.create({ title: 'Task to delete' });
    reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

    taskService.updateTask(task.id, { isDeleted: true });

    expect(reminderService.getReminderForTask(task.id)).toBeUndefined();
  });

  it('does not cancel reminder job when only title is updated', () => {
    const { taskRepo, permissionService, reminderService, taskService } = buildDependencies();
    permissionService.updatePermission('granted');
    const remindAt = new Date('2026-06-01T09:00:00Z');
    const task = taskRepo.create({ title: 'Old title' });
    reminderService.setReminder(task.id, remindAt);

    taskService.updateTask(task.id, { title: 'New title' });

    const active = reminderService.getReminderForTask(task.id);
    expect(active?.remindAt).toEqual(remindAt);
    expect(active?.status).toBe('scheduled');
  });
});

describe('ReminderError', () => {
  it('is an instance of Error with the correct code', () => {
    const err = new ReminderError('msg', 'TEST_CODE');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('msg');
    expect(err.name).toBe('ReminderError');
  });
});
