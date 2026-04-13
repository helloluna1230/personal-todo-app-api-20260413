import { Task, TaskPriority, TaskStatus, TaskTimeProjection, TimeStatus } from './task.model';

const STATUS_ORDER: Record<TaskStatus, number> = {
  [TaskStatus.TODO]: 0,
  [TaskStatus.DONE]: 1,
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  [TaskPriority.HIGH]: 0,
  [TaskPriority.MEDIUM]: 1,
  [TaskPriority.LOW]: 2,
};

/**
 * Default sort comparator.
 *
 * Rules (applied in order):
 *   1. Status:   TODO before DONE
 *   2. Priority: HIGH > MEDIUM > LOW
 *   3. dueAt:    ascending (tasks without a due date sort last)
 *   4. createdAt: ascending
 */
export function defaultSortComparator(a: Task, b: Task): number {
  const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (statusDiff !== 0) return statusDiff;

  const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (priorityDiff !== 0) return priorityDiff;

  const aDue = a.dueAt ? a.dueAt.getTime() : Infinity;
  const bDue = b.dueAt ? b.dueAt.getTime() : Infinity;
  const dueDiff = aDue - bDue;
  if (dueDiff !== 0) return dueDiff;

  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Order of TimeStatus values in the Today view.
 *
 * OVERDUE surfaces first. UPCOMING, NO_DUE_DATE and DONE should be filtered
 * out before reaching this comparator; they are assigned high numeric weights
 * so they sink to the bottom rather than silently mixing with today's tasks.
 */
const TIME_STATUS_ORDER: Record<TimeStatus, number> = {
  [TimeStatus.OVERDUE]: 0,
  [TimeStatus.TODAY]: 1,
  [TimeStatus.UPCOMING]: 2,
  [TimeStatus.NO_DUE_DATE]: 3,
  [TimeStatus.DONE]: 4,
};

/**
 * Today-view sort comparator.
 *
 * Consumes pre-computed {@link TaskTimeProjection} objects produced by
 * TimeStatusService. This comparator never re-derives today semantics from
 * `dueAt`; that responsibility belongs exclusively to TimeStatusService.
 *
 * Rules (applied in order):
 *   1. TimeStatus: OVERDUE before TODAY (UPCOMING / NO_DUE_DATE sink last)
 *   2. Within the same bucket, apply defaultSortComparator rules
 */
export function todaySortComparator(
  a: TaskTimeProjection,
  b: TaskTimeProjection,
): number {
  const bucketDiff = TIME_STATUS_ORDER[a.timeStatus] - TIME_STATUS_ORDER[b.timeStatus];
  if (bucketDiff !== 0) return bucketDiff;

  return defaultSortComparator(a.task, b.task);
}

/**
 * Sort tasks using the default view rules (mutates the input array).
 */
export function sortTasks(tasks: Task[]): Task[] {
  return tasks.sort(defaultSortComparator);
}

/**
 * Sort task-time projections using the Today view rules (mutates the input array).
 *
 * Callers are responsible for pre-computing each task's {@link TimeStatus} via
 * TimeStatusService and for pre-filtering to only OVERDUE / TODAY items before
 * passing them here.
 */
export function sortTasksForToday(projections: TaskTimeProjection[]): TaskTimeProjection[] {
  return projections.sort(todaySortComparator);
}

