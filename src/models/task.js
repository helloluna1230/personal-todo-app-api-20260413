'use strict';

const { randomUUID } = require('crypto');

/**
 * Task status values — aligned with main architecture (task-management module).
 */
const TaskStatus = Object.freeze({
  TODO: 'TODO',
  DONE: 'DONE',
});

/**
 * Create a new Task object.
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {string} [params.status]
 * @param {Date|null} [params.completedAt]
 * @param {Date|string|null} [params.dueAt]
 * @returns {Object} task
 */
function createTask({ title, status = TaskStatus.TODO, completedAt = null, dueAt = null } = {}) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new Error('Task title is required');
  }
  return {
    id: randomUUID(),
    title: title.trim(),
    status,
    completedAt,
    dueAt: dueAt ? new Date(dueAt) : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

module.exports = { TaskStatus, createTask };

