export type TaskStatus = 'TODO' | 'DONE';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  note?: string;
  priority?: TaskPriority;
  category?: string;
  timezone?: string;
  dueAt?: Date;
  status: TaskStatus;
  completedAt?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskDto {
  title: string;
  note?: string;
  priority?: TaskPriority;
  category?: string;
  timezone?: string;
  dueAt?: Date;
}

export interface UpdateTaskDto {
  title?: string;
  note?: string;
  priority?: TaskPriority;
  category?: string;
  timezone?: string;
  dueAt?: Date;
  status?: TaskStatus;
}

/** Internal payload used by TaskRepository.update; includes service-computed fields. */
export type TaskUpdatePayload = Partial<Omit<Task, 'id' | 'createdAt'>>;
