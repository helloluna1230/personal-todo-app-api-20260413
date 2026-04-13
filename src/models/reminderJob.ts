/**
 * A reminder job lives in the `deadline-reminder` module's own projection.
 * The `tasks` main record is never mutated by reminder logic.
 */
export type ReminderJobStatus = 'scheduled' | 'cancelled' | 'fired' | 'permission_denied';

export interface ReminderJob {
  id: string;
  taskId: string;
  remindAt: Date;
  status: ReminderJobStatus;
  createdAt: Date;
  updatedAt: Date;
}
