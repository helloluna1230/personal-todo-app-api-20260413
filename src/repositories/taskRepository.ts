import { Task } from '../models/Task';

const store = new Map<string, Task>();

export function findById(id: string): Task | undefined {
  return store.get(id);
}

export function findAll(): Task[] {
  return Array.from(store.values());
}

export function save(task: Task): Task {
  store.set(task.id, { ...task });
  return { ...task };
}

export function remove(id: string): boolean {
  return store.delete(id);
}

export function clear(): void {
  store.clear();
}
