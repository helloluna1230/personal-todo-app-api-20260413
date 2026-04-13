'use strict';

const { TimeStatus, computeTimeStatus, getTaskProjection, isSameCalendarDay } = require('../src/utils/timeProjection');
const { TaskStatus } = require('../src/models/task');

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
    status: TaskStatus.PENDING,
    dueAt: null,
    completedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeTimeStatus
// ---------------------------------------------------------------------------

describe('computeTimeStatus', () => {
  describe('[Unit] OVERDUE — current time exceeds deadline and task is not done', () => {
    test('returns OVERDUE when now is after dueAt and task is PENDING', () => {
      const dueAt = new Date('2026-01-01T10:00:00.000Z');
      const now = new Date('2026-01-01T11:00:00.000Z'); // 1 hour after deadline
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.OVERDUE);
    });

    test('returns OVERDUE when now is after dueAt and task is IN_PROGRESS', () => {
      const dueAt = new Date('2026-01-01T10:00:00.000Z');
      const now = new Date('2026-01-02T08:00:00.000Z'); // next day
      const task = makeTask({ status: TaskStatus.IN_PROGRESS, dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.OVERDUE);
    });

    test('returns OVERDUE even when the missed deadline was today but the time has passed', () => {
      const dueAt = new Date('2026-04-13T08:00:00.000Z');
      const now = new Date('2026-04-13T09:00:00.000Z'); // same day, 1 hour later
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.OVERDUE);
    });
  });

  describe('[Unit] Completed tasks do not show OVERDUE status', () => {
    test('returns NONE when task is DONE even if now is after dueAt', () => {
      const dueAt = new Date('2026-01-01T10:00:00.000Z');
      const now = new Date('2026-01-01T11:00:00.000Z'); // after deadline
      const task = makeTask({ status: TaskStatus.DONE, dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.NONE);
    });

    test('returns NONE when task is DONE and dueAt is in the past by many days', () => {
      const dueAt = new Date('2025-12-01T00:00:00.000Z');
      const now = new Date('2026-04-13T09:00:00.000Z');
      const task = makeTask({ status: TaskStatus.DONE, dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.NONE);
    });
  });

  describe('[Unit] TODAY — deadline is on the current calendar day but not yet passed', () => {
    test('returns TODAY when dueAt is later today', () => {
      const dueAt = new Date('2026-04-13T23:59:59.000Z');
      const now = new Date('2026-04-13T08:00:00.000Z');
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.TODAY);
    });

    test('returns TODAY when dueAt equals now exactly (boundary: not strictly after)', () => {
      const dueAt = new Date('2026-04-13T10:00:00.000Z');
      const now = new Date('2026-04-13T10:00:00.000Z'); // equal → not overdue
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.TODAY);
    });
  });

  describe('[Unit] UPCOMING — deadline is in the future beyond today', () => {
    test('returns UPCOMING when dueAt is tomorrow', () => {
      const dueAt = new Date('2026-04-14T09:00:00.000Z');
      const now = new Date('2026-04-13T09:00:00.000Z');
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.UPCOMING);
    });

    test('returns UPCOMING when dueAt is far in the future', () => {
      const dueAt = new Date('2027-01-01T00:00:00.000Z');
      const now = new Date('2026-04-13T09:00:00.000Z');
      const task = makeTask({ dueAt });

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.UPCOMING);
    });
  });

  describe('[Unit] NONE — task has no due date', () => {
    test('returns NONE when dueAt is null', () => {
      const task = makeTask({ dueAt: null });
      expect(computeTimeStatus(task, new Date())).toBe(TimeStatus.NONE);
    });

    test('returns NONE when dueAt is undefined', () => {
      const task = makeTask({ dueAt: undefined });
      expect(computeTimeStatus(task, new Date())).toBe(TimeStatus.NONE);
    });
  });

  describe('[Unit] dueAt as ISO string is accepted', () => {
    test('parses ISO string dueAt correctly for OVERDUE', () => {
      const task = makeTask({ dueAt: '2026-01-01T10:00:00.000Z' });
      const now = new Date('2026-01-01T11:00:00.000Z');

      expect(computeTimeStatus(task, now)).toBe(TimeStatus.OVERDUE);
    });
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

  test('includes NONE for a completed task even when now > dueAt', () => {
    const dueAt = new Date('2026-01-01T10:00:00.000Z');
    const now = new Date('2026-01-01T11:00:00.000Z');
    const task = makeTask({ status: TaskStatus.DONE, dueAt });

    const projection = getTaskProjection(task, now);

    expect(projection.timeStatus).toBe(TimeStatus.NONE);
  });
});

// ---------------------------------------------------------------------------
// isSameCalendarDay
// ---------------------------------------------------------------------------

describe('isSameCalendarDay', () => {
  test('returns true for two Date objects on the same local day', () => {
    // Use local Date constructor to avoid timezone ambiguity
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
