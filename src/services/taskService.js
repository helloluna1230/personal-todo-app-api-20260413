'use strict';

const { TaskStatus, createTask } = require('../models/task');
const emitter = require('../events/eventEmitter');

/**
 * In-memory task store.
 * @type {Map<string, Object>}
 */
const taskStore = new Map();

/**
 * Add a task to the store (used for setup/testing).
 *
 * @param {Object} params
 * @returns {Object} task
 */
function addTask(params) {
  const task = createTask(params);
  taskStore.set(task.id, task);
  return task;
}

/**
 * Find a task by ID.
 * Returns a shallow copy so callers cannot mutate internal state directly.
 *
 * @param {string} id
 * @returns {Object|undefined}
 */
function findById(id) {
  const task = taskStore.get(id);
  return task ? { ...task } : undefined;
}

/**
 * Mark a task as DONE (idempotent).
 *
 * - If the task is already DONE the method returns it unchanged.
 * - Sets `status` to DONE and records `completedAt`.
 * - Publishes a `task.completed` domain event so downstream services
 *   (e.g. ReminderService) can cancel any future reminders.
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

  // Publish domain event → triggers reminder cancellation
  emitter.emit('task.completed', { taskId: task.id, task });

  return task;
}

/**
 * Clear all tasks from the store (useful for test isolation).
 */
function clearAll() {
  taskStore.clear();
}

module.exports = { addTask, findById, completeTask, clearAll };
