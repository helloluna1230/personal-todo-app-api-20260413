'use strict';

/**
 * Time status values for task_time_projection.
 * Aligned with architecture document: NO_DUE_DATE | UPCOMING | TODAY | OVERDUE | DONE
 *
 * - DONE        : task has been completed (status === 'DONE'); deadline is irrelevant
 * - OVERDUE     : task is not done and the deadline has already passed
 * - TODAY       : task is not done and the deadline falls on the current calendar day
 *                 (but has not yet passed)
 * - UPCOMING    : task is not done and the deadline is strictly in the future beyond today
 * - NO_DUE_DATE : task has no deadline set
 */
const TimeStatus = Object.freeze({
  DONE: 'DONE',
  OVERDUE: 'OVERDUE',
  TODAY: 'TODAY',
  UPCOMING: 'UPCOMING',
  NO_DUE_DATE: 'NO_DUE_DATE',
});

/**
 * Normalize a raw dueAt value into a Date.
 *
 * Date-only strings in the format "YYYY-MM-DD" are treated as end-of-day in
 * local time (23:59:59.999), so that a task due "2026-04-13" is not considered
 * overdue until 2026-04-14 00:00:00 local — matching the acceptance criterion
 * "仅设置日期时，从次日开始判定为逾期".
 *
 * All other values (Date objects, full ISO strings) are passed through as-is.
 *
 * @param {Date|string|null|undefined} dueAt
 * @returns {Date|null}
 */
function normalizeDueAt(dueAt) {
  if (!dueAt) return null;
  if (typeof dueAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueAt)) {
    const [year, month, day] = dueAt.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }
  return new Date(dueAt);
}

/**
 * Return true when two Date values share the same calendar day (local time).
 *
 * @param {Date} a
 * @param {Date} b
 * @returns {boolean}
 */
function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Compute the time-projection status for a single task.
 *
 * Rules (evaluated in order):
 *   1. If task.status is 'DONE'                         → DONE
 *   2. If the task has no dueAt                         → NO_DUE_DATE
 *   3. If `now` is strictly after the normalized dueAt  → OVERDUE
 *   4. If dueAt falls on the same calendar day as `now` → TODAY
 *   5. Otherwise (dueAt is in the future beyond today)  → UPCOMING
 *
 * @param {Object}           task
 * @param {string}           task.status  - Task status ('TODO' | 'DONE')
 * @param {Date|string|null} task.dueAt   - Deadline; null/undefined means no deadline
 * @param {Date}            [now]         - Current time; defaults to new Date()
 * @returns {string} One of TimeStatus values
 */
function computeTimeStatus(task, now = new Date()) {
  if (task.status === 'DONE') {
    return TimeStatus.DONE;
  }

  const dueAt = normalizeDueAt(task.dueAt);

  if (!dueAt) {
    return TimeStatus.NO_DUE_DATE;
  }

  if (now > dueAt) {
    return TimeStatus.OVERDUE;
  }

  if (isSameCalendarDay(now, dueAt)) {
    return TimeStatus.TODAY;
  }

  return TimeStatus.UPCOMING;
}

/**
 * Build a task_time_projection object by enriching a task with its computed
 * time status.
 *
 * @param {Object} task
 * @param {Date}  [now] - Current time; defaults to new Date()
 * @returns {Object} task augmented with a `timeStatus` field
 */
function getTaskProjection(task, now = new Date()) {
  return {
    ...task,
    timeStatus: computeTimeStatus(task, now),
  };
}

module.exports = { TimeStatus, computeTimeStatus, getTaskProjection, isSameCalendarDay, normalizeDueAt };

