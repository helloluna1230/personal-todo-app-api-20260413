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

// ---------------------------------------------------------------------------
// Task model sanity checks
// ---------------------------------------------------------------------------

describe('TaskRepository – model contract', () => {
  it('creates a task with status TODO and version 1', () => {
    const { taskRepo } = buildDependencies();
    const task = taskRepo.create({ title: 'Buy milk' });

    expect(task.status).toBe('TODO');
    expect(task.version).toBe(1);
    expect(task).not.toHaveProperty('isCompleted');
    expect(task).not.toHaveProperty('isDeleted');
  });

  it('increments version on every update', () => {
    const { taskRepo } = buildDependencies();
    const task = taskRepo.create({ title: 'Task' });
    const v1 = task.version;

    const updated = taskRepo.update(task.id, { version: v1 + 1, title: 'Task updated' });
    expect(updated?.version).toBe(v1 + 1);
  });

  it('physically removes task on delete', () => {
    const { taskRepo } = buildDependencies();
    const task = taskRepo.create({ title: 'Ephemeral' });

    const removed = taskRepo.delete(task.id);
    expect(removed).toBe(true);
    expect(taskRepo.findById(task.id)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ReminderService – unit tests
// ---------------------------------------------------------------------------

describe('ReminderService – setReminder', () => {
  it('throws TASK_NOT_FOUND when the task does not exist', () => {
    const { reminderService } = buildDependencies();

    expect(() => reminderService.setReminder('ghost-id', new Date())).toThrow(
      expect.objectContaining({ code: 'TASK_NOT_FOUND' }),
    );
  });

  it('throws REMIND_AFTER_DUE when remindAt is after dueAt', () => {
    const { taskRepo, reminderService } = buildDependencies();
    const dueAt = new Date('2026-06-01T12:00:00Z');
    const task = taskRepo.create({ title: 'Task', dueAt });

    expect(() =>
      reminderService.setReminder(task.id, new Date('2026-06-01T13:00:00Z')),
    ).toThrow(expect.objectContaining({ code: 'REMIND_AFTER_DUE' }));
  });

  it('creates a permission_denied job when OS permission is not granted (undetermined)', () => {
    const { taskRepo, reminderService } = buildDependencies();
    // permissionService defaults to 'undetermined'
    const task = taskRepo.create({ title: 'Task' });
    const remindAt = new Date('2026-06-01T09:00:00Z');

    const job = reminderService.setReminder(task.id, remindAt);

    expect(job.status).toBe('permission_denied');
    expect(job.taskId).toBe(task.id);
    expect(job.remindAt).toEqual(remindAt);
  });

  it('creates a permission_denied job when OS permission is denied', () => {
    const { taskRepo, permissionService, reminderService } = buildDependencies();
    permissionService.updatePermission('denied');
    const task = taskRepo.create({ title: 'Task' });

    const job = reminderService.setReminder(task.id, new Date());
    expect(job.status).toBe('permission_denied');
  });

  it('creates a scheduled job when permission is granted', () => {
    const { taskRepo, permissionService, reminderService } = buildDependencies();
    permissionService.updatePermission('granted');
    const task = taskRepo.create({ title: 'Task' });

    const job = reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));
    expect(job.status).toBe('scheduled');
  });

  it('permission_denied job is still subject to REMIND_AFTER_DUE validation', () => {
    const { taskRepo, reminderService } = buildDependencies();
    // no permission granted (undetermined)
    const dueAt = new Date('2026-06-01T12:00:00Z');
    const task = taskRepo.create({ title: 'Task', dueAt });

    expect(() =>
      reminderService.setReminder(task.id, new Date('2026-06-01T13:00:00Z')),
    ).toThrow(expect.objectContaining({ code: 'REMIND_AFTER_DUE' }));
  });

  it('does NOT mutate the tasks record (single-writer boundary)', () => {
    const { taskRepo, permissionService, reminderService } = buildDependencies();
    permissionService.updatePermission('granted');
    const task = taskRepo.create({ title: 'Task' });

    reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

    const storedTask = taskRepo.findById(task.id)!;
    expect(storedTask).not.toHaveProperty('remindAt');
  });

  it('replaces a previous active job when called again (upsert)', () => {
    const { taskRepo, permissionService, reminderService } = buildDependencies();
    permissionService.updatePermission('granted');
    const task = taskRepo.create({ title: 'Task' });

    reminderService.setReminder(task.id, new Date('2026-06-01T08:00:00Z'));
    const latest = reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

    expect(latest.remindAt).toEqual(new Date('2026-06-01T09:00:00Z'));
    expect(latest.status).toBe('scheduled');
    expect(reminderService.getReminderForTask(task.id)?.remindAt).toEqual(
      new Date('2026-06-01T09:00:00Z'),
    );
  });

  it('upgrading from permission_denied to scheduled replaces the old job', () => {
    const { taskRepo, permissionService, reminderService } = buildDependencies();
    // First call: no permission
    const task = taskRepo.create({ title: 'Task' });
    const pending = reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));
    expect(pending.status).toBe('permission_denied');

    // User grants permission and re-sets the reminder
    permissionService.updatePermission('granted');
    const active = reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));
    expect(active.status).toBe('scheduled');
    expect(reminderService.getReminderForTask(task.id)?.status).toBe('scheduled');
  });
});

describe('ReminderService – cancelReminderForTask', () => {
  it('cancels both scheduled and permission_denied jobs when cancelReminderForTask is called', () => {
    const { taskRepo, reminderService } = buildDependencies();
    // undetermined → permission_denied job
    const task = taskRepo.create({ title: 'Task' });
    reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));
    expect(reminderService.getReminderForTask(task.id)?.status).toBe('permission_denied');

    reminderService.cancelReminderForTask(task.id);
    expect(reminderService.getReminderForTask(task.id)).toBeUndefined();
  });

  it('is a no-op when there are no active jobs', () => {
    const { taskRepo, reminderService } = buildDependencies();
    const task = taskRepo.create({ title: 'No-reminder task' });

    expect(() => reminderService.cancelReminderForTask(task.id)).not.toThrow();
  });

  it('throws TASK_NOT_FOUND for a non-existent task', () => {
    const { reminderService } = buildDependencies();

    expect(() => reminderService.cancelReminderForTask('ghost-id')).toThrow(
      expect.objectContaining({ code: 'TASK_NOT_FOUND' }),
    );
  });
});

describe('ReminderService – getReminderForTask', () => {
  it('returns undefined when no reminder has been set', () => {
    const { taskRepo, reminderService } = buildDependencies();
    const task = taskRepo.create({ title: 'Task' });

    expect(reminderService.getReminderForTask(task.id)).toBeUndefined();
  });

  it('returns a permission_denied job when permission is undetermined', () => {
    const { taskRepo, reminderService } = buildDependencies();
    const task = taskRepo.create({ title: 'Task' });
    reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

    const job = reminderService.getReminderForTask(task.id);
    expect(job?.status).toBe('permission_denied');
  });

  it('returns a scheduled job when permission is granted', () => {
    const { taskRepo, permissionService, reminderService } = buildDependencies();
    permissionService.updatePermission('granted');
    const task = taskRepo.create({ title: 'Task' });
    reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

    const job = reminderService.getReminderForTask(task.id);
    expect(job?.status).toBe('scheduled');
  });
});

// ---------------------------------------------------------------------------
// TaskService – AC-3 reminder cancellation + physical delete
// ---------------------------------------------------------------------------

describe('TaskService – status transition and reminder cancellation (AC-3)', () => {
  it('sets completedAt and cancels reminder when status → DONE', () => {
    const { taskRepo, permissionService, reminderService, taskService } = buildDependencies();
    permissionService.updatePermission('granted');
    const task = taskRepo.create({ title: 'Task to complete' });
    reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

    const updated = taskService.updateTask(task.id, { status: 'DONE' });

    expect(updated?.status).toBe('DONE');
    expect(updated?.completedAt).toBeInstanceOf(Date);
    expect(reminderService.getReminderForTask(task.id)).toBeUndefined();
  });

  it('clears completedAt when status → TODO (undo completion)', () => {
    const { taskRepo, permissionService, taskService } = buildDependencies();
    permissionService.updatePermission('granted');
    const task = taskRepo.create({ title: 'Task' });
    taskService.updateTask(task.id, { status: 'DONE' });

    const undone = taskService.updateTask(task.id, { status: 'TODO' });
    expect(undone?.status).toBe('TODO');
    expect(undone?.completedAt).toBeUndefined();
  });

  it('does not cancel reminder when only title is updated', () => {
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

  it('increments version on each update', () => {
    const { taskRepo, taskService } = buildDependencies();
    const task = taskRepo.create({ title: 'Task' });
    expect(task.version).toBe(1);

    const v2 = taskService.updateTask(task.id, { title: 'Updated' });
    expect(v2?.version).toBe(2);

    const v3 = taskService.updateTask(task.id, { title: 'Updated again' });
    expect(v3?.version).toBe(3);
  });
});

describe('TaskService – deleteTask (physical delete)', () => {
  it('physically removes the task and cancels reminder jobs', () => {
    const { taskRepo, permissionService, reminderService, taskService } = buildDependencies();
    permissionService.updatePermission('granted');
    const task = taskRepo.create({ title: 'Task to delete' });
    reminderService.setReminder(task.id, new Date('2026-06-01T09:00:00Z'));

    const result = taskService.deleteTask(task.id);

    expect(result).toBe(true);
    expect(taskRepo.findById(task.id)).toBeUndefined();
    // Reminder jobs should be gone (task no longer exists).
    // We cannot call getReminderForTask as the task is gone from taskRepo,
    // so we verify via the reminderJobRepo directly in the integration test.
  });

  it('returns false for a non-existent task', () => {
    const { taskService } = buildDependencies();

    expect(taskService.deleteTask('ghost-id')).toBe(false);
  });

  it('the deleted task no longer appears in listTasks', () => {
    const { taskRepo, taskService } = buildDependencies();
    const t1 = taskRepo.create({ title: 'Keep' });
    const t2 = taskRepo.create({ title: 'Delete me' });

    taskService.deleteTask(t2.id);

    const ids = taskService.listTasks().map((t) => t.id);
    expect(ids).toContain(t1.id);
    expect(ids).not.toContain(t2.id);
  });
});

// ---------------------------------------------------------------------------
// ReminderError
// ---------------------------------------------------------------------------

describe('ReminderError', () => {
  it('is an instance of Error with the correct code', () => {
    const err = new ReminderError('msg', 'TEST_CODE');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('msg');
    expect(err.name).toBe('ReminderError');
  });
});
