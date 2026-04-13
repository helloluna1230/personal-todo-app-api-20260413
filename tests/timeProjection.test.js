'use strict';

const { TimeStatus, computeTimeStatus, getTaskProjection, isSameCalendarDay, normalizeDueAt } = require('../src/utils/timeProjection');
const { TaskStatus } = require('../src/models/task');
const taskService = require('../src/services/taskService');
const reminderService = require('../src/services/reminderService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal task object for testing purposes.
 *
 * @param {Partial<{status: string, dueAt: Date|null}>} overrides
 * @returns {Object}
 */
function makeTask(overrides = {}) {
  return {
    id: 'test-id',
    title: 'Test task',
    status: TaskStatus.TODO,
    dueAt: null,
    completedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  taskService.clearAll();
  reminderService.scheduledReminders.clear();
});

// ---------------------------------------------------------------------------
// computeTimeStatus — pure function
// ---------------------------------------------------------------------------

describe('computeTimeStatus', () => {
  describe('[Unit] OVERDUE — current time exceeds deadline and task is not done', () => {
    test('returns OVERDUE when now is after dueAt and task is TODO', () => {
      const dueAt = new Date('2026-01-01T10:00:00.000Z');
      const now = new Date('2026-01-01T11:00:00.000Z'); // 1 hour after deadline
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.OVERDUE);
    });

    test('returns OVERDUE even when the missed deadline was today but the time has passed', () => {
      const dueAt = new Date('2026-04-13T08:00:00.000Z');
      const now = new Date('2026-04-13T09:00:00.000Z'); // same day, 1 hour later
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.OVERDUE);
    });
  });

  describe('[Unit] Completed tasks return DONE status (not OVERDUE)', () => {
    test('returns DONE when task is DONE even if now is after dueAt', () => {
      const dueAt = new Date('2026-01-01T10:00:00.000Z');
      const now = new Date('2026-01-01T11:00:00.000Z'); // after deadline
      const task = makeTask({ status: TaskStatus.DONE, dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.DONE);
    });

    test('returns DONE when task is DONE and dueAt is in the past by many days', () => {
      const dueAt = new Date('2025-12-01T00:00:00.000Z');
      const now = new Date('2026-04-13T09:00:00.000Z');
      const task = makeTask({ status: TaskStatus.DONE, dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.DONE);
    });

    test('returns DONE when task is DONE and has no dueAt', () => {
      const task = makeTask({ status: TaskStatus.DONE, dueAt: null });

      expect(computeTimeStatus(task, new Date())).toBe(TimeStatus.DONE);
    });
  });

  describe('[Unit] TODAY — deadline is on the current calendar day but not yet passed', () => {
    test('returns TODAY when dueAt is later today', () => {
      const dueAt = new Date(2026, 3, 13, 23, 59, 59); // April 13 23:59:59 local
      const now = new Date(2026, 3, 13, 8, 0, 0);      // April 13 08:00 local
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.TODAY);
    });

    test('returns TODAY when dueAt equals now exactly (boundary: not strictly after)', () => {
      const dueAt = new Date(2026, 3, 13, 10, 0, 0); // April 13 10:00 local
      const now = new Date(2026, 3, 13, 10, 0, 0);   // same instant
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.TODAY);
    });
  });

  describe('[Unit] UPCOMING — deadline is in the future beyond today', () => {
    test('returns UPCOMING when dueAt is tomorrow', () => {
      const dueAt = new Date(2026, 3, 14, 9, 0, 0); // April 14 local
      const now = new Date(2026, 3, 13, 9, 0, 0);   // April 13 local
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.UPCOMING);
    });

    test('returns UPCOMING when dueAt is far in the future', () => {
      const dueAt = new Date(2027, 0, 1, 0, 0, 0); // Jan 1 2027 local
      const now = new Date(2026, 3, 13, 9, 0, 0);  // April 13 2026 local
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.UPCOMING);
    });
  });

  describe('[Unit] NO_DUE_DATE — task has no due date', () => {
    test('returns NO_DUE_DATE when dueAt is null', () => {
      const task = makeTask({ dueAt: null });
      expect(computeTimeStatus(task, new Date())).toBe(TimeStatus.NO_DUE_DATE);
    });

    test('returns NO_DUE_DATE when dueAt is undefined', () => {
      const task = makeTask({ dueAt: undefined });
      expect(computeTimeStatus(task, new Date())).toBe(TimeStatus.NO_DUE_DATE);
    });
  });

  describe('[Unit] dueAt as ISO datetime string is accepted', () => {
    test('parses ISO datetime string dueAt correctly for OVERDUE', () => {
      const task = makeTask({ dueAt: '2026-01-01T10:00:00.000Z' });
      const now = new Date('2026-01-01T11:00:00.000Z');

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.OVERDUE);
    });
  });

  describe('[Unit] date-only dueAt defaults to 23:59:59.999 local — overdue from next day', () => {
    test('date-only string: still TODAY at 23:59:59.998 local on the same day', () => {
      // normalizeDueAt("2026-04-13") → April 13 23:59:59.999 local
      // now = April 13 23:59:59.998 → not yet past → TODAY
      const task = makeTask({ dueAt: '2026-04-13' });
      const now = new Date(2026, 3, 13, 23, 59, 59, 998); // 1ms before deadline

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.TODAY);
    });

    test('date-only string: OVERDUE at 00:00:00.000 local the following day', () => {
      // normalizeDueAt("2026-04-13") → April 13 23:59:59.999 local
      // now = April 14 00:00:00 → past → OVERDUE
      const task = makeTask({ dueAt: '2026-04-13' });
      const now = new Date(2026, 3, 14, 0, 0, 0, 0); // start of next day

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.OVERDUE);
    });
  });
});

// ---------------------------------------------------------------------------
// normalizeDueAt
// ---------------------------------------------------------------------------

describe('normalizeDueAt', () => {
  test('null returns null', () => {
    expect(normalizeDueAt(null)).toBeNull();
  });

  test('undefined returns null', () => {
    expect(normalizeDueAt(undefined)).toBeNull();
  });

  test('date-only string "YYYY-MM-DD" returns local 23:59:59.999', () => {
    const result = normalizeDueAt('2026-04-13');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3); // April (0-indexed)
    expect(result.getDate()).toBe(13);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  test('full ISO string is passed through as-is', () => {
    const iso = '2026-04-13T10:30:00.000Z';
    const result = normalizeDueAt(iso);
    expect(result).toEqual(new Date(iso));
  });

  test('Date object is returned as equivalent Date', () => {
    const d = new Date(2026, 3, 13, 10, 0, 0);
    const result = normalizeDueAt(d);
    expect(result.getTime()).toBe(d.getTime());
  });
});

// ---------------------------------------------------------------------------
// getTaskProjection
// ---------------------------------------------------------------------------

describe('getTaskProjection', () => {
  test('returns a new object with all original task fields plus timeStatus', () => {
    const dueAt = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T11:00:00.000Z');
    const task = makeTask({ dueAt });

    const projection = getTaskProjection(task, now);

    expect(projection).toMatchObject({ ...task });
    expect(projection.timeStatus).toBe(TimeStatus.OVERDUE);
  });

  test('does not mutate the original task object', () => {
    const task = makeTask({ dueAt: new Date('2026-01-01T10:00:00.000Z') });
    const now = new Date('2026-01-01T11:00:00.000Z');

    getTaskProjection(task, now);

    expect(task.timeStatus).toBeUndefined();
  });

  test('returns DONE for a completed task even when now > dueAt', () => {
    const dueAt = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T11:00:00.000Z');
    const task = makeTask({ status: TaskStatus.DONE, dueAt });

    const projection = getTaskProjection(task, now);

    expect(projection.timeStatus).toBe(TimeStatus.DONE);
  });
});

// ---------------------------------------------------------------------------
// isSameCalendarDay
// ---------------------------------------------------------------------------

describe('isSameCalendarDay', () => {
  test('returns true for two Date objects on the same local day', () => {
    const a = new Date(2026, 3, 13, 8, 0, 0);   // April 13 08:00 local
    const b = new Date(2026, 3, 13, 23, 59, 59); // April 13 23:59 local
    expect(isSameCalendarDay(a, b)).toBe(true);
  });

  test('returns false for dates on consecutive days', () => {
    const a = new Date(2026, 3, 13); // April 13 local
    const b = new Date(2026, 3, 14); // April 14 local
    expect(isSameCalendarDay(a, b)).toBe(false);
  });

  test('returns true for identical Date objects', () => {
    const d = new Date(2026, 3, 13, 10, 0, 0);
    expect(isSameCalendarDay(d, d)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration — task completion → projection chain
// ---------------------------------------------------------------------------

describe('[Integration] task completion changes timeStatus to DONE', () => {
  test('getTaskWithProjection returns OVERDUE before completion and DONE after', () => {
    // Set up: a task with a past deadline
    const pastDue = new Date(Date.now() - 60_000); // 1 minute ago
    const task = taskService.addTask({ title: 'Overdue task', dueAt: pastDue });

    // Before completion: timeStatus should be OVERDUE
    const before = taskService.getTaskWithProjection(task.id);
    expect(before.timeStatus).toBe(TimeStatus.OVERDUE);

    // Complete the task
    taskService.completeTask(task.id);

    // After completion: timeStatus must switch to DONE
    const after = taskService.getTaskWithProjection(task.id);
    expect(after.timeStatus).toBe(TimeStatus.DONE);
  });

  test('getTaskWithProjection returns DONE for task with no dueAt after completion', () => {
    const task = taskService.addTask({ title: 'No due date task' });

    taskService.completeTask(task.id);

    const projection = taskService.getTaskWithProjection(task.id);
    expect(projection.timeStatus).toBe(TimeStatus.DONE);
  });
});

// ---------------------------------------------------------------------------
// Integration — task completion → reminder cancellation chain
// ---------------------------------------------------------------------------

describe('[Integration] task completion cancels reminders via domain event', () => {
  test('completing a task cancels all its scheduled reminders', () => {
    const task = taskService.addTask({ title: 'Doctor appointment' });

    const timer1 = setTimeout(() => {}, 60_000);
    const timer2 = setTimeout(() => {}, 120_000);
    reminderService.scheduleReminder(task.id, timer1);
    reminderService.scheduleReminder(task.id, timer2);

    expect(reminderService.hasReminders(task.id)).toBe(true);

    taskService.completeTask(task.id);

    expect(reminderService.hasReminders(task.id)).toBe(false);
  });

  test('completing a task with no reminders does not throw', () => {
    const task = taskService.addTask({ title: 'No reminders' });
    expect(() => taskService.completeTask(task.id)).not.toThrow();
    expect(reminderService.hasReminders(task.id)).toBe(false);
  });

  test('reminders for other tasks are NOT cancelled when one task is completed', () => {
    const task1 = taskService.addTask({ title: 'Task 1' });
    const task2 = taskService.addTask({ title: 'Task 2' });

    const timer = setTimeout(() => {}, 60_000);
    reminderService.scheduleReminder(task2.id, timer);

    taskService.completeTask(task1.id);

    expect(reminderService.hasReminders(task2.id)).toBe(true);

    clearTimeout(timer);
  });
});

// ---------------------------------------------------------------------------
// Integration — route projection contract (via taskService + getTaskProjection)
// ---------------------------------------------------------------------------

describe('[Integration] route projection contract matches documentation', () => {
  test('projection for overdue TODO task contains all required fields with OVERDUE status', () => {
    const pastDue = new Date(Date.now() - 60_000);
    const task = taskService.addTask({ title: 'Route test task', dueAt: pastDue });

    const projection = taskService.getTaskWithProjection(task.id);

    // All base task fields are present
    expect(projection).toHaveProperty('id');
    expect(projection).toHaveProperty('title', 'Route test task');
    expect(projection).toHaveProperty('status', TaskStatus.TODO);
    expect(projection).toHaveProperty('dueAt');
    // time projection field
    expect(projection).toHaveProperty('timeStatus', TimeStatus.OVERDUE);
  });

  test('projection for DONE task contains DONE timeStatus regardless of dueAt', () => {
    const pastDue = new Date(Date.now() - 60_000);
    const task = taskService.addTask({ title: 'Completed task', dueAt: pastDue });
    taskService.completeTask(task.id);

    const projection = taskService.getTaskWithProjection(task.id);

    expect(projection.status).toBe(TaskStatus.DONE);
    expect(projection.timeStatus).toBe(TimeStatus.DONE);
    expect(projection.completedAt).toBeInstanceOf(Date);
  });

  test('projection for task with no dueAt returns NO_DUE_DATE timeStatus', () => {
    const task = taskService.addTask({ title: 'No deadline task' });

    const projection = taskService.getTaskWithProjection(task.id);

    expect(projection.timeStatus).toBe(TimeStatus.NO_DUE_DATE);
  });
});

