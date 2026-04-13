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
  createdAt: Date;
}
