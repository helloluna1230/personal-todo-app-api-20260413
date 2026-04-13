'use strict';

/**
 * Time status values for task_time_projection.
 *
 * - OVERDUE   : task is not done and the deadline has already passed
 * - TODAY     : task is not done and the deadline falls on the current calendar day
 *               (but has not yet passed)
 * - UPCOMING  : task is not done and the deadline is in the future (beyond today)
 * - NONE      : task has no deadline, or the task is already done
 */
const TimeStatus = Object.freeze({
  OVERDUE: 'OVERDUE',
  TODAY: 'TODAY',
  UPCOMING: 'UPCOMING',
  NONE: 'NONE',
});

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
 *   1. If the task has no `dueAt`, or its status is DONE → NONE
 *   2. If `now` is strictly after `dueAt`              → OVERDUE
 *   3. If `dueAt` falls on the same calendar day as `now` → TODAY
 *   4. Otherwise                                        → UPCOMING
 *
 * @param {Object}   task
 * @param {string}   task.status  - One of TaskStatus values
 * @param {Date|string|null} task.dueAt - Deadline; null means no deadline
 * @param {Date}    [now]  - Current time; defaults to new Date()
 * @returns {string} One of TimeStatus values
 */
function computeTimeStatus(task, now = new Date()) {
  if (!task.dueAt || task.status === 'DONE') {
    return TimeStatus.NONE;
  }

  const dueAt = new Date(task.dueAt);

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

module.exports = { TimeStatus, computeTimeStatus, getTaskProjection, isSameCalendarDay };
