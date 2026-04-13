import { randomUUID } from 'crypto';
import { Task, CreateTaskDto, TaskUpdatePayload } from '../models/task';

/**
 * Simple in-memory store for tasks.
 * Replace with a database adapter in production.
 * This repository is the sole writer of the `tasks` main record and knows
 * nothing about reminder scheduling.
 */
export class TaskRepository {
  private tasks: Map<string, Task> = new Map();

  create(dto: CreateTaskDto): Task {
    const now = new Date();
    const task: Task = {
      id: randomUUID(),
      title: dto.title,
      note: dto.note,
      priority: dto.priority,
      category: dto.category,
      timezone: dto.timezone,
      dueAt: dto.dueAt,
      status: 'TODO',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  findById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  findAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  update(id: string, payload: TaskUpdatePayload): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updated: Task = {
      ...task,
      ...payload,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  /** Physically removes the task. Returns true if it existed. */
  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  /** For testing: reset all state. */
  clear(): void {
    this.tasks.clear();
  }
}
