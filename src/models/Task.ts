export enum TaskStatus {
  TODO = 'TODO',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskCategory {
  WORK = 'WORK',
  PERSONAL = 'PERSONAL',
  SHOPPING = 'SHOPPING',
  OTHER = 'OTHER',
}

export interface Task {
  id: string;
  title: string;
  note?: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueAt?: string;
  remindAt?: string;
  status: TaskStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export const UPDATABLE_FIELDS: (keyof Task)[] = [
  'title',
  'note',
  'priority',
  'category',
  'dueAt',
  'remindAt',
];

export type UpdateTaskPayload = Partial<
  Pick<Task, 'title' | 'note' | 'priority' | 'category' | 'dueAt' | 'remindAt'>
>;
