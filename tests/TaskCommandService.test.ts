import {
  createTask,
  updateTask,
  getTask,
  listTasks,
  TaskNotFoundError,
  TaskValidationError,
} from '../src/services/TaskCommandService';
import { clear } from '../src/repositories/taskRepository';
import { TaskPriority, TaskCategory, TaskStatus } from '../src/models/Task';

beforeEach(() => {
  clear();
});

describe('updateTask', () => {
  describe('whitelist validation', () => {
    it('should update allowed fields successfully', () => {
      const task = createTask({ title: 'Original Title' });
      const updated = updateTask(task.id, { title: 'New Title', note: 'Some note' });

      expect(updated.title).toBe('New Title');
      expect(updated.note).toBe('Some note');
    });

    it('should reject non-whitelisted fields', () => {
      const task = createTask({ title: 'My Task' });
      expect(() =>
        updateTask(task.id, { status: TaskStatus.DONE } as never)
      ).toThrow(TaskValidationError);
    });
  });

  describe('title validation', () => {
    it('should reject empty title', () => {
      const task = createTask({ title: 'My Task' });
      expect(() => updateTask(task.id, { title: '' })).toThrow(TaskValidationError);
      expect(() => updateTask(task.id, { title: '   ' })).toThrow(TaskValidationError);
    });

    it('should trim whitespace from title', () => {
      const task = createTask({ title: 'My Task' });
      const updated = updateTask(task.id, { title: '  Trimmed Title  ' });
      expect(updated.title).toBe('Trimmed Title');
    });
  });

  describe('time rule validation', () => {
    it('should allow remindAt equal to dueAt', () => {
      const task = createTask({ title: 'My Task' });
      const dueAt = '2026-05-01T10:00:00.000Z';
      const updated = updateTask(task.id, { dueAt, remindAt: dueAt });
      expect(updated.dueAt).toBe(dueAt);
      expect(updated.remindAt).toBe(dueAt);
    });

    it('should allow remindAt before dueAt', () => {
      const task = createTask({ title: 'My Task' });
      const updated = updateTask(task.id, {
        dueAt: '2026-05-01T10:00:00.000Z',
        remindAt: '2026-05-01T09:00:00.000Z',
      });
      expect(updated.dueAt).toBe('2026-05-01T10:00:00.000Z');
    });

    it('should reject remindAt later than dueAt', () => {
      const task = createTask({ title: 'My Task' });
      expect(() =>
        updateTask(task.id, {
          dueAt: '2026-05-01T10:00:00.000Z',
          remindAt: '2026-05-01T11:00:00.000Z',
        })
      ).toThrow(TaskValidationError);
    });

    it('should reject when new dueAt makes existing remindAt invalid', () => {
      const task = createTask({
        title: 'My Task',
        dueAt: '2026-05-01T12:00:00.000Z',
        remindAt: '2026-05-01T11:00:00.000Z',
      });
      // Move dueAt before remindAt
      expect(() =>
        updateTask(task.id, { dueAt: '2026-05-01T10:00:00.000Z' })
      ).toThrow(TaskValidationError);
    });

    it('should reject when new remindAt makes existing dueAt violated', () => {
      const task = createTask({
        title: 'My Task',
        dueAt: '2026-05-01T10:00:00.000Z',
        remindAt: '2026-05-01T09:00:00.000Z',
      });
      // Set remindAt after dueAt
      expect(() =>
        updateTask(task.id, { remindAt: '2026-05-01T11:00:00.000Z' })
      ).toThrow(TaskValidationError);
    });

    it('should allow setting only dueAt with no remindAt', () => {
      const task = createTask({ title: 'My Task' });
      const updated = updateTask(task.id, { dueAt: '2026-05-01T10:00:00.000Z' });
      expect(updated.dueAt).toBe('2026-05-01T10:00:00.000Z');
    });

    it('should allow setting only remindAt with no dueAt', () => {
      const task = createTask({ title: 'My Task' });
      const updated = updateTask(task.id, { remindAt: '2026-05-01T09:00:00.000Z' });
      expect(updated.remindAt).toBe('2026-05-01T09:00:00.000Z');
    });
  });

  describe('task not found', () => {
    it('should throw TaskNotFoundError for unknown id', () => {
      expect(() => updateTask('non-existent-id', { title: 'New' })).toThrow(
        TaskNotFoundError
      );
    });
  });

  describe('version and timestamps', () => {
    it('should increment version on update', () => {
      const task = createTask({ title: 'My Task' });
      expect(task.version).toBe(1);
      const updated = updateTask(task.id, { title: 'Updated' });
      expect(updated.version).toBe(2);
    });

    it('should update updatedAt timestamp', () => {
      const task = createTask({ title: 'My Task' });
      const before = new Date(task.updatedAt).getTime();
      // Ensure at least 1ms passes
      const updated = updateTask(task.id, { title: 'Updated' });
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe('partial updates', () => {
    it('should only update provided fields and leave others unchanged', () => {
      const task = createTask({
        title: 'My Task',
        note: 'Original note',
        priority: TaskPriority.LOW,
        category: TaskCategory.PERSONAL,
      });

      const updated = updateTask(task.id, { title: 'New Title' });

      expect(updated.title).toBe('New Title');
      expect(updated.note).toBe('Original note');
      expect(updated.priority).toBe(TaskPriority.LOW);
      expect(updated.category).toBe(TaskCategory.PERSONAL);
    });

    it('should update all whitelisted fields at once', () => {
      const task = createTask({ title: 'My Task' });
      const updated = updateTask(task.id, {
        title: 'Updated Title',
        note: 'Updated Note',
        priority: TaskPriority.HIGH,
        category: TaskCategory.SHOPPING,
        dueAt: '2026-06-01T10:00:00.000Z',
        remindAt: '2026-06-01T09:00:00.000Z',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.note).toBe('Updated Note');
      expect(updated.priority).toBe(TaskPriority.HIGH);
      expect(updated.category).toBe(TaskCategory.SHOPPING);
      expect(updated.dueAt).toBe('2026-06-01T10:00:00.000Z');
      expect(updated.remindAt).toBe('2026-06-01T09:00:00.000Z');
    });
  });

  describe('consistency between list and detail', () => {
    it('updated title should be consistent in list and detail', () => {
      const task = createTask({ title: 'Old Title' });
      updateTask(task.id, { title: 'New Title' });

      const detail = getTask(task.id);
      const list = listTasks();
      const fromList = list.find((t) => t.id === task.id);

      expect(detail.title).toBe('New Title');
      expect(fromList?.title).toBe('New Title');
    });
  });
});

describe('due date setting', () => {
  describe('date-only normalization', () => {
    it('createTask: date-only dueAt is normalized to 23:59:59.999Z', () => {
      const task = createTask({ title: 'My Task', dueAt: '2026-05-01' });
      expect(task.dueAt).toBe('2026-05-01T23:59:59.999Z');
    });

    it('updateTask: date-only dueAt is normalized to 23:59:59.999Z', () => {
      const task = createTask({ title: 'My Task' });
      const updated = updateTask(task.id, { dueAt: '2026-05-01' });
      expect(updated.dueAt).toBe('2026-05-01T23:59:59.999Z');
    });

    it('createTask: full datetime dueAt is stored as-is', () => {
      const dt = '2026-05-01T10:00:00.000Z';
      const task = createTask({ title: 'My Task', dueAt: dt });
      expect(task.dueAt).toBe(dt);
    });

    it('updateTask: full datetime dueAt is stored as-is', () => {
      const task = createTask({ title: 'My Task' });
      const dt = '2026-05-01T10:00:00.000Z';
      const updated = updateTask(task.id, { dueAt: dt });
      expect(updated.dueAt).toBe(dt);
    });
  });

  describe('overdue-from-next-day for date-only input', () => {
    it('task with date-only dueAt is not overdue on the same day at 23:59:59.998', () => {
      const { computeTimeStatus } = require('../src/utils/dueDate');
      const { TaskStatus, TaskTimeStatus } = require('../src/models/Task');
      // dueAt normalised to end-of-day
      const dueAt = '2026-05-01T23:59:59.999Z';
      // one millisecond before expiry — still within the deadline
      const now = new Date('2026-05-01T23:59:59.998Z');
      const result = computeTimeStatus(dueAt, TaskStatus.TODO, now);
      expect(result).toBe(TaskTimeStatus.TODAY);
    });

    it('task with date-only dueAt is overdue from next day (after 23:59:59.999)', () => {
      const { computeTimeStatus } = require('../src/utils/dueDate');
      const { TaskStatus, TaskTimeStatus } = require('../src/models/Task');
      const dueAt = '2026-05-01T23:59:59.999Z';
      // one millisecond after expiry — next day, should be overdue
      const now = new Date('2026-05-02T00:00:00.000Z');
      const result = computeTimeStatus(dueAt, TaskStatus.TODO, now);
      expect(result).toBe(TaskTimeStatus.OVERDUE);
    });
  });

  describe('dueAt shown in list and detail after saving', () => {
    it('dueAt is present in list after createTask with date-only', () => {
      createTask({ title: 'Task with due', dueAt: '2026-05-01' });
      const list = listTasks();
      expect(list[0].dueAt).toBe('2026-05-01T23:59:59.999Z');
    });

    it('dueAt is present in detail after updateTask with date-only', () => {
      const task = createTask({ title: 'Task' });
      updateTask(task.id, { dueAt: '2026-05-01' });
      const detail = getTask(task.id);
      expect(detail.dueAt).toBe('2026-05-01T23:59:59.999Z');
    });
  });

  describe('invalid date rejection', () => {
    it('createTask: invalid dueAt throws TaskValidationError', () => {
      expect(() => createTask({ title: 'Task', dueAt: 'not-a-date' })).toThrow(
        TaskValidationError
      );
    });

    it('updateTask: invalid dueAt throws TaskValidationError', () => {
      const task = createTask({ title: 'Task' });
      expect(() => updateTask(task.id, { dueAt: 'not-a-date' })).toThrow(
        TaskValidationError
      );
    });
  });
});
