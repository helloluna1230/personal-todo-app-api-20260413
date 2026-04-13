import crypto from 'crypto';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  UpdateTaskPayload,
  UPDATABLE_FIELDS,
} from '../models/Task';
import * as taskRepository from '../repositories/taskRepository';

export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task not found: ${id}`);
    this.name = 'TaskNotFoundError';
  }
}

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskValidationError';
  }
}

export function createTask(params: {
  title: string;
  note?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  dueAt?: string;
  remindAt?: string;
}): Task {
  if (!params.title || params.title.trim() === '') {
    throw new TaskValidationError('请输入待办标题');
  }

  const now = new Date().toISOString();
  const task: Task = {
    id: crypto.randomUUID(),
    title: params.title.trim(),
    note: params.note,
    priority: params.priority ?? TaskPriority.MEDIUM,
    category: params.category ?? TaskCategory.WORK,
    dueAt: params.dueAt,
    remindAt: params.remindAt,
    status: TaskStatus.TODO,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  if (task.dueAt && task.remindAt) {
    if (new Date(task.remindAt) > new Date(task.dueAt)) {
      throw new TaskValidationError('提醒时间不能晚于截止时间');
    }
  }

  return taskRepository.save(task);
}

export function updateTask(id: string, payload: UpdateTaskPayload): Task {
  const existing = taskRepository.findById(id);
  if (!existing) {
    throw new TaskNotFoundError(id);
  }

  // Validate whitelist: only allow permitted keys
  const payloadKeys = Object.keys(payload) as (keyof UpdateTaskPayload)[];
  for (const key of payloadKeys) {
    if (!UPDATABLE_FIELDS.includes(key)) {
      throw new TaskValidationError(`字段 "${key}" 不在允许更新的白名单中`);
    }
  }

  // Build merged task to validate
  const merged: Task = { ...existing };

  if (payload.title !== undefined) {
    if (!payload.title || payload.title.trim() === '') {
      throw new TaskValidationError('请输入待办标题');
    }
    merged.title = payload.title.trim();
  }
  if (payload.note !== undefined) merged.note = payload.note;
  if (payload.priority !== undefined) merged.priority = payload.priority;
  if (payload.category !== undefined) merged.category = payload.category;
  if (payload.dueAt !== undefined) merged.dueAt = payload.dueAt;
  if (payload.remindAt !== undefined) merged.remindAt = payload.remindAt;

  // Validate time rule: remindAt must not be later than dueAt
  const effectiveDueAt = merged.dueAt;
  const effectiveRemindAt = merged.remindAt;
  if (effectiveDueAt && effectiveRemindAt) {
    if (new Date(effectiveRemindAt) > new Date(effectiveDueAt)) {
      throw new TaskValidationError('提醒时间不能晚于截止时间，请调整后重试');
    }
  }

  merged.updatedAt = new Date().toISOString();
  merged.version = existing.version + 1;

  return taskRepository.save(merged);
}

export function getTask(id: string): Task {
  const task = taskRepository.findById(id);
  if (!task) {
    throw new TaskNotFoundError(id);
  }
  return task;
}

export function listTasks(): Task[] {
  return taskRepository.findAll();
}

export function completeTask(id: string): Task {
  const existing = taskRepository.findById(id);
  if (!existing) {
    throw new TaskNotFoundError(id);
  }

  const now = new Date().toISOString();
  const updated: Task = {
    ...existing,
    status: TaskStatus.DONE,
    completedAt: now,
    updatedAt: now,
    version: existing.version + 1,
  };

  return taskRepository.save(updated);
}

export function deleteTask(id: string): void {
  const existing = taskRepository.findById(id);
  if (!existing) {
    throw new TaskNotFoundError(id);
  }
  taskRepository.remove(id);
}
