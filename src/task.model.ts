export enum TaskStatus {
  TODO = 'TODO',
  DONE = 'DONE',
}

export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: Date | null;
  /** IANA timezone identifier (e.g. "America/New_York"). When set, OVERDUE/TODAY
   *  boundaries are computed in this timezone rather than UTC. */
  timezone?: string;
  createdAt: Date;
}

/**
 * Canonical time-relative classification of a task.
 *
 * Computed once by TimeStatusService and carried as a read-only projection.
 * No other layer (sort, query, test) is allowed to re-derive today semantics
 * directly from `dueAt`.
 */
export enum TimeStatus {
  OVERDUE = 'OVERDUE',
  TODAY = 'TODAY',
  UPCOMING = 'UPCOMING',
  NO_DUE_DATE = 'NO_DUE_DATE',
  DONE = 'DONE',
}

/**
 * A task paired with its pre-computed time status.
 * Consumed by the Today-view sort; produced by TimeStatusService.
 */
export interface TaskTimeProjection {
  task: Task;
  timeStatus: TimeStatus;
}
