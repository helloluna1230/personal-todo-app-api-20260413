'use strict';

const { TaskStatus } = require('../src/models/task');
const taskService = require('../src/services/taskService');
const reminderService = require('../src/services/reminderService');

beforeEach(() => {
  // Isolate each test: clear all tasks and all scheduled reminders
  taskService.clearAll();
  reminderService.clearAll();
});

describe('completeTask', () => {
  describe('[Unit] Marking a task complete updates status to DONE', () => {
    test('status changes to DONE after completeTask is called', () => {
      const task = taskService.addTask({ title: 'Buy groceries' });

      expect(task.status).toBe(TaskStatus.TODO);

      const updated = taskService.completeTask(task.id);

      expect(updated.status).toBe(TaskStatus.DONE);
    });

    test('completedAt is recorded when task is completed', () => {
      const before = new Date();
      const task = taskService.addTask({ title: 'Buy groceries' });

      const updated = taskService.completeTask(task.id);
      const after = new Date();

      expect(updated.completedAt).toBeInstanceOf(Date);
      expect(updated.completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated.completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test('completeTask mutates the stored task (same object reference via findById)', () => {
      const task = taskService.addTask({ title: 'Read a book' });

      taskService.completeTask(task.id);

      const stored = taskService.findById(task.id);
      expect(stored.status).toBe(TaskStatus.DONE);
      expect(stored.completedAt).toBeInstanceOf(Date);
    });

    test('completeTask throws TASK_NOT_FOUND error for unknown IDs', () => {
      expect(() => taskService.completeTask('non-existent-id')).toThrow('Task not found: non-existent-id');
    });
  });

  describe('[Unit] Idempotency — calling completeTask twice is safe', () => {
    test('calling completeTask on an already-DONE task returns task unchanged', () => {
      const task = taskService.addTask({ title: 'Exercise' });
      const first = taskService.completeTask(task.id);
      const firstCompletedAt = first.completedAt;

      const second = taskService.completeTask(task.id);

      expect(second.status).toBe(TaskStatus.DONE);
      // completedAt must not be overwritten on the second call
      expect(second.completedAt).toEqual(firstCompletedAt);
    });
  });

  describe('[Unit] Completed tasks no longer trigger future reminders', () => {
    test('completing a task cancels all its scheduled reminders', () => {
      const task = taskService.addTask({ title: 'Doctor appointment' });

      // Simulate two scheduled reminders
      const timer1 = setTimeout(() => {}, 60_000);
      const timer2 = setTimeout(() => {}, 120_000);
      reminderService.scheduleReminder(task.id, timer1);
      reminderService.scheduleReminder(task.id, timer2);

      expect(reminderService.hasReminders(task.id)).toBe(true);

      taskService.completeTask(task.id);

      // After completion the reminder store for this task must be empty
      expect(reminderService.hasReminders(task.id)).toBe(false);
    });

    test('completing a task with no reminders does not throw', () => {
      const task = taskService.addTask({ title: 'No reminders task' });

      expect(() => taskService.completeTask(task.id)).not.toThrow();
      expect(reminderService.hasReminders(task.id)).toBe(false);
    });

    test('reminders for other tasks are NOT cancelled when one task is completed', () => {
      const task1 = taskService.addTask({ title: 'Task 1' });
      const task2 = taskService.addTask({ title: 'Task 2' });

      const timer = setTimeout(() => {}, 60_000);
      reminderService.scheduleReminder(task2.id, timer);

      taskService.completeTask(task1.id);

      // task2's reminders must be unaffected
      expect(reminderService.hasReminders(task2.id)).toBe(true);

      // cleanup
      clearTimeout(timer);
    });
  });
});
