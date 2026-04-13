import { TaskRepository } from '../../src/repositories/taskRepository';
import { NotificationPermissionRepository } from '../../src/repositories/notificationPermissionRepository';
import { NotificationPermissionService } from '../../src/services/notificationPermissionService';
import { ReminderService, ReminderError } from '../../src/services/reminderService';
import { TaskService } from '../../src/services/taskService';

function buildDependencies() {
  const taskRepo = new TaskRepository();
  const permissionRepo = new NotificationPermissionRepository();
  const permissionService = new NotificationPermissionService(permissionRepo);
  const reminderService = new ReminderService(taskRepo, permissionService);
  const taskService = new TaskService(taskRepo, reminderService);
  return { taskRepo, permissionRepo, permissionService, reminderService, taskService };
}

describe('ReminderService – unit tests', () => {
  describe('setReminder', () => {
    it('throws PERMISSION_REQUIRED when notification permission is not granted', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
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

    it('sets the reminder when remindAt equals dueAt', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const dueAt = new Date('2026-06-01T12:00:00Z');
      const task = taskRepo.create({ title: 'Task', dueAt });

      const updated = reminderService.setReminder(task.id, dueAt);
      expect(updated.remindAt).toEqual(dueAt);
    });

    it('sets the reminder when remindAt is before dueAt', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const dueAt = new Date('2026-06-01T12:00:00Z');
      const remindAt = new Date('2026-06-01T11:00:00Z');
      const task = taskRepo.create({ title: 'Task', dueAt });

      const updated = reminderService.setReminder(task.id, remindAt);
      expect(updated.remindAt).toEqual(remindAt);
    });

    it('sets the reminder when the task has no dueAt', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const task = taskRepo.create({ title: 'No-due-date task' });
      const remindAt = new Date('2026-06-01T09:00:00Z');

      const updated = reminderService.setReminder(task.id, remindAt);
      expect(updated.remindAt).toEqual(remindAt);
    });
  });

  describe('cancelReminder', () => {
    it('clears remindAt on the task', () => {
      const { taskRepo, permissionService, reminderService } = buildDependencies();
      permissionService.updatePermission('granted');
      const task = taskRepo.create({ title: 'Task' });
      reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

      const updated = reminderService.cancelReminder(task.id);
      expect(updated.remindAt).toBeUndefined();
    });

    it('is a no-op (does not throw) when the task has no reminder', () => {
      const { taskRepo, reminderService } = buildDependencies();
      const task = taskRepo.create({ title: 'Task without reminder' });

      expect(() => reminderService.cancelReminder(task.id)).not.toThrow();
    });

    it('throws TASK_NOT_FOUND when the task does not exist', () => {
      const { reminderService } = buildDependencies();

      expect(() => reminderService.cancelReminder('ghost-id')).toThrow(
        expect.objectContaining({ code: 'TASK_NOT_FOUND' }),
      );
    });
  });
});

describe('TaskService – reminder cancellation on state change', () => {
  it('cancels reminder automatically when task is completed (AC-3)', () => {
    const { taskRepo, permissionService, taskService } = buildDependencies();
    permissionService.updatePermission('granted');
    const task = taskRepo.create({ title: 'Task to complete' });
    taskRepo.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

    const updated = taskService.updateTask(task.id, { isCompleted: true });
    expect(updated?.isCompleted).toBe(true);
    expect(updated?.remindAt).toBeUndefined();
  });

  it('cancels reminder automatically when task is soft-deleted', () => {
    const { taskRepo, permissionService, taskService } = buildDependencies();
    permissionService.updatePermission('granted');
    const task = taskRepo.create({ title: 'Task to delete' });
    taskRepo.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

    const updated = taskService.updateTask(task.id, { isDeleted: true });
    expect(updated?.isDeleted).toBe(true);
    expect(updated?.remindAt).toBeUndefined();
  });

  it('does not alter remindAt when only title is updated', () => {
    const { taskRepo, permissionService, taskService } = buildDependencies();
    permissionService.updatePermission('granted');
    const remindAt = new Date('2026-06-01T09:00:00Z');
    const task = taskRepo.create({ title: 'Old title' });
    taskRepo.setReminder(task.id, remindAt);

    const updated = taskService.updateTask(task.id, { title: 'New title' });
    expect(updated?.title).toBe('New title');
    expect(updated?.remindAt).toEqual(remindAt);
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
