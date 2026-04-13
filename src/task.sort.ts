import { Task, TaskPriority, TaskStatus } from './task.model';

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

export type TodayViewBucket = 'OVERDUE' | 'TODAY';

const TODAY_BUCKET_ORDER: Record<TodayViewBucket, number> = {
  OVERDUE: 0,
  TODAY: 1,
};

/**
 * Classify a task into a Today-view bucket relative to the given reference date.
 *
 * A task is OVERDUE when its dueAt is before the start of today (midnight).
 * A task is TODAY when its dueAt falls within today.
 */
export function getTodayBucket(task: Task, today: Date): TodayViewBucket {
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  if (task.dueAt && task.dueAt < startOfToday) {
    return 'OVERDUE';
  }
  return 'TODAY';
}

/**
 * Today-view sort comparator.
 *
 * Rules (applied in order):
 *   1. Today bucket: OVERDUE before TODAY
 *   2. Within the same bucket, apply defaultSortComparator rules
 */
export function todaySortComparator(today: Date): (a: Task, b: Task) => number {
  return (a: Task, b: Task): number => {
    const aBucket = getTodayBucket(a, today);
    const bBucket = getTodayBucket(b, today);
    const bucketDiff = TODAY_BUCKET_ORDER[aBucket] - TODAY_BUCKET_ORDER[bBucket];
    if (bucketDiff !== 0) return bucketDiff;

    return defaultSortComparator(a, b);
  };
}

/**
 * Sort tasks using the default view rules (mutates the input array).
 */
export function sortTasks(tasks: Task[]): Task[] {
  return tasks.sort(defaultSortComparator);
}

/**
 * Sort tasks using the Today view rules (mutates the input array).
 */
export function sortTasksForToday(tasks: Task[], today: Date = new Date()): Task[] {
  return tasks.sort(todaySortComparator(today));
}
