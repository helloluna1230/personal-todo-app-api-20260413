export interface Task {
  id: string;
  title: string;
  description?: string;
  dueAt?: Date;
  isCompleted: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  dueAt?: Date;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  dueAt?: Date;
  isCompleted?: boolean;
  isDeleted?: boolean;
}
