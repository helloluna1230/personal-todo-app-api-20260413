import { randomUUID } from 'crypto';
import { Task, CreateTaskDto, UpdateTaskDto } from '../models/task';

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
      description: dto.description,
      dueAt: dto.dueAt,
      isCompleted: false,
      isDeleted: false,
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
    return Array.from(this.tasks.values()).filter((t) => !t.isDeleted);
  }

  update(id: string, dto: UpdateTaskDto): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updated: Task = {
      ...task,
      ...dto,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  /** For testing: reset all state. */
  clear(): void {
    this.tasks.clear();
  }
}
