import { Task, TaskStatus, TimeStatus } from './task.model';

/**
 * Returns the UTC instant that corresponds to 00:00:00.000 of the calendar day
 * that contains `today`, as viewed in the given IANA `timezone`.
 *
 * The algorithm:
 *   1. Format `today` in the target timezone to get the local "YYYY-MM-DD" date.
 *   2. Take UTC midnight of that date as a reference point.
 *   3. Sample what the target timezone reads at that reference via formatToParts.
 *   4. Reconstruct the local reading as a naive UTC timestamp to get the offset.
 *   5. Subtract the offset from the reference → true local midnight expressed in UTC.
 *
 * This handles positive and negative UTC offsets, DST transitions, and the full
 * IANA timezone database (UTC-12 … UTC+14) without any external libraries.
 */
function startOfDayInTimezone(today: Date, timezone: string): Date {
  // Step 1 – local date string "YYYY-MM-DD" in the target timezone
  const localDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
  }).format(today);

  // Step 2 – UTC midnight for that local date (reference point)
  const utcMidnight = new Date(localDateStr + 'T00:00:00.000Z');

  // Step 3 – what does the target timezone read at utcMidnight?
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23', // 0–23 range, no AM/PM ambiguity
  }).formatToParts(utcMidnight);

  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  // Step 4 – naive UTC milliseconds for that local reading
  const naiveLocalMs = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );

  // Offset = (local reading as UTC) − (actual UTC reference)
  //   UTC+9  → naiveLocalMs is 9 h ahead → offsetMs = +9 h
  //   UTC-5  → naiveLocalMs is 5 h behind (previous evening) → offsetMs = −5 h
  const offsetMs = naiveLocalMs - utcMidnight.getTime();

  // Step 5 – true local midnight = UTC reference − offset
  return new Date(utcMidnight.getTime() - offsetMs);
}

/**
 * Single source of truth for today-relative task classification.
 *
 * All layers (sort, query, tests) must call this function instead of
 * comparing `dueAt` against the current date directly.
 *
 * Day boundaries are computed in the task's own IANA `timezone` (falls back
 * to UTC when not set) so that OVERDUE/TODAY reflect the user's natural day
 * regardless of the server's process timezone.
 *
 * Classification order:
 *   1. DONE        — task is already completed (status takes priority over date)
 *   2. NO_DUE_DATE — no due date set
 *   3. OVERDUE     — dueAt is before the start of today in the task's timezone
 *   4. TODAY       — dueAt falls within today in the task's timezone
 *   5. UPCOMING    — dueAt is after today in the task's timezone
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

  const timezone = task.timezone ?? 'UTC';
  const startOfToday = startOfDayInTimezone(today, timezone);
  // Compute start of tomorrow by calling startOfDayInTimezone with a reference
  // point guaranteed to fall in the next calendar day (startOfToday + 25h covers
  // even a 25-hour DST "fall back" day).  Then subtract 1ms to get end-of-today.
  const startOfTomorrow = startOfDayInTimezone(
    new Date(startOfToday.getTime() + 25 * 60 * 60 * 1000),
    timezone,
  );
  const endOfToday = new Date(startOfTomorrow.getTime() - 1);

  if (task.dueAt < startOfToday) {
    return TimeStatus.OVERDUE;
  }

  if (task.dueAt <= endOfToday) {
    return TimeStatus.TODAY;
  }

  return TimeStatus.UPCOMING;
}
