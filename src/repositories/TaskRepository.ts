import { Task } from '../models/Task';

export class TaskRepository {
  private store: Map<string, Task> = new Map();

  findById(id: string): Task | undefined {
    return this.store.get(id);
  }

  save(task: Task): void {
    this.store.set(task.id, task);
  }

  delete(id: string): void {
    this.store.delete(id);
  }

  clear(): void {
    this.store.clear();
  }
}
