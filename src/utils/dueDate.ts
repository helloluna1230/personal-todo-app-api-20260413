import { TaskStatus, TaskTimeStatus } from '../models/Task';

/** Matches a date-only string in YYYY-MM-DD format. */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns true when the value is a date-only string (YYYY-MM-DD),
 * meaning the user did not specify a specific time.
 */
export function isDateOnly(value: string): boolean {
  return DATE_ONLY_RE.test(value);
}

/**
 * Validates that the given string is a parseable date or datetime.
 * Accepts both date-only (YYYY-MM-DD) and full ISO 8601 strings.
 */
export function isValidDate(value: string): boolean {
  const ts = Date.parse(value);
  return !isNaN(ts);
}

/**
 * Normalizes a due-date value:
 * - If the value is a date-only string (YYYY-MM-DD), it defaults to the end
 *   of that calendar day (23:59:59.999 UTC) so that the task becomes overdue
 *   only from the following day onwards.
 * - Otherwise the original ISO datetime string is returned unchanged.
 */
export function normalizeDueAt(value: string): string {
  if (isDateOnly(value)) {
    return `${value}T23:59:59.999Z`;
  }
  return value;
}

/**
 * Computes the time status of a task given its due-date and completion state.
 *
 * @param dueAt  - The (already normalised) ISO due-date string, or undefined.
 * @param status - The current task status.
 * @param now    - The reference instant (defaults to the current time).
 */
export function computeTimeStatus(
  dueAt: string | undefined,
  status: TaskStatus,
  now: Date = new Date(),
): TaskTimeStatus {
  if (status === TaskStatus.DONE) {
    return TaskTimeStatus.DONE;
  }
  if (!dueAt) {
    return TaskTimeStatus.NONE;
  }

  const due = new Date(dueAt);
  if (now > due) {
    return TaskTimeStatus.OVERDUE;
  }

  const sameDay =
    now.getUTCFullYear() === due.getUTCFullYear() &&
    now.getUTCMonth() === due.getUTCMonth() &&
    now.getUTCDate() === due.getUTCDate();

  return sameDay ? TaskTimeStatus.TODAY : TaskTimeStatus.UPCOMING;
}
