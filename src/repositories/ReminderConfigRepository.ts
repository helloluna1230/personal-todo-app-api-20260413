import { ReminderConfig } from '../models/ReminderConfig';

export class ReminderConfigRepository {
  private store: Map<string, ReminderConfig> = new Map();

  findByTaskId(taskId: string): ReminderConfig[] {
    return Array.from(this.store.values()).filter((r) => r.taskId === taskId);
  }

  save(config: ReminderConfig): void {
    this.store.set(config.id, config);
  }

  deleteByTaskId(taskId: string): void {
    for (const [id, config] of this.store.entries()) {
      if (config.taskId === taskId) {
        this.store.delete(id);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}
