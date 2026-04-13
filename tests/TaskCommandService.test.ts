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
