import { randomUUID } from 'crypto';
import { ReminderJob, ReminderJobStatus } from '../models/reminderJob';

/**
 * Owns the `reminder_jobs` projection.
 * This is the only writer for reminder scheduling data; the `tasks` table is
 * never touched by this repository.
 */
export class ReminderJobRepository {
  private jobs: Map<string, ReminderJob> = new Map();

  /** Create or replace the active reminder job for a task. */
  upsert(taskId: string, remindAt: Date): ReminderJob {
    // Cancel any existing active job for this task first.
    const existing = this.findActiveByTaskId(taskId);
    if (existing) {
      this.updateStatus(existing.id, 'cancelled');
    }

    const now = new Date();
    const job: ReminderJob = {
      id: randomUUID(),
      taskId,
      remindAt,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    return job;
  }

  /** Returns the most recent active (scheduled) job for a task, if any. */
  findActiveByTaskId(taskId: string): ReminderJob | undefined {
    return Array.from(this.jobs.values()).find(
      (j) => j.taskId === taskId && j.status === 'scheduled',
    );
  }

  /** Cancels all scheduled jobs for a task. Returns the cancelled jobs. */
  cancelByTaskId(taskId: string): ReminderJob[] {
    const active = Array.from(this.jobs.values()).filter(
      (j) => j.taskId === taskId && j.status === 'scheduled',
    );
    for (const job of active) {
      this.updateStatus(job.id, 'cancelled');
    }
    return active.map((j) => this.jobs.get(j.id)!);
  }

  private updateStatus(id: string, status: ReminderJobStatus): void {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, { ...job, status, updatedAt: new Date() });
    }
  }

  /** For testing: reset all state. */
  clear(): void {
    this.jobs.clear();
  }
}
