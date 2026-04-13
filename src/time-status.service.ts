import { Task, TaskStatus, TimeStatus } from './task.model';

/**
 * Single source of truth for today-relative task classification.
 *
 * All layers (sort, query, tests) must call this function instead of
 * comparing `dueAt` against the current date directly.
 *
 * Day boundaries are computed using the runtime's local calendar so that
 * OVERDUE / TODAY reflect the user's natural day, not UTC midnight.
 *
 * Classification order:
 *   1. DONE   — task is already completed (status takes priority over date)
 *   2. NO_DUE_DATE — no due date set
 *   3. OVERDUE — dueAt is before the start of today (local midnight)
 *   4. TODAY   — dueAt falls within today (local)
 *   5. UPCOMING — dueAt is after today
 *
 * @param task  - The task to classify.
 * @param today - Reference point for "now" (injected for deterministic tests).
 */
export function computeTimeStatus(task: Task, today: Date): TimeStatus {
  if (task.status === TaskStatus.DONE) {
    return TimeStatus.DONE;
  }

  if (!task.dueAt) {
    return TimeStatus.NO_DUE_DATE;
  }

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  if (task.dueAt < startOfToday) {
    return TimeStatus.OVERDUE;
  }

  if (task.dueAt <= endOfToday) {
    return TimeStatus.TODAY;
  }

  return TimeStatus.UPCOMING;
}
