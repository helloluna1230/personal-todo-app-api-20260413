import { Task, TimeStatus } from './task.model';

/**
 * Single source of truth for today-relative task classification.
 *
 * All layers (sort, query, tests) must call this function instead of
 * comparing `dueAt` against the current date directly.
 *
 * Boundaries are computed in UTC so that behaviour is deterministic
 * regardless of the runtime's local timezone.
 *
 * @param task  - The task to classify.
 * @param today - Reference point for "now" (injected for deterministic tests).
 */
export function computeTimeStatus(task: Task, today: Date): TimeStatus {
  if (!task.dueAt) {
    return TimeStatus.NO_DUE_DATE;
  }

  const startOfToday = new Date(today);
  startOfToday.setUTCHours(0, 0, 0, 0);

  const endOfToday = new Date(today);
  endOfToday.setUTCHours(23, 59, 59, 999);

  if (task.dueAt < startOfToday) {
    return TimeStatus.OVERDUE;
  }

  if (task.dueAt <= endOfToday) {
    return TimeStatus.TODAY;
  }

  return TimeStatus.UPCOMING;
}
