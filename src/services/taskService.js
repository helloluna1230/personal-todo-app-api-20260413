'use strict';

const { TaskStatus, createTask } = require('../models/task');
const emitter = require('../events/eventEmitter');
const projectionStore = require('./projectionStore');

/**
 * In-memory task store.
 * @type {Map<string, Object>}
 */
const taskStore = new Map();

/**
 * Add a task to the store.
 *
 * Emits `task.created` so the projectionStore read model is kept in sync.
 *
 * @param {Object} params
 * @returns {Object} task
 */
function addTask(params) {
  const task = createTask(params);
  taskStore.set(task.id, task);
  emitter.emit('task.created', { taskId: task.id, task });
  return task;
}

/**
 * Find a task by ID.
 *
 * @param {string} id
 * @returns {Object|undefined}
 */
function findById(id) {
  return taskStore.get(id);
}

/**
 * Mark a task as DONE (idempotent).
 *
 * - If the task is already DONE the method returns it unchanged.
 * - Sets `status` to DONE and records `completedAt`.
 * - Publishes a `task.completed` domain event so downstream services
 *   (e.g. ReminderService, projectionStore) can react accordingly.
 *
 * @param {string} taskId
 * @returns {Object} updated task
 * @throws {Error} when the task is not found
 */
function completeTask(taskId) {
  const task = taskStore.get(taskId);
  if (!task) {
    const err = new Error(`Task not found: ${taskId}`);
    err.code = 'TASK_NOT_FOUND';
    throw err;
  }

  // Idempotency: already DONE → return as-is
  if (task.status === TaskStatus.DONE) {
    return task;
  }

  task.status = TaskStatus.DONE;
  task.completedAt = new Date();
  task.updatedAt = new Date();

  // Publish domain event → triggers reminder cancellation and projection update
  emitter.emit('task.completed', { taskId: task.id, task });

  return task;
}

/**
 * Return the task_time_projection for a task.
 *
 * Reads from the shared projectionStore read model (owned by deadline-reminder)
 * rather than computing a fresh projection inline.  This ensures today-view,
 * the homepage, and the reminder panel all consume the same state source.
 *
 * @param {string} taskId
 * @param {Date}  [now] - Current time; defaults to new Date()
 * @returns {Object} task_time_projection
 * @throws {Error} when the task is not found
 */
function getTaskWithProjection(taskId, now = new Date()) {
  const projection = projectionStore.getProjection(taskId, now);
  if (!projection) {
    const err = new Error(`Task not found: ${taskId}`);
    err.code = 'TASK_NOT_FOUND';
    throw err;
  }
  return projection;
}

/**
 * Clear all tasks from the store and the projection read model
 * (useful for test isolation).
 */
function clearAll() {
  taskStore.clear();
  projectionStore.clearAll();
}

module.exports = { addTask, findById, completeTask, getTaskWithProjection, clearAll, taskStore };

