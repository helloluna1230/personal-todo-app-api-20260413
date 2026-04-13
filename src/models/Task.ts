export enum Priority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum Category {
  WORK = 'WORK',
  LIFE = 'LIFE',
  STUDY = 'STUDY',
}

export enum TaskStatus {
  TODO = 'TODO',
  DONE = 'DONE',
}

export interface Task {
  id: string;
  title: string;
  note?: string;
  priority: Priority;
  category: Category;
  dueAt?: Date;
  remindAt?: Date;
  status: TaskStatus;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
